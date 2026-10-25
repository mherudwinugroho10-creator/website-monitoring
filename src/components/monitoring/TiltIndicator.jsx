import { formatNumber, terrainLabel, tiltVisualAngle, TILT_DOWNHILL_THRESHOLD } from '../../utils/vehicleLogic';

// Indikator kemiringan jalan (%): ilustrasi truk di atas jalan, status DATAR atau MENURUN
// menurut ambang 3%. Status ini informasi, bukan peringatan, jadi tidak memakai warna bahaya.
export default function TiltIndicator({ tilt, terrain, connected }) {
  const hasTilt = connected && typeof tilt === 'number';
  const angle = hasTilt ? tiltVisualAngle(tilt) : 0;
  const downhill = hasTilt && terrain === 'downhill';
  const accent = hasTilt ? '#d4af37' : '#4b5563';
  const status = hasTilt ? terrainLabel(terrain) : '—';

  const badgeClass = !hasTilt
    ? 'bg-white/[0.03] text-gray-500 border-white/10'
    : downhill
      ? 'bg-gold/10 text-gold border-gold/30'
      : 'bg-white/5 text-gray-200 border-white/10';

  const caption = !connected
    ? 'Menunggu data dari alat'
    : !hasTilt
      ? 'Sensor kemiringan belum mengirim data'
      : `Menurun bila kemiringan ≥ ${TILT_DOWNHILL_THRESHOLD}%`;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg viewBox="0 0 200 150" className="w-full max-w-[260px]" role="img"
        aria-label={hasTilt ? `Kemiringan jalan ${formatNumber(tilt, 2)} persen, ${status.toLowerCase()}` : 'Kemiringan jalan tidak ada data'}>
        <defs>
          <clipPath id="tilt-ring-clip"><circle cx="100" cy="75" r="68" /></clipPath>
        </defs>
        <circle cx="100" cy="75" r="70" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2" />

        <g clipPath="url(#tilt-ring-clip)">
          {/* acuan datar (tetap) */}
          <line x1="20" y1="112" x2="180" y2="112" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" strokeDasharray="3 4" />

          {/* jalan dan truk (ikut miring) */}
          <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '100px 112px', transition: 'transform 0.4s ease-out' }}>
            <line x1="10" y1="112" x2="190" y2="112" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
            <g fill={hasTilt ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.03)'} stroke={accent} strokeWidth="2" strokeLinejoin="round">
              <rect x="50" y="62" width="64" height="34" rx="3" />
              <path d="M114 96 V72 H138 L152 86 V96 Z" />
              <path d="M120 77 H135 L144 86 H120 Z" />
              <circle cx="68" cy="104" r="8" fill="#0a0a0f" />
              <circle cx="92" cy="104" r="8" fill="#0a0a0f" />
              <circle cx="138" cy="104" r="8" fill="#0a0a0f" />
            </g>
          </g>
        </g>
      </svg>

      <div className="text-center space-y-2">
        <div>
          <span className={`text-3xl font-bold font-mono ${hasTilt ? 'text-white' : 'text-gray-600'}`}>
            {hasTilt ? formatNumber(tilt, 2) : '—'}
          </span>
          <span className="text-sm text-gray-500 ml-1">%</span>
        </div>
        <span data-testid="tilt-status" className={`inline-block px-3 py-1 rounded-lg border text-xs font-semibold tracking-wide ${badgeClass}`}>
          {status}
        </span>
        <p className="text-[11px] text-gray-600">{caption}</p>
      </div>
    </div>
  );
}