import { Component } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { isChunkLoadError, reloadAllowed } from '../../utils/chunkError';

function sessionStore() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

// Menjaga area halaman: galat saat menampilkan satu halaman tidak mengosongkan seluruh aplikasi
// (sidebar dan navbar tetap tampil). Galat pemuatan berkas, misalnya setelah deploy baru, dicoba
// sembuh sekali dengan memuat ulang halaman.
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error('[ErrorBoundary] Halaman gagal ditampilkan:', error);
    if (isChunkLoadError(error) && reloadAllowed(sessionStore(), Date.now())) window.location.reload();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const chunk = isChunkLoadError(error);
    return (
      <div className="bg-dark-secondary rounded-2xl border border-white/5 py-14 px-6 flex flex-col items-center gap-4 text-center" role="alert" data-testid="page-error">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">Halaman gagal dimuat</p>
          <p className="text-xs text-gray-500 mt-1">
            {chunk ? 'Versi baru tersedia atau koneksi terputus.' : 'Terjadi kesalahan saat menampilkan halaman.'}
          </p>
        </div>
        <button type="button" onClick={() => window.location.reload()} data-testid="page-error-reload"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-dark text-dark-primary font-semibold rounded-xl text-sm transition-all">
          <RefreshCw className="w-4 h-4" /> Muat Ulang
        </button>
      </div>
    );
  }
}