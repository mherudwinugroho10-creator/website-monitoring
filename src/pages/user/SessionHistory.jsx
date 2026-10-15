import { useState } from 'react';
import { ChevronDown, ChevronRight, Activity, Gauge, Shield, Mountain, Download, Clock } from 'lucide-react';
import { useVehicle } from '../../context/VehicleContext';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

function formatTs(ts) {
  if (!ts) return '-';
  return new Date(ts).toLocaleString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function formatDuration(startTs, endTs) {
  if (!startTs) return '-';
  const end = endTs && endTs > 0 ? endTs : Date.now();
  const sec = Math.floor((end - startTs) / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m} menit ${s} detik`;
}

function getTypeColor(type) {
  return type === 'overspeed'    ? 'bg-orange-500/10 text-orange-400'
    : type === 'forced_brake' ? 'bg-red-500/10 text-red-400'
    : type === 'steep_slope'  ? 'bg-blue-500/10 text-blue-400'
    : 'bg-gray-500/10 text-gray-400';
}

function getTypeLabel(type) {
  return type === 'overspeed'    ? 'Overspeed'
    : type === 'forced_brake' ? 'Forced Brake'
    : type === 'steep_slope'  ? 'Turunan Ekstrem'
    : type;
}

function SessionCard({ session }) {
  const [open, setOpen] = useState(false);
  const { meta, events, behaviorLog } = session;

  const overspeed    = events.filter((e) => e.type === 'overspeed').length;
  const forcedBrake  = events.filter((e) => e.type === 'forced_brake').length;
  const steepSlope   = events.filter((e) => e.type === 'steep_slope').length;
  const isActive     = !meta.endTime || meta.endTime === 0;

  // Data grafik kecepatan dari behaviorLog
  const chartData = {
    labels: behaviorLog.map((b) => {
      const sec = b.elapsedSec || 0;
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m}:${String(s).padStart(2, '0')}`;
    }),
    datasets: [
      {
        label: 'Kecepatan (km/jam)',
        data: behaviorLog.map((b) => b.speed || 0),
        borderColor: '#fbbf24',
        backgroundColor: 'rgba(251,191,36,0.08)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      },
    ],
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
        [`Sesi: ${meta.label || session.key}`],
        [`Mulai: ${formatTs(meta.startTime)}`],
        [`Selesai: ${meta.endTime ? formatTs(meta.endTime) : 'Masih Aktif'}`],
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
        ['Waktu', 'Elapsed (detik)', 'Kecepatan (km/jam)', 'Kemiringan (°)', 'Forced Brake', 'Jumlah Event'],
        ...behaviorLog.map((b) => [
          formatTs(b.timestamp),
          b.elapsedSec || 0,
          b.speed ?? '-',
          b.tilt  ?? '-',
          b.forcedBrake ? 'Ya' : 'Tidak',
          b.eventCount || 0,
        ]),
      ];
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = [{ wch: 22 }, { wch: 15 }, { wch: 50 }, { wch: 18 }, { wch: 14 }];
      XLSX.utils.book_append_sheet(wb, ws, meta.label || session.key);
      XLSX.writeFile(wb, `sesi_${session.key}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Data sesi berhasil diekspor!');
    } catch (err) {
      toast.error('Gagal ekspor: ' + err.message);
    }
  }

  return (
    <div className="bg-dark-secondary rounded-2xl border border-white/5 overflow-hidden">
      {/* Header kartu sesi */}
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`} />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">{meta.label || session.key}</h3>
              {isActive && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 font-medium">
                  Aktif
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTs(meta.startTime)}
              </span>
              <span>{formatDuration(meta.startTime, meta.endTime)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Ringkasan event */}
          <div className="hidden sm:flex items-center gap-3">
            <span className={`text-xs font-medium ${overspeed   > 0 ? 'text-orange-400' : 'text-gray-600'}`}>{overspeed}x OS</span>
            <span className={`text-xs font-medium ${forcedBrake > 0 ? 'text-red-400'    : 'text-gray-600'}`}>{forcedBrake}x FB</span>
            <span className={`text-xs font-medium ${steepSlope  > 0 ? 'text-blue-400'   : 'text-gray-600'}`}>{steepSlope}x SS</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); exportSession(); }}
            className="p-2 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold transition-colors"
            title="Export Excel"
          >
            <Download className="w-4 h-4" />
          </button>
          {open
            ? <ChevronDown className="w-5 h-5 text-gray-400" />
            : <ChevronRight className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {/* Detail sesi */}
      {open && (
        <div className="border-t border-white/5 p-5 space-y-6">

          {/* Grafik kecepatan */}
          {behaviorLog.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-gold" />
                Grafik Kecepatan Sesi
                <span className="text-xs text-gray-500 font-normal">(interval 1 menit)</span>
              </h4>
              <div className="h-48 bg-dark-primary/50 rounded-xl p-3">
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 text-sm">
              Belum ada data behavior log untuk sesi ini
            </div>
          )}

          {/* Daftar event sesi */}
          {events.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">
                Event Sesi ({events.length})
              </h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {events
                  .sort((a, b) => b.timestamp - a.timestamp)
                  .map((evt) => (
                    <div key={evt.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(evt.type)}`}>
                        {getTypeLabel(evt.type)}
                      </span>
                      <span className="text-sm text-gray-300 flex-1 truncate">{evt.message}</span>
                      <span className="text-xs text-gray-500 whitespace-nowrap">{formatTs(evt.timestamp)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Behavior log tabel */}
          {behaviorLog.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-white mb-3">
                Behavior Log ({behaviorLog.length} snapshot)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="text-left px-3 py-2 text-xs text-gray-500">Waktu</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-500">Elapsed</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-500">Kecepatan</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-500">Kemiringan</th>
                      <th className="text-left px-3 py-2 text-xs text-gray-500">Event</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {behaviorLog.map((b) => {
                      const sec = b.elapsedSec || 0;
                      const elapsed = `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
                      return (
                        <tr key={b.id} className="hover:bg-white/[0.02]">
                          <td className="px-3 py-2 text-gray-400 text-xs whitespace-nowrap">{formatTs(b.timestamp)}</td>
                          <td className="px-3 py-2 text-gray-400 text-xs">{elapsed}</td>
                          <td className="px-3 py-2">
                            <span className="text-white font-semibold">{b.speed ?? '-'}</span>
                            <span className="text-gray-500 text-xs ml-1">km/jam</span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-white font-semibold">{b.tilt ?? '-'}</span>
                            <span className="text-gray-500 text-xs ml-1">°</span>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-400">{b.eventCount || 0} event</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SessionHistory() {
  const { sessions } = useVehicle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Riwayat Sesi</h1>
        <p className="text-gray-400 mt-1">
          Setiap kali ESP32 terhubung tercatat sebagai satu sesi terpisah.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-12 text-center">
          <Activity className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Belum ada sesi tercatat</p>
          <p className="text-xs text-gray-600 mt-1">Hubungkan ESP32 untuk memulai sesi pertama</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session) => (
            <SessionCard key={session.key} session={session} />
          ))}
        </div>
      )}
    </div>
  );
}