// Pengukuran latensi data live (untuk pengujian skripsi, Tabel III.10).
//
//   Latensi = jam server saat browser menerima pembaruan  −  timestamp server saat alat menulis
//   jam server saat diterima = Date.now() + .info/serverTimeOffset
//
// Node `live` ditimpa terus oleh alat, jadi database hanya menyimpan nilai terakhir. Setiap pembaruan
// dicatat di sini (di memori halaman) begitu diterima, supaya proses perhitungannya bisa dilihat dan
// disalin. Fungsi-fungsi di sini murni (tanpa React dan Firebase) agar bisa diuji.

import { CONNECTION_TIMEOUT_MS } from './vehicleLogic.js';

export const LATENCY_SAMPLES_MAX = 200;

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

// Tambahkan satu sampel dari pembaruan live. Mengembalikan array yang sama (tanpa salinan) bila
// pembaruan tidak dihitung: snapshot awal saat halaman dibuka, data kosong, timestamp yang sama
// dengan sampel sebelumnya, atau data yang sudah lebih lama dari batas koneksi (bukan pembaruan segar).
// Selisih disimpan APA ADANYA (boleh negatif); selisih negatif berarti estimasi offset jam belum presisi.
export function appendLatencySample(samples, { live, receivedAt, offsetMs, initial }) {
  if (initial || !live || !isNum(live.timestamp) || !isNum(receivedAt)) return samples;
  const last = samples.length ? samples[samples.length - 1] : null;
  if (last && last.serverTs === live.timestamp) return samples;
  const diffMs = receivedAt - live.timestamp;
  if (diffMs >= CONNECTION_TIMEOUT_MS) return samples;
  const sample = {
    seq: last ? last.seq + 1 : 1,
    serverTs: live.timestamp,                 // jam server saat alat menulis (epoch ms)
    receivedAt,                               // jam server saat browser menerima (epoch ms)
    diffMs,                                   // receivedAt − serverTs
    offsetMs: isNum(offsetMs) ? offsetMs : 0, // selisih jam PC terhadap server yang dipakai saat itu
    speed: live.gps && isNum(live.gps.speed) ? live.gps.speed : null,
  };
  const next = [...samples, sample];
  return next.length > LATENCY_SAMPLES_MAX ? next.slice(next.length - LATENCY_SAMPLES_MAX) : next;
}

// Ringkasan untuk rumus skripsi: n pengukuran dan rata-rata L.
export function summarizeLatency(samples) {
  const n = samples.length;
  if (n === 0) return { n: 0, meanMs: null, minMs: null, maxMs: null, negative: 0 };
  let sum = 0;
  let min = Infinity;
  let max = -Infinity;
  let negative = 0;
  for (const s of samples) {
    sum += s.diffMs;
    if (s.diffMs < min) min = s.diffMs;
    if (s.diffMs > max) max = s.diffMs;
    if (s.diffMs < 0) negative += 1;
  }
  return { n, meanMs: sum / n, minMs: min, maxMs: max, negative };
}

// Jam dengan milidetik, gaya id-ID: 13.26.57,110 (jam lokal browser).
export function formatClockMs(ms) {
  if (!isNum(ms)) return '—';
  const d = new Date(ms);
  const p = (v, w = 2) => String(v).padStart(w, '0');
  return `${p(d.getHours())}.${p(d.getMinutes())}.${p(d.getSeconds())},${p(d.getMilliseconds(), 3)}`;
}

// Tabel teks dipisah tab: bisa langsung ditempel ke Excel atau Word. Hanya bilangan bulat dan teks jam
// (tanpa desimal) agar hasilnya sama di Excel berbahasa Indonesia maupun Inggris.
export function latencyToTsv(samples) {
  const head = ['No', 'Timestamp server (epoch ms)', 'Jam server (alat menulis)', 'Jam diterima (browser)', 'Latensi (ms)', 'Offset jam PC (ms)'];
  const rows = samples.map((s) => [
    s.seq,
    s.serverTs,
    formatClockMs(s.serverTs),
    formatClockMs(s.receivedAt),
    Math.round(s.diffMs),
    Math.round(s.offsetMs),
  ]);
  return [head, ...rows].map((r) => r.join('\t')).join('\n');
}