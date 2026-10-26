import * as XLSX from 'xlsx';
import { EXPORT_HEADERS, rowsToSheetRows } from './behaviorLogic';

// Menulis berkas Excel (SheetJS) berisi dua lembar: "Behavior Log" (data sesuai filter aktif) dan
// "Info" (identitas, cakupan, filter, waktu ekspor). Mengunduh langsung di peramban pengguna.
export function writeBehaviorLogWorkbook({ rows, info, fileName }) {
  const wb = XLSX.utils.book_new();

  const data = XLSX.utils.aoa_to_sheet([EXPORT_HEADERS, ...rowsToSheetRows(rows)]);
  data['!cols'] = [{ wch: 5 }, { wch: 21 }, { wch: 14 }, { wch: 46 }, { wch: 19 }, { wch: 16 }, { wch: 19 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, data, 'Behavior Log');

  const meta = XLSX.utils.aoa_to_sheet(info);
  meta['!cols'] = [{ wch: 20 }, { wch: 48 }];
  XLSX.utils.book_append_sheet(wb, meta, 'Info');

  XLSX.writeFile(wb, fileName);
}