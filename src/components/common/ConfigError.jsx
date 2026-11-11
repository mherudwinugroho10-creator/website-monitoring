import { AlertTriangle } from 'lucide-react';
import BrandLogo from './BrandLogo';

function NameList({ title, names, testId }) {
  return (
    <div className="mt-4" data-testid={testId}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">{title}</p>
      <ul className="space-y-1.5">
        {names.map((n) => (
          <li key={n} className="font-mono text-sm text-gray-200 bg-white/[0.03] border border-white/5 rounded-lg px-3 py-2 break-all">{n}</li>
        ))}
      </ul>
    </div>
  );
}

// Layar petunjuk bila konfigurasi Firebase belum lengkap. Ditampilkan main.jsx sebelum aplikasi dimuat,
// sehingga yang terlihat adalah arahan, bukan halaman kosong.
export default function ConfigError({ missing = [], invalid = [] }) {
  return (
    <div className="min-h-screen bg-dark-primary font-outfit flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg bg-dark-secondary rounded-2xl border border-white/5 p-6 sm:p-8" role="alert" data-testid="config-error">
        <BrandLogo className="w-full max-w-[300px] mb-6" />

        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <h1 className="text-base font-semibold text-white">Konfigurasi Firebase belum lengkap</h1>
        </div>

        {missing.length > 0 && <NameList title="Belum diisi" names={missing} testId="config-missing" />}
        {invalid.length > 0 && <NameList title="Format tidak valid (harus diawali https://)" names={invalid} testId="config-invalid" />}

        <p className="text-sm text-gray-400 mt-6 leading-relaxed">
          Isi di <span className="text-gray-200">Vercel → Settings → Environment Variables</span>, lalu deploy ulang. Saat pengembangan, isi di
          {' '}<span className="font-mono text-gray-200">.env.local</span>. Contoh ada di <span className="font-mono text-gray-200">.env.example</span>.
        </p>
      </div>
    </div>
  );
}