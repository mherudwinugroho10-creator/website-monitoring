import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ref, update } from 'firebase/database';
import { toast } from 'react-toastify';
import {
  Gauge, Mountain, Save, Loader2, AlertCircle, AlertTriangle, ShieldAlert, RotateCcw, Info, Truck, Copy, RefreshCw,
} from 'lucide-react';
import { rtdb } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useDirectory, useVehicleSettings, useAdminAccess } from '../../hooks/useAdminData';
import { withTimeout } from '../../utils/asyncUtils';
import { TILT_DOWNHILL_THRESHOLD, DEFAULT_FLAT_LIMIT, validateSpeedLimits, formatNumber } from '../../utils/vehicleLogic';
import {
  buildFleet, vehicleLabel, settingsSnapshot, limitInputText, buildSettingsPayload, isSettingsDirty, limitWarnings,
  describeSettingsWriteError, limitErrorField, LIMIT_WARNING_ABOVE,
} from '../../utils/adminLogic';

const SAVE_TIMEOUT_MS = 10000;

function LimitCard({ id, testId, icon: Icon, color, bg, title, caption, value, onChange, onBlur, disabled, invalid, saved, hint, inputRef }) {
  return (
    <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          <p className="text-xs text-gray-500">{caption}</p>
        </div>
      </div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">Batas Kecepatan Maksimum</label>
      <div className="relative">
        <input id={id} ref={inputRef} type="text" inputMode="decimal" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} onBlur={onBlur}
          disabled={disabled} aria-invalid={invalid ? 'true' : 'false'} data-testid={testId} placeholder="0"
          className={`w-full pl-4 pr-20 py-3 bg-white/[0.03] border rounded-xl text-white text-2xl font-mono font-semibold placeholder-gray-700 focus:outline-none focus:ring-1 transition-all disabled:opacity-50 ${
            invalid ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/40' : 'border-white/10 focus:border-gold/50 focus:ring-gold/50'}`} />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-500">km/jam</span>
      </div>
      <p className="text-xs mt-2.5 text-gray-500" data-testid={`${testId}-saved`}>{saved}</p>
      {hint && <p className="text-xs mt-1 text-gray-600">{hint}</p>}
    </div>
  );
}

export default function Settings() {
  const { currentUser } = useAuth();
  const directory = useDirectory();
  const fleet = useMemo(() => buildFleet(directory.users, directory.invites), [directory.users, directory.invites]);

  const [selectedId, setSelectedId] = useState('');
  const [drafts, setDrafts] = useState({}); // { [vehicleId]: { flat, downhill, base: { flat, downhill } } }
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState(null); // { tone: 'pending' | 'error', text }
  const saveSeq = useRef(0);
  const flatRef = useRef(null);
  const downRef = useRef(null);

  const vehicleId = fleet.some((v) => v.vehicleId === selectedId) ? selectedId : (fleet[0] ? fleet[0].vehicleId : null);
  const vehicle = fleet.find((v) => v.vehicleId === vehicleId) || null;
  const settings = useVehicleSettings(vehicleId);
  const access = useAdminAccess(currentUser ? currentUser.uid : null);

  const snapshot = useMemo(() => settingsSnapshot(settings.value), [settings.value]);
  const draft = vehicleId ? drafts[vehicleId] : undefined;
  const flatText = draft ? draft.flat : limitInputText(snapshot.flat);
  const downText = draft ? draft.downhill : limitInputText(snapshot.downhill);
  const ready = settings.loaded && !settings.error;
  const dirty = ready && isSettingsDirty(flatText, downText, snapshot);
  const check = validateSpeedLimits(flatText, downText);
  const warnings = check.ok ? limitWarnings(check.flat, check.downhill) : [];
  // Pemberitahuan hanya bila server berubah DAN nilainya kini berbeda dari isian (perubahan tertunda milik sendiri
  // juga muncul di listener secara optimistis; itu bukan perubahan oleh admin lain).
  const serverChanged = !!draft && !saving && dirty && (draft.base.flat !== snapshot.flat || draft.base.downhill !== snapshot.downhill);
  const canSave = ready && !saving && access !== 'denied';

  function dropDraft(id) {
    setDrafts((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function handleChange(field, value) {
    if (!vehicleId) return;
    setNotice(null);
    setDrafts((prev) => {
      const current = prev[vehicleId] || { flat: flatText, downhill: downText, base: { flat: snapshot.flat, downhill: snapshot.downhill } };
      return { ...prev, [vehicleId]: { ...current, [field]: value } };
    });
  }

  function handleSelect(id) {
    setSelectedId(id);
    setShowErrors(false);
    setNotice(null);
  }

  function discardDraft() {
    if (vehicleId) dropDraft(vehicleId);
    setShowErrors(false);
    setNotice(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSave || !vehicleId) return;
    setShowErrors(true);
    if (!check.ok) {
      const target = limitErrorField(flatText, downText) === 'flat' ? flatRef.current : downRef.current;
      if (target) target.focus();
      return;
    }
    if (!dirty) {
      toast.info('Tidak ada perubahan untuk disimpan.');
      return;
    }
    const id = vehicleId;
    const seq = ++saveSeq.current;
    setSaving(true);
    setNotice(null);
    let write;
    try {
      write = update(ref(rtdb, `settings/${id}`), buildSettingsPayload(check));
      await withTimeout(write, SAVE_TIMEOUT_MS);
      dropDraft(id);
      setShowErrors(false);
      toast.success('Pengaturan berhasil disimpan');
    } catch (err) {
      console.error('[Settings] Gagal menyimpan pengaturan:', err);
      if (write && err && err.code === 'app/timeout') {
        // Penulisan RTDB yang tertunda tetap dikirim saat koneksi pulih; pantau hasilnya.
        setNotice({ tone: 'pending', text: 'Server belum mengonfirmasi penyimpanan. Perubahan tertunda dan akan terkirim otomatis saat koneksi pulih. Tetap buka halaman ini sampai muncul konfirmasi.' });
        write.then(() => {
          if (seq !== saveSeq.current) return;
          dropDraft(id);
          setNotice(null);
          toast.success('Pengaturan berhasil disimpan');
        }, (lateErr) => {
          if (seq !== saveSeq.current) return;
          setNotice({ tone: 'error', text: describeSettingsWriteError(lateErr) });
        });
      } else {
        setNotice({ tone: 'error', text: describeSettingsWriteError(err) });
      }
    } finally {
      setSaving(false);
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

  const errorField = limitErrorField(flatText, downText);
  const showFlatError = showErrors && errorField === 'flat';
  const showDownError = showErrors && errorField === 'downhill';
  const savedText = (value, fallback) => (value === null ? fallback : `Tersimpan: ${formatNumber(value, 2)} km/jam`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pengaturan</h1>
        <p className="text-gray-400 mt-1">Atur batas kecepatan maksimum tiap kendaraan sesuai medan jalan.</p>
      </div>

      {access === 'denied' && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4" role="alert" data-testid="settings-access-denied">
          <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-300 min-w-0">
            <p className="font-medium">Akun ini belum diizinkan menyimpan pengaturan.</p>
            <p className="mt-1 text-red-300/80">
              Di Firebase Console → Realtime Database, tambahkan <span className="font-mono">admins/{currentUser ? currentUser.uid : 'UID'}</span> dengan nilai <span className="font-mono">true</span>, lalu muat ulang halaman ini.
            </p>
            {currentUser && (
              <button type="button" onClick={copyUid} className="mt-2 inline-flex items-center gap-1.5 text-xs text-red-200 hover:text-white underline underline-offset-2">
                <Copy className="w-3 h-3" /> Salin UID
              </button>
            )}
          </div>
        </div>
      )}
      {access === 'unknown' && (
        <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4" data-testid="settings-access-unknown">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-200/90">Izin penyimpanan tidak dapat diperiksa saat ini. Anda tetap dapat mencoba menyimpan; server yang menentukan.</p>
        </div>
      )}
      {directory.error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4" role="alert" data-testid="directory-error">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{directory.error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 2xl:grid-cols-3 gap-6 items-start">
        <div className="2xl:col-span-2 min-w-0">
          {!directory.loaded ? (
            <div className="bg-dark-secondary rounded-2xl border border-white/5 py-16 flex flex-col items-center gap-3" data-testid="settings-loading">
              <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
              <p className="text-sm text-gray-500">Memuat daftar kendaraan…</p>
            </div>
          ) : !vehicle ? (
            <div className="bg-dark-secondary rounded-2xl border border-white/5 py-14 flex flex-col items-center gap-3 text-center px-4" data-testid="settings-empty">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center"><Truck className="w-6 h-6 text-gray-600" /></div>
              <p className="text-sm text-gray-400">Belum ada kendaraan terdaftar</p>
              <p className="text-xs text-gray-600">Tambahkan pengemudi dan kendaraannya di <Link to="/admin/drivers" className="text-gold hover:underline">Kelola Pengemudi</Link> terlebih dahulu.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-6">
              <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
                <label htmlFor="settings-vehicle" className="block text-sm font-medium text-gray-300 mb-2">Kendaraan</label>
                <select id="settings-vehicle" value={vehicleId} onChange={(e) => handleSelect(e.target.value)} disabled={saving} data-testid="settings-vehicle"
                  className="w-full px-4 py-3 bg-dark-tertiary border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold disabled:opacity-60">
                  {fleet.map((v) => (
                    <option key={v.vehicleId} value={v.vehicleId}>
                      {vehicleLabel(v)} — {v.driverName}{v.pending ? ' (menunggu pendaftaran)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-2">ID kendaraan: <span className="font-mono text-gray-400" data-testid="settings-vehicle-id">{vehicleId}</span></p>
              </div>

              {settings.error && (
                <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4" role="alert" data-testid="settings-read-error">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">Pengaturan kendaraan ini gagal dimuat, sehingga tidak dapat diubah dengan aman. Muat ulang halaman ini.</p>
                </div>
              )}

              {serverChanged && (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4" data-testid="settings-server-changed">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <RefreshCw className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-200/90">
                      Pengaturan di server berubah sejak Anda mulai mengedit (sekarang: datar {snapshot.flat === null ? 'belum diatur' : formatNumber(snapshot.flat, 2)},
                      {' '}menurun {snapshot.downhill === null ? 'belum diatur' : formatNumber(snapshot.downhill, 2)}). Menyimpan akan menimpanya.
                    </p>
                  </div>
                  <button type="button" onClick={discardDraft} className="px-4 py-2 rounded-xl border border-blue-400/30 text-sm text-blue-200 hover:bg-blue-500/10 transition-colors flex-shrink-0">
                    Muat nilai terbaru
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <LimitCard id="settings-flat" testId="settings-flat" icon={Gauge} color="text-green-400" bg="bg-green-500/10"
                  title="Jalan Datar" caption={`Berlaku saat kemiringan di bawah ${TILT_DOWNHILL_THRESHOLD}%`}
                  value={flatText} onChange={(v) => handleChange('flat', v)} onBlur={() => setShowErrors(true)} disabled={!ready || saving}
                  invalid={showFlatError} saved={ready ? savedText(snapshot.flat, `Belum diatur — standar ${DEFAULT_FLAT_LIMIT} km/jam`) : 'Memuat…'}
                  inputRef={flatRef} />
                <LimitCard id="settings-downhill" testId="settings-downhill" icon={Mountain} color="text-orange-400" bg="bg-orange-500/10"
                  title="Jalan Menurun" caption={`Berlaku saat kemiringan ${TILT_DOWNHILL_THRESHOLD}% atau lebih`}
                  value={downText} onChange={(v) => handleChange('downhill', v)} onBlur={() => setShowErrors(true)} disabled={!ready || saving}
                  invalid={showDownError} saved={ready ? savedText(snapshot.downhill, 'Belum diatur — overspeed di turunan belum dideteksi') : 'Memuat…'}
                  hint="Harus lebih kecil dari batas jalan datar." inputRef={downRef} />
              </div>

              {/* Ruang pesan galat selalu ada: pesan muncul saat isian ditinggalkan (blur), dan bila tata letak bergeser
                  di antara tekan dan lepas tombol Simpan, klik itu hilang. */}
              <div className="min-h-[1.25rem] -my-2">
                {showErrors && !check.ok && (
                  <p className="text-sm text-red-400" role="alert" data-testid="settings-error">{check.error}</p>
                )}
              </div>
              {warnings.map((w) => (
                <div key={w} className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3.5" data-testid="settings-warning">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-200/90">{w}</p>
                </div>
              ))}
              {notice && (
                <div className={`flex items-start gap-3 border rounded-xl p-4 ${notice.tone === 'error' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/20'}`}
                  role={notice.tone === 'error' ? 'alert' : 'status'} data-testid={notice.tone === 'error' ? 'settings-save-error' : 'settings-save-pending'}>
                  {notice.tone === 'error'
                    ? <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                    : <Loader2 className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5 animate-spin" />}
                  <p className={`text-sm ${notice.tone === 'error' ? 'text-red-300' : 'text-yellow-200/90'}`}>{notice.text}</p>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3">
                <button type="submit" disabled={!canSave} data-testid="settings-save"
                  className="inline-flex items-center justify-center gap-2 px-7 py-3 bg-gold hover:bg-gold-dark text-dark-primary font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Menyimpan…' : 'Simpan Pengaturan'}
                </button>
                <button type="button" onClick={discardDraft} disabled={!draft || saving} data-testid="settings-reset"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <RotateCcw className="w-4 h-4" /> Batalkan Perubahan
                </button>
                {dirty && <span className="text-xs text-gold" data-testid="settings-dirty">Ada perubahan yang belum disimpan</span>}
              </div>
            </form>
          )}
        </div>

        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5 min-w-0 2xl:sticky 2xl:top-24">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3"><Info className="w-4 h-4 text-gold" /> Cara batas ini dipakai</h3>
          <ul className="space-y-2 text-xs text-gray-400 leading-relaxed list-disc pl-5">
            <li>Jalan <strong className="text-gray-300">datar</strong> bila kemiringan di bawah {TILT_DOWNHILL_THRESHOLD}%, jalan <strong className="text-gray-300">menurun</strong> bila {TILT_DOWNHILL_THRESHOLD}% atau lebih. Ambang ini tetap dan tidak dapat diubah dari halaman ini.</li>
            <li>Overspeed terjadi bila kecepatan melebihi batas yang berlaku pada medan saat itu.</li>
            <li>Batas disimpan per kendaraan di Realtime Database dan dibaca oleh alat dan website.</li>
            <li>Nilai di atas {LIMIT_WARNING_ABOVE} km/jam hanya diberi peringatan, tidak ditolak.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}