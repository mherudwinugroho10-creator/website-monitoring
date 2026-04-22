// ============================================================
// VEHICLE DATA SERVICE
// Satu file pusat untuk semua data kendaraan.
// Saat ini menggunakan dummy data untuk pengujian.
// Nanti saat alat ESP32 sudah terhubung, ganti ke Firebase.
// ============================================================

import { ref, onValue } from 'firebase/database';
// import { realtimeDb } from './firebase'; // Uncomment saat pakai Firebase

// ================== KONFIGURASI ==================
export const VEHICLE_CONFIG = {
  vehicleId: 'TRUCK_001',
  vehicleName: 'Truck Hino 500',
  speedLimit: 60,        // km/h
  pitchThreshold: 15,    // derajat
  rollThreshold: 10,     // derajat
  baseLocation: {
    lat: -6.966667,
    lng: 110.419444,
    city: 'Semarang',
  },
};

// ================== DUMMY DATA STATIS ==================
export const DASHBOARD_STATS = {
  totalTrips: 47,
  avgSpeed: 42.3,
  safetyScore: 87,
  totalAlerts: 19,
};

export const VEHICLES_LIST = [
  { id: 'TRUCK_001', name: 'Truck Hino 500', location: 'Jl. Raya Semarang-Solo KM 12', status: 'active', speed: 45 },
  { id: 'TRUCK_002', name: 'Truck Fuso Fighter', location: 'Depo Semarang', status: 'idle', speed: 0 },
  { id: 'TRUCK_003', name: 'Truck Canter', location: 'Jl. Pantura KM 45', status: 'active', speed: 38 },
];

export const RECENT_ACTIVITIES = [
  { type: 'trip_start', text: 'Perjalanan dimulai — Rute Semarang-Solo', time: '10 menit lalu', color: 'text-blue-400' },
  { type: 'overspeed', text: 'Kecepatan 72 km/h melebihi batas 60 km/h', time: '25 menit lalu', color: 'text-yellow-400' },
  { type: 'auto_brake', text: 'Sistem pengereman otomatis diaktifkan', time: '30 menit lalu', color: 'text-red-400' },
  { type: 'tilt', text: 'Alert kemiringan berlebih dikonfirmasi', time: '1 jam lalu', color: 'text-green-400' },
  { type: 'trip_end', text: 'Perjalanan selesai — Skor: 92/100', time: '2 jam lalu', color: 'text-green-400' },
];

// Data Admin
export const ADMIN_STATS = {
  totalUsers: 12,
  activeUsers: 8,
  totalVehicles: 5,
  activeVehicles: 3,
  totalAlerts: 156,
  criticalAlerts: 23,
  avgSafetyScore: 85,
};

export const RECENT_USERS = [
  { id: 1, name: 'Ahmad Supardi', role: 'user', status: 'active', lastLogin: '5 menit lalu' },
  { id: 2, name: 'Budi Santoso', role: 'user', status: 'active', lastLogin: '1 jam lalu' },
  { id: 3, name: 'Citra Dewi', role: 'admin', status: 'active', lastLogin: '2 jam lalu' },
  { id: 4, name: 'Dedi Kurniawan', role: 'user', status: 'inactive', lastLogin: '3 hari lalu' },
];

export const SYSTEM_STATUS = [
  { label: 'Firebase Realtime DB', status: 'Online', online: true },
  { label: 'ESP32 Gateway', status: 'Connected', online: true },
  { label: 'GPS Module', status: 'Active', online: true },
  { label: 'Auto Brake System', status: 'Standby', online: false },
];

// ================== SIMULASI SENSOR ==================
// Skenario simulasi: normal → overspeed → tanjakan → roll → auto brake → recovery
export function generateSensorTick(tick) {
  let speed, tiltX, tiltY, autoBrake = false;
  const { speedLimit, pitchThreshold, rollThreshold } = VEHICLE_CONFIG;

  if (tick <= 8) {
    speed = 30 + tick * 3;
    tiltX = 2 + Math.sin(tick * 0.5) * 3;
    tiltY = 1 + Math.cos(tick * 0.5) * 2;
  } else if (tick <= 15) {
    speed = 62 + (tick - 8) * 4;
    tiltX = 3 + Math.random() * 4;
    tiltY = 2 + Math.random() * 3;
  } else if (tick <= 22) {
    speed = 85 - (tick - 15) * 6;
    tiltX = 4 + Math.sin(tick * 0.3) * 5;
    tiltY = 3 + Math.cos(tick * 0.3) * 4;
  } else if (tick <= 30) {
    speed = 30 + Math.random() * 10;
    tiltX = 12 + (tick - 22) * 1.5;
    tiltY = 4 + Math.random() * 3;
  } else if (tick <= 38) {
    speed = 40 + Math.random() * 10;
    tiltX = 24 - (tick - 30) * 2.5;
    tiltY = 3 + Math.random() * 2;
  } else if (tick <= 45) {
    speed = 70 + (tick - 38) * 3;
    tiltX = 5 + Math.random() * 4;
    tiltY = 3 + Math.random() * 3;
  } else if (tick <= 52) {
    speed = 55 + Math.random() * 10;
    tiltX = 6 + Math.random() * 4;
    tiltY = 8 + (tick - 45) * 1.5;
    autoBrake = tiltY > rollThreshold;
  } else if (tick <= 60) {
    speed = 35 + Math.random() * 10;
    tiltX = 3 + Math.random() * 3;
    tiltY = Math.max(2, 18 - (tick - 52) * 2);
  } else {
    return null; // Reset signal
  }

  speed = parseFloat(Math.max(0, speed).toFixed(1));
  tiltX = parseFloat(tiltX.toFixed(1));
  tiltY = parseFloat(tiltY.toFixed(1));

  const { lat, lng } = VEHICLE_CONFIG.baseLocation;

  return {
    speed,
    tiltX,
    tiltY,
    brakeStatus: speed > speedLimit || autoBrake,
    autoBrake,
    latitude: lat + (Math.random() - 0.5) * 0.01,
    longitude: lng + (Math.random() - 0.5) * 0.01,
    altitude: 148 + Math.random() * 20,
    satellites: 6 + Math.floor(Math.random() * 4),
    isOverspeed: speed > speedLimit,
    isTiltDanger: tiltX > pitchThreshold,
    isRollDanger: tiltY > rollThreshold,
  };
}

// ================== BEHAVIOR LOG DATA ==================
export function generateBehaviorLogs(count = 50) {
  const types = ['overspeed', 'harsh_braking', 'steep_slope', 'auto_brake', 'excessive_roll', 'normal'];
  const now = new Date();
  const logs = [];

  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(Math.random() * types.length)];
    const timestamp = new Date(now.getTime() - i * 1800000);
    const speed = Math.round(30 + Math.random() * 50);
    const tiltX = parseFloat(((Math.random() - 0.5) * 20).toFixed(1));
    const tiltY = parseFloat(((Math.random() - 0.5) * 20).toFixed(1));

    let description;
    switch (type) {
      case 'overspeed':
        description = `Kecepatan ${65 + Math.floor(Math.random() * 25)} km/h melebihi batas ${VEHICLE_CONFIG.speedLimit} km/h`;
        break;
      case 'harsh_braking':
        description = `Pengereman mendadak terdeteksi (${(-3.5 - Math.random() * 2).toFixed(1)} m/s²)`;
        break;
      case 'steep_slope':
        description = `Kemiringan ${(12 + Math.random() * 10).toFixed(1)}° melebihi batas aman`;
        break;
      case 'auto_brake':
        description = 'Sistem pengereman otomatis aktif';
        break;
      case 'excessive_roll':
        description = `Kemiringan samping ${(10 + Math.random() * 8).toFixed(1)}° melebihi batas`;
        break;
      default:
        description = 'Berkendara normal — semua parameter aman';
    }

    logs.push({
      id: `log_${i + 1}`,
      timestamp,
      type,
      speed,
      tiltX,
      tiltY,
      description,
      vehicle_id: VEHICLE_CONFIG.vehicleId,
      smoothness: Math.round(60 + Math.random() * 40),
    });
  }

  return logs;
}

// ================== HELPER: Cek status bahaya ==================
export function checkDangerStatus(data) {
  const { speedLimit, pitchThreshold, rollThreshold } = VEHICLE_CONFIG;
  return {
    isOverspeed: data.speed > speedLimit,
    isTiltDanger: Math.abs(data.tiltX) > pitchThreshold,
    isRollDanger: Math.abs(data.tiltY) > rollThreshold,
    isAnyDanger: data.speed > speedLimit || Math.abs(data.tiltX) > pitchThreshold || Math.abs(data.tiltY) > rollThreshold || data.autoBrake,
  };
}

// ================== HELPER: Type styling ==================
export function getEventTypeConfig(type) {
  const config = {
    overspeed: { label: 'Overspeed', color: 'bg-orange-500/10 text-orange-400', dotColor: 'bg-orange-400' },
    harsh_braking: { label: 'Hard Brake', color: 'bg-yellow-500/10 text-yellow-400', dotColor: 'bg-yellow-400' },
    steep_slope: { label: 'Kemiringan', color: 'bg-blue-500/10 text-blue-400', dotColor: 'bg-blue-400' },
    auto_brake: { label: 'Auto Brake', color: 'bg-red-500/10 text-red-400', dotColor: 'bg-red-400' },
    excessive_roll: { label: 'Roll', color: 'bg-purple-500/10 text-purple-400', dotColor: 'bg-purple-400' },
    normal: { label: 'Normal', color: 'bg-green-500/10 text-green-400', dotColor: 'bg-green-400' },
  };
  return config[type] || { label: type, color: 'bg-gray-500/10 text-gray-400', dotColor: 'bg-gray-400' };
}

// ============================================================
// DATA UNTUK BEHAVIOR LOG
// Grafik variasi kecepatan = akumulasi semua sesi monitoring
// ============================================================

export function generateSpeedHistoryLog(count = 60) {
  const data = [];
  const now = new Date();
  const events = [];

  for (let i = 0; i < count; i++) {
    const time = new Date(now.getTime() - (count - i) * 60000);
    let speed;

    // Simulasi pola: normal → overspeed → turun → naik lagi
    if (i < 15) {
      speed = 35 + Math.random() * 15; // 35-50
    } else if (i < 25) {
      speed = 55 + Math.random() * 25; // 55-80 (overspeed zone)
    } else if (i < 35) {
      speed = 30 + Math.random() * 20; // 30-50 (turun)
    } else if (i < 45) {
      speed = 50 + Math.random() * 30; // 50-80
    } else {
      speed = 25 + Math.random() * 25; // 25-50 (recovery)
    }

    speed = Math.round(speed * 10) / 10;

    const entry = {
      time: time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      timestamp: time,
      speed,
      limit: VEHICLE_CONFIG.speedLimit,
    };
    data.push(entry);

    // Detect events
    if (speed > VEHICLE_CONFIG.speedLimit) {
      if (i > 0 && data[i - 1].speed <= VEHICLE_CONFIG.speedLimit) {
        events.push({
          type: 'overspeed',
          severity: speed > 80 ? 'high' : 'medium',
          timestamp: time,
          speed,
          delta: speed - VEHICLE_CONFIG.speedLimit,
        });
      }
    }

    if (i > 0) {
      const diff = speed - data[i - 1].speed;
      if (diff < -15) {
        events.push({
          type: 'sudden_deceleration',
          severity: 'high',
          timestamp: time,
          speed,
          delta: diff,
        });
      }
    }
  }

  return { data, events };
}

export function calculatePerformanceScores(logs) {
  if (!logs || logs.length === 0) return { smoothness: 0, consistency: 0 };

  // Smoothness: rata-rata dari field smoothness tiap log
  const smoothness = Math.round(
    logs.reduce((sum, log) => sum + (log.smoothness || 50), 0) / logs.length
  );

  // Consistency: 100 - standar deviasi smoothness (semakin stabil = semakin tinggi)
  const scores = logs.map(l => l.smoothness || 50);
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + Math.pow(s - avg, 2), 0) / scores.length;
  const consistency = Math.max(0, Math.min(100,
    Math.round(100 - Math.sqrt(variance) * 1.5)
  ));

  return { smoothness, consistency };
}