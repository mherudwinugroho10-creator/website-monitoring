import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, Shield, CheckCircle, Filter, ChevronDown, Gauge, Mountain, Disc } from 'lucide-react';
import { useAlertContext } from '../../context/AlertContext';

export default function AdminAlerts() {
  var alertCtx = useAlertContext();
  var [alerts, setAlerts] = useState([]);
  var [filter, setFilter] = useState('all');
  var [typeFilter, setTypeFilter] = useState('all');
  var [showFilters, setShowFilters] = useState(false);

  useEffect(function () {
    var dummyAlerts = [];
    var types = ['overspeed', 'steep_slope', 'harsh_braking', 'auto_brake', 'excessive_roll'];
    var now = new Date();
    for (var i = 0; i < 30; i++) {
      var type = types[Math.floor(Math.random() * types.length)];
      var severity = (type === 'auto_brake' || type === 'excessive_roll') ? 'danger' : (Math.random() > 0.5 ? 'danger' : 'warning');
      var timestamp = new Date(now.getTime() - i * 600000);
      var acknowledged = Math.random() > 0.6;
      var value, message;
      switch (type) {
        case 'overspeed': value = 65 + Math.floor(Math.random() * 25); message = 'Kecepatan ' + value + ' km/h melebihi batas 60 km/h'; break;
        case 'steep_slope': value = (12 + Math.random() * 10).toFixed(1); message = 'Kemiringan ' + value + '° melebihi batas aman 15°'; break;
        case 'harsh_braking': value = (-3.5 - Math.random() * 2).toFixed(1); message = 'Pengereman mendadak (' + value + ' m/s²)'; break;
        case 'auto_brake': message = 'Sistem pengereman otomatis diaktifkan'; break;
        case 'excessive_roll': value = (10 + Math.random() * 8).toFixed(1); message = 'Kemiringan samping ' + value + '° melebihi batas 10°'; break;
        default: message = 'Alert terdeteksi';
      }
      dummyAlerts.push({ id: 'alert_' + (i + 1), type: type, severity: severity, message: message, timestamp: timestamp, acknowledged: acknowledged, vehicle_id: 'TRUCK_001', driver: 'Ahmad Supardi' });
    }
    setAlerts(dummyAlerts);
  }, []);

  function handleAcknowledge(alertId) {
    setAlerts(function (prev) { return prev.map(function (a) { return a.id === alertId ? Object.assign({}, a, { acknowledged: true }) : a; }); });
    alertCtx.decrementCount();
  }

  function handleAcknowledgeAll() {
    setAlerts(function (prev) { return prev.map(function (a) { return Object.assign({}, a, { acknowledged: true }); }); });
  }

  function getTypeIcon(type) {
    switch (type) { case 'overspeed': return Gauge; case 'steep_slope': return Mountain; case 'harsh_braking': return Disc; case 'auto_brake': return Shield; case 'excessive_roll': return AlertTriangle; default: return Bell; }
  }
  function getTypeLabel(type) {
    switch (type) { case 'overspeed': return 'Overspeed'; case 'steep_slope': return 'Kemiringan'; case 'harsh_braking': return 'Hard Brake'; case 'auto_brake': return 'Auto Brake'; case 'excessive_roll': return 'Roll'; default: return type; }
  }
  function getTypeColor(type) {
    switch (type) { case 'overspeed': return 'bg-orange-500/10 text-orange-400'; case 'steep_slope': return 'bg-blue-500/10 text-blue-400'; case 'harsh_braking': return 'bg-yellow-500/10 text-yellow-400'; case 'auto_brake': return 'bg-red-500/10 text-red-400'; case 'excessive_roll': return 'bg-purple-500/10 text-purple-400'; default: return 'bg-gray-500/10 text-gray-400'; }
  }

  var filteredAlerts = alerts.filter(function (a) {
    if (filter === 'unacknowledged' && a.acknowledged) return false;
    if (filter === 'acknowledged' && !a.acknowledged) return false;
    if (typeFilter !== 'all' && a.type !== typeFilter) return false;
    return true;
  });
  var unackCount = alerts.filter(function (a) { return !a.acknowledged; }).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Riwayat Alert</h1>
          <p className="text-gray-400 mt-1">{unackCount} alert belum dikonfirmasi</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={function () { setShowFilters(!showFilters); }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-dark-secondary border border-white/10 rounded-xl text-sm text-gray-300 hover:text-white transition-all">
            <Filter className="w-4 h-4" /> Filter <ChevronDown className={'w-4 h-4 transition-transform ' + (showFilters ? 'rotate-180' : '')} />
          </button>
          {unackCount > 0 && (
            <button onClick={handleAcknowledgeAll}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gold hover:bg-gold-dark text-dark-primary font-semibold rounded-xl text-sm transition-all">
              <CheckCircle className="w-4 h-4" /> Konfirmasi Semua
            </button>
          )}
        </div>
      </div>

      {showFilters && (
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Status</label>
              <div className="flex gap-2">
                {[{ value: 'all', label: 'Semua' }, { value: 'unacknowledged', label: 'Belum Konfirmasi' }, { value: 'acknowledged', label: 'Sudah Konfirmasi' }].map(function (opt) {
                  return (<button key={opt.value} onClick={function () { setFilter(opt.value); }}
                    className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' + (filter === opt.value ? 'bg-gold/10 text-gold border border-gold/30' : 'bg-white/5 text-gray-400 border border-white/5')}>{opt.label}</button>);
                })}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">Tipe</label>
              <div className="flex flex-wrap gap-2">
                {[{ value: 'all', label: 'Semua' }, { value: 'overspeed', label: 'Overspeed' }, { value: 'steep_slope', label: 'Kemiringan' }, { value: 'harsh_braking', label: 'Hard Brake' }, { value: 'auto_brake', label: 'Auto Brake' }, { value: 'excessive_roll', label: 'Roll' }].map(function (opt) {
                  return (<button key={opt.value} onClick={function () { setTypeFilter(opt.value); }}
                    className={'px-3 py-1.5 rounded-lg text-xs font-medium transition-all ' + (typeFilter === opt.value ? 'bg-gold/10 text-gold border border-gold/30' : 'bg-white/5 text-gray-400 border border-white/5')}>{opt.label}</button>);
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="bg-dark-secondary rounded-2xl border border-white/5 p-12 text-center">
            <Bell className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Tidak Ada Alert</h3>
            <p className="text-gray-400 text-sm">Belum ada alert yang sesuai filter.</p>
          </div>
        ) : (
          filteredAlerts.map(function (alert) {
            var IconComp = getTypeIcon(alert.type);
            return (
              <div key={alert.id} className={'bg-dark-secondary rounded-xl border p-4 transition-all ' + (alert.acknowledged ? 'border-white/5 opacity-60' : (alert.severity === 'danger' ? 'border-red-500/20' : 'border-yellow-500/20'))}>
                <div className="flex items-start gap-4">
                  <div className={'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ' + getTypeColor(alert.type)}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={'text-xs font-medium px-2 py-0.5 rounded-lg ' + getTypeColor(alert.type)}>{getTypeLabel(alert.type)}</span>
                      <span className={'text-xs font-medium px-2 py-0.5 rounded-lg ' + (alert.severity === 'danger' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400')}>{alert.severity === 'danger' ? 'Bahaya' : 'Peringatan'}</span>
                    </div>
                    <p className="text-sm text-white mb-1">{alert.message}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{alert.vehicle_id}</span>
                      <span>{alert.driver}</span>
                      <span>{alert.timestamp.toLocaleString('id-ID')}</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    {alert.acknowledged ? (
                      <div className="flex items-center gap-1.5 text-green-400 text-xs"><CheckCircle className="w-4 h-4" /><span>OK</span></div>
                    ) : (
                      <button onClick={function () { handleAcknowledge(alert.id); }} className="px-3 py-1.5 bg-gold/10 hover:bg-gold/20 text-gold text-xs font-medium rounded-lg transition-all">Konfirmasi</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}