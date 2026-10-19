import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Mail, Lock, Eye, EyeOff, Shield, ArrowLeft, Truck } from 'lucide-react';

export default function AdminLoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.loading && auth.currentUser && auth.userData) {
      if (auth.userData.role === 'admin') {
        navigate('/admin', { replace: true });
      }
    }
  }, [auth.loading, auth.currentUser, auth.userData, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Email dan password harus diisi!');
      return;
    }
    setLoading(true);
    try {
      const result = await auth.login(email, password);
      if (result.success) {
        if (result.role === 'admin') {
          toast.success('Login admin berhasil!');
          navigate('/admin', { replace: true });
        } else {
          toast.error('Akun ini bukan admin!');
          await auth.logout();
        }
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error('Error login admin:', error);
      toast.error('Terjadi kesalahan saat login.');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-dark-primary flex items-center justify-center p-6">
      <div className="w-full max-w-md">

        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Beranda
        </Link>

        <div className="bg-dark-secondary rounded-2xl border border-white/[0.06] p-8">

          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-gold" />
              </div>
              <span className="text-lg font-bold text-white">SAFE<span className="text-gold">DRIVE</span></span>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gold/10 border border-gold/20 mb-5">
              <Shield className="w-4 h-4 text-gold" />
              <span className="text-sm text-gold font-medium">Administrator</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Admin Login</h1>
            <p className="text-sm text-gray-400">Masuk ke panel administrasi SAFEDRIVE.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Email Admin</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@safedrive.com"
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="w-full pl-11 pr-12 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gold hover:bg-gold-dark disabled:opacity-50 text-dark-primary text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-dark-primary/30 border-t-dark-primary rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  Masuk sebagai Admin
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-white/[0.06] text-center">
            <p className="text-sm text-gray-400">
              Bukan admin?{' '}
              <Link to="/login" className="text-gold hover:underline font-medium">Login sebagai User</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}