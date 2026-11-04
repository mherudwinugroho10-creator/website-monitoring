// Pustaka xlsx berukuran besar, jadi modul ekspor baru dimuat saat tombol ekspor ditekan,
// bukan saat halaman dibuka. Browser mengingat impor dinamis yang gagal selama halaman yang sama masih
// terbuka, jadi mencoba lagi tanpa memuat ulang tidak berguna; pesannya mengarahkan ke muat ulang.
const LOAD_FAILED = 'Modul ekspor gagal dimuat. Muat ulang halaman, lalu coba lagi.';

async function load(importer) {
  try {
    return await importer();
  } catch (err) {
    console.error('[export] Modul ekspor gagal dimuat:', err);
    throw new Error(LOAD_FAILED);
  }
}

// writeBehaviorLogWorkbook
export const loadBehaviorExport = () => load(() => import('./exportExcel'));

// writePerformanceWorkbook, writeDetailWorkbook
export const loadAdminExport = () => load(() => import('./exportAdmin'));