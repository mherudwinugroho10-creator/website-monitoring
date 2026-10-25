import { CheckCircle, Shield, AlertTriangle, WifiOff } from 'lucide-react';

const CONFIG = {
  normal: {
    icon: CheckCircle,
    title: 'NORMAL',
    subtitle: 'Exhaust brake dan forced brake tidak aktif',
    color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/30', pulse: null,
  },
  exhaust: {
    icon: Shield,
    title: 'EXHAUST BRAKE AKTIF',
    subtitle: 'Rem gas buang sedang bekerja',
    color: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/30', pulse: null,
  },
  forced: {
    icon: AlertTriangle,
    title: 'FORCED BRAKE AKTIF',
    subtitle: 'Pengereman paksa diaktifkan oleh perangkat',
    color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', pulse: 'bg-red-500',
  },
  unknown: {
    icon: WifiOff,
    title: 'TIDAK ADA DATA',
    subtitle: 'Menunggu data dari alat',
    color: 'text-gray-500', bg: 'bg-white/[0.03]', border: 'border-white/10', pulse: null,
  },
};

function Row({ label, active, activeClass, known, testId }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] rounded-lg" data-testid={testId}>
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-xs font-semibold ${!known ? 'text-gray-600' : active ? activeClass : 'text-gray-400'}`}>
        {!known ? '—' : active ? 'AKTIF' : 'NONAKTIF'}
      </span>
    </div>
  );
}

// Status pengereman: hanya exhaust brake dan forced brake yang dipantau (rem utama tidak ada sensornya).
export default function BrakeStatus({ state, exhaustActive, forcedActive }) {
  const cfg = CONFIG[state] || CONFIG.unknown;
  const Icon = cfg.icon;
  const known = state !== 'unknown';

  return (
    <div className="flex flex-col items-center gap-5" data-testid="brake-status" data-state={state}>
      <div className="relative">
        <div className={`w-28 h-28 rounded-full ${cfg.bg} border-2 ${cfg.border} flex items-center justify-center transition-all duration-300`}>
          <Icon className={`w-12 h-12 ${cfg.color}`} />
        </div>
        {cfg.pulse && <div className={`absolute inset-0 rounded-full ${cfg.pulse} opacity-20 animate-ping`} />}
      </div>

      <div className="text-center">
        <h4 className={`text-lg font-bold ${cfg.color}`}>{cfg.title}</h4>
        <p className="text-xs text-gray-500 mt-1 max-w-[220px]">{cfg.subtitle}</p>
      </div>

      <div className="w-full space-y-2">
        <Row label="Exhaust Brake" active={exhaustActive} activeClass="text-gold" known={known} testId="brake-exhaust" />
        <Row label="Forced Brake" active={forcedActive} activeClass="text-red-400" known={known} testId="brake-forced" />
      </div>

      <p className="text-[11px] text-gray-600 text-center">
        Hanya status exhaust brake yang dipantau. Rem utama tidak memiliki sensor.
      </p>
    </div>
  );
}