// ============================================================
// src/pages/admin/ManageDrivers.jsx
// Gabungan Kelola User + Kelola Kendaraan
// Setiap pengemudi memiliki 1 kendaraan + konfigurasi batas
// ============================================================

import { useState } from 'react';
import {
  Users, Plus, Search, Edit2, Trash2, X, Truck, Gauge,
  Mountain, Shield, ChevronDown, ChevronUp
} from 'lucide-react';
import { toast } from 'react-toastify';

// Dummy data — nanti diganti Firebase
const initialDrivers = [
  {
    id: 'drv_001',
    name: 'Ahmad Supardi',
    email: 'ahmad@email.com',
    status: 'active',
    createdAt: '2025-01-20',
    vehicle: {
      name: 'Truck Hino 500',
      plate: 'H 1234 AB',
      type: 'Heavy Truck',
    },
    config: {
      speedLimit: 60,
      pitchThreshold: 15,
      rollThreshold: 10,
    },
  },
  {
    id: 'drv_002',
    name: 'Budi Santoso',
    email: 'budi@email.com',
    status: 'active',
    createdAt: '2025-02-01',
    vehicle: {
      name: 'Truck Fuso Fighter',
      plate: 'H 5678 CD',
      type: 'Medium Truck',
    },
    config: {
      speedLimit: 60,
      pitchThreshold: 15,
      rollThreshold: 10,
    },
  },
  {
    id: 'drv_003',
    name: 'Dedi Kurniawan',
    email: 'dedi@email.com',
    status: 'active',
    createdAt: '2025-03-05',
    vehicle: {
      name: 'Truck Canter',
      plate: 'H 9012 EF',
      type: 'Light Truck',
    },
    config: {
      speedLimit: 50,
      pitchThreshold: 12,
      rollThreshold: 8,
    },
  },
  {
    id: 'drv_004',
    name: 'Citra Dewi',
    email: 'citra@email.com',
    status: 'inactive',
    createdAt: '2025-02-10',
    vehicle: {
      name: 'Truck Engkel',
      plate: 'H 3456 GH',
      type: 'Light Truck',
    },
    config: {
      speedLimit: 50,
      pitchThreshold: 12,
      rollThreshold: 8,
    },
  },
  {
    id: 'drv_005',
    name: 'Eko Prasetyo',
    email: 'eko@email.com',
    status: 'active',
    createdAt: '2025-04-12',
    vehicle: {
      name: 'Trailer Hino',
      plate: 'H 7890 IJ',
      type: 'Heavy Truck',
    },
    config: {
      speedLimit: 55,
      pitchThreshold: 15,
      rollThreshold: 10,
    },
  },
];

// Default form state
const emptyForm = {
  name: '',
  email: '',
  password: '',
  vehicleName: '',
  vehiclePlate: '',
  vehicleType: 'Heavy Truck',
  speedLimit: 60,
  pitchThreshold: 15,
  rollThreshold: 10,
};

export default function ManageDrivers() {
  const [drivers, setDrivers] = useState(initialDrivers);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editDriver, setEditDriver] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [expandedId, setExpandedId] = useState(null);

  function updateForm(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function openAdd() {
    setEditDriver(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEdit(driver) {
    setEditDriver(driver);
    setForm({
      name: driver.name,
      email: driver.email,
      password: '',
      vehicleName: driver.vehicle.name,
      vehiclePlate: driver.vehicle.plate,
      vehicleType: driver.vehicle.type,
      speedLimit: driver.config.speedLimit,
      pitchThreshold: driver.config.pitchThreshold,
      rollThreshold: driver.config.rollThreshold,
    });
    setShowModal(true);
  }

  function handleSave() {
    if (!form.name || !form.email || !form.vehicleName || !form.vehiclePlate) {
      toast.error('Semua field wajib harus diisi!');
      return;
    }
    if (!editDriver && !form.password) {
      toast.error('Password wajib diisi untuk pengemudi baru!');
      return;
    }

    const driverData = {
      id: editDriver ? editDriver.id : 'drv_' + Date.now(),
      name: form.name,
      email: form.email,
      status: editDriver ? editDriver.status : 'active',
      createdAt: editDriver ? editDriver.createdAt : new Date().toISOString().split('T')[0],
      vehicle: {
        name: form.vehicleName,
        plate: form.vehiclePlate,
        type: form.vehicleType,
      },
      config: {
        speedLimit: Number(form.speedLimit) || 60,
        pitchThreshold: Number(form.pitchThreshold) || 15,
        rollThreshold: Number(form.rollThreshold) || 10,
      },
    };

    if (editDriver) {
      setDrivers(prev => prev.map(d => d.id === editDriver.id ? driverData : d));
      toast.success('Data pengemudi berhasil diperbarui!');
    } else {
      setDrivers(prev => [...prev, driverData]);
      toast.success('Pengemudi berhasil ditambahkan!');
    }
    setShowModal(false);
  }

  function handleDelete(id) {
    if (confirm('Yakin ingin menghapus pengemudi ini?')) {
      setDrivers(prev => prev.filter(d => d.id !== id));
      toast.success('Pengemudi berhasil dihapus!');
    }
  }

  function toggleStatus(id) {
    setDrivers(prev => prev.map(d => {
      if (d.id === id) return { ...d, status: d.status === 'active' ? 'inactive' : 'active' };
      return d;
    }));
  }

  const filtered = drivers.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.email.toLowerCase().includes(search.toLowerCase()) ||
    d.vehicle.name.toLowerCase().includes(search.toLowerCase()) ||
    d.vehicle.plate.toLowerCase().includes(search.toLowerCase())
  );

  const inputClass = 'w-full px-4 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold/50 transition-all';
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5';

  return (
    <div className="space-y-6">

      {/* ============ HEADER ============ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Kelola Pengemudi</h1>
          <p className="text-sm text-gray-400 mt-1">{drivers.length} pengemudi terdaftar</p>
        </div>
        <button onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-dark text-dark-primary font-semibold rounded-xl transition-all text-sm">
          <Plus className="w-4 h-4" /> Tambah Pengemudi
        </button>
      </div>

      {/* ============ SEARCH ============ */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, email, kendaraan, atau plat..."
          className="w-full pl-11 pr-4 py-3 bg-dark-secondary border border-white/[0.08] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:border-gold/50 transition-all" />
      </div>

      {/* ============ TABLE ============ */}
      <div className="bg-dark-secondary rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Pengemudi</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Kendaraan</th>
                <th className="text-center px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Konfigurasi</th>
                <th className="text-center px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3.5 text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map(driver => {
                const isExpanded = expandedId === driver.id;
                return (
                  <tr key={driver.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Pengemudi */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-semibold text-gold">{driver.name.charAt(0)}</span>
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
                          <p className="text-sm font-medium text-white">{driver.vehicle.name}</p>
                          <p className="text-xs text-gray-500">{driver.vehicle.plate} • {driver.vehicle.type}</p>
                        </div>
                      </div>
                    </td>

                    {/* Konfigurasi */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10" title="Batas Kecepatan">
                          <Gauge className="w-3 h-3 text-red-400" />
                          <span className="text-xs font-mono font-medium text-red-400">{driver.config.speedLimit}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-yellow-500/10" title="Batas Pitch">
                          <Mountain className="w-3 h-3 text-yellow-400" />
                          <span className="text-xs font-mono font-medium text-yellow-400">{driver.config.pitchThreshold}°</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-blue-500/10" title="Batas Roll">
                          <Shield className="w-3 h-3 text-blue-400" />
                          <span className="text-xs font-mono font-medium text-blue-400">{driver.config.rollThreshold}°</span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => toggleStatus(driver.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                          driver.status === 'active'
                            ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            : 'bg-gray-500/10 text-gray-400 hover:bg-gray-500/20'
                        }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${driver.status === 'active' ? 'bg-green-400' : 'bg-gray-500'}`} />
                        {driver.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </button>
                    </td>

                    {/* Aksi */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(driver)}
                          className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(driver.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors" title="Hapus">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Tidak ada pengemudi ditemukan</p>
          </div>
        )}
      </div>

      {/* ============ MODAL TAMBAH / EDIT ============ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-dark-primary rounded-2xl border border-white/[0.08] w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">

            {/* Header */}
            <div className="px-6 py-4 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  {editDriver ? 'Edit Pengemudi' : 'Tambah Pengemudi Baru'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {editDriver ? 'Perbarui data pengemudi dan konfigurasi kendaraan' : 'Daftarkan pengemudi baru beserta kendaraan yang ditugaskan'}
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

              {/* === SECTION: DATA PENGEMUDI === */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Data Pengemudi</p>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Nama Lengkap <span className="text-red-400">*</span></label>
                    <input type="text" value={form.name} onChange={e => updateForm('name', e.target.value)}
                      placeholder="Contoh: Ahmad Supardi" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Email <span className="text-red-400">*</span></label>
                    <input type="email" value={form.email} onChange={e => updateForm('email', e.target.value)}
                      placeholder="contoh@email.com" className={inputClass} />
                  </div>
                  {!editDriver && (
                    <div>
                      <label className={labelClass}>Password <span className="text-red-400">*</span></label>
                      <input type="password" value={form.password} onChange={e => updateForm('password', e.target.value)}
                        placeholder="Minimal 6 karakter" className={inputClass} />
                    </div>
                  )}
                </div>
              </div>

              {/* === SECTION: DATA KENDARAAN === */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Kendaraan yang Ditugaskan</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Nama Kendaraan <span className="text-red-400">*</span></label>
                      <input type="text" value={form.vehicleName} onChange={e => updateForm('vehicleName', e.target.value)}
                        placeholder="Truck Hino 500" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Plat Nomor <span className="text-red-400">*</span></label>
                      <input type="text" value={form.vehiclePlate} onChange={e => updateForm('vehiclePlate', e.target.value)}
                        placeholder="H 1234 AB" className={inputClass} />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Tipe Kendaraan</label>
                    <select value={form.vehicleType} onChange={e => updateForm('vehicleType', e.target.value)} className={inputClass}>
                      <option value="Heavy Truck">Heavy Truck</option>
                      <option value="Medium Truck">Medium Truck</option>
                      <option value="Light Truck">Light Truck</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* === SECTION: KONFIGURASI BATAS === */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Konfigurasi Batas Keselamatan</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5">
                        <Gauge className="w-3.5 h-3.5 text-red-400" /> Kecepatan
                      </span>
                    </label>
                    <div className="relative">
                      <input type="number" value={form.speedLimit} onChange={e => updateForm('speedLimit', e.target.value)}
                        min="20" max="120" className={inputClass + ' pr-14'} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">km/h</span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5">
                        <Mountain className="w-3.5 h-3.5 text-yellow-400" /> Pitch
                      </span>
                    </label>
                    <div className="relative">
                      <input type="number" value={form.pitchThreshold} onChange={e => updateForm('pitchThreshold', e.target.value)}
                        min="5" max="45" className={inputClass + ' pr-8'} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">°</span>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5 text-blue-400" /> Roll
                      </span>
                    </label>
                    <div className="relative">
                      <input type="number" value={form.rollThreshold} onChange={e => updateForm('rollThreshold', e.target.value)}
                        min="5" max="30" className={inputClass + ' pr-8'} />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">°</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-3">
                  Batas ini akan digunakan oleh sistem monitoring dan driver mode untuk mendeteksi kondisi berbahaya.
                </p>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] flex gap-3 flex-shrink-0">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-white/[0.08] text-gray-300 hover:bg-white/5 rounded-xl transition-all text-sm font-medium">
                Batal
              </button>
              <button onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-gold hover:bg-gold-dark text-dark-primary rounded-xl transition-all text-sm font-semibold">
                {editDriver ? 'Simpan Perubahan' : 'Tambah Pengemudi'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
