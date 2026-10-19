import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  ref, onValue, query, orderByChild, limitToLast, equalTo, get,
  push, set, update,
} from 'firebase/database';
import { rtdb } from '../services/firebase';
import { useAuth } from './AuthContext';

const VehicleContext = createContext(null);

export function useVehicle() {
  const ctx = useContext(VehicleContext);
  if (!ctx) throw new Error('useVehicle must be used within VehicleProvider');
  return ctx;
}

// Interval penulisan permanen ke Behavior Log — sesuai arahan dosen pembimbing.
const BEHAVIOR_LOG_INTERVAL_MS = 60 * 1000;

// Batas waktu tanpa data 'live' sebelum ESP dianggap terputus.
const CONNECTION_TIMEOUT_MS = 15 * 1000;

// Jika ditemukan sesi lain berstatus 'aktif' (meta.endTime === 0) yang mulai
// dalam jendela waktu ini, sesi itu DIADOPSI (bukan bikin sesi baru) — mencegah
// duplikasi sesi kalau driver membuka lebih dari 1 tab browser bersamaan.
// Sesi 'aktif' yang JAUH LEBIH TUA (misal sesi zombie lama yang endTime-nya
// tidak pernah ke-set karena tab ditutup mendadak) TIDAK diadopsi.
// CATATAN JUJUR: ini mengurangi risiko drastis, TAPI BUKAN jaminan atomik
// 100% — kalau 2 tab dibuka dalam window sangat sempit (order milidetik),
// keduanya masih bisa membuat sesi terpisah. Solusi 100% butuh transaksi
// Firebase yang jauh lebih kompleks, sengaja tidak dipakai di sini.
const ADOPTABLE_SESSION_MAX_AGE_MS = CONNECTION_TIMEOUT_MS * 2;

function formatSessionLabel(date) {
  return `Sesi ${date.toLocaleString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })}`;
}

export function VehicleProvider({ children }) {
  const { userData } = useAuth();
  const vehicleId = userData?.vehicleId || 'TRUCK_001';

  const [liveData,     setLiveData]     = useState(null);
  const [events,       setEvents]       = useState([]);
  const [sessions,     setSessions]     = useState([]);
  const [settings,     setSettings]     = useState({
    speedLimit1: 80, speedLimit2: 40, tiltThreshold: 15, tiltSpeedSwitch: 1.72,
  });
  const [isConnected,  setIsConnected]  = useState(false);
  const [lastUpdate,   setLastUpdate]   = useState(null);
  const [speedHistory, setSpeedHistory] = useState([]);

  const lastEventIdRef       = useRef('');
  const eventsInitializedRef = useRef(false);
  const connTimerRef         = useRef(null);

  const sessionKeyRef             = useRef(null);
  const sessionStartRef           = useRef(null);
  const lastBehaviorWriteRef      = useRef(0);
  const eventsSinceLastLogRef     = useRef(0);
  const sessionCheckInProgressRef = useRef(false);

  // Cek dulu apakah sudah ada sesi aktif (dibuat tab lain baru-baru ini)
  // sebelum membuat sesi baru — mencegah duplikasi sesi antar-tab.
  const ensureActiveSession = useCallback(async () => {
    try {
      const existingQuery = query(
        ref(rtdb, `vehicles/${vehicleId}/sessions`),
        orderByChild('meta/endTime'),
        equalTo(0)
      );
      const snap = await get(existingQuery);

      let adopted = false;
      if (snap.exists()) {
        snap.forEach((child) => {
          const meta = child.val().meta || {};
          const age = Date.now() - (meta.startTime || 0);
          if (age >= 0 && age <= ADOPTABLE_SESSION_MAX_AGE_MS) {
            sessionKeyRef.current          = child.key;
            sessionStartRef.current        = meta.startTime || Date.now();
            lastBehaviorWriteRef.current    = 0;
            eventsSinceLastLogRef.current   = 0;
            adopted = true;
            return true; // hentikan iterasi forEach
          }
        });
      }

      if (!adopted) {
        const newSessionRef = push(ref(rtdb, `vehicles/${vehicleId}/sessions`));
        sessionKeyRef.current         = newSessionRef.key;
        sessionStartRef.current       = Date.now();
        lastBehaviorWriteRef.current  = 0;
        eventsSinceLastLogRef.current = 0;

        await set(newSessionRef, {
          meta: {
            startTime: sessionStartRef.current,
            endTime:   0,
            label:     formatSessionLabel(new Date(sessionStartRef.current)),
          },
        });
      }
    } catch (err) {
      console.error('[VehicleContext] Gagal memeriksa/membuat sesi:', err);
    }
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) return;

    // ── PATH 1: vehicles/{vehicleId}/live ──────────────────
    const unsubLive = onValue(
      ref(rtdb, `vehicles/${vehicleId}/live`),
      (snap) => {
        if (snap.exists()) {
          const data = snap.val();

          if (typeof data.timestamp === 'number') {
            const dataAge = Date.now() - data.timestamp;
            if (dataAge > CONNECTION_TIMEOUT_MS) {
              return;
            }
          }

          setLiveData(data);
          setIsConnected(true);
          setLastUpdate(Date.now());

          setSpeedHistory((prev) => {
            const label = new Date().toLocaleTimeString('id-ID', {
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            });
            return [...prev, { time: label, speed: data.gps?.speed || 0 }].slice(-120);
          });

          // ── Riwayat Sesi (Behavior Log) ──────────────────
          if (!sessionKeyRef.current && !sessionCheckInProgressRef.current) {
            sessionCheckInProgressRef.current = true;
            ensureActiveSession().finally(() => {
              sessionCheckInProgressRef.current = false;
            });
          }

          // Hanya tulis behaviorLog kalau sessionKey sudah pasti ada (bisa
          // saja masih null sesaat karena ensureActiveSession() di atas
          // berjalan async — akan tertulis di tick berikutnya, tidak hilang).
          const now = Date.now();
          if (sessionKeyRef.current && now - lastBehaviorWriteRef.current >= BEHAVIOR_LOG_INTERVAL_MS) {
            lastBehaviorWriteRef.current = now;
            const behaviorRef = push(
              ref(rtdb, `vehicles/${vehicleId}/sessions/${sessionKeyRef.current}/behaviorLog`)
            );
            set(behaviorRef, {
              timestamp:   now,
              elapsedSec:  Math.floor((now - sessionStartRef.current) / 1000),
              speed:       data.gps?.speed    || 0,
              tilt:        data.tilt          || 0,
              forcedBrake: data.brake?.forced || false,
              eventCount:  eventsSinceLastLogRef.current,
            });
            eventsSinceLastLogRef.current = 0;
          }

          if (connTimerRef.current) clearTimeout(connTimerRef.current);
          connTimerRef.current = setTimeout(() => {
            setIsConnected(false);
            setLiveData(null);
            setSpeedHistory([]);

            if (sessionKeyRef.current) {
              update(ref(rtdb, `vehicles/${vehicleId}/sessions/${sessionKeyRef.current}/meta`), {
                endTime: Date.now(),
              });
              sessionKeyRef.current         = null;
              sessionStartRef.current       = null;
              lastBehaviorWriteRef.current  = 0;
              eventsSinceLastLogRef.current = 0;
            }
          }, CONNECTION_TIMEOUT_MS);
        }
      }
    );

    // ── PATH 2: settings/{vehicleId} ──────────────────────
    const unsubSettings = onValue(
      ref(rtdb, `settings/${vehicleId}`),
      (snap) => {
        if (snap.exists()) {
          setSettings((prev) => ({ ...prev, ...snap.val() }));
        }
      }
    );

    // ── PATH 3: vehicles/{vehicleId}/events — 200 terbaru ─
    const eventsQuery = query(
      ref(rtdb, `vehicles/${vehicleId}/events`),
      orderByChild('timestamp'),
      limitToLast(200)
    );
    const unsubEvents = onValue(eventsQuery, (snap) => {
      const list = [];
      if (snap.exists()) {
        snap.forEach((child) => {
          list.push({ id: child.key, ...child.val() });
        });
      }

      if (!eventsInitializedRef.current) {
        eventsInitializedRef.current = true;
        lastEventIdRef.current = list.length > 0 ? list[list.length - 1].id : '';
      } else {
        const lastIdx = list.findIndex((e) => e.id === lastEventIdRef.current);
        const newEvents = lastIdx === -1 ? list : list.slice(lastIdx + 1);

        if (newEvents.length > 0) {
          lastEventIdRef.current = newEvents[newEvents.length - 1].id;
          eventsSinceLastLogRef.current += newEvents.length;

          if (sessionKeyRef.current) {
            newEvents.forEach((evt) => {
              const evtData = { ...evt };
              delete evtData.id;
              const sessionEventRef = push(
                ref(rtdb, `vehicles/${vehicleId}/sessions/${sessionKeyRef.current}/events`)
              );
              set(sessionEventRef, evtData);
            });
          }
        }
      }

      setEvents([...list].reverse());
    });

    // ── PATH 4: vehicles/{vehicleId}/sessions ─────────────
    const unsubSessions = onValue(
      ref(rtdb, `vehicles/${vehicleId}/sessions`),
      (snap) => {
        if (snap.exists()) {
          const list = [];
          snap.forEach((child) => {
            const s = child.val();
            const sessionEvents = s.events
              ? Object.entries(s.events)
                  .map(([k, v]) => ({ id: k, ...v }))
                  .sort((a, b) => b.timestamp - a.timestamp)
              : [];
            const behaviorLog = s.behaviorLog
              ? Object.entries(s.behaviorLog)
                  .map(([k, v]) => ({ id: k, ...v }))
                  .sort((a, b) => a.timestamp - b.timestamp)
              : [];

            list.push({
              key:         child.key,
              meta:        s.meta || {},
              events:      sessionEvents,
              behaviorLog: behaviorLog,
            });
          });
          list.sort((a, b) => (b.meta.startTime || 0) - (a.meta.startTime || 0));
          setSessions(list);
        } else {
          setSessions([]);
        }
      }
    );

    return () => {
      unsubLive();
      unsubSettings();
      unsubEvents();
      unsubSessions();
      if (connTimerRef.current) clearTimeout(connTimerRef.current);
    };
  }, [vehicleId, ensureActiveSession]);

  return (
    <VehicleContext.Provider value={{
      vehicleId,
      liveData,
      events,
      sessions,
      settings,
      isConnected,
      lastUpdate,
      speedHistory,
      lastEventIdRef,
    }}>
      {children}
    </VehicleContext.Provider>
  );
}