import { useEffect } from 'react';
import {
  Gauge, Mountain, ArrowUpDown, Wifi, WifiOff,
  Play, Square, Shield, Activity, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVehicle } from '../../context/VehicleContext';
import Speedometer from '../../components/monitoring/Speedometer';
import TiltIndicator from '../../components/monitoring/TiltIndicator';
import BrakeStatus from '../../components/monitoring/BrakeStatus';
import LiveMap from '../../components/monitoring/LiveMap';
import SpeedChart from '../../components/monitoring/SpeedChart';
import DangerAlert from '../../components/monitoring/DangerAlert';

export default function LiveMonitoring() {
  const { userData } = useAuth();
  const {
    liveData, isConnected, speedHistory, routeHistory,
    events, settings, isSimulating, startSimulation, stopSimulation
  } = useVehicle();

  const speed = liveData?.gps?.speed || 0;
  const tilt = liveData?.tilt || 0;
  const lat = liveData?.gps?.lat || -6.966667;
  const lng = liveData?.gps?.lng || 110.419444;
  const heading = liveData?.gps?.heading || 0;
  const mode = liveData?.mode || 'normal';
  const exhaustActive = liveData?.brake?.exhaust_active || false;
  const forcedBrake = liveData?.brake?.forced || false;
  const connection = liveData?.connection || (isConnected ? 'online' : 'offline_sd');

  const isOverspeed = speed > settings.speedLimit;
  const isSteepSlope = tilt > settings.tiltThreshold;

  const modeConfig = {
    normal: { label: 'Normal', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    adaptive: { label: 'Adaptif', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    forced_brake: { label: 'Forced Brake', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  };
  const currentMode = modeConfig[mode] || modeConfig.normal;

  // DangerAlert dari events terbaru (3 detik terakhir)
  const recentAlerts = events
    .filter(e => Date.now() - e.timestamp < 5000)
    .map(e => ({
      id: e.id,
      type: e.type,
      severity: e.severity,
      message: e.message,
      details: e.type === 'forced_brake'
        ? `Kecepatan ${e.speed} km/h • Kemiringan ${e.tilt}°`
        : e.type === 'steep_slope'
          ? `Kemiringan ${e.tilt}° • Kecepatan ${e.speed} km/h`
          : `Kecepatan ${e.speed} km/h`,
      timestamp: new Date(e.timestamp),
    }));

  return (
    <>
      <DangerAlert alerts={recentAlerts} />

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Live Monitoring</h1>
            <p className="text-gray-400 mt-1">Data sensor kendaraan secara real-time.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Simulasi */}
            {!isSimulating ? (
              <button onClick={startSimulation}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 text-green-400 rounded-xl transition-all text-sm">
                <Play className="w-4 h-4" /> Mulai Simulasi
              </button>
            ) : (
              <button onClick={stopSimulation}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-xl transition-all text-sm">
                <Square className="w-4 h-4" /> Stop Simulasi
              </button>
            )}

            {/* Mode */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${currentMode.bg} ${currentMode.border}`}>
              <Activity className={`w-4 h-4 ${currentMode.color}`} />
              <span className={`text-sm font-medium ${currentMode.color}`}>{currentMode.label}</span>
            </div>

            {/* Connection */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${
              connection === 'online'
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {connection === 'online' ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              <span className="text-sm font-medium">{connection === 'online' ? 'Online' : 'Offline (SD)'}</span>
            </div>

            {isSimulating && (
              <span className="text-xs text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-lg">Simulasi</span>
            )}
          </div>
        </div>

        {/* Quick Stats - 3 cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className={`bg-dark-secondary rounded-xl border p-4 transition-all duration-300 ${isOverspeed ? 'border-red-500/50 bg-red-500/5' : 'border-white/5'}`}>
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Gauge className="w-4 h-4" /><span className="text-xs">Kecepatan</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${isOverspeed ? 'text-red-400' : 'text-white'}`}>{speed}</span>
              <span className="text-sm text-gray-500">km/h</span>
            </div>
          </div>
          <div className={`bg-dark-secondary rounded-xl border p-4 transition-all duration-300 ${isSteepSlope ? 'border-red-500/50 bg-red-500/5' : 'border-white/5'}`}>
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Mountain className="w-4 h-4" /><span className="text-xs">Kemiringan</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-bold ${isSteepSlope ? 'text-red-400' : 'text-white'}`}>{tilt}</span>
              <span className="text-sm text-gray-500">°</span>
            </div>
          </div>
          <div className="bg-dark-secondary rounded-xl border border-white/5 p-4">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <ArrowUpDown className="w-4 h-4" /><span className="text-xs">Batas Kecepatan</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-gold">{settings.speedLimit}</span>
              <span className="text-sm text-gray-500">km/h</span>
            </div>
          </div>
        </div>

        {/* Main Grid: Speedometer, Tilt, Brake */}
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
            <BrakeStatus exhaustActive={exhaustActive} forcedBrake={forcedBrake} mode={mode} />
          </div>
        </div>

        {/* Map & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
            <h3 className="text-base font-semibold text-white mb-4">Posisi Kendaraan</h3>
            <div className="h-[300px] rounded-xl overflow-hidden">
              <LiveMap position={{ lat, lng }} heading={heading} route={routeHistory} />
            </div>
          </div>
          <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
            <h3 className="text-base font-semibold text-white mb-4">Grafik Kecepatan</h3>
            <div className="h-[300px]">
              <SpeedChart data={speedHistory} maxSpeed={settings.speedLimit} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}