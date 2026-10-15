import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
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

// Authentication
export const firebaseAuth = getAuth(app);

// Firestore (untuk data user, settings, dll)
export const db = getFirestore(app);

// Realtime Database (untuk data sensor real-time dari ESP32)
export const rtdb = getDatabase(app);

// ── Instance KEDUA — khusus untuk membuat akun pengemudi baru dari halaman
// Admin (ManageDrivers.jsx). createUserWithEmailAndPassword() secara otomatis
// login sebagai user yang baru dibuat pada instance Auth yang dipakai — kalau
// memakai firebaseAuth (instance utama), sesi admin yang sedang login akan
// tergantikan oleh sesi driver baru itu. Dengan app kedua ini, proses buat
// akun terjadi di "ruang" terpisah, lalu langsung di-signOut, sehingga sesi
// admin di firebaseAuth (instance utama) tidak pernah tersentuh.
const secondaryApp = initializeApp(firebaseConfig, 'Secondary');
export const secondaryAuth = getAuth(secondaryApp);

export default app;