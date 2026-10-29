import { useRef, useState } from 'react';
import { doc, setDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Loader2, Info, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import { db } from '../../services/firebase';
import { inviteKey } from '../../utils/accountLogic';
import { withTimeout } from '../../utils/asyncUtils';
import { validateDriverForm, buildInviteDoc, buildDriverPatch, describeAdminWriteError } from '../../utils/adminLogic';

const WRITE_TIMEOUT_MS = 10000;
const FIELD_ORDER = ['name', 'email', 'vehicleId', 'vehicleName', 'vehiclePlate'];
const INPUT = 'w-full px-4 py-2.5 bg-white/[0.03] border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-1 transition-all disabled:text-gray-500 disabled:cursor-not-allowed';

function Field({ name, label, error, hint, required, children }) {
  return (
    <div>
      <label htmlFor={`driver-${name}`} className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}{required && <span className="text-gold ml-0.5" aria-hidden="true">*</span>}
      </label>
      {children}
      {error
        ? <p id={`driver-${name}-msg`} className="text-xs text-red-400 mt-1.5" data-testid={`error-${name}`}>{error}</p>
        : hint && <p id={`driver-${name}-msg`} className="text-xs text-gray-600 mt-1.5">{hint}</p>}
    </div>
  );
}

// Formulir Tambah / Edit pengemudi. Dipasang hanya saat terbuka (state formulir lahir segar tiap dibuka).
//   mode 'create'     : membuat undangan driverInvites/{email}; pengemudi mendaftar sendiri dengan email itu.
//   row.kind 'driver' : mengubah users/{uid} (nama dan data kendaraan saja).
//   row.kind 'invite' : mengubah undangan yang belum dipakai.
export default function DriverFormModal({ mode, row, users, invites, adminUid, onClose }) {
  const isCreate = mode === 'create';
  const formMode = isCreate ? 'create' : row.kind === 'invite' ? 'edit-invite' : 'edit-driver';
  const [form, setForm] = useState(() => ({
    name: row ? row.name : '',
    email: row ? row.email : '',
    vehicleId: row ? row.vehicleId : '',
    vehicleName: row ? row.vehicleName : '',
    vehiclePlate: row ? row.vehiclePlate : '',
  }));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const fieldRefs = useRef({});

  function change(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (saving) return;
    const result = validateDriverForm(form, { mode: formMode, users, invites, selfKey: row ? row.key : null });
    setErrors(result.errors);
    setSubmitError('');
    if (!result.ok) {
      const first = FIELD_ORDER.find((k) => result.errors[k]);
      if (first && fieldRefs.current[first]) fieldRefs.current[first].focus();
      return;
    }
    const v = result.values;

    if (row && v.name === row.name && v.vehicleId === row.vehicleId && v.vehicleName === row.vehicleName && v.vehiclePlate === row.vehiclePlate) {
      toast.info('Tidak ada perubahan untuk disimpan.');
      onClose();
      return;
    }

    setSaving(true);
    try {
      if (formMode === 'create') {
        await withTimeout(setDoc(doc(db, 'driverInvites', inviteKey(v.email)), buildInviteDoc(v, { adminUid })), WRITE_TIMEOUT_MS);
        toast.success('Pengemudi ditambahkan. Minta ia mendaftar dengan email tersebut.');
      } else if (formMode === 'edit-invite') {
        const { name, vehicleId, vehicleName, vehiclePlate } = buildDriverPatch(v);
        await withTimeout(updateDoc(doc(db, 'driverInvites', row.id), { name, vehicleId, vehicleName, vehiclePlate }), WRITE_TIMEOUT_MS);
        toast.success('Undangan diperbarui.');
      } else {
        await withTimeout(updateDoc(doc(db, 'users', row.id), buildDriverPatch(v)), WRITE_TIMEOUT_MS);
        toast.success('Data pengemudi diperbarui.');
      }
      onClose();
    } catch (err) {
      console.error('[DriverFormModal] Gagal menyimpan:', err);
      setSubmitError(describeAdminWriteError(err, 'Gagal menyimpan data pengemudi.'));
      setSaving(false);
    }
  }

  const vehicleChanged = formMode === 'edit-driver' && row.vehicleId && form.vehicleId.trim() !== row.vehicleId;
  const title = isCreate ? 'Tambah Pengemudi' : row.kind === 'invite' ? 'Edit Undangan' : 'Edit Pengemudi';
  const bind = (field) => ({
    id: `driver-${field}`,
    ref: (el) => { fieldRefs.current[field] = el; },
    value: form[field],
    onChange: (e) => change(field, e.target.value),
    disabled: saving,
    'aria-invalid': errors[field] ? 'true' : 'false',
    'aria-describedby': `driver-${field}-msg`,
    className: `${INPUT} ${errors[field] ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/40' : 'border-white/10 focus:border-gold/50 focus:ring-gold/50'}`,
  });

  return (
    <Modal open onClose={onClose} title={title} dismissible={!saving} testId="driver-form-modal"
      subtitle={isCreate ? 'Kendaraan akan terpasang otomatis saat pengemudi mendaftar.' : undefined}
      footer={(
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button type="button" onClick={onClose} disabled={saving}
            className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 disabled:opacity-50 transition-colors">
            Batal
          </button>
          <button type="submit" form="driver-form" disabled={saving} data-testid="driver-form-submit"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gold hover:bg-gold-dark text-dark-primary font-semibold disabled:opacity-60 transition-all">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? 'Menyimpan…' : isCreate ? 'Tambahkan' : 'Simpan'}
          </button>
        </div>
      )}>
      <form id="driver-form" onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
        {isCreate && (
          <div className="flex items-start gap-3 bg-blue-500/10 border border-blue-500/20 rounded-xl p-3.5">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-200/90 leading-relaxed">
              Pengemudi membuat akunnya sendiri lewat halaman Daftar dengan email yang diisi di bawah.
              Data kendaraan ini otomatis terpasang ke akunnya begitu ia selesai mendaftar.
            </p>
          </div>
        )}

        <Field name="name" label="Nama Pengemudi" required error={errors.name}>
          <input type="text" autoComplete="off" placeholder="Nama lengkap" data-autofocus {...bind('name')} />
        </Field>

        <Field name="email" label="Email" required={isCreate} error={errors.email}
          hint={isCreate ? 'Email yang akan dipakai pengemudi untuk mendaftar.' : 'Email tidak dapat diubah.'}>
          <input type="email" autoComplete="off" placeholder="pengemudi@email.com" {...bind('email')} disabled={saving || !isCreate} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field name="vehicleId" label="ID Kendaraan" required={formMode !== 'edit-driver'} error={errors.vehicleId}
            hint="Harus sama dengan ID kendaraan pada alat ESP32, mis. TRUCK_001.">
            <input type="text" autoComplete="off" placeholder="TRUCK_001" spellCheck={false} {...bind('vehicleId')} />
          </Field>
          <Field name="vehiclePlate" label="Plat Nomor" error={errors.vehiclePlate}>
            <input type="text" autoComplete="off" placeholder="H 1234 AB" {...bind('vehiclePlate')} />
          </Field>
        </div>

        <Field name="vehicleName" label="Nama Kendaraan" error={errors.vehicleName}>
          <input type="text" autoComplete="off" placeholder="Truck Hino 500" {...bind('vehicleName')} />
        </Field>

        {vehicleChanged && (
          <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3.5" data-testid="vehicle-change-warning">
            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-200/90 leading-relaxed">
              Riwayat perilaku tersimpan per ID kendaraan. Setelah ID diganti, pengemudi ini melihat data kendaraan baru,
              dan riwayat pada <span className="font-mono">{row.vehicleId}</span> tidak ikut berpindah.
            </p>
          </div>
        )}

        {submitError && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3.5" role="alert" data-testid="driver-form-error">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{submitError}</p>
          </div>
        )}
      </form>
    </Modal>
  );
}