import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X, Wifi, WifiOff, Gauge, Mountain, Shield, MapPin, Clock, AlertTriangle, Activity
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVehicle } from '../../context/VehicleContext';

function playSound(severity) {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const now = ac.currentTime;
    if (severity === 'critical') {
      for (let i = 0; i < 16; i++) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'square'; o.frequency.value = 1000; g.gain.value = 0.18;
        o.start(now + i * 0.25); o.stop(now + i * 0.25 + 0.15);
      }
    } else if (severity === 'danger') {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.connect(gain); gain.connect(ac.destination);
      osc.type = 'sawtooth'; gain.gain.value = 0.18;
      for (let j = 0; j < 6; j++) {
        osc.frequency.setValueAtTime(400, now + j * 0.5);
        osc.frequency.linearRampToValueAtTime(800, now + j * 0.5 + 0.25);
        osc.frequency.linearRampToValueAtTime(400, now + j * 0.5 + 0.5);
      }
      gain.gain.setValueAtTime(0.18, now + 2.7);
      gain.gain.linearRampToValueAtTime(0, now + 3);
      osc.start(now); osc.stop(now + 3);
    } else {
      for (let k = 0; k < 3; k++) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'sine'; o.frequency.value = 660; g.gain.value = 0.18;
        o.start(now + k * 0.4); o.stop(now + k * 0.4 + 0.2);
      }
    }
  } catch (e) {}
}

export default function DriverMode() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const {
    liveData, isConnected, settings, events,
    isSimulating, startSimulation, stopSimulation
  } = useVehicle();

  const [showExit, setShowExit] = useState(false);

  const speed = liveData?.gps?.speed || 0;
  const tilt = liveData?.tilt || 0;
  const mode = liveData?.mode || 'normal';
  const exhaustActive = liveData?.brake?.exhaust_active || false;
  const forcedBrake = liveData?.brake?.forced || false;
  const lat = liveData?.gps?.lat || 0;
  const lng = liveData?.gps?.lng || 0;
  const connection = liveData?.connection || (isConnected ? 'online' : 'offline_sd');

  const isOverspeed = speed > settings.speedLimit;
  const isSteepSlope = tilt > settings.tiltThreshold;

  const modeConfig = {
    normal: { label: 'NORMAL', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30' },
    adaptive: { label: 'ADAPTIF', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
    forced_brake: { label: 'FORCED BRAKE', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  };
  const currentMode = modeConfig[mode] || modeConfig.normal;

  // Sound alerts
  useEffect(() => {
    if (events.length > 0) {
      const latest = events[0];
      if (Date.now() - latest.timestamp < 2000) {
        playSound(latest.severity);
      }
    }
  }, [events]);

  // Speed percentage for gauge
  const speedPct = Math.min((speed / (settings.speedLimit * 1.5)) * 100, 100);
  const tiltPct = Math.min((Math.abs(tilt) / 45) * 100, 100);

  function exitDriverMode() {
    if (isSimulating) stopSimulation();
    navigate('/dashboard');
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className={`fixed inset-0 z-50 flex flex-col transition-colors duration-500 ${
      mode === 'forced_brake' ? 'bg-red-950' : mode === 'adaptive' ? 'bg-yellow-950/80' : 'bg-[#0a0a0f]'
    }`}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400 font-mono">{timeStr}</span>
        </div>

        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full ${currentMode.bg} ${currentMode.border} border`}>
          <Activity className={`w-4 h-4 ${currentMode.color}`} />
          <span className={`text-sm font-bold ${currentMode.color}`}>{currentMode.label}</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Connection */}
          <div className="flex items-center gap-2">
            {connection === 'online'
              ? <Wifi className="w-4 h-4 text-green-400" />
              : <WifiOff className="w-4 h-4 text-red-400" />}
          </div>

          {/* Simulasi */}
          {!isSimulating ? (
            <button onClick={startSimulation} className="text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg">
              Simulasi
            </button>
          ) : (
            <button onClick={stopSimulation} className="text-xs text-red-400 bg-red-500/10 px-3 py-1.5 rounded-lg">
              Stop
            </button>
          )}

          {/* Exit */}
          <button onClick={() => setShowExit(true)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {/* Speed - big display */}
        <div className="text-center">
          <div className={`text-8xl font-black tabular-nums transition-colors duration-300 ${
            isOverspeed ? 'text-red-400' : 'text-white'
          }`}>
            {Math.round(speed)}
          </div>
          <div className="text-xl text-gray-400 mt-1">km/h</div>
          <div className="text-sm text-gray-500 mt-2">Batas: {settings.speedLimit} km/h</div>
        </div>

        {/* Speed bar */}
        <div className="w-full max-w-md">
          <div className="h-3 bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isOverspeed ? 'bg-red-500' : speedPct > 70 ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${speedPct}%` }}
            />
          </div>
        </div>

        {/* Tilt + Brake status */}
        <div className="flex items-center gap-8">
          {/* Tilt */}
          <div className="text-center">
            <div className="flex items-center gap-2 mb-1">
              <Mountain className={`w-5 h-5 ${isSteepSlope ? 'text-red-400' : 'text-blue-400'}`} />
              <span className="text-sm text-gray-400">Kemiringan</span>
            </div>
            <div className={`text-3xl font-bold ${isSteepSlope ? 'text-red-400' : 'text-white'}`}>
              {tilt.toFixed(1)}°
            </div>
            <div className="text-xs text-gray-500">Batas: {settings.tiltThreshold}°</div>
          </div>

          {/* Divider */}
          <div className="w-px h-16 bg-white/10" />

          {/* Exhaust Brake */}
          <div className="text-center">
            <div className="flex items-center gap-2 mb-1">
              <Shield className={`w-5 h-5 ${exhaustActive ? 'text-red-400' : 'text-green-400'}`} />
              <span className="text-sm text-gray-400">Exhaust Brake</span>
            </div>
            <div className={`text-3xl font-bold ${exhaustActive ? 'text-red-400' : 'text-green-400'}`}>
              {exhaustActive ? 'ON' : 'OFF'}
            </div>
            {forcedBrake && <div className="text-xs text-red-400 mt-1">Relay & Alarm Aktif</div>}
          </div>
        </div>

        {/* GPS */}
        <div className="flex items-center gap-2 text-gray-500 text-xs">
          <MapPin className="w-3 h-3" />
          <span className="font-mono">{lat.toFixed(6)}, {lng.toFixed(6)}</span>
        </div>
      </div>

      {/* Danger banner */}
      {mode !== 'normal' && (
        <div className={`px-6 py-4 text-center ${
          mode === 'forced_brake' ? 'bg-red-500/20' : 'bg-yellow-500/20'
        }`}>
          <div className="flex items-center justify-center gap-2">
            <AlertTriangle className={`w-5 h-5 ${currentMode.color}`} />
            <span className={`font-bold ${currentMode.color}`}>
              {mode === 'forced_brake'
                ? 'FORCED BRAKE AKTIF — Kurangi kecepatan!'
                : 'TURUNAN EKSTREM — Hati-hati!'}
            </span>
          </div>
        </div>
      )}

      {/* Exit confirmation */}
      {showExit && (
        <div className="fixed inset-0 z-60 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-dark-secondary rounded-2xl border border-white/10 p-6 max-w-sm w-full text-center">
            <h3 className="text-lg font-semibold text-white mb-2">Keluar Mode Driver?</h3>
            <p className="text-sm text-gray-400 mb-6">Anda akan kembali ke dashboard.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowExit(false)}
                className="flex-1 px-4 py-2.5 bg-white/5 text-white rounded-xl hover:bg-white/10 transition-colors">
                Batal
              </button>
              <button onClick={exitDriverMode}
                className="flex-1 px-4 py-2.5 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors">
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}