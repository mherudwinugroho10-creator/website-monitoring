import { useState, useEffect } from 'react';
import {
  Users, Plus, Search, Edit2, Trash2, X, Truck,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  collection, getDocs, updateDoc, deleteDoc,
  doc, query, where, setDoc,
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { db, secondaryAuth } from '../../services/firebase';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  vehicleId: '',
  vehicleName: '',
  vehiclePlate: '',
};

export default function ManageDrivers() {
  const [drivers, setDrivers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [form, setForm]             = useState(emptyForm);
  const [saving, setSaving]         = useState(false);

  // Load semua pengemudi dari Firestore
  async function loadDrivers() {
    setLoading(true);
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'user')));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setDrivers(list);
    } catch (err) {
      toast.error('Gagal memuat data: ' + err.message);
    }
    setLoading(false);
  }

  useEffect(() => { loadDrivers(); }, []);

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function openAdd() {
    setEditDriver(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(driver) {
    setEditDriver(driver);
    setForm({
      name:          driver.name          || '',
      email:         driver.email         || '',
      password:      '',
      vehicleId:     driver.vehicleId     || '',
      vehicleName:   driver.vehicleName   || '',
      vehiclePlate:  driver.vehiclePlate  || '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.name || !form.email || !form.vehicleId) {
      toast.error('Nama, email, dan ID Kendaraan wajib diisi!');
      return;
    }
    if (!editDriver && !form.password) {
      toast.error('Kata sandi wajib diisi untuk pengemudi baru!');
      return;
    }
    setSaving(true);
    try {
      if (editDriver) {
        // Update data di Firestore
        await updateDoc(doc(db, 'users', editDriver.id), {
          name:          form.name,
          vehicleId:     form.vehicleId,
          vehicleName:   form.vehicleName,
          vehiclePlate:  form.vehiclePlate,
        });
        toast.success('Data pengemudi berhasil diperbarui!');
      } else {
        // Buat akun Firebase Auth via instance KEDUA (secondaryAuth), supaya
        // sesi admin yang sedang login di instance utama tidak tergantikan.
        const cred = await createUserWithEmailAndPassword(
          secondaryAuth, form.email, form.password
        );
        // Bersihkan sesi di instance kedua — tidak memengaruhi sesi admin utama.
        await signOut(secondaryAuth);
        await setDoc(doc(db, 'users', cred.user.uid), {
          name:          form.name,
          email:         form.email,
          role:          'user',
          status:        'active',
          vehicleId:     form.vehicleId,
          vehicleName:   form.vehicleName,
          vehiclePlate:  form.vehiclePlate,
          createdAt:     new Date().toISOString(),
        });
        toast.success('Pengemudi berhasil ditambahkan!');
      }
      setShowModal(false);
      loadDrivers();
    } catch (err) {
      const msgs = {
        'auth/email-already-in-use': 'Email sudah terdaftar.',
        'auth/weak-password':        'Kata sandi minimal 6 karakter.',
        'auth/invalid-email':        'Format email tidak valid.',
      };
      toast.error(msgs[err.code] || 'Gagal menyimpan: ' + err.message);
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!window.confirm('Yakin ingin menghapus pengemudi ini?')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      toast.success('Pengemudi berhasil dihapus!');
      loadDrivers();
    } catch (err) {
      toast.error('Gagal hapus: ' + err.message);
    }
  }

  async function toggleStatus(driver) {
    const newStatus = driver.status === 'active' ? 'inactive' : 'active';
    try {
      await updateDoc(doc(db, 'users', driver.id), { status: newStatus });
      toast.success('Status berhasil diperbarui!');
      loadDrivers();
    } catch (err) {
      toast.error('Gagal update: ' + err.message);
    }
  }

  const filtered = drivers.filter(
    (d) =>
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.email?.toLowerCase().includes(search.toLowerCase()) ||
      d.vehicleName?.toLowerCase().includes(search.toLowerCase()) ||
      d.vehiclePlate?.toLowerCase().includes(search.toLowerCase())
  );

  const inputClass =
    'w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold/50 transition-all';
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Kelola Pengemudi</h1>
          <p className="text-sm text-gray-400 mt-1">{drivers.length} pengemudi terdaftar</p>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-dark text-dark-primary font-semibold rounded-xl transition-all text-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah Pengemudi
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, email, kendaraan, atau plat..."
          className="w-full pl-11 pr-4 py-3 bg-dark-secondary border border-white/[0.08] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold/50 transition-all"
        />
      </div>

      {/* Tabel */}
      <div className="bg-dark-secondary rounded-2xl border border-white/[0.06] overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 text-sm">Memuat data...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Pengemudi</th>
                  <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Kendaraan</th>
                  <th className="text-center px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-right px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center">
                      <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">Tidak ada pengemudi ditemukan</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map((driver) => (
                    <tr key={driver.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Pengemudi */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-gold">
                              {driver.name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{driver.name}</p>
                            <p className="text-xs text-gray-500">{driver.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Kendaraan */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Truck className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{driver.vehicleName || '-'}</p>
                            <p className="text-xs text-gray-500">{driver.vehiclePlate || '-'} • {driver.vehicleId || '-'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        <button
                          onClick={() => toggleStatus(driver)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                            driver.status === 'active'
                              ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                              : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${driver.status === 'active' ? 'bg-green-400' : 'bg-gray-500'}`} />
                          {driver.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </button>
                      </td>

                      {/* Aksi */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEdit(driver)}
                            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(driver.id)}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length === 0 && !loading && drivers.length > 0 && (
          <div className="p-4 text-center text-xs text-gray-600">
            Tidak ada hasil untuk pencarian ini
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit — pertahankan kualitas layout lama */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-dark-primary rounded-2xl border border-white/[0.08] w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">

            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {editDriver ? 'Edit Pengemudi' : 'Tambah Pengemudi Baru'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editDriver
                    ? 'Perbarui data pengemudi dan konfigurasi kendaraan'
                    : 'Daftarkan pengemudi baru beserta kendaraan yang ditugaskan'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Isi Modal */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* Data Pengemudi */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Data Pengemudi
                </p>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Nama Lengkap <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => updateForm('name', e.target.value)}
                      placeholder="Contoh: Ahmad Supardi"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Email <span className="text-red-400">*</span></label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateForm('email', e.target.value)}
                      placeholder="contoh@email.com"
                      className={inputClass}
                      disabled={!!editDriver}
                    />
                    {editDriver && (
                      <p className="text-xs text-gray-600 mt-1">Email tidak dapat diubah.</p>
                    )}
                  </div>
                  {!editDriver && (
                    <div>
                      <label className={labelClass}>Kata Sandi <span className="text-red-400">*</span></label>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => updateForm('password', e.target.value)}
                        placeholder="Minimal 6 karakter"
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Data Kendaraan */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                  Kendaraan yang Ditugaskan
                </p>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>ID Kendaraan <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={form.vehicleId}
                      onChange={(e) => updateForm('vehicleId', e.target.value)}
                      placeholder="Contoh: TRUCK_001"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Nama Kendaraan</label>
                      <input
                        type="text"
                        value={form.vehicleName}
                        onChange={(e) => updateForm('vehicleName', e.target.value)}
                        placeholder="Truck Hino 500"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Plat Nomor</label>
                      <input
                        type="text"
                        value={form.vehiclePlate}
                        onChange={(e) => updateForm('vehiclePlate', e.target.value)}
                        placeholder="H 1234 AB"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-white/[0.08] text-gray-300 hover:bg-white/5 rounded-xl transition-all text-sm font-medium"
              >
                Batal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2.5 bg-gold hover:bg-gold-dark disabled:opacity-50 text-dark-primary rounded-xl transition-all text-sm font-semibold"
              >
                {saving ? 'Menyimpan...' : editDriver ? 'Simpan Perubahan' : 'Tambah Pengemudi'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}