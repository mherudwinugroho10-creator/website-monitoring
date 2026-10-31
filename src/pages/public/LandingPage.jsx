import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, Shield, Activity, Bell, ArrowRight, Gauge, Mountain, Users, User, Radio, Database, Monitor,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  HERO, RESEARCHER, FOOTER_TEXT, systemParameters, featureCards, roleCards, architectureLayers,
} from '../../utils/landingContent';

const ICONS = { gauge: Gauge, shield: Shield, mountain: Mountain, bell: Bell, activity: Activity, users: Users, truck: Truck, radio: Radio, database: Database, monitor: Monitor };

// Kelas ditulis utuh agar terbaca oleh Tailwind.
const TONES = {
  blue: { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/15 hover:border-blue-500/25' },
  red: { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/15 hover:border-red-500/25' },
  amber: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/15 hover:border-amber-500/25' },
  purple: { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/15 hover:border-purple-500/25' },
  emerald: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/15 hover:border-emerald-500/25' },
  gold: { text: 'text-gold', bg: 'bg-gold/10', border: 'border-gold/15 hover:border-gold/25' },
};

function SectionHeading({ id, eyebrow, title, desc }) {
  return (
    <div className="text-center mb-10 sm:mb-14">
      <p className="text-xs font-semibold text-gold tracking-[0.2em] uppercase mb-3">{eyebrow}</p>
      <h2 id={id} className="text-2xl sm:text-3xl font-bold text-white text-balance">{title}</h2>
      {desc && <p className="text-sm text-gray-400 mt-3 max-w-xl mx-auto leading-relaxed">{desc}</p>}
    </div>
  );
}

export default function LandingPage() {
  const { currentUser, userData, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Pengguna yang sudah masuk langsung diarahkan ke dashboard sesuai perannya.
  const loggedIn = !loading && !!currentUser && !!userData;
  const dashboardPath = loggedIn && userData.role === 'admin' ? '/admin' : '/dashboard';
  const cta = loggedIn
    ? { to: dashboardPath, nav: 'Dashboard', hero: 'Buka Dashboard' }
    : { to: '/login', nav: 'Masuk', hero: 'Masuk ke Dashboard' };

  const params = systemParameters();
  const features = featureCards();
  const roles = roleCards();
  const layers = architectureLayers();

  return (
    <div className="min-h-screen bg-dark-primary font-outfit overflow-x-hidden">

      {/* ==================== NAVBAR ==================== */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-dark-primary/95 backdrop-blur-xl border-b border-white/[0.06]' : 'bg-transparent'
      }`}>
        <nav aria-label="Navigasi utama" className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16 gap-3">
            <Link to="/" className="flex items-center gap-3 min-w-0" aria-label="SAFEDRIVE — beranda">
              <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-gold" />
              </div>
              <span className="text-lg font-bold text-white">
                SAFE<span className="text-gold">DRIVE</span>
              </span>
            </Link>

            <div className="hidden lg:flex items-center gap-8 text-sm text-gray-400">
              <a href="#fitur" className="hover:text-white transition-colors">Fitur</a>
              <a href="#peran" className="hover:text-white transition-colors">Peran</a>
              <a href="#arsitektur" className="hover:text-white transition-colors">Arsitektur</a>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
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

      <main>
        {/* ==================== HERO ==================== */}
        <section id="beranda" className="relative pt-28 sm:pt-32 pb-16 sm:pb-20 px-4 sm:px-6 overflow-hidden" aria-labelledby="hero-title">
          <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <div className="absolute top-10 left-1/3 w-[600px] h-[400px] bg-gold/[0.02] rounded-full blur-[150px]" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-blue-500/[0.015] rounded-full blur-[120px]" />
          </div>

          <div className="relative max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.06] mb-8 max-w-full">
              <div className="w-2 h-2 rounded-full bg-gold animate-pulse flex-shrink-0" />
              <span className="text-sm text-gray-400 font-medium">{HERO.badge}</span>
            </div>

            <h1 id="hero-title" data-testid="hero-title" className="text-[1.75rem] sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-6 text-balance">
              {HERO.titleLead}{' '}
              <span className="text-gold">{HERO.titleAccent}</span>{' '}
              {HERO.titleTail}
            </h1>

            <p className="text-base text-gray-400 max-w-2xl mx-auto mb-4 leading-relaxed">
              {HERO.description}
            </p>
            <p className="text-sm text-gray-500 max-w-xl mx-auto mb-10 leading-relaxed" data-testid="hero-note">
              {HERO.note}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to={cta.to} data-testid="hero-cta" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 text-sm font-semibold bg-gold hover:bg-gold-dark text-dark-primary rounded-xl transition-all hover:shadow-lg hover:shadow-gold/25">
                {cta.hero}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#arsitektur" className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-sm font-medium text-gray-300 hover:text-white border border-white/10 hover:bg-white/5 rounded-xl transition-all">
                Lihat Cara Kerja
              </a>
            </div>
          </div>

          <dl className="relative max-w-5xl mx-auto mt-14 sm:mt-16 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="parameters" aria-label="Parameter sistem">
            {params.map((p) => (
              <div key={p.key} data-testid="parameter" data-key={p.key} className="flex flex-col rounded-2xl bg-dark-secondary/50 border border-white/[0.06] px-4 py-4">
                <dt className="order-2 text-xs text-gray-500 mt-1.5 leading-snug">{p.label}</dt>
                <dd className="order-1 text-base font-semibold text-white font-mono leading-tight">{p.value}</dd>
                {p.hint && <dd className="order-3 text-[11px] text-gray-600 mt-1 leading-snug">{p.hint}</dd>}
              </div>
            ))}
          </dl>
        </section>

        {/* ==================== FITUR ==================== */}
        <section id="fitur" className="py-16 sm:py-20 px-4 sm:px-6 scroll-mt-16" aria-labelledby="fitur-title">
          <div className="max-w-6xl mx-auto">
            <SectionHeading id="fitur-title" eyebrow="Fitur" title="Fitur Website"
              desc="Apa yang ditampilkan dan dicatat website dari data perangkat IoT pada truk." />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((f) => {
                const Icon = ICONS[f.icon] || Activity;
                const tone = TONES[f.tone] || TONES.gold;
                return (
                  <article key={f.key} data-testid="feature-card" className="p-6 rounded-2xl bg-dark-secondary/50 border border-white/[0.06] hover:border-white/10 transition-all duration-300">
                    <div className={`w-12 h-12 rounded-xl ${tone.bg} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${tone.text}`} />
                    </div>
                    <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                    <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ==================== PERAN ==================== */}
        <section id="peran" className="py-16 sm:py-20 px-4 sm:px-6 bg-dark-secondary/20 scroll-mt-16" aria-labelledby="peran-title">
          <div className="max-w-5xl mx-auto">
            <SectionHeading id="peran-title" eyebrow="Peran" title="Dua Peran Pengguna"
              desc="Halaman yang tersedia menyesuaikan peran akun." />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {roles.map((r) => {
                const Icon = ICONS[r.icon] || Users;
                const tone = TONES[r.tone] || TONES.gold;
                return (
                  <article key={r.key} data-testid="role-card" data-role={r.key} className={`bg-dark-primary/60 border ${tone.border} rounded-2xl p-6 transition-all`}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-12 h-12 rounded-xl ${tone.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-6 h-6 ${tone.text}`} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-white">{r.title}</h3>
                        <p className="text-xs text-gray-500">{r.caption}</p>
                      </div>
                    </div>
                    <ul className="space-y-2">
                      {r.pages.map((pg) => (
                        <li key={pg.name} className="py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <p className="text-sm text-gray-300 font-medium">{pg.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{pg.desc}</p>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ==================== ARSITEKTUR ==================== */}
        <section id="arsitektur" className="py-16 sm:py-20 px-4 sm:px-6 scroll-mt-16" aria-labelledby="arsitektur-title">
          <div className="max-w-6xl mx-auto">
            <SectionHeading id="arsitektur-title" eyebrow="Arsitektur" title="Arsitektur Sistem"
              desc="Tiga lapis yang terhubung dari perangkat di truk hingga website monitoring." />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {layers.map((l) => {
                const Icon = ICONS[l.icon] || Monitor;
                const tone = TONES[l.tone] || TONES.gold;
                return (
                  <article key={l.key} data-testid="layer-card" data-layer={l.key} className={`bg-dark-primary/60 border ${tone.border} rounded-2xl p-6 transition-all`}>
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-12 h-12 rounded-xl ${tone.bg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-6 h-6 ${tone.text}`} />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-bold ${tone.text} tracking-widest uppercase`}>{l.label}</p>
                        <h3 className="text-base font-semibold text-white">{l.title}</h3>
                      </div>
                    </div>
                    {l.tag && (
                      <p className="inline-block text-[11px] font-medium text-gray-400 bg-white/[0.04] border border-white/[0.06] rounded-full px-2.5 py-1 mb-3">{l.tag}</p>
                    )}
                    <p className="text-sm text-gray-400 leading-relaxed mb-5">{l.desc}</p>
                    <ul className="space-y-2">
                      {l.items.map((it) => (
                        <li key={it.name} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                          <span className="text-sm text-gray-300 font-medium">{it.name}</span>
                          <span className="text-xs text-gray-500">{it.desc}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ==================== PENELITI ==================== */}
        <section id="peneliti" className="py-16 sm:py-20 px-4 sm:px-6 scroll-mt-16" aria-label="Peneliti">
          <div className="max-w-2xl mx-auto">
            <div className="bg-dark-secondary/50 border border-white/[0.06] rounded-2xl p-6 sm:p-10 text-center" data-testid="researcher">
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gold/10 border-2 border-gold/20 flex items-center justify-center mx-auto mb-6 overflow-hidden">
                <User className="w-11 h-11 sm:w-12 sm:h-12 text-gold/60" />
              </div>

              <h3 className="text-xl font-bold text-white mb-1">{RESEARCHER.name}</h3>
              <p className="text-base text-gold font-medium mb-5">{RESEARCHER.idLabel}. {RESEARCHER.id}</p>

              <div className="space-y-1.5 mb-6">
                <p className="text-sm text-gray-300">{RESEARCHER.program}</p>
                <p className="text-sm text-gray-400">{RESEARCHER.institution}</p>
              </div>

              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                <div className="w-2 h-2 rounded-full bg-gold" />
                <span className="text-sm text-gray-400">{RESEARCHER.badge}</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ==================== FOOTER ==================== */}
      <footer className="py-8 px-4 sm:px-6 border-t border-white/[0.06]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center">
              <Truck className="w-4 h-4 text-gold" />
            </div>
            <span className="text-sm font-bold text-white">SAFE<span className="text-gold">DRIVE</span></span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-x-6 gap-y-2 text-center sm:text-right">
            {!loggedIn && (
              <Link to="/admin/login" data-testid="footer-admin" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">Login Admin</Link>
            )}
            <p className="text-sm text-gray-500">{FOOTER_TEXT}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}