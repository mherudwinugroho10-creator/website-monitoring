import { useState, useEffect, useCallback, useRef } from 'react';
import { ref, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { rtdb } from '../services/firebase';

// === DATA DUMMY TERPUSAT ===
// Saat alat belum konek, simulasi menulis data identik dengan format ESP32
// Saat alat konek, data real masuk ke path yang sama → otomatis terbaca

export function useVehicleData(vehicleId = 'TRUCK_001') {
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

  // === SIMULASI STATE ===
  const [isSimulating, setIsSimulating] = useState(false);
  const [simData, setSimData] = useState(null);
  const simIntervalRef = useRef(null);
  const simTickRef = useRef(0);
  const simEventsRef = useRef([]);
  const simEventIdRef = useRef(0);
  const lastSimAlertRef = useRef(0);

  const maxHistory = 60;
  const connectionTimeoutRef = useRef(null);

  // === LISTEN FIREBASE (data real dari ESP32) ===
  useEffect(() => {
    if (!vehicleId) return;

    const liveRef = ref(rtdb, `vehicles/${vehicleId}/live`);
    const unsubLive = onValue(liveRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        // Hanya update jika TIDAK sedang simulasi
        if (!isSimulating) {
          setLiveData(data);
          setLastUpdate(Date.now());
          setIsConnected(true);

          setSpeedHistory(prev => {
            const now = new Date();
            const label = now.toLocaleTimeString('id-ID', {
              hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            const next = [...prev, {
              time: label,
              speed: data.gps?.speed || 0,
              limit: settings.speedLimit
            }];
            return next.slice(-maxHistory);
          });

          if (data.gps?.lat && data.gps?.lng) {
            setRouteHistory(prev => {
              const next = [...prev, { lat: data.gps.lat, lng: data.gps.lng }];
              return next.slice(-100);
            });
          }

          if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = setTimeout(() => setIsConnected(false), 5000);
        }
      }
    });

    const settingsRef = ref(rtdb, `settings/${vehicleId}`);
    const unsubSettings = onValue(settingsRef, (snapshot) => {
      if (snapshot.exists()) {
        setSettings(prev => ({ ...prev, ...snapshot.val() }));
      }
    });

    const eventsRef = query(
      ref(rtdb, `vehicles/${vehicleId}/events`),
      orderByChild('timestamp'),
      limitToLast(50)
    );
    const unsubEvents = onValue(eventsRef, (snapshot) => {
      if (snapshot.exists() && !isSimulating) {
        const list = [];
        snapshot.forEach(child => {
          list.push({ id: child.key, ...child.val() });
        });
        list.reverse();
        setEvents(list);
      }
    });

    return () => {
      unsubLive();
      unsubSettings();
      unsubEvents();
      if (connectionTimeoutRef.current) clearTimeout(connectionTimeoutRef.current);
    };
  }, [vehicleId, isSimulating, settings.speedLimit]);

  // === SIMULASI: START ===
  const startSimulation = useCallback(() => {
    if (simIntervalRef.current) return;
    setIsSimulating(true);
    simTickRef.current = 0;
    simEventsRef.current = [];
    simEventIdRef.current = 0;
    setSpeedHistory([]);
    setRouteHistory([]);
    setEvents([]);

    const basePos = { lat: -6.966667, lng: 110.419444 };

    simIntervalRef.current = setInterval(() => {
      simTickRef.current++;
      const tick = simTickRef.current;
      let speed, tilt, mode = 'normal', forcedBrake = false, exhaustActive = false;

      // === SKENARIO SIMULASI SESUAI FLOWCHART ===
      if (tick <= 8) {
        // Fase 1: Normal driving
        speed = 30 + tick * 3;
        tilt = 2 + Math.sin(tick * 0.5) * 3;
      } else if (tick <= 15) {
        // Fase 2: Overspeed → FORCED BRAKE
        speed = 62 + (tick - 8) * 4;
        tilt = 3 + Math.random() * 4;
      } else if (tick <= 22) {
        // Fase 3: Slowdown kembali normal
        speed = 85 - (tick - 15) * 6;
        tilt = 4 + Math.sin(tick * 0.3) * 5;
      } else if (tick <= 30) {
        // Fase 4: Turunan Ekstrem → ADAPTIVE MODE
        speed = 30 + Math.random() * 10;
        tilt = 12 + (tick - 22) * 1.5;
      } else if (tick <= 38) {
        // Fase 5: Recovery dari turunan
        speed = 40 + Math.random() * 10;
        tilt = 24 - (tick - 30) * 2.5;
      } else if (tick <= 45) {
        // Fase 6: Overspeed lagi
        speed = 70 + (tick - 38) * 3;
        tilt = 5 + Math.random() * 4;
      } else if (tick <= 52) {
        // Fase 7: Turunan + speed tinggi → FORCED BRAKE + ADAPTIVE
        speed = 65 + Math.random() * 10;
        tilt = 14 + (tick - 45) * 1.2;
      } else if (tick <= 60) {
        // Fase 8: Recovery total
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

      // === LOGIC SESUAI FLOWCHART ===
      // 1. Cek Overspeed → YA: Forced Brake (relay ON, alarm ON)
      if (isOverspeed) {
        mode = 'forced_brake';
        forcedBrake = true;
        exhaustActive = true;
      } else {
        // Exhaust Brake OFF (jika tidak overspeed)
        forcedBrake = false;
      }

      // 2. Cek Kemiringan → YA: Adaptive Mode
      if (isSteepSlope) {
        // Jika sudah forced_brake, tetap forced_brake (lebih prioritas)
        if (!isOverspeed) {
          mode = 'adaptive';
        }
        exhaustActive = true; // exhaust brake juga aktif di adaptive
      }

      // 3. Tidak keduanya → Normal Mode
      if (!isOverspeed && !isSteepSlope) {
        mode = 'normal';
        exhaustActive = false;
      }

      // Update posisi simulasi
      basePos.lat += (Math.random() - 0.5) * 0.0005;
      basePos.lng += (Math.random() - 0.5) * 0.0005;

      const data = {
        gps: {
          speed,
          heading: Math.random() * 360,
          lat: basePos.lat,
          lng: basePos.lng,
          satellites: 6 + Math.floor(Math.random() * 4),
        },
        tilt,
        brake: {
          exhaust_active: exhaustActive,
          forced: forcedBrake,
        },
        mode,
        connection: 'online',
        timestamp: Date.now(),
      };

      setSimData(data);
      setLiveData(data);
      setLastUpdate(Date.now());
      setIsConnected(true);

      // Speed history
      const now = new Date();
      const label = now.toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      setSpeedHistory(prev => {
        const next = [...prev, { time: label, speed, limit: settings.speedLimit }];
        return next.slice(-maxHistory);
      });

      // Route history
      setRouteHistory(prev => {
        const next = [...prev, { lat: basePos.lat, lng: basePos.lng }];
        return next.slice(-100);
      });

      // === EVENT LOG (simulasi) ===
      const nowMs = Date.now();
      if (nowMs - lastSimAlertRef.current > 3000) {
        let newEvent = null;

        if (forcedBrake) {
          newEvent = {
            type: 'forced_brake',
            severity: 'critical',
            message: `Forced Brake aktif! Kecepatan ${speed} km/h melebihi batas ${settings.speedLimit} km/h`,
            speed, tilt,
            lat: basePos.lat, lng: basePos.lng,
            timestamp: nowMs,
          };
        } else if (isOverspeed) {
          newEvent = {
            type: 'overspeed',
            severity: speed > 80 ? 'danger' : 'warning',
            message: `Kecepatan ${speed} km/h melebihi batas ${settings.speedLimit} km/h`,
            speed, tilt,
            lat: basePos.lat, lng: basePos.lng,
            timestamp: nowMs,
          };
        } else if (isSteepSlope) {
          newEvent = {
            type: 'steep_slope',
            severity: 'danger',
            message: `Turunan ekstrem ${tilt}° (batas ${settings.tiltThreshold}°) — Mode Adaptif aktif`,
            speed, tilt,
            lat: basePos.lat, lng: basePos.lng,
            timestamp: nowMs,
          };
        }

        if (newEvent) {
          lastSimAlertRef.current = nowMs;
          simEventIdRef.current++;
          newEvent.id = `sim_${simEventIdRef.current}`;
          simEventsRef.current = [newEvent, ...simEventsRef.current].slice(0, 50);
          setEvents([...simEventsRef.current]);
        }
      }
    }, 1000);
  }, [settings]);

  // === SIMULASI: STOP ===
  const stopSimulation = useCallback(() => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsSimulating(false);
    setSimData(null);
    simEventsRef.current = [];
    // Reset — nanti Firebase listener ambil data real kalau ada
    setLiveData(null);
    setEvents([]);
    setSpeedHistory([]);
    setRouteHistory([]);
    setIsConnected(false);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  const clearRoute = useCallback(() => setRouteHistory([]), []);

  return {
    liveData,
    isConnected,
    lastUpdate,
    speedHistory,
    routeHistory,
    events,
    settings,
    isSimulating,
    startSimulation,
    stopSimulation,
    clearRoute,
  };
}