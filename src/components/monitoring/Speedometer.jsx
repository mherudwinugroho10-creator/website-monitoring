import { useMemo } from 'react';

const CX = 100;
const CY = 105;
const RADIUS = 80;
const MAX_GAUGE = 120;
const START_DEG = 225;
const SWEEP = 270;

function valueToDeg(val) {
  return START_DEG - (val / MAX_GAUGE) * SWEEP;
}

function toXY(angleDeg, radius) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + radius * Math.cos(rad),
    y: CY - radius * Math.sin(rad),
  };
}

function arcPath(startVal, endVal, radius) {
  const sDeg = valueToDeg(startVal);
  const eDeg = valueToDeg(endVal);
  const s = toXY(sDeg, radius);
  const e = toXY(eDeg, radius);
  const sweepAngle = sDeg - eDeg;
  const large = sweepAngle > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${large} 1 ${e.x} ${e.y}`;
}

export default function Speedometer({ speed, maxSpeed }) {
  const current = Math.min(Math.max(speed || 0, 0), MAX_GAUGE);
  const limit = maxSpeed || 60;

  const isOverspeed = current > limit;
  const isWarning = current > limit * 0.8;
  const color = isOverspeed ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e';

  const needleRotation = 90 - valueToDeg(current);

  const ticks = useMemo(() => {
    const items = [];
    for (let v = 0; v <= MAX_GAUGE; v += 10) {
      const deg = valueToDeg(v);
      const isMajor = v % 20 === 0;
      const overLimit = v > limit;
      const inner = toXY(deg, isMajor ? 62 : 67);
      const outer = toXY(deg, 72);
      const text = toXY(deg, 52);
      items.push({ v, isMajor, overLimit, inner, outer, text });
    }
    return items;
  }, [limit]);

  const limInner = toXY(valueToDeg(limit), 58);
  const limOuter = toXY(valueToDeg(limit), 88);
  const bgArcD = arcPath(0, MAX_GAUGE, RADIUS);
  const speedArcD = current > 0.5 ? arcPath(0, current, RADIUS) : '';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 145" className="w-full max-w-[280px]">

        {/* Background arc */}
        <path d={bgArcD} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" strokeLinecap="round" />

        {/* Speed arc */}
        {speedArcD && (
          <path d={speedArcD} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
            style={{ transition: 'stroke 0.3s ease' }} />
        )}

        {/* Ticks & numbers */}
        {ticks.map(({ v, isMajor, overLimit, inner, outer, text }) => (
          <g key={v}>
            <line x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y}
              stroke={overLimit ? 'rgba(239,68,68,0.5)' : 'rgba(255,255,255,0.25)'}
              strokeWidth={isMajor ? 2 : 1} />
            <text x={text.x} y={text.y}
              fill={overLimit ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.5)'}
              fontSize={isMajor ? 9 : 7.5} fontFamily="monospace"
              fontWeight={isMajor ? 600 : 400}
              textAnchor="middle" dominantBaseline="middle">
              {v}
            </text>
          </g>
        ))}

        {/* Limit line */}
        <line x1={limInner.x} y1={limInner.y} x2={limOuter.x} y2={limOuter.y}
          stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" />

        {/* Needle */}
        <g style={{
          transform: `rotate(${needleRotation}deg)`,
          transformOrigin: `${CX}px ${CY}px`,
          transition: 'transform 0.3s ease-out',
        }}>
          <polygon
            points={`${CX},${CY - 68} ${CX - 4},${CY} ${CX + 4},${CY}`}
            fill={color} style={{ transition: 'fill 0.3s ease' }} />
          <circle cx={CX} cy={CY} r="7" fill={color} style={{ transition: 'fill 0.3s ease' }} />
          <circle cx={CX} cy={CY} r="3.5" fill="#0a0a0f" />
        </g>
      </svg>

      {/* Digital speed */}
      <div className="text-center -mt-1">
        <span className={`text-4xl font-bold font-mono transition-colors duration-300 ${isOverspeed ? 'text-red-500' : 'text-white'}`}>
          {Math.round(current)}
        </span>
        <span className="text-sm text-gray-500 ml-1">km/h</span>
      </div>

      <div className="mt-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
        <span className="text-xs text-gray-400">Batas: </span>
        <span className="text-xs font-bold text-red-400">{limit} km/h</span>
      </div>
    </div>
  );
}