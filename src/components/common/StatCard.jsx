export default function StatCard({ icon, label, value, subtitle, color }) {
  const Icon = icon;

  const colorClasses = {
    gold: 'bg-gold/10 text-gold',
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    red: 'bg-red-500/10 text-red-400',
    purple: 'bg-purple-500/10 text-purple-400',
    orange: 'bg-orange-500/10 text-orange-400',
  };

  const iconClass = colorClasses[color] || colorClasses.gold;

  return (
    <div className="bg-dark-secondary rounded-2xl border border-white/[0.06] p-5 hover:border-white/10 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}