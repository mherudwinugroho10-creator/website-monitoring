// Isi halaman Landing SAFEDRIVE sebagai data murni (tanpa React).
// Setiap pernyataan di sini bersumber dari skripsi (Bab I Batasan Masalah, Bab III Skema Kerja Sistem dan
// Rancangan Antarmuka) atau dari perilaku kode website. Angka ambang memakai konstanta kode yang sama
// dengan halaman lain, jadi tidak bisa berbeda dari perilaku sebenarnya. Dipisah dari tampilan agar teksnya
// dapat diperiksa otomatis (kata terlarang/wajib) tanpa menjalankan browser.

import {
  TILT_DOWNHILL_THRESHOLD, DEFAULT_FLAT_LIMIT, DANGER_WINDOW_MS, CONNECTION_TIMEOUT_MS,
} from './vehicleLogic.js';

const seconds = (ms) => Math.round(ms / 1000);

export const THESIS_TITLE = 'Implementasi dan Pengujian Website Monitoring Kecepatan, Status Pengereman, Kemiringan Jalan, dan Behavior Log pada Truk';

export const HERO = Object.freeze({
  badge: 'Skripsi — Implementasi dan Pengujian',
  titleLead: 'Website Monitoring',
  titleAccent: 'Kecepatan, Status Pengereman, Kemiringan Jalan,',
  titleTail: 'dan Behavior Log pada Truk',
  description: 'Website yang menerima dan menampilkan data perangkat IoT berbasis ESP32 secara realtime: kecepatan dari GPS Beitian BN-220 dan kemiringan dari sensor MPU6050. Perilaku berkendara dicatat dalam Behavior Log, dan admin dapat mengatur batas kecepatan.',
  note: 'Keputusan pengereman dijalankan mandiri oleh perangkat IoT; website berperan sebagai penerima dan penampil data.',
});

// Parameter yang berlaku pada sistem. Angka ambang berasal dari konstanta kode; interval kirim dari skripsi.
export function systemParameters() {
  return [
    { key: 'live', label: 'Data live perangkat', value: 'Tiap 5 detik' },
    { key: 'behavior', label: 'Rekaman Behavior Log', value: 'Tiap 1 menit' },
    { key: 'tilt', label: 'Ambang jalan menurun', value: `≥ ${TILT_DOWNHILL_THRESHOLD}%`, hint: 'Di bawahnya: datar' },
    { key: 'flat', label: 'Batas datar baku', value: `${DEFAULT_FLAT_LIMIT} km/jam`, hint: 'Batas menurun diatur admin' },
    { key: 'danger', label: 'Masa tampil DangerAlert', value: `${seconds(DANGER_WINDOW_MS)} detik` },
    { key: 'timeout', label: 'Perangkat dianggap terputus', value: `> ${seconds(CONNECTION_TIMEOUT_MS)} detik` },
  ];
}

// icon: kunci untuk pemetaan ke ikon pada halaman.
export function featureCards() {
  return [
    {
      key: 'speed', icon: 'gauge', tone: 'blue',
      title: 'Monitoring Kecepatan Realtime',
      desc: 'Kecepatan dari GPS Beitian BN-220 tampil pada speedometer yang berubah merah saat melebihi batas yang berlaku pada kondisi jalan datar atau menurun.',
    },
    {
      key: 'braking', icon: 'shield', tone: 'red',
      title: 'Status Pengereman',
      desc: 'Menampilkan status exhaust brake (aktif atau tidak aktif) dan kejadian forced brake. Pemantauan terbatas pada exhaust brake karena rem utama tidak memiliki sensor.',
    },
    {
      key: 'tilt', icon: 'mountain', tone: 'amber',
      title: 'Kemiringan Jalan',
      desc: `Sudut kemiringan dari sensor MPU6050 dikonversi perangkat menjadi persen kemiringan jalan. Kemiringan ${TILT_DOWNHILL_THRESHOLD}% atau lebih dikategorikan menurun, di bawahnya datar.`,
    },
    {
      key: 'alert', icon: 'bell', tone: 'purple',
      title: 'DangerAlert',
      desc: `Notifikasi otomatis, disertai bunyi, muncul ketika website menerima event overspeed atau forced brake dalam ${seconds(DANGER_WINDOW_MS)} detik terakhir.`,
    },
    {
      key: 'log', icon: 'activity', tone: 'emerald',
      title: 'Behavior Log',
      desc: 'Satu tabel untuk rekaman perilaku berkala (kecepatan, kemiringan, status pengereman) dan event bahaya, dilengkapi filter, grafik evaluasi per sesi, dan ekspor Excel.',
    },
    {
      key: 'admin', icon: 'users', tone: 'gold',
      title: 'Manajemen oleh Admin',
      desc: 'Admin memantau seluruh kendaraan, mengelola pengemudi, merekap pelanggaran per pengemudi, dan mengubah batas kecepatan datar dan menurun tanpa memprogram ulang perangkat.',
    },
  ];
}

export function roleCards() {
  return [
    {
      key: 'driver', icon: 'truck', tone: 'blue',
      title: 'Pengemudi',
      caption: 'Memantau kendaraan yang ditetapkan admin.',
      pages: [
        { name: 'Dashboard', desc: 'Ringkasan Overspeed dan Forced Brake hari ini' },
        { name: 'Live Monitoring', desc: 'Speedometer, kemiringan jalan, status exhaust brake, DangerAlert' },
        { name: 'Behavior Log', desc: 'Riwayat sesi, filter, dan ekspor Excel' },
        { name: 'Profil', desc: 'Data akun dan kendaraan' },
      ],
    },
    {
      key: 'admin', icon: 'shield', tone: 'gold',
      title: 'Admin',
      caption: 'Memantau seluruh kendaraan dan mengelola sistem.',
      pages: [
        { name: 'Dashboard', desc: 'Tabel seluruh kendaraan dan DangerAlert otomatis' },
        { name: 'Kelola Pengemudi', desc: 'Tambah lewat undangan, ubah, aktifkan atau nonaktifkan, hapus' },
        { name: 'Performa Pengemudi', desc: 'Rekap pelanggaran, rincian, riwayat sesi, ekspor Excel' },
        { name: 'Pengaturan', desc: 'Batas kecepatan jalan datar dan menurun per kendaraan' },
      ],
    },
  ];
}

// Tiga lapis sistem. Perangkat IoT dikembangkan pada penelitian terpisah (Batasan Masalah no. 5).
export function architectureLayers() {
  return [
    {
      key: 'device', icon: 'radio', tone: 'blue', label: 'Layer 01', title: 'Perangkat IoT',
      tag: 'Dikembangkan pada penelitian terpisah',
      desc: 'Dua unit ESP32 (Client dan Server) terhubung lewat ESP-NOW. ESP32 Client membaca sensor dan mengirim data ke Firebase; keputusan exhaust brake dijalankan mandiri oleh perangkat, tanpa bergantung pada website.',
      items: [
        { name: 'ESP32 Client', desc: 'Baca sensor, kirim ke Firebase' },
        { name: 'ESP32 Server', desc: 'Eksekusi exhaust brake' },
        { name: 'GPS Beitian BN-220', desc: 'Kecepatan' },
        { name: 'MPU6050', desc: 'Sudut kemiringan' },
      ],
    },
    {
      key: 'cloud', icon: 'database', tone: 'gold', label: 'Layer 02', title: 'Firebase',
      desc: 'Perantara data antara perangkat IoT dan website. Perangkat mengirim lewat Wi-Fi (MiFi); website membaca secara realtime.',
      items: [
        { name: 'Realtime Database', desc: 'Live, sesi, event, batas' },
        { name: 'Cloud Firestore', desc: 'Data pengguna' },
        { name: 'Authentication', desc: 'Login pengguna' },
        { name: 'Wi-Fi (MiFi)', desc: 'Jalur kirim perangkat' },
      ],
    },
    {
      key: 'web', icon: 'monitor', tone: 'emerald', label: 'Layer 03', title: 'Website Monitoring',
      desc: 'Membaca data lewat listener realtime dan menampilkannya. Satu-satunya data yang ditulis website ke Realtime Database adalah batas kecepatan dari admin.',
      items: [
        { name: 'React.js 18', desc: 'Antarmuka' },
        { name: 'Tailwind CSS', desc: 'Gaya tampilan' },
        { name: 'Chart.js', desc: 'Grafik' },
        { name: 'SheetJS', desc: 'Ekspor Excel' },
      ],
    },
  ];
}

// Identitas peneliti sesuai sampul skripsi.
export const RESEARCHER = Object.freeze({
  name: 'Muhammad Heru Dwi Nugroho',
  idLabel: 'NOTAR',
  id: '23021016',
  program: 'Program Studi Teknologi Rekayasa Otomotif',
  institution: 'Politeknik Keselamatan Transportasi Jalan Tegal',
  badge: 'Skripsi — 2026',
});

export const FOOTER_TEXT = '© 2026 — Politeknik Keselamatan Transportasi Jalan Tegal';

// Seluruh teks Landing dalam satu daftar (untuk pemeriksaan kata terlarang/wajib).
export function collectLandingText() {
  const out = [THESIS_TITLE, ...Object.values(HERO), ...Object.values(RESEARCHER), FOOTER_TEXT];
  for (const p of systemParameters()) out.push(p.label, p.value, p.hint || '');
  for (const f of featureCards()) out.push(f.title, f.desc);
  for (const r of roleCards()) {
    out.push(r.title, r.caption);
    for (const pg of r.pages) out.push(pg.name, pg.desc);
  }
  for (const l of architectureLayers()) {
    out.push(l.label, l.title, l.tag || '', l.desc);
    for (const it of l.items) out.push(it.name, it.desc);
  }
  return out.filter(Boolean);
}