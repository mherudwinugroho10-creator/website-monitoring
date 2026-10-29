import { Link } from 'react-router-dom';
import { Wifi, WifiOff, Loader2, AlertCircle, Truck } from 'lucide-react';
import { formatNumber } from '../../utils/vehicleLogic';
import { formatDateTime } from '../../utils/behaviorLogic';

const STATUS = {
  connected: { label: 'Terhubung', icon: Wifi, cls: 'bg-green-500/10 border-green-500/20 text-green-400' },
  disconnected: { label: 'Terputus', icon: WifiOff, cls: 'bg-red-500/10 border-red-500/20 text-red-400' },
  loading: { label: 'Memuat…', icon: Loader2, cls: 'bg-white/5 border-white/10 text-gray-400', spin: true },
  error: { label: 'Gagal memuat', icon: AlertCircle, cls: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' },
};
const TERRAIN = { flat: 'Datar', downhill: 'Menurun' };
const HEADERS = ['No.', 'Nama Kendaraan', 'Plat Nomor', 'Status Koneksi', 'Kecepatan (km/jam)', 'Kemiringan Jalan (%)', 'Status Exhaust Brake', 'Waktu Terakhir'];

function StatusChip({ status }) {
  const s = STATUS[status] || STATUS.loading;
  const Icon = s.icon;
  return (
    <span data-testid="fleet-status" data-status={status} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium whitespace-nowrap ${s.cls}`}>
      <Icon className={`w-3.5 h-3.5 ${s.spin ? 'animate-spin' : ''}`} />
      {s.label}
    </span>
  );
}

function Dash() {
  return <span className="text-gray-600">—</span>;
}

function SpeedCell({ row }) {
  if (row.speed === null) return <Dash />;
  return (
    <div data-testid="fleet-speed" data-overspeed={row.isOverspeed ? 'true' : 'false'}>
      <span className={`text-sm font-semibold font-mono ${row.isOverspeed ? 'text-red-400' : 'text-white'}`}>{formatNumber(row.speed, 2)}</span>
      {row.isOverspeed && <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 align-middle">OVERSPEED</span>}
      {row.activeLimit !== null
        ? <p className="text-[11px] text-gray-500 mt-0.5">batas {formatNumber(row.activeLimit, 2)}</p>
        : <p className="text-[11px] text-yellow-500/80 mt-0.5" data-testid="fleet-limit-missing">batas menurun belum diatur</p>}
    </div>
  );
}

function SlopeCell({ row }) {
  if (row.tilt === null) return <Dash />;
  return (
    <div data-testid="fleet-tilt">
      <span className="text-sm font-semibold font-mono text-white">{formatNumber(row.tilt, 2)}</span>
      {TERRAIN[row.terrain] && <p className="text-[11px] text-gray-500 mt-0.5">{TERRAIN[row.terrain]}</p>}
    </div>
  );
}

function ExhaustCell({ row }) {
  if (row.exhaust === null) return <Dash />;
  const on = row.exhaust === true;
  return (
    <span data-testid="fleet-exhaust" data-exhaust={on ? 'on' : 'off'}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap ${on ? 'bg-gold/10 border-gold/30 text-gold' : 'bg-white/5 border-white/10 text-gray-400'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${on ? 'bg-gold' : 'bg-gray-500'}`} />
      {on ? 'ON' : 'OFF'}
    </span>
  );
}

function VehicleName({ row }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className="w-9 h-9 rounded-lg bg-blue-500/10 items-center justify-center flex-shrink-0 hidden sm:flex xl:hidden 2xl:flex">
        <Truck className="w-4 h-4 text-blue-400" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-white truncate" data-testid="fleet-name">{row.name}</p>
        <p className="text-xs text-gray-500 truncate">
          {row.driverName}
          {row.pending && <span className="ml-1.5 text-yellow-400">(menunggu pendaftaran)</span>}
          {!row.pending && row.driverStatus === 'inactive' && <span className="ml-1.5 text-gray-600">(nonaktif)</span>}
        </p>
      </div>
    </div>
  );
}

// Tabel "Data Monitoring Realtime – Seluruh Kendaraan" (Gambar III.19) (tabel di layar lebar, kartu di ponsel).
export default function FleetTable({ rows, loading }) {
  if (loading) {
    return (
      <div className="py-16 flex flex-col items-center gap-3" data-testid="fleet-loading">
        <Loader2 className="w-6 h-6 text-gray-500 animate-spin" />
        <p className="text-sm text-gray-500">Memuat daftar kendaraan…</p>
      </div>
    );
  }
  if (rows.length === 0) {
    return (
      <div className="py-14 flex flex-col items-center gap-3 text-center px-4" data-testid="fleet-empty">
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
          <Truck className="w-6 h-6 text-gray-600" />
        </div>
        <p className="text-sm text-gray-400">Belum ada kendaraan terdaftar</p>
        <p className="text-xs text-gray-600 max-w-sm">
          Kendaraan muncul setelah pengemudi ditambahkan beserta ID kendaraannya di{' '}
          <Link to="/admin/drivers" className="text-gold hover:underline">Kelola Pengemudi</Link>.
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="hidden xl:block overflow-x-auto" data-testid="fleet-table">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5">
              {HEADERS.map((h) => (
                <th key={h} className="px-2.5 py-3.5 text-left align-bottom text-[11px] font-semibold text-gray-500 uppercase tracking-wide leading-snug">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {rows.map((r, i) => (
              <tr key={r.vehicleId} data-testid="fleet-row" data-vehicle={r.vehicleId} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-2.5 py-3.5 text-sm text-gray-500">{i + 1}</td>
                <td className="px-2.5 py-3.5"><VehicleName row={r} /></td>
                <td className="px-2.5 py-3.5 text-sm text-gray-300 whitespace-nowrap" data-testid="fleet-plate">{r.plate || <Dash />}</td>
                <td className="px-2.5 py-3.5"><StatusChip status={r.status} /></td>
                <td className="px-2.5 py-3.5"><SpeedCell row={r} /></td>
                <td className="px-2.5 py-3.5"><SlopeCell row={r} /></td>
                <td className="px-2.5 py-3.5"><ExhaustCell row={r} /></td>
                <td className="px-2.5 py-3.5 text-sm text-gray-400 whitespace-nowrap" data-testid="fleet-last">{formatDateTime(r.lastUpdate)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3 p-4" data-testid="fleet-cards">
        {rows.map((r) => (
          <div key={r.vehicleId} data-testid="fleet-card" data-vehicle={r.vehicleId} className="bg-dark-primary/40 border border-white/5 rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <VehicleName row={r} />
              <StatusChip status={r.status} />
            </div>
            <p className="text-xs text-gray-500">Plat nomor: <span className="text-gray-300">{r.plate || '—'}</span></p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-secondary rounded-xl p-3">
                <p className="text-[11px] text-gray-500 mb-1">Kecepatan (km/jam)</p>
                <SpeedCell row={r} />
              </div>
              <div className="bg-dark-secondary rounded-xl p-3">
                <p className="text-[11px] text-gray-500 mb-1">Kemiringan Jalan (%)</p>
                <SlopeCell row={r} />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3 bg-dark-secondary rounded-xl px-3 py-2.5">
              <p className="text-[11px] text-gray-500">Status Exhaust Brake</p>
              <ExhaustCell row={r} />
            </div>
            <p className="text-xs text-gray-500">Waktu terakhir: <span className="text-gray-400">{formatDateTime(r.lastUpdate)}</span></p>
          </div>
        ))}
      </div>
    </>
  );
}