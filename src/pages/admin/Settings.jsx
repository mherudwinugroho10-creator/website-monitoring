import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { collection, getDocs } from 'firebase/firestore';
import { rtdb, db } from '../../services/firebase';
import { toast } from 'react-toastify';
import { Gauge, Mountain, Save, Settings as SettingsIcon } from 'lucide-react';

export default function Settings() {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [speedLimit1, setSpeedLimit1] = useState('80');
  const [speedLimit2, setSpeedLimit2] = useState('40');
  const [tiltThreshold, setTiltThreshold] = useState('15');
  const [tiltSpeedSwitch, setTiltSpeedSwitch] = useState('1.72');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    if (!selectedVehicle) return;
    const settingsRef = ref(rtdb, `settings/${selectedVehicle}`);
    const unsub = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setSpeedLimit1(String(data.speedLimit1 || 80));
        setSpeedLimit2(String(data.speedLimit2 || 40));
        setTiltThreshold(String(data.tiltThreshold || 15));
        setTiltSpeedSwitch(String(data.tiltSpeedSwitch || 1.72));
      } else {
        setSpeedLimit1('80');
        setSpeedLimit2('40');
        setTiltThreshold('15');
        setTiltSpeedSwitch('1.72');
      }
    });
    return () => unsub();
  }, [selectedVehicle]);

  async function handleSave() {
    setSaving(true);
    try {
      const settingsRef = ref(rtdb, `settings/${selectedVehicle}`);
      await set(settingsRef, {
        speedLimit1: parseInt(speedLimit1) || 80,
        speedLimit2: parseInt(speedLimit2) || 40,
        tiltThreshold: parseInt(tiltThreshold) || 15,
        tiltSpeedSwitch: parseFloat(tiltSpeedSwitch) || 1.72,
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
            <p className="text-xs text-gray-500">
              Dua tingkat sesuai kemiringan. Titik pindah diatur di bagian "Titik Pindah Kemiringan" di bawah.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Batas Normal (&lt; titik pindah)</label>
            <input type="number" value={speedLimit1} onChange={(e) => setSpeedLimit1(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold/50 transition-all"
              min="20" max="120" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Batas Saat Kemiringan (≥ titik pindah)</label>
            <input type="number" value={speedLimit2} onChange={(e) => setSpeedLimit2(e.target.value)}
              className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold/50 transition-all"
              min="20" max="120" />
          </div>
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

      {/* Titik Pindah Kemiringan (menentukan speedLimit1 vs speedLimit2) */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
            <Mountain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Titik Pindah Kemiringan</h2>
            <p className="text-xs text-gray-500">
              Kemiringan di atas nilai ini membuat alat pindah dari Batas Normal ke Batas Saat Kemiringan.
            </p>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Ambang Pindah (derajat)</label>
          <input type="number" step="0.01" value={tiltSpeedSwitch} onChange={(e) => setTiltSpeedSwitch(e.target.value)}
            className="w-full px-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl text-white focus:outline-none focus:border-gold/50 transition-all"
            min="0" max="45" />
        </div>
      </div>

      {/* Info */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
        <p className="text-xs text-gray-500 leading-relaxed">
          Pengaturan ini tersimpan di Firebase Realtime Database pada path <code className="text-gold">settings/{selectedVehicle}</code>.
          Website memantau perubahan secara real-time; alat ESP32 mengecek ulang tiap ±10 detik.
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