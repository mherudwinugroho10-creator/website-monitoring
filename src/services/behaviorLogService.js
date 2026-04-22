import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs,
  Timestamp,
  limit,
  startAfter,
  getCountFromServer
} from 'firebase/firestore';
import { firestore } from './firebase';

const COLLECTION_NAME = 'behavior_logs';

// Save behavior log to Firestore
export async function saveBehaviorLog(logData) {
  try {
    const docRef = await addDoc(collection(firestore, COLLECTION_NAME), {
      ...logData,
      timestamp: Timestamp.now(),
      createdAt: Timestamp.now(),
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error saving behavior log:', error);
    return { success: false, error: error.message };
  }
}

// Get behavior logs with filters and pagination
export async function getBehaviorLogs({
  vehicleId = null,
  startDate = null,
  endDate = null,
  status = null,
  pageSize = 20,
  lastDoc = null,
}) {
  try {
    let q = collection(firestore, COLLECTION_NAME);
    const constraints = [];

    // Add filters
    if (vehicleId) {
      constraints.push(where('vehicle_id', '==', vehicleId));
    }

    if (startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(new Date(startDate))));
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(endDateTime)));
    }

    if (status && status !== 'all') {
      constraints.push(where('status', '==', status));
    }

    // Order by timestamp descending
    constraints.push(orderBy('timestamp', 'desc'));

    // Pagination
    constraints.push(limit(pageSize));

    if (lastDoc) {
      constraints.push(startAfter(lastDoc));
    }

    q = query(q, ...constraints);
    const snapshot = await getDocs(q);

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate?.() || new Date(),
    }));

    const lastVisible = snapshot.docs[snapshot.docs.length - 1] || null;

    return { 
      success: true, 
      data: logs, 
      lastDoc: lastVisible,
      hasMore: snapshot.docs.length === pageSize
    };
  } catch (error) {
    console.error('Error getting behavior logs:', error);
    return { success: false, error: error.message, data: [] };
  }
}

// Get total count of logs (for pagination info)
export async function getBehaviorLogsCount({
  vehicleId = null,
  startDate = null,
  endDate = null,
  status = null,
}) {
  try {
    let q = collection(firestore, COLLECTION_NAME);
    const constraints = [];

    if (vehicleId) {
      constraints.push(where('vehicle_id', '==', vehicleId));
    }

    if (startDate) {
      constraints.push(where('timestamp', '>=', Timestamp.fromDate(new Date(startDate))));
    }

    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      constraints.push(where('timestamp', '<=', Timestamp.fromDate(endDateTime)));
    }

    if (status && status !== 'all') {
      constraints.push(where('status', '==', status));
    }

    q = query(q, ...constraints);
    const snapshot = await getCountFromServer(q);

    return { success: true, count: snapshot.data().count };
  } catch (error) {
    console.error('Error getting count:', error);
    return { success: false, count: 0 };
  }
}

// Generate dummy behavior logs for testing
export function generateDummyBehaviorLogs(count = 50) {
  const logs = [];
  const statuses = ['normal', 'warning', 'danger'];
  const brakeStatuses = ['normal', 'braking'];
  
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now.getTime() - i * 60000); // Each log 1 minute apart
    const speedAvg = 30 + Math.random() * 50;
    const speedMax = speedAvg + Math.random() * 20;
    const pitch = (Math.random() - 0.5) * 25;
    const roll = (Math.random() - 0.5) * 18;
    
    // Determine status based on values
    let status = 'normal';
    if (speedMax > 70 || Math.abs(pitch) > 15 || Math.abs(roll) > 10) {
      status = 'danger';
    } else if (speedMax > 60 || Math.abs(pitch) > 10 || Math.abs(roll) > 7) {
      status = 'warning';
    }

    logs.push({
      id: `log_${i + 1}`,
      vehicle_id: 'TRUCK_001',
      timestamp: timestamp,
      speed_avg: parseFloat(speedAvg.toFixed(1)),
      speed_max: parseFloat(speedMax.toFixed(1)),
      speed_min: parseFloat((speedAvg - Math.random() * 15).toFixed(1)),
      pitch_avg: parseFloat(pitch.toFixed(1)),
      roll_avg: parseFloat(roll.toFixed(1)),
      brake_status: brakeStatuses[Math.floor(Math.random() * brakeStatuses.length)],
      auto_brake_count: Math.random() > 0.9 ? Math.floor(Math.random() * 3) : 0,
      location: {
        lat: -6.966667 + (Math.random() - 0.5) * 0.1,
        lng: 110.419444 + (Math.random() - 0.5) * 0.1,
      },
      status: status,
    });
  }
  
  return logs;
}