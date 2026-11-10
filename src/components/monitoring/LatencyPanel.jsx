import { useMemo, useState, useRef, useEffect } from 'react';
import { Timer, Copy, Trash2, ChevronDown } from 'lucide-react';
import { formatNumber } from '../../utils/vehicleLogic';
import { summarizeLatency, formatClockMs, latencyToTsv, LATENCY_SAMPLES_MAX } from '../../utils/latencyLogic';

function ms(v) {
  return `${formatNumber(Math.round(v), 0)} ms`;
}

function Tile({ label, value, sub, testId }) {
  return (
    <div data-testid={testId} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-lg font-bold font-mono text-white mt-1 break-all">{value}</p>
      {sub && <p className="text-[11px] text-gray-500 mt-0.5 break-all">{sub}</p>}
    </div>
  );
}

// Panel pengukuran latensi: memperlihatkan PROSES perhitungan (jam server saat alat menulis,
// jam server saat browser menerima, selisihnya) dan seluruh sampel yang tercatat sejak halaman dibuka.
export default function LatencyPanel({ samples, onClear }) {
  const [copyState, setCopyState] = useState('idle'); // 'idle' | 'ok' | 'fail'
  const timerRef = useRef(null);
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const stats = useMemo(() => summarizeLatency(samples), [samples]);
  const latest = samples.length ? samples[samples.length - 1] : null;
  const rows = useMemo(() => [...samples].reverse(), [samples]);

  const flash = (state) => {
    setCopyState(state);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopyState('idle'), 2500);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(latencyToTsv(samples));
      flash('ok');
    } catch {
      flash('fail');
    }
  };

  return (
    <details data-testid="latency-panel" className="bg-dark-secondary rounded-2xl border border-white/5 group">
      <summary className="flex items-center justify-between gap-3 cursor-pointer select-none p-6 list-none">
        <span className="flex items-center gap-2 text-base font-semibold text-white">
          <Timer className="w-4 h-4 text-gray-400" />
          Pengukuran Latensi
          <span className="text-xs font-normal text-gray-500">(untuk pengujian)</span>
        </span>
        <span className="flex items-center gap-3">
          <span data-testid="latency-count" className="text-xs text-gray-400 font-mono">n = {stats.n}</span>
          <ChevronDown className="w-4 h-4 text-gray-500 transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <div className="px-6 pb-6 space-y-4">
        <p className="text-xs text-gray-500 leading-relaxed">
          Latensi = jam saat browser menerima data − timestamp server saat alat menulis. Keduanya jam server Firebase:
          jam browser dikoreksi dengan selisih jam PC terhadap server (<span className="font-mono">.info/serverTimeOffset</span>).
          Satu sampel dicatat tiap pembaruan live baru setelah halaman ini dibuka (maksimal {LATENCY_SAMPLES_MAX} sampel; hilang bila halaman dimuat ulang).
        </p>

        {!latest ? (
          <p data-testid="latency-empty" className="text-sm text-gray-400">
            Belum ada sampel. Tunggu pembaruan data live berikutnya dari alat.
          </p>
        ) : (
          <>
            <div data-testid="latency-latest" className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Tile testId="latency-server" label="Alat menulis (timestamp server)" value={formatClockMs(latest.serverTs)} sub={`epoch ${latest.serverTs}`} />
              <Tile testId="latency-received" label="Browser menerima (jam server)" value={formatClockMs(latest.receivedAt)} sub={`epoch ${latest.receivedAt}`} />
              <Tile testId="latency-diff" label="Selisih = latensi" value={ms(latest.diffMs)} sub={`${formatNumber(latest.diffMs / 1000, 3)} dtk`} />
            </div>
            <p data-testid="latency-formula" className="text-xs text-gray-400 font-mono break-all">
              {formatClockMs(latest.receivedAt)} − {formatClockMs(latest.serverTs)} = {ms(latest.diffMs)}
              {' · '}offset jam PC {ms(latest.offsetMs)}
            </p>

            <div data-testid="latency-stats" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Tile label="Jumlah sampel (n)" value={String(stats.n)} />
              <Tile label="Rata-rata" value={ms(stats.meanMs)} sub={`${formatNumber(stats.meanMs / 1000, 3)} dtk`} />
              <Tile label="Terkecil" value={ms(stats.minMs)} />
              <Tile label="Terbesar" value={ms(stats.maxMs)} />
            </div>
            {stats.negative > 0 && (
              <p data-testid="latency-negative" className="text-xs text-yellow-500/90">
                {stats.negative} sampel bernilai negatif: estimasi selisih jam PC terhadap server belum presisi.
                Sinkronkan jam PC (Windows: Pengaturan → Waktu &amp; bahasa → Sinkronkan sekarang) lalu muat ulang halaman.
              </p>
            )}

            <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-white/5">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-dark-secondary text-gray-400">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">No</th>
                    <th className="px-3 py-2 font-medium">Alat menulis</th>
                    <th className="px-3 py-2 font-medium">Browser menerima</th>
                    <th className="px-3 py-2 font-medium text-right">Latensi (ms)</th>
                    <th className="px-3 py-2 font-medium text-right">Kecepatan (km/jam)</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-gray-200">
                  {rows.map((s) => (
                    <tr key={s.seq} data-testid="latency-row" className="border-t border-white/5">
                      <td className="px-3 py-1.5">{s.seq}</td>
                      <td className="px-3 py-1.5">{formatClockMs(s.serverTs)}</td>
                      <td className="px-3 py-1.5">{formatClockMs(s.receivedAt)}</td>
                      <td className={`px-3 py-1.5 text-right ${s.diffMs < 0 ? 'text-yellow-500' : ''}`}>{formatNumber(Math.round(s.diffMs), 0)}</td>
                      <td className="px-3 py-1.5 text-right">{s.speed === null ? '—' : formatNumber(s.speed, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" data-testid="latency-copy" onClick={copy} disabled={!latest}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs text-gray-200 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed">
            <Copy className="w-3.5 h-3.5" />
            Salin tabel (untuk Excel)
          </button>
          <button type="button" data-testid="latency-clear" onClick={onClear} disabled={!latest}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-xs text-gray-200 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed">
            <Trash2 className="w-3.5 h-3.5" />
            Hapus sampel
          </button>
          {copyState === 'ok' && <span data-testid="latency-copy-state" className="text-xs text-green-400">Tersalin ({stats.n} sampel).</span>}
          {copyState === 'fail' && <span data-testid="latency-copy-state" className="text-xs text-red-400">Gagal menyalin. Izinkan akses papan klip lalu coba lagi.</span>}
        </div>
      </div>
    </details>
  );
}