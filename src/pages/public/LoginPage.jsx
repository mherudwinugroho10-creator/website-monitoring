import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Mail, Lock } from 'lucide-react';
import AuthShell, { AuthField, AuthSubmit } from '../../components/auth/AuthShell';

// Formulir Masuk khusus akun pengemudi. Akun admin ditolak oleh AuthContext.login sebelum sesinya dipakai
// dan harus masuk lewat /admin/login.
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
      const result = await auth.login(email, password, 'user');
      if (result.success) {
        toast.success('Login berhasil!');
        navigate('/dashboard', { replace: true });
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
    <AuthShell
      title="Masuk"
      footer={(
        <>
          <p>Belum punya akun? <Link to="/register" className="text-gold hover:underline font-medium">Daftar</Link></p>
          <p className="pt-3 border-t border-white/[0.06]"><Link to="/admin/login" className="text-gray-400 hover:text-gold transition-colors" data-testid="login-admin-link">Login Admin</Link></p>
        </>
      )}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField id="login-email" label="Email" icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com" autoComplete="email" disabled={loading} testId="login-email" />
        <AuthField id="login-password" label="Password" icon={Lock} type={showPassword ? 'text' : 'password'} value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" disabled={loading}
          testId="login-password" toggle={{ show: showPassword, onToggle: () => setShowPassword(!showPassword), testId: 'login-toggle-password' }} />
        <AuthSubmit loading={loading} testId="login-submit">Masuk</AuthSubmit>
      </form>
    </AuthShell>
  );
}