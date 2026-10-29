import { useState } from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import { db } from '../../services/firebase';
import { withTimeout } from '../../utils/asyncUtils';
import { describeAdminWriteError } from '../../utils/adminLogic';

const WRITE_TIMEOUT_MS = 10000;

// Konfirmasi hapus pengemudi terdaftar atau pembatalan undangan.
export default function DriverDeleteModal({ row, onClose }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isInvite = row.kind === 'invite';
  const who = row.name || row.email;

  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await withTimeout(deleteDoc(doc(db, isInvite ? 'driverInvites' : 'users', row.id)), WRITE_TIMEOUT_MS);
      toast.success(isInvite ? 'Undangan dibatalkan.' : 'Pengemudi dihapus.');
      onClose();
    } catch (err) {
      console.error('[DriverDeleteModal] Gagal menghapus:', err);
      setError(describeAdminWriteError(err, 'Gagal menghapus data.'));
      setBusy(false);
    }
  }

  return (
    <Modal open onClose={onClose} title={isInvite ? 'Batalkan Undangan' : 'Hapus Pengemudi'} dismissible={!busy} testId="driver-delete-modal"
      footer={(
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
          <button type="button" onClick={onClose} disabled={busy} data-autofocus
            className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 disabled:opacity-50 transition-colors">
            Batal
          </button>
          <button type="button" onClick={confirm} disabled={busy} data-testid="driver-delete-confirm"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-60 transition-all">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? 'Menghapus…' : isInvite ? 'Batalkan Undangan' : 'Hapus'}
          </button>
        </div>
      )}>
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-white">
              {isInvite ? 'Batalkan undangan untuk ' : 'Hapus pengemudi '}
              <span className="font-semibold break-words">{who}</span>?
            </p>
            <p className="text-xs text-gray-500 mt-0.5 break-all">{row.email}</p>
          </div>
        </div>

        {isInvite ? (
          <p className="text-sm text-gray-400 leading-relaxed">
            Email ini tidak lagi mendapat kendaraan otomatis saat mendaftar. Bila ia sudah telanjur mendaftar,
            akunnya tidak terpengaruh.
          </p>
        ) : (
          <div className="space-y-3 text-sm text-gray-400 leading-relaxed" data-testid="delete-disclosure">
            <p>
              Data pengemudi dihapus dari sistem dan akunnya tidak dapat lagi masuk. Data kendaraan dan riwayat perilaku
              di Realtime Database tidak ikut terhapus.
            </p>
            <p className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3.5 text-yellow-200/90 text-xs">
              Akun login (Firebase Authentication) milik email ini <strong>tidak</strong> terhapus oleh website. Bila email yang sama
              perlu didaftarkan ulang, hapus dulu akunnya di Firebase Console → Authentication → Users.
              Untuk menutup akses tanpa menghapus, gunakan <strong>Nonaktifkan</strong>.
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3.5" role="alert" data-testid="driver-delete-error">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}