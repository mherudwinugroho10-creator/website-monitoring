import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Mail, Lock, Shield } from 'lucide-react';
import AuthShell, { AuthField, AuthSubmit } from '../../components/auth/AuthShell';

// Formulir Login Admin khusus akun admin. Akun pengemudi ditolak oleh AuthContext.login sebelum sesinya dipakai.
export default function AdminLoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.loading && auth.currentUser && auth.userData && auth.userData.role === 'admin') {
      navigate('/admin', { replace: true });
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
      const result = await auth.login(email, password, 'admin');
      if (result.success) {
        toast.success('Login admin berhasil!');
        navigate('/admin', { replace: true });
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
    <AuthShell
      title="Login Admin"
      footer={<p>Bukan admin? <Link to="/login" className="text-gold hover:underline font-medium">Masuk sebagai pengemudi</Link></p>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <AuthField id="admin-login-email" label="Email" icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com" autoComplete="email" disabled={loading} testId="admin-login-email" />
        <AuthField id="admin-login-password" label="Password" icon={Lock} type={showPassword ? 'text' : 'password'} value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="Password" autoComplete="current-password" disabled={loading}
          testId="admin-login-password" toggle={{ show: showPassword, onToggle: () => setShowPassword(!showPassword), testId: 'admin-login-toggle-password' }} />
        <AuthSubmit loading={loading} testId="admin-login-submit" icon={Shield}>Masuk sebagai Admin</AuthSubmit>
      </form>
    </AuthShell>
  );
}