import { createContext, useContext, useReducer, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { rtdb } from '../services/firebase';
import { useAuth } from './AuthContext';
import { useAlertContext } from './AlertContext';
import { cleanVehicleId } from '../utils/accountLogic';
import {
  CONNECTION_TIMEOUT_MS, FUTURE_TOLERANCE_MS, NOTIFY_WINDOW_MS,
  getTerrain, normalizeLimits, getActiveLimit, isOverspeed,
  normalizeLive, normalizeEvent, compareEventsDesc, normalizeSession, deriveSessions,
  describeEvent,
} from '../utils/vehicleLogic';

// VehicleContext hanya MEMBACA data kendaraan dari Realtime Database.
// Penulisan data kendaraan (live, events, sessions, behaviorLog) dilakukan alat,
// dan penulisan settings dilakukan admin dari halaman Pengaturan.

const VehicleContext = createContext(null);

export function useVehicle() {
  const ctx = useContext(VehicleContext);
  if (!ctx) throw new Error('useVehicle must be used within VehicleProvider');
  return ctx;
}

const EVENTS_LIMIT = 200;    // event terbaru yang dimuat
const SESSIONS_LIMIT = 30;   // sesi terbaru yang dimuat
const HISTORY_MAX = 120;     // titik grafik kecepatan (5 detik per titik = 10 menit)

function formatClock(ms) {
  return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function describeDbError(err) {
  const code = String((err && (err.code || err.message)) || '').toLowerCase();
  if (code.includes('permission')) return 'Akun ini tidak memiliki izin untuk membaca data kendaraan.';
  return 'Gagal membaca data kendaraan. Periksa koneksi internet.';
}

// ── State data satu kendaraan ────────────────────────────────
// Setiap aksi membawa vehicleId; aksi dari kendaraan lama (callback yang terlambat) diabaikan.
function emptyState(vehicleId) {
  return {
    vehicleId,
    rawLive: null,
    rawSettings: null,
    events: [],
    rawSessions: [],
    loaded: { live: false, settings: false, events: false, sessions: false },
    dataError: null,
    isConnected: false,
    speedHistory: [],
  };
}

function reducer(state, action) {
  if (action.type === 'reset') {
    return state.vehicleId === action.vehicleId ? state : emptyState(action.vehicleId);
  }
  if (action.vehicleId !== state.vehicleId) return state;
  switch (action.type) {
    case 'live':
      return { ...state, rawLive: action.value, loaded: { ...state.loaded, live: true } };
    case 'settings':
      return { ...state, rawSettings: action.value, loaded: { ...state.loaded, settings: true } };
    case 'events':
      return { ...state, events: action.value, loaded: { ...state.loaded, events: true } };
    case 'sessions':
      return { ...state, rawSessions: action.value, loaded: { ...state.loaded, sessions: true } };
    case 'error':
      return { ...state, dataError: action.message };
    case 'connected':
      return state.isConnected === action.value ? state : { ...state, isConnected: action.value };
    case 'historyPush':
      return { ...state, speedHistory: [...state.speedHistory, action.point].slice(-HISTORY_MAX) };
    case 'historyClear':
      return state.speedHistory.length ? { ...state, speedHistory: [] } : state;
    default:
      return state;
  }
}

export function VehicleProvider({ children }) {
  const { userData } = useAuth();
  const { addNotification } = useAlertContext();

  // Hanya pengemudi yang membaca satu kendaraan: kendaraan miliknya sendiri (tanpa nilai bawaan).
  // Admin dan pengemudi yang belum ditetapkan kendaraannya tidak berlangganan data apa pun.
  const vehicleId = userData && userData.role === 'user' ? cleanVehicleId(userData.vehicleId) : null;

  const [state, dispatch] = useReducer(reducer, vehicleId, emptyState);
  const [serverOffset, setServerOffset] = useState(0);

  const offsetRef = useRef(0);
  const lastPushedRef = useRef(null);
  const seenEventsRef = useRef(null); // null sampai snapshot event pertama; sesudahnya Set ID yang sudah terlihat
  const notifyRef = useRef(null);

  useEffect(() => { notifyRef.current = addNotification || null; }, [addNotification]);

  // Kendaraan berganti -> mulai dari kosong. Dijalankan sebelum langganan dipasang.
  useEffect(() => {
    dispatch({ type: 'reset', vehicleId });
  }, [vehicleId]);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  // ── Langganan RTDB (semua hanya baca) ─────────────────────
  useEffect(() => {
    if (!vehicleId) return undefined;
    seenEventsRef.current = null;
    lastPushedRef.current = null;

    const onError = (err) => {
      console.error('[VehicleContext] Gagal membaca data kendaraan:', err);
      dispatch({ type: 'error', vehicleId, message: describeDbError(err) });
    };

    // Selisih jam perangkat pengguna terhadap server Firebase.
    const unsubOffset = onValue(ref(rtdb, '.info/serverTimeOffset'), (snap) => {
      const v = snap.val();
      const offset = typeof v === 'number' && Number.isFinite(v) ? v : 0;
      offsetRef.current = offset;
      setServerOffset(offset);
    });

    const unsubLive = onValue(ref(rtdb, `vehicles/${vehicleId}/live`), (snap) => {
      dispatch({ type: 'live', vehicleId, value: snap.exists() ? normalizeLive(snap.val()) : null });
    }, onError);

    const unsubSettings = onValue(ref(rtdb, `settings/${vehicleId}`), (snap) => {
      dispatch({ type: 'settings', vehicleId, value: snap.exists() ? snap.val() : null });
    }, onError);

    const eventsQuery = query(
      ref(rtdb, `vehicles/${vehicleId}/events`),
      orderByChild('timestamp'),
      limitToLast(EVENTS_LIMIT)
    );
    const unsubEvents = onValue(eventsQuery, (snap) => {
      const list = [];
      snap.forEach((child) => {
        const e = normalizeEvent(child.key, child.val());
        if (e) list.push(e);
      });
      list.sort(compareEventsDesc);
      dispatch({ type: 'events', vehicleId, value: list });

      // Lonceng notifikasi: hanya event yang masuk SETELAH halaman dibuka dan masih baru.
      if (seenEventsRef.current === null) {
        seenEventsRef.current = new Set(list.map((e) => e.id));
        return;
      }
      const seen = seenEventsRef.current;
      const fresh = list.filter((e) => !seen.has(e.id));
      fresh.forEach((e) => seen.add(e.id));
      if (!notifyRef.current) return;
      const now = Date.now() + offsetRef.current;
      fresh
        .filter((e) => now - e.timestamp <= NOTIFY_WINDOW_MS)
        .sort((a, b) => a.timestamp - b.timestamp)
        .forEach((e) => {
          const d = describeEvent(e);
          notifyRef.current({ type: e.type, severity: e.severity, message: d.title, details: d.details });
        });
    }, onError);

    const sessionsQuery = query(
      ref(rtdb, `vehicles/${vehicleId}/sessions`),
      orderByChild('meta/startTime'),
      limitToLast(SESSIONS_LIMIT)
    );
    const unsubSessions = onValue(sessionsQuery, (snap) => {
      const list = [];
      snap.forEach((child) => {
        const s = normalizeSession(child.key, child.val());
        if (s) list.push(s);
      });
      dispatch({ type: 'sessions', vehicleId, value: list });
    }, onError);

    return () => {
      unsubOffset();
      unsubLive();
      unsubSettings();
      unsubEvents();
      unsubSessions();
    };
  }, [vehicleId]);

  // Data milik kendaraan saat ini saja; selama pergantian kendaraan, sisa data lama disembunyikan.
  const current = state.vehicleId === vehicleId ? state : emptyState(vehicleId);
  const { rawLive } = current;

  // ── Status koneksi: data live <= 15 detik (jam server) ─────
  useEffect(() => {
    if (!vehicleId) return undefined;
    if (!rawLive || rawLive.timestamp === null) {
      dispatch({ type: 'connected', vehicleId, value: false });
      return undefined;
    }
    const age = Date.now() + serverOffset - rawLive.timestamp;
    const remaining = CONNECTION_TIMEOUT_MS - age;
    if (age < -FUTURE_TOLERANCE_MS || remaining <= 0) {
      dispatch({ type: 'connected', vehicleId, value: false });
      return undefined;
    }
    dispatch({ type: 'connected', vehicleId, value: true });
    const timer = setTimeout(() => dispatch({ type: 'connected', vehicleId, value: false }), remaining);
    return () => clearTimeout(timer);
  }, [vehicleId, rawLive, serverOffset]);

  // ── Riwayat kecepatan untuk grafik (hanya saat terhubung) ──
  const connected = current.isConnected;
  useEffect(() => {
    if (!vehicleId) return;
    if (!connected) {
      lastPushedRef.current = null;
      dispatch({ type: 'historyClear', vehicleId });
      return;
    }
    if (!rawLive || rawLive.timestamp === null || rawLive.timestamp === lastPushedRef.current) return;
    lastPushedRef.current = rawLive.timestamp;
    dispatch({
      type: 'historyPush',
      vehicleId,
      point: { ts: rawLive.timestamp, time: formatClock(rawLive.timestamp), speed: rawLive.gps.speed || 0 },
    });
  }, [vehicleId, connected, rawLive]);

  // ── Nilai turunan ─────────────────────────────────────────
  const value = useMemo(() => {
    const hasVehicle = vehicleId !== null;
    const isConnected = hasVehicle && current.isConnected;
    const liveData = isConnected ? current.rawLive : null;
    const speed = liveData ? liveData.gps.speed : null;
    const tilt = liveData ? liveData.tilt : null;
    const terrain = liveData ? getTerrain(tilt) : 'unknown';

    // Tanpa kendaraan tidak ada batas yang berlaku (tidak ada nilai karangan).
    const limits = hasVehicle ? normalizeLimits(current.rawSettings) : { flat: null, downhill: null, flatIsDefault: true };
    const activeLimit = hasVehicle ? getActiveLimit(terrain, limits) : null;

    return {
      vehicleId,
      hasVehicle,

      // Data live. liveData bernilai null saat alat terputus; lastLive menyimpan data terakhir.
      liveData,
      lastLive: current.rawLive,
      isConnected,
      lastUpdate: current.rawLive ? current.rawLive.timestamp : null,
      speed,
      tilt,

      // Medan & batas kecepatan (dihitung website dari kemiringan dan pengaturan admin).
      terrain,                      // 'flat' | 'downhill' | 'unknown'
      limits,                       // { flat, downhill, flatIsDefault }
      activeLimit,                  // null bila medan menurun tetapi batas menurun belum diatur
      isOverspeed: isOverspeed(speed, activeLimit),
      settings: { speedLimit1: limits.flat, speedLimit2: limits.downhill }, // kompatibilitas halaman lama

      events: current.events,       // terbaru dulu; hanya overspeed dan forced_brake
      sessions: deriveSessions(current.rawSessions, { isConnected }),
      speedHistory: current.speedHistory,

      serverNow,
      serverOffset,
      loaded: !hasVehicle || (current.loaded.live && current.loaded.settings && current.loaded.events && current.loaded.sessions),
      dataError: current.dataError,
    };
  }, [vehicleId, current, serverNow, serverOffset]);

  return <VehicleContext.Provider value={value}>{children}</VehicleContext.Provider>;
}