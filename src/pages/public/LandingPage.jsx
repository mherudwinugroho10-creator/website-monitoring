import { Link } from 'react-router-dom';
import { Shield, Activity, ArrowRight, Gauge, Mountain } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import BrandLogo from '../../components/common/BrandLogo';
import { HERO, RESEARCHER, FOOTER_TEXT, monitoredItems } from '../../utils/landingContent';

const ICONS = { gauge: Gauge, shield: Shield, mountain: Mountain, activity: Activity };

// Kelas ditulis utuh agar terbaca oleh Tailwind.
const TONES = {
  blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', ring: 'group-hover:border-blue-500/30' },
  red: { text: 'text-red-400', bg: 'bg-red-500/10', ring: 'group-hover:border-red-500/30' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', ring: 'group-hover:border-amber-500/30' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', ring: 'group-hover:border-emerald-500/30' },
};

export default function LandingPage() {
  const { currentUser, userData, loading } = useAuth();

  // Pengguna yang sudah masuk langsung diarahkan ke dashboard sesuai perannya.
  const loggedIn = !loading && !!currentUser && !!userData;
  const dashboardPath = loggedIn && userData.role === 'admin' ? '/admin' : '/dashboard';
  const cta = loggedIn
    ? { to: dashboardPath, nav: 'Dashboard', hero: 'Buka Dashboard' }
    : { to: '/login', nav: 'Masuk', hero: 'Masuk ke Dashboard' };

  const items = monitoredItems();

  return (
    <div className="min-h-screen bg-dark-primary font-outfit overflow-x-hidden flex flex-col relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[720px] max-w-full h-[420px] bg-gold/[0.045] rounded-full blur-[140px]" />
        <div className="absolute bottom-0 right-0 w-[420px] max-w-full h-[300px] bg-blue-500/[0.025] rounded-full blur-[130px]" />
      </div>

      <header className="relative z-10">
        <nav aria-label="Navigasi utama" className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-20 gap-3">
            <Link to="/" data-testid="nav-brand" aria-label="Beranda"
              className="block min-w-0 flex-1 max-w-[320px] rounded-lg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
              <BrandLogo alt="" className="w-full" />
            </Link>

            <div className="flex items-center gap-4 flex-shrink-0">
              {!loggedIn && (
                <Link to="/admin/login" data-testid="nav-admin" className="hidden sm:inline-flex text-sm text-gray-500 hover:text-gray-300 transition-colors">
                  Admin
                </Link>
              )}
              <Link to={cta.to} data-testid="nav-cta" className="px-5 py-2.5 text-sm font-semibold bg-gold hover:bg-gold-dark text-dark-primary rounded-xl transition-all hover:shadow-lg hover:shadow-gold/20">
                {cta.nav}
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="relative z-10 flex-1 flex flex-col justify-center px-4 sm:px-6 py-10 sm:py-14">
        <section className="max-w-4xl mx-auto w-full text-center" aria-labelledby="hero-title">
          <h1 id="hero-title" data-testid="hero-title" className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight text-balance">
            {HERO.title} <span className="text-gold">{HERO.accent}</span>
          </h1>
          <p className="text-base sm:text-lg text-gray-400 mt-5" data-testid="hero-subtitle">{HERO.subtitle}</p>

          <div className="mt-9">
            <Link to={cta.to} data-testid="hero-cta" className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-3.5 text-sm font-semibold bg-gold hover:bg-gold-dark text-dark-primary rounded-xl transition-all hover:shadow-lg hover:shadow-gold/25">
              {cta.hero}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <ul className="mt-14 sm:mt-16 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-left" data-testid="monitored" aria-label="Yang dipantau">
            {items.map((m) => {
              const Icon = ICONS[m.icon] || Activity;
              const tone = TONES[m.tone] || TONES.blue;
              return (
                <li key={m.key} data-testid="monitored-item" data-key={m.key}
                  className={`group rounded-2xl bg-dark-secondary/60 border border-white/[0.06] ${tone.ring} p-4 sm:p-5 transition-colors`}>
                  <div className={`w-10 h-10 rounded-xl ${tone.bg} flex items-center justify-center mb-4`}>
                    <Icon className={`w-5 h-5 ${tone.text}`} />
                  </div>
                  <p className="text-sm sm:text-base font-semibold text-white leading-snug">{m.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{m.caption}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </main>

      <footer className="relative z-10 px-4 sm:px-6 pb-8 pt-4">
        <div className="max-w-6xl mx-auto border-t border-white/[0.06] pt-6 flex flex-col sm:flex-row items-center sm:items-end justify-between gap-5 text-center sm:text-left">
          <div data-testid="researcher">
            <p className="text-sm font-semibold text-white">{RESEARCHER.name}</p>
            <p className="text-xs text-gray-500 mt-1">{RESEARCHER.idLabel} {RESEARCHER.id} · {RESEARCHER.program}</p>
          </div>
          <div className="flex flex-col items-center sm:items-end gap-1.5">
            {!loggedIn && (
              <Link to="/admin/login" data-testid="footer-admin" className="text-xs text-gray-500 hover:text-gray-300 transition-colors">Login Admin</Link>
            )}
            <p className="text-xs text-gray-600">{FOOTER_TEXT}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}