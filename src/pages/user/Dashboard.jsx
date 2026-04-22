import { useNavigate } from 'react-router-dom';
import { Activity, Car, MapPin, Truck, Wifi, WifiOff, Shield, Gauge, Mountain } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVehicle } from '../../context/VehicleContext';

export default function Dashboard() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { liveData, isConnected, events, settings, isSimulating, startSimulation, stopSimulation } = useVehicle();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';

  const mode = liveData?.mode || 'normal';
  const modeConfig = {
    normal: { label: 'Normal', color: 'text-green-400', bg: 'bg-green-500/10' },
    adaptive: { label: 'Adaptif', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    forced_brake: { label: 'Forced Brake', color: 'text-red-400', bg: 'bg-red-500/10' },
  };
  const currentMode = modeConfig[mode] || modeConfig.normal;

  // Ringkasan event hari ini
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEvents = events.filter(e => e.timestamp >= todayStart.getTime());
  const todayOverspeed = todayEvents.filter(e => e.type === 'overspeed').length;
  const todayForcedBrake = todayEvents.filter(e => e.type === 'forced_brake').length;
  const todaySteepSlope = todayEvents.filter(e => e.type === 'steep_slope').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">{greeting}, {userData?.name || 'Driver'}!</h1>
          <p className="text-gray-400 mt-1">Sistem monitoring keselamatan kendaraan berat.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!isSimulating ? (
            <button onClick={startSimulation}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 text-green-400 rounded-xl text-sm transition-all">
              <Activity className="w-4 h-4" /> Mulai Simulasi
            </button>
          ) : (
            <button onClick={stopSimulation}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-xl text-sm transition-all">
              <Activity className="w-4 h-4" /> Stop Simulasi
            </button>
          )}
        </div>
      </div>

      {/* Info Kendaraan + Status */}
      <div className="bg-dark-secondary rounded-2xl border border-white/[0.06] p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
              <Truck className="w-6 h-6 text-gold" />
            </div>
            <div>
              <p className="text-base font-semibold text-white">{userData?.vehicleName || 'Kendaraan'}</p>
              <p className="text-sm text-gray-400">{userData?.vehiclePlate || '-'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Mode badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${currentMode.bg}`}>
              <Shield className={`w-4 h-4 ${currentMode.color}`} />
              <span className={`text-sm font-medium ${currentMode.color}`}>{currentMode.label}</span>
            </div>
            {/* Koneksi */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
              isConnected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
            }`}>
              {isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span className="text-sm font-medium">{isConnected ? 'Online' : 'Offline'}</span>
            </div>
            {isSimulating && (
              <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-lg">Simulasi</span>
            )}
          </div>
        </div>
      </div>

      {/* Ringkasan Event Hari Ini */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Event Hari Ini</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3">
              <Gauge className="w-5 h-5 text-orange-400" />
            </div>
            <div className="text-2xl font-bold text-orange-400">{todayOverspeed}</div>
            <div className="text-xs text-gray-500 mt-1">Overspeed</div>
          </div>
          <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
            <div className="text-2xl font-bold text-red-400">{todayForcedBrake}</div>
            <div className="text-xs text-gray-500 mt-1">Forced Brake</div>
          </div>
          <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
              <Mountain className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-blue-400">{todaySteepSlope}</div>
            <div className="text-xs text-gray-500 mt-1">Turunan Ekstrem</div>
          </div>
        </div>
      </div>

      {/* Quick Access */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Fitur Utama</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: Activity, title: 'Live Monitoring',
              desc: 'Pantau kecepatan, kemiringan, posisi, dan status pengereman kendaraan secara real-time.',
              path: '/monitoring', color: 'text-green-400', bg: 'bg-green-500/10',
            },
            {
              icon: MapPin, title: 'Behavior Log',
              desc: 'Lihat rekap seluruh event keselamatan yang tercatat, dengan filter dan export Excel.',
              path: '/behavior-log', color: 'text-blue-400', bg: 'bg-blue-500/10',
            },
            {
              icon: Car, title: 'Mode Driver',
              desc: 'Tampilan fullscreen khusus pengemudi dengan indikator kecepatan dan peringatan bahaya.',
              path: '/driver-mode', color: 'text-gold', bg: 'bg-gold/10',
            },
          ].map(f => (
            <div key={f.path} onClick={() => navigate(f.path)}
              className="bg-dark-secondary rounded-2xl border border-white/[0.06] p-6 hover:border-gold/20 cursor-pointer transition-all group">
              <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon className={`w-6 h-6 ${f.color}`} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2 group-hover:text-gold transition-colors">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info Sistem */}
      <div className="bg-dark-secondary rounded-2xl border border-white/[0.06] p-5">
        <p className="text-xs text-gray-600 leading-relaxed">
          SAFEDRIVE — Sistem Monitoring Keselamatan Kendaraan Berat Berbasis IoT.
          Menggunakan ESP32, sensor MPU6050, dan GPS NEO-6M untuk memantau kecepatan dan kemiringan kendaraan secara real-time.
          Ketika kondisi berbahaya terdeteksi, sistem mengaktifkan exhaust brake otomatis untuk mencegah kecelakaan.
        </p>
        <p className="text-xs text-gray-700 mt-2">
          Muhammad Heru Dwi Nugroho — Politeknik Keselamatan Transportasi Jalan (PKTJ) Tegal
        </p>
      </div>
    </div>
  );
}