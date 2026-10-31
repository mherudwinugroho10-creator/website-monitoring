import { Link } from 'react-router-dom';
import { Truck, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Tujuan tombol utama menyesuaikan status login: admin ke panel admin, pengemudi ke dashboard, tamu ke beranda.
function homeTarget(auth) {
  const loggedIn = !auth.loading && auth.currentUser && auth.userData;
  if (!loggedIn) return { to: '/', label: 'Ke Beranda' };
  return auth.userData.role === 'admin'
    ? { to: '/admin', label: 'Ke Dashboard Admin' }
    : { to: '/dashboard', label: 'Ke Dashboard' };
}

export default function NotFound() {
  const auth = useAuth();
  const target = homeTarget(auth);
  return (
    <div className="min-h-screen bg-dark-primary flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-2xl bg-gold/10 flex items-center justify-center mx-auto mb-8">
          <Truck className="w-10 h-10 text-gold" />
        </div>
        <h1 className="text-7xl font-bold text-gold mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-white mb-3">Halaman Tidak Ditemukan</h2>
        <p className="text-sm text-gray-400 mb-8">
          Halaman yang Anda cari tidak ada atau telah dipindahkan.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to={target.to}
            data-testid="notfound-home"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-gold hover:bg-gold-dark text-dark-primary text-sm font-semibold rounded-xl transition-all"
          >
            <Home className="w-4 h-4" />
            {target.label}
          </Link>
          <button
            type="button"
            onClick={() => window.history.back()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 border border-white/[0.08] text-white hover:bg-white/5 text-sm font-medium rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </button>
        </div>
      </div>
    </div>
  );
}