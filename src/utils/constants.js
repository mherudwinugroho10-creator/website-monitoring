// Default Thresholds
export const DEFAULTS = {
  SPEED_LIMIT: parseInt(import.meta.env.VITE_DEFAULT_SPEED_LIMIT) || 60,
  PITCH_THRESHOLD: parseInt(import.meta.env.VITE_DEFAULT_PITCH_THRESHOLD) || 15,
  ROLL_THRESHOLD: parseInt(import.meta.env.VITE_DEFAULT_ROLL_THRESHOLD) || 10,
  HARSH_BRAKE_THRESHOLD: -3,
  DATA_INTERVAL: 1000,
  LOG_INTERVAL: 60000,
  ROUTE_RECORD_INTERVAL: 10000,
};

// Status Types
export const STATUS = {
  NORMAL: 'normal',
  WARNING: 'warning',
  DANGER: 'danger',
};

// Alert Types
export const ALERT_TYPES = {
  OVERSPEED: 'overspeed',
  STEEP_SLOPE: 'steep_slope',
  EXCESSIVE_ROLL: 'excessive_roll',
  HARSH_BRAKING: 'harsh_braking',
  AUTO_BRAKE: 'auto_brake',
  CONNECTION_LOST: 'connection_lost',
};

// User Roles
export const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
};

// Status Colors (Tailwind classes)
export const STATUS_COLORS = {
  normal: {
    bg: 'bg-status-success/10',
    text: 'text-status-success',
    border: 'border-status-success/20',
  },
  warning: {
    bg: 'bg-status-warning/10',
    text: 'text-status-warning',
    border: 'border-status-warning/20',
  },
  danger: {
    bg: 'bg-status-danger/10',
    text: 'text-status-danger',
    border: 'border-status-danger/20',
  },
};

// Navigation Menu Items
export const NAV_ITEMS = {
  user: [
    { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
    { path: '/monitoring', label: 'Live Monitoring', icon: 'Activity' },
    { path: '/behavior-log', label: 'Behavior Log', icon: 'FileText' },
    { path: '/trips', label: 'Trip History', icon: 'MapPin' },
    { path: '/alerts', label: 'Alerts', icon: 'Bell' },
  ],
  admin: [
    { path: '/admin', label: 'Admin Dashboard', icon: 'LayoutDashboard' },
    { path: '/admin/users', label: 'Manage Users', icon: 'Users' },
    { path: '/admin/vehicles', label: 'Manage Vehicles', icon: 'Truck' },
    { path: '/admin/settings', label: 'Settings', icon: 'Settings' },
  ],
};