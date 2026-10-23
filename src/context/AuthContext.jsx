import { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { firebaseAuth, db } from '../services/firebase';
import { normalizeEmail, inviteKey, isAccountActive, roleOf, buildUserDoc } from '../utils/accountLogic';

// AuthContext memastikan `currentUser` baru terisi setelah dokumen users/{uid} berhasil
// dibaca dan akunnya aktif. Akun tanpa dokumen atau berstatus nonaktif ditolak dan
// otomatis dikeluarkan. Setelah login, dokumen dipantau: perubahan data kendaraan dari
// admin langsung berlaku, dan penonaktifan akun langsung mengeluarkan pengguna.

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

const PROFILE_TIMEOUT_MS = 15 * 1000;

const MSG = {
  missing: 'Akun belum terdaftar di sistem. Hubungi admin.',
  inactive: 'Akun Anda dinonaktifkan. Hubungi admin.',
  deactivated: 'Akun Anda telah dinonaktifkan oleh admin.',
  offline: 'Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.',
  denied: 'Akses ke data akun ditolak. Hubungi admin.',
  generic: 'Gagal memuat data akun. Coba lagi.',
};

function withTimeout(promise, ms) {
  let timer;
  const timeout = new Promise((_resolve, reject) => {
    timer = setTimeout(() => {
      const err = new Error('Waktu tunggu habis');
      err.code = 'app/timeout';
      reject(err);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function describeFirestoreError(err) {
  const code = String((err && err.code) || '');
  if (code === 'permission-denied') return MSG.denied;
  if (code === 'unavailable' || code === 'deadline-exceeded' || code === 'app/timeout') return MSG.offline;
  return MSG.generic;
}

function describeLoginError(err) {
  switch (err && err.code) {
    case 'auth/user-not-found': return 'Email tidak terdaftar.';
    case 'auth/wrong-password': return 'Password salah.';
    case 'auth/invalid-email': return 'Format email tidak valid.';
    case 'auth/invalid-credential': return 'Email atau password salah.';
    case 'auth/user-disabled': return MSG.inactive;
    case 'auth/too-many-requests': return 'Terlalu banyak percobaan. Coba lagi beberapa saat.';
    case 'auth/network-request-failed': return MSG.offline;
    default: return 'Login gagal. Coba lagi.';
  }
}

function describeRegisterError(err) {
  switch (err && err.code) {
    case 'auth/email-already-in-use': return 'Email sudah terdaftar.';
    case 'auth/invalid-email': return 'Format email tidak valid.';
    case 'auth/weak-password': return 'Password minimal 6 karakter.';
    case 'auth/too-many-requests': return 'Terlalu banyak percobaan. Coba lagi beberapa saat.';
    case 'auth/network-request-failed':
    case 'app/invite-check-failed':
    case 'app/timeout':
    case 'unavailable':
      return MSG.offline;
    case 'permission-denied':
      return 'Pendaftaran ditolak oleh sistem. Jika Anda diundang admin, gunakan email yang sama dengan undangan.';
    default: return 'Registrasi gagal. Coba lagi.';
  }
}

// Akun yang baru dibuat tetapi gagal didaftarkan dihapus agar emailnya bisa dipakai lagi.
async function discardNewAccount(user) {
  try {
    await user.delete();
  } catch (err) {
    console.error('[AuthContext] Gagal menghapus akun yang batal didaftarkan:', err);
    try {
      await signOut(firebaseAuth);
    } catch (signOutErr) {
      console.error('[AuthContext] Gagal keluar setelah pendaftaran batal:', signOutErr);
    }
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  const registeringRef = useRef(false);     // register() sedang berjalan: pengamat auth menunggu
  const loginActiveRef = useRef(false);     // login() sedang berjalan: galat ditampilkan oleh halamannya
  const appliedUidRef = useRef(null);       // UID yang profilnya sudah diterapkan ke state
  const profileJobRef = useRef(null);       // { uid, promise }: satu pembacaan profil dipakai bersama
  const unsubProfileRef = useRef(null);
  const listenerUidRef = useRef(null);
  const genRef = useRef(0);
  const lastToastRef = useRef({ message: '', at: 0 });

  const showError = useCallback((message) => {
    const now = Date.now();
    const last = lastToastRef.current;
    if (last.message === message && now - last.at < 2000) return; // cegah toast ganda
    lastToastRef.current = { message, at: now };
    toast.error(message);
  }, []);

  const detachProfile = useCallback(() => {
    if (unsubProfileRef.current) {
      unsubProfileRef.current();
      unsubProfileRef.current = null;
    }
    listenerUidRef.current = null;
  }, []);

  const clearSession = useCallback(() => {
    detachProfile();
    appliedUidRef.current = null;
    profileJobRef.current = null;
    setCurrentUser(null);
    setUserData(null);
  }, [detachProfile]);

  // Menolak sesi: bersihkan state, keluar dari Firebase Auth, dan beri tahu pengguna.
  const blockSession = useCallback((message, { silent = false } = {}) => {
    clearSession();
    setLoading(false);
    signOut(firebaseAuth).catch((err) => console.error('[AuthContext] Gagal keluar:', err));
    if (!silent) showError(message);
  }, [clearSession, showError]);

  // Memantau dokumen pengguna selama login.
  const attachProfile = useCallback((user) => {
    if (unsubProfileRef.current && listenerUidRef.current === user.uid) return;
    detachProfile();
    listenerUidRef.current = user.uid;
    unsubProfileRef.current = onSnapshot(
      doc(db, 'users', user.uid),
      (snap) => {
        if (!snap.exists()) {
          if (snap.metadata && snap.metadata.fromCache) return; // tunggu jawaban server
          blockSession(MSG.missing);
          return;
        }
        const data = snap.data();
        if (!isAccountActive(data)) {
          blockSession(MSG.deactivated);
          return;
        }
        setUserData({ ...data, uid: user.uid, email: user.email });
      },
      (err) => {
        // Sesi tetap berjalan dengan data profil terakhir.
        console.error('[AuthContext] Pemantauan profil gagal:', err);
      }
    );
  }, [detachProfile, blockSession]);

  const applyProfile = useCallback((user, data) => {
    appliedUidRef.current = user.uid;
    setCurrentUser(user);
    setUserData({ ...data, uid: user.uid, email: user.email });
    setLoading(false);
    attachProfile(user);
  }, [attachProfile]);

  // Satu kali baca users/{uid}: { ok, data } atau { ok:false, reason, message }.
  const loadProfile = useCallback(async (user) => {
    try {
      const snap = await withTimeout(getDoc(doc(db, 'users', user.uid)), PROFILE_TIMEOUT_MS);
      if (!snap.exists()) return { ok: false, reason: 'missing', message: MSG.missing };
      const data = snap.data();
      if (!isAccountActive(data)) return { ok: false, reason: 'inactive', message: MSG.inactive };
      return { ok: true, data };
    } catch (err) {
      console.error('[AuthContext] Gagal memuat profil:', err);
      return { ok: false, reason: 'error', message: describeFirestoreError(err) };
    }
  }, []);

  // Pengamat auth dan login() memakai pembacaan yang sama untuk UID yang sama.
  const getProfileJob = useCallback((user) => {
    const current = profileJobRef.current;
    if (current && current.uid === user.uid) return current.promise;
    const promise = loadProfile(user);
    profileJobRef.current = { uid: user.uid, promise };
    return promise;
  }, [loadProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (registeringRef.current) return; // register() menyiapkan sesinya sendiri
      const gen = ++genRef.current;

      if (!user) {
        clearSession();
        setLoading(false);
        return;
      }
      if (appliedUidRef.current === user.uid) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await getProfileJob(user);
      if (gen !== genRef.current) return; // sudah ada kejadian auth yang lebih baru

      if (result.ok) {
        applyProfile(user, result.data);
        return;
      }
      if (result.reason === 'error') {
        // Gangguan jaringan atau izin: sesi Auth dibiarkan, tetapi pengguna belum dianggap masuk.
        clearSession();
        setLoading(false);
        if (!loginActiveRef.current) showError(result.message);
        return;
      }
      blockSession(result.message, { silent: loginActiveRef.current });
    });

    return () => {
      unsubscribe();
      detachProfile();
    };
  }, [clearSession, getProfileJob, applyProfile, blockSession, showError, detachProfile]);

  const register = useCallback(async (email, password, name) => {
    const cleanEmail = normalizeEmail(email);
    registeringRef.current = true;
    let created = null;
    try {
      const cred = await createUserWithEmailAndPassword(firebaseAuth, cleanEmail, password);
      created = cred.user;
      const accountEmail = created.email || cleanEmail;

      // Klaim undangan admin untuk email ini (bila ada): kendaraan ikut dari undangan.
      const inviteRef = doc(db, 'driverInvites', inviteKey(accountEmail));
      let invite = null;
      try {
        const inviteSnap = await withTimeout(getDoc(inviteRef), PROFILE_TIMEOUT_MS);
        if (inviteSnap.exists()) invite = inviteSnap.data();
      } catch (err) {
        const wrapped = new Error('Gagal memeriksa undangan');
        wrapped.code = 'app/invite-check-failed';
        wrapped.cause = err;
        throw wrapped;
      }

      const userDoc = buildUserDoc({ name, email: accountEmail, invite });
      await withTimeout(setDoc(doc(db, 'users', created.uid), userDoc), PROFILE_TIMEOUT_MS);

      if (invite) {
        // Undangan sudah terpakai. Gagal menghapusnya tidak membatalkan pendaftaran.
        deleteDoc(inviteRef).catch((err) => console.error('[AuthContext] Gagal menghapus undangan:', err));
      }

      applyProfile(created, userDoc);
      return { success: true, role: 'user' };
    } catch (error) {
      if (created) await discardNewAccount(created);
      if (!error || error.code !== 'auth/email-already-in-use') console.error('[AuthContext] Registrasi gagal:', error);
      return { success: false, error: describeRegisterError(error) };
    } finally {
      registeringRef.current = false;
    }
  }, [applyProfile]);

  const login = useCallback(async (email, password) => {
    loginActiveRef.current = true;
    profileJobRef.current = null; // selalu baca profil terbaru
    try {
      const cred = await signInWithEmailAndPassword(firebaseAuth, normalizeEmail(email), password);
      const user = cred.user;
      const result = await getProfileJob(user);
      if (!result.ok) {
        blockSession(result.message, { silent: true }); // halaman login menampilkan galatnya
        return { success: false, error: result.message };
      }
      applyProfile(user, result.data);
      return { success: true, role: roleOf(result.data) };
    } catch (error) {
      return { success: false, error: describeLoginError(error) };
    } finally {
      loginActiveRef.current = false;
    }
  }, [getProfileJob, blockSession, applyProfile]);

  const logout = useCallback(async () => {
    try {
      await signOut(firebaseAuth);
      clearSession();
      return { success: true };
    } catch (error) {
      console.error('Error logout:', error);
      return { success: false, error: 'Logout gagal.' };
    }
  }, [clearSession]);

  // Pengguna hanya boleh mengubah nama dan nomor telepon (dibatasi juga oleh firestore.rules).
  const updateUserProfile = useCallback(async (updates) => {
    const uid = appliedUidRef.current;
    if (!uid) return { success: false, error: 'Belum login.' };
    const patch = {};
    if (updates && typeof updates.name === 'string') {
      const name = updates.name.trim();
      if (!name) return { success: false, error: 'Nama tidak boleh kosong.' };
      patch.name = name;
    }
    if (updates && typeof updates.phone === 'string') patch.phone = updates.phone.trim();
    if (Object.keys(patch).length === 0) return { success: true };
    try {
      await updateDoc(doc(db, 'users', uid), patch);
      setUserData((prev) => (prev ? { ...prev, ...patch } : prev));
      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        error: error && error.code === 'permission-denied' ? 'Perubahan ditolak oleh sistem.' : 'Gagal menyimpan perubahan.',
      };
    }
  }, []);

  const value = useMemo(() => ({
    currentUser,
    userData,
    loading,
    register,
    login,
    logout,
    updateUserProfile,
  }), [currentUser, userData, loading, register, login, logout, updateUserProfile]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}