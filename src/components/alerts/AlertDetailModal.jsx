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
  Truck,
  AlertTriangle,
  User
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';

const iconMap = {
  Gauge: Gauge,
  Mountain: Mountain,
  CircleSlash: CircleSlash,
  ShieldAlert: ShieldAlert,
  RotateCcw: RotateCcw,
  WifiOff: WifiOff,
};

export default function AlertDetailModal({ 
  isOpen, 
  onClose, 
  alert, 
  alertConfig,
  onAcknowledge,
  loading = false
}) {
  if (!alert) return null;

  const Icon = iconMap[alertConfig?.icon] || ShieldAlert;

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Alert Detail"
      size="md"
    >
      <div className="p-6">
        {/* Alert Header */}
        <div 
          className="p-4 rounded-xl mb-6"
          style={{ backgroundColor: alertConfig?.bgColor }}
        >
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${alertConfig?.color}30` }}
            >
              <Icon className="w-8 h-8" style={{ color: alertConfig?.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">
                  {alertConfig?.label}
                </h3>
                <Badge 
                  variant={alert.severity === 'danger' ? 'danger' : 'warning'}
                >
                  {alert.severity?.toUpperCase()}
                </Badge>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {alertConfig?.description}
              </p>
            </div>
          </div>
        </div>

        {/* Alert Message */}
        <div className="p-4 bg-dark-tertiary rounded-xl mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-status-warning flex-shrink-0 mt-0.5" />
            <p className="text-white">{alert.message}</p>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-dark-tertiary rounded-xl">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Timestamp</span>
            </div>
            <p className="text-white text-sm">{formatDateTime(alert.timestamp)}</p>
          </div>

          <div className="p-4 bg-dark-tertiary rounded-xl">
            <div className="flex items-center gap-2 text-gray-400 mb-2">
              <Truck className="w-4 h-4" />
              <span className="text-sm">Vehicle</span>
            </div>
            <p className="text-white text-sm font-mono">{alert.vehicle_id}</p>
          </div>

          {alert.location && (
            <div className="p-4 bg-dark-tertiary rounded-xl col-span-2">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">Location</span>
              </div>
              <p className="text-white text-sm font-mono">
                {alert.location.lat?.toFixed(6)}, {alert.location.lng?.toFixed(6)}
              </p>
              <a 
                href={`https://www.google.com/maps?q=${alert.location.lat},${alert.location.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gold text-sm hover:underline mt-1 inline-block"
              >
                Open in Google Maps →
              </a>
            </div>
          )}

          {alert.value !== null && alert.value !== undefined && (
            <div className="p-4 bg-dark-tertiary rounded-xl">
              <p className="text-sm text-gray-400 mb-1">Recorded Value</p>
              <p className="text-2xl font-mono font-bold" style={{ color: alertConfig?.color }}>
                {typeof alert.value === 'boolean' ? (alert.value ? 'Active' : 'Inactive') : alert.value}
                {typeof alert.value === 'number' && alert.type === 'overspeed' && ' km/h'}
                {typeof alert.value === 'number' && (alert.type === 'steep_slope' || alert.type === 'excessive_roll') && '°'}
                {typeof alert.value === 'number' && alert.type === 'harsh_braking' && ' m/s²'}
              </p>
            </div>
          )}

          {alert.threshold !== null && alert.threshold !== undefined && (
            <div className="p-4 bg-dark-tertiary rounded-xl">
              <p className="text-sm text-gray-400 mb-1">Threshold</p>
              <p className="text-2xl font-mono font-bold text-gray-400">
                {alert.threshold}
                {alert.type === 'overspeed' && ' km/h'}
                {(alert.type === 'steep_slope' || alert.type === 'excessive_roll') && '°'}
                {alert.type === 'harsh_braking' && ' m/s²'}
              </p>
            </div>
          )}
        </div>

        {/* Acknowledgment Status */}
        {alert.acknowledged ? (
          <div className="p-4 bg-status-success/10 border border-status-success/20 rounded-xl mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-status-success" />
              <div>
                <p className="text-status-success font-medium">Alert Acknowledged</p>
                <p className="text-sm text-gray-400">
                  by {alert.acknowledged_by_name || 'Unknown'} on{' '}
                  {alert.acknowledged_at ? formatDateTime(alert.acknowledged_at) : '-'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-status-warning/10 border border-status-warning/20 rounded-xl mb-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-status-warning" />
              <div>
                <p className="text-status-warning font-medium">Pending Acknowledgment</p>
                <p className="text-sm text-gray-400">
                  This alert requires attention
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {!alert.acknowledged && (
            <Button
              variant="primary"
              icon={CheckCircle}
              onClick={onAcknowledge}
              loading={loading}
              fullWidth
            >
              Acknowledge Alert
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={onClose}
            fullWidth={alert.acknowledged}
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}