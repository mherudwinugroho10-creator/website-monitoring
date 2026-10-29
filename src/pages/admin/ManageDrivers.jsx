import { useMemo, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Users, Plus, Search, Edit2, Trash2, Truck, X, Loader2, AlertCircle, Power, Mail } from 'lucide-react';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useDirectory } from '../../hooks/useAdminData';
import { withTimeout } from '../../utils/asyncUtils';
import {
  ROW_STATUS, ROW_STATUS_LABEL, buildDriverRows, filterDriverRows, nextStatus, describeAdminWriteError,
} from '../../utils/adminLogic';
import DriverFormModal from '../../components/admin/DriverFormModal';
import DriverDeleteModal from '../../components/admin/DriverDeleteModal';

const STATUS_STYLE = {
  active: 'bg-green-500/10 border-green-500/20 text-green-400',
  inactive: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
  pending: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400',
};

function StatusBadge({ status }) {
  return (
    <span data-testid="driver-status" data-status={status} className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${STATUS_STYLE[status] || STATUS_STYLE.inactive}`}>
      {ROW_STATUS_LABEL[status] || status}
    </span>
  );
}

function VehicleCell({ row }) {
  if (!row.vehicleId) return <span className="text-sm text-yellow-500/80" data-testid="driver-vehicle-none">Belum ditetapkan</span>;
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
        <Truck className="w-4 h-4 text-blue-400" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-white truncate" data-testid="driver-vehicle-name">{row.vehicleName || row.vehicleId}</p>
        <p className="text-xs text-gray-500 truncate">
          <span className="font-mono" data-testid="driver-vehicle-id">{row.vehicleId}</span>
          {row.vehiclePlate && <span> · {row.vehiclePlate}</span>}
        </p>
      </div>
    </div>
  );
}

function PersonCell({ row }) {
  const initial = (row.name || row.email || '?').charAt(0).toUpperCase();
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center flex-shrink-0">
        <span className="text-sm font-semibold text-gold">{initial}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate" data-testid="driver-name">{row.name || '—'}</p>
        <p className="text-xs text-gray-500 truncate flex items-center gap-1" data-testid="driver-email"><Mail className="w-3 h-3 flex-shrink-0" />{row.email}</p>
      </div>
    </div>
  );
}

function Actions({ row, busy, onEdit, onToggle, onDelete }) {
  const who = row.name || row.email;
  const isDriver = row.kind === 'driver';
  const active = row.status === ROW_STATUS.ACTIVE;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {isDriver && (
        <button type="button" onClick={() => onToggle(row)} disabled={busy} data-testid="driver-toggle"
          aria-label={`${active ? 'Nonaktifkan' : 'Aktifkan'} ${who}`}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors disabled:opacity-50 ${active
            ? 'border-white/10 text-gray-300 hover:bg-white/5 hover:text-white'
            : 'border-green-500/30 text-green-400 hover:bg-green-500/10'}`}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
          {active ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
      )}
      <button type="button" onClick={() => onEdit(row)} aria-label={`Edit ${who}`} title="Edit" data-testid="driver-edit"
        className="p-2 rounded-lg text-gray-400 hover:text-gold hover:bg-white/5 transition-colors">
        <Edit2 className="w-4 h-4" />
      </button>
      <button type="button" onClick={() => onDelete(row)} aria-label={`${isDriver ? 'Hapus' : 'Batalkan undangan'} ${who}`} title={isDriver ? 'Hapus' : 'Batalkan undangan'} data-testid="driver-delete"
        className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function ManageDrivers() {
  const { currentUser } = useAuth();
  const directory = useDirectory();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // { type: 'create' } | { type: 'edit' | 'delete', rowKey }
  const [toggling, setToggling] = useState(() => new Set());

  const allRows = useMemo(() => buildDriverRows(directory.users, directory.invites), [directory.users, directory.invites]);
  const rows = useMemo(() => filterDriverRows(allRows, search), [allRows, search]);
  const registered = allRows.filter((r) => r.kind === 'driver').length;
  const pending = allRows.length - registered;

  // Baris yang sedang diedit/dihapus dicari ulang dari data terbaru; hilang (dihapus pihak lain) -> modal menutup sendiri.
  const target = modal && modal.rowKey ? allRows.find((r) => r.key === modal.rowKey) || null : null;

  async function handleToggle(row) {
    if (toggling.has(row.key)) return;
    const status = nextStatus(row.status);
    setToggling((prev) => new Set(prev).add(row.key));
    try {
      await withTimeout(updateDoc(doc(db, 'users', row.id), { status }), 10000);
      toast.success(`${row.name || row.email} ${status === ROW_STATUS.ACTIVE ? 'diaktifkan' : 'dinonaktifkan'}.`);
    } catch (err) {
      console.error('[ManageDrivers] Gagal mengubah status:', err);
      toast.error(describeAdminWriteError(err, 'Gagal mengubah status pengemudi.'));
    } finally {
      setToggling((prev) => {
        const next = new Set(prev);
        next.delete(row.key);
        return next;
      });
    }
  }

  const closeModal = () => setModal(null);
  const loading = !directory.loaded;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Kelola Pengemudi</h1>
          <p className="text-gray-400 mt-1" data-testid="driver-counts">
            {loading ? 'Memuat data…' : `${registered} pengemudi terdaftar${pending > 0 ? ` · ${pending} menunggu pendaftaran` : ''}`}
          </p>
        </div>
        <button type="button" onClick={() => setModal({ type: 'create' })} data-testid="add-driver"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-dark text-dark-primary font-semibold rounded-xl transition-all">
          <Plus className="w-4 h-4" /> Tambah Pengemudi
        </button>
      </div>

      {directory.error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4" role="alert" data-testid="directory-error">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{directory.error}</p>
        </div>
      )}
      {directory.invitesError && !directory.error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4" role="alert" data-testid="invites-error">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{directory.invitesError}</p>
        </div>
      )}

      <div className="bg-dark-secondary rounded-2xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="driver-search"
              placeholder="Cari nama, email, kendaraan, atau plat…" aria-label="Cari pengemudi"
              className="w-full pl-11 pr-10 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all [&::-webkit-search-cancel-button]:hidden" />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Hapus pencarian"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center gap-3" data-testid="drivers-loading">
            <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
            <p className="text-sm text-gray-500">Memuat daftar pengemudi…</p>
          </div>
        ) : allRows.length === 0 ? (
          <div className="py-14 flex flex-col items-center gap-3 text-center px-4" data-testid="drivers-empty">
            <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center"><Users className="w-6 h-6 text-gray-600" /></div>
            <p className="text-sm text-gray-400">Belum ada pengemudi</p>
            <p className="text-xs text-gray-600 max-w-sm">Tambahkan pengemudi beserta kendaraannya. Ia lalu mendaftar sendiri dengan email yang sama.</p>
          </div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center px-4" data-testid="drivers-no-match">
            <p className="text-sm text-gray-400">Tidak ada pengemudi yang cocok dengan “{search.trim()}”.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto" data-testid="drivers-table">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Pengemudi', 'Kendaraan', 'Status', 'Aksi'].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {rows.map((r) => (
                    <tr key={r.key} data-testid="driver-row" data-kind={r.kind} data-email={r.email} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-5 py-3.5 max-w-xs"><PersonCell row={r} /></td>
                      <td className="px-5 py-3.5"><VehicleCell row={r} /></td>
                      <td className="px-5 py-3.5"><StatusBadge status={r.status} /></td>
                      <td className="px-5 py-3.5">
                        <Actions row={r} busy={toggling.has(r.key)} onEdit={(x) => setModal({ type: 'edit', rowKey: x.key })}
                          onToggle={handleToggle} onDelete={(x) => setModal({ type: 'delete', rowKey: x.key })} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-white/[0.04]" data-testid="drivers-cards">
              {rows.map((r) => (
                <div key={r.key} data-testid="driver-card" data-kind={r.kind} data-email={r.email} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <PersonCell row={r} />
                    <StatusBadge status={r.status} />
                  </div>
                  <VehicleCell row={r} />
                  <Actions row={r} busy={toggling.has(r.key)} onEdit={(x) => setModal({ type: 'edit', rowKey: x.key })}
                    onToggle={handleToggle} onDelete={(x) => setModal({ type: 'delete', rowKey: x.key })} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modal && modal.type === 'create' && (
        <DriverFormModal key="create" mode="create" users={directory.users} invites={directory.invites}
          adminUid={currentUser ? currentUser.uid : undefined} onClose={closeModal} />
      )}
      {modal && modal.type === 'edit' && target && (
        <DriverFormModal key={target.key} mode="edit" row={target} users={directory.users} invites={directory.invites}
          adminUid={currentUser ? currentUser.uid : undefined} onClose={closeModal} />
      )}
      {modal && modal.type === 'delete' && target && (
        <DriverDeleteModal key={target.key} row={target} onClose={closeModal} />
      )}
    </div>
  );
}