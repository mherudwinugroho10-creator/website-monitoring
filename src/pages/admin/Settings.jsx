import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { collection, getDocs } from 'firebase/firestore';
import { rtdb, db } from '../../services/firebase';
import { toast } from 'react-toastify';
import { Gauge, Mountain, Save, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [speedLimit, setSpeedLimit] = useState('60');
  const [tiltThreshold, setTiltThreshold] = useState('15');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load daftar kendaraan dari Firestore users
  useEffect(() => {
    async function loadVehicles() {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const vehicleList = [];
        const seen = new Set();
        usersSnap.forEach(doc => {
          const data = doc.data();
          if (data.vehicleId && !seen.has(data.vehicleId)) {
            seen.add(data.vehicleId);
            vehicleList.push({
              id: data.vehicleId,
              name: data.vehicleName || data.vehicleId,
              plate: data.vehiclePlate || '-',
              driverName: data.name || '-',
            });
          }
        });

        if (vehicleList.length === 0) {
          vehicleList.push({ id: 'TRUCK_001', name: 'Kendaraan Default', plate: '-', driverName: '-' });
        }

        setVehicles(vehicleList);
        setSelectedVehicle(vehicleList[0].id);
      } catch (error) {
        console.error('Error loading vehicles:', error);
        setVehicles([{ id: 'TRUCK_001', name: 'Kendaraan Default', plate: '-', driverName: '-' }]);
        setSelectedVehicle('TRUCK_001');
      }
      setLoading(false);
    }
    loadVehicles();
  }, []);

  // Load settings dari Firebase RTDB saat vehicle berubah
  useEffect(() => {
    if (!selectedVehicle) return;
    const settingsRef = ref(rtdb, `settings/${selectedVehicle}`);
    const unsub = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setSpeedLimit(String(data.speedLimit || 60));
        setTiltThreshold(String(data.tiltThreshold || 15));
      } else {
        setSpeedLimit('60');
        setTiltThreshold('15');
      }
    });
    return () => unsub();
  }, [selectedVehicle]);

  async function handleSave() {
    setSaving(true);
    try {
      const settingsRef = ref(rtdb, `settings/${selectedVehicle}`);
      await set(settingsRef, {
        speedLimit: parseInt(speedLimit) || 60,
        tiltThreshold: parseInt(tiltThreshold) || 15,
      });
      toast.success(`Pengaturan ${selectedVehicle} berhasil disimpan ke Firebase!`);
    } catch (error) {
      toast.error('Gagal menyimpan: ' + error.message);
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Pengaturan</h1>
        <p className="text-gray-400 mt-1">Konfigurasi batas keselamatan per kendaraan. Data tersimpan di Firebase dan dibaca oleh alat IoT.</p>
      </div>

      {/* Pilih Kendaraan */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
            <SettingsIcon className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Pilih Kendaraan</h2>
            <p className="text-xs text-gray-500">Pengaturan berlaku per kendaraan.</p>
          </div>
        </div>
        <select value={selectedVehicle} onChange={(e) => setSelectedVehicle(e.target.value)}
          className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold/50 transition-all">
          {vehicles.map(v => (
            <option key={v.id} value={v.id}>{v.name} — {v.plate} ({v.driverName})</option>
          ))}
        </select>
      </div>

      {/* Batas Kecepatan */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
            <Gauge className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Batas Kecepatan</h2>
            <p className="text-xs text-gray-500">Jika melebihi batas → Forced Brake aktif (relay ON, alarm ON).</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Kecepatan Maksimum (km/h)</label>
          <input type="number" value={speedLimit} onChange={(e) => setSpeedLimit(e.target.value)}
            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold/50 transition-all"
            min="20" max="120" />
        </div>
      </div>

      {/* Batas Kemiringan */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
            <Mountain className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Batas Kemiringan</h2>
            <p className="text-xs text-gray-500">Jika melebihi batas → Mode Adaptif aktif (event slope dikirim).</p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Kemiringan Maksimum (derajat)</label>
          <input type="number" value={tiltThreshold} onChange={(e) => setTiltThreshold(e.target.value)}
            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold/50 transition-all"
            min="5" max="45" />
        </div>
      </div>

      {/* Info */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
        <p className="text-xs text-gray-500 leading-relaxed">
          Pengaturan ini tersimpan di Firebase Realtime Database pada path <code className="text-gold">settings/{selectedVehicle}</code>.
          Website user dan alat ESP32 membaca setting dari path yang sama secara real-time.
          Saat disimpan, perubahan langsung berlaku di semua halaman monitoring dan alat.
        </p>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-3 bg-gold hover:bg-gold-dark disabled:opacity-50 text-dark-primary font-semibold rounded-xl transition-all">
          {saving ? (
            <div className="w-4 h-4 border-2 border-dark-primary/30 border-t-dark-primary rounded-full animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Simpan Pengaturan
        </button>
      </div>
    </div>
  );
}
