import { useState, useMemo } from 'react';
import {
  Download, Filter, ChevronDown, ChevronRight,
  AlertTriangle, Gauge, Mountain, Shield, Activity,
  Clock, TrendingUp, History,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { useVehicle } from '../../context/VehicleContext';
import * as XLSX from 'xlsx';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler);

// ── Helpers (tidak diubah dari versi sebelumnya) ────────────
function getTypeIcon(type) {
  return type === 'overspeed'    ? Gauge
    : type === 'forced_brake' ? Shield
    : type === 'steep_slope'  ? Mountain
    : AlertTriangle;
}

function getTypeLabel(type) {
  return type === 'overspeed'    ? 'Overspeed'
    : type === 'forced_brake' ? 'Forced Brake'
    : type === 'steep_slope'  ? 'Turunan Ekstrem'
    : type;
}

function getTypeColor(type) {
  return type === 'overspeed'    ? 'bg-orange-500/10 text-orange-400'
    : type === 'forced_brake' ? 'bg-red-500/10 text-red-400'
    : type === 'steep_slope'  ? 'bg-blue-500/10 text-blue-400'
    : 'bg-gray-500/10 text-gray-400';
}

function formatTs(ts) {
  if (!ts) return '-';
  const d = new Date(typeof ts === 'number' ? ts : Number(ts));
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatDuration(startTs, endTs) {
  if (!startTs) return '-';
  const end = endTs && endTs > 0 ? endTs : Date.now();
  const sec = Math.floor((end - startTs) / 1000);
  const m   = Math.floor(sec / 60);
  const s   = sec % 60;
  return `${m} mnt ${s} dtk`;
}

// ── Kartu ringkasan statistik ────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg }) {
  return (
    <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

// ── Kartu riwayat sesi ───────────────────────────────────────
function SessionCard({ session, driverName }) {
  const [open, setOpen] = useState(false);
  const { meta, events, behaviorLog } = session;

  const isActive    = !meta.endTime || meta.endTime === 0;
  const overspeed   = events.filter((e) => e.type === 'overspeed').length;
  const forcedBrake = events.filter((e) => e.type === 'forced_brake').length;
  const steepSlope  = events.filter((e) => e.type === 'steep_slope').length;

  const chartData = {
    labels: behaviorLog.map((b) => {
      const sec = b.elapsedSec || 0;
      return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
    }),
    datasets: [{
      label: 'Kecepatan',
      data: behaviorLog.map((b) => b.speed || 0),
      borderColor: '#fbbf24',
      backgroundColor: 'rgba(251,191,36,0.08)',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointRadius: 3,
      pointBackgroundColor: '#fbbf24',
    }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15,15,15,0.9)',
        titleColor: '#fff',
        bodyColor: '#fbbf24',
        callbacks: { label: (ctx) => ctx.parsed.y + ' km/jam' },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
      },
      y: {
        min: 0,
        grid: { color: 'rgba(255,255,255,0.03)' },
        ticks: { color: 'rgba(255,255,255,0.4)', font: { size: 10 } },
      },
    },
  };

  function exportSession() {
    try {
      const rows = [
        [`Pengemudi: ${driverName}`],
        [`Sesi: ${meta.label || session.key}`],
        [`Mulai: ${formatTs(meta.startTime)}`],
        [`Selesai: ${isActive ? 'Masih Aktif' : formatTs(meta.endTime)}`],
        [`Durasi: ${formatDuration(meta.startTime, meta.endTime)}`],
        [],
        ['=== EVENT ==='],
        ['Waktu', 'Tipe', 'Keterangan', 'Kecepatan (km/jam)', 'Kemiringan (°)'],
        ...events.map((e) => [
          formatTs(e.timestamp),
          getTypeLabel(e.type),
          e.message || '-',
          e.speed ?? '-',
          e.tilt  ?? '-',
        ]),
        [],
        ['=== BEHAVIOR LOG ==='],
        ['Waktu', 'Elapsed', 'Kecepatan (km/jam)', 'Kemiringan (°)', 'Forced Brake', 'Jumlah Event'],
        ...behaviorLog.map((b) => [
          formatTs(b.timestamp),
          `${Math.floor((b.elapsedSec||0)/60)}:${String((b.elapsedSec||0)%60).padStart(2,'0')}`,
          b.speed ?? '-',
          b.tilt  ?? '-',
          b.forcedBrake ? 'Ya' : 'Tidak',
          b.eventCount  || 0,
        ]),
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch:22 }, { wch:15 }, { wch:50 }, { wch:18 }, { wch:14 }, { wch:12 }];
      XLSX.utils.book_append_sheet(wb, ws, meta.label || session.key);
      XLSX.writeFile(wb, `sesi_${session.key}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Data sesi berhasil diekspor!');
    } catch (err) {
      toast.error('Gagal ekspor: ' + err.message);
    }
  }

  return (
    <div className="bg-dark-secondary rounded-2xl border border-white/[0.06] overflow-hidden transition-colors hover:border-white/10">
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3.5 min-w-0">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-white truncate">
                {meta.label || session.key}
              </span>
              {isActive && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                  Aktif
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTs(meta.startTime)}
              </span>
              <span className="text-xs text-gray-600">
                {formatDuration(meta.startTime, meta.endTime)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-xs font-medium">
            <span className={overspeed   > 0 ? 'text-orange-400' : 'text-gray-700'}>{overspeed}x OS</span>
            <span className={forcedBrake > 0 ? 'text-red-400'    : 'text-gray-700'}>{forcedBrake}x FB</span>
            <span className={steepSlope  > 0 ? 'text-blue-400'   : 'text-gray-700'}>{steepSlope}x SS</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); exportSession(); }}
            className="p-2 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold transition-colors"
            title="Export Excel sesi ini"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          {open
            ? <ChevronDown className="w-4 h-4 text-gray-400" />
            : <ChevronRight className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {open && (
        <div className="border-t border-white/[0.04] p-5 space-y-5 bg-dark-primary/20">
          <div>
            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" />
              Grafik Kecepatan
            </h5>
            {behaviorLog.length > 0 ? (
              <div className="h-40 bg-dark-primary/40 rounded-xl p-3">
                <Line data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="h-24 flex items-center justify-center bg-dark-primary/40 rounded-xl">
                <p className="text-xs text-gray-600">Belum ada data kecepatan untuk sesi ini</p>
              </div>
            )}
          </div>

          <div>
            <h5 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5">
              Event Sesi {events.length > 0 && `(${events.length})`}
            </h5>
            {events.length > 0 ? (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {events.map((evt) => {
                  const Icon = getTypeIcon(evt.type);
                  return (
                    <div key={evt.id} className="flex items-center gap-2.5 p-2.5 bg-white/[0.02] rounded-lg border border-white/[0.04]">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium flex-shrink-0 ${getTypeColor(evt.type)}`}>
                        <Icon className="w-3 h-3" />
                        {getTypeLabel(evt.type)}
                      </span>
                      <span className="text-xs text-gray-300 flex-1 truncate">{evt.message}</span>
                      <span className="text-xs text-gray-600 whitespace-nowrap flex-shrink-0">
                        {formatTs(evt.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-gray-600">Tidak ada event tercatat di sesi ini</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Halaman Utama BehaviorLog ───────────────────────────────
export default function BehaviorLog() {
  const { userData }                 = useAuth();
  const { events, sessions, isConnected } = useVehicle();

  const [activeTab,    setActiveTab]    = useState('events'); // 'events' | 'sessions'
  const [filter,        setFilter]      = useState('all');
  const [dateFrom,      setDateFrom]    = useState('');
  const [dateTo,        setDateTo]      = useState('');
  const [showFilters,   setShowFilters] = useState(false);
  const [currentPage,   setCurrentPage] = useState(1);
  const logsPerPage = 10;

  const filteredEvents = useMemo(() => {
    return events.filter((evt) => {
      if (filter !== 'all' && evt.type !== filter) return false;
      if (dateFrom) {
        const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
        if (evt.timestamp < from.getTime()) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
        if (evt.timestamp > to.getTime()) return false;
      }
      return true;
    });
  }, [events, filter, dateFrom, dateTo]);

  const totalPages    = Math.ceil(filteredEvents.length / logsPerPage);
  const paginatedLogs = filteredEvents.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  const totalEvents      = filteredEvents.length;
  const overspeedCount   = filteredEvents.filter((e) => e.type === 'overspeed').length;
  const forcedBrakeCount = filteredEvents.filter((e) => e.type === 'forced_brake').length;
  const steepSlopeCount  = filteredEvents.filter((e) => e.type === 'steep_slope').length;

  const isFiltering = filter !== 'all' || dateFrom || dateTo;

  function resetFilters() {
    setFilter('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  }

  function handleExport() {
    if (filteredEvents.length === 0) {
      toast.error('Tidak ada data untuk diekspor.');
      return;
    }
    try {
      const rows = [
        ['No', 'Waktu Kejadian', 'Tipe Event', 'Keterangan', 'Kecepatan (km/jam)', 'Kemiringan (°)'],
        ...filteredEvents.map((e, i) => [
          i + 1,
          formatTs(e.timestamp),
          getTypeLabel(e.type),
          e.message || '-',
          e.speed ?? '-',
          e.tilt  ?? '-',
        ]),
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch:5 }, { wch:22 }, { wch:16 }, { wch:50 }, { wch:18 }, { wch:14 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Behavior Log');
      XLSX.writeFile(wb, `behavior_log_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Data berhasil diekspor ke Excel!');
    } catch (err) {
      toast.error('Gagal ekspor: ' + err.message);
    }
  }

  const driverName = userData?.name || 'Pengemudi';

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Behavior Log</h1>
          <p className="text-gray-400 mt-1">Rekap seluruh event keselamatan dari sensor kendaraan.</p>
        </div>
        <div className="flex items-center gap-3">
          {isConnected && (
            <span className="hidden sm:flex text-xs px-2.5 py-1.5 rounded-full bg-green-500/10 text-green-400 items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              ESP Online
            </span>
          )}
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold-dark text-dark-primary font-semibold rounded-xl text-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Ringkasan Statistik */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Activity} label="Total Event"     value={totalEvents}      color="text-white"      bg="bg-white/5" />
        <StatCard icon={Gauge}    label="Overspeed"       value={overspeedCount}   color="text-orange-400" bg="bg-orange-500/10" />
        <StatCard icon={Shield}   label="Forced Brake"    value={forcedBrakeCount} color="text-red-400"    bg="bg-red-500/10" />
        <StatCard icon={Mountain} label="Turunan Ekstrem" value={steepSlopeCount}  color="text-blue-400"   bg="bg-blue-500/10" />
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b border-white/[0.06]">
        <button
          onClick={() => setActiveTab('events')}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-xl border border-b-0 transition-all flex items-center gap-2 ${
            activeTab === 'events'
              ? 'bg-dark-secondary border-white/10 text-white'
              : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          Semua Event
          <span className="px-1.5 py-0.5 bg-white/5 text-gray-400 text-xs rounded-full">
            {filteredEvents.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-xl border border-b-0 transition-all flex items-center gap-2 ${
            activeTab === 'sessions'
              ? 'bg-dark-secondary border-white/10 text-white'
              : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          <History className="w-4 h-4" />
          Riwayat Sesi
          {sessions.length > 0 && (
            <span className="px-1.5 py-0.5 bg-gold/20 text-gold text-xs rounded-full">
              {sessions.length}
            </span>
          )}
        </button>
      </div>

      {/* ── TAB: SEMUA EVENT ────────────────────────────────── */}
      {activeTab === 'events' && (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all border ${
                isFiltering
                  ? 'bg-gold/10 border-gold/30 text-gold'
                  : 'bg-dark-secondary border-white/10 text-gray-300 hover:text-white'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filter {isFiltering && '(aktif)'}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {showFilters && (
            <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Tipe Event</label>
                  <select
                    value={filter}
                    onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold"
                  >
                    <option value="all">Semua</option>
                    <option value="overspeed">Overspeed</option>
                    <option value="forced_brake">Forced Brake</option>
                    <option value="steep_slope">Turunan Ekstrem</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Dari Tanggal</label>
                  <input
                    type="date" value={dateFrom}
                    onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-2">Sampai Tanggal</label>
                  <input
                    type="date" value={dateTo}
                    onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                    className="w-full px-3 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold [color-scheme:dark]"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={resetFilters}
                    disabled={!isFiltering}
                    className="w-full px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-white border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Reset Filter
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-dark-secondary rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    {['Waktu', 'Tipe', 'Keterangan', 'Kecepatan', 'Kemiringan'].map((h) => (
                      <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {paginatedLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                            <Activity className="w-6 h-6 text-gray-600" />
                          </div>
                          <p className="text-sm text-gray-500">
                            {events.length === 0
                              ? 'Belum ada event — hubungkan perangkat IoT'
                              : 'Tidak ada event sesuai filter'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedLogs.map((evt) => {
                      const Icon = getTypeIcon(evt.type);
                      return (
                        <tr key={evt.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-5 py-4 text-sm text-gray-400 whitespace-nowrap">
                            {formatTs(evt.timestamp)}
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${getTypeColor(evt.type)}`}>
                              <Icon className="w-3.5 h-3.5" />
                              {getTypeLabel(evt.type)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-300 max-w-[280px] truncate">
                            {evt.message}
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-semibold text-white">{evt.speed ?? '-'}</span>
                            <span className="text-xs text-gray-500 ml-1">km/jam</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-sm font-semibold text-white">{evt.tilt ?? '-'}</span>
                            <span className="text-xs text-gray-500 ml-1">°</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-5 py-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {(currentPage - 1) * logsPerPage + 1}–{Math.min(currentPage * logsPerPage, filteredEvents.length)} dari {filteredEvents.length}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-dark-tertiary border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Sebelumnya
                  </button>
                  <span className="text-sm text-gray-400 px-2">{currentPage} / {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-dark-tertiary border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB: RIWAYAT SESI ───────────────────────────────── */}
      {activeTab === 'sessions' && (
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="bg-dark-secondary rounded-2xl border border-white/5 py-16 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                  <History className="w-6 h-6 text-gray-600" />
                </div>
                <p className="text-sm text-gray-500">Belum ada riwayat sesi tercatat</p>
              </div>
            </div>
          ) : (
            sessions.map((session) => (
              <SessionCard
                key={session.key}
                session={session}
                driverName={driverName}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}