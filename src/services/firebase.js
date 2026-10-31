import { initializeApp } from 'firebase/app';
import { initializeAuth, browserSessionPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAnTEW9KJow9cx7ODBh2j03WWzRxV65OEE",
  authDomain: "safedrive-monitoring.firebaseapp.com",
  databaseURL: "https://safedrive-monitoring-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "safedrive-monitoring",
  storageBucket: "safedrive-monitoring.firebasestorage.app",
  messagingSenderId: "213736633596",
  appId: "1:213736633596:web:10426b9e775a52ff0f5379",
  measurementId: "G-2CB6G3J5PE"
};

const app = initializeApp(firebaseConfig);

// Authentication. Sesi login hanya berlaku selama tab/jendela browser terbuka (sessionStorage):
// membuka website di tab atau sesi browser baru selalu dimulai dari keadaan keluar (logout), sehingga
// admin yang lupa logout di komputer bersama tidak tetap masuk. Muat ulang halaman di tab yang sama
// tetap mempertahankan sesi. Bila sessionStorage tidak tersedia, SDK menyimpan sesi di memori saja.
// (getAuth bawaan menyimpan sesi permanen di IndexedDB sehingga pengunjung langsung terlihat "sudah login".)
// Modul yang dievaluasi ulang (HMR saat pengembangan) memanggil initializeAuth dengan opsi yang sama;
// SDK lalu mengembalikan instance yang sama. Opsi yang berbeda sengaja dibiarkan gagal (bukan diam-diam
// kembali ke penyimpanan permanen).
export const firebaseAuth = initializeAuth(app, { persistence: browserSessionPersistence });

// Sesi lama dari versi sebelumnya tersimpan permanen di IndexedDB (atau localStorage) dan tidak dipakai lagi.
// Dihapus agar tidak tertinggal sebagai kredensial yang tidak terpakai di browser pengguna. Hanya milik
// aplikasi ini (per origin); kegagalan diabaikan karena tidak memengaruhi login.
function purgeLegacyPersistedSession() {
  try {
    if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase('firebaseLocalStorageDb');
  } catch { /* diabaikan */ }
  try {
    if (typeof localStorage !== 'undefined') {
      Object.keys(localStorage)
        .filter((key) => key.startsWith('firebase:authUser:'))
        .forEach((key) => localStorage.removeItem(key));
    }
  } catch { /* diabaikan */ }
}

purgeLegacyPersistedSession();

// Firestore (untuk data user, settings, dll)
export const db = getFirestore(app);

// Realtime Database (untuk data sensor real-time dari ESP32)
export const rtdb = getDatabase(app);

export default app;