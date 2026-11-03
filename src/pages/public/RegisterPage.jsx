import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Mail, Lock, User, Info } from 'lucide-react';
import AuthShell, { AuthField, AuthSubmit } from '../../components/auth/AuthShell';

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

  return (
    <AuthShell
      title="Buat Akun"
      footer={<p>Sudah punya akun? <Link to="/login" className="text-gold hover:underline font-medium">Masuk</Link></p>}
    >
      <div className="mb-6 flex items-start gap-3 rounded-xl bg-gold/5 border border-gold/15 px-4 py-3" data-testid="register-note">
        <Info className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-400 leading-relaxed">Gunakan email yang sama dengan undangan admin agar kendaraan Anda otomatis ditetapkan.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField id="register-name" label="Nama Lengkap" icon={User} value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Nama lengkap" autoComplete="name" disabled={loading} testId="register-name" />
        <AuthField id="register-email" label="Email" icon={Mail} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com" autoComplete="email" disabled={loading} testId="register-email" />
        <AuthField id="register-password" label="Password" icon={Lock} type={showPassword ? 'text' : 'password'} value={password}
          onChange={(e) => setPassword(e.target.value)} placeholder="Minimal 6 karakter" autoComplete="new-password" disabled={loading}
          testId="register-password" toggle={{ show: showPassword, onToggle: () => setShowPassword(!showPassword), testId: 'register-toggle-password' }} />
        <AuthField id="register-confirm" label="Konfirmasi Password" icon={Lock} type={showPassword ? 'text' : 'password'} value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Ulangi password" autoComplete="new-password" disabled={loading} testId="register-confirm" />
        <AuthSubmit loading={loading} testId="register-submit">Daftar</AuthSubmit>
      </form>
    </AuthShell>
  );
}