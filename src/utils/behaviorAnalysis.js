// ============================================
// BEHAVIOR ANALYSIS UTILITIES
// Algorithms for detecting driving behavior
// ============================================

/**
 * Detect sudden speed changes (acceleration/deceleration)
 * @param {number} currentSpeed - Current speed (km/h)
 * @param {number} previousSpeed - Previous speed (km/h)
 * @param {number} deltaTime - Time difference in seconds
 * @returns {object|null} Event object or null
 */
export function detectSuddenSpeedChange(currentSpeed, previousSpeed, deltaTime = 1) {
  const speedDelta = currentSpeed - previousSpeed;
  const acceleration = speedDelta / deltaTime; // km/h per second
  
  // Convert to m/s² for standard unit
  const accelMS2 = (acceleration * 1000) / 3600;
  
  // Thresholds
  const SUDDEN_ACCEL_THRESHOLD = 5; // km/h/s
  const SUDDEN_DECEL_THRESHOLD = -5; // km/h/s
  
  if (Math.abs(acceleration) > Math.abs(SUDDEN_ACCEL_THRESHOLD)) {
    return {
      type: acceleration > 0 ? 'sudden_acceleration' : 'sudden_deceleration',
      severity: Math.abs(acceleration) > 8 ? 'high' : 'medium',
      speed_before: previousSpeed,
      speed_after: currentSpeed,
      delta: speedDelta,
      acceleration: acceleration,
      accel_ms2: accelMS2
    };
  }
  
  return null;
}

/**
 * Calculate speed variance (standard deviation)
 * @param {Array<number>} speeds - Array of speed values
 * @returns {number} Standard deviation
 */
export function calculateSpeedVariance(speeds) {
  if (speeds.length === 0) return 0;
  
  const mean = speeds.reduce((sum, speed) => sum + speed, 0) / speeds.length;
  const squaredDiffs = speeds.map(speed => Math.pow(speed - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / speeds.length;
  
  return Math.sqrt(variance);
}

/**
 * Calculate driving smoothness score (0-100)
 * Higher score = smoother driving
 * @param {Array<number>} speedData - Array of speed values
 * @param {Array<object>} events - Array of sudden change events
 * @returns {number} Smoothness score (0-100)
 */
export function calculateSmoothnessScore(speedData, events = []) {
  if (speedData.length === 0) return 100;
  
  let score = 100;
  
  // Penalty for speed variance
  const variance = calculateSpeedVariance(speedData);
  score -= Math.min(variance * 2, 30); // Max 30 points penalty
  
  // Penalty for sudden events
  const suddenEvents = events.filter(e => 
    e.type === 'sudden_acceleration' || e.type === 'sudden_deceleration'
  );
  score -= suddenEvents.length * 5; // 5 points per event
  
  // Penalty for high severity events
  const highSeverityEvents = suddenEvents.filter(e => e.severity === 'high');
  score -= highSeverityEvents.length * 5; // Additional 5 points
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Calculate consistency score (0-100)
 * Measures how consistent the speed is maintained
 * @param {Array<number>} speedData - Array of speed values
 * @returns {number} Consistency score (0-100)
 */
export function calculateConsistencyScore(speedData) {
  if (speedData.length === 0) return 100;
  
  const variance = calculateSpeedVariance(speedData);
  const mean = speedData.reduce((sum, s) => sum + s, 0) / speedData.length;
  
  // Coefficient of variation (CV)
  const cv = mean > 0 ? (variance / mean) * 100 : 0;
  
  // Lower CV = more consistent
  // CV < 10% = excellent (score 90-100)
  // CV 10-20% = good (score 70-90)
  // CV 20-30% = fair (score 50-70)
  // CV > 30% = poor (score 0-50)
  
  let score = 100 - (cv * 2);
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Analyze brake pattern
 * @param {Array<string>} brakeStatuses - Array of brake status ('normal', 'braking', 'auto')
 * @returns {object} Brake pattern analysis
 */
export function analyzeBrakePattern(brakeStatuses) {
  const total = brakeStatuses.length;
  const brakingCount = brakeStatuses.filter(s => s === 'braking').length;
  const autoCount = brakeStatuses.filter(s => s === 'auto').length;
  
  // Calculate average brake duration (simplified)
  let brakeDurations = [];
  let currentBrakeDuration = 0;
  
  brakeStatuses.forEach(status => {
    if (status === 'braking' || status === 'auto') {
      currentBrakeDuration++;
    } else {
      if (currentBrakeDuration > 0) {
        brakeDurations.push(currentBrakeDuration);
        currentBrakeDuration = 0;
      }
    }
  });
  
  const avgDuration = brakeDurations.length > 0
    ? brakeDurations.reduce((sum, d) => sum + d, 0) / brakeDurations.length
    : 0;
  
  return {
    total_brake_count: brakingCount,
    auto_brake_count: autoCount,
    brake_frequency: total > 0 ? (brakingCount / total) * 100 : 0,
    avg_brake_duration: avgDuration,
    brake_score: calculateBrakeScore(brakingCount, autoCount, total)
  };
}

/**
 * Calculate brake score (0-100)
 * @param {number} brakingCount
 * @param {number} autoCount
 * @param {number} total
 * @returns {number}
 */
function calculateBrakeScore(brakingCount, autoCount, total) {
  let score = 100;
  
  // Penalty for frequent braking
  const brakeFrequency = total > 0 ? (brakingCount / total) * 100 : 0;
  if (brakeFrequency > 20) score -= (brakeFrequency - 20) * 2;
  
  // Heavy penalty for auto brake
  score -= autoCount * 10;
  
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Process behavior log data for 1 minute
 * @param {Array<object>} dataPoints - Array of realtime data (60 data points)
 * @returns {object} Processed behavior log with enhanced metrics
 */
export function processBehaviorData(dataPoints) {
  if (!dataPoints || dataPoints.length === 0) {
    return null;
  }
  
  // Extract speed data
  const speeds = dataPoints.map(d => d.gps?.speed || 0);
  const pitches = dataPoints.map(d => d.imu?.pitch || 0);
  const rolls = dataPoints.map(d => d.imu?.roll || 0);
  const brakeStatuses = dataPoints.map(d => d.brake?.status || 'normal');
  
  // Detect events
  const accelerationEvents = [];
  for (let i = 1; i < dataPoints.length; i++) {
    const event = detectSuddenSpeedChange(
      dataPoints[i].gps?.speed || 0,
      dataPoints[i - 1].gps?.speed || 0,
      1 // 1 second interval
    );
    
    if (event) {
      accelerationEvents.push({
        ...event,
        timestamp: dataPoints[i].timestamp,
        index: i
      });
    }
  }
  
  // Calculate metrics
  const speedVariance = calculateSpeedVariance(speeds);
  const smoothnessScore = calculateSmoothnessScore(speeds, accelerationEvents);
  const consistencyScore = calculateConsistencyScore(speeds);
  const brakePattern = analyzeBrakePattern(brakeStatuses);
  
  // Basic stats
  const speed_avg = speeds.reduce((sum, s) => sum + s, 0) / speeds.length;
  const speed_max = Math.max(...speeds);
  const speed_min = Math.min(...speeds);
  const pitch_avg = pitches.reduce((sum, p) => sum + p, 0) / pitches.length;
  const roll_avg = rolls.reduce((sum, r) => sum + r, 0) / rolls.length;
  
  const lastDataPoint = dataPoints[dataPoints.length - 1];
  
  return {
    // Basic data (existing)
    vehicle_id: lastDataPoint.vehicle_id,
    timestamp: new Date(lastDataPoint.timestamp),
    speed_avg: parseFloat(speed_avg.toFixed(2)),
    speed_max: parseFloat(speed_max.toFixed(2)),
    speed_min: parseFloat(speed_min.toFixed(2)),
    pitch_avg: parseFloat(pitch_avg.toFixed(2)),
    roll_avg: parseFloat(roll_avg.toFixed(2)),
    brake_status: brakePattern.total_brake_count > 0 ? 'braking' : 'normal',
    auto_brake_count: brakePattern.auto_brake_count,
    location: {
      lat: lastDataPoint.gps?.lat,
      lng: lastDataPoint.gps?.lng
    },
    
    // NEW: Enhanced metrics
    speed_variance: parseFloat(speedVariance.toFixed(2)),
    acceleration_events: accelerationEvents,
    brake_pattern: brakePattern,
    driving_smoothness_score: smoothnessScore,
    consistency_score: consistencyScore,
    
    // Overall status
    status: determineStatus(speed_avg, pitch_avg, roll_avg, accelerationEvents)
  };
}

/**
 * Determine overall status
 * @param {number} speed
 * @param {number} pitch
 * @param {number} roll
 * @param {Array} events
 * @returns {string} 'normal' | 'warning' | 'danger'
 */
function determineStatus(speed, pitch, roll, events) {
  // Danger conditions
  if (speed > 70) return 'danger';
  if (Math.abs(pitch) > 15) return 'danger';
  if (Math.abs(roll) > 10) return 'danger';
  if (events.filter(e => e.severity === 'high').length > 0) return 'danger';
  
  // Warning conditions
  if (speed > 60) return 'warning';
  if (Math.abs(pitch) > 10) return 'warning';
  if (Math.abs(roll) > 7) return 'warning';
  if (events.length > 2) return 'warning';
  
  return 'normal';
}