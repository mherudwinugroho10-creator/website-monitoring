import { useMemo } from 'react';
import { gaugeMax, formatNumber } from '../../utils/vehicleLogic';

const CX = 100;
const CY = 105;
const RADIUS = 80;
const START_DEG = 225;
const SWEEP = 270;

const COLOR_NORMAL = '#22c55e';
const COLOR_OVERSPEED = '#ef4444';
const COLOR_IDLE = '#4b5563';

function toXY(angleDeg, radius) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) };
}

// Speedometer: hijau saat kecepatan <= batas aktif, merah saat melebihi batas aktif (datar atau menurun).
// speed null (alat terputus) -> jarum di nol, angka "—", warna abu-abu.
export default function Speedometer({ speed, limit, limitNote, connected }) {
  const max = gaugeMax(limit);
  const hasSpeed = connected && typeof speed === 'number';
  const hasLimit = typeof limit === 'number' && limit > 0;
  const current = hasSpeed ? Math.min(Math.max(speed, 0), max) : 0;
  const overspeed = hasSpeed && hasLimit && speed > limit;
  const color = !hasSpeed ? COLOR_IDLE : overspeed ? COLOR_OVERSPEED : COLOR_NORMAL;

  const valueToDeg = (val) => START_DEG - (val / max) * SWEEP;
  const arcPath = (startVal, endVal, radius) => {
    const sDeg = valueToDeg(startVal);
    const eDeg = valueToDeg(endVal);
    const s = toXY(sDeg, radius);
    const e = toXY(eDeg, radius);
    const large = sDeg - eDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
  };

  const ticks = useMemo(() => {
    const items = [];
    for (let v = 0; v <= max; v += 10) {
      const deg = START_DEG - (v / max) * SWEEP;
      const major = v % 20 === 0;
      items.push({
        v,
        major,
        over: hasLimit && v > limit,
        inner: toXY(deg, major ? 62 : 67),
        outer: toXY(deg, 72),
        text: toXY(deg, 52),
      });
    }
    return items;
  }, [max, hasLimit, limit]);

  const limInner = hasLimit ? toXY(valueToDeg(limit), 58) : null;
  const limOuter = hasLimit ? toXY(valueToDeg(limit), 88) : null;
  const needleRotation = 90 - valueToDeg(current);
  const label = hasSpeed
    ? `Speedometer ${formatNumber(speed, 2)} kilometer per jam${hasLimit ? `, batas ${formatNumber(limit, 2)}` : ''}`
    : 'Speedometer tidak ada data';

  return (
    <div className="flex flex-col items-center" data-testid="speedometer" data-state={!hasSpeed ? 'idle' : overspeed ? 'overspeed' : 'normal'}>
      <svg viewBox="0 0 200 170" className="w-full max-w-[280px]" role="img" aria-label={label}>
        <path d={arcPath(0, max, RADIUS)} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" strokeLinecap="round" />
        {current > 0.5 && (
          <path d={arcPath(0, current, RADIUS)} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            style={{ transition: 'stroke 0.3s ease' }} />
        )}

        {ticks.map(({ v, major, over, inner, outer, text }) => (
          <g key={v}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke={over ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.25)'}
              strokeWidth={major ? 2 : 1} />
            {major && (
              <text x={text.x} y={text.y}
                fill={over ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.5)'}
                fontSize="9" fontFamily="monospace" fontWeight="600"
                textAnchor="middle" dominantBaseline="middle">
                {v}
              </text>
            )}
          </g>
        ))}

        {hasLimit && (
          <line x1={limInner.x} y1={limInner.y} x2={limOuter.x} y2={limOuter.y}
            stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />
        )}

        <g style={{
          transform: `rotate(${needleRotation}deg)`,
          transformOrigin: `${CX}px ${CY}px`,
          transition: 'transform 0.3s ease-out',
        }}>
          <polygon points={`${CX},${CY - 68} ${CX - 4},${CY} ${CX + 4},${CY}`}
            fill={color} style={{ transition: 'fill 0.3s ease' }} />
          <circle cx={CX} cy={CY} r="7" fill={color} style={{ transition: 'fill 0.3s ease' }} />
          <circle cx={CX} cy={CY} r="3.5" fill="#0a0a0f" />
        </g>
      </svg>

      <div className="text-center -mt-1">
        <span className={`text-4xl font-bold font-mono transition-colors duration-300 ${
          overspeed ? 'text-red-500' : hasSpeed ? 'text-white' : 'text-gray-600'
        }`}>
          {hasSpeed ? formatNumber(speed, 2) : '—'}
        </span>
        <span className="text-sm text-gray-500 ml-1">km/jam</span>
      </div>

      <div className="mt-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-center">
        {hasLimit ? (
          <>
            <span className="text-xs text-gray-400">Batas: </span>
            <span className="text-xs font-bold text-red-400">{formatNumber(limit, 2)} km/jam</span>
          </>
        ) : (
          <span className="text-xs text-gray-400">Batas belum diatur</span>
        )}
      </div>
      {limitNote && <p className="text-[11px] text-gray-600 mt-1.5 text-center">{limitNote}</p>}
    </div>
  );
}