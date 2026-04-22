import { useState, useEffect, useCallback } from 'react';

// Alert type configurations (inline)
const ALERT_TYPES = {
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

// Generate dummy alerts (inline)
function generateDummyAlerts(count = 30) {
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

export function useAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: 'all',
    severity: 'all',
    acknowledged: 'all',
  });
  const [unacknowledgedCount, setUnacknowledgedCount] = useState(0);

  // Load dummy data for testing
  const loadAlerts = useCallback(async () => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Generate dummy data
    let dummyAlerts = generateDummyAlerts(30);
    
    // Apply filters
    if (filters.type && filters.type !== 'all') {
      dummyAlerts = dummyAlerts.filter(alert => alert.type === filters.type);
    }
    
    if (filters.severity && filters.severity !== 'all') {
      dummyAlerts = dummyAlerts.filter(alert => alert.severity === filters.severity);
    }
    
    if (filters.acknowledged && filters.acknowledged !== 'all') {
      const isAcknowledged = filters.acknowledged === 'true';
      dummyAlerts = dummyAlerts.filter(alert => alert.acknowledged === isAcknowledged);
    }
    
    setAlerts(dummyAlerts);
    
    // Count unacknowledged
    const unackCount = generateDummyAlerts(30).filter(a => !a.acknowledged).length;
    setUnacknowledgedCount(unackCount);
    
    setLoading(false);
  }, [filters]);

  // Load alerts on mount and when filters change
  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Update filters
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Acknowledge alert
  const acknowledgeAlert = useCallback(async (alertId) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setAlerts(prev => prev.map(alert => {
      if (alert.id === alertId) {
        return {
          ...alert,
          acknowledged: true,
          acknowledged_by: 'current_user',
          acknowledged_by_name: 'Current User',
          acknowledged_at: new Date(),
        };
      }
      return alert;
    }));
    
    setUnacknowledgedCount(prev => Math.max(0, prev - 1));
    
    return { success: true };
  }, []);

  // Refresh alerts
  const refreshAlerts = useCallback(() => {
    loadAlerts();
  }, [loadAlerts]);

  // Get alert config by type
  const getAlertConfig = useCallback((type) => {
    return ALERT_TYPES[type] || ALERT_TYPES.overspeed;
  }, []);

  return {
    alerts,
    loading,
    filters,
    unacknowledgedCount,
    updateFilters,
    acknowledgeAlert,
    refreshAlerts,
    getAlertConfig,
    ALERT_TYPES,
  };
}