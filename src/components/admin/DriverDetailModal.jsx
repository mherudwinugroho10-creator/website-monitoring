import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { Download, Gauge, Shield, Truck, Info, AlertCircle } from 'lucide-react';
import Modal from '../common/Modal';
import { formatNumber } from '../../utils/vehicleLogic';
import { formatDateTime } from '../../utils/behaviorLogic';
import {
  PERFORMANCE_EVENTS_LIMIT, buildEventDetailRows, detailExportInfo, detailFileName,
} from '../../utils/adminLogic';
import { writeDetailWorkbook } from '../../utils/exportAdmin';

const STEP = 50;
const TYPE_STYLE = {
  overspeed: { cls: 'bg-orange-500/10 text-orange-400', icon: Gauge },
  forced_brake: { cls: 'bg-red-500/10 text-red-400', icon: Shield },
};

function TypeBadge({ type, label }) {
  const st = TYPE_STYLE[type] || TYPE_STYLE.overspeed;
  const Icon = st.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium whitespace-nowrap ${st.cls}`}>
      <Icon className="w-3 h-3" />{label}
    </span>
  );
}

function Num({ value }) {
  return value === null || value === undefined ? <span className="text-gray-600">—</span> : <span className="font-mono">{formatNumber(value, 2)}</span>;
}

// Rincian pelanggaran satu pengemudi sesuai filter rekap yang aktif.
export default function DriverDetailModal({ row, filter, adminName, truncated, onClose }) {
  const [shown, setShown] = useState(STEP);
  const detail = useMemo(() => buildEventDetailRows(row.events), [row.events]);
  const visible = detail.slice(0, shown);

  function handleExport() {
    if (!row.ready) {
      toast.error('Data event kendaraan ini belum tersedia, jadi tidak bisa diekspor.');
      return;
    }
    if (detail.length === 0) {
      toast.error('Tidak ada data untuk diekspor.');
      return;
    }
    try {
      const exportedAt = Date.now();
      writeDetailWorkbook({
        detailRows: detail,
        fileName: detailFileName(row, exportedAt),
        info: detailExportInfo({
          driver: row, filter, rowCount: detail.length, exportedAt, adminName,
          summary: { overspeed: row.overspeed, forcedBrake: row.forcedBrake, total: row.total },
        }),
      });
      toast.success(`${detail.length} baris berhasil diekspor ke Excel.`);
    } catch (err) {
      console.error('[DriverDetailModal] Gagal ekspor:', err);
      toast.error('Gagal ekspor: ' + err.message);
    }
  }

  return (
    <Modal open onClose={onClose} size="xl" testId="driver-detail-modal"
      title={`Rincian Pelanggaran — ${row.name || row.email}`}
      subtitle={[row.vehicleName, row.vehiclePlate, row.vehicleId].filter(Boolean).join(' · ') || undefined}
      footer={(
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-xs text-gray-600">Sesuai filter tipe dan tanggal pada halaman Performa.</p>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} data-autofocus
              className="px-5 py-2.5 rounded-xl border border-white/10 text-gray-300 hover:bg-white/5 transition-colors">Tutup</button>
            <button type="button" onClick={handleExport} data-testid="detail-export"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold hover:bg-gold-dark text-dark-primary font-semibold rounded-xl transition-all">
              <Download className="w-4 h-4" /> Export Excel
            </button>
          </div>
        </div>
      )}>
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'total', label: 'Total', value: row.total, color: 'text-white' },
            { key: 'overspeed', label: 'Overspeed', value: row.overspeed, color: 'text-orange-400' },
            { key: 'forced', label: 'Forced Brake', value: row.forcedBrake, color: 'text-red-400' },
          ].map((c) => (
            <div key={c.key} className="bg-dark-secondary rounded-xl border border-white/5 p-4" data-testid={`detail-${c.key}`}>
              <div className={`text-2xl font-bold font-mono ${c.value === null ? 'text-gray-600' : c.color}`}>{c.value === null ? '—' : c.value}</div>
              <div className="text-xs text-gray-500 mt-1">{c.label}</div>
            </div>
          ))}
        </div>

        {truncated && (
          <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3.5" data-testid="detail-truncated">
            <Info className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-200/90">
              Hanya {PERFORMANCE_EVENTS_LIMIT} event terbaru kendaraan ini yang dimuat. Event yang lebih lama tidak ikut terhitung.
            </p>
          </div>
        )}

        {!row.hasVehicle ? (
          <div className="py-10 text-center" data-testid="detail-no-vehicle">
            <Truck className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Pengemudi ini belum memiliki kendaraan.</p>
          </div>
        ) : !row.ready ? (
          <div className="py-10 text-center" data-testid="detail-unavailable">
            <AlertCircle className="w-8 h-8 text-yellow-500/80 mx-auto mb-2" />
            <p className="text-sm text-gray-300">Data event kendaraan ini belum termuat atau gagal dibaca.</p>
            <p className="text-xs text-gray-600 mt-1">Tutup rincian ini lalu buka lagi setelah halaman memuat ulang datanya.</p>
          </div>
        ) : detail.length === 0 ? (
          <div className="py-10 text-center" data-testid="detail-empty">
            <p className="text-sm text-gray-400">Tidak ada pelanggaran sesuai filter.</p>
          </div>
        ) : (
          <>
            <div className="sm:hidden rounded-xl border border-white/5 divide-y divide-white/[0.04] max-h-[45vh] overflow-auto" data-testid="detail-cards">
              {visible.map((r) => (
                <div key={r.id} data-testid="detail-card" className="p-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <TypeBadge type={r.type} label={r.typeLabel} />
                    <span className="text-xs text-gray-500">{formatDateTime(r.timestamp)}</span>
                  </div>
                  <p className="text-sm text-gray-300">{r.description}</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Kecepatan: <span className="text-gray-200"><Num value={r.speed} /> km/jam</span></span>
                    <span>Kemiringan Jalan: <span className="text-gray-200"><Num value={r.tilt} />%</span></span>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block rounded-xl border border-white/5 overflow-hidden">
              <div className="overflow-auto max-h-[45vh]">
                <table className="w-full text-sm" data-testid="detail-table">
                  <thead className="sticky top-0 bg-dark-secondary">
                    <tr className="border-b border-white/5">
                      {['Waktu', 'Tipe', 'Keterangan', 'Kecepatan (km/jam)', 'Kemiringan Jalan (%)'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-gray-300">
                    {visible.map((r) => (
                      <tr key={r.id} data-testid="detail-row" data-type={r.type}>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-400">{formatDateTime(r.timestamp)}</td>
                        <td className="px-4 py-3"><TypeBadge type={r.type} label={r.typeLabel} /></td>
                        <td className="px-4 py-3 min-w-[12rem]">{r.description}</td>
                        <td className="px-4 py-3"><Num value={r.speed} /></td>
                        <td className="px-4 py-3"><Num value={r.tilt} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span data-testid="detail-count">Menampilkan {visible.length} dari {detail.length}</span>
              {visible.length < detail.length && (
                <button type="button" onClick={() => setShown((n) => n + STEP)} data-testid="detail-more"
                  className="px-3 py-1.5 rounded-lg border border-white/10 text-gray-300 hover:bg-white/5 transition-colors">
                  Tampilkan lebih banyak
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}