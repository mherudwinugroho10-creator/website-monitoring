import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { User, Mail, Shield, Calendar, Save, Key, Phone, Truck, Copy, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { withTimeout } from '../../utils/asyncUtils';
import {
  roleLabel, accountStatus, formatJoinedDate, vehicleSummary, initialsOf, validateProfileForm, isProfileDirty,
  describeProfileSaveError, PROFILE_NAME_MAX,
} from '../../utils/profileLogic';

const SAVE_TIMEOUT_MS = 10000;

function InfoRow({ icon: Icon, label, children, last, testId }) {
  return (
    <div className={`flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 py-3 ${last ? '' : 'border-b border-white/5'}`} data-testid={testId}>
      <div className="flex items-center gap-3 flex-shrink-0">
        <Icon className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-400">{label}</span>
      </div>
      <div className="min-w-0 pl-7 sm:pl-0 sm:text-right">{children}</div>
    </div>
  );
}

// Profil pengemudi. Semua nilai berasal dari akun yang sedang masuk (Firebase Auth dan users/{uid});
// bila suatu data memang tidak ada, yang tampil adalah "—" atau "Belum ditetapkan", bukan nilai contoh.
export default function Profile() {
  const { currentUser, userData, updateUserProfile } = useAuth();
  const [draft, setDraft] = useState(null); // { name, phone } hanya saat pengguna sedang mengetik
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const saved = userData || {};
  const name = draft ? draft.name : (saved.name || '');
  const phone = draft ? draft.phone : (saved.phone || '');
  const dirty = !!draft && isProfileDirty({ name, phone }, saved);
  const status = accountStatus(saved);
  const vehicle = vehicleSummary(saved);
  const joined = formatJoinedDate(saved.createdAt);
  const uid = currentUser ? currentUser.uid : (saved.uid || '');
  const email = saved.email || (currentUser && currentUser.email) || '';

  function change(field, value) {
    setDraft((prev) => ({ name: prev ? prev.name : (saved.name || ''), phone: prev ? prev.phone : (saved.phone || ''), [field]: value }));
    setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  }

  async function handleSave(e) {
    e.preventDefault();
    if (saving) return;
    const result = validateProfileForm({ name, phone });
    setErrors(result.errors);
    if (!result.ok) return;
    if (!dirty) {
      toast.info('Tidak ada perubahan untuk disimpan.');
      return;
    }
    setSaving(true);
    try {
      const res = await withTimeout(updateUserProfile(result.values), SAVE_TIMEOUT_MS);
      if (res && res.success) {
        setDraft(null);
        toast.success('Profil berhasil diperbarui!');
      } else {
        toast.error((res && res.error) || 'Gagal menyimpan perubahan.');
      }
    } catch (err) {
      console.error('[Profile] Gagal menyimpan profil:', err);
      toast.error(describeProfileSaveError(err));
    } finally {
      setSaving(false);
    }
  }

  async function copyUid() {
    try {
      await navigator.clipboard.writeText(uid);
      toast.success('UID disalin.');
    } catch {
      toast.error('Tidak dapat menyalin. Salin UID secara manual.');
    }
  }

  const input = (hasError) => `w-full pl-11 pr-4 py-3 bg-white/[0.03] border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-1 transition-all disabled:opacity-60 ${
    hasError ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/40' : 'border-white/10 focus:border-gold/50 focus:ring-gold/50'}`;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Profil Saya</h1>
        <p className="text-gray-400 mt-1">Kelola informasi akun Anda.</p>
      </div>

      {/* Kartu profil */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 overflow-hidden">
        <div className="h-28 sm:h-32 bg-gradient-to-r from-gold/20 via-gold/10 to-blue-500/10 relative">
          <div className="absolute -bottom-12 left-6">
            <div className="w-24 h-24 rounded-2xl bg-dark-secondary border-4 border-dark-secondary flex items-center justify-center">
              <span className="text-2xl font-bold text-gold" data-testid="profile-initials">{initialsOf(saved.name)}</span>
            </div>
          </div>
        </div>
        <div className="pt-16 pb-6 px-6">
          <h2 className="text-xl font-bold text-white break-words" data-testid="profile-name">{saved.name || '—'}</h2>
          <p className="text-gray-400 text-sm break-all" data-testid="profile-email">{email || '—'}</p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gold/10 text-gold text-xs font-medium" data-testid="profile-role">
              <Shield className="w-3 h-3" />
              {roleLabel(saved.role)}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium ${status.key === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`} data-testid="profile-status" data-status={status.key}>
              <CheckCircle2 className="w-3 h-3" />
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Formulir */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
        <h3 className="text-lg font-semibold text-white mb-6">Informasi Pribadi</h3>
        <form onSubmit={handleSave} noValidate className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="profile-name-input" className="block text-sm font-medium text-gray-300 mb-2">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input id="profile-name-input" type="text" value={name} maxLength={PROFILE_NAME_MAX + 20} autoComplete="name"
                  onChange={(e) => change('name', e.target.value)} disabled={saving}
                  aria-invalid={errors.name ? 'true' : 'false'} aria-describedby={errors.name ? 'profile-name-error' : undefined}
                  data-testid="profile-name-input" className={input(!!errors.name)} />
              </div>
              {errors.name && <p id="profile-name-error" className="text-xs text-red-400 mt-1.5" data-testid="profile-name-error">{errors.name}</p>}
            </div>
            <div>
              <label htmlFor="profile-email-input" className="block text-sm font-medium text-gray-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input id="profile-email-input" type="email" value={email} disabled readOnly
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-gray-500 cursor-not-allowed" />
              </div>
            </div>
            <div>
              <label htmlFor="profile-phone-input" className="block text-sm font-medium text-gray-300 mb-2">Nomor Telepon</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input id="profile-phone-input" type="text" inputMode="tel" value={phone} placeholder="08xxxxxxxxxx" autoComplete="tel"
                  onChange={(e) => change('phone', e.target.value)} disabled={saving}
                  aria-invalid={errors.phone ? 'true' : 'false'} aria-describedby={errors.phone ? 'profile-phone-error' : undefined}
                  data-testid="profile-phone-input" className={input(!!errors.phone)} />
              </div>
              {errors.phone && <p id="profile-phone-error" className="text-xs text-red-400 mt-1.5" data-testid="profile-phone-error">{errors.phone}</p>}
            </div>
            <div>
              <label htmlFor="profile-role-input" className="block text-sm font-medium text-gray-300 mb-2">Peran</label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input id="profile-role-input" type="text" value={roleLabel(saved.role)} disabled readOnly
                  className="w-full pl-11 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-gray-500 cursor-not-allowed" />
              </div>
            </div>
          </div>
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <button type="submit" disabled={saving} data-testid="profile-save"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-dark disabled:opacity-60 text-dark-primary font-semibold rounded-xl transition-all duration-200">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
            {dirty && !saving && <span className="text-xs text-gold" data-testid="profile-dirty">Ada perubahan yang belum disimpan</span>}
          </div>
        </form>
      </div>

      {/* Informasi akun */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Informasi Akun</h3>
        <InfoRow icon={Calendar} label="Tanggal Bergabung" testId="profile-joined-row">
          <span className={`text-sm ${joined ? 'text-white' : 'text-gray-500'}`} data-testid="profile-joined">{joined || '—'}</span>
        </InfoRow>
        <InfoRow icon={Truck} label="Kendaraan" testId="profile-vehicle-row">
          {vehicle.assigned ? (
            <div data-testid="profile-vehicle" data-assigned="true">
              <p className="text-sm text-white break-words" data-testid="profile-vehicle-label">{vehicle.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">ID kendaraan: <span className="font-mono text-gray-400 break-all" data-testid="profile-vehicle-id">{vehicle.id}</span></p>
            </div>
          ) : (
            <div data-testid="profile-vehicle" data-assigned="false">
              <p className="inline-flex items-center gap-1.5 text-sm text-yellow-500/90"><AlertCircle className="w-3.5 h-3.5" /> Belum ditetapkan</p>
              <p className="text-xs text-gray-500 mt-0.5">Hubungi admin untuk menetapkan kendaraan.</p>
            </div>
          )}
        </InfoRow>
        <InfoRow icon={Key} label="User ID (UID)" last testId="profile-uid-row">
          <span className="inline-flex items-center gap-2 max-w-full">
            <span className="text-xs text-gray-400 font-mono break-all" data-testid="profile-uid">{uid || '—'}</span>
            {uid && (
              <button type="button" onClick={copyUid} aria-label="Salin UID" data-testid="profile-copy-uid"
                className="p-1.5 rounded-lg text-gray-500 hover:text-gold hover:bg-white/5 transition-colors flex-shrink-0">
                <Copy className="w-3.5 h-3.5" />
              </button>
            )}
          </span>
        </InfoRow>
      </div>

      {vehicle.assigned && (
        <p className="text-xs text-gray-600">
          Data kendaraan ditetapkan oleh admin. Pantau kendaraan Anda di <Link to="/monitoring" className="text-gold hover:underline">Live Monitoring</Link>.
        </p>
      )}
    </div>
  );
}