// Logika murni halaman Behavior Log (tanpa React, tanpa Firebase).
//
// Behavior Log menggabungkan dua sumber data yang hanya DIBACA website:
//   1. Rekaman berkala (setiap 1 menit)  : vehicles/{id}/sessions/{sesi}/behaviorLog/{rekaman}
//        { timestamp, elapsedSec?, speed, tilt?, forcedBrake, exhaustActive?, eventCount }
//   2. Event bahaya (segera saat terjadi): vehicles/{id}/events/{event}
//        { type: 'overspeed' | 'forced_brake', speed, tilt?, timestamp, message?, sessionKey? }
// Keduanya sudah dinormalisasi oleh vehicleLogic (normalizeSession, normalizeEvent).
//
// Status pengereman pada tabel:
//   Rekaman : 'Forced brake' bila forcedBrake, 'Exhaust brake' bila exhaustActive, selain itu 'Normal'.
//   Event   : 'Forced brake'. Menurut skripsi, event overspeed dan forced_brake dikirim bersamaan saat
//             perangkat mengaktifkan pengereman paksa (Tabel III.13).

export const KIND = Object.freeze({ RECORD: 'record', OVERSPEED: 'overspeed', FORCED_BRAKE: 'forced_brake' });
export const KIND_LABEL = Object.freeze({ record: 'Rekaman', overspeed: 'Overspeed', forced_brake: 'Forced Brake' });
export const TYPE_FILTER_OPTIONS = Object.freeze([
  { value: 'all', label: 'Semua' },
  { value: 'overspeed', label: 'Overspeed' },
  { value: 'forced_brake', label: 'Forced Brake' },
  { value: 'record', label: 'Rekaman Berkala' },
]);
export const BRAKE = Object.freeze({ NORMAL: 'normal', EXHAUST: 'exhaust', FORCED: 'forced' });
export const BRAKE_LABEL = Object.freeze({ normal: 'Normal', exhaust: 'Exhaust brake', forced: 'Forced brake' });
export const UNASSIGNED_LABEL = 'Di luar sesi';
export const RANGE_ERROR = 'Tanggal mulai tidak boleh setelah tanggal akhir.';

export const EXPORT_HEADERS = Object.freeze([
  'No', 'Waktu', 'Tipe', 'Keterangan', 'Kecepatan (km/jam)', 'Kemiringan (%)', 'Status Pengereman', 'Sesi',
]);

// ── Format ───────────────────────────────────────────────────
function pad2(n) {
  return String(n).padStart(2, '0');
}

function isTime(value) {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

// "25/10/2026 12.48.00" menurut zona waktu perangkat pengguna; '—' bila tidak valid.
export function formatDateTime(ms) {
  if (!isTime(ms)) return '—';
  const d = new Date(ms);
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}.${pad2(d.getMinutes())}.${pad2(d.getSeconds())}`;
}

// Lama waktu dalam detik -> "03:05" atau "1:03:05".
export function formatElapsed(totalSec) {
  if (typeof totalSec !== 'number' || !Number.isFinite(totalSec) || totalSec < 0) return '—';
  const sec = Math.floor(totalSec);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`;
}

// Durasi (ms) -> "1 j 5 mnt 3 dtk", "5 mnt 3 dtk", "45 dtk"; '—' bila tidak valid.
export function formatDurationMs(ms) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return '—';
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const parts = [];
  if (h > 0) parts.push(`${h} j`);
  if (h > 0 || m > 0) parts.push(`${m} mnt`);
  parts.push(`${s} dtk`);
  return parts.join(' ');
}

// ── Baris tabel gabungan ─────────────────────────────────────
export function brakeOfRecord(record) {
  if (record.forcedBrake === true) return BRAKE.FORCED;
  if (record.exhaustActive === true) return BRAKE.EXHAUST;
  return BRAKE.NORMAL;
}

function describeEventRow(event) {
  if (event.message) return event.message;
  return event.type === 'overspeed' ? 'Kecepatan melebihi batas yang berlaku' : 'Pengereman paksa diaktifkan perangkat';
}

// Keterangan rekaman dipecah menjadi judul + rincian agar tabel dapat menampilkannya dua baris tanpa dipotong;
// teks gabungannya (description) tetap dipakai untuk ekspor Excel.
function describeRecordParts(record) {
  const elapsed = formatElapsed(record.elapsedSec);
  return { main: 'Rekaman berkala', detail: elapsed === '—' ? null : `${elapsed} sejak sesi dimulai` };
}

function describeRecordRow(record) {
  const { main, detail } = describeRecordParts(record);
  return detail ? `${main} • ${detail}` : main;
}

function eventKey(event) {
  return `${event.type}|${event.timestamp}`;
}

// Menentukan sesi sebuah event: sessionKey bila sesinya termuat, jika tidak sesi terbaru yang
// sudah dimulai pada saat event. Sesi yang sudah ditutup tidak mengklaim event sesudah endTime.
// Hasil null = event di luar sesi manapun yang termuat.
export function assignSessionKey(event, sessions) {
  const list = Array.isArray(sessions) ? sessions : [];
  if (event.sessionKey && list.some((s) => s.key === event.sessionKey)) return event.sessionKey;
  let best = null;
  for (const s of list) {
    const start = s.meta.startTime;
    if (!start || event.timestamp < start) continue;
    if (best === null || start > best.meta.startTime) best = s;
  }
  if (best === null) return null;
  if (best.meta.endTime > 0 && event.timestamp > best.meta.endTime) return null;
  return best.key;
}

function sortRowsDesc(a, b) {
  if (b.timestamp !== a.timestamp) return b.timestamp - a.timestamp;
  const rank = { record: 0, overspeed: 1, forced_brake: 2 };
  if (rank[b.kind] !== rank[a.kind]) return rank[b.kind] - rank[a.kind];
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

// events   : event dari vehicles/{id}/events (sudah dinormalisasi, hanya overspeed dan forced_brake)
// sessions : sesi turunan (deriveSessions) yang membawa behaviorLog dan events di dalam sesi
// Event di dalam node sesi hanya ditambahkan bila belum ada event global dengan jenis dan waktu yang sama,
// sehingga tidak terhitung dua kali.
export function buildLogRows(events, sessions) {
  const sessionList = Array.isArray(sessions) ? sessions : [];
  const labelOf = new Map(sessionList.map((s) => [s.key, (s.meta && s.meta.label) || s.key]));
  const labelFor = (key) => (key === null ? UNASSIGNED_LABEL : labelOf.get(key) || key);

  const nestedKeys = new Map(); // jenis|waktu -> sessionKey pemilik
  for (const s of sessionList) {
    for (const e of s.events || []) {
      const k = eventKey(e);
      if (!nestedKeys.has(k)) nestedKeys.set(k, s.key);
    }
  }

  const rows = [];
  const globalKeys = new Set();
  for (const e of events || []) {
    const k = eventKey(e);
    globalKeys.add(k);
    const sessionKey = nestedKeys.has(k) ? nestedKeys.get(k) : assignSessionKey(e, sessionList);
    rows.push({
      id: `e:${e.id}`,
      kind: e.type,
      timestamp: e.timestamp,
      speed: e.speed,
      tilt: e.tilt,
      brake: BRAKE.FORCED,
      description: describeEventRow(e),
      descriptionMain: describeEventRow(e),
      descriptionDetail: null,
      sessionKey,
      sessionLabel: labelFor(sessionKey),
    });
  }

  for (const s of sessionList) {
    for (const e of s.events || []) {
      if (globalKeys.has(eventKey(e))) continue;
      rows.push({
        id: `s:${s.key}:${e.id}`,
        kind: e.type,
        timestamp: e.timestamp,
        speed: e.speed,
        tilt: e.tilt,
        brake: BRAKE.FORCED,
        description: describeEventRow(e),
        descriptionMain: describeEventRow(e),
        descriptionDetail: null,
        sessionKey: s.key,
        sessionLabel: labelFor(s.key),
      });
    }
    for (const r of s.behaviorLog || []) {
      rows.push({
        id: `r:${s.key}:${r.id}`,
        kind: KIND.RECORD,
        timestamp: r.timestamp,
        speed: r.speed,
        tilt: r.tilt,
        brake: brakeOfRecord(r),
        description: describeRecordRow(r),
        descriptionMain: describeRecordParts(r).main,
        descriptionDetail: describeRecordParts(r).detail,
        sessionKey: s.key,
        sessionLabel: labelFor(s.key),
      });
    }
  }

  return rows.sort(sortRowsDesc);
}

// ── Filter ───────────────────────────────────────────────────
// 'YYYY-MM-DD' (nilai input tanggal) -> batas awal dan akhir hari menurut zona waktu perangkat; tidak valid -> null.
export function parseDateInput(value) {
  if (typeof value !== 'string') return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const probe = new Date(y, mo - 1, d);
  if (probe.getFullYear() !== y || probe.getMonth() !== mo - 1 || probe.getDate() !== d) return null;
  return {
    start: new Date(y, mo - 1, d, 0, 0, 0, 0).getTime(),
    end: new Date(y, mo - 1, d, 23, 59, 59, 999).getTime(),
  };
}

// filter: { type: 'all'|'overspeed'|'forced_brake'|'record', from: 'YYYY-MM-DD'|'', to: 'YYYY-MM-DD'|'' }
// Tanggal mulai dan akhir sama-sama inklusif. Rentang terbalik -> tidak ada baris dan rangeError terisi.
export function filterRows(rows, filter) {
  const type = filter && filter.type ? filter.type : 'all';
  const from = filter && filter.from ? parseDateInput(filter.from) : null;
  const to = filter && filter.to ? parseDateInput(filter.to) : null;
  if (from && to && from.start > to.end) return { rows: [], rangeError: RANGE_ERROR };
  const typed = type === KIND.RECORD || type === KIND.OVERSPEED || type === KIND.FORCED_BRAKE;
  const result = (rows || []).filter((r) => {
    if (typed && r.kind !== type) return false;
    if (from && r.timestamp < from.start) return false;
    if (to && r.timestamp > to.end) return false;
    return true;
  });
  return { rows: result, rangeError: null };
}

export function isFilterActive(filter) {
  return !!filter && ((filter.type && filter.type !== 'all') || !!filter.from || !!filter.to);
}

// ── Ringkasan & pengelompokan ────────────────────────────────
export function summarizeRows(rows) {
  let overspeed = 0;
  let forcedBrake = 0;
  let records = 0;
  for (const r of rows || []) {
    if (r.kind === KIND.OVERSPEED) overspeed += 1;
    else if (r.kind === KIND.FORCED_BRAKE) forcedBrake += 1;
    else if (r.kind === KIND.RECORD) records += 1;
  }
  return { total: overspeed + forcedBrake, overspeed, forcedBrake, records };
}

// Satu kelompok per sesi (urutan sesi sesuai masukan, terbaru dulu), ditambah kelompok "Di luar sesi"
// bila ada baris tanpa sesi. hideEmpty menyembunyikan sesi tanpa baris (dipakai saat filter aktif).
export function groupRowsBySession(rows, sessions, { hideEmpty = false } = {}) {
  const byKey = new Map();
  const loose = [];
  for (const r of rows || []) {
    if (r.sessionKey === null) { loose.push(r); continue; }
    if (!byKey.has(r.sessionKey)) byKey.set(r.sessionKey, []);
    byKey.get(r.sessionKey).push(r);
  }
  const groups = [];
  for (const s of sessions || []) {
    const list = byKey.get(s.key) || [];
    if (hideEmpty && list.length === 0) continue;
    groups.push({ key: s.key, label: (s.meta && s.meta.label) || s.key, session: s, rows: list, counts: summarizeRows(list) });
  }
  if (loose.length > 0) {
    groups.push({ key: null, label: UNASSIGNED_LABEL, session: null, rows: loose, counts: summarizeRows(loose) });
  }
  return groups;
}

// ── Data grafik evaluasi ─────────────────────────────────────
// Kecepatan dan kemiringan dari rekaman berkala (garis putus di antara dua sesi berbeda, tidak
// menyambung lintas sesi); event overspeed dan forced brake sebagai penanda pada kecepatannya.
// Sumbu X berupa timestamp (ms). Bila layout (buildTimelineLayout) diberikan, sumbu X adalah garis waktu
// "dipadatkan": jeda panjang antar segmen dibuang dan setiap titik membawa waktu aslinya di properti t.
export function buildEvaluationSeries(rows, layout = null) {
  const asc = [...(rows || [])].sort((a, b) => a.timestamp - b.timestamp || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const speed = [];
  const tilt = [];
  const overspeed = [];
  const forcedBrake = [];
  const point = (r, y) => (layout ? { x: layout.toX(r.timestamp), y, t: r.timestamp } : { x: r.timestamp, y });
  let prevRecord = null;
  let prevX = null;
  for (const r of asc) {
    if (r.kind === KIND.RECORD) {
      const x = layout ? layout.toX(r.timestamp) : r.timestamp;
      if (x === null) continue;
      const breaks = prevRecord !== null && (prevRecord.sessionKey !== r.sessionKey
        || (layout !== null && layout.segmentOf(prevRecord.timestamp) !== layout.segmentOf(r.timestamp)));
      if (breaks) {
        const mid = Math.round((prevX + x) / 2);
        speed.push({ x: mid, y: null });
        tilt.push({ x: mid, y: null });
      }
      speed.push(point(r, r.speed));
      tilt.push(point(r, r.tilt));
      prevRecord = r;
      prevX = x;
    } else if (r.speed !== null && r.speed !== undefined) {
      if (layout && layout.toX(r.timestamp) === null) continue;
      (r.kind === KIND.OVERSPEED ? overspeed : forcedBrake).push(point(r, r.speed));
    }
  }
  const all = [...speed, ...overspeed, ...forcedBrake].filter((p) => p.y !== null);
  const hasSpeed = all.length > 0;
  const hasTilt = tilt.some((p) => p.y !== null);
  const xs = [...speed, ...tilt, ...overspeed, ...forcedBrake].filter((p) => p.y !== null).map((p) => p.x);
  return {
    speed,
    tilt,
    overspeed,
    forcedBrake,
    hasData: hasSpeed || hasTilt,
    hasTilt,
    minX: xs.length ? Math.min(...xs) : null,
    maxX: xs.length ? Math.max(...xs) : null,
  };
}

// ── Garis waktu dipadatkan (grafik Gabungan) ─────────────────
// Rekaman dari beberapa sesi biasanya berjauhan (berjam-jam sampai berhari-hari). Pada sumbu waktu biasa setiap sesi
// menjadi garis tegak yang menumpuk di ujung grafik. Titik yang berjarak <= SEGMENT_GAP_MS dikelompokkan menjadi satu
// segmen; jeda antar segmen dibuang dan diganti celah tetap bergaris putus. Dua titik dari SESI YANG SAMA baru dipisah
// bila berjarak > SEGMENT_SAME_SESSION_GAP_MS (rekaman satu perjalanan yang agak jarang tetap tersambung).
// Waktu asli tetap dipakai pada label sumbu dan tooltip. Satu segmen saja -> null (grafik memakai sumbu waktu biasa).
export const SEGMENT_GAP_MS = 15 * 60 * 1000;
export const SEGMENT_SAME_SESSION_GAP_MS = 60 * 60 * 1000;
export const SEGMENT_MIN_SPAN_MS = 2 * 60 * 1000;

function hasChartPoint(r) {
  return isTime(r.timestamp) && (r.kind === KIND.RECORD || (r.speed !== null && r.speed !== undefined));
}

function segmentLabel(rows) {
  const names = [];
  for (const r of rows) if (r.sessionLabel && !names.includes(r.sessionLabel)) names.push(r.sessionLabel);
  if (names.length === 0) return '';
  return names.length <= 2 ? names.join(' · ') : `${names[0]} +${names.length - 1}`;
}

export function buildTimelineLayout(rows) {
  const pts = (rows || []).filter(hasChartPoint).sort((a, b) => a.timestamp - b.timestamp);
  const segs = [];
  for (const r of pts) {
    const last = segs[segs.length - 1];
    const sameSession = last && Boolean(r.sessionKey) && r.sessionKey === last.lastKey;
    if (last && r.timestamp - last.end <= (sameSession ? SEGMENT_SAME_SESSION_GAP_MS : SEGMENT_GAP_MS)) {
      last.end = r.timestamp;
      last.lastKey = r.sessionKey;
      last.rows.push(r);
    } else {
      segs.push({ start: r.timestamp, end: r.timestamp, lastKey: r.sessionKey, rows: [r] });
    }
  }
  if (segs.length < 2) return null;

  const widths = segs.map((s) => Math.max(s.end - s.start, SEGMENT_MIN_SPAN_MS));
  const gapW = Math.max(Math.round(widths.reduce((a, b) => a + b, 0) * 0.08), 60000);
  let cursor = 0;
  const segments = segs.map((s, i) => {
    const x0 = cursor;
    const x1 = x0 + widths[i];
    cursor = x1 + gapW;
    return { start: s.start, end: s.end, x0, x1, offset: (widths[i] - (s.end - s.start)) / 2, label: segmentLabel(s.rows) };
  });
  const total = cursor - gapW;

  const segmentOf = (t) => {
    for (let i = 0; i < segments.length; i++) if (t >= segments[i].start && t <= segments[i].end) return i;
    return -1;
  };
  const toX = (t) => {
    const i = segmentOf(t);
    return i < 0 ? null : segments[i].x0 + segments[i].offset + (t - segments[i].start);
  };

  // Tick: 3 titik pada segmen >= 10 menit, 2 pada >= 3 menit, selain itu 1 di tengah. Tick pertama tiap segmen memuat tanggal.
  const ticks = [];
  for (const s of segments) {
    const span = s.end - s.start;
    const count = span >= 10 * 60000 ? 3 : span >= 3 * 60000 ? 2 : 1;
    for (let k = 0; k < count; k++) {
      const t = count === 1 ? Math.round((s.start + s.end) / 2) : Math.round(s.start + (span * k) / (count - 1));
      const text = formatDateTime(t);
      ticks.push({ x: toX(t), label: k === 0 ? `${text.slice(0, 5)} ${text.slice(11, 16)}` : text.slice(11, 16) });
    }
  }

  const pad = Math.round(total * 0.02);
  return {
    segments,
    total,
    ticks,
    gaps: segments.slice(1).map((s, i) => (segments[i].x1 + s.x0) / 2),
    window: { min: -pad, max: total + pad },
    segmentOf,
    toX,
  };
}

// Jendela sumbu waktu grafik: rentang data ditambah ruang 3 % di kiri-kanan, minimal selebar 10 menit
// agar satu titik (atau titik-titik yang sangat berdekatan) tidak menghasilkan label waktu kembar.
export const MIN_CHART_WINDOW_MS = 10 * 60 * 1000;

export function chartTimeWindow(minX, maxX) {
  if (minX === null || minX === undefined || maxX === null || maxX === undefined) return null;
  const span = maxX - minX;
  const pad = Math.max(span * 0.03, (MIN_CHART_WINDOW_MS - span) / 2);
  return { min: minX - pad, max: maxX + pad };
}

// Tick sumbu waktu sejajar menit/jam lokal (mis. 09.00, 09.15, 09.30) untuk jendela sampai 6 jam, maksimal
// 6 tick. Di atas itu mengembalikan null agar Chart.js memilih tick otomatis.
const TICK_STEPS_MIN = [1, 2, 5, 10, 15, 30, 60, 120, 180];
const MAX_TICK_SPAN_MS = 6 * 60 * 60 * 1000;

export function chartTickStepMs(spanMs) {
  if (!(spanMs > 0) || spanMs > MAX_TICK_SPAN_MS) return null;
  for (const m of TICK_STEPS_MIN) {
    if (spanMs / (m * 60000) <= 5) return m * 60000;
  }
  return null;
}

export function chartTickValues(min, max) {
  const step = chartTickStepMs(max - min);
  if (!step) return null;
  const offset = -new Date(min).getTimezoneOffset() * 60000; // selisih zona waktu lokal terhadap UTC
  const values = [];
  for (let v = Math.ceil((min + offset) / step) * step - offset; v <= max; v += step) values.push(v);
  return values;
}

// ── Ekspor Excel ─────────────────────────────────────────────
// Angka tetap berupa angka (bukan teks) agar bisa diolah di Excel; nilai kosong -> sel kosong.
export function rowsToSheetRows(rows) {
  return (rows || []).map((r, i) => [
    i + 1,
    formatDateTime(r.timestamp),
    KIND_LABEL[r.kind] || r.kind,
    r.description,
    r.speed === null || r.speed === undefined ? '' : r.speed,
    r.tilt === null || r.tilt === undefined ? '' : r.tilt,
    BRAKE_LABEL[r.brake] || '',
    r.sessionLabel,
  ]);
}

function typeLabelOf(type) {
  const found = TYPE_FILTER_OPTIONS.find((o) => o.value === type);
  return found ? found.label : TYPE_FILTER_OPTIONS[0].label;
}

function dateLabelOf(value) {
  const parsed = parseDateInput(value);
  return parsed ? formatDateTime(parsed.start).slice(0, 10) : '';
}

export function describeDateRange(filter) {
  const from = dateLabelOf(filter && filter.from);
  const to = dateLabelOf(filter && filter.to);
  if (from && to) return `${from} s.d. ${to}`;
  if (from) return `Mulai ${from}`;
  if (to) return `Sampai ${to}`;
  return 'Semua tanggal';
}

// Lembar "Info": identitas, cakupan, filter aktif, dan waktu ekspor (dokumentasi data).
export function buildExportInfo({ driverName, vehicleLabel, scope, filter, rowCount, exportedAt, session, sessionDurationText }) {
  const info = [
    ['Pengemudi', driverName || '—'],
    ['Kendaraan', vehicleLabel || '—'],
    ['Cakupan', scope],
  ];
  if (session) {
    info.push(['Sesi', (session.meta && session.meta.label) || session.key]);
    info.push(['Status sesi', session.statusLabel]);
    info.push(['Mulai', formatDateTime(session.meta.startTime)]);
    info.push(['Selesai', session.meta.endTime > 0
      ? formatDateTime(session.meta.endTime)
      : session.endEstimated ? `${formatDateTime(session.lastActivity)} (perkiraan)` : '—']);
    info.push(['Durasi', sessionDurationText || '—']);
  }
  info.push(['Filter tipe data', typeLabelOf(filter && filter.type)]);
  info.push(['Filter tanggal', describeDateRange(filter)]);
  info.push(['Jumlah baris', rowCount]);
  info.push(['Diekspor pada', formatDateTime(exportedAt)]);
  return info;
}

function safePart(text) {
  return String(text || '').replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
}

function localDateStamp(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function exportFileName({ vehicleId, sessionKey, exportedAt }) {
  const parts = ['behavior_log', safePart(vehicleId), safePart(sessionKey), localDateStamp(exportedAt)].filter(Boolean);
  return `${parts.join('_')}.xlsx`;
}