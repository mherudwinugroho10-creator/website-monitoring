// Logika murni akun SAFEDRIVE (tanpa React, tanpa Firebase).
// Bentuk dokumen dan aturan ini harus selaras dengan firestore.rules.

// Dokumen undangan driverInvites/{email huruf kecil} memakai email huruf kecil sebagai ID.
export function normalizeEmail(email) {
  return String(email === null || email === undefined ? '' : email).trim();
}

export function inviteKey(email) {
  return normalizeEmail(email).toLowerCase();
}

// Akun dianggap aktif bila status 'active' atau belum ada field status.
// Nilai lain (mis. 'inactive') berarti dinonaktifkan admin dan login ditolak.
export function isAccountActive(data) {
  if (!data || typeof data !== 'object') return false;
  return data.status === undefined || data.status === 'active';
}

export function roleOf(data) {
  return data && data.role === 'admin' ? 'admin' : 'user';
}

// ID kendaraan dipakai sebagai kunci path RTDB: tidak boleh kosong dan tidak boleh
// mengandung . $ # [ ] / (aturan Firebase). Mengembalikan teks bersih atau null.
export function cleanVehicleId(value) {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v || v.length > 128) return null;
  if (/[.$#[\]/]/.test(v)) return null;
  return v;
}

// Dokumen users/{uid} untuk pendaftaran mandiri. Field kendaraan hanya diisi bila ada
// undangan admin, dan nilainya harus sama persis dengan undangan (dicek firestore.rules).
export function buildUserDoc({ name, email, invite, now }) {
  const doc = {
    name: String(name || '').trim(),
    email: normalizeEmail(email),
    role: 'user',
    status: 'active',
    createdAt: (now || new Date()).toISOString(),
  };
  if (invite && typeof invite === 'object') {
    for (const field of ['vehicleId', 'vehicleName', 'vehiclePlate']) {
      if (typeof invite[field] === 'string') doc[field] = invite[field];
    }
  }
  return doc;
}