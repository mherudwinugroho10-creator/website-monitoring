// Logika murni halaman Profil pengemudi (tanpa React, tanpa Firebase).
// Hanya memakai data yang benar-benar ada pada users/{uid}; tidak ada nilai cadangan palsu.
// Nilai yang tidak tersedia dikembalikan sebagai null / assigned:false, dan halaman menampilkannya apa adanya.

import { cleanVehicleId } from './accountLogic.js';

export const PROFILE_NAME_MAX = 80;
// Hanya spasi biasa (bukan \s) agar tab dan baris baru hasil tempel tidak ikut tersimpan.
export const PHONE_PATTERN = /^[0-9+\-() ]{6,20}$/;
export const PHONE_ERROR = 'Nomor telepon tidak valid. Gunakan angka, spasi, +, - atau tanda kurung (6–20 karakter).';

function str(value) {
  return typeof value === 'string' ? value : '';
}

function squash(value) {
  return str(value).replace(/\s+/g, ' ').trim();
}

// Istilah peran sesuai skripsi: "Pengemudi" dan "Administrator".
export function roleLabel(role) {
  return role === 'admin' ? 'Administrator' : 'Pengemudi';
}

// Status akun dari users/{uid}.status. Field kosong dianggap aktif (sama seperti AuthContext).
export function accountStatus(userData) {
  const status = userData && typeof userData === 'object' ? userData.status : undefined;
  return status === undefined || status === 'active'
    ? { key: 'active', label: 'Aktif' }
    : { key: 'inactive', label: 'Nonaktif' };
}

// createdAt disimpan sebagai teks ISO. Angka (ms) dan objek dengan toDate() (Timestamp Firestore) ikut dipahami.
// Mengembalikan null bila tanggal tidak ada atau tidak valid; tidak pernah mengarang tanggal.
export function joinedDate(createdAt) {
  let d = null;
  if (typeof createdAt === 'string' && createdAt.trim()) d = new Date(createdAt);
  else if (typeof createdAt === 'number' && Number.isFinite(createdAt)) d = new Date(createdAt);
  else if (createdAt && typeof createdAt.toDate === 'function') {
    try { d = createdAt.toDate(); } catch { d = null; }
  }
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

export function formatJoinedDate(createdAt) {
  const d = joinedDate(createdAt);
  return d ? d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
}

// Ringkasan kendaraan yang ditetapkan admin pada akun ini.
// assigned:false bila vehicleId kosong atau tidak valid (kunci RTDB tidak boleh memuat . $ # [ ] /).
export function vehicleSummary(userData) {
  const d = userData && typeof userData === 'object' ? userData : {};
  const id = cleanVehicleId(d.vehicleId);
  if (!id) return { assigned: false, id: null, name: '', plate: '', label: '' };
  const name = squash(d.vehicleName) || id;
  const plate = squash(d.vehiclePlate);
  return { assigned: true, id, name, plate, label: plate ? `${name} · ${plate}` : name };
}

// Inisial untuk avatar: huruf pertama dua kata pertama; fallback bila nama kosong.
export function initialsOf(name, fallback = 'U') {
  const words = squash(name).split(' ').filter(Boolean);
  if (words.length === 0) return fallback;
  return words.slice(0, 2).map((w) => Array.from(w)[0]).join('').toUpperCase();
}

// Validasi formulir. values = nilai yang dikirim ke updateUserProfile (nama dirapikan, telepon dipangkas).
export function validateProfileForm(form) {
  const f = form && typeof form === 'object' ? form : {};
  const name = squash(f.name);
  const phone = str(f.phone).trim();
  const errors = {};
  if (!name) errors.name = 'Nama tidak boleh kosong.';
  else if (name.length > PROFILE_NAME_MAX) errors.name = `Nama maksimal ${PROFILE_NAME_MAX} karakter.`;
  if (phone && !PHONE_PATTERN.test(phone)) errors.phone = PHONE_ERROR;
  return { ok: Object.keys(errors).length === 0, errors, values: { name, phone } };
}

// Isian berbeda dari data tersimpan? Dibandingkan setelah dirapikan, jadi spasi ganda/ujung tidak dihitung perubahan.
export function isProfileDirty(form, userData) {
  const f = form && typeof form === 'object' ? form : {};
  const saved = userData && typeof userData === 'object' ? userData : {};
  return squash(f.name) !== squash(saved.name) || str(f.phone).trim() !== str(saved.phone).trim();
}

// Pesan galat penyimpanan profil yang dipahami pengguna.
export function describeProfileSaveError(err) {
  const code = String((err && (err.code || err.message)) || '').toLowerCase();
  if (code.includes('timeout')) {
    return 'Server belum mengonfirmasi penyimpanan. Perubahan tertunda dan akan terkirim saat koneksi pulih; tetap buka halaman ini.';
  }
  if (code.includes('network') || code.includes('unavailable')) {
    return 'Tidak dapat terhubung ke server. Periksa koneksi internet lalu coba lagi.';
  }
  return 'Gagal menyimpan perubahan.';
}