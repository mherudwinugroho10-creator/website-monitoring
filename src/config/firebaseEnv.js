// Konfigurasi Firebase dibaca dari environment variable Vite (awalan VITE_), tidak ditulis di kode.
// Lokal: berkas .env.local. Vercel: Settings → Environment Variables. Contoh lengkap ada di .env.example.
// Variabel wajib harus terisi semua; konfigurasi setengah jadi tidak pernah dipakai (mencegah aplikasi
// diam-diam tersambung ke proyek yang salah).
export const FIREBASE_ENV = [
  { field: 'apiKey', name: 'VITE_FIREBASE_API_KEY', required: true },
  { field: 'authDomain', name: 'VITE_FIREBASE_AUTH_DOMAIN', required: true },
  { field: 'databaseURL', name: 'VITE_FIREBASE_DATABASE_URL', required: true },
  { field: 'projectId', name: 'VITE_FIREBASE_PROJECT_ID', required: true },
  { field: 'appId', name: 'VITE_FIREBASE_APP_ID', required: true },
  { field: 'storageBucket', name: 'VITE_FIREBASE_STORAGE_BUCKET', required: false },
  { field: 'messagingSenderId', name: 'VITE_FIREBASE_MESSAGING_SENDER_ID', required: false },
  { field: 'measurementId', name: 'VITE_FIREBASE_MEASUREMENT_ID', required: false },
];

// Spasi di tepi dan tanda kutip pembungkus (sering ikut tertempel di dasbor hosting) dibuang.
function clean(value) {
  return typeof value === 'string' ? value.trim().replace(/^(["'])(.*)\1$/, '$2').trim() : '';
}

// Hasil: config (hanya yang terisi), missing (wajib tapi kosong), invalid (terisi tetapi formatnya salah).
export function readFirebaseConfig(env) {
  const config = {};
  const missing = [];
  const invalid = [];
  for (const { field, name, required } of FIREBASE_ENV) {
    const value = clean(env ? env[name] : undefined);
    if (value) config[field] = value;
    else if (required) missing.push(name);
  }
  if (config.databaseURL && !/^https:\/\/[^/\s]+\.[^/\s]+/i.test(config.databaseURL)) {
    invalid.push('VITE_FIREBASE_DATABASE_URL');
  }
  return { config, missing, invalid };
}