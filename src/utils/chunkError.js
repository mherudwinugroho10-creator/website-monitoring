// Galat pemuatan berkas halaman (code-splitting). Paling sering terjadi setelah deploy baru: tab yang masih
// terbuka meminta berkas hasil build lama yang sudah tidak ada di server. Pesan galatnya berbeda per browser.
const CHUNK_ERROR = /dynamically imported module|importing a module script failed|loading chunk|loading css chunk|unable to preload css/i;

export const RELOAD_KEY = 'sd-chunk-reload';
export const RELOAD_GAP_MS = 15000;

export function isChunkLoadError(err) {
  if (!err) return false;
  return CHUNK_ERROR.test(String(err.message || err));
}

// Muat ulang otomatis diizinkan paling sering sekali per RELOAD_GAP_MS agar tidak berulang tanpa henti
// bila berkasnya memang tidak tersedia (misalnya koneksi terputus). Hanya catatan waktu yang utuh dan
// tidak di masa depan yang menahan muat ulang. Tanpa sessionStorage: tidak diizinkan.
export function reloadAllowed(storage, now) {
  try {
    const raw = storage.getItem(RELOAD_KEY);
    if (typeof raw === 'string' && /^\d+$/.test(raw)) {
      const elapsed = now - Number(raw);
      if (elapsed >= 0 && elapsed < RELOAD_GAP_MS) return false;
    }
    storage.setItem(RELOAD_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}