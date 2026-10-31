import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Mail, Lock, Eye, EyeOff, Truck, ArrowLeft } from 'lucide-react';

export default function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pengguna yang sudah masuk tidak perlu melihat formulir login lagi.
  useEffect(() => {
    if (!auth.loading && auth.currentUser && auth.userData) {
      navigate(auth.userData.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  }, [auth.loading, auth.currentUser, auth.userData, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    if (!email || !password) {
      toast.error('Email dan password harus diisi!');
      return;
    }
    setLoading(true);
    try {
      const result = await auth.login(email, password);
      if (result.success) {
        toast.success('Login berhasil!');
        navigate(result.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error login:', error);
      toast.error('Terjadi kesalahan saat login.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-dark-primary flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">

        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Beranda
        </Link>

        <div className="bg-dark-secondary rounded-2xl border border-white/[0.06] p-6 sm:p-8">

          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-gold" />
              </div>
              <span className="text-lg font-bold text-white">SAFE<span className="text-gold">DRIVE</span></span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Masuk ke Akun</h1>
            <p className="text-sm text-gray-400">Masukkan kredensial untuk mengakses dashboard monitoring.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  disabled={loading}
                  data-testid="login-email"
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 disabled:opacity-60 transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  disabled={loading}
                  data-testid="login-password"
                  className="w-full pl-11 pr-12 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 disabled:opacity-60 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  aria-pressed={showPassword}
                  data-testid="login-toggle-password"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="login-submit"
              className="w-full py-3 bg-gold hover:bg-gold-dark disabled:opacity-50 text-dark-primary text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-dark-primary/30 border-t-dark-primary rounded-full animate-spin" role="status" aria-label="Memproses" />
              ) : (
                'Masuk'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Belum punya akun?{' '}
            <Link to="/register" className="text-gold hover:underline font-medium">Daftar di sini</Link>
          </p>
        </div>
      </div>
    </div>
  );
}