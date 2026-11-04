import { Loader2 } from 'lucide-react';

// Penanda saat berkas halaman sedang dimuat. Muncul setelah jeda singkat agar tidak berkedip
// pada koneksi cepat.
export default function PageLoader() {
  return (
    <div className="py-24 flex flex-col items-center gap-3" role="status" data-testid="page-loader"
      style={{ animation: 'pageLoaderIn 150ms ease 250ms both' }}>
      <style>{'@keyframes pageLoaderIn { from { opacity: 0 } to { opacity: 1 } }'}</style>
      <Loader2 className="w-6 h-6 text-gold animate-spin" />
      <p className="text-sm text-gray-500">Memuat…</p>
    </div>
  );
}