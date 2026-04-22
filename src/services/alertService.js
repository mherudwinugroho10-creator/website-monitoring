// Alert type configurations
export const ALERT_TYPES = {
  overspeed: {
    label: 'Overspeed',
    icon: 'Gauge',
    color: '#ff6b6b',
    bgColor: 'rgba(255, 107, 107, 0.1)',
    description: 'Vehicle exceeded speed limit',
  },
  steep_slope: {
    label: 'Steep Slope',
    icon: 'Mountain',
    color: '#fdcb6e',
    bgColor: 'rgba(253, 203, 110, 0.1)',
    description: 'Dangerous tilt angle detected',
  },
  harsh_braking: {
    label: 'Harsh Braking',
    icon: 'CircleSlash',
    color: '#fdcb6e',
    bgColor: 'rgba(253, 203, 110, 0.1)',
    description: 'Sudden braking detected',
  },
  auto_brake: {
    label: 'Auto Brake',
    icon: 'ShieldAlert',
    color: '#ff6b6b',
    bgColor: 'rgba(255, 107, 107, 0.1)',
    description: 'Automatic braking system activated',
  },
  excessive_roll: {
    label: 'Excessive Roll',
    icon: 'RotateCcw',
    color: '#ff6b6b',
    bgColor: 'rgba(255, 107, 107, 0.1)',
    description: 'Dangerous side tilt detected',
  },
  connection_lost: {
    label: 'Connection Lost',
    icon: 'WifiOff',
    color: '#a0a0b0',
    bgColor: 'rgba(160, 160, 176, 0.1)',
    description: 'Vehicle connection lost',
  },
};

// Generate dummy alerts for testing
export function generateDummyAlerts(count = 30) {
  const alerts = [];
  const types = ['overspeed', 'steep_slope', 'harsh_braking', 'auto_brake', 'excessive_roll'];
  const severities = ['warning', 'danger'];
  
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const severity = type === 'auto_brake' || type === 'excessive_roll' ? 'danger' : severities[Math.floor(Math.random() * severities.length)];
    const timestamp = new Date(now.getTime() - i * 300000);
    
    let value, threshold, message;
    
    switch (type) {
      case 'overspeed':
        value = 65 + Math.floor(Math.random() * 25);
        threshold = 60;
        message = `Kecepatan ${value} km/h melebihi batas ${threshold} km/h`;
        break;
      case 'steep_slope':
        value = parseFloat((12 + Math.random() * 10).toFixed(1));
        threshold = 15;
        message = `Kemiringan ${value}° melebihi batas aman ${threshold}°`;
        break;
      case 'harsh_braking':
        value = parseFloat((-3.5 - Math.random() * 2).toFixed(1));
        threshold = -3;
        message = `Pengereman mendadak terdeteksi (${value} m/s²)`;
        break;
      case 'auto_brake':
        value = true;
        threshold = null;
        message = 'Sistem pengereman otomatis diaktifkan';
        break;
      case 'excessive_roll':
        value = parseFloat((10 + Math.random() * 8).toFixed(1));
        threshold = 10;
        message = `Kemiringan samping ${value}° melebihi batas ${threshold}°`;
        break;
      default:
        message = 'Alert detected';
    }

    alerts.push({
      id: `alert_${i + 1}`,
      vehicle_id: 'TRUCK_001',
      timestamp: timestamp,
      type: type,
      severity: severity,
      message: message,
      value: value,
      threshold: threshold,
      location: {
        lat: -6.966667 + (Math.random() - 0.5) * 0.1,
        lng: 110.419444 + (Math.random() - 0.5) * 0.1,
      },
      acknowledged: Math.random() > 0.6,
      acknowledged_by: Math.random() > 0.6 ? 'user_123' : null,
      acknowledged_by_name: Math.random() > 0.6 ? 'Admin' : null,
      acknowledged_at: Math.random() > 0.6 ? new Date(timestamp.getTime() + 600000) : null,
    });
  }
  
  return alerts;
}