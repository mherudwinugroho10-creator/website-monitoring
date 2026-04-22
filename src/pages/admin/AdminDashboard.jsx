import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, AlertTriangle, Shield, Settings, Award,
  ArrowRight, Gauge, Mountain
} from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { db, rtdb } from '../../services/firebase';

export default function AdminDashboard() {
  const [totalDrivers, setTotalDrivers] = useState(0);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        // Load users dari Firestore
        const usersSnap = await getDocs(collection(db, 'users'));
        const vehicleIds = [];
        let driverCount = 0;
        usersSnap.forEach(doc => {
          const data = doc.data();
          if (data.role === 'user' || !data.role) {
            driverCount++;
            if (data.vehicleId && !vehicleIds.includes(data.vehicleId)) {
              vehicleIds.push(data.vehicleId);
            }
          }
        });
        setTotalDrivers(driverCount);

        // Fallback
        if (vehicleIds.length === 0) vehicleIds.push('TRUCK_001');

        // Load events dari semua kendaraan
        const allEvts = [];
        for (const vid of vehicleIds) {
          const eventsRef = query(
            ref(rtdb, `vehicles/${vid}/events`),
            orderByChild('timestamp'),
            limitToLast(50)
          );
          await new Promise(resolve => {
            onValue(eventsRef, (snapshot) => {
              if (snapshot.exists()) {
                snapshot.forEach(child => {
                  allEvts.push({ id: child.key, vehicleId: vid, ...child.val() });
                });
              }
              resolve();
            }, { onlyOnce: true });
          });
        }
        allEvts.sort((a, b) => b.timestamp - a.timestamp);
        setAllEvents(allEvts);
      } catch (error) {
        console.error('Error loading admin data:', error);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Stats hari ini
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEvents = allEvents.filter(e => e.timestamp >= todayStart.getTime());
  const todayOverspeed = todayEvents.filter(e => e.type === 'overspeed').length;
  const todayForcedBrake = todayEvents.filter(e => e.type === 'forced_brake').length;
  const todaySteepSlope = todayEvents.filter(e => e.type === 'steep_slope').length;

  const recentEvents = allEvents.slice(0, 5);

  function formatTimestamp(ts) {
    const date = typeof ts === 'number' ? new Date(ts) : new Date(ts);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleString('id-ID', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
    });
  }

  const typeConfig = {
    overspeed: { icon: Gauge, color: 'text-orange-400', bg: 'bg-orange-500/10', label: 'Overspeed' },
    forced_brake: { icon: Shield, color: 'text-red-400', bg: 'bg-red-500/10', label: 'Forced Brake' },
    steep_slope: { icon: Mountain, color: 'text-blue-400', bg: 'bg-blue-500/10', label: 'Turunan Ekstrem' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-gray-400 mt-1">Ringkasan sistem SAFEDRIVE.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">{totalDrivers}</div>
          <div className="text-xs text-gray-500 mt-1">Total Pengemudi</div>
        </div>
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3">
            <Gauge className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-orange-400">{todayOverspeed}</div>
          <div className="text-xs text-gray-500 mt-1">Overspeed Hari Ini</div>
        </div>
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center mb-3">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{todayForcedBrake}</div>
          <div className="text-xs text-gray-500 mt-1">Forced Brake Hari Ini</div>
        </div>
        <div className="bg-dark-secondary rounded-2xl border border-white/5 p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
            <Mountain className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{todaySteepSlope}</div>
          <div className="text-xs text-gray-500 mt-1">Turunan Ekstrem Hari Ini</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Events */}
        <div className="lg:col-span-2 bg-dark-secondary rounded-2xl border border-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-white">Event Terbaru (Semua Kendaraan)</h2>
            <Link to="/admin/driver-performance" className="text-xs text-gold hover:text-gold-dark flex items-center gap-1">
              Lihat Rekap <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {recentEvents.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              Belum ada event tercatat — jalankan simulasi di halaman user atau hubungkan alat IoT
            </div>
          ) : (
            <div className="space-y-3">
              {recentEvents.map(evt => {
                const cfg = typeConfig[evt.type] || { icon: AlertTriangle, color: 'text-gray-400', bg: 'bg-gray-500/10', label: evt.type };
                const Icon = cfg.icon;
                return (
                  <div key={evt.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl border border-white/5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                      <Icon className={`w-4 h-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-300 truncate">{evt.message}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{formatTimestamp(evt.timestamp)} • {evt.vehicleId}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Access */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Aksi Cepat</h2>
          {[
            { to: '/admin/drivers', icon: Users, label: 'Kelola Pengemudi', color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { to: '/admin/driver-performance', icon: Award, label: 'Performa Driver', color: 'text-green-400', bg: 'bg-green-500/10' },
            { to: '/admin/settings', icon: Settings, label: 'Pengaturan', color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map(item => (
            <Link key={item.to} to={item.to}
              className="flex items-center gap-4 p-4 bg-dark-secondary rounded-2xl border border-white/5 hover:border-gold/20 transition-all group">
              <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform flex-shrink-0`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <span className="text-sm font-medium text-white group-hover:text-gold transition-colors">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
