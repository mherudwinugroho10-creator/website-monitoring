import { Link } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import BrandLogo from '../common/BrandLogo';

// Kerangka bersama halaman Masuk, Daftar, dan Login Admin: merek, kartu, judul, dan kolom isian
// memakai komponen yang sama agar ketiganya selalu seragam.

const FIELD_CLASS = 'w-full pl-11 py-3 bg-white/[0.03] border border-white/[0.08] rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gold/50 disabled:opacity-60 transition-all';

export default function AuthShell({ title, children, footer }) {
  return (
    <div className="min-h-screen bg-dark-primary flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Beranda
        </Link>

        <div className="bg-dark-secondary rounded-2xl border border-white/[0.06] p-6 sm:p-8">
          <div className="text-center mb-8">
            <BrandLogo className="mx-auto w-full max-w-[340px] mb-6" />
            <h1 className="text-2xl font-bold text-white">{title}</h1>
          </div>

          {children}

          {footer && <div className="mt-6 text-center text-sm text-gray-400 space-y-3">{footer}</div>}
        </div>
      </div>
    </div>
  );
}

// Kolom isian dengan ikon di kiri. Bila `toggle` diberikan ({ show, onToggle, testId }), tombol
// tampil/sembunyikan password muncul di kanan; `type` tetap ditentukan pemanggil agar beberapa kolom
// dapat berbagi satu status tampil/sembunyi.
export function AuthField({ id, label, icon: Icon, type = 'text', testId, toggle, ...rest }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-2">{label}</label>
      <div className="relative">
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input id={id} type={type} data-testid={testId} className={`${FIELD_CLASS} ${toggle ? 'pr-12' : 'pr-4'}`} {...rest} />
        {toggle && (
          <button
            type="button"
            onClick={toggle.onToggle}
            aria-label={toggle.show ? 'Sembunyikan password' : 'Tampilkan password'}
            aria-pressed={toggle.show}
            data-testid={toggle.testId}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
          >
            {toggle.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}

export function AuthSubmit({ loading, testId, icon: Icon, children }) {
  return (
    <button
      type="submit"
      disabled={loading}
      data-testid={testId}
      className="w-full py-3 bg-gold hover:bg-gold-dark disabled:opacity-50 text-dark-primary text-sm font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-dark-primary/30 border-t-dark-primary rounded-full animate-spin" role="status" aria-label="Memproses" />
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4" />}
          {children}
        </>
      )}
    </button>
  );
}