// Isi halaman Landing SAFEDRIVE sebagai data murni (tanpa React). Hanya identitas dan hal yang dipantau;
// penjelasan lengkap ada di skripsi. Setiap butir bersumber dari judul skripsi (Bab I) dan sampulnya.
// Dipisah dari tampilan agar teksnya dapat diperiksa otomatis (kata terlarang/wajib) tanpa browser.

export const THESIS_TITLE = 'Implementasi dan Pengujian Website Monitoring Kecepatan, Status Pengereman, Kemiringan Jalan, dan Behavior Log pada Truk';

export const HERO = Object.freeze({
  title: 'Website Monitoring',
  accent: 'pada Truk',
  subtitle: 'Data realtime dari perangkat IoT ESP32.',
});

// Empat hal yang dipantau (sesuai judul skripsi). icon/tone: kunci untuk pemetaan pada halaman.
export function monitoredItems() {
  return [
    { key: 'speed', icon: 'gauge', tone: 'blue', title: 'Kecepatan', caption: 'GPS Beitian BN-220' },
    { key: 'braking', icon: 'shield', tone: 'red', title: 'Status Pengereman', caption: 'Exhaust brake' },
    { key: 'tilt', icon: 'mountain', tone: 'amber', title: 'Kemiringan Jalan', caption: 'Sensor MPU6050' },
    { key: 'log', icon: 'activity', tone: 'emerald', title: 'Behavior Log', caption: 'Riwayat perjalanan' },
  ];
}

// Identitas peneliti sesuai sampul skripsi.
export const RESEARCHER = Object.freeze({
  name: 'Muhammad Heru Dwi Nugroho',
  idLabel: 'NOTAR',
  id: '23021016',
  program: 'Teknologi Rekayasa Otomotif',
  institution: 'Politeknik Keselamatan Transportasi Jalan Tegal',
});

export const FOOTER_TEXT = '© 2026 — Politeknik Keselamatan Transportasi Jalan Tegal';

// Seluruh teks Landing dalam satu daftar (untuk pemeriksaan kata terlarang/wajib).
export function collectLandingText() {
  const out = [THESIS_TITLE, ...Object.values(HERO), ...Object.values(RESEARCHER), FOOTER_TEXT];
  for (const m of monitoredItems()) out.push(m.title, m.caption);
  return out.filter(Boolean);
}