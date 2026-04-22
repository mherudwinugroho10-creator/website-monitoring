import { X, User, Gauge, Mountain, Shield, AlertTriangle, Download, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

export default function DriverDetailModal({ driver, isOpen, onClose }) {
  if (!isOpen || !driver) return null;

  const typeConfig = {
    overspeed: { icon: Gauge, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Overspeed' },
    forced_brake: { icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Forced Brake' },
    steep_slope: { icon: Mountain, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Turunan Ekstrem' },
  };

  // Sort events terbaru dulu
  const sortedEvents = [...(driver.events || [])]
    .sort((a, b) => b.timestamp - a.timestamp);

  function formatTimestamp(ts) {
    const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  function getTypeLabel(type) {
    return typeConfig[type]?.label || type;
  }

  // === EXPORT EXCEL 1 DRIVER ===
  function handleExportDriver() {
    try {
      if (sortedEvents.length === 0) {
        toast.error('Belum ada data event untuk pengemudi ini');
        return;
      }

      const worksheetData = [
        // Info header
        ['REKAP PELANGGARAN PENGEMUDI'],
        ['Nama', driver.name],
        ['Kendaraan', driver.vehicleName],
        ['Plat Nomor', driver.vehiclePlate],
        ['Total Overspeed', driver.overspeed],
        ['Total Forced Brake', driver.forced_brake],
        ['Total Turunan Ekstrem', driver.steep_slope],
        ['Total Pelanggaran', driver.total],
        [],
        // Tabel detail events
        ['No', 'Tanggal & Waktu', 'Tipe', 'Keterangan', 'Kecepatan (km/h)', 'Kemiringan (°)', 'Latitude', 'Longitude'],
        ...sortedEvents.map((evt, i) => [
          i + 1,
          formatTimestamp(evt.timestamp),
          getTypeLabel(evt.type),
          evt.message || '-',
          evt.speed ?? '-',
          evt.tilt ?? '-',
          evt.lat ? parseFloat(evt.lat.toFixed(6)) : '-',
          evt.lng ? parseFloat(evt.lng.toFixed(6)) : '-',
        ])
      ];

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(worksheetData);

      // Column widths
      ws['!cols'] = [
        { wch: 5 },   // No
        { wch: 22 },  // Tanggal
        { wch: 18 },  // Tipe
        { wch: 50 },  // Keterangan
        { wch: 16 },  // Kecepatan
        { wch: 14 },  // Kemiringan
        { wch: 14 },  // Lat
        { wch: 14 },  // Lng
      ];

      // Merge title
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

      XLSX.utils.book_append_sheet(wb, ws, `Detail ${driver.name}`);

      const date = new Date().toISOString().split('T')[0];
      const safeName = driver.name.replace(/[^a-zA-Z0-9]/g, '_');
      XLSX.writeFile(wb, `detail_pelanggaran_${safeName}_${date}.xlsx`);
      toast.success(`Data ${driver.name} berhasil diexport!`);
    } catch (error) {
      toast.error('Gagal export: ' + error.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-dark-primary rounded-2xl border border-white/10 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
              <User className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{driver.name}</h2>
              <p className="text-sm text-gray-400">{driver.vehicleName} • {driver.vehiclePlate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleExportDriver}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-dark text-dark-primary font-semibold rounded-xl text-sm transition-all">
              <Download className="w-4 h-4" /> Export Excel
            </button>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="p-6 border-b border-white/10 flex-shrink-0">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-3 bg-orange-500/5 rounded-xl border border-orange-500/10">
              <div className="text-xl font-bold text-orange-400">{driver.overspeed}x</div>
              <div className="text-xs text-gray-500 mt-1">Overspeed</div>
            </div>
            <div className="text-center p-3 bg-red-500/5 rounded-xl border border-red-500/10">
              <div className="text-xl font-bold text-red-400">{driver.forced_brake}x</div>
              <div className="text-xs text-gray-500 mt-1">Forced Brake</div>
            </div>
            <div className="text-center p-3 bg-blue-500/5 rounded-xl border border-blue-500/10">
              <div className="text-xl font-bold text-blue-400">{driver.steep_slope}x</div>
              <div className="text-xs text-gray-500 mt-1">Turunan Ekstrem</div>
            </div>
            <div className="text-center p-3 bg-white/[0.03] rounded-xl border border-white/5">
              <div className="text-xl font-bold text-white">{driver.total}</div>
              <div className="text-xs text-gray-500 mt-1">Total</div>
            </div>
          </div>
        </div>

        {/* Events Table */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-dark-primary z-10">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Detail Kejadian ({sortedEvents.length})</h3>
          </div>

          {sortedEvents.length === 0 ? (
            <div className="text-center py-16">
              <AlertTriangle className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Belum ada event tercatat untuk pengemudi ini</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">No</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tanggal & Waktu</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Tipe</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Keterangan</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kecepatan</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Kemiringan</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Lokasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {sortedEvents.map((evt, idx) => {
                    const cfg = typeConfig[evt.type] || { icon: AlertTriangle, color: 'text-gray-400', bg: 'bg-gray-500/10', label: evt.type };
                    const Icon = cfg.icon;

                    return (
                      <tr key={evt.id || idx} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-5 py-3 text-sm text-gray-500">{idx + 1}</td>
                        <td className="px-5 py-3 text-sm text-gray-400 whitespace-nowrap">
                          {formatTimestamp(evt.timestamp)}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-300 max-w-[250px] truncate">
                          {evt.message || '-'}
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm font-semibold text-white">{evt.speed ?? '-'}</span>
                          <span className="text-xs text-gray-500 ml-1">km/h</span>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-sm font-semibold text-white">{evt.tilt ?? '-'}</span>
                          <span className="text-xs text-gray-500 ml-1">°</span>
                        </td>
                        <td className="px-5 py-3">
                          {evt.lat ? (
                            <div className="flex items-center gap-1 text-xs text-gray-500 font-mono">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {evt.lat.toFixed(4)}, {evt.lng.toFixed(4)}
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex-shrink-0 flex items-center justify-between">
          <p className="text-xs text-gray-600">
            Data dari Firebase Realtime Database — path: vehicles/{driver.vehicleId}/events
          </p>
          <button onClick={onClose}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm transition-all">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
