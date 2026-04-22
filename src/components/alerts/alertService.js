import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  doc,
  updateDoc,
  Timestamp,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { firestore } from './firebase';

const COLLECTION_NAME = 'alerts';

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

// Save alert to Firestore
export async function saveAlert(alertData) {
  try {
    const docRef = await addDoc(collection(firestore, COLLECTION_NAME), {
      ...alertData,
      timestamp: Timestamp.now(),
      acknowledged: false,
      acknowledged_by: null,
      acknowledged_at: null,
      createdAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error saving alert:', error);
    return { success: false, error: error.message };
  }
}

// Get alerts with filters
export async function getAlerts({
  vehicleId = null,
  type = null,
  severity = null,
  acknowledged = null,
  limitCount = 50,
}) {
  try {
    let q = collection(firestore, COLLECTION_NAME);
    const constraints = [];

    if (vehicleId) {
      constraints.push(where('vehicle_id', '==', vehicleId));
    }

    if (type && type !== 'all') {
      constraints.push(where('type', '==', type));
    }

    if (severity && severity !== 'all') {
      constraints.push(where('severity', '==', severity));
    }

    if (acknowledged !== null && acknowledged !== 'all') {
      constraints.push(where('acknowledged', '==', acknowledged === 'true'));
    }

    constraints.push(orderBy('timestamp', 'desc'));
    constraints.push(limit(limitCount));

    q = query(q, ...constraints);
    const snapshot = await getDocs(q);

    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(),
      acknowledged_at: doc.data().acknowledged_at?.toDate?.() || null,
    }));

    return { success: true, data: alerts };
  } catch (error) {
    console.error('Error getting alerts:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// Acknowledge alert
export async function acknowledgeAlert(alertId, userId, userName) {
  try {
    const alertRef = doc(firestore, COLLECTION_NAME, alertId);
    await updateDoc(alertRef, {
      acknowledged: true,
      acknowledged_by: userId,
      acknowledged_by_name: userName,
      acknowledged_at: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return { success: false, error: error.message };
  }
}

// Get unacknowledged alerts count
export async function getUnacknowledgedCount(vehicleId = null) {
  try {
    let q = collection(firestore, COLLECTION_NAME);
    const constraints = [
      where('acknowledged', '==', false),
      orderBy('timestamp', 'desc'),
    ];

    if (vehicleId) {
      constraints.unshift(where('vehicle_id', '==', vehicleId));
    }

    q = query(q, ...constraints);
    const snapshot = await getDocs(q);

    return { success: true, count: snapshot.size };
  } catch (error) {
    console.error('Error getting count:', error);
    return { success: false, count: 0 };
  }
}

// Listen to alerts in real-time
export function subscribeToAlerts(callback, vehicleId = null) {
  let q = collection(firestore, COLLECTION_NAME);
  const constraints = [
    orderBy('timestamp', 'desc'),
    limit(50),
  ];

  if (vehicleId) {
    constraints.unshift(where('vehicle_id', '==', vehicleId));
  }

  q = query(q, ...constraints);

  return onSnapshot(q, (snapshot) => {
    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(),
      acknowledged_at: doc.data().acknowledged_at?.toDate?.() || null,
    }));
    callback(alerts);
  }, (error) => {
    console.error('Error listening to alerts:', error);
  });
}

// Generate dummy alerts for testing
export function generateDummyAlerts(count = 30) {
  const alerts = [];
  const types = ['overspeed', 'steep_slope', 'harsh_braking', 'auto_brake', 'excessive_roll'];
  const severities = ['warning', 'danger'];
  
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const severity = type === 'auto_brake' || type === 'excessive_roll' ? 'danger' : severities[Math.floor(Math.random() * severities.length)];
    const timestamp = new Date(now.getTime() - i * 300000); // Each alert 5 minutes apart
    
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