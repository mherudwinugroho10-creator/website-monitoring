import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Gauge, Shield, ShieldCheck } from 'lucide-react';
import { DANGER_WINDOW_MS, severityRank } from '../../utils/vehicleLogic';
import { playAlertSound } from '../../utils/alertSound';

const STYLES = {
  critical: { border: 'border-red-600', badge: 'bg-red-600 text-white', text: 'text-red-400', bar: 'bg-red-600', iconBg: 'bg-red-500/15' },
  danger: { border: 'border-red-500/70', badge: 'bg-red-500 text-white', text: 'text-red-400', bar: 'bg-red-500', iconBg: 'bg-red-500/15' },
  warning: { border: 'border-yellow-500/70', badge: 'bg-yellow-500 text-dark-primary', text: 'text-yellow-400', bar: 'bg-yellow-500', iconBg: 'bg-yellow-500/15' },
};
const TYPE_ICON = { overspeed: Gauge, forced_brake: Shield };

// Satu peringatan kendaraan. Lama bilah waktu dihitung sekali saat peringatan muncul (key = event terbarunya),
// agar animasinya tidak melompat ketika halaman dirender ulang.
function AlertRow({ item, nowMs }) {
  const [barMs] = useState(() => Math.max(0, item.alert.newestTimestamp + DANGER_WINDOW_MS - nowMs));
  const st = STYLES[item.alert.severity] || STYLES.warning;
  return (
    <div className={`bg-dark-primary/60 border-2 ${st.border} rounded-xl overflow-hidden`} data-testid="fleet-alert-item" data-vehicle={item.vehicleId} data-severity={item.alert.severity}>
      <div className="h-1 bg-white/[0.04]">
        <div className={`h-full ${st.bar}`} style={{ animation: `fleetAlertBar ${barMs}ms linear forwards` }} />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate" data-testid="fleet-alert-vehicle">{item.label}</p>
            <p className="text-xs text-gray-500 truncate">{item.driverName}</p>
          </div>
          <span className={`flex items-center gap-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${st.badge}`}>
            <AlertTriangle className="w-3 h-3" />
            {item.alert.severityLabel}
          </span>
        </div>
        <div className="space-y-2.5">
          {item.alert.items.map((it) => {
            const Icon = TYPE_ICON[it.type] || AlertTriangle;
            return (
              <div key={it.type} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${st.iconBg}`}>
                  <Icon className={`w-4 h-4 ${st.text}`} />
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${st.text}`}>
                    {it.label}
                    {it.count > 1 && <span className="ml-1.5 text-xs font-normal text-gray-500">×{it.count}</span>}
                  </p>
                  {it.details && <p className="text-xs text-gray-400 mt-0.5">{it.details}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Area notifikasi DangerAlert Dashboard Admin: peringatan otomatis untuk event overspeed / forced brake yang
// berumur <= 5 detik (jam server) pada kendaraan mana pun, lalu hilang sendiri. Bunyi sekali per event baru.
export default function FleetAlertPanel({ alerts, nowMs, vehicleCount, ready }) {
  const soundedRef = useRef(new Set());

  useEffect(() => {
    let fresh = 0;
    let severity = 'warning';
    for (const a of alerts) {
      for (const id of a.alert.ids) {
        const key = `${a.vehicleId}/${id}`;
        if (soundedRef.current.has(key)) continue;
        soundedRef.current.add(key);
        fresh += 1;
        // Bunyi mengikuti tingkat event yang baru masuk, bukan event lama pada peringatan yang sama.
        const item = a.alert.items.find((it) => it.event.id === id);
        const eventSeverity = item ? item.event.severity : a.alert.severity;
        if (severityRank(eventSeverity) > severityRank(severity)) severity = eventSeverity;
      }
    }
    if (fresh > 0) playAlertSound(severity);
  }, [alerts]);

  const active = alerts.length > 0;

  return (
    <section className={`bg-dark-secondary rounded-2xl border p-5 transition-colors ${active ? 'border-red-500/40' : 'border-white/5'}`}
      aria-label="DangerAlert" data-testid="fleet-alert-panel" data-active={active ? 'true' : 'false'}>
      <style>{'@keyframes fleetAlertBar { from { width: 100% } to { width: 0% } }'}</style>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${active ? 'text-red-400' : 'text-gray-500'}`} />
          DangerAlert
          <span className="text-xs font-normal text-gray-500">(Notifikasi Otomatis)</span>
        </h2>
        {active && <span className="text-xs text-red-400 font-medium animate-pulse" role="status">{alerts.length} kendaraan</span>}
      </div>
      {active ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3" role="alert" aria-live="assertive">
          {alerts.map((a) => <AlertRow key={`${a.vehicleId}|${a.alert.newestTimestamp}`} item={a} nowMs={nowMs} />)}
        </div>
      ) : (
        <div className="flex items-center gap-3 py-3" data-testid="fleet-alert-idle">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-sm text-gray-300">{ready ? 'Tidak ada peringatan aktif' : 'Menyiapkan pemantauan…'}</p>
            <p className="text-xs text-gray-600 mt-0.5">
              {vehicleCount > 0
                ? `Memantau ${vehicleCount} kendaraan. Peringatan muncul otomatis saat ada overspeed atau forced brake baru.`
                : 'Peringatan muncul otomatis saat kendaraan mengirim overspeed atau forced brake.'}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}