import jsPDF from 'jspdf';
import 'jspdf-autotable';
import Papa from 'papaparse';

// Format date for display
function formatDate(date) {
  return new Date(date).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Format time for display
function formatTime(date) {
  return new Date(date).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Format datetime for display
function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}

// Export behavior logs to CSV
export function exportToCSV(data, filename = 'behavior_logs') {
  // Pastikan data ada
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Header dengan separator yang benar
  const header = [
    'Timestamp',
    'Vehicle ID',
    'Speed Avg (km/h)',
    'Speed Max (km/h)',
    'Speed Min (km/h)',
    'Pitch (degree)',
    'Roll (degree)',
    'Brake Status',
    'Auto Brake Count',
    'Latitude',
    'Longitude',
    'Status'
  ].join(',') + '\n';

  // Data rows
  const rows = data.map(log => {
    return [
      `"${formatDateTime(log.timestamp)}"`,
      log.vehicle_id || 'N/A',
      log.speed_avg?.toFixed(1) || '0',
      log.speed_max?.toFixed(1) || '0',
      log.speed_min?.toFixed(1) || '0',
      log.pitch_avg?.toFixed(1) || '0',
      log.roll_avg?.toFixed(1) || '0',
      log.brake_status || 'normal',
      log.auto_brake_count || 0,
      log.location?.lat?.toFixed(6) || '0',
      log.location?.lng?.toFixed(6) || '0',
      (log.status || 'NORMAL').toUpperCase()
    ].join(',');
  }).join('\n');

  const csv = header + rows;

  // Add BOM untuk Excel support Unicode
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${formatDate(new Date())}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// Export behavior logs to PDF
export function exportToPDF(data, filename = 'behavior_logs') {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  // Title
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text('SAFEDRIVE - Behavior Log Report', 14, 15);
  
  // Subtitle
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${formatDateTime(new Date())}`, 14, 22);
  doc.text(`Total Records: ${data.length}`, 14, 27);
  
  // Table data
  const tableData = data.map(log => [
    formatDateTime(log.timestamp),
    log.vehicle_id,
    log.speed_avg?.toFixed(1) || '-',
    log.speed_max?.toFixed(1) || '-',
    log.pitch_avg?.toFixed(1) || '-',
    log.roll_avg?.toFixed(1) || '-',
    log.brake_status || 'normal',
    log.auto_brake_count || 0,
    log.status?.toUpperCase() || 'NORMAL',
  ]);

  // AutoTable
  doc.autoTable({
    startY: 32,
    head: [[
      'Timestamp',
      'Vehicle',
      'Avg Speed',
      'Max Speed',
      'Pitch',
      'Roll',
      'Brake',
      'Auto Brake',
      'Status'
    ]],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [212, 175, 55], // Gold color
      textColor: [10, 10, 15],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [40, 40, 40],
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 25 },
      2: { cellWidth: 20 },
      3: { cellWidth: 20 },
      4: { cellWidth: 18 },
      5: { cellWidth: 18 },
      6: { cellWidth: 20 },
      7: { cellWidth: 20 },
      8: { cellWidth: 20 },
    },
    didParseCell: function(data) {
      // Color status cells
      if (data.column.index === 8 && data.cell.section === 'body') {
        const status = data.cell.raw;
        if (status === 'DANGER') {
          data.cell.styles.textColor = [255, 107, 107];
          data.cell.styles.fontStyle = 'bold';
        } else if (status === 'WARNING') {
          data.cell.styles.textColor = [253, 203, 110];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [0, 212, 170];
        }
      }
    },
    margin: { top: 32, left: 14, right: 14 },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    doc.text(
      'SAFEDRIVE - Heavy Vehicle Safety Monitoring System',
      14,
      doc.internal.pageSize.height - 10
    );
  }

  // Save
  doc.save(`${filename}_${formatDate(new Date())}.pdf`);
}

// Export trips to PDF
export function exportTripToPDF(trip, filename = 'trip_report') {
  const doc = new jsPDF('portrait', 'mm', 'a4');
  
  // Title
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('SAFEDRIVE', 14, 20);
  
  doc.setFontSize(14);
  doc.setTextColor(212, 175, 55);
  doc.text('Trip Report', 14, 28);
  
  // Trip Info
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${formatDateTime(new Date())}`, 14, 36);
  
  // Trip Details Section
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text('Trip Details', 14, 48);
  
  doc.setFontSize(10);
  const details = [
    ['Trip ID', trip.trip_id || '-'],
    ['Vehicle', trip.vehicle_id || '-'],
    ['Driver', trip.driver_name || '-'],
    ['Start Time', trip.start_time ? formatDateTime(trip.start_time) : '-'],
    ['End Time', trip.end_time ? formatDateTime(trip.end_time) : '-'],
    ['Duration', trip.duration_minutes ? `${trip.duration_minutes} minutes` : '-'],
    ['Distance', trip.distance_km ? `${trip.distance_km.toFixed(1)} km` : '-'],
  ];
  
  let yPos = 55;
  details.forEach(([label, value]) => {
    doc.setTextColor(100, 100, 100);
    doc.text(label + ':', 14, yPos);
    doc.setTextColor(40, 40, 40);
    doc.text(value, 60, yPos);
    yPos += 7;
  });
  
  // Statistics Section
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text('Statistics', 14, yPos + 10);
  
  const stats = trip.statistics || {};
  const statsData = [
    ['Average Speed', `${stats.speed_avg?.toFixed(1) || '-'} km/h`],
    ['Maximum Speed', `${stats.speed_max?.toFixed(1) || '-'} km/h`],
    ['Overspeed Count', stats.overspeed_count || 0],
    ['Harsh Braking', stats.harsh_brake_count || 0],
    ['Auto Brake', stats.auto_brake_count || 0],
    ['Max Pitch', `${stats.pitch_max?.toFixed(1) || '-'}°`],
    ['Max Roll', `${stats.roll_max?.toFixed(1) || '-'}°`],
  ];
  
  yPos += 17;
  statsData.forEach(([label, value]) => {
    doc.setTextColor(100, 100, 100);
    doc.text(label + ':', 14, yPos);
    doc.setTextColor(40, 40, 40);
    doc.text(String(value), 60, yPos);
    yPos += 7;
  });
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'SAFEDRIVE - Heavy Vehicle Safety Monitoring System',
    14,
    doc.internal.pageSize.height - 10
  );
  
  // Save
  doc.save(`${filename}_${trip.trip_id || 'report'}.pdf`);
}