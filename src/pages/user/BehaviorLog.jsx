import { useState, useMemo } from 'react';
import {
  Download, Filter, ChevronDown,
  AlertTriangle, Gauge, Mountain, Shield, Activity
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useVehicle } from '../../context/VehicleContext';
import { exportBehaviorLogToExcel } from '../../utils/excelExport';

export default function BehaviorLog() {
  const { events, settings, isSimulating, startSimulation, stopSimulation } = useVehicle();

  const [filter, setFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 10;

  function getTypeIcon(type) {
    switch (type) {
      case 'overspeed': return Gauge;
      case 'forced_brake': return Shield;
      case 'steep_slope': return Mountain;
      default: return AlertTriangle;
    }
  }

  function getTypeLabel(type) {
    switch (type) {
      case 'overspeed': return 'Overspeed';
      case 'forced_brake': return 'Forced Brake';
      case 'steep_slope': return 'Turunan Ekstrem';
      default: return type;
    }
  }

  function getTypeColor(type) {
    switch (type) {
      case 'overspeed': return 'bg-orange-500/10 text-orange-400';
      case 'forced_brake': return 'bg-red-500/10 text-red-400';
      case 'steep_slope': return 'bg-blue-500/10 text-blue-400';
      default: return 'bg-gray-500/10 text-gray-400';
    }
  }

  function formatTimestamp(ts) {
    const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  const filteredLogs = useMemo(() => {
    return events.filter((evt) => {
      if (filter !== 'all' && evt.type !== filter) return false;
      if (dateFrom) {
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (evt.timestamp < from.getTime()) return false;
      }
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (evt.timestamp > to.getTime()) return false;
      }
      return true;
    });
  }, [events, filter, dateFrom, dateTo]);

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const paginatedLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  const totalEvents = filteredLogs.length;
  const overspeedCount = filteredLogs.filter(e => e.type === 'overspeed').length;
  const forcedBrakeCount = filteredLogs.filter(e => e.type === 'forced_brake').length;
  const steepSlopeCount = filteredLogs.filter(e => e.type === 'steep_slope').length;

  function exportExcel() {
    try {
      const exportData = filteredLogs.map(evt => ({
        timestamp: new Date(evt.timestamp),
        type: getTypeLabel(evt.type),
        description: evt.message,
        speed: evt.speed || 0,
        tilt: evt.tilt || 0,
        latitude: evt.lat || 0,
        longitude: evt.lng || 0,
        severity: evt.severity,
      }));
      exportBehaviorLogToExcel(exportData, 'behavior_log');
      toast.success('Data berhasil diexport ke Excel!');
    } catch (error) {
      toast.error('Gagal export: ' + error.message);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Behavior Log</h1>
          <p className="text-gray-400 mt-1">Rekap seluruh event keselamatan dari sensor kendaraan.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {!isSimulating ? (
            <button onClick={startSimulation}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 text-green-400 rounded-xl text-sm transition-all">
              <Activity className="w-4 h-4" /> Mulai Simulasi
            </button>
          ) : (
            <button onClick={stopSimulation}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-xl text-sm transition-all">
              <Activity className="w-4 h-4" /> Stop Simulasi
            </button>
          )}
          <button onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-dark-secondary border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white transition-all">
            <Filter className="w-4 h-4" /> Filter
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={exportExcel}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold-dark text-dark-primary font-semibold rounded-xl text-sm transition-all">
            <Download className="w-4 h-4" /> Export Excel
          </button>
        </div>
      </div>

      {/* Simulasi Banner */}
      {isSimulating && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-sm text-yellow-400 flex items-center gap-2">
          <Activity className="w-4 h-4 flex-shrink-0" />
          Mode Simulasi aktif — data event sama persis dengan yang tampil di Live Monitoring.
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div className="text-2xl font-bold text-white">{totalEvents}</div>
          <div className="text-xs text-gray-500 mt-1">Total Event</div>
        </div>
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3">
            <Gauge className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-400">{overspeedCount}</div>
          <div className="text-xs text-gray-500 mt-1">Overspeed</div>
        </div>
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{forcedBrakeCount}</div>
          <div className="text-xs text-gray-500 mt-1">Forced Brake</div>
        </div>
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
            <Mountain className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{steepSlopeCount}</div>
          <div className="text-xs text-gray-500 mt-1">Turunan Ekstrem</div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Tipe Event</label>
              <select value={filter} onChange={(e) => { setFilter(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold">
                <option value="all">Semua</option>
                <option value="overspeed">Overspeed</option>
                <option value="forced_brake">Forced Brake</option>
                <option value="steep_slope">Turunan Ekstrem</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Dari Tanggal</label>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Sampai Tanggal</label>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                className="w-full px-3 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold" />
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Riwayat Event</h2>
          <span className="text-xs text-gray-500">{filteredLogs.length} event tercatat</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Waktu</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipe</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Keterangan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kecepatan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kemiringan</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lokasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-gray-600" />
                      </div>
                      <p className="text-sm text-gray-500">
                        {events.length === 0
                          ? 'Belum ada event — mulai simulasi atau hubungkan alat IoT'
                          : 'Tidak ada event yang cocok dengan filter'}
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
                        {formatTimestamp(evt.timestamp)}
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
                        <span className="text-xs text-gray-500 ml-1">km/h</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-semibold text-white">{evt.tilt ?? '-'}</span>
                        <span className="text-xs text-gray-500 ml-1">°</span>
                      </td>
                      <td className="px-5 py-4 text-xs text-gray-500 font-mono">
                        {evt.lat ? `${evt.lat.toFixed(4)}, ${evt.lng.toFixed(4)}` : '-'}
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
            <div className="text-sm text-gray-500">
              {((currentPage - 1) * logsPerPage) + 1}–{Math.min(currentPage * logsPerPage, filteredLogs.length)} dari {filteredLogs.length}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-dark-tertiary border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Sebelumnya
              </button>
              <span className="text-sm text-gray-400 px-2">{currentPage} / {totalPages}</span>
              <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-dark-tertiary border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}