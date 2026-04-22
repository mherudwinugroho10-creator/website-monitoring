import * as XLSX from 'xlsx';

/**
 * Export rekap pelanggaran semua driver ke Excel
 * Digunakan di DriverPerformance admin
 */
export function exportDriverPerformanceToExcel(data, filename = 'rekap_pelanggaran') {
  if (!data || data.length === 0) {
    throw new Error('Tidak ada data untuk diexport');
  }

  const worksheetData = [
    ['No', 'Pengemudi', 'Kendaraan', 'Plat', 'Overspeed', 'Forced Brake', 'Turunan Ekstrem', 'Total Pelanggaran'],
    ...data.map((driver, index) => [
      index + 1,
      driver.name || driver.driver_name || '-',
      driver.vehicleName || driver.vehicle_id || '-',
      driver.vehiclePlate || '-',
      driver.overspeed || 0,
      driver.forced_brake || 0,
      driver.steep_slope || 0,
      driver.total || driver.total_violations || 0,
    ])
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  ws['!cols'] = [
    { wch: 5 },   // No
    { wch: 22 },  // Pengemudi
    { wch: 20 },  // Kendaraan
    { wch: 14 },  // Plat
    { wch: 12 },  // Overspeed
    { wch: 14 },  // Forced Brake
    { wch: 16 },  // Turunan
    { wch: 18 },  // Total
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Pelanggaran');

  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
}

/**
 * Export behavior log (events) ke Excel
 * Digunakan di BehaviorLog user
 */
export function exportBehaviorLogToExcel(data, filename = 'behavior_log') {
  if (!data || data.length === 0) {
    throw new Error('Tidak ada data untuk diexport');
  }

  const worksheetData = [
    ['No', 'Tanggal & Waktu', 'Tipe', 'Keterangan', 'Kecepatan (km/h)', 'Kemiringan (°)', 'Severity', 'Latitude', 'Longitude'],
    ...data.map((evt, index) => {
      // Handle both formats: dari BehaviorLog (sudah di-map) dan raw events
      const ts = evt.timestamp instanceof Date
        ? evt.timestamp.toLocaleString('id-ID')
        : new Date(evt.timestamp).toLocaleString('id-ID');

      return [
        index + 1,
        ts,
        evt.type || '-',
        evt.description || evt.message || '-',
        evt.speed || 0,
        evt.tilt || 0,
        evt.severity || '-',
        evt.latitude || evt.lat || 0,
        evt.longitude || evt.lng || 0,
      ];
    })
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  ws['!cols'] = [
    { wch: 5 },   // No
    { wch: 22 },  // Tanggal
    { wch: 18 },  // Tipe
    { wch: 50 },  // Keterangan
    { wch: 16 },  // Kecepatan
    { wch: 14 },  // Kemiringan
    { wch: 12 },  // Severity
    { wch: 14 },  // Lat
    { wch: 14 },  // Lng
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Behavior Log');

  const date = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `${filename}_${date}.xlsx`);
}

/**
 * Export detail pelanggaran 1 driver ke Excel
 * Digunakan di DriverDetailModal admin
 */
export function exportDriverDetailToExcel(driver, events, filename) {
  if (!events || events.length === 0) {
    throw new Error('Tidak ada data event');
  }

  function formatTs(ts) {
    const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  function getTypeLabel(type) {
    switch (type) {
      case 'overspeed': return 'Overspeed';
      case 'forced_brake': return 'Forced Brake';
      case 'steep_slope': return 'Turunan Ekstrem';
      default: return type;
    }
  }

  const worksheetData = [
    ['REKAP PELANGGARAN PENGEMUDI'],
    ['Nama', driver.name],
    ['Kendaraan', driver.vehicleName],
    ['Plat Nomor', driver.vehiclePlate],
    ['Total Overspeed', driver.overspeed],
    ['Total Forced Brake', driver.forced_brake],
    ['Total Turunan Ekstrem', driver.steep_slope],
    ['Total Pelanggaran', driver.total],
    [],
    ['No', 'Tanggal & Waktu', 'Tipe', 'Keterangan', 'Kecepatan (km/h)', 'Kemiringan (°)', 'Latitude', 'Longitude'],
    ...events.map((evt, i) => [
      i + 1,
      formatTs(evt.timestamp),
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

  ws['!cols'] = [
    { wch: 5 }, { wch: 22 }, { wch: 18 }, { wch: 50 },
    { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
  ];

  ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

  XLSX.utils.book_append_sheet(wb, ws, `Detail ${driver.name}`);

  const date = new Date().toISOString().split('T')[0];
  const safeName = (filename || driver.name).replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(wb, `detail_pelanggaran_${safeName}_${date}.xlsx`);
}
