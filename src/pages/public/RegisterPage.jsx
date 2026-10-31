import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Mail, Lock, Eye, EyeOff, User, Truck, ArrowLeft, Info } from 'lucide-react';

export default function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Pengguna yang sudah masuk tidak perlu mendaftar lagi.
  useEffect(() => {
    if (!auth.loading && auth.currentUser && auth.userData) {
      navigate(auth.userData.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  }, [auth.loading, auth.currentUser, auth.userData, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;
    if (!name.trim() || !email || !password || !confirmPassword) {
      toast.error('Semua field harus diisi!');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Password tidak cocok!');
      return;
    }
    if (password.length < 6) {
      toast.error('Password minimal 6 karakter!');
      return;
    }
    setLoading(true);
    try {
      const result = await auth.register(email, password, name);
      if (result.success) {
        toast.success('Registrasi berhasil!');
        navigate('/dashboard', { replace: true });
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error registrasi:', error);
      toast.error('Terjadi kesalahan saat registrasi.');
    }
    setLoading(false);
  }

  const inputClass = 'w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 disabled:opacity-60 transition-all';

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
            <h1 className="text-2xl font-bold text-white mb-2">Buat Akun Baru</h1>
            <p className="text-sm text-gray-400">Daftarkan akun untuk mengakses sistem monitoring.</p>
          </div>

          <div className="mb-6 flex items-start gap-3 rounded-xl bg-gold/5 border border-gold/15 px-4 py-3" data-testid="register-note">
            <Info className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Pakai email yang sama dengan undangan dari admin agar kendaraan Anda otomatis ditetapkan.
              Tanpa undangan, akun tetap dibuat, tetapi kendaraan baru bisa dipantau setelah admin menetapkannya.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="register-name" className="block text-sm font-medium text-gray-300 mb-2">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="register-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nama lengkap Anda"
                  autoComplete="name"
                  disabled={loading}
                  data-testid="register-name"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="register-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  disabled={loading}
                  data-testid="register-email"
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                  disabled={loading}
                  data-testid="register-password"
                  className="w-full pl-11 pr-12 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 disabled:opacity-60 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  aria-pressed={showPassword}
                  data-testid="register-toggle-password"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="register-confirm" className="block text-sm font-medium text-gray-300 mb-2">Konfirmasi Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  id="register-confirm"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password"
                  autoComplete="new-password"
                  disabled={loading}
                  data-testid="register-confirm"
                  className={inputClass}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              data-testid="register-submit"
              className="w-full py-3 bg-gold hover:bg-gold-dark disabled:opacity-50 text-dark-primary text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-dark-primary/30 border-t-dark-primary rounded-full animate-spin" role="status" aria-label="Memproses" />
              ) : (
                'Daftar'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-400 mt-6">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-gold hover:underline font-medium">Masuk di sini</Link>
          </p>
        </div>
      </div>
    </div>
  );
}