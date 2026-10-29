import { useState } from 'react';
import { Download, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import { formatDateTime, formatDurationMs } from '../../utils/behaviorLogic';
import { sessionDurationMs } from '../../utils/vehicleLogic';
import EvaluationChart from './EvaluationChart';
import LogTable from './LogTable';

const STATUS_STYLE = {
  active: { dot: 'bg-green-400 animate-pulse', chip: 'bg-green-500/10 text-green-400' },
  unclosed: { dot: 'bg-yellow-500', chip: 'bg-yellow-500/10 text-yellow-400' },
  closed: { dot: 'bg-gray-600', chip: 'bg-white/5 text-gray-400' },
};

function Count({ label, value, activeClass }) {
  return (
    <span className={value > 0 ? activeClass : 'text-gray-600'}>
      {label} <span className="font-semibold">{value}</span>
    </span>
  );
}

// Satu sesi perjalanan (atau kelompok "Di luar sesi"): ringkasan, grafik evaluasi, dan tabel baris sesi tersebut
// sesuai filter aktif. Tabel diurutkan terbaru dulu.
export default function SessionCard({ group, defaultOpen = false, serverNow, onExport }) {
  const [open, setOpen] = useState(defaultOpen);
  const { session, rows, counts } = group;
  const style = session ? STATUS_STYLE[session.status] || STATUS_STYLE.closed : null;

  return (
    <div className="bg-dark-secondary rounded-2xl border border-white/[0.06] overflow-hidden transition-colors hover:border-white/10"
      data-testid="session-card" data-key={group.key === null ? '' : group.key} data-open={open ? 'true' : 'false'}>
      <div className="flex items-center">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open}
          className="flex-1 min-w-0 flex items-center gap-3.5 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${style ? style.dot : 'bg-gray-700'}`} />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white truncate" data-testid="session-label">{group.label}</span>
              {session && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${style.chip}`} data-testid="session-status">
                  {session.statusLabel}
                </span>
              )}
            </span>
            {group.owner && (
              <span className="block text-xs text-gray-400 mt-0.5 truncate" data-testid="session-owner">{group.owner}</span>
            )}
            {session ? (
              <span className="flex items-center gap-3 mt-1 flex-wrap">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(session.meta.startTime)}
                </span>
                <span className="text-xs text-gray-600" data-testid="session-duration">
                  {formatDurationMs(sessionDurationMs(session, serverNow()))}
                </span>
              </span>
            ) : (
              <span className="block text-xs text-gray-600 mt-1">Baris yang waktunya tidak berada dalam sesi yang dimuat</span>
            )}
            <span className="flex items-center gap-3 mt-2 text-xs flex-wrap" data-testid="session-counts">
              <Count label="Overspeed" value={counts.overspeed} activeClass="text-orange-400" />
              <Count label="Forced Brake" value={counts.forcedBrake} activeClass="text-red-400" />
              <Count label="Rekaman" value={counts.records} activeClass="text-gray-300" />
            </span>
          </span>
          {open ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </button>
        <button type="button" onClick={() => onExport(group)} data-testid="session-export"
          className="mr-4 p-2 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold transition-colors flex-shrink-0"
          title="Export Excel sesi ini (sesuai filter aktif)" aria-label={`Export Excel ${group.label}`}>
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

      {open && (
        <div className="border-t border-white/[0.04] bg-dark-primary/20">
          <div className="p-5 pb-3">
            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Grafik Evaluasi</h5>
            <div className="bg-dark-primary/40 rounded-xl p-3">
              <EvaluationChart rows={rows} heightClass="h-52" />
            </div>
          </div>
          <div className="px-5 pb-5">
            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">Data Sesi ({rows.length})</h5>
            <div className="rounded-xl border border-white/[0.05] overflow-hidden">
              <LogTable rows={rows} scrollClass="max-h-96" testId="session-table"
                emptyTitle="Belum ada data pada sesi ini" emptyHint="Rekaman berkala dan event sesi ini akan muncul di sini." />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}