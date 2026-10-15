import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Truck, Shield, Activity, Bell, BarChart3,
  ArrowRight, Gauge, AlertTriangle, User,
  Radio, Database, Monitor
} from 'lucide-react';

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-dark-primary font-outfit">

      {/* ==================== NAVBAR ==================== */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-dark-primary/95 backdrop-blur-xl border-b border-white/[0.06]'
          : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
                <Truck className="w-5 h-5 text-gold" />
              </div>
              <span className="text-lg font-bold text-white">
                SAFE<span className="text-gold">DRIVE</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/admin/login" className="hidden sm:inline-flex text-sm text-gray-500 hover:text-gray-300 transition-colors">
                Admin
              </Link>
              <Link to="/login" className="px-5 py-2.5 text-sm font-semibold bg-gold hover:bg-gold-dark text-dark-primary rounded-xl transition-all hover:shadow-lg hover:shadow-gold/20">
                Masuk
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ==================== HERO ==================== */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 left-1/3 w-[600px] h-[400px] bg-gold/[0.02] rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-blue-500/[0.015] rounded-full blur-[120px]" />
        </div>

        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] mb-8">
            <div className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="text-sm text-gray-400 font-medium">Penelitian Tugas Akhir — Sistem Berbasis IoT</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6">
            Sistem Monitoring Realtime 
            <br className="hidden sm:block" />
            <span className="text-gold"> Kecepatan, Pengereman, Dan Kemiringan Kendaraan Berat (Truk) </span>
            <br className="hidden sm:block" />
            Berbasis Web Dengan Behavior Log
          </h1>

          <p className="text-base text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Sistem monitoring real-time yang mengintegrasikan sensor akselerometer, GPS, 
            dan mikrokontroler ESP32 untuk pembatasan kecepatan serta pengereman otomatis 
            menyesuaikan kemiringan pada kendaraan berat.
          </p>

          <Link to="/login" className="inline-flex items-center gap-2 px-8 py-3 text-sm font-semibold bg-gold hover:bg-gold-dark text-dark-primary rounded-xl transition-all hover:shadow-lg hover:shadow-gold/25">
            Masuk ke Dashboard
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ==================== KAPABILITAS SISTEM ==================== */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-gold tracking-[0.2em] uppercase mb-3">Kapabilitas</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Kapabilitas Sistem</h2>
            <p className="text-sm text-gray-400 mt-3 max-w-lg mx-auto">
              Fitur utama yang memastikan keselamatan pengemudi dan kendaraan berat secara real-time dan tercatat.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Gauge,
                title: 'Pembatasan Kecepatan',
                desc: 'Monitoring kecepatan real-time dengan batas maksimum yang dapat dikonfigurasi. Sistem otomatis membatasi kecepatan saat melampaui ambang batas aman.',
                color: 'text-blue-400',
                bg: 'bg-blue-500/10',
              },
              {
                icon: Shield,
                title: 'Pengereman Otomatis',
                desc: 'Aktivasi rem otomatis melalui relay module ketika kecepatan melampaui batas aman, menyesuaikan dengan kondisi kemiringan jalan yang dilalui.',
                color: 'text-red-400',
                bg: 'bg-red-500/10',
              },
              {
                icon: AlertTriangle,
                title: 'Deteksi Kemiringan',
                desc: 'Sensor MPU9250 mendeteksi kemiringan (pitch) dan kemiringan samping (roll) kendaraan untuk mencegah risiko terguling di medan berbukit.',
                color: 'text-amber-400',
                bg: 'bg-amber-500/10',
              },
              {
                icon: Activity,
                title: 'Behavior Log',
                desc: 'Pencatatan perilaku berkendara secara otomatis setiap menit mencakup data kecepatan, pengereman, akselerasi, deselerasi, dan kemiringan.',
                color: 'text-emerald-400',
                bg: 'bg-emerald-500/10',
              },
              {
                icon: Bell,
                title: 'Notifikasi & Alert',
                desc: 'Sistem memberikan notifikasi saat terjadi keadaan tidak bersesuaian seperti overspeed, kemiringan berlebih, dan pengereman mendadak.',
                color: 'text-purple-400',
                bg: 'bg-purple-500/10',
              },
            ].map((feature, i) => (
              <div key={i} className="group p-6 rounded-2xl bg-dark-secondary/50 border border-white/[0.06] hover:border-white/10 transition-all duration-300">
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== ARSITEKTUR SISTEM ==================== */}
      <section className="py-20 px-6 bg-dark-secondary/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-semibold text-gold tracking-[0.2em] uppercase mb-3">Arsitektur</p>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">Arsitektur Sistem</h2>
            <p className="text-sm text-gray-400 mt-3 max-w-lg mx-auto">
              Tiga layer utama yang saling terintegrasi dari perangkat keras hingga aplikasi web dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Hardware Layer */}
            <div className="bg-dark-primary/60 border border-blue-500/15 rounded-2xl p-6 hover:border-blue-500/25 transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Radio className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-blue-400 tracking-widest uppercase">Layer 01</p>
                  <h3 className="text-base font-semibold text-white">Perangkat Keras</h3>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">
                Mikrokontroler ESP32 membaca data sensor secara periodik dan mengirimkan ke cloud melalui WiFi.
              </p>
              <div className="space-y-2">
                {[
                  { name: 'ESP32 DevKit V1', desc: 'Mikrokontroler' },
                  { name: 'GPS BN-220',      desc: 'Modul GPS' },
                  { name: 'MPU9250',         desc: 'Accelerometer & Gyro' },
                  { name: 'Relay Module',    desc: 'Kontrol Rem' },
                ].map((item, j) => (
                  <div key={j} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-sm text-gray-300 font-medium">{item.name}</span>
                    <span className="text-xs text-gray-500">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cloud Layer */}
            <div className="bg-dark-primary/60 border border-gold/15 rounded-2xl p-6 hover:border-gold/25 transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
                  <Database className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gold tracking-widest uppercase">Layer 02</p>
                  <h3 className="text-base font-semibold text-white">Cloud & Database</h3>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">
                Firebase menerima dan menyinkronkan data sensor secara real-time ke seluruh client yang terhubung.
              </p>
              <div className="space-y-2">
                {[
                  { name: 'Firebase RTDB', desc: 'Sensor & Behavior Log' },
                  { name: 'Cloud Firestore', desc: 'Data Pengguna' },
                  { name: 'Firebase Auth', desc: 'Autentikasi' },
                  { name: 'WiFi 802.11', desc: 'Komunikasi' },
                ].map((item, j) => (
                  <div key={j} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-sm text-gray-300 font-medium">{item.name}</span>
                    <span className="text-xs text-gray-500">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Application Layer */}
            <div className="bg-dark-primary/60 border border-emerald-500/15 rounded-2xl p-6 hover:border-emerald-500/25 transition-all">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Monitor className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-400 tracking-widest uppercase">Layer 03</p>
                  <h3 className="text-base font-semibold text-white">Aplikasi Web</h3>
                </div>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed mb-5">
                Dashboard web menampilkan monitoring real-time, behavior log, peta GPS, dan sistem alert.
              </p>
              <div className="space-y-2">
                {[
                  { name: 'React.js 18', desc: 'Frontend' },
                  { name: 'Tailwind CSS', desc: 'Styling' },
                  { name: 'Chart.js', desc: 'Visualisasi' },
                  { name: 'Leaflet.js', desc: 'Peta GPS' },
                ].map((item, j) => (
                  <div key={j} className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <span className="text-sm text-gray-300 font-medium">{item.name}</span>
                    <span className="text-xs text-gray-500">{item.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== IDENTITAS PENELITI ==================== */}
      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-dark-secondary/50 border border-white/[0.06] rounded-2xl p-10 text-center">
            <div className="w-28 h-28 rounded-full bg-gold/10 border-2 border-gold/20 flex items-center justify-center mx-auto mb-6 overflow-hidden">
              <User className="w-12 h-12 text-gold/60" />
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Muhammad Heru Dwi Nugroho</h3>
            <p className="text-base text-gold font-medium mb-5">NOTAR. 23021016</p>

            <div className="space-y-1.5 mb-6">
              <p className="text-sm text-gray-300">Program Studi Teknologi Rekayasa Otomotif</p>
              <p className="text-sm text-gray-400">Politeknik Keselamatan Transportasi Jalan Tegal</p>
            </div>

            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <div className="w-2 h-2 rounded-full bg-gold" />
              <span className="text-sm text-gray-400">Tugas Akhir — 2026</span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="py-8 px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
              <Truck className="w-4 h-4 text-gold" />
            </div>
            <span className="text-sm font-bold text-white">SAFE<span className="text-gold">DRIVE</span></span>
          </div>
          <p className="text-sm text-gray-500 text-center sm:text-right">
            © 2026 — Politeknik Keselamatan Transportasi Jalan Tegal
          </p>
        </div>
      </footer>
    </div>
  );
}