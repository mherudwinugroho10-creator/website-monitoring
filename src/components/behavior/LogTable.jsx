import { Activity, Gauge, Shield } from 'lucide-react';
import { KIND_LABEL, BRAKE_LABEL, formatDateTime } from '../../utils/behaviorLogic';
import { formatNumber } from '../../utils/vehicleLogic';

const KIND_STYLE = {
  record: { icon: Activity, cls: 'bg-white/5 text-gray-300' },
  overspeed: { icon: Gauge, cls: 'bg-orange-500/10 text-orange-400' },
  forced_brake: { icon: Shield, cls: 'bg-red-500/10 text-red-400' },
};

const BRAKE_STYLE = {
  normal: 'text-green-400',
  exhaust: 'text-gold',
  forced: 'text-red-400',
};

const HEADERS = ['Waktu', 'Tipe', 'Keterangan', 'Kecepatan', 'Kemiringan', 'Status Pengereman'];

function Value({ value, unit }) {
  if (value === null || value === undefined) return <span className="text-sm text-gray-600">—</span>;
  return (
    <>
      <span className="text-sm font-semibold text-white">{formatNumber(value, 2)}</span>
      {' '}
      <span className="text-xs text-gray-500">{unit}</span>
    </>
  );
}

// Tabel gabungan rekaman berkala dan event bahaya. Baris sudah terurut; paginasi/gulir diatur pemanggil.
export default function LogTable({ rows, emptyTitle, emptyHint, scrollClass = '', testId = 'log-table' }) {
  return (
    <div className={`overflow-auto ${scrollClass}`} data-testid={testId}>
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/5">
            {HEADERS.map((h) => (
              <th key={h} className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap bg-dark-secondary sticky top-0 z-[1]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={HEADERS.length} className="px-5 py-14 text-center" data-testid="log-empty">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-400">{emptyTitle}</p>
                  {emptyHint && <p className="text-xs text-gray-600 max-w-sm">{emptyHint}</p>}
                </div>
              </td>
            </tr>
          ) : (
            rows.map((r) => {
              const style = KIND_STYLE[r.kind] || KIND_STYLE.record;
              const Icon = style.icon;
              return (
                <tr key={r.id} data-testid="log-row" data-kind={r.kind} data-ts={r.timestamp} className="hover:bg-white/[0.02] transition-colors">
                  <td data-col="time" className="px-4 py-3.5 text-sm text-gray-400 whitespace-nowrap">{formatDateTime(r.timestamp)}</td>
                  <td data-col="type" className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap ${style.cls}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {KIND_LABEL[r.kind] || r.kind}
                    </span>
                  </td>
                  <td data-col="desc" className="px-4 py-3.5 min-w-[220px] max-w-[280px]" title={r.description}>
                    <p className="text-sm text-gray-300 leading-snug break-words">{r.descriptionMain}</p>
                    {r.descriptionDetail && <p className="text-xs text-gray-500 mt-0.5 leading-snug break-words">{r.descriptionDetail}</p>}
                  </td>
                  <td data-col="speed" className="px-4 py-3.5 whitespace-nowrap"><Value value={r.speed} unit="km/jam" /></td>
                  <td data-col="tilt" className="px-4 py-3.5 whitespace-nowrap"><Value value={r.tilt} unit="%" /></td>
                  <td data-col="brake" className={`px-4 py-3.5 text-sm font-medium whitespace-nowrap ${BRAKE_STYLE[r.brake] || 'text-gray-400'}`}>
                    {BRAKE_LABEL[r.brake] || '—'}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}