import { 
  Gauge, 
  Mountain, 
  CircleSlash, 
  ShieldAlert, 
  RotateCcw, 
  WifiOff,
  MapPin,
  Clock,
  CheckCircle,
  ChevronRight
} from 'lucide-react';
import Badge from '../common/Badge';

const iconMap = {
  Gauge: Gauge,
  Mountain: Mountain,
  CircleSlash: CircleSlash,
  ShieldAlert: ShieldAlert,
  RotateCcw: RotateCcw,
  WifiOff: WifiOff,
};

export default function AlertCard({ 
  alert, 
  alertConfig,
  onClick,
  compact = false 
}) {
  const Icon = iconMap[alertConfig?.icon] || ShieldAlert;
  
  const formatTime = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (compact) {
    return (
      <div 
        onClick={onClick}
        className={`
          p-3 rounded-xl border-l-4 cursor-pointer
          bg-dark-tertiary hover:bg-dark-card transition-colors
        `}
        style={{ borderLeftColor: alertConfig?.color || '#ff6b6b' }}
      >
        <div className="flex items-start gap-3">
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: alertConfig?.bgColor }}
          >
            <Icon className="w-4 h-4" style={{ color: alertConfig?.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white truncate">{alert.message}</p>
            <p className="text-xs text-gray-500 mt-1">{formatTime(alert.timestamp)}</p>
          </div>
          {!alert.acknowledged && (
            <span 
              className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
              style={{ backgroundColor: alertConfig?.color }}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`
        p-4 rounded-xl border cursor-pointer
        transition-all duration-200 hover:border-white/20
        ${alert.acknowledged 
          ? 'bg-dark-tertiary/50 border-white/5' 
          : 'bg-dark-tertiary border-white/10'
        }
      `}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div 
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: alertConfig?.bgColor }}
        >
          <Icon className="w-6 h-6" style={{ color: alertConfig?.color }} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-white">
              {alertConfig?.label || 'Alert'}
            </span>
            <Badge 
              variant={alert.severity === 'danger' ? 'danger' : 'warning'} 
              size="sm"
            >
              {alert.severity?.toUpperCase()}
            </Badge>
            {alert.acknowledged && (
              <Badge variant="normal" size="sm">
                <CheckCircle className="w-3 h-3 mr-1" />
                Acknowledged
              </Badge>
            )}
          </div>

          <p className="text-sm text-gray-300 mb-2">{alert.message}</p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTime(alert.timestamp)}
            </div>
            {alert.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {alert.location.lat?.toFixed(4)}, {alert.location.lng?.toFixed(4)}
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-gold">{alert.vehicle_id}</span>
            </div>
          </div>
        </div>

        {/* Arrow */}
        <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
      </div>
    </div>
  );
}