import { Gauge, Mountain, ArrowUpDown, Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useVehicle } from '../../context/VehicleContext';
import { formatNumber, brakeState, terrainLabel, describeLimit } from '../../utils/vehicleLogic';
import Speedometer from '../../components/monitoring/Speedometer';
import TiltIndicator from '../../components/monitoring/TiltIndicator';
import BrakeStatus from '../../components/monitoring/BrakeStatus';
import SpeedChart from '../../components/monitoring/SpeedChart';
import DangerAlert from '../../components/monitoring/DangerAlert';
import NoVehicleNotice from '../../components/common/NoVehicleNotice';

function formatClock(ms) {
  return new Date(ms).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function StatCard({ icon: Icon, title, value, unit, note, tone = 'normal', testId }) {
  const danger = tone === 'danger';
  return (
    <div data-testid={testId}
      className={`bg-dark-secondary rounded-xl border p-4 transition-all duration-300 ${danger ? 'border-red-500/50 bg-red-500/5' : 'border-white/5'}`}>
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs">{title}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold font-mono ${danger ? 'text-red-400' : value === '—' ? 'text-gray-600' : 'text-white'}`}>{value}</span>
        <span className="text-sm text-gray-500">{unit}</span>
      </div>
      {note && <p className="text-[11px] text-gray-500 mt-1.5 truncate">{note}</p>}
    </div>
  );
}

export default function LiveMonitoring() {
  const { userData } = useAuth();
  const {
    hasVehicle, loaded, dataError, isConnected, liveData, speed, tilt, terrain, limits, activeLimit, isOverspeed,
    events, speedHistory, serverNow, lastUpdate, latencyMs,
  } = useVehicle();

  const vehicleLabel = [userData?.vehicleName, userData?.vehiclePlate].filter(Boolean).join(' · ');
  const state = brakeState(liveData);
  const limitNote = describeLimit(terrain, limits, activeLimit);

  const chip = !loaded
    ? { cls: 'bg-white/5 border-white/10 text-gray-400', icon: Loader2, text: 'Memuat data…', spin: true }
    : isConnected
      ? { cls: 'bg-green-500/10 border-green-500/30 text-green-400', icon: Wifi, text: 'Terhubung' }
      : { cls: 'bg-red-500/10 border-red-500/30 text-red-400', icon: WifiOff, text: 'Terputus' };
  const ChipIcon = chip.icon;

  return (
    <>
      {hasVehicle && <DangerAlert events={events} serverNow={serverNow} />}

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Live Monitoring</h1>
            <p className="text-gray-400 mt-1">{vehicleLabel || 'Data sensor kendaraan secara realtime.'}</p>
          </div>
          {hasVehicle && (
            <div className="flex flex-col items-start sm:items-end gap-1">
              <div data-testid="connection-chip" className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${chip.cls}`}>
                <ChipIcon className={`w-4 h-4 ${chip.spin ? 'animate-spin' : ''}`} />
                <span className="text-sm font-medium">{chip.text}</span>
              </div>
              {lastUpdate !== null && (
                <p data-testid="last-update" className="text-[11px] text-gray-500">
                  Pembaruan terakhir {formatClock(lastUpdate)}
                  {latencyMs !== null && ` · Latensi ${formatNumber(latencyMs / 1000, 2)} dtk`}
                </p>
              )}
            </div>
          )}
        </div>

        {!hasVehicle ? (
          <NoVehicleNotice />
        ) : (
          <>
            {dataError && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4" role="alert">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{dataError}</p>
              </div>
            )}
            {loaded && !isConnected && !dataError && (
              <div data-testid="offline-banner" className="flex items-start gap-3 bg-white/[0.03] border border-white/10 rounded-xl p-4">
                <WifiOff className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-200">Perangkat tidak mengirim data.</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {lastUpdate !== null
                      ? `Data terakhir diterima pukul ${formatClock(lastUpdate)}. Tampilan pulih otomatis saat data masuk.`
                      : 'Belum ada data dari perangkat kendaraan ini. Tampilan akan terisi otomatis saat data masuk.'}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard icon={Gauge} title="Kecepatan" testId="card-speed"
                value={isConnected ? formatNumber(speed, 2) : '—'} unit="km/jam"
                tone={isOverspeed ? 'danger' : 'normal'} />
              <StatCard icon={Mountain} title="Kemiringan" testId="card-tilt"
                value={isConnected ? formatNumber(tilt, 2) : '—'} unit="%"
                note={isConnected && terrain !== 'unknown' ? terrainLabel(terrain) : null} />
              <StatCard icon={ArrowUpDown} title="Batas Kecepatan" testId="card-limit"
                value={activeLimit === null ? '—' : formatNumber(activeLimit, 2)} unit="km/jam" note={limitNote} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className={`bg-dark-secondary rounded-2xl border p-6 transition-all duration-300 ${isOverspeed ? 'border-red-500/30' : 'border-white/5'}`} data-testid="panel-speedometer">
                <h3 className="text-base font-semibold text-white mb-4">Speedometer</h3>
                <Speedometer speed={speed} limit={activeLimit} limitNote={limitNote} connected={isConnected} />
              </div>

              <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6" data-testid="panel-tilt">
                <h3 className="text-base font-semibold text-white mb-4">Kemiringan Jalan</h3>
                <TiltIndicator tilt={tilt} terrain={terrain} connected={isConnected} />
              </div>

              <div className={`bg-dark-secondary rounded-2xl border p-6 transition-all duration-300 ${state === 'forced' ? 'border-red-500/30' : 'border-white/5'}`} data-testid="panel-brake">
                <h3 className="text-base font-semibold text-white mb-4">Status Pengereman</h3>
                <BrakeStatus state={state} exhaustActive={liveData ? liveData.brake.exhaust_active : false}
                  forcedActive={liveData ? liveData.brake.forced : false} />
              </div>
            </div>

            <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6" data-testid="panel-chart">
              <h3 className="text-base font-semibold text-white mb-4">Grafik Riwayat Kecepatan</h3>
              <SpeedChart data={speedHistory} connected={isConnected} />
            </div>
          </>
        )}
      </div>
    </>
  );
}