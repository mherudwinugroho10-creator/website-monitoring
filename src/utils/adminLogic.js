// Logika murni halaman admin SAFEDRIVE (tanpa React, tanpa Firebase).
//
// Sumber data (admin hanya MEMBACA data kendaraan; satu-satunya tulisan ke RTDB adalah settings/{vehicleId}):
//   Firestore users/{uid}                    : data akun (role, status, kendaraan yang ditugaskan)
//   Firestore driverInvites/{email}          : undangan pengemudi yang belum mendaftar
//   RTDB vehicles/{id}/live | events | sessions : ditulis alat
//   RTDB settings/{id}                       : { speedLimit1 (datar), speedLimit2 (menurun) } ditulis admin
// Bentuk dokumen dan aturan di sini harus selaras dengan firestore.rules dan aturan RTDB.

import { cleanVehicleId, inviteKey, normalizeEmail } from './accountLogic.js';
import {
  EVENT_TYPES, NOTIFY_WINDOW_MS, CONNECTION_TIMEOUT_MS,
  toFiniteNumber, normalizeLimits, getTerrain, getActiveLimit, isOverspeed, isLiveFresh,
  activeDangerEvents, buildDangerAlert, nextDangerExpiryMs, severityRank,
  compareEventsDesc, countEvents, deriveSessions, formatNumber,
} from './vehicleLogic.js';
import {
  RANGE_ERROR, formatDateTime, describeDateRange, parseDateInput, buildLogRows, groupRowsBySession,
} from './behaviorLogic.js';

// ── Konstanta ────────────────────────────────────────────────
export const PERFORMANCE_EVENTS_LIMIT = 1000; // event terbaru per kendaraan yang dimuat untuk rekap
export const LIMIT_WARNING_ABOVE = 120;       // km/jam; di atas ini admin diberi peringatan (bukan penolakan)
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ROW_STATUS = Object.freeze({ ACTIVE: 'active', INACTIVE: 'inactive', PENDING: 'pending' });
export const ROW_STATUS_LABEL = Object.freeze({ active: 'Aktif', inactive: 'Nonaktif', pending: 'Menunggu pendaftaran' });

export const PERFORMANCE_TYPE_OPTIONS = Object.freeze([
  { value: 'all', label: 'Semua' },
  { value: 'overspeed', label: 'Overspeed' },
  { value: 'forced_brake', label: 'Forced Brake' },
]);

const NAME_MAX = 80;
const VEHICLE_NAME_MAX = 80;
const PLATE_MAX = 15;

// ── Dasar ────────────────────────────────────────────────────
function str(value) {
  return typeof value === 'string' ? value : '';
}

function squash(value) {
  return str(value).replace(/\s+/g, ' ').trim();
}

// Karakter kontrol (kode 0-31 dan 127) dilarang pada kunci RTDB.
function hasControlChars(text) {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

function compareText(a, b) {
  return String(a).localeCompare(String(b), 'id', { sensitivity: 'base' });
}

// ── Dokumen Firestore ────────────────────────────────────────
// users/{uid}: role selain 'admin' dianggap pengemudi; status selain 'active' berarti nonaktif
// (status kosong dianggap aktif, sama seperti AuthContext).
export function normalizeUserDoc(id, data) {
  const d = data && typeof data === 'object' ? data : {};
  return {
    id,
    name: squash(d.name),
    email: str(d.email).trim(),
    role: d.role === 'admin' ? 'admin' : 'user',
    status: d.status === undefined || d.status === 'active' ? ROW_STATUS.ACTIVE : ROW_STATUS.INACTIVE,
    vehicleId: cleanVehicleId(d.vehicleId) || '',
    vehicleName: squash(d.vehicleName),
    vehiclePlate: squash(d.vehiclePlate),
    phone: str(d.phone).trim(),
    createdAt: str(d.createdAt),
  };
}

// driverInvites/{email huruf kecil}
export function normalizeInviteDoc(id, data) {
  const d = data && typeof data === 'object' ? data : {};
  return {
    id,
    name: squash(d.name),
    email: str(d.email).trim() || id,
    vehicleId: cleanVehicleId(d.vehicleId) || '',
    vehicleName: squash(d.vehicleName),
    vehiclePlate: squash(d.vehiclePlate),
    createdAt: str(d.createdAt),
  };
}

// ── Daftar pengemudi (Kelola Pengemudi) ──────────────────────
// Satu baris per pengemudi terdaftar, ditambah satu baris per undangan yang belum dipakai.
// Undangan milik email yang sudah punya akun disembunyikan (sisa undangan yang gagal terhapus).
export function buildDriverRows(users, invites) {
  const allUsers = Array.isArray(users) ? users : [];
  const registeredEmails = new Set(allUsers.map((u) => inviteKey(u.email)).filter(Boolean));

  const rows = [];
  for (const u of allUsers) {
    if (u.role === 'admin') continue;
    rows.push({
      key: `u:${u.id}`, kind: 'driver', id: u.id,
      name: u.name, email: u.email, status: u.status,
      vehicleId: u.vehicleId, vehicleName: u.vehicleName, vehiclePlate: u.vehiclePlate,
    });
  }
  for (const inv of Array.isArray(invites) ? invites : []) {
    if (registeredEmails.has(inviteKey(inv.email))) continue;
    rows.push({
      key: `i:${inv.id}`, kind: 'invite', id: inv.id,
      name: inv.name, email: inv.email, status: ROW_STATUS.PENDING,
      vehicleId: inv.vehicleId, vehicleName: inv.vehicleName, vehiclePlate: inv.vehiclePlate,
    });
  }
  return rows.sort((a, b) => compareText(a.name || a.email, b.name || b.email) || compareText(a.email, b.email));
}

// Pencarian tidak peka huruf besar-kecil pada nama, email, ID, nama, dan plat kendaraan.
export function filterDriverRows(rows, search) {
  const q = squash(search).toLowerCase();
  if (!q) return rows || [];
  return (rows || []).filter((r) => [r.name, r.email, r.vehicleId, r.vehicleName, r.vehiclePlate]
    .some((field) => str(field).toLowerCase().includes(q)));
}

// ── Armada kendaraan (Dashboard, Pengaturan) ─────────────────
// Satu kendaraan per ID, dari pengemudi terdaftar (aktif maupun nonaktif) dan undangan yang menunggu.
// Bila satu ID tercatat di beberapa baris, pengemudi terdaftar didahulukan.
export function buildFleet(users, invites) {
  const byId = new Map();
  for (const row of buildDriverRows(users, invites)) {
    if (!row.vehicleId) continue;
    const existing = byId.get(row.vehicleId);
    if (existing && (existing.kind === 'driver' || row.kind === 'invite')) continue;
    byId.set(row.vehicleId, {
      vehicleId: row.vehicleId,
      name: row.vehicleName || row.vehicleId,
      plate: row.vehiclePlate,
      driverId: row.id,
      driverName: row.name || row.email,
      driverStatus: row.status,
      kind: row.kind,
      pending: row.kind === 'invite',
    });
  }
  return [...byId.values()].sort((a, b) => compareText(a.name, b.name) || compareText(a.vehicleId, b.vehicleId));
}

export function vehicleLabel(vehicle) {
  if (!vehicle) return '';
  return vehicle.plate ? `${vehicle.name} · ${vehicle.plate}` : vehicle.name;
}

export function fleetVehicleIds(fleet) {
  return (fleet || []).map((v) => v.vehicleId);
}

// ID kendaraan unik milik pengemudi terdaftar (dasar langganan data rekap performa).
export function driverVehicleIds(users) {
  const ids = new Set();
  for (const u of users || []) {
    if (u.role !== 'admin' && u.vehicleId) ids.add(u.vehicleId);
  }
  return [...ids].sort(compareText);
}

// ── Formulir pengemudi ───────────────────────────────────────
// mode: 'create' (undangan baru) | 'edit-driver' (pengemudi terdaftar) | 'edit-invite' (undangan)
// selfKey: kunci baris yang sedang diedit (u:UID / i:EMAIL), dikecualikan dari pemeriksaan duplikat.
export function validateDriverForm(form, { mode, users, invites, selfKey = null }) {
  const f = form || {};
  const rows = buildDriverRows(users, invites);
  const errors = {};

  const name = squash(f.name);
  if (!name) errors.name = 'Nama wajib diisi.';
  else if (name.length > NAME_MAX) errors.name = `Nama maksimal ${NAME_MAX} karakter.`;

  let email = inviteKey(f.email);
  if (mode === 'create') {
    const raw = normalizeEmail(f.email);
    if (!raw) errors.email = 'Email wajib diisi.';
    else if (raw.length > 254 || !EMAIL_PATTERN.test(raw)) errors.email = 'Format email tidak valid.';
    else {
      const account = (users || []).find((u) => inviteKey(u.email) === email);
      if (account) {
        errors.email = account.role === 'admin'
          ? 'Email ini dipakai akun administrator.'
          : 'Email sudah terdaftar sebagai pengemudi. Gunakan tombol Edit untuk menetapkan kendaraan.';
      } else if (rows.some((r) => r.kind === 'invite' && inviteKey(r.email) === email)) {
        errors.email = 'Email ini sudah memiliki undangan yang menunggu pendaftaran.';
      }
    }
  }

  const rawVehicle = str(f.vehicleId).trim();
  let vehicleId = '';
  if (!rawVehicle) {
    if (mode !== 'edit-driver') errors.vehicleId = 'ID kendaraan wajib diisi.';
  } else {
    const clean = hasControlChars(rawVehicle) ? null : cleanVehicleId(rawVehicle);
    if (clean === null) {
      errors.vehicleId = 'ID kendaraan maksimal 128 karakter dan tidak boleh memuat . $ # [ ] /';
    } else {
      vehicleId = clean;
      const holder = rows.find((r) => r.key !== selfKey && r.vehicleId === clean);
      if (holder) {
        errors.vehicleId = `ID kendaraan "${clean}" sudah dipakai oleh ${holder.name || holder.email}${holder.kind === 'invite' ? ' (menunggu pendaftaran)' : ''}.`;
      }
    }
  }

  const vehicleName = squash(f.vehicleName);
  if (vehicleName.length > VEHICLE_NAME_MAX) errors.vehicleName = `Nama kendaraan maksimal ${VEHICLE_NAME_MAX} karakter.`;

  const vehiclePlate = squash(f.vehiclePlate).toUpperCase();
  if (vehiclePlate.length > PLATE_MAX) errors.vehiclePlate = `Plat nomor maksimal ${PLATE_MAX} karakter.`;

  return { ok: Object.keys(errors).length === 0, errors, values: { name, email, vehicleId, vehicleName, vehiclePlate } };
}

// Dokumen undangan: hanya field yang diizinkan firestore.rules.
export function buildInviteDoc(values, { adminUid, now, createdAt } = {}) {
  const doc = {
    name: values.name,
    email: inviteKey(values.email),
    vehicleId: values.vehicleId,
    vehicleName: values.vehicleName,
    vehiclePlate: values.vehiclePlate,
    createdAt: createdAt || (now instanceof Date ? now : new Date(now === undefined ? Date.now() : now)).toISOString(),
  };
  if (adminUid) doc.createdBy = adminUid;
  return doc;
}

// Perubahan data pengemudi terdaftar: hanya field yang boleh diubah admin (role, email, createdAt tidak pernah ikut).
export function buildDriverPatch(values) {
  return {
    name: values.name,
    vehicleId: values.vehicleId,
    vehicleName: values.vehicleName,
    vehiclePlate: values.vehiclePlate,
  };
}

export function nextStatus(status) {
  return status === ROW_STATUS.ACTIVE ? ROW_STATUS.INACTIVE : ROW_STATUS.ACTIVE;
}

// Pesan galat penulisan Firestore yang dipahami admin.
export function describeAdminWriteError(err, fallback = 'Gagal menyimpan perubahan.') {
  const code = String((err && (err.code || err.message)) || '').toLowerCase();
  if (code.includes('permission')) return 'Ditolak oleh aturan keamanan. Pastikan akun ini berperan admin di Firestore dan aturan terbaru sudah dipublikasikan.';
  if (code.includes('unavailable') || code.includes('network') || code.includes('deadline') || code.includes('timeout')) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.';
  }
  if (code.includes('not-found')) return 'Data tidak ditemukan. Mungkin sudah dihapus.';
  return fallback;
}

// ── Peringatan bahaya lintas kendaraan (Dashboard Admin) ─────
// eventsByVehicle: { [vehicleId]: event[] } (event sudah dinormalisasi). Satu peringatan per kendaraan,
// berisi event berumur <= 5 detik (jam server); urut dari paling berat lalu paling baru.
export function buildFleetAlerts(eventsByVehicle, fleet, serverNowMs) {
  const alerts = [];
  for (const v of fleet || []) {
    const active = activeDangerEvents((eventsByVehicle || {})[v.vehicleId], serverNowMs);
    const alert = buildDangerAlert(active);
    if (!alert) continue;
    alerts.push({
      vehicleId: v.vehicleId,
      label: vehicleLabel(v),
      driverName: v.driverName,
      alert,
    });
  }
  return alerts.sort((a, b) => severityRank(b.alert.severity) - severityRank(a.alert.severity)
    || b.alert.newestTimestamp - a.alert.newestTimestamp
    || compareText(a.vehicleId, b.vehicleId));
}

// Jeda (ms) sampai peringatan paling awal habis masa tampilnya; null bila tidak ada yang aktif.
export function nextFleetAlertExpiryMs(eventsByVehicle, serverNowMs) {
  let next = null;
  for (const list of Object.values(eventsByVehicle || {})) {
    const ms = nextDangerExpiryMs(list, serverNowMs);
    if (ms !== null && (next === null || ms < next)) next = ms;
  }
  return next;
}

// Event yang baru masuk setelah pembacaan pertama tiap kendaraan (pembacaan pertama hanya menjadi dasar).
// seen: Map<vehicleId, Set<eventId>>; loaded: { [vehicleId]: true } untuk kendaraan yang datanya sudah termuat.
// Hanya event yang masih baru (<= NOTIFY_WINDOW_MS) dikembalikan; masukan tidak diubah.
export function collectNewEvents(seen, eventsByVehicle, loaded, nowMs, windowMs = NOTIFY_WINDOW_MS) {
  const nextSeen = new Map();
  for (const [id, set] of seen || []) nextSeen.set(id, new Set(set));
  const fresh = [];
  for (const [vehicleId, isLoaded] of Object.entries(loaded || {})) {
    if (!isLoaded) continue;
    const list = (eventsByVehicle || {})[vehicleId] || [];
    if (!nextSeen.has(vehicleId)) {
      nextSeen.set(vehicleId, new Set(list.map((e) => e.id)));
      continue;
    }
    const known = nextSeen.get(vehicleId);
    for (const e of list) {
      if (known.has(e.id)) continue;
      known.add(e.id);
      if (nowMs - e.timestamp <= windowMs) fresh.push({ vehicleId, event: e });
    }
  }
  fresh.sort((a, b) => a.event.timestamp - b.event.timestamp || compareText(a.vehicleId, b.vehicleId));
  return { fresh, seen: nextSeen };
}

// Jumlah event hari berjalan seluruh kendaraan. ready = semua kendaraan sudah termuat.
export function fleetTodayCounts(eventsByVehicle, loaded, vehicleIds) {
  let overspeed = 0;
  let forcedBrake = 0;
  let ready = true;
  for (const id of vehicleIds || []) {
    if (!(loaded || {})[id]) { ready = false; continue; }
    const c = countEvents((eventsByVehicle || {})[id]);
    overspeed += c.overspeed;
    forcedBrake += c.forcedBrake;
  }
  return { overspeed, forcedBrake, total: overspeed + forcedBrake, ready };
}

// ── Tabel monitoring seluruh kendaraan (Dashboard Admin) ─────
// liveById[id]: undefined = belum termuat, null = belum ada data, objek = data live ternormalisasi.
// settingsById[id]: isi settings/{id} apa adanya (atau undefined/null).
// Kolom tabel: kecepatan, kemiringan jalan, dan status exhaust brake (true = ON, false = OFF) hanya terisi bila alat
// terhubung (data live <= 15 detik); selain itu null. Posisi/lokasi tidak ditampilkan (skripsi hanya memantau
// kecepatan, status pengereman, dan kemiringan jalan).
export function buildFleetRows(fleet, liveById, settingsById, serverNowMs) {
  return (fleet || []).map((v) => {
    const live = (liveById || {})[v.vehicleId];
    const loaded = live !== undefined;
    const connected = !!live && isLiveFresh(live, serverNowMs);
    const speed = connected ? live.gps.speed : null;
    const tilt = connected ? live.tilt : null;
    const terrain = connected ? getTerrain(tilt) : 'unknown';
    const exhaust = connected ? live.brake.exhaust_active : null;
    const limits = normalizeLimits((settingsById || {})[v.vehicleId]);
    const activeLimit = getActiveLimit(terrain, limits);
    return {
      vehicleId: v.vehicleId,
      name: v.name,
      plate: v.plate,
      driverName: v.driverName,
      driverStatus: v.driverStatus,
      pending: v.pending,
      status: !loaded ? 'loading' : connected ? 'connected' : 'disconnected',
      connected,
      speed,
      tilt,
      terrain,
      activeLimit,
      isOverspeed: isOverspeed(speed, activeLimit),
      exhaust,
      lastUpdate: live && live.timestamp !== null ? live.timestamp : null,
    };
  });
}

export function summarizeFleet(rows) {
  let connected = 0;
  let disconnected = 0;
  let overspeedNow = 0;
  for (const r of rows || []) {
    if (r.status === 'connected') connected += 1;
    else if (r.status === 'disconnected') disconnected += 1;
    if (r.isOverspeed) overspeedNow += 1;
  }
  return { total: (rows || []).length, connected, disconnected, overspeedNow };
}

// Jeda (ms) sampai ada kendaraan yang lewat batas koneksi 15 detik; null bila tidak ada yang terhubung.
export function nextConnectionCheckMs(liveById, serverNowMs) {
  let next = null;
  for (const live of Object.values(liveById || {})) {
    if (!live || !isLiveFresh(live, serverNowMs)) continue;
    const remaining = live.timestamp + CONNECTION_TIMEOUT_MS - serverNowMs;
    if (remaining < 0) continue;
    const wait = remaining + 1;
    if (next === null || wait < next) next = wait;
  }
  return next;
}

// ── Rekap pelanggaran (Performa Pengemudi) ───────────────────
// users: dokumen users ternormalisasi (semua role); eventsByVehicle: { [vehicleId]: event[] } (undefined = belum termuat).
// filter: { search, type: 'all'|'overspeed'|'forced_brake', from: 'YYYY-MM-DD'|'', to: 'YYYY-MM-DD'|'' }
// Filter tipe menyaring event yang dihitung; kolom tipe yang tidak ikut dihitung bernilai null (tampil "—").
export function buildPerformanceRows(users, eventsByVehicle, filter) {
  const f = filter || {};
  const drivers = (users || []).filter((u) => u.role !== 'admin');
  const empty = { rows: [], rangeError: null, totals: { drivers: 0, overspeed: 0, forcedBrake: 0, total: 0 }, driverCount: drivers.length, allReady: true };

  const from = f.from ? parseDateInput(f.from) : null;
  const to = f.to ? parseDateInput(f.to) : null;
  if (from && to && from.start > to.end) return { ...empty, rangeError: RANGE_ERROR };

  const type = f.type === 'overspeed' || f.type === 'forced_brake' ? f.type : 'all';
  const q = squash(f.search).toLowerCase();

  let rows = drivers.map((d) => {
    const list = d.vehicleId ? (eventsByVehicle || {})[d.vehicleId] : undefined;
    const ready = !d.vehicleId || Array.isArray(list);
    const events = (Array.isArray(list) ? list : [])
      .filter((e) => EVENT_TYPES.includes(e.type)
        && (type === 'all' || e.type === type)
        && (!from || e.timestamp >= from.start)
        && (!to || e.timestamp <= to.end))
      .sort(compareEventsDesc);
    const counts = countEvents(events);
    return {
      key: d.id, uid: d.id, name: d.name, email: d.email, status: d.status,
      vehicleId: d.vehicleId, vehicleName: d.vehicleName, vehiclePlate: d.vehiclePlate,
      hasVehicle: !!d.vehicleId, ready,
      // Event kendaraan belum termuat / gagal dibaca: hitungan tidak diketahui (null), bukan 0.
      overspeed: !ready || type === 'forced_brake' ? null : counts.overspeed,
      forcedBrake: !ready || type === 'overspeed' ? null : counts.forcedBrake,
      total: ready ? counts.total : null,
      events,
    };
  });

  if (q) {
    rows = rows.filter((r) => [r.name, r.email, r.vehicleId, r.vehicleName, r.vehiclePlate]
      .some((field) => str(field).toLowerCase().includes(q)));
  }

  const totals = { drivers: rows.length, overspeed: 0, forcedBrake: 0, total: 0 };
  for (const r of rows) {
    totals.overspeed += r.overspeed || 0;
    totals.forcedBrake += r.forcedBrake || 0;
    totals.total += r.total || 0;
  }
  return { rows, rangeError: null, totals, driverCount: drivers.length, allReady: rows.every((r) => r.ready) };
}

// key: 'name' | 'vehicle' | 'overspeed' | 'forcedBrake' | 'total'; dir: 'asc' | 'desc'.
// Nilai kosong (tipe tidak dihitung) selalu di bawah; seri diurutkan nama lalu ID.
export function sortPerformanceRows(rows, key, dir) {
  const sign = dir === 'asc' ? 1 : -1;
  const value = (r) => (key === 'name' ? r.name || r.email : key === 'vehicle' ? r.vehicleName || r.vehicleId : r[key]);
  return [...(rows || [])].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    const na = va === null || va === undefined || va === '';
    const nb = vb === null || vb === undefined || vb === '';
    if (na !== nb) return na ? 1 : -1;
    if (!na) {
      const c = typeof va === 'string' ? compareText(va, vb) : va - vb;
      if (c !== 0) return c * sign;
    }
    return compareText(a.name || a.email, b.name || b.email) || compareText(a.key, b.key);
  });
}

// Kendaraan yang event lamanya mungkin terpotong batas muat: daftar penuh dan event tertuanya
// masih lebih baru daripada awal rentang tanggal (atau tidak ada rentang awal).
export function truncatedVehicles(eventsByVehicle, fromInput, limit = PERFORMANCE_EVENTS_LIMIT) {
  const from = fromInput ? parseDateInput(fromInput) : null;
  const ids = [];
  for (const [vehicleId, list] of Object.entries(eventsByVehicle || {})) {
    if (!Array.isArray(list) || list.length < limit) continue;
    const oldest = Math.min(...list.map((e) => e.timestamp));
    if (!from || oldest > from.start) ids.push(vehicleId);
  }
  return ids.sort(compareText);
}

// ── Rincian pelanggaran satu pengemudi ───────────────────────
function describeViolation(event) {
  if (event.message) return event.message;
  return event.type === 'overspeed' ? 'Kecepatan melebihi batas yang berlaku' : 'Pengereman paksa diaktifkan perangkat';
}

export function buildEventDetailRows(events) {
  return [...(events || [])].sort(compareEventsDesc).map((e) => ({
    id: e.id,
    timestamp: e.timestamp,
    type: e.type,
    typeLabel: e.type === 'overspeed' ? 'Overspeed' : 'Forced Brake',
    description: describeViolation(e),
    speed: e.speed,
    tilt: e.tilt,
  }));
}

// ── Ekspor Excel ─────────────────────────────────────────────
// Angka tetap berupa angka; nilai kosong -> sel kosong.
export const PERFORMANCE_EXPORT_HEADERS = Object.freeze([
  'No', 'Pengemudi', 'Email', 'Kendaraan', 'Plat Nomor', 'ID Kendaraan', 'Overspeed', 'Forced Brake', 'Total',
]);
export const DETAIL_EXPORT_HEADERS = Object.freeze([
  'No', 'Waktu', 'Tipe', 'Keterangan', 'Kecepatan (km/jam)', 'Kemiringan Jalan (%)',
]);

const blank = (v) => (v === null || v === undefined ? '' : v);

// Pengemudi tanpa kendaraan tidak punya data pelanggaran: sel hitungan dikosongkan (sama seperti "—" di tabel), bukan 0.
export function performanceSheetRows(rows) {
  return (rows || []).map((r, i) => [
    i + 1, r.name, r.email, r.vehicleName || r.vehicleId || '', r.vehiclePlate, r.vehicleId,
    r.hasVehicle ? blank(r.overspeed) : '', r.hasVehicle ? blank(r.forcedBrake) : '', r.hasVehicle ? blank(r.total) : '',
  ]);
}

export function detailSheetRows(detailRows) {
  return (detailRows || []).map((r, i) => [
    i + 1, formatDateTime(r.timestamp), r.typeLabel, r.description,
    blank(r.speed), blank(r.tilt),
  ]);
}

function typeLabelOf(type) {
  const found = PERFORMANCE_TYPE_OPTIONS.find((o) => o.value === type);
  return found ? found.label : PERFORMANCE_TYPE_OPTIONS[0].label;
}

export function performanceExportInfo({ filter, rows, totals, exportedAt, adminName, truncatedIds, failedIds }) {
  const info = [
    ['Laporan', 'Rekap Pelanggaran Pengemudi'],
    ['Filter tipe', typeLabelOf(filter && filter.type)],
    ['Filter tanggal', describeDateRange(filter)],
    ['Pencarian', squash(filter && filter.search) || '—'],
    ['Jumlah pengemudi', (rows || []).length],
    ['Total pelanggaran', totals ? totals.total : 0],
    ['Diekspor oleh', adminName || '—'],
    ['Diekspor pada', formatDateTime(exportedAt)],
  ];
  if (truncatedIds && truncatedIds.length) {
    info.push(['Catatan', `Data dibatasi ${PERFORMANCE_EVENTS_LIMIT} event terbaru per kendaraan; event yang lebih lama dari itu tidak ikut (${truncatedIds.join(', ')}).`]);
  }
  if (failedIds && failedIds.length) {
    info.push(['Catatan', `Event gagal dibaca untuk kendaraan ${failedIds.join(', ')}; hitungan pengemudi terkait dikosongkan dan tidak ikut total.`]);
  }
  return info;
}

export function detailExportInfo({ driver, filter, rowCount, summary, exportedAt, adminName }) {
  return [
    ['Laporan', 'Rincian Pelanggaran Pengemudi'],
    ['Pengemudi', (driver && (driver.name || driver.email)) || '—'],
    ['Kendaraan', [driver && driver.vehicleName, driver && driver.vehiclePlate].filter(Boolean).join(' · ') || (driver && driver.vehicleId) || '—'],
    ['ID kendaraan', (driver && driver.vehicleId) || '—'],
    ['Filter tipe', typeLabelOf(filter && filter.type)],
    ['Filter tanggal', describeDateRange(filter)],
    ['Overspeed', summary ? blank(summary.overspeed) : ''],
    ['Forced Brake', summary ? blank(summary.forcedBrake) : ''],
    ['Total pelanggaran', summary ? summary.total : 0],
    ['Jumlah baris', rowCount],
    ['Diekspor oleh', adminName || '—'],
    ['Diekspor pada', formatDateTime(exportedAt)],
  ];
}

function safePart(text) {
  return String(text || '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
}

function localDateStamp(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function performanceFileName(exportedAt) {
  return `rekap_pelanggaran_${localDateStamp(exportedAt)}.xlsx`;
}

export function detailFileName(driver, exportedAt) {
  const who = safePart(driver && (driver.name || driver.vehicleId)) || 'pengemudi';
  return `pelanggaran_${who}_${localDateStamp(exportedAt)}.xlsx`;
}

// ── Riwayat sesi seluruh pengemudi ───────────────────────────
// Sesi tiap kendaraan diturunkan seperti pada Behavior Log pengemudi (status Berlangsung/Selesai/Belum ditutup),
// lalu baris sesi dibangun dari event kendaraan itu dan rekaman berkala sesi. Hanya kelompok sesi yang dikembalikan
// (event di luar sesi yang termuat tetap terhitung pada rekap, tetapi bukan bagian riwayat sesi).
// Tanggal pada filter memakai waktu MULAI sesi. Hasil diurutkan dari sesi terbaru lintas pengemudi.
export function buildAdminSessionGroups({ users, eventsByVehicle, sessionsByVehicle, connectedByVehicle, filter }) {
  const f = filter || {};
  const from = f.from ? parseDateInput(f.from) : null;
  const to = f.to ? parseDateInput(f.to) : null;
  if (from && to && from.start > to.end) return { groups: [], rangeError: RANGE_ERROR, ready: true };

  const q = squash(f.search).toLowerCase();
  const drivers = (users || []).filter((u) => u.role !== 'admin' && u.vehicleId);
  const groups = [];
  let ready = true;

  for (const d of drivers) {
    if (q && ![d.name, d.email, d.vehicleId, d.vehicleName, d.vehiclePlate].some((x) => str(x).toLowerCase().includes(q))) continue;
    const rawSessions = (sessionsByVehicle || {})[d.vehicleId];
    if (!Array.isArray(rawSessions)) { ready = false; continue; }
    const derived = deriveSessions(rawSessions, { isConnected: !!(connectedByVehicle || {})[d.vehicleId] });
    const rows = buildLogRows((eventsByVehicle || {})[d.vehicleId] || [], derived);
    const owner = [d.name || d.email, [d.vehicleName, d.vehiclePlate].filter(Boolean).join(' ') || d.vehicleId].filter(Boolean).join(' • ');
    for (const g of groupRowsBySession(rows, derived)) {
      if (!g.session) continue;
      const start = g.session.meta.startTime;
      if (from && (!start || start < from.start)) continue;
      if (to && (!start || start > to.end)) continue;
      groups.push({ ...g, owner, driverId: d.id, driverName: d.name || d.email, vehicleId: d.vehicleId, uniqueKey: `${d.vehicleId}|${g.key}` });
    }
  }

  groups.sort((a, b) => b.session.meta.startTime - a.session.meta.startTime || compareText(a.uniqueKey, b.uniqueKey));
  return { groups, rangeError: null, ready };
}

// ── Pengaturan batas kecepatan ───────────────────────────────
// settings/{id} -> nilai tampilan formulir. Hanya angka > 0 yang dianggap sudah diatur.
export function settingsSnapshot(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const flat = toFiniteNumber(r.speedLimit1);
  const downhill = toFiniteNumber(r.speedLimit2);
  const f = flat !== null && flat > 0 ? flat : null;
  const d = downhill !== null && downhill > 0 ? downhill : null;
  return { flat: f, downhill: d, configured: f !== null && d !== null };
}

export function limitInputText(value) {
  const n = toFiniteNumber(value);
  return n === null ? '' : String(n);
}

// Payload penulisan settings/{vehicleId}: tepat dua field, ditulis sekaligus (aturan RTDB membandingkan keduanya).
export function buildSettingsPayload(validated) {
  return { speedLimit1: validated.flat, speedLimit2: validated.downhill };
}

function inputNumber(input) {
  const text = String(input === null || input === undefined ? '' : input).trim().replace(',', '.');
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : null;
}

// Apakah isian formulir berbeda dari nilai tersimpan (bandingkan angkanya, bukan tulisannya).
export function isSettingsDirty(flatInput, downhillInput, snapshot) {
  const same = (input, saved) => {
    const n = inputNumber(input);
    if (n !== null) return saved !== null && n === saved;
    return String(input === null || input === undefined ? '' : input).trim() === '' && saved === null;
  };
  return !(same(flatInput, snapshot.flat) && same(downhillInput, snapshot.downhill));
}

// Isian yang menjadi sebab galat validateSpeedLimits (urutan pemeriksaan sama): 'flat' | 'downhill' | null bila valid.
// Batas menurun yang tidak lebih kecil dari batas datar dikaitkan ke isian menurun.
export function limitErrorField(flatInput, downhillInput) {
  const flat = inputNumber(flatInput);
  const downhill = inputNumber(downhillInput);
  if (flat === null || flat <= 0) return 'flat';
  if (downhill === null || downhill <= 0) return 'downhill';
  if (downhill >= flat) return 'downhill';
  return null;
}

// Peringatan (bukan penolakan) untuk nilai yang lolos validasi namun tidak lazim.
export function limitWarnings(flat, downhill) {
  const warnings = [];
  if (flat > LIMIT_WARNING_ABOVE) {
    warnings.push(`Batas jalan datar ${formatNumber(flat, 2)} km/jam di atas ${LIMIT_WARNING_ABOVE} km/jam, tidak lazim untuk kendaraan berat. Pastikan nilainya sudah benar.`);
  }
  if (downhill > LIMIT_WARNING_ABOVE) {
    warnings.push(`Batas jalan menurun ${formatNumber(downhill, 2)} km/jam di atas ${LIMIT_WARNING_ABOVE} km/jam, tidak lazim untuk kendaraan berat. Pastikan nilainya sudah benar.`);
  }
  return warnings;
}

// Izin menulis settings ditentukan admins/{uid} === true di RTDB.
//   value: isi admins/{uid} (hanya bermakna bila read berhasil); readFailed: pembacaan ditolak/gagal.
export function adminWriteAccess({ loaded, value, readFailed }) {
  if (readFailed) return 'unknown';
  if (!loaded) return 'checking';
  return value === true ? 'granted' : 'denied';
}

export function describeSettingsWriteError(err) {
  const code = String((err && (err.code || err.message)) || '').toLowerCase();
  if (code.includes('permission')) {
    return 'Penyimpanan ditolak. Akun admin ini harus bernilai true pada admins/{UID} di Realtime Database, dan nilainya harus memenuhi aturan (batas menurun lebih kecil dari batas datar).';
  }
  if (code.includes('network') || code.includes('unavailable') || code.includes('timeout') || code.includes('disconnected')) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.';
  }
  return 'Gagal menyimpan pengaturan. Coba lagi.';
}