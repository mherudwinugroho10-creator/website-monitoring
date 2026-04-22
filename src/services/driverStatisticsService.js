// ============================================
// DRIVER STATISTICS SERVICE
// Service for tracking driver violations and performance
// ============================================

import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Save driver violation to Firestore
 * @param {object} violation - Violation data
 * @returns {Promise<string>} Document ID
 */
export async function saveDriverViolation(violation) {
  try {
    const violationsRef = collection(db, 'driver_violations');
    const docRef = await addDoc(violationsRef, {
      ...violation,
      created_at: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error saving violation:', error);
    throw error;
  }
}

/**
 * Get driver statistics for a specific driver
 * @param {string} driverId - Driver UID
 * @param {string} period - Period (e.g., '2026-02' for Feb 2026)
 * @returns {Promise<object>} Driver statistics
 */
export async function getDriverStatistics(driverId, period = null) {
  try {
    // If no period specified, get current month
    if (!period) {
      const now = new Date();
      period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    const statsRef = collection(db, 'driver_statistics');
    const q = query(
      statsRef,
      where('driver_id', '==', driverId),
      where('period', '==', period)
    );

    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      return null;
    }

    return {
      id: snapshot.docs[0].id,
      ...snapshot.docs[0].data()
    };
  } catch (error) {
    console.error('Error getting driver statistics:', error);
    throw error;
  }
}

/**
 * Update or create driver statistics
 * @param {string} driverId - Driver UID
 * @param {object} violation - Violation data
 * @returns {Promise<void>}
 */
export async function updateDriverStatistics(driverId, violation) {
  try {
    const period = new Date().toISOString().slice(0, 7); // YYYY-MM
    const statsRef = collection(db, 'driver_statistics');
    
    // Check if stats exist for this period
    const q = query(
      statsRef,
      where('driver_id', '==', driverId),
      where('period', '==', period)
    );
    
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      // Create new statistics document
      await addDoc(statsRef, {
        driver_id: driverId,
        driver_name: violation.driver_name || 'Unknown',
        vehicle_id: violation.vehicle_id || 'N/A',
        period: period,
        violations: {
          overspeed: {
            count: violation.type === 'overspeed' ? 1 : 0,
            details: violation.type === 'overspeed' ? [violation] : []
          },
          harsh_braking: {
            count: violation.type === 'harsh_braking' ? 1 : 0,
            details: violation.type === 'harsh_braking' ? [violation] : []
          },
          steep_slope: {
            count: violation.type === 'steep_slope' ? 1 : 0,
            details: violation.type === 'steep_slope' ? [violation] : []
          },
          auto_brake_triggered: {
            count: violation.type === 'auto_brake' ? 1 : 0,
            details: violation.type === 'auto_brake' ? [violation] : []
          },
          excessive_roll: {
            count: violation.type === 'excessive_roll' ? 1 : 0,
            details: violation.type === 'excessive_roll' ? [violation] : []
          }
        },
        total_violations: 1,
        total_trips: 0,
        violation_rate: 0,
        safety_score: 95,
        summary: {
          total_distance_km: 0,
          total_duration_hours: 0,
          avg_speed: 0
        },
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });
    } else {
      // Update existing statistics
      const docRef = doc(db, 'driver_statistics', snapshot.docs[0].id);
      const existingData = snapshot.docs[0].data();
      
      const violationType = violation.type;
      const currentViolations = existingData.violations[violationType] || { count: 0, details: [] };
      
      await updateDoc(docRef, {
        [`violations.${violationType}.count`]: currentViolations.count + 1,
        [`violations.${violationType}.details`]: [
          ...(currentViolations.details || []).slice(-19), // Keep last 20
          violation
        ],
        total_violations: existingData.total_violations + 1,
        safety_score: calculateSafetyScore(existingData.total_violations + 1, existingData.total_trips),
        updated_at: Timestamp.now()
      });
    }
  } catch (error) {
    console.error('Error updating driver statistics:', error);
    throw error;
  }
}

/**
 * Get all drivers statistics with ranking
 * @param {string} period - Period filter (optional)
 * @returns {Promise<Array>} Array of driver statistics
 */
export async function getAllDriversStatistics(period = null) {
  try {
    const statsRef = collection(db, 'driver_statistics');
    let q;
    
    if (period) {
      q = query(
        statsRef,
        where('period', '==', period),
        orderBy('total_violations', 'desc')
      );
    } else {
      q = query(statsRef, orderBy('total_violations', 'desc'));
    }

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc, index) => ({
      id: doc.id,
      rank: index + 1,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting all drivers statistics:', error);
    throw error;
  }
}

/**
 * Get driver violation history
 * @param {string} driverId - Driver UID
 * @param {number} limitCount - Limit results
 * @returns {Promise<Array>} Array of violations
 */
export async function getDriverViolationHistory(driverId, limitCount = 50) {
  try {
    const violationsRef = collection(db, 'driver_violations');
    const q = query(
      violationsRef,
      where('driver_id', '==', driverId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting violation history:', error);
    throw error;
  }
}

/**
 * Calculate safety score (0-100)
 * @param {number} totalViolations
 * @param {number} totalTrips
 * @returns {number} Safety score
 */
function calculateSafetyScore(totalViolations, totalTrips) {
  if (totalTrips === 0) return 100;
  
  let score = 100;
  const violationRate = totalViolations / totalTrips;
  
  // Penalty based on violation rate
  score -= violationRate * 20;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Generate dummy driver statistics for testing
 * @param {number} count - Number of drivers
 * @returns {Array} Array of driver statistics
 */
export function generateDummyDriverStats(count = 10) {
  const driverStats = [];
  const names = ['Ahmad Supir', 'Budi Driver', 'Citra Operator', 'Dedi Pengemudi', 'Eko Transport', 'Fitri Logistik', 'Gunawan Driver', 'Hadi Supir', 'Indra Operator', 'Joko Transport'];
  
  for (let i = 0; i < count; i++) {
    const overspeedCount = Math.floor(Math.random() * 10);
    const harshBrakeCount = Math.floor(Math.random() * 8);
    const steepSlopeCount = Math.floor(Math.random() * 5);
    const autoBrakeCount = Math.floor(Math.random() * 3);
    const rollCount = Math.floor(Math.random() * 4);
    
    const totalViolations = overspeedCount + harshBrakeCount + steepSlopeCount + autoBrakeCount + rollCount;
    const totalTrips = 15 + Math.floor(Math.random() * 20);
    
    // Generate violation details
    const generateViolationDetails = (type, count) => {
      const details = [];
      for (let j = 0; j < Math.min(count, 5); j++) {
        const timestamp = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);
        details.push({
          timestamp: timestamp.toISOString(),
          type: type,
          vehicle_id: `TRUCK_${String(i + 1).padStart(3, '0')}`,
          location: {
            lat: -6.966667 + (Math.random() - 0.5) * 0.5,
            lng: 110.419444 + (Math.random() - 0.5) * 0.5
          },
          value: type === 'overspeed' ? 65 + Math.floor(Math.random() * 25) : 
                 type === 'harsh_braking' ? -3.5 - Math.random() * 2 :
                 type === 'steep_slope' ? 12 + Math.random() * 10 :
                 type === 'excessive_roll' ? 10 + Math.random() * 8 : 0,
          trip_id: `TRIP_${Math.floor(Math.random() * 200)}`
        });
      }
      return details;
    };
    
    driverStats.push({
      id: `driver_stat_${i + 1}`,
      driver_id: `driver_uid_${i + 1}`,
      driver_name: names[i] || `Driver ${i + 1}`,
      vehicle_id: `TRUCK_${String(i + 1).padStart(3, '0')}`,
      period: '2026-02',
      violations: {
        overspeed: {
          count: overspeedCount,
          details: generateViolationDetails('overspeed', overspeedCount)
        },
        harsh_braking: {
          count: harshBrakeCount,
          details: generateViolationDetails('harsh_braking', harshBrakeCount)
        },
        steep_slope: {
          count: steepSlopeCount,
          details: generateViolationDetails('steep_slope', steepSlopeCount)
        },
        auto_brake_triggered: {
          count: autoBrakeCount,
          details: generateViolationDetails('auto_brake', autoBrakeCount)
        },
        excessive_roll: {
          count: rollCount,
          details: generateViolationDetails('excessive_roll', rollCount)
        }
      },
      total_violations: totalViolations,
      total_trips: totalTrips,
      violation_rate: totalTrips > 0 ? parseFloat((totalViolations / totalTrips).toFixed(2)) : 0,
      safety_score: calculateSafetyScore(totalViolations, totalTrips),
      summary: {
        total_distance_km: parseFloat((500 + Math.random() * 2000).toFixed(1)),
        total_duration_hours: parseFloat((20 + Math.random() * 80).toFixed(1)),
        avg_speed: parseFloat((35 + Math.random() * 20).toFixed(1))
      },
      rank: i + 1
    });
  }
  
  // Sort by total violations (descending)
  driverStats.sort((a, b) => b.total_violations - a.total_violations);
  
  // Update ranks
  driverStats.forEach((stat, index) => {
    stat.rank = index + 1;
  });
  
  return driverStats;
}