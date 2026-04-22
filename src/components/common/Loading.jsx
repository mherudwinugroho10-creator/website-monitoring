import { Loader2 } from 'lucide-react';

export default function Loading({ fullScreen = false, text = 'Loading...' }) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-dark-primary flex items-center justify-center z-50">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-gold animate-spin mx-auto mb-4" />
          <p className="text-gray-400">{text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <Loader2 className="w-8 h-8 text-gold animate-spin mx-auto mb-2" />
        <p className="text-sm text-gray-400">{text}</p>
      </div>
    </div>
  );
}