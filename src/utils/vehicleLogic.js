// Logika murni SAFEDRIVE (tanpa React, tanpa Firebase): aturan yang ditetapkan skripsi
// dan normalisasi data dari alat. Satu sumber kebenaran untuk semua halaman.
//
// Kontrak data yang dibaca (ditulis oleh alat, website hanya membaca):
//   vehicles/{id}/live      -> { gps:{speed,lat,lng,heading?,satellites?}, tilt?, brake:{exhaust_active,forced}, timestamp }
//   vehicles/{id}/events    -> { type:'overspeed'|'forced_brake', speed, tilt?, timestamp, message?, severity?, sessionKey? }
//   vehicles/{id}/sessions  -> { meta:{startTime,endTime,label?,...}, behaviorLog:{...}, events:{...} }
//   settings/{id}           -> { speedLimit1 (datar), speedLimit2 (menurun) }  (ditulis admin dari website)
// Semua timestamp berupa epoch milidetik dari jam server Firebase.

// ── Konstanta aturan skripsi ─────────────────────────────────
export const TILT_DOWNHILL_THRESHOLD = 3;   // persen; tilt >= 3 -> MENURUN, selain itu DATAR
export const DEFAULT_FLAT_LIMIT = 80;       // km/jam, batas standar jalan datar
export const CONNECTION_TIMEOUT_MS = 15 * 1000; // tanpa data live selama ini -> alat dianggap terputus
export const DANGER_WINDOW_MS = 5 * 1000;       // peringatan bahaya aktif bila event <= 5 detik
export const NOTIFY_WINDOW_MS = 60 * 1000;      // event baru <= 60 detik masuk lonceng notifikasi
export const FUTURE_TOLERANCE_MS = 10 * 1000;   // toleransi selisih jam (timestamp "di masa depan")
export const EVENT_TYPES = Object.freeze(['overspeed', 'forced_brake']);

export const SESSION_STATUS = Object.freeze({
  ACTIVE: 'active',     // Berlangsung
  UNCLOSED: 'unclosed', // Belum ditutup
  CLOSED: 'closed',     // Selesai
});
export const SESSION_STATUS_LABEL = Object.freeze({
  active: 'Berlangsung',
  unclosed: 'Belum ditutup',
  closed: 'Selesai',
});

// ── Dasar ────────────────────────────────────────────────────
export function toFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validTimestamp(value) {
  const n = toFiniteNumber(value);
  return n !== null && n > 0 ? n : null;
}

// ── Kemiringan, medan, dan batas kecepatan ───────────────────
// 'downhill' (MENURUN) | 'flat' (DATAR) | 'unknown' (sensor tidak mengirim kemiringan)
export function getTerrain(tilt) {
  const t = toFiniteNumber(tilt);
  if (t === null) return 'unknown';
  return t >= TILT_DOWNHILL_THRESHOLD ? 'downhill' : 'flat';
}

// Pengaturan batas dari settings/{vehicleId}.
//   flat     : speedLimit1 bila valid, jika tidak memakai standar 80 km/jam (flatIsDefault = true)
//   downhill : speedLimit2 bila valid, jika tidak null (skripsi tidak menetapkan nilai standar)
export function normalizeLimits(raw) {
  const r = isPlainObject(raw) ? raw : {};
  const f = toFiniteNumber(r.speedLimit1);
  const d = toFiniteNumber(r.speedLimit2);
  const flatConfigured = f !== null && f > 0;
  return {
    flat: flatConfigured ? f : DEFAULT_FLAT_LIMIT,
    downhill: d !== null && d > 0 ? d : null,
    flatIsDefault: !flatConfigured,
  };
}

// Batas aktif dihitung website dari medan (tidak dikirim alat).
// Medan 'unknown' memakai batas jalan datar (aturan dasar).
export function getActiveLimit(terrain, limits) {
  return terrain === 'downhill' ? limits.downhill : limits.flat;
}

export function isOverspeed(speed, limit) {
  const s = toFiniteNumber(speed);
  const l = toFiniteNumber(limit);
  return s !== null && l !== null && l > 0 && s > l;
}

// Validasi isian Pengaturan (dipakai halaman admin): tolak kosong, bukan angka,
// nol/negatif, dan batas menurun yang tidak lebih kecil dari batas datar.
export function validateSpeedLimits(flatInput, downhillInput) {
  function parse(input, label) {
    if (input === null || input === undefined || String(input).trim() === '') {
      return { error: `${label} wajib diisi.` };
    }
    const text = String(input).trim().replace(',', '.');
    if (!/^-?\d+(\.\d+)?$/.test(text)) return { error: `${label} harus berupa angka.` };
    const n = Number(text);
    if (n <= 0) return { error: `${label} harus lebih dari 0.` };
    return { value: n };
  }
  const flat = parse(flatInput, 'Batas kecepatan jalan datar');
  if (flat.error) return { ok: false, error: flat.error };
  const down = parse(downhillInput, 'Batas kecepatan jalan menurun');
  if (down.error) return { ok: false, error: down.error };
  if (down.value >= flat.value) {
    return { ok: false, error: 'Batas jalan menurun harus lebih kecil dari batas jalan datar.' };
  }
  return { ok: true, flat: flat.value, downhill: down.value };
}

// ── Data live & koneksi ──────────────────────────────────────
export function normalizeLive(raw) {
  if (!isPlainObject(raw)) return null;
  const gps = isPlainObject(raw.gps) ? raw.gps : {};
  const brake = isPlainObject(raw.brake) ? raw.brake : {};
  const speed = toFiniteNumber(gps.speed);
  return {
    gps: {
      speed: speed !== null && speed >= 0 ? speed : null,
      lat: toFiniteNumber(gps.lat),
      lng: toFiniteNumber(gps.lng),
      heading: toFiniteNumber(gps.heading),
      satellites: toFiniteNumber(gps.satellites),
    },
    tilt: toFiniteNumber(raw.tilt),
    brake: {
      exhaust_active: brake.exhaust_active === true,
      forced: brake.forced === true,
    },
    timestamp: validTimestamp(raw.timestamp),
  };
}

// Umur data live (ms) terhadap jam server; null bila tidak ada timestamp.
export function liveAgeMs(live, serverNowMs) {
  if (!live || live.timestamp === null || live.timestamp === undefined) return null;
  return serverNowMs - live.timestamp;
}

export function isLiveFresh(live, serverNowMs, timeoutMs = CONNECTION_TIMEOUT_MS) {
  const age = liveAgeMs(live, serverNowMs);
  return age !== null && age >= -FUTURE_TOLERANCE_MS && age <= timeoutMs;
}

// ── Event (hanya overspeed dan forced_brake) ─────────────────
const DEFAULT_SEVERITY = { overspeed: 'warning', forced_brake: 'danger' };

export function normalizeEvent(id, raw) {
  if (!isPlainObject(raw)) return null;
  if (!EVENT_TYPES.includes(raw.type)) return null; // jenis lain (mis. steep_slope lama) tidak dipakai
  const timestamp = validTimestamp(raw.timestamp);
  if (timestamp === null) return null;
  const speed = toFiniteNumber(raw.speed);
  return {
    id,
    type: raw.type,
    speed: speed !== null && speed >= 0 ? speed : null,
    tilt: toFiniteNumber(raw.tilt),
    timestamp,
    message: typeof raw.message === 'string' ? raw.message : '',
    severity: typeof raw.severity === 'string' && raw.severity ? raw.severity : DEFAULT_SEVERITY[raw.type],
    sessionKey: typeof raw.sessionKey === 'string' && raw.sessionKey ? raw.sessionKey : null,
    lat: toFiniteNumber(raw.lat),
    lng: toFiniteNumber(raw.lng),
  };
}

// Terbaru dulu; bila waktunya sama, urut kunci menurun agar stabil.
export function compareEventsDesc(a, b) {
  if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

export function eventTypeLabel(type) {
  return type === 'overspeed' ? 'Overspeed' : type === 'forced_brake' ? 'Forced Brake' : String(type || '');
}

// Teks ringkas untuk lonceng notifikasi dan peringatan bahaya. Kemiringan dalam persen.
export function describeEvent(event) {
  const parts = [];
  if (event.speed !== null && event.speed !== undefined) parts.push(`Kecepatan ${event.speed} km/jam`);
  if (event.tilt !== null && event.tilt !== undefined) parts.push(`Kemiringan ${event.tilt}%`);
  return {
    title: event.message || eventTypeLabel(event.type),
    details: parts.join(' • '),
  };
}

// Peringatan bahaya aktif bila event berumur <= 5 detik (jam server).
export function isDangerFresh(event, serverNowMs) {
  if (!event || event.timestamp === null || event.timestamp === undefined) return false;
  const age = serverNowMs - event.timestamp;
  return age >= -FUTURE_TOLERANCE_MS && age <= DANGER_WINDOW_MS;
}

// ── Sesi ─────────────────────────────────────────────────────
function objectEntries(value) {
  return isPlainObject(value) ? Object.entries(value) : [];
}

function normalizeLogEntry(id, raw, startTime) {
  if (!isPlainObject(raw)) return null;
  const timestamp = validTimestamp(raw.timestamp);
  if (timestamp === null) return null;
  const speed = toFiniteNumber(raw.speed);
  const elapsed = toFiniteNumber(raw.elapsedSec);
  const eventCount = toFiniteNumber(raw.eventCount);
  return {
    id,
    timestamp,
    elapsedSec: elapsed !== null && elapsed >= 0
      ? elapsed
      : startTime > 0 ? Math.max(0, Math.round((timestamp - startTime) / 1000)) : null,
    speed: speed !== null && speed >= 0 ? speed : null,
    tilt: toFiniteNumber(raw.tilt),
    forcedBrake: raw.forcedBrake === true,
    eventCount: eventCount !== null && eventCount >= 0 ? Math.floor(eventCount) : 0,
    limit: toFiniteNumber(raw.limit),
  };
}

// Mendukung sesi gaya alat (session_003: meta/behaviorLog/events) maupun kunci push.
// Status belum ditentukan di sini; lihat deriveSessions().
export function normalizeSession(key, raw) {
  if (!isPlainObject(raw)) return null;
  const meta = isPlainObject(raw.meta) ? raw.meta : {};

  // Kumpulkan timestamp dulu agar startTime bisa disimpulkan bila meta tidak ada.
  const logTimes = objectEntries(raw.behaviorLog)
    .map(([, v]) => (isPlainObject(v) ? validTimestamp(v.timestamp) : null))
    .filter((t) => t !== null);
  const eventsList = objectEntries(raw.events)
    .map(([id, v]) => normalizeEvent(id, v))
    .filter(Boolean)
    .sort(compareEventsDesc);

  const metaStart = validTimestamp(meta.startTime);
  const inferred = [...logTimes, ...eventsList.map((e) => e.timestamp)];
  const startTime = metaStart !== null ? metaStart : inferred.length ? Math.min(...inferred) : 0;

  const behaviorLog = objectEntries(raw.behaviorLog)
    .map(([id, v]) => normalizeLogEntry(id, v, startTime))
    .filter(Boolean)
    .sort((a, b) => a.timestamp - b.timestamp || (a.id < b.id ? -1 : 1));

  const endTime = validTimestamp(meta.endTime) || 0;
  const label = typeof meta.label === 'string' && meta.label.trim() ? meta.label.trim() : key;

  return {
    key,
    meta: {
      label,
      startTime,
      endTime,
      vehicleId: typeof meta.vehicleId === 'string' ? meta.vehicleId : null,
    },
    startInferred: metaStart === null && startTime > 0,
    events: eventsList,
    behaviorLog,
  };
}

function lastActivityOf(session) {
  let last = session.meta.startTime;
  if (session.behaviorLog.length) last = Math.max(last, session.behaviorLog[session.behaviorLog.length - 1].timestamp);
  if (session.events.length) last = Math.max(last, session.events[0].timestamp); // events terbaru dulu
  return last;
}

// Menambahkan status, aktivitas terakhir, dan hitungan event per sesi.
//   Selesai       : endTime > 0
//   Berlangsung   : endTime = 0, sesi terbaru, dan alat sedang terhubung
//   Belum ditutup : endTime = 0 selain itu (alat mati/putus sebelum menutup sesi)
// Daftar hasil diurutkan dari sesi terbaru.
export function deriveSessions(sessions, { isConnected = false } = {}) {
  const sorted = [...sessions].sort(
    (a, b) => b.meta.startTime - a.meta.startTime || (a.key < b.key ? 1 : a.key > b.key ? -1 : 0)
  );
  let newestOpenKey = null;
  for (const s of sorted) {
    if (s.meta.endTime === 0) { newestOpenKey = s.key; break; }
  }
  return sorted.map((s) => {
    let status = SESSION_STATUS.CLOSED;
    if (s.meta.endTime === 0) {
      status = isConnected && s.key === newestOpenKey ? SESSION_STATUS.ACTIVE : SESSION_STATUS.UNCLOSED;
    }
    const overspeed = s.events.filter((e) => e.type === 'overspeed').length;
    const forcedBrake = s.events.filter((e) => e.type === 'forced_brake').length;
    return {
      ...s,
      status,
      statusLabel: SESSION_STATUS_LABEL[status],
      lastActivity: lastActivityOf(s),
      counts: { overspeed, forcedBrake, total: overspeed + forcedBrake },
    };
  });
}

// Durasi sesi (ms). Berlangsung dihitung sampai "sekarang" (jam server),
// Belum ditutup sampai aktivitas terakhir yang tercatat, Selesai memakai endTime.
export function sessionDurationMs(session, serverNowMs) {
  const start = session.meta.startTime;
  if (!start) return null;
  let end;
  if (session.status === SESSION_STATUS.CLOSED) end = session.meta.endTime;
  else if (session.status === SESSION_STATUS.ACTIVE) end = serverNowMs;
  else end = session.lastActivity;
  return Math.max(0, end - start);
}