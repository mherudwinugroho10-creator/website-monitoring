import { useNavigate } from 'react-router-dom';
import { Activity, FileText, Truck, Wifi, WifiOff, Loader2, Shield, Gauge, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVehicle } from '../../context/VehicleContext';
import { useTodayEventCounts } from '../../hooks/useTodayEventCounts';
import NoVehicleNotice from '../../components/common/NoVehicleNotice';

function formatClock(ms) {
  return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDay(ms) {
  return new Date(ms).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { hasVehicle, vehicleId, loaded, isConnected, lastUpdate, serverOffset } = useVehicle();
  const today = useTodayEventCounts(vehicleId, serverOffset);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';

  const status = !loaded
    ? { cls: 'bg-white/5 border-white/10 text-gray-400', icon: Loader2, text: 'Memuat…', spin: true }
    : isConnected
      ? { cls: 'bg-green-500/10 border-green-500/20 text-green-400', icon: Wifi, text: 'Perangkat terhubung' }
      : { cls: 'bg-red-500/10 border-red-500/20 text-red-400', icon: WifiOff, text: 'Perangkat terputus' };
  const StatusIcon = status.icon;

  const cards = [
    { key: 'overspeed', title: 'Overspeed', icon: Gauge, color: 'text-orange-400', bg: 'bg-orange-500/10', value: today.counts ? today.counts.overspeed : null },
    { key: 'forced_brake', title: 'Forced Brake', icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10', value: today.counts ? today.counts.forcedBrake : null },
  ];

  const features = [
    { icon: Activity, title: 'Live Monitoring', desc: 'Pantau kondisi kendaraan secara realtime.', path: '/monitoring', color: 'text-green-400', bg: 'bg-green-500/10' },
    { icon: FileText, title: 'Behavior Log', desc: 'Lihat riwayat perilaku berkendara.', path: '/behavior-log', color: 'text-blue-400', bg: 'bg-blue-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{greeting}, {userData?.name || 'Pengemudi'}!</h1>
        <p className="text-gray-400 mt-1">Sistem monitoring keselamatan kendaraan berat.</p>
      </div>

      {!hasVehicle ? (
        <NoVehicleNotice />
      ) : (
        <>
          <div className="bg-dark-secondary rounded-2xl border border-white/[0.06] p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                  <Truck className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Nama Kendaraan</p>
                  <p className="text-base font-semibold text-white" data-testid="vehicle-name">{userData?.vehicleName || vehicleId}</p>
                  <p className="text-sm text-gray-400 mt-0.5">
                    <span className="text-gray-500">Plat Nomor: </span>
                    <span data-testid="vehicle-plate">{userData?.vehiclePlate || '—'}</span>
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-1">
                <div data-testid="connection-chip" className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${status.cls}`}>
                  <StatusIcon className={`w-4 h-4 ${status.spin ? 'animate-spin' : ''}`} />
                  <span className="text-sm font-medium">{status.text}</span>
                </div>
                {loaded && (
                  <p className="text-[11px] text-gray-500">
                    {lastUpdate !== null ? `Data terakhir ${formatClock(lastUpdate)}` : 'Belum ada data dari perangkat'}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-3">
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Kejadian Hari Ini</h2>
              <p className="text-xs text-gray-600" data-testid="today-date">{formatDay(today.dayStart)}</p>
            </div>
            {today.error && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-3" role="alert">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{today.error}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {cards.map((c) => (
                <div key={c.key} data-testid={`today-${c.key}`} className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
                  <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                    <c.icon className={`w-5 h-5 ${c.color}`} />
                  </div>
                  <div className={`text-3xl font-bold font-mono ${c.value === null ? 'text-gray-600' : c.color}`} data-testid={`today-${c.key}-value`}>
                    {c.value === null ? '—' : c.value}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{c.title}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Fitur Utama</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((f) => (
            <button key={f.path} type="button" onClick={() => navigate(f.path)}
              className="text-left bg-dark-secondary rounded-2xl border border-white/[0.06] p-6 hover:border-gold/20 transition-all group">
              <div className={`w-12 h-12 rounded-xl ${f.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <f.icon className={`w-6 h-6 ${f.color}`} />
              </div>
              <h3 className="text-base font-semibold text-white mb-2 group-hover:text-gold transition-colors">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-dark-secondary rounded-2xl border border-white/[0.06] p-5">
        <p className="text-xs text-gray-600 leading-relaxed">
          SAFEDRIVE — Sistem Monitoring Keselamatan Kendaraan Berat Berbasis IoT.
          Menggunakan ESP32, sensor MPU6050, dan GPS Beitian BN-220 untuk memantau kecepatan, kemiringan jalan, dan status pengereman secara realtime.
        </p>
        <p className="text-xs text-gray-700 mt-2">
          Muhammad Heru Dwi Nugroho — Politeknik Keselamatan Transportasi Jalan (PKTJ) Tegal
        </p>
      </div>
    </div>
  );
}