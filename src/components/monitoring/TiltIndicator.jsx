import { Mountain, AlertTriangle } from 'lucide-react';

export default function TiltIndicator({ tilt = 0, maxTilt = 15 }) {
  const isDanger = Math.abs(tilt) > maxTilt;
  const percentage = Math.min(Math.abs(tilt) / 45 * 100, 100); // 45° = max visual
  const rotation = Math.max(-45, Math.min(45, tilt)); // clamp visual rotation

  const statusColor = isDanger ? 'text-red-400' : Math.abs(tilt) > maxTilt * 0.7 ? 'text-yellow-400' : 'text-green-400';
  const statusText = isDanger ? 'BAHAYA' : Math.abs(tilt) > maxTilt * 0.7 ? 'WASPADA' : 'AMAN';

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Visual: Truck tilt representation */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Background circle */}
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />

        {/* Danger zone arc */}
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-red-500/20" />

        {/* Ground line (fixed) */}
        <div className="absolute w-full h-[2px] bg-white/20 top-1/2" />

        {/* Tilting truck body */}
        <div
          className="relative transition-transform duration-300 ease-out"
          style={{ transform: `rotate(${rotation}deg)` }}
        >
          {/* Truck body */}
          <div className={`w-24 h-14 rounded-lg border-2 flex items-center justify-center transition-colors duration-300 ${
            isDanger ? 'border-red-500 bg-red-500/10' : 'border-gold bg-gold/10'
          }`}>
            <Mountain className={`w-6 h-6 ${isDanger ? 'text-red-400' : 'text-gold'}`} />
          </div>
          {/* Wheels */}
          <div className="flex justify-between px-2 -mt-1">
            <div className={`w-4 h-4 rounded-full border-2 ${isDanger ? 'border-red-500' : 'border-gray-400'}`} />
            <div className={`w-4 h-4 rounded-full border-2 ${isDanger ? 'border-red-500' : 'border-gray-400'}`} />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <span className={`text-3xl font-bold ${statusColor}`}>{tilt.toFixed(1)}°</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          {isDanger && <AlertTriangle className="w-4 h-4 text-red-400" />}
          <span className={`text-sm font-medium ${statusColor}`}>{statusText}</span>
        </div>
        <p className="text-xs text-gray-500">Batas aman: {maxTilt}°</p>
      </div>
    </div>
  );
}