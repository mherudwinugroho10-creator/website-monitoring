import { AlertTriangle, CheckCircle, Zap } from 'lucide-react';

export default function BrakeStatus({ exhaustActive = false, forcedBrake = false, mode = 'normal' }) {
  // Status berdasarkan flowchart:
  // - forced_brake: Overspeed → relay ON, alarm ON, exhaust brake aktif
  // - adaptive: Turunan ekstrem → exhaust brake aktif sebagai bantuan
  // - normal: Semua OFF

  const configs = {
    forced_brake: {
      icon: AlertTriangle,
      title: 'FORCED BRAKE AKTIF',
      subtitle: 'Kecepatan melebihi batas — Exhaust brake & alarm diaktifkan',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      pulseColor: 'bg-red-500',
      exhaustLabel: 'Exhaust Brake ON',
      relayLabel: 'Relay ON',
      alarmLabel: 'Alarm ON',
    },
    adaptive: {
      icon: Zap,
      title: 'MODE ADAPTIF',
      subtitle: 'Turunan ekstrem terdeteksi — Exhaust brake standby',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/30',
      pulseColor: 'bg-yellow-500',
      exhaustLabel: 'Exhaust Brake ON',
      relayLabel: 'Relay Standby',
      alarmLabel: 'Alarm OFF',
    },
    normal: {
      icon: CheckCircle,
      title: 'NORMAL',
      subtitle: 'Semua parameter dalam batas aman',
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/30',
      pulseColor: 'bg-green-500',
      exhaustLabel: 'Exhaust Brake OFF',
      relayLabel: 'Relay OFF',
      alarmLabel: 'Alarm OFF',
    },
  };

  const cfg = configs[mode] || configs.normal;
  const Icon = cfg.icon;

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Main indicator */}
      <div className="relative">
        <div className={`w-28 h-28 rounded-full ${cfg.bg} border-2 ${cfg.border} flex items-center justify-center transition-all duration-300`}>
          <Icon className={`w-12 h-12 ${cfg.color}`} />
        </div>
        {/* Pulse animation for active states */}
        {mode !== 'normal' && (
          <div className={`absolute inset-0 rounded-full ${cfg.pulseColor} opacity-20 animate-ping`} />
        )}
      </div>

      {/* Title */}
      <div className="text-center">
        <h4 className={`text-lg font-bold ${cfg.color}`}>{cfg.title}</h4>
        <p className="text-xs text-gray-500 mt-1 max-w-[220px]">{cfg.subtitle}</p>
      </div>

      {/* Status indicators */}
      <div className="w-full space-y-2">
        {[
          { label: cfg.exhaustLabel, active: exhaustActive },
          { label: cfg.relayLabel, active: forcedBrake },
          { label: cfg.alarmLabel, active: forcedBrake },
        ].map((item, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 bg-white/[0.03] rounded-lg">
            <span className="text-xs text-gray-400">{item.label.split(' ').slice(0, -1).join(' ')}</span>
            <span className={`text-xs font-medium ${item.active ? 'text-red-400' : 'text-green-400'}`}>
              {item.label.split(' ').pop()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}