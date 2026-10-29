import { useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Gauge, Shield, Wifi, WifiOff, Loader2, AlertCircle, Truck, Settings } from 'lucide-react';
import { useAlertContext } from '../../context/AlertContext';
import { useServerClock, useDayStart, useRerenderAt, useDirectory, useFleetLive, useFleetTodayEvents } from '../../hooks/useAdminData';
import {
  buildFleet, fleetVehicleIds, vehicleLabel, buildFleetAlerts, nextFleetAlertExpiryMs, collectNewEvents,
  fleetTodayCounts, buildFleetRows, summarizeFleet, nextConnectionCheckMs,
} from '../../utils/adminLogic';
import { describeEvent } from '../../utils/vehicleLogic';
import FleetAlertPanel from '../../components/admin/FleetAlertPanel';
import FleetTable from '../../components/admin/FleetTable';

function formatDay(ms) {
  return new Date(ms).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function earliest(a, b) {
  if (a === null) return b;
  if (b === null) return a;
  return Math.min(a, b);
}

function ErrorBanner({ children, testId }) {
  return (
    <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4" role="alert" data-testid={testId}>
      <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
      <div className="text-sm text-red-300 min-w-0">{children}</div>
    </div>
  );
}

export default function AdminDashboard() {
  const { addNotification } = useAlertContext();
  const directory = useDirectory();
  const fleet = useMemo(() => buildFleet(directory.users, directory.invites), [directory.users, directory.invites]);
  const ids = useMemo(() => fleetVehicleIds(fleet), [fleet]);

  const { serverNow, offset } = useServerClock();
  const dayStart = useDayStart(offset);
  const live = useFleetLive(ids);
  const today = useFleetTodayEvents(ids, dayStart);

  // ── Notifikasi lonceng untuk event baru di kendaraan mana pun ─
  // Pembacaan pertama tiap kendaraan hanya menjadi dasar; hanya event yang masuk sesudahnya (dan masih baru) dibunyikan.
  const seenRef = useRef(new Map());
  const notifyRef = useRef(addNotification);
  useEffect(() => { notifyRef.current = addNotification; }, [addNotification]);
  useEffect(() => {
    const { fresh, seen } = collectNewEvents(seenRef.current, today.eventsById, today.loadedById, serverNow());
    seenRef.current = seen;
    if (!notifyRef.current) return;
    for (const { vehicleId, event } of fresh) {
      const vehicle = fleet.find((v) => v.vehicleId === vehicleId);
      const d = describeEvent(event);
      notifyRef.current({
        type: event.type,
        severity: event.severity,
        message: `${vehicle ? vehicleLabel(vehicle) : vehicleId}: ${d.title}`,
        details: d.details,
      });
    }
  }, [today.eventsById, today.loadedById, fleet, serverNow]);

  // ── Turunan tampilan (dihitung ulang tiap render dengan jam server) ─
  const nowMs = serverNow();
  const liveErrorIds = new Set(live.liveErrors.map((e) => e.vehicleId));
  const rows = buildFleetRows(fleet, live.liveById, live.settingsById, nowMs).map((r) => (
    liveErrorIds.has(r.vehicleId) ? { ...r, status: 'error', connected: false } : r
  ));
  const summary = summarizeFleet(rows);
  const alerts = buildFleetAlerts(today.eventsById, fleet, nowMs);
  const counts = fleetTodayCounts(today.eventsById, today.loadedById, ids);

  useRerenderAt(earliest(nextFleetAlertExpiryMs(today.eventsById, nowMs), nextConnectionCheckMs(live.liveById, nowMs)));

  const directoryLoading = !directory.loaded;
  const countsReady = directory.loaded && counts.ready;
  const cards = [
    { key: 'overspeed', title: 'Overspeed', icon: Gauge, color: 'text-orange-400', bg: 'bg-orange-500/10', value: countsReady ? counts.overspeed : null },
    { key: 'forced_brake', title: 'Forced Brake', icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10', value: countsReady ? counts.forcedBrake : null },
  ];

  const labelOf = (vehicleId) => {
    const v = fleet.find((x) => x.vehicleId === vehicleId);
    return v ? vehicleLabel(v) : vehicleId;
  };
  const todayErrorIds = [...new Set(today.errors.map((e) => e.vehicleId))];
  const settingsErrorIds = [...new Set(live.settingsErrors.map((e) => e.vehicleId))];

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Pantau seluruh kendaraan secara realtime.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" data-testid="fleet-summary">
          <span data-testid="chip-connected" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-green-500/10 border-green-500/20 text-green-400 text-sm font-medium">
            <Wifi className="w-4 h-4" /> {summary.connected} terhubung
          </span>
          <span data-testid="chip-disconnected" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border bg-red-500/10 border-red-500/20 text-red-400 text-sm font-medium">
            <WifiOff className="w-4 h-4" /> {summary.disconnected} terputus
          </span>
        </div>
      </div>

      {directory.error && <ErrorBanner testId="directory-error">{directory.error}</ErrorBanner>}
      {directory.invitesError && !directory.error && <ErrorBanner testId="invites-error">{directory.invitesError}</ErrorBanner>}

      <div>
        <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 mb-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Kejadian Hari Ini</h2>
          <p className="text-xs text-gray-600" data-testid="today-date">{formatDay(dayStart)} · seluruh kendaraan</p>
        </div>
        {todayErrorIds.length > 0 && (
          <div className="mb-3">
            <ErrorBanner testId="today-error">Gagal membaca kejadian hari ini untuk: {todayErrorIds.map(labelOf).join(', ')}. Angka di bawah belum lengkap.</ErrorBanner>
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {cards.map((c) => (
            <div key={c.key} data-testid={`today-${c.key}`} className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div className={`text-3xl font-bold font-mono ${c.value === null ? 'text-gray-600' : c.color}`} data-testid={`today-${c.key}-value`}>
                {c.value === null ? '—' : c.value}
              </div>
              <div className="text-xs text-gray-500 mt-1">{c.title}</div>
            </div>
          ))}
        </div>
      </div>

      <FleetAlertPanel alerts={alerts} nowMs={nowMs} vehicleCount={ids.length} ready={countsReady} />

      <div className="bg-dark-secondary rounded-2xl border border-white/5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-5 border-b border-white/5">
          <div>
            <h2 className="text-base font-semibold text-white flex items-start gap-2">
              <Truck className="w-4 h-4 text-gold flex-shrink-0 mt-1" /> <span>Data Monitoring Realtime – Seluruh Kendaraan</span>
            </h2>
            <p className="text-xs text-gray-500 mt-1">Diperbarui otomatis. Kendaraan dianggap terputus bila tidak mengirim data lebih dari 15 detik.</p>
          </div>
          <Link to="/admin/settings" className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gold transition-colors">
            <Settings className="w-3.5 h-3.5" /> Atur batas kecepatan
          </Link>
        </div>
        {settingsErrorIds.length > 0 && (
          <div className="p-4 border-b border-white/5">
            <ErrorBanner testId="settings-error">Batas kecepatan gagal dibaca untuk: {settingsErrorIds.map(labelOf).join(', ')}. Penanda overspeed pada tabel memakai batas standar 80 km/jam untuk jalan datar.</ErrorBanner>
          </div>
        )}
        <FleetTable rows={rows} loading={directoryLoading} />
        {!directoryLoading && rows.length > 0 && live.liveLoaded && Object.keys(live.liveLoaded).length < ids.length && (
          <div className="px-5 py-3 border-t border-white/5 flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Menunggu data dari kendaraan…
          </div>
        )}
      </div>
    </div>
  );
}