import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { ref, onValue, query, orderByChild, limitToLast, startAt } from 'firebase/database';
import { db, rtdb } from '../services/firebase';
import {
  SESSIONS_LIMIT, normalizeLive, normalizeEvent, normalizeSession, compareEventsDesc, startOfDayMs, nextDayStartMs,
} from '../utils/vehicleLogic';
import {
  PERFORMANCE_EVENTS_LIMIT, normalizeUserDoc, normalizeInviteDoc, describeAdminWriteError, adminWriteAccess,
} from '../utils/adminLogic';

// Hook data halaman admin. Semuanya hanya MEMBACA (listener onValue / onSnapshot) dan berhenti saat
// halaman ditutup. Satu-satunya penulisan ke RTDB dilakukan halaman Pengaturan pada settings/{vehicleId}.

const NO_IDS = Object.freeze([]);

function logRead(scope, err) {
  console.error(`[useAdminData] Gagal membaca ${scope}:`, err);
}

// Selisih jam perangkat terhadap server Firebase; serverNow() = jam server saat ini (ms).
export function useServerClock() {
  const [offset, setOffset] = useState(0);
  const offsetRef = useRef(0);

  useEffect(() => {
    return onValue(ref(rtdb, '.info/serverTimeOffset'), (snap) => {
      const v = snap.val();
      const next = typeof v === 'number' && Number.isFinite(v) ? v : 0;
      offsetRef.current = next;
      setOffset(next);
    });
  }, [offsetRef]);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, [offsetRef]);
  return { serverNow, offset };
}

// Awal hari berjalan (ms, jam server); berganti otomatis saat lewat tengah malam.
export function useDayStart(serverOffset) {
  const [dayStart, setDayStart] = useState(() => startOfDayMs(Date.now() + serverOffset));

  useEffect(() => {
    setDayStart(startOfDayMs(Date.now() + serverOffset));
  }, [serverOffset]);

  useEffect(() => {
    const now = Date.now() + serverOffset;
    const timer = setTimeout(() => setDayStart(startOfDayMs(Date.now() + serverOffset)), nextDayStartMs(now) - now + 500);
    return () => clearTimeout(timer);
  }, [dayStart, serverOffset]);

  return dayStart;
}

// Merender ulang pada waktunya (waitMs dari fungsi murni seperti nextConnectionCheckMs); null = tidak perlu.
export function useRerenderAt(waitMs) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (waitMs === null || waitMs === undefined) return undefined;
    const timer = setTimeout(() => setTick((t) => t + 1), Math.max(1, waitMs));
    return () => clearTimeout(timer);
  }, [waitMs, tick]);
}

// Satu langganan per ID kendaraan. subscribe(id, onData, onError) harus mengembalikan fungsi berhenti
// dan stabil (didefinisikan di luar komponen atau dengan useCallback). Berganti daftar ID memasang ulang langganan.
function usePerVehicle(ids, subscribe) {
  const [state, setState] = useState({});
  const idsKey = ids.join('\n');

  useEffect(() => {
    const list = idsKey ? idsKey.split('\n') : [];
    const unsubs = list.map((id) => subscribe(
      id,
      (value) => setState((prev) => ({ ...prev, [id]: { value, loaded: true, error: null } })),
      (error) => setState((prev) => ({ ...prev, [id]: { value: prev[id] ? prev[id].value : undefined, loaded: true, error } })),
    ));
    return () => unsubs.forEach((unsubscribe) => unsubscribe());
  }, [idsKey, subscribe]);

  return useMemo(() => {
    const values = {};
    const loaded = {};
    const errors = [];
    for (const id of idsKey ? idsKey.split('\n') : []) {
      const s = state[id];
      if (!s) continue;
      if (s.loaded) {
        loaded[id] = true;
        if (s.value !== undefined) values[id] = s.value;
      }
      if (s.error) errors.push({ vehicleId: id, error: s.error });
    }
    return { values, loaded, errors };
  }, [state, idsKey]);
}

function eventsFromSnapshot(snap, minTimestamp = 0) {
  const list = [];
  snap.forEach((child) => {
    const e = normalizeEvent(child.key, child.val());
    if (e && e.timestamp >= minTimestamp) list.push(e);
  });
  return list.sort(compareEventsDesc);
}

const subscribeLive = (id, ok, fail) => onValue(
  ref(rtdb, `vehicles/${id}/live`),
  (snap) => ok(snap.exists() ? normalizeLive(snap.val()) : null),
  (err) => { logRead(`data live ${id}`, err); fail(err); },
);

const subscribeSettings = (id, ok, fail) => onValue(
  ref(rtdb, `settings/${id}`),
  (snap) => ok(snap.exists() ? snap.val() : null),
  (err) => { logRead(`pengaturan ${id}`, err); fail(err); },
);

const subscribeRecentEvents = (id, ok, fail) => onValue(
  query(ref(rtdb, `vehicles/${id}/events`), orderByChild('timestamp'), limitToLast(PERFORMANCE_EVENTS_LIMIT)),
  (snap) => ok(eventsFromSnapshot(snap)),
  (err) => { logRead(`event ${id}`, err); fail(err); },
);

const subscribeSessions = (id, ok, fail) => onValue(
  query(ref(rtdb, `vehicles/${id}/sessions`), orderByChild('meta/startTime'), limitToLast(SESSIONS_LIMIT)),
  (snap) => {
    const list = [];
    snap.forEach((child) => {
      const s = normalizeSession(child.key, child.val());
      if (s) list.push(s);
    });
    ok(list);
  },
  (err) => { logRead(`sesi ${id}`, err); fail(err); },
);

// Data live (dan pengaturan batas bila settings = true) setiap kendaraan.
// liveById[id]: undefined = belum termuat, null = belum ada data, objek = data live ternormalisasi.
export function useFleetLive(ids, { settings = true } = {}) {
  const live = usePerVehicle(ids, subscribeLive);
  const sets = usePerVehicle(settings ? ids : NO_IDS, subscribeSettings);
  return useMemo(() => ({
    liveById: live.values,
    liveLoaded: live.loaded,
    settingsById: sets.values,
    liveErrors: live.errors,
    settingsErrors: sets.errors,
  }), [live, sets]);
}

// Pengaturan batas kecepatan satu kendaraan (settings/{id}). value: undefined = belum termuat, null = belum diatur.
export function useVehicleSettings(vehicleId) {
  const ids = useMemo(() => (vehicleId ? [vehicleId] : NO_IDS), [vehicleId]);
  const r = usePerVehicle(ids, subscribeSettings);
  return useMemo(() => ({
    loaded: !!vehicleId && !!r.loaded[vehicleId],
    value: vehicleId ? r.values[vehicleId] : undefined,
    error: r.errors.length > 0 ? r.errors[0].error : null,
  }), [vehicleId, r]);
}

// Event hari berjalan (sejak dayStart) setiap kendaraan, terbaru dulu.
export function useFleetTodayEvents(ids, dayStart) {
  const subscribe = useCallback((id, ok, fail) => onValue(
    query(ref(rtdb, `vehicles/${id}/events`), orderByChild('timestamp'), startAt(dayStart)),
    (snap) => ok(eventsFromSnapshot(snap, dayStart)),
    (err) => { logRead(`event hari ini ${id}`, err); fail(err); },
  ), [dayStart]);
  const r = usePerVehicle(ids, subscribe);
  return useMemo(() => ({ eventsById: r.values, loadedById: r.loaded, errors: r.errors }), [r]);
}

// Event terbaru (hingga PERFORMANCE_EVENTS_LIMIT) setiap kendaraan, terbaru dulu.
export function useFleetRecentEvents(ids) {
  const r = usePerVehicle(ids, subscribeRecentEvents);
  return useMemo(() => ({ eventsById: r.values, loadedById: r.loaded, errors: r.errors }), [r]);
}

// Sesi terbaru (hingga SESSIONS_LIMIT) setiap kendaraan. enabled = false -> tidak berlangganan.
export function useFleetSessions(ids, enabled) {
  const r = usePerVehicle(enabled ? ids : NO_IDS, subscribeSessions);
  return useMemo(() => ({ sessionsById: r.values, loadedById: r.loaded, errors: r.errors }), [r]);
}

// Daftar akun (users) dan undangan (driverInvites) dari Firestore, diperbarui otomatis.
export function useDirectory() {
  const [users, setUsers] = useState(null);
  const [invites, setInvites] = useState(null);
  const [usersError, setUsersError] = useState(null);
  const [invitesError, setInvitesError] = useState(null);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      if (snap.metadata && snap.metadata.fromCache && snap.empty) return; // tunggu jawaban server
      setUsers(snap.docs.map((d) => normalizeUserDoc(d.id, d.data())));
      setUsersError(null);
    }, (err) => {
      logRead('data pengemudi', err);
      setUsersError(describeAdminWriteError(err, 'Gagal memuat data pengemudi.'));
      setUsers((prev) => prev || []);
    });
    const unsubInvites = onSnapshot(collection(db, 'driverInvites'), (snap) => {
      if (snap.metadata && snap.metadata.fromCache && snap.empty) return;
      setInvites(snap.docs.map((d) => normalizeInviteDoc(d.id, d.data())));
      setInvitesError(null);
    }, (err) => {
      logRead('undangan pengemudi', err);
      setInvitesError(describeAdminWriteError(err, 'Gagal memuat undangan pengemudi.'));
      setInvites((prev) => prev || []);
    });
    return () => {
      unsubUsers();
      unsubInvites();
    };
  }, []);

  return useMemo(() => ({
    users: users || [],
    invites: invites || [],
    loaded: users !== null && invites !== null,
    error: usersError,
    invitesError,
  }), [users, invites, usersError, invitesError]);
}

// Izin menulis pengaturan: admins/{uid} di RTDB harus bernilai true. 'checking' | 'granted' | 'denied' | 'unknown'.
export function useAdminAccess(uid) {
  const [state, setState] = useState({ uid: null, loaded: false, value: undefined, failed: false });

  useEffect(() => {
    if (!uid) return undefined;
    return onValue(ref(rtdb, `admins/${uid}`), (snap) => {
      setState({ uid, loaded: true, value: snap.val(), failed: false });
    }, (err) => {
      logRead('izin admin', err);
      setState({ uid, loaded: true, value: undefined, failed: true });
    });
  }, [uid]);

  const current = state.uid === uid;
  return adminWriteAccess({ loaded: current && state.loaded, value: current ? state.value : undefined, readFailed: current && state.failed });
}