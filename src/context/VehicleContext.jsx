import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, push, query, orderByChild, limitToLast, serverTimestamp, set } from 'firebase/database';
import { rtdb } from '../services/firebase';
import { useAuth } from './AuthContext';

const VehicleContext = createContext(null);

export function useVehicle() {
  const ctx = useContext(VehicleContext);
  if (!ctx) throw new Error('useVehicle must be used within VehicleProvider');
  return ctx;
}

export function VehicleProvider({ children }) {
  const { userData } = useAuth();
  const vehicleId = userData?.vehicleId || 'TRUCK_001';

  const [liveData, setLiveData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [speedHistory, setSpeedHistory] = useState([]);
  const [routeHistory, setRouteHistory] = useState([]);
  const [events, setEvents] = useState([]);
  const [settings, setSettings] = useState({
    speedLimit: 60,
    tiltThreshold: 15,
  });

  const [isSimulating, setIsSimulating] = useState(false);
  const simIntervalRef = useRef(null);
  const simTickRef = useRef(0);
  const lastSimAlertRef = useRef(0);
  const maxHistory = 60;
  const connectionTimeoutRef = useRef(null);
  const basePosRef = useRef({ lat: -6.966667, lng: 110.419444 });

  // ============================================================
  // FIREBASE LISTENERS — selalu aktif, baca data real + simulasi
  // ============================================================
  useEffect(() => {
    if (!vehicleId) return;

    // 1. Live data
    const liveRef = ref(rtdb, `vehicles/${vehicleId}/live`);
    const unsubLive = onValue(liveRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setLiveData(data);
        setLastUpdate(Date.now());
        setIsConnected(true);

        // Speed history
        setSpeedHistory(prev => {
          const now = new Date();
          const label = now.toLocaleTimeString('id-ID', {
            hour: '2-digit', minute: '2-digit', second: '2-digit'
          });
          const next = [...prev, { time: label, speed: data.gps?.speed || 0, limit: settings.speedLimit }];
          return next.slice(-maxHistory);
        });

        // Route history
        if (data.gps?.lat && data.gps?.lng) {
          setRouteHistory(prev => [...prev, { lat: data.gps.lat, lng: data.gps.lng }].slice(-100));
        }

        if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
        connectionTimeoutRef.current = setTimeout(() => setIsConnected(false), 5000);
      }
    });

    // 2. Settings
    const settingsRef = ref(rtdb, `settings/${vehicleId}`);
    const unsubSettings = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) setSettings(prev => ({ ...prev, ...snapshot.val() }));
    });

    // 3. Events — SELALU baca dari Firebase (persisten!)
    const eventsRef = query(
      ref(rtdb, `vehicles/${vehicleId}/events`),
      orderByChild('timestamp'),
      limitToLast(200)
    );
    const unsubEvents = onValue(eventsRef, (snapshot) => {
      if (snapshot.exists()) {
        const list = [];
        snapshot.forEach(child => list.push({ id: child.key, ...child.val() }));
        list.reverse();
        setEvents(list);
      } else {
        setEvents([]);
      }
    });

    return () => {
      unsubLive();
      unsubSettings();
      unsubEvents();
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    };
  }, [vehicleId, settings.speedLimit]);

  // ============================================================
  // SIMULASI — tulis ke FIREBASE (bukan state lokal!)
  // Sehingga data persisten, behavior log & admin tetap bisa baca
  // ============================================================
  const startSimulation = useCallback(() => {
    if (simIntervalRef.current) return;
    setIsSimulating(true);
    simTickRef.current = 0;
    lastSimAlertRef.current = 0;
    setSpeedHistory([]);
    setRouteHistory([]);
    basePosRef.current = { lat: -6.966667, lng: 110.419444 };

    simIntervalRef.current = setInterval(() => {
      simTickRef.current++;
      const tick = simTickRef.current;
      let speed, tilt, mode = 'normal', forcedBrake = false, exhaustActive = false;

      // === SKENARIO SIMULASI SESUAI FLOWCHART ===
      if (tick <= 8) {
        speed = 30 + tick * 3;
        tilt = 2 + Math.sin(tick * 0.5) * 3;
      } else if (tick <= 15) {
        speed = 62 + (tick - 8) * 4;
        tilt = 3 + Math.random() * 4;
      } else if (tick <= 22) {
        speed = 85 - (tick - 15) * 6;
        tilt = 4 + Math.sin(tick * 0.3) * 5;
      } else if (tick <= 30) {
        speed = 30 + Math.random() * 10;
        tilt = 12 + (tick - 22) * 1.5;
      } else if (tick <= 38) {
        speed = 40 + Math.random() * 10;
        tilt = 24 - (tick - 30) * 2.5;
      } else if (tick <= 45) {
        speed = 70 + (tick - 38) * 3;
        tilt = 5 + Math.random() * 4;
      } else if (tick <= 52) {
        speed = 65 + Math.random() * 10;
        tilt = 14 + (tick - 45) * 1.2;
      } else if (tick <= 60) {
        speed = 35 + Math.random() * 10;
        tilt = Math.max(2, 22 - (tick - 52) * 2.5);
      } else {
        simTickRef.current = 0;
        speed = 25; tilt = 2;
      }

      speed = parseFloat(Math.max(0, speed).toFixed(1));
      tilt = parseFloat(Math.max(0, tilt).toFixed(1));

      const isOverspeed = speed > settings.speedLimit;
      const isSteepSlope = tilt > settings.tiltThreshold;

      // Flowchart logic
      if (isOverspeed) {
        mode = 'forced_brake';
        forcedBrake = true;
        exhaustActive = true;
      } else if (isSteepSlope) {
        mode = 'adaptive';
        exhaustActive = true;
      } else {
        mode = 'normal';
        exhaustActive = false;
      }

      basePosRef.current.lat += (Math.random() - 0.5) * 0.0005;
      basePosRef.current.lng += (Math.random() - 0.5) * 0.0005;

      const nowMs = Date.now();

      // === TULIS LIVE DATA KE FIREBASE ===
      const liveRef = ref(rtdb, `vehicles/${vehicleId}/live`);
      set(liveRef, {
        gps: {
          speed, heading: Math.random() * 360,
          lat: basePosRef.current.lat, lng: basePosRef.current.lng,
          satellites: 6 + Math.floor(Math.random() * 4),
        },
        tilt,
        brake: { exhaust_active: exhaustActive, forced: forcedBrake },
        mode,
        connection: 'online',
        timestamp: nowMs,
      });

      // === TULIS EVENT KE FIREBASE (persisten!) ===
      if (nowMs - lastSimAlertRef.current > 3000) {
        let newEvent = null;

        if (forcedBrake) {
          newEvent = {
            type: 'forced_brake', severity: 'critical',
            message: `Forced Brake aktif! Kecepatan ${speed} km/h melebihi batas ${settings.speedLimit} km/h`,
            speed, tilt, lat: basePosRef.current.lat, lng: basePosRef.current.lng,
            timestamp: nowMs,
          };
        } else if (isOverspeed) {
          newEvent = {
            type: 'overspeed', severity: speed > 80 ? 'danger' : 'warning',
            message: `Kecepatan ${speed} km/h melebihi batas ${settings.speedLimit} km/h`,
            speed, tilt, lat: basePosRef.current.lat, lng: basePosRef.current.lng,
            timestamp: nowMs,
          };
        } else if (isSteepSlope) {
          newEvent = {
            type: 'steep_slope', severity: 'danger',
            message: `Turunan ekstrem ${tilt}° (batas ${settings.tiltThreshold}°) — Mode Adaptif aktif`,
            speed, tilt, lat: basePosRef.current.lat, lng: basePosRef.current.lng,
            timestamp: nowMs,
          };
        }

        if (newEvent) {
          lastSimAlertRef.current = nowMs;
          // TULIS KE FIREBASE — data persisten!
          const eventsRef = ref(rtdb, `vehicles/${vehicleId}/events`);
          push(eventsRef, newEvent);
        }
      }
    }, 1000);
  }, [settings, vehicleId]);

  // === STOP SIMULASI — TIDAK HAPUS DATA ===
  const stopSimulation = useCallback(() => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimulating(false);
    // TIDAK clear events, TIDAK clear liveData
    // Data tetap ada di Firebase, listener tetap baca
  }, []);

  // Cleanup saat unmount
  useEffect(() => {
    return () => { if (simIntervalRef.current) clearInterval(simIntervalRef.current); };
  }, []);

  const clearRoute = useCallback(() => setRouteHistory([]), []);

  return (
    <VehicleContext.Provider value={{
      vehicleId, liveData, isConnected, lastUpdate,
      speedHistory, routeHistory, events, settings,
      isSimulating, startSimulation, stopSimulation, clearRoute,
    }}>
      {children}
    </VehicleContext.Provider>
  );
}
