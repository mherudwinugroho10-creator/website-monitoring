import { useState } from 'react';
import { toast } from 'react-toastify';
import { User, Mail, Shield, Save, Phone, Key, Calendar, Copy, Loader2, CheckCircle2, ShieldAlert, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useAdminAccess } from '../../hooks/useAdminData';

const PHONE_PATTERN = /^[0-9+\-\s()]{6,20}$/;
const ACCESS_VIEW = {
  granted: { icon: CheckCircle2, cls: 'text-green-400', text: 'Diizinkan menyimpan pengaturan batas kecepatan' },
  denied: { icon: ShieldAlert, cls: 'text-red-400', text: 'Belum diizinkan — tambahkan admins/UID = true di Realtime Database' },
  unknown: { icon: AlertTriangle, cls: 'text-yellow-400', text: 'Izin tidak dapat diperiksa saat ini' },
  checking: { icon: Loader2, cls: 'text-gray-400', text: 'Memeriksa izin…', spin: true },
};

function joinedText(createdAt) {
  if (typeof createdAt !== 'string' || !createdAt) return '—';
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

// stacked: nilai panjang (teks status) selalu di bawah label, rata kiri, agar tidak terpisah dari ikonnya di kolom sempit.
function InfoRow({ icon: Icon, label, children, last, stacked }) {
  const layout = stacked ? 'flex-col gap-1.5' : 'flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4';
  const align = stacked ? 'pl-7' : 'pl-7 sm:pl-0 sm:text-right';
  return (
    <div className={`flex ${layout} py-3 ${last ? '' : 'border-b border-white/5'}`}>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className={`min-w-0 ${align}`}>{children}</div>
    </div>
  );
}

export default function AdminProfile() {
  const { currentUser, userData, updateUserProfile } = useAuth();
  const access = useAdminAccess(currentUser ? currentUser.uid : null);
  const [name, setName] = useState(userData && userData.name ? userData.name : '');
  const [phone, setPhone] = useState(userData && userData.phone ? userData.phone : '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const savedName = userData && userData.name ? userData.name : '';
  const savedPhone = userData && userData.phone ? userData.phone : '';
  const dirty = name.trim() !== savedName || phone.trim() !== savedPhone;
  const initials = savedName ? savedName.split(' ').filter(Boolean).map((n) => n[0]).join('').toUpperCase().slice(0, 2) : 'A';
  const view = ACCESS_VIEW[access] || ACCESS_VIEW.checking;
  const AccessIcon = view.icon;

  async function handleSave(e) {
    e.preventDefault();
    if (saving) return;
    const next = {};
    if (!name.trim()) next.name = 'Nama tidak boleh kosong.';
    if (phone.trim() && !PHONE_PATTERN.test(phone.trim())) next.phone = 'Nomor telepon tidak valid. Gunakan angka, spasi, +, - atau tanda kurung (6–20 karakter).';
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    if (!dirty) {
      toast.info('Tidak ada perubahan untuk disimpan.');
      return;
    }
    setSaving(true);
    const result = await updateUserProfile({ name: name.trim(), phone: phone.trim() });
    setSaving(false);
    if (result.success) {
      setName(name.trim());
      setPhone(phone.trim());
      toast.success('Profil berhasil diperbarui!');
    } else {
      toast.error(result.error || 'Gagal menyimpan perubahan.');
    }
  }

  async function copyUid() {
    try {
      await navigator.clipboard.writeText(currentUser.uid);
      toast.success('UID disalin.');
    } catch {
      toast.error('Tidak dapat menyalin. Salin UID secara manual.');
    }
  }

  const input = (hasError) => `w-full pl-11 pr-4 py-3 bg-white/[0.03] border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-all ${
    hasError ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/40' : 'border-white/10 focus:border-gold/50 focus:ring-gold/50'}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Profil Admin</h1>
        <p className="text-gray-400 mt-1">Kelola informasi akun administrator.</p>
      </div>

      {/* Tata letak: satu kolom; mulai 1536 px kartu profil + informasi akun di kolom kiri, formulir di kolom lebar kanan. */}
      <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6 items-start">
        <div className="bg-dark-secondary rounded-2xl border border-white/5 overflow-hidden min-w-0">
          <div className="h-24 bg-gradient-to-r from-gold/20 via-gold/10 to-purple-500/10 relative">
            <div className="absolute -bottom-10 left-6">
              <div className="w-20 h-20 rounded-2xl bg-dark-secondary border-4 border-dark-secondary flex items-center justify-center">
                <span className="text-xl font-bold text-gold">{initials}</span>
              </div>
            </div>
          </div>
          <div className="pt-14 pb-6 px-6">
            <h2 className="text-xl font-bold text-white" data-testid="admin-name">{savedName || 'Admin'}</h2>
            <p className="text-gray-400 text-sm" data-testid="admin-email">{userData && userData.email ? userData.email : '—'}</p>
            <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-lg bg-gold/10 text-gold text-xs font-medium">
              <Shield className="w-3 h-3" /> Administrator
            </span>
          </div>
        </div>

        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6 min-w-0 2xl:col-span-2 2xl:row-span-2">
          <h3 className="text-lg font-semibold text-white mb-6">Informasi Pribadi</h3>
          <form onSubmit={handleSave} noValidate className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="admin-name-input" className="block text-sm font-medium text-gray-300 mb-2">Nama Lengkap</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input id="admin-name-input" type="text" value={name} onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                    disabled={saving} aria-invalid={errors.name ? 'true' : 'false'} data-testid="admin-name-input" className={input(!!errors.name)} />
                </div>
                {errors.name && <p className="text-xs text-red-400 mt-1.5" data-testid="admin-name-error">{errors.name}</p>}
              </div>
              <div>
                <label htmlFor="admin-email-input" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input id="admin-email-input" type="email" value={userData && userData.email ? userData.email : ''} disabled
                    className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-gray-500 cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label htmlFor="admin-phone-input" className="block text-sm font-medium text-gray-300 mb-2">Nomor Telepon</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input id="admin-phone-input" type="text" inputMode="tel" value={phone} placeholder="08xxxxxxxxxx"
                    onChange={(e) => { setPhone(e.target.value); setErrors((p) => ({ ...p, phone: undefined })); }}
                    disabled={saving} aria-invalid={errors.phone ? 'true' : 'false'} data-testid="admin-phone-input" className={input(!!errors.phone)} />
                </div>
                {errors.phone && <p className="text-xs text-red-400 mt-1.5" data-testid="admin-phone-error">{errors.phone}</p>}
              </div>
              <div>
                <label htmlFor="admin-role-input" className="block text-sm font-medium text-gray-300 mb-2">Peran</label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input id="admin-role-input" type="text" value="Administrator" disabled
                    className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-gray-500 cursor-not-allowed" />
                </div>
              </div>
            </div>
            <div className="pt-2 flex items-center gap-4">
              <button type="submit" disabled={saving} data-testid="admin-save"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-dark disabled:opacity-60 text-dark-primary font-semibold rounded-xl transition-all duration-200">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
              </button>
              {dirty && !saving && <span className="text-xs text-gold" data-testid="admin-dirty">Ada perubahan yang belum disimpan</span>}
            </div>
          </form>
        </div>

        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6 min-w-0">
          <h3 className="text-lg font-semibold text-white mb-2">Informasi Akun</h3>
          <InfoRow icon={Calendar} label="Tanggal Bergabung">
            <span className="text-sm text-white" data-testid="admin-joined">{joinedText(userData && userData.createdAt)}</span>
          </InfoRow>
          <InfoRow icon={Key} label="User ID (UID)">
            <span className="inline-flex items-center gap-2 max-w-full">
              <span className="text-xs text-gray-400 font-mono break-all" data-testid="admin-uid">{currentUser ? currentUser.uid : '—'}</span>
              {currentUser && (
                <button type="button" onClick={copyUid} aria-label="Salin UID" className="p-1.5 rounded-lg text-gray-500 hover:text-gold hover:bg-white/5 transition-colors flex-shrink-0">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              )}
            </span>
          </InfoRow>
          <InfoRow icon={Shield} label="Izin Pengaturan" last stacked>
            <span className={`inline-flex items-start gap-2 text-sm ${view.cls}`} data-testid="admin-access" data-access={access}>
              <AccessIcon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${view.spin ? 'animate-spin' : ''}`} />
              <span>{view.text}</span>
            </span>
          </InfoRow>
        </div>
      </div>
    </div>
  );
}