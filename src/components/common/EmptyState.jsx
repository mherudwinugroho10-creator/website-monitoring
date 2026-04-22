import { Inbox } from 'lucide-react';

export default function EmptyState({ icon, title, description, action }) {
  var IconComponent = icon || Inbox;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-6">
        <IconComponent className="w-8 h-8 text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title || 'Tidak Ada Data'}</h3>
      <p className="text-gray-400 text-sm text-center max-w-sm mb-6">
        {description || 'Belum ada data yang tersedia saat ini.'}
      </p>
      {action && action}
    </div>
  );
}