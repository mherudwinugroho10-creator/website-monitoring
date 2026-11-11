import BrandLogo from './BrandLogo';

export default function LoadingScreen({ message }) {
  return (
    <div className="min-h-screen bg-dark-primary flex items-center justify-center">
      <div className="text-center">
        <BrandLogo className="mx-auto w-64 sm:w-80 mb-8 animate-pulse" />
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-gold animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <p className="text-sm text-gray-400">{message || 'Memuat data...'}</p>
      </div>
    </div>
  );
}