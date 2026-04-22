import { User, AlertTriangle, Award } from 'lucide-react';

export default function DriverStatsCard({ driverStat, onClick }) {
  const safetyColor = driverStat.safety_score >= 80 ? 'text-green-400' :
                      driverStat.safety_score >= 60 ? 'text-yellow-400' :
                      'text-red-400';
  
  const safetyBg = driverStat.safety_score >= 80 ? 'bg-green-500/10' :
                   driverStat.safety_score >= 60 ? 'bg-yellow-500/10' :
                   'bg-red-500/10';

  return (
    <div 
      onClick={onClick}
      className="bg-dark-secondary rounded-xl border border-white/5 p-4 hover:border-gold/30 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
            <User className="w-6 h-6 text-gold" />
          </div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-gold transition-colors">
              {driverStat.driver_name}
            </h3>
            <p className="text-xs text-gray-500">{driverStat.vehicle_id}</p>
          </div>
        </div>

        {driverStat.rank <= 3 && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            driverStat.rank === 1 ? 'bg-red-500/10' :
            driverStat.rank === 2 ? 'bg-orange-500/10' :
            'bg-yellow-500/10'
          }`}>
            <span className={`text-sm font-bold ${
              driverStat.rank === 1 ? 'text-red-400' :
              driverStat.rank === 2 ? 'text-orange-400' :
              'text-yellow-400'
            }`}>
              #{driverStat.rank}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-dark-tertiary rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Total Violations</div>
          <div className="text-xl font-bold text-red-400">{driverStat.total_violations}</div>
        </div>
        
        <div className="bg-dark-tertiary rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Total Trips</div>
          <div className="text-xl font-bold text-white">{driverStat.total_trips}</div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        {driverStat.violations.overspeed.count > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Overspeed</span>
            <span className="text-orange-400 font-medium">{driverStat.violations.overspeed.count}x</span>
          </div>
        )}
        {driverStat.violations.harsh_braking.count > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Hard Brake</span>
            <span className="text-yellow-400 font-medium">{driverStat.violations.harsh_braking.count}x</span>
          </div>
        )}
        {driverStat.violations.steep_slope.count > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Steep Slope</span>
            <span className="text-blue-400 font-medium">{driverStat.violations.steep_slope.count}x</span>
          </div>
        )}
        {driverStat.violations.auto_brake_triggered.count > 0 && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">Auto Brake</span>
            <span className="text-red-400 font-medium">{driverStat.violations.auto_brake_triggered.count}x</span>
          </div>
        )}
      </div>

      <div className={`rounded-lg p-3 ${safetyBg}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className={`w-4 h-4 ${safetyColor}`} />
            <span className="text-xs text-gray-400">Safety Score</span>
          </div>
          <span className={`text-lg font-bold ${safetyColor}`}>
            {driverStat.safety_score}
          </span>
        </div>
      </div>
    </div>
  );
}