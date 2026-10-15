import { useState, useEffect } from 'react';
import {
  Users, AlertTriangle, Search, Download,
  ChevronUp, ChevronDown, Gauge, Mountain, Shield, Eye,
  History, Clock, CheckCircle, XCircle
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { ref, onValue, query, orderByChild } from 'firebase/database';
import { db, rtdb } from '../../services/firebase';
import { toast } from 'react-toastify';
import DriverDetailModal from '../../components/admin/DriverDetailModal';
import * as XLSX from 'xlsx';

export default function DriverPerformance() {
  const [driversData, setDriversData]   = useState([]);
  const [allSessions, setAllSessions]   = useState([]);
  const [searchQuery, setSearchQuery]   = useState('');
  const [sortBy, setSortBy]             = useState('total');
  const [sortDir, setSortDir]           = useState('desc');
  const [loading, setLoading]           = useState(true);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [activeTab, setActiveTab]       = useState('violations'); // 'violations' | 'sessions'

  useEffect(() => {
    async function loadData() {
      try {
        // 1. Load semua user/driver dari Firestore
        const usersSnap = await getDocs(collection(db, 'users'));
        const driverMap = {};
        usersSnap.forEach(doc => {
          const data = doc.data();
          if ((data.role === 'user' || !data.role) && data.vehicleId) {
            driverMap[data.vehicleId] = {
              uid: doc.id,
              name: data.name || 'Unknown',
              vehicleId: data.vehicleId,
              vehicleName: data.vehicleName || data.vehicleId,
              vehiclePlate: data.vehiclePlate || '-',
              overspeed: 0,
              forced_brake: 0,
              steep_slope: 0,
              total: 0,
              events: [],
            };
          }
        });

        // Fallback
        if (Object.keys(driverMap).length === 0) {
          driverMap['TRUCK_001'] = {
            uid: '-', name: 'Belum ada pengemudi', vehicleId: 'TRUCK_001',
            vehicleName: '-', vehiclePlate: '-',
            overspeed: 0, forced_brake: 0, steep_slope: 0, total: 0, events: [],
          };
        }

        // 2. Load events dari tiap kendaraan
        for (const vid of Object.keys(driverMap)) {
          const eventsRef = query(ref(rtdb, `vehicles/${vid}/events`), orderByChild('timestamp'));
          await new Promise(resolve => {
            onValue(eventsRef, (snapshot) => {
              if (snapshot.exists()) {
                snapshot.forEach(child => {
                  const evt = child.val();
                  const driver = driverMap[vid];
                  if (driver) {
                    if (evt.type === 'overspeed') driver.overspeed++;
                    else if (evt.type === 'forced_brake') driver.forced_brake++;
                    else if (evt.type === 'steep_slope') driver.steep_slope++;
                    driver.total++;
                    driver.events.push({ id: child.key, ...evt });
                  }
                });
              }
              resolve();
            }, { onlyOnce: true });
          });
        }

        // 3. Load sessions per kendaraan
        const allSessionsList = [];
        for (const vid of Object.keys(driverMap)) {
          await new Promise(resolve => {
            onValue(ref(rtdb, `vehicles/${vid}/sessions`), (snap) => {
              if (snap.exists()) {
                snap.forEach(child => {
                  const s = child.val();
                  allSessionsList.push({
                    key: child.key,
                    vehicleId: vid,
                    driverName: driverMap[vid]?.name || vid,
                    meta: s.meta || {},
                    eventCount: s.events ? Object.keys(s.events).length : 0,
                    behaviorLogCount: s.behaviorLog ? Object.keys(s.behaviorLog).length : 0,
                  });
                });
              }
              resolve();
            }, { onlyOnce: true });
          });
        }
        allSessionsList.sort((a, b) => (b.meta.startTime || 0) - (a.meta.startTime || 0));
        setAllSessions(allSessionsList);

        setDriversData(Object.values(driverMap));
      } catch (error) {
        console.error('Error loading driver performance:', error);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Filter + periode waktu
  const filtered = driversData
    .filter((d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.vehicleId.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .map((driver) => {
      let evts = driver.events || [];
      if (dateFrom) {
        const from = new Date(dateFrom); from.setHours(0, 0, 0, 0);
        evts = evts.filter((e) => e.timestamp >= from.getTime());
      }
      if (dateTo) {
        const to = new Date(dateTo); to.setHours(23, 59, 59, 999);
        evts = evts.filter((e) => e.timestamp <= to.getTime());
      }
      const overspeed    = evts.filter((e) => e.type === 'overspeed').length;
      const forced_brake = evts.filter((e) => e.type === 'forced_brake').length;
      const steep_slope  = evts.filter((e) => e.type === 'steep_slope').length;
      return {
        ...driver,
        overspeed, forced_brake, steep_slope,
        total: evts.length,
        events: evts,
      };
    });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const aVal = typeof a[sortBy] === 'string' ? a[sortBy] : (a[sortBy] ?? 0);
    const bVal = typeof b[sortBy] === 'string' ? b[sortBy] : (b[sortBy] ?? 0);
    if (typeof aVal === 'string') return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
  });

  function handleSort(col) {
    if (sortBy === col) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  }

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return null;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 inline ml-0.5" />
      : <ChevronDown className="w-3.5 h-3.5 inline ml-0.5" />;
  };

  // Aggregates
  const totalDrivers     = driversData.length;
  const totalViolations  = driversData.reduce((s, d) => s + d.total, 0);
  const totalForcedBrake = driversData.reduce((s, d) => s + d.forced_brake, 0);

  // Export semua driver
  function handleExportAll() {
    try {
      if (sorted.length === 0) throw new Error('Tidak ada data');
      const worksheetData = [
        ['No', 'Pengemudi', 'Kendaraan', 'Plat', 'Overspeed', 'Forced Brake', 'Turunan Ekstrem', 'Total Pelanggaran'],
        ...sorted.map((d, i) => [
          i + 1, d.name, d.vehicleName, d.vehiclePlate,
          d.overspeed, d.forced_brake, d.steep_slope, d.total
        ])
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);
      ws['!cols'] = [
        { wch: 5 }, { wch: 22 }, { wch: 20 }, { wch: 14 },
        { wch: 12 }, { wch: 14 }, { wch: 16 }, { wch: 18 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap Pelanggaran');
      const date = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `rekap_pelanggaran_semua_${date}.xlsx`);
      toast.success('Data berhasil diexport ke Excel!');
    } catch (error) {
      toast.error('Gagal export: ' + error.message);
    }
  }

  function handleDriverClick(driver) {
    setSelectedDriver(driver);
    setIsModalOpen(true);
  }

  function formatDuration(startMs, endMs) {
    if (!startMs) return '-';
    const end = endMs && endMs > 0 ? endMs : Date.now();
    const diffSec = Math.floor((end - startMs) / 1000);
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    if (h > 0) return `${h}j ${m}m`;
    if (m > 0) return `${m}m ${s}d`;
    return `${s}d`;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Rekap Pelanggaran Pengemudi</h1>
        <p className="text-gray-400 mt-1">Data pelanggaran dari sensor IoT per pengemudi — terintegrasi dengan alat.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalDrivers}</div>
          <div className="text-xs text-gray-500 mt-1">Total Pengemudi</div>
        </div>
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{totalViolations}</div>
          <div className="text-xs text-gray-500 mt-1">Total Pelanggaran</div>
        </div>
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3">
            <Shield className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-400">{totalForcedBrake}</div>
          <div className="text-xs text-gray-500 mt-1">Total Forced Brake</div>
        </div>
      </div>

      {/* Tab */}
      <div className="flex gap-2 border-b border-white/[0.06] pb-0">
        <button
          onClick={() => setActiveTab('violations')}
          className={`px-5 py-2.5 text-sm font-medium rounded-t-xl border border-b-0 transition-all ${
            activeTab === 'violations'
              ? 'bg-dark-secondary border-white/10 text-white'
              : 'border-transparent text-gray-500 hover:text-white'
          }`}
        >
          Rekap Pelanggaran
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
          {allSessions.length > 0 && (
            <span className="px-1.5 py-0.5 bg-gold/20 text-gold text-xs rounded-full">
              {allSessions.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'violations' && (
        <>
          {/* Filter + Export */}
          <div className="bg-dark-secondary rounded-2xl border border-white/5 p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input type="text" placeholder="Cari pengemudi atau kendaraan..."
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold" />
              </div>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                title="Dari tanggal"
                className="px-3 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold [color-scheme:dark]" />
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                title="Sampai tanggal"
                className="px-3 py-2.5 bg-dark-tertiary border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-gold [color-scheme:dark]" />
              <button onClick={handleExportAll}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold-dark text-dark-primary font-semibold rounded-xl text-sm transition-all">
                <Download className="w-4 h-4" /> Export Semua
              </button>
            </div>
          </div>

          {/* Table Pelanggaran */}
          <div className="bg-dark-secondary rounded-2xl border border-white/5 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gold"
                      onClick={() => handleSort('name')}>
                      Pengemudi <SortIcon column="name" />
                    </th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kendaraan</th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gold"
                      onClick={() => handleSort('overspeed')}>
                      Overspeed <SortIcon column="overspeed" />
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gold"
                      onClick={() => handleSort('forced_brake')}>
                      Forced Brake <SortIcon column="forced_brake" />
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gold"
                      onClick={() => handleSort('steep_slope')}>
                      Turunan <SortIcon column="steep_slope" />
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gold"
                      onClick={() => handleSort('total')}>
                      Total <SortIcon column="total" />
                    </th>
                    <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {sorted.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Users className="w-10 h-10 text-gray-600" />
                          <p className="text-sm text-gray-500">Belum ada data pengemudi</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sorted.map((driver, idx) => (
                      <tr key={driver.vehicleId} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-white">{driver.name}</div>
                          <div className="text-xs text-gray-500">{driver.vehiclePlate}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-300">{driver.vehicleName}</td>
                        <td className="px-5 py-4 text-center">
                          <span className={`text-sm font-semibold ${driver.overspeed > 0 ? 'text-orange-400' : 'text-gray-600'}`}>
                            {driver.overspeed}x
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`text-sm font-semibold ${driver.forced_brake > 0 ? 'text-red-400' : 'text-gray-600'}`}>
                            {driver.forced_brake}x
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`text-sm font-semibold ${driver.steep_slope > 0 ? 'text-blue-400' : 'text-gray-600'}`}>
                            {driver.steep_slope}x
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="text-sm font-bold text-white">{driver.total}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <button onClick={() => handleDriverClick(driver)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 hover:bg-gold/20 text-gold text-xs font-medium rounded-lg transition-all">
                            <Eye className="w-3.5 h-3.5" /> Detail
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'sessions' && (
        <div className="bg-dark-secondary rounded-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Sesi</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pengemudi</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Mulai</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Durasi</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Events</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Behavior Log</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {allSessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <History className="w-10 h-10 text-gray-600" />
                        <p className="text-sm text-gray-500">Belum ada riwayat sesi</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  allSessions.map((session, idx) => {
                    const isActive = session.meta.status === 'active';
                    const startDate = session.meta.startTime
                      ? new Date(session.meta.startTime).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })
                      : '-';
                    return (
                      <tr key={`${session.vehicleId}-${session.key}`} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-4 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-5 py-4">
                          <div className="text-sm font-medium text-white">{session.meta.label || session.key}</div>
                          <div className="text-xs text-gray-500">{session.key}</div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="text-sm text-white">{session.driverName}</div>
                          <div className="text-xs text-gray-500">{session.vehicleId}</div>
                        </td>
                        <td className="px-5 py-4 text-sm text-gray-300">{startDate}</td>
                        <td className="px-5 py-4 text-sm text-gray-300">
                          {formatDuration(session.meta.startTime, session.meta.endTime)}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`text-sm font-semibold ${session.eventCount > 0 ? 'text-orange-400' : 'text-gray-600'}`}>
                            {session.eventCount}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="text-sm text-gray-400">{session.behaviorLogCount}</span>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 text-xs font-medium">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-400 text-xs font-medium">
                              <CheckCircle className="w-3.5 h-3.5" />
                              Selesai
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Detail */}
      <DriverDetailModal
        driver={selectedDriver}
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedDriver(null); }}
      />
    </div>
  );
}   