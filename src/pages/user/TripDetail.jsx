import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Gauge, Shield, AlertTriangle, Download, Calendar, Route } from 'lucide-react';
import { toast } from 'react-toastify';

export default function TripDetail() {
  var params = useParams();
  var tripId = params.tripId;

  var [trip, setTrip] = useState(null);
  var [incidents, setIncidents] = useState([]);

  useEffect(function () {
    var now = new Date();
    var startTime = new Date(now.getTime() - 3600000);
    var duration = 65;

    setTrip({
      id: tripId,
      route_from: 'Semarang',
      route_to: 'Solo',
      start_time: startTime,
      end_time: new Date(startTime.getTime() + duration * 60000),
      duration: duration,
      distance: 96.5,
      avg_speed: 42.3,
      max_speed: 72.1,
      safety_score: 85,
      vehicle_id: 'TRUCK_001',
      vehicle_name: 'Truck Hino 500',
    });

    setIncidents([
      { id: 1, time: new Date(startTime.getTime() + 900000), type: 'overspeed', message: 'Kecepatan 68 km/h melebihi batas 60 km/h', severity: 'warning' },
      { id: 2, time: new Date(startTime.getTime() + 1800000), type: 'harsh_braking', message: 'Pengereman mendadak terdeteksi (-4.2 m/s²)', severity: 'warning' },
      { id: 3, time: new Date(startTime.getTime() + 2700000), type: 'auto_brake', message: 'Sistem pengereman otomatis diaktifkan', severity: 'danger' },
    ]);
  }, [tripId]);

  function getScoreColor(score) {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  }

  function getScoreBg(score) {
    if (score >= 80) return 'bg-green-500/10 border-green-500/20';
    if (score >= 60) return 'bg-yellow-500/10 border-yellow-500/20';
    return 'bg-red-500/10 border-red-500/20';
  }

  function getScoreLabel(score) {
    if (score >= 80) return 'Baik';
    if (score >= 60) return 'Cukup';
    return 'Perlu Perbaikan';
  }

  function formatDuration(mins) {
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    if (h > 0) return h + ' jam ' + m + ' menit';
    return m + ' menit';
  }

  function exportPDF() {
    toast.success('Export PDF berhasil! (Demo)');
  }

  if (!trip) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <Link to="/trips" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Kembali ke Trip History
        </Link>
        <button onClick={exportPDF}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gold hover:bg-gold-dark text-dark-primary font-semibold rounded-xl text-sm transition-all">
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      {/* Trip Header */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Route className="w-5 h-5 text-gold" />
              <h1 className="text-xl font-bold text-white">{trip.route_from} → {trip.route_to}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {trip.start_time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span>{trip.vehicle_name} ({trip.vehicle_id})</span>
            </div>
          </div>
          <div className={'px-5 py-3 rounded-xl border text-center ' + getScoreBg(trip.safety_score)}>
            <div className={'text-3xl font-bold ' + getScoreColor(trip.safety_score)}>{trip.safety_score}</div>
            <div className="text-xs text-gray-400">{getScoreLabel(trip.safety_score)}</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white/[0.02] rounded-xl p-4 text-center">
            <MapPin className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-white">{trip.distance} km</div>
            <div className="text-xs text-gray-500">Jarak Tempuh</div>
          </div>
          <div className="bg-white/[0.02] rounded-xl p-4 text-center">
            <Clock className="w-5 h-5 text-gold mx-auto mb-2" />
            <div className="text-lg font-bold text-white">{formatDuration(trip.duration)}</div>
            <div className="text-xs text-gray-500">Durasi</div>
          </div>
          <div className="bg-white/[0.02] rounded-xl p-4 text-center">
            <Gauge className="w-5 h-5 text-green-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-white">{trip.avg_speed} km/h</div>
            <div className="text-xs text-gray-500">Rata-rata</div>
          </div>
          <div className="bg-white/[0.02] rounded-xl p-4 text-center">
            <Gauge className="w-5 h-5 text-red-400 mx-auto mb-2" />
            <div className="text-lg font-bold text-white">{trip.max_speed} km/h</div>
            <div className="text-xs text-gray-500">Maks</div>
          </div>
        </div>
      </div>

      {/* Incidents Timeline */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-6">
          Insiden Perjalanan
          {incidents.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">({incidents.length} insiden)</span>
          )}
        </h2>
        {incidents.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-12 h-12 text-green-400/30 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Tidak ada insiden selama perjalanan ini.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {incidents.map(function (incident, index) {
              return (
                <div key={incident.id} className="flex gap-4">
                  {/* Timeline */}
                  <div className="flex flex-col items-center">
                    <div className={'w-3 h-3 rounded-full flex-shrink-0 ' + (incident.severity === 'danger' ? 'bg-red-500' : 'bg-yellow-500')}></div>
                    {index < incidents.length - 1 && <div className="w-0.5 flex-1 bg-white/10 mt-1"></div>}
                  </div>
                  {/* Content */}
                  <div className="pb-4 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={'text-xs font-medium px-2 py-0.5 rounded-lg ' + (incident.severity === 'danger' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400')}>
                        {incident.severity === 'danger' ? 'Bahaya' : 'Peringatan'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {incident.time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{incident.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Trip Summary */}
      <div className="bg-dark-secondary rounded-2xl border border-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Ringkasan</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">Waktu Mulai</span>
              <span className="text-sm text-white">{trip.start_time.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">Waktu Selesai</span>
              <span className="text-sm text-white">{trip.end_time.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-400">ID Trip</span>
              <span className="text-sm text-gray-500 font-mono">{trip.id}</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">Kendaraan</span>
              <span className="text-sm text-white">{trip.vehicle_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-white/5">
              <span className="text-sm text-gray-400">Total Insiden</span>
              <span className={'text-sm font-medium ' + (incidents.length > 0 ? 'text-red-400' : 'text-green-400')}>{incidents.length}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-gray-400">Skor Keselamatan</span>
              <span className={'text-sm font-bold ' + getScoreColor(trip.safety_score)}>{trip.safety_score}/100</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}