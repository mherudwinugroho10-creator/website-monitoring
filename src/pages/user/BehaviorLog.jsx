import { useState, useMemo } from 'react';
import {
  Download, Filter, ChevronDown, Activity, Gauge, Shield, History,
  Loader2, AlertCircle, Wifi, WifiOff, Info, TrendingUp,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useVehicle } from '../../context/VehicleContext';
import { EVENTS_LIMIT, SESSIONS_LIMIT, sessionDurationMs } from '../../utils/vehicleLogic';
import {
  TYPE_FILTER_OPTIONS, buildLogRows, filterRows, isFilterActive, summarizeRows, groupRowsBySession,
  buildExportInfo, exportFileName, formatDurationMs, UNASSIGNED_LABEL,
} from '../../utils/behaviorLogic';
import { writeBehaviorLogWorkbook } from '../../utils/exportExcel';
import NoVehicleNotice from '../../components/common/NoVehicleNotice';
import LogTable from '../../components/behavior/LogTable';
import SessionCard from '../../components/behavior/SessionCard';
import EvaluationChart from '../../components/behavior/EvaluationChart';

const PAGE_SIZE = 20;

function StatCard({ icon: Icon, label, value, color, bg, testId }) {
  return (
    <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5" data-testid={testId}>
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className={`text-2xl font-bold font-mono ${color}`} data-testid={`${testId}-value`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

function TabButton({ active, onClick, icon: Icon, children, count, testId }) {
  return (
    <button type="button" role="tab" aria-selected={active} onClick={onClick} data-testid={testId}
      className={`px-5 py-2.5 text-sm font-medium rounded-t-xl border border-b-0 transition-all flex items-center gap-2 whitespace-nowrap ${
        active ? 'bg-dark-secondary border-white/10 text-white' : 'border-transparent text-gray-500 hover:text-white'
      }`}>
      <Icon className="w-4 h-4" />
      {children}
      <span className={`px-1.5 py-0.5 text-xs rounded-full ${active ? 'bg-gold/20 text-gold' : 'bg-white/5 text-gray-400'}`}>{count}</span>
    </button>
  );
}

export default function BehaviorLog() {
  const { userData } = useAuth();
  const { hasVehicle, vehicleId, loaded, dataError, events, sessions, isConnected, serverNow } = useVehicle();

  const [tab, setTab] = useState('all'); // 'all' = Gabungan, 'sessions' = Per Sesi
  const [type, setType] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const filter = useMemo(() => ({ type, from, to }), [type, from, to]);
  const filtering = !!isFilterActive(filter);

  const allRows = useMemo(() => buildLogRows(events, sessions), [events, sessions]);
  const { rows: filtered, rangeError } = useMemo(() => filterRows(allRows, filter), [allRows, filter]);
  const summary = useMemo(() => summarizeRows(filtered), [filtered]);
  const groups = useMemo(() => groupRowsBySession(filtered, sessions, { hideEmpty: filtering }), [filtered, sessions, filtering]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const sessionGroupCount = groups.filter((g) => g.session !== null).length;

  const vehicleLabel = [userData?.vehicleName, userData?.vehiclePlate].filter(Boolean).join(' · ');

  function changeFilter(setter, value) {
    setter(value);
    setPage(1);
  }

  function resetFilters() {
    setType('all');
    setFrom('');
    setTo('');
    setPage(1);
  }

  function runExport({ rows, scope, session, sessionKey }) {
    if (rangeError) {
      toast.error(rangeError);
      return;
    }
    if (rows.length === 0) {
      toast.error('Tidak ada data untuk diekspor.');
      return;
    }
    try {
      const exportedAt = Date.now();
      writeBehaviorLogWorkbook({
        rows,
        fileName: exportFileName({ vehicleId, sessionKey, exportedAt }),
        info: buildExportInfo({
          driverName: userData?.name,
          vehicleLabel,
          scope,
          filter,
          rowCount: rows.length,
          exportedAt,
          session,
          sessionDurationText: session ? formatDurationMs(sessionDurationMs(session, serverNow())) : undefined,
        }),
      });
      toast.success(`${rows.length} baris berhasil diekspor ke Excel.`);
    } catch (err) {
      toast.error('Gagal ekspor: ' + err.message);
    }
  }

  function exportAll() {
    runExport({ rows: filtered, scope: tab === 'sessions' ? 'Seluruh sesi' : 'Gabungan' });
  }

  function exportSession(group) {
    runExport({
      rows: group.rows,
      scope: group.session ? 'Satu sesi' : UNASSIGNED_LABEL,
      session: group.session || undefined,
      sessionKey: group.key || 'di_luar_sesi',
    });
  }

  const noDataAtAll = loaded && allRows.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">Behavior Log</h1>
            {hasVehicle && loaded && (
              <span data-testid="bl-connection"
                className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${
                  isConnected ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                {isConnected ? 'Perangkat terhubung' : 'Perangkat terputus'}
              </span>
            )}
          </div>
          <p className="text-gray-400 mt-1">{vehicleLabel ? `${vehicleLabel} · ` : ''}Rekaman perilaku berkendara dan kejadian bahaya kendaraan.</p>
        </div>
        {hasVehicle && (
          <div className="flex items-center gap-3 flex-wrap sm:flex-shrink-0">
            <button type="button" onClick={() => setShowFilters((v) => !v)} data-testid="bl-filter-toggle" aria-expanded={showFilters}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                filtering ? 'bg-gold/10 border-gold/30 text-gold' : 'bg-dark-secondary border-white/10 text-gray-300 hover:text-white'}`}>
              <Filter className="w-4 h-4" />
              Filter{filtering ? ' (aktif)' : ''}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button type="button" onClick={exportAll} data-testid="bl-export"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold-dark text-dark-primary font-semibold rounded-xl text-sm transition-all">
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        )}
      </div>

      {!hasVehicle ? (
        <NoVehicleNotice />
      ) : (
        <>
          {dataError && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4" role="alert">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-300">{dataError}</p>
            </div>
          )}

          {showFilters && (
            <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5" data-testid="bl-filter-panel">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="bl-type" className="block text-xs font-medium text-gray-500 mb-2">Tipe Data</label>
                  <select id="bl-type" value={type} onChange={(e) => changeFilter(setType, e.target.value)} data-testid="bl-filter-type"
                    className="w-full px-3 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold">
                    {TYPE_FILTER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="bl-from" className="block text-xs font-medium text-gray-500 mb-2">Dari Tanggal</label>
                  <input id="bl-from" type="date" value={from} max={to || undefined} onChange={(e) => changeFilter(setFrom, e.target.value)} data-testid="bl-filter-from"
                    className="w-full px-3 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold [color-scheme:dark]" />
                </div>
                <div>
                  <label htmlFor="bl-to" className="block text-xs font-medium text-gray-500 mb-2">Sampai Tanggal</label>
                  <input id="bl-to" type="date" value={to} min={from || undefined} onChange={(e) => changeFilter(setTo, e.target.value)} data-testid="bl-filter-to"
                    className="w-full px-3 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold [color-scheme:dark]" />
                </div>
                <div className="flex items-end">
                  <button type="button" onClick={resetFilters} disabled={!filtering} data-testid="bl-filter-reset"
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                    Reset Filter
                  </button>
                </div>
              </div>
              {rangeError && (
                <p className="mt-3 text-xs text-red-400" role="alert" data-testid="bl-range-error">{rangeError}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard testId="bl-card-total" icon={Activity} label="Total Event" value={loaded ? summary.total : '—'} color="text-white" bg="bg-white/5" />
            <StatCard testId="bl-card-overspeed" icon={Gauge} label="Overspeed" value={loaded ? summary.overspeed : '—'} color="text-orange-400" bg="bg-orange-500/10" />
            <StatCard testId="bl-card-forced" icon={Shield} label="Forced Brake" value={loaded ? summary.forcedBrake : '—'} color="text-red-400" bg="bg-red-500/10" />
          </div>

          <div className="flex gap-2 border-b border-white/[0.06] overflow-x-auto" role="tablist">
            <TabButton testId="bl-tab-all" active={tab === 'all'} onClick={() => setTab('all')} icon={Activity} count={filtered.length}>Gabungan</TabButton>
            <TabButton testId="bl-tab-sessions" active={tab === 'sessions'} onClick={() => setTab('sessions')} icon={History} count={sessionGroupCount}>Per Sesi</TabButton>
          </div>

          {!loaded ? (
            <div className="bg-dark-secondary rounded-2xl border border-white/5 py-16 flex flex-col items-center gap-3" data-testid="bl-loading">
              <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
              <p className="text-sm text-gray-500">Memuat data Behavior Log…</p>
            </div>
          ) : tab === 'all' ? (
            <>
              <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6" data-testid="bl-chart-panel">
                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gold" />
                  Grafik Evaluasi
                </h3>
                <EvaluationChart rows={filtered} heightClass="h-60" />
              </div>

              <div className="bg-dark-secondary rounded-2xl border border-white/5 overflow-hidden">
                <LogTable rows={pageRows} testId="log-table"
                  emptyTitle={rangeError ? 'Rentang tanggal tidak valid' : noDataAtAll ? 'Belum ada data Behavior Log' : 'Tidak ada data sesuai filter'}
                  emptyHint={rangeError ? rangeError : noDataAtAll ? 'Data muncul otomatis setelah perangkat IoT mengirim rekaman berkala dan event.' : 'Ubah atau reset filter untuk melihat data lain.'} />
                {filtered.length > PAGE_SIZE && (
                  <div className="px-5 py-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-sm text-gray-500" data-testid="bl-page-info">
                      {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} dari {filtered.length}
                    </span>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1} data-testid="bl-prev"
                        className="px-4 py-2 bg-dark-tertiary border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                        Sebelumnya
                      </button>
                      <span className="text-sm text-gray-400 px-2" data-testid="bl-page-number">{safePage} / {totalPages}</span>
                      <button type="button" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages} data-testid="bl-next"
                        className="px-4 py-2 bg-dark-tertiary border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                        Selanjutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="space-y-3" data-testid="bl-sessions">
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Riwayat Sesi</h3>
              {rangeError ? (
                <div className="bg-dark-secondary rounded-2xl border border-white/5 py-14 text-center" data-testid="bl-empty">
                  <p className="text-sm text-gray-400">Rentang tanggal tidak valid</p>
                  <p className="text-xs text-gray-600 mt-1">{rangeError}</p>
                </div>
              ) : groups.length === 0 ? (
                <div className="bg-dark-secondary rounded-2xl border border-white/5 py-14 flex flex-col items-center gap-3" data-testid="bl-empty">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                    <History className="w-6 h-6 text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-400">{noDataAtAll ? 'Belum ada riwayat sesi tercatat' : 'Tidak ada sesi sesuai filter'}</p>
                  <p className="text-xs text-gray-600">
                    {noDataAtAll ? 'Sesi muncul otomatis setelah perangkat IoT memulai perjalanan.' : 'Ubah atau reset filter untuk melihat sesi lain.'}
                  </p>
                </div>
              ) : (
                groups.map((group, index) => (
                  <SessionCard key={group.key === null ? '__none__' : group.key} group={group} defaultOpen={index === 0}
                    serverNow={serverNow} onExport={exportSession} />
                ))
              )}
            </div>
          )}

          <p className="flex items-start gap-2 text-xs text-gray-600" data-testid="bl-limit-note">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Menampilkan hingga {EVENTS_LIMIT} event dan {SESSIONS_LIMIT} sesi terbaru. Tampilan diperbarui otomatis saat perangkat mengirim data baru.
          </p>
        </>
      )}
    </div>
  );
}