// Format date to Indonesian locale
export function formatDate(date, options = {}) {
  const defaultOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  };
  return new Date(date).toLocaleDateString('id-ID', defaultOptions);
}

// Format time
export function formatTime(date) {
  return new Date(date).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Format datetime
export function formatDateTime(date) {
  return `${formatDate(date)} ${formatTime(date)}`;
}

// Format duration from minutes
export function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours === 0) return `${mins} menit`;
  if (mins === 0) return `${hours} jam`;
  return `${hours} jam ${mins} menit`;
}

// Format distance
export function formatDistance(km) {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

// Format speed
export function formatSpeed(speed) {
  return `${Math.round(speed)} km/h`;
}

// Calculate average of array
export function average(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Calculate distance between two coordinates (Haversine formula)
export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Generate unique ID
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Determine status based on data
export function determineStatus(data, settings) {
  const { speed } = data.gps || {};
  const { pitch, roll } = data.imu || {};
  const { auto_active } = data.brake || {};
  
  const {
    speedLimit = 60,
    pitchThreshold = 15,
    rollThreshold = 10,
  } = settings;

  // DANGER conditions
  if (speed > speedLimit + 10) return 'danger';
  if (Math.abs(pitch) > pitchThreshold) return 'danger';
  if (Math.abs(roll) > rollThreshold) return 'danger';
  if (auto_active) return 'danger';

  // WARNING conditions
  if (speed > speedLimit) return 'warning';
  if (Math.abs(pitch) > pitchThreshold * 0.7) return 'warning';
  if (Math.abs(roll) > rollThreshold * 0.7) return 'warning';

  return 'normal';
}

// Clamp value between min and max
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Debounce function
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}