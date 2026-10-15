import {
  Gauge, Mountain, ArrowUpDown, Compass, Wifi, WifiOff, Activity,
} from 'lucide-react';
import { useVehicle } from '../../context/VehicleContext';
import Speedometer  from '../../components/monitoring/Speedometer';
import TiltIndicator from '../../components/monitoring/TiltIndicator';
import BrakeStatus  from '../../components/monitoring/BrakeStatus';
import SpeedChart   from '../../components/monitoring/SpeedChart';
import DangerAlert  from '../../components/monitoring/DangerAlert';

export default function LiveMonitoring() {
  const {
    liveData, isConnected, speedHistory,
    events, settings,
  } = useVehicle();

  const speed         = liveData?.gps?.speed           || 0;
  const tilt          = liveData?.tilt                 || 0;
  const mode          = liveData?.mode                 || 'normal';
  const exhaustActive = liveData?.brake?.exhaust_active || false;
  const forcedBrake   = liveData?.brake?.forced         || false;
  const connection    = liveData?.connection            || (isConnected ? 'online' : 'offline');

  // Yaw murni informasi arah hadap (heading), tidak ada logika bahaya/threshold.
  // Rumus normalisasi -180..180 -> 0..360 sama dengan yang dipakai di TFT alat (Server).
  const rawYaw  = liveData?.yaw;
  const hasYaw  = typeof rawYaw === 'number';
  const yawHeading = hasYaw ? (rawYaw < 0 ? rawYaw + 360 : rawYaw) : null;

  const isOverspeed  = speed > settings.speedLimit;
  const isSteepSlope = tilt  > settings.tiltThreshold;

  const modeConfig = {
    normal:       { label: 'Normal',       color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30'  },
    adaptive:     { label: 'Adaptif',      color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    forced_brake: { label: 'Forced Brake', color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/30'    },
  };
  const currentMode = modeConfig[mode] || modeConfig.normal;

  return (
    <>
      {/* FIX: kirim isConnected agar DangerAlert tidak muncul saat ESP mati */}
      <DangerAlert events={events} isConnected={isConnected} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Live Monitoring</h1>
            <p className="text-gray-400 mt-1">Data sensor kendaraan secara realtime.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${currentMode.bg} ${currentMode.border}`}>
              <Activity className={`w-4 h-4 ${currentMode.color}`} />
              <span className={`text-sm font-medium ${currentMode.color}`}>{currentMode.label}</span>
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
              connection === 'online'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {connection === 'online'
                ? <Wifi className="w-4 h-4" />
                : <WifiOff className="w-4 h-4" />}
              <span className="text-sm font-medium">
                {connection === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* 4 Kartu Ringkasan Cepat */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className={`bg-dark-secondary rounded-xl border p-4 transition-all duration-300 ${isOverspeed ? 'border-red-500/50 bg-red-500/5' : 'border-white/5'}`}>
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Gauge className="w-4 h-4" />
              <span className="text-xs">Kecepatan</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${isOverspeed ? 'text-red-400' : 'text-white'}`}>
                {speed}
              </span>
              <span className="text-sm text-gray-500">km/jam</span>
            </div>
          </div>

          <div className={`bg-dark-secondary rounded-xl border p-4 transition-all duration-300 ${isSteepSlope ? 'border-red-500/50 bg-red-500/5' : 'border-white/5'}`}>
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Mountain className="w-4 h-4" />
              <span className="text-xs">Kemiringan</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${isSteepSlope ? 'text-red-400' : 'text-white'}`}>
                {tilt}
              </span>
              <span className="text-sm text-gray-500">°</span>
            </div>
          </div>

          <div className="bg-dark-secondary rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Compass className="w-4 h-4" />
              <span className="text-xs">Arah Hadap</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white">
                {hasYaw ? Math.round(yawHeading) : '–'}
              </span>
              <span className="text-sm text-gray-500">{hasYaw ? '°' : ''}</span>
            </div>
          </div>

          <div className="bg-dark-secondary rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <ArrowUpDown className="w-4 h-4" />
              <span className="text-xs">Batas Kecepatan</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gold">{settings.speedLimit}</span>
              <span className="text-sm text-gray-500">km/jam</span>
            </div>
          </div>
        </div>

        {/* 3 Komponen Utama */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`bg-dark-secondary rounded-2xl border p-6 transition-all duration-300 ${isOverspeed ? 'border-red-500/30' : 'border-white/5'}`}>
            <h3 className="text-base font-semibold text-white mb-4">Speedometer</h3>
            <Speedometer speed={speed} maxSpeed={settings.speedLimit} />
          </div>

          <div className={`bg-dark-secondary rounded-2xl border p-6 transition-all duration-300 ${isSteepSlope ? 'border-red-500/30' : 'border-white/5'}`}>
            <h3 className="text-base font-semibold text-white mb-4">Kemiringan Kendaraan</h3>
            <TiltIndicator tilt={tilt} maxTilt={settings.tiltThreshold} />
          </div>

          <div className={`bg-dark-secondary rounded-2xl border p-6 transition-all duration-300 ${forcedBrake ? 'border-red-500/30' : 'border-white/5'}`}>
            <h3 className="text-base font-semibold text-white mb-4">Status Pengereman</h3>
            <BrakeStatus
              exhaustActive={exhaustActive}
              forcedBrake={forcedBrake}
              mode={mode}
            />
          </div>
        </div>

        {/* Grafik Riwayat Kecepatan */}
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
          <h3 className="text-base font-semibold text-white mb-4">Grafik Riwayat Kecepatan</h3>
          <SpeedChart data={speedHistory} maxSpeed={settings.speedLimit} />
        </div>
      </div>
    </>
  );
}