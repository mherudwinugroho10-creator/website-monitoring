import * as XLSX from 'xlsx';
import {
  PERFORMANCE_EXPORT_HEADERS, DETAIL_EXPORT_HEADERS, performanceSheetRows, detailSheetRows,
} from './adminLogic';

// Berkas Excel halaman Performa Pengemudi (SheetJS): satu lembar data dan lembar "Info"
// (jenis laporan, filter aktif, waktu ekspor). Mengunduh langsung di peramban admin.
function writeWorkbook({ sheetName, headers, body, cols, info, fileName }) {
  const wb = XLSX.utils.book_new();
  const data = XLSX.utils.aoa_to_sheet([headers, ...body]);
  data['!cols'] = cols;
  XLSX.utils.book_append_sheet(wb, data, sheetName);

  const meta = XLSX.utils.aoa_to_sheet(info);
  meta['!cols'] = [{ wch: 20 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, meta, 'Info');

  XLSX.writeFile(wb, fileName);
}

export function writePerformanceWorkbook({ rows, info, fileName }) {
  writeWorkbook({
    sheetName: 'Rekap Pelanggaran',
    headers: PERFORMANCE_EXPORT_HEADERS,
    body: performanceSheetRows(rows),
    cols: [{ wch: 5 }, { wch: 24 }, { wch: 30 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 11 }, { wch: 13 }, { wch: 9 }],
    info,
    fileName,
  });
}

export function writeDetailWorkbook({ detailRows, info, fileName }) {
  writeWorkbook({
    sheetName: 'Rincian Pelanggaran',
    headers: DETAIL_EXPORT_HEADERS,
    body: detailSheetRows(detailRows),
    cols: [{ wch: 5 }, { wch: 21 }, { wch: 14 }, { wch: 44 }, { wch: 19 }, { wch: 21 }],
    info,
    fileName,
  });
}