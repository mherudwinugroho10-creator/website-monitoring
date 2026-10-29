import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  Users, Gauge, Shield, Search, Download, Filter, ChevronDown, ChevronUp, ChevronsUpDown, Eye, X,
  Loader2, AlertCircle, History, Info, Truck, ListChecks,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  useServerClock, useRerenderAt, useDirectory, useFleetRecentEvents, useFleetSessions, useFleetLive,
} from '../../hooks/useAdminData';
import { sessionDurationMs, isLiveFresh, SESSIONS_LIMIT } from '../../utils/vehicleLogic';
import { formatDurationMs, buildExportInfo, exportFileName, UNASSIGNED_LABEL } from '../../utils/behaviorLogic';
import {
  PERFORMANCE_EVENTS_LIMIT, PERFORMANCE_TYPE_OPTIONS, driverVehicleIds, buildPerformanceRows, sortPerformanceRows,
  truncatedVehicles, performanceExportInfo, performanceFileName, buildAdminSessionGroups, nextConnectionCheckMs,
} from '../../utils/adminLogic';
import { writeBehaviorLogWorkbook } from '../../utils/exportExcel';
import { writePerformanceWorkbook } from '../../utils/exportAdmin';
import SessionCard from '../../components/behavior/SessionCard';
import DriverDetailModal from '../../components/admin/DriverDetailModal';

const PAGE_SIZE = 15;
const SESSION_STEP = 10;
const NO_IDS = [];
const COLUMNS = [
  { key: 'name', label: 'Pengemudi', defaultDir: 'asc' },
  { key: 'vehicle', label: 'Kendaraan', defaultDir: 'asc' },
  { key: 'overspeed', label: 'Overspeed', defaultDir: 'desc', numeric: true },
  { key: 'forcedBrake', label: 'Forced Brake', defaultDir: 'desc', numeric: true },
  { key: 'total', label: 'Total', defaultDir: 'desc', numeric: true },
];

function StatCard({ icon: Icon, label, value, color, bg, testId }) {
  return (
    <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5" data-testid={testId}>
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className={`text-2xl font-bold font-mono ${value === null ? 'text-gray-600' : color}`} data-testid={`${testId}-value`}>{value === null ? '—' : value}</div>
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
      {count !== null && <span className={`px-1.5 py-0.5 text-xs rounded-full ${active ? 'bg-gold/20 text-gold' : 'bg-white/5 text-gray-400'}`}>{count}</span>}
    </button>
  );
}

function Banner({ tone = 'red', icon: Icon = AlertCircle, testId, children }) {
  const cls = tone === 'red'
    ? 'bg-red-500/10 border-red-500/30 text-red-300'
    : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-200/90';
  return (
    <div className={`flex items-start gap-3 border rounded-xl p-4 ${cls}`} role={tone === 'red' ? 'alert' : undefined} data-testid={testId}>
      <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
      <div className="text-sm min-w-0">{children}</div>
    </div>
  );
}

function CountCell({ row, value, failed, color }) {
  if (!row.hasVehicle) return <span className="text-gray-600">—</span>;
  if (failed) return <span className="text-yellow-500/80 text-xs">gagal</span>;
  if (!row.ready) return <Loader2 className="w-3.5 h-3.5 text-gray-600 animate-spin" aria-label="Memuat" />;
  if (value === null) return <span className="text-gray-600">—</span>;
  return <span className={`font-mono font-semibold ${value > 0 ? color : 'text-gray-500'}`}>{value}</span>;
}

function SortHeader({ col, sortKey, sortDir, onSort }) {
  const active = sortKey === col.key;
  const Icon = !active ? ChevronsUpDown : sortDir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <th scope="col" aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={`px-5 py-3.5 text-xs font-semibold uppercase tracking-wide ${col.numeric ? 'text-right' : 'text-left'}`}>
      <button type="button" onClick={() => onSort(col)} data-testid={`sort-${col.key}`}
        className={`inline-flex items-center gap-1 uppercase tracking-wide transition-colors ${active ? 'text-gold' : 'text-gray-500 hover:text-white'}`}>
        {col.label}<Icon className="w-3.5 h-3.5" />
      </button>
    </th>
  );
}

function DriverCell({ row }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-medium text-white truncate" data-testid="perf-name">
        {row.name || row.email}
        {row.status === 'inactive' && <span className="ml-1.5 text-xs font-normal text-gray-600">(nonaktif)</span>}
      </p>
      <p className="text-xs text-gray-500 truncate">{row.email}</p>
    </div>
  );
}

function VehicleCell({ row }) {
  if (!row.hasVehicle) return <span className="text-xs text-yellow-500/80">Belum ditetapkan</span>;
  return (
    <div className="min-w-0">
      <p className="text-sm text-gray-300 truncate">{row.vehicleName || row.vehicleId}</p>
      <p className="text-xs text-gray-500 truncate"><span className="font-mono">{row.vehicleId}</span>{row.vehiclePlate && ` · ${row.vehiclePlate}`}</p>
    </div>
  );
}

export default function DriverPerformance() {
  const { userData } = useAuth();
  const directory = useDirectory();
  const vehicleIds = useMemo(() => driverVehicleIds(directory.users), [directory.users]);

  const [tab, setTab] = useState('recap'); // 'recap' = Rekap Pelanggaran, 'sessions' = Riwayat Sesi
  const [search, setSearch] = useState('');
  const [type, setType] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortKey, setSortKey] = useState('total');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [detailUid, setDetailUid] = useState(null);
  const [sessionsShown, setSessionsShown] = useState(SESSION_STEP);

  const sessionsOn = tab === 'sessions';
  const recent = useFleetRecentEvents(vehicleIds);
  const sess = useFleetSessions(vehicleIds, sessionsOn);
  const live = useFleetLive(sessionsOn ? vehicleIds : NO_IDS, { settings: false });
  const { serverNow } = useServerClock();
  const nowMs = serverNow();
  useRerenderAt(sessionsOn ? nextConnectionCheckMs(live.liveById, nowMs) : null);

  const filter = useMemo(() => ({ search, type, from, to }), [search, type, from, to]);
  const filtering = type !== 'all' || !!from || !!to;
  const anyFilter = filtering || search.trim() !== '';

  // ── Rekap ───────────────────────────────────────────────
  const perf = useMemo(() => buildPerformanceRows(directory.users, recent.eventsById, filter), [directory.users, recent.eventsById, filter]);
  const failedIds = useMemo(() => new Set(recent.errors.map((e) => e.vehicleId)), [recent.errors]);
  const eventsLoaded = vehicleIds.every((id) => recent.loadedById[id]);
  const countsReady = directory.loaded && eventsLoaded;
  const sorted = useMemo(() => sortPerformanceRows(perf.rows, sortKey, sortDir), [perf.rows, sortKey, sortDir]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const truncated = useMemo(() => truncatedVehicles(recent.eventsById, from), [recent.eventsById, from]);
  const detailRow = detailUid ? perf.rows.find((r) => r.uid === detailUid) || null : null;

  const labelOfVehicle = (id) => {
    const d = directory.users.find((u) => u.vehicleId === id && u.role !== 'admin');
    return d ? (d.vehicleName || id) : id;
  };

  // ── Riwayat sesi ────────────────────────────────────────
  // Status koneksi tiap kendaraan (untuk status sesi Berlangsung / Belum ditutup), dihitung dengan jam server.
  const connectedKey = vehicleIds.map((id) => (live.liveById[id] && isLiveFresh(live.liveById[id], nowMs) ? '1' : '0')).join('');
  const sessionData = useMemo(() => {
    if (!sessionsOn) return { groups: [], rangeError: null, ready: true };
    const connectedByVehicle = {};
    vehicleIds.forEach((id, i) => { connectedByVehicle[id] = connectedKey[i] === '1'; });
    return buildAdminSessionGroups({
      users: directory.users, eventsByVehicle: recent.eventsById, sessionsByVehicle: sess.sessionsById,
      connectedByVehicle, filter: { search, from, to },
    });
  }, [sessionsOn, vehicleIds, connectedKey, directory.users, recent.eventsById, sess.sessionsById, search, from, to]);
  const sessionsLoaded = !sessionsOn || vehicleIds.every((id) => sess.loadedById[id]);
  const visibleGroups = sessionData.groups.slice(0, sessionsShown);

  function resetPaging() {
    setPage(1);
    setSessionsShown(SESSION_STEP);
  }
  function changeFilter(setter, value) {
    setter(value);
    resetPaging();
  }
  function resetFilters() {
    setSearch('');
    setType('all');
    setFrom('');
    setTo('');
    resetPaging();
  }
  function handleSort(col) {
    if (sortKey === col.key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(col.key); setSortDir(col.defaultDir); }
    setPage(1);
  }

  function exportRecap() {
    if (perf.rangeError) { toast.error(perf.rangeError); return; }
    if (!countsReady) { toast.error('Data masih dimuat. Coba lagi sebentar.'); return; }
    if (sorted.length === 0) { toast.error('Tidak ada data untuk diekspor.'); return; }
    try {
      const exportedAt = Date.now();
      writePerformanceWorkbook({
        rows: sorted,
        fileName: performanceFileName(exportedAt),
        info: performanceExportInfo({
          filter, rows: sorted, totals: perf.totals, exportedAt, adminName: userData && userData.name, truncatedIds: truncated, failedIds: recentErrorIds,
        }),
      });
      toast.success(`${sorted.length} pengemudi berhasil diekspor ke Excel.`);
    } catch (err) {
      console.error('[DriverPerformance] Gagal ekspor:', err);
      toast.error('Gagal ekspor: ' + err.message);
    }
  }

  function exportSession(group) {
    if (group.rows.length === 0) { toast.error('Tidak ada data untuk diekspor.'); return; }
    const owner = directory.users.find((u) => u.id === group.driverId);
    try {
      const exportedAt = Date.now();
      writeBehaviorLogWorkbook({
        rows: group.rows,
        fileName: exportFileName({ vehicleId: group.vehicleId, sessionKey: group.key || 'di_luar_sesi', exportedAt }),
        info: buildExportInfo({
          driverName: group.driverName,
          vehicleLabel: owner ? [owner.vehicleName, owner.vehiclePlate].filter(Boolean).join(' · ') || owner.vehicleId : group.vehicleId,
          scope: group.session ? 'Satu sesi' : UNASSIGNED_LABEL,
          filter: { type: 'all', from: '', to: '' },
          rowCount: group.rows.length,
          exportedAt,
          session: group.session || undefined,
          sessionDurationText: group.session ? formatDurationMs(sessionDurationMs(group.session, serverNow())) : undefined,
        }),
      });
      toast.success(`${group.rows.length} baris berhasil diekspor ke Excel.`);
    } catch (err) {
      console.error('[DriverPerformance] Gagal ekspor sesi:', err);
      toast.error('Gagal ekspor: ' + err.message);
    }
  }

  const cardValue = (v, excluded) => (countsReady && !perf.rangeError && !excluded ? v : null);
  const recapEmpty = directory.loaded && perf.driverCount === 0;
  const sessionErrorIds = [...new Set(sess.errors.map((e) => e.vehicleId))];
  const recentErrorIds = [...failedIds];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-white">Performa Pengemudi</h1>
          <p className="text-gray-400 mt-1">Rekap pelanggaran dan riwayat sesi seluruh pengemudi.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap sm:flex-shrink-0">
          <button type="button" onClick={() => setShowFilters((v) => !v)} data-testid="perf-filter-toggle" aria-expanded={showFilters}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
              filtering ? 'bg-gold/10 border-gold/30 text-gold' : 'bg-dark-secondary border-white/10 text-gray-300 hover:text-white'}`}>
            <Filter className="w-4 h-4" />
            Filter{filtering ? ' (aktif)' : ''}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          {tab === 'recap' && (
            <button type="button" onClick={exportRecap} data-testid="perf-export"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold-dark text-dark-primary font-semibold rounded-xl text-sm transition-all">
              <Download className="w-4 h-4" /> Export Semua
            </button>
          )}
        </div>
      </div>

      {directory.error && <Banner testId="directory-error">{directory.error}</Banner>}

      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="search" value={search} onChange={(e) => changeFilter(setSearch, e.target.value)} data-testid="perf-search"
            placeholder="Cari nama, email, kendaraan, atau plat…" aria-label="Cari pengemudi"
            className="w-full pl-11 pr-10 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-gold/50 focus:ring-1 focus:ring-gold/50 transition-all [&::-webkit-search-cancel-button]:hidden" />
          {search && (
            <button type="button" onClick={() => changeFilter(setSearch, '')} aria-label="Hapus pencarian"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-gray-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-white/5" data-testid="perf-filter-panel">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="perf-type" className="block text-xs font-medium text-gray-500 mb-2">Tipe Pelanggaran</label>
                <select id="perf-type" value={type} onChange={(e) => changeFilter(setType, e.target.value)} disabled={tab !== 'recap'} data-testid="perf-filter-type"
                  className="w-full px-3 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold disabled:opacity-50">
                  {PERFORMANCE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                {tab !== 'recap' && <p className="text-[11px] text-gray-600 mt-1.5">Berlaku pada Rekap Pelanggaran.</p>}
              </div>
              <div>
                <label htmlFor="perf-from" className="block text-xs font-medium text-gray-500 mb-2">{tab === 'recap' ? 'Dari Tanggal' : 'Sesi Mulai Dari'}</label>
                <input id="perf-from" type="date" value={from} max={to || undefined} onChange={(e) => changeFilter(setFrom, e.target.value)} data-testid="perf-filter-from"
                  className="w-full px-3 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold [color-scheme:dark]" />
              </div>
              <div>
                <label htmlFor="perf-to" className="block text-xs font-medium text-gray-500 mb-2">{tab === 'recap' ? 'Sampai Tanggal' : 'Sesi Mulai Sampai'}</label>
                <input id="perf-to" type="date" value={to} min={from || undefined} onChange={(e) => changeFilter(setTo, e.target.value)} data-testid="perf-filter-to"
                  className="w-full px-3 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold [color-scheme:dark]" />
              </div>
              <div className="flex items-end">
                <button type="button" onClick={resetFilters} disabled={!anyFilter} data-testid="perf-filter-reset"
                  className="w-full px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                  Reset Filter
                </button>
              </div>
            </div>
            {perf.rangeError && <p className="mt-3 text-xs text-red-400" role="alert" data-testid="perf-range-error">{perf.rangeError}</p>}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard testId="perf-card-drivers" icon={Users} label="Pengemudi" value={directory.loaded && !perf.rangeError ? perf.totals.drivers : null} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard testId="perf-card-overspeed" icon={Gauge} label="Total Overspeed" value={cardValue(perf.totals.overspeed, type === 'forced_brake')} color="text-orange-400" bg="bg-orange-500/10" />
        <StatCard testId="perf-card-forced" icon={Shield} label="Total Forced Brake" value={cardValue(perf.totals.forcedBrake, type === 'overspeed')} color="text-red-400" bg="bg-red-500/10" />
      </div>

      <div className="flex gap-2 border-b border-white/[0.06] overflow-x-auto" role="tablist">
        <TabButton testId="perf-tab-recap" active={tab === 'recap'} onClick={() => { setTab('recap'); setSessionsShown(SESSION_STEP); }} icon={ListChecks} count={directory.loaded ? sorted.length : null}>Rekap Pelanggaran</TabButton>
        <TabButton testId="perf-tab-sessions" active={tab === 'sessions'} onClick={() => setTab('sessions')} icon={History} count={sessionsOn && sessionsLoaded && !sessionData.rangeError ? sessionData.groups.length : null}>Riwayat Sesi</TabButton>
      </div>

      {recentErrorIds.length > 0 && (
        <Banner testId="perf-read-error">Gagal membaca event untuk: {recentErrorIds.map(labelOfVehicle).join(', ')}. Angka pengemudi terkait belum lengkap.</Banner>
      )}

      {tab === 'recap' ? (
        <div className="bg-dark-secondary rounded-2xl border border-white/5 overflow-hidden" data-testid="perf-recap">
          {!directory.loaded ? (
            <div className="py-16 flex flex-col items-center gap-3" data-testid="perf-loading">
              <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
              <p className="text-sm text-gray-500">Memuat data pengemudi…</p>
            </div>
          ) : perf.rangeError ? (
            <div className="py-14 text-center" data-testid="perf-empty">
              <p className="text-sm text-gray-400">Rentang tanggal tidak valid</p>
              <p className="text-xs text-gray-600 mt-1">{perf.rangeError}</p>
            </div>
          ) : recapEmpty ? (
            <div className="py-14 flex flex-col items-center gap-3 text-center px-4" data-testid="perf-empty">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center"><Users className="w-6 h-6 text-gray-600" /></div>
              <p className="text-sm text-gray-400">Belum ada pengemudi terdaftar</p>
              <p className="text-xs text-gray-600">Tambahkan di <Link to="/admin/drivers" className="text-gold hover:underline">Kelola Pengemudi</Link>; rekap muncul setelah ia mendaftar.</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center px-4" data-testid="perf-empty">
              <p className="text-sm text-gray-400">Tidak ada pengemudi yang cocok dengan pencarian.</p>
            </div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full" data-testid="perf-table">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-12">No</th>
                      {COLUMNS.map((c) => <SortHeader key={c.key} col={c} sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />)}
                      <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {pageRows.map((r, i) => (
                      <tr key={r.key} data-testid="perf-row" data-uid={r.uid} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3.5 text-sm text-gray-500">{(safePage - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-5 py-3.5 max-w-[16rem]"><DriverCell row={r} /></td>
                        <td className="px-5 py-3.5 max-w-[14rem]"><VehicleCell row={r} /></td>
                        <td className="px-5 py-3.5 text-right" data-testid="perf-overspeed"><CountCell row={r} value={r.overspeed} failed={failedIds.has(r.vehicleId)} color="text-orange-400" /></td>
                        <td className="px-5 py-3.5 text-right" data-testid="perf-forced"><CountCell row={r} value={r.forcedBrake} failed={failedIds.has(r.vehicleId)} color="text-red-400" /></td>
                        <td className="px-5 py-3.5 text-right" data-testid="perf-total"><CountCell row={r} value={r.total} failed={failedIds.has(r.vehicleId)} color="text-white" /></td>
                        <td className="px-5 py-3.5 text-right">
                          <button type="button" onClick={() => setDetailUid(r.uid)} data-testid="perf-detail" aria-label={`Detail ${r.name || r.email}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-gray-300 hover:text-gold hover:border-gold/30 transition-colors">
                            <Eye className="w-3.5 h-3.5" /> Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden divide-y divide-white/[0.04]" data-testid="perf-cards">
                {pageRows.map((r) => (
                  <div key={r.key} data-testid="perf-card" data-uid={r.uid} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <DriverCell row={r} />
                      <button type="button" onClick={() => setDetailUid(r.uid)} aria-label={`Detail ${r.name || r.email}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 text-xs font-medium text-gray-300 flex-shrink-0">
                        <Eye className="w-3.5 h-3.5" /> Detail
                      </button>
                    </div>
                    <VehicleCell row={r} />
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: 'Overspeed', value: r.overspeed, color: 'text-orange-400' },
                        { label: 'Forced Brake', value: r.forcedBrake, color: 'text-red-400' },
                        { label: 'Total', value: r.total, color: 'text-white' },
                      ].map((c) => (
                        <div key={c.label} className="bg-dark-primary/40 rounded-xl py-2.5">
                          <div className="text-base"><CountCell row={r} value={c.value} failed={failedIds.has(r.vehicleId)} color={c.color} /></div>
                          <div className="text-[11px] text-gray-500 mt-0.5">{c.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {sorted.length > PAGE_SIZE && (
                <div className="px-5 py-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-sm text-gray-500" data-testid="perf-page-info">
                    {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sorted.length)} dari {sorted.length}
                  </span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setPage(Math.max(1, safePage - 1))} disabled={safePage === 1} data-testid="perf-prev"
                      className="px-4 py-2 bg-dark-tertiary border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">Sebelumnya</button>
                    <span className="text-sm text-gray-400 px-2" data-testid="perf-page-number">{safePage} / {totalPages}</span>
                    <button type="button" onClick={() => setPage(Math.min(totalPages, safePage + 1))} disabled={safePage === totalPages} data-testid="perf-next"
                      className="px-4 py-2 bg-dark-tertiary border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">Selanjutnya</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3" data-testid="perf-sessions">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Riwayat Sesi</h3>
          {sessionErrorIds.length > 0 && (
            <Banner testId="perf-sessions-error">Gagal membaca sesi untuk: {sessionErrorIds.map(labelOfVehicle).join(', ')}.</Banner>
          )}
          {!directory.loaded || !sessionsLoaded ? (
            <div className="bg-dark-secondary rounded-2xl border border-white/5 py-16 flex flex-col items-center gap-3" data-testid="perf-sessions-loading">
              <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
              <p className="text-sm text-gray-500">Memuat riwayat sesi…</p>
            </div>
          ) : sessionData.rangeError ? (
            <div className="bg-dark-secondary rounded-2xl border border-white/5 py-14 text-center" data-testid="perf-sessions-empty">
              <p className="text-sm text-gray-400">Rentang tanggal tidak valid</p>
              <p className="text-xs text-gray-600 mt-1">{sessionData.rangeError}</p>
            </div>
          ) : sessionData.groups.length === 0 ? (
            <div className="bg-dark-secondary rounded-2xl border border-white/5 py-14 flex flex-col items-center gap-3 text-center px-4" data-testid="perf-sessions-empty">
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                {vehicleIds.length === 0 ? <Truck className="w-6 h-6 text-gray-600" /> : <History className="w-6 h-6 text-gray-600" />}
              </div>
              <p className="text-sm text-gray-400">
                {vehicleIds.length === 0 ? 'Belum ada pengemudi dengan kendaraan' : anyFilter ? 'Tidak ada sesi sesuai filter' : 'Belum ada riwayat sesi tercatat'}
              </p>
              <p className="text-xs text-gray-600">
                {anyFilter ? 'Ubah atau reset filter untuk melihat sesi lain.' : 'Sesi muncul otomatis setelah perangkat IoT memulai perjalanan.'}
              </p>
            </div>
          ) : (
            <>
              {visibleGroups.map((group) => (
                <SessionCard key={group.uniqueKey} group={group} serverNow={serverNow} onExport={exportSession} />
              ))}
              {visibleGroups.length < sessionData.groups.length && (
                <div className="flex justify-center pt-1">
                  <button type="button" onClick={() => setSessionsShown((n) => n + SESSION_STEP)} data-testid="perf-sessions-more"
                    className="px-5 py-2.5 rounded-xl border border-white/10 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-all">
                    Tampilkan lebih banyak ({sessionData.groups.length - visibleGroups.length} lagi)
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      <p className="flex items-start gap-2 text-xs text-gray-600" data-testid="perf-limit-note">
        <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span>
          Rekap dihitung dari hingga {PERFORMANCE_EVENTS_LIMIT} event terbaru per kendaraan{sessionsOn ? ` dan ${SESSIONS_LIMIT} sesi terbaru per kendaraan` : ''}.
          {tab === 'sessions' && ' Tanggal pada tab ini menyaring waktu mulai sesi.'}
          {truncated.length > 0 && ` Batas tercapai pada: ${truncated.map(labelOfVehicle).join(', ')}; event yang lebih lama tidak ikut terhitung.`}
        </span>
      </p>

      {detailRow && (
        <DriverDetailModal key={detailRow.uid} row={detailRow} filter={filter} adminName={userData && userData.name}
          truncated={!!detailRow.vehicleId && truncated.includes(detailRow.vehicleId)} onClose={() => setDetailUid(null)} />
      )}
    </div>
  );
}