import { useEffect, useState } from 'react';
import { ref, onValue, query, orderByChild, startAt } from 'firebase/database';
import { rtdb } from '../services/firebase';
import { cleanVehicleId } from '../utils/accountLogic';
import { normalizeEvent, countEvents, startOfDayMs, nextDayStartMs } from '../utils/vehicleLogic';

// Rekap event hari berjalan (overspeed dan forced brake) satu kendaraan, dihitung dari
// timestamp event terhadap awal hari menurut jam server. Hanya membaca RTDB.
// Pembacaan dibatasi dengan startAt(awal hari), jadi hasilnya tidak terpotong batas jumlah event
// pada VehicleContext, dan otomatis berganti saat lewat tengah malam.
export function useTodayEventCounts(vehicleId, serverOffset) {
  const [dayStart, setDayStart] = useState(() => startOfDayMs(Date.now() + serverOffset));
  const [result, setResult] = useState(null);

  // Jam server berubah (selisih jam terbaca) -> hitung ulang awal hari.
  useEffect(() => {
    setDayStart(startOfDayMs(Date.now() + serverOffset));
  }, [serverOffset]);

  // Ganti hari saat tengah malam.
  useEffect(() => {
    const now = Date.now() + serverOffset;
    const timer = setTimeout(() => setDayStart(startOfDayMs(Date.now() + serverOffset)), nextDayStartMs(now) - now + 500);
    return () => clearTimeout(timer);
  }, [dayStart, serverOffset]);

  useEffect(() => {
    const id = cleanVehicleId(vehicleId);
    if (!id) return undefined;
    const eventsQuery = query(ref(rtdb, `vehicles/${id}/events`), orderByChild('timestamp'), startAt(dayStart));
    return onValue(eventsQuery, (snap) => {
      const list = [];
      snap.forEach((child) => {
        const e = normalizeEvent(child.key, child.val());
        if (e && e.timestamp >= dayStart) list.push(e);
      });
      setResult({ vehicleId: id, dayStart, counts: countEvents(list), error: null });
    }, (err) => {
      console.error('[useTodayEventCounts] Gagal membaca rekap hari ini:', err);
      setResult({ vehicleId: id, dayStart, counts: null, error: 'Gagal membaca rekap kejadian hari ini.' });
    });
  }, [vehicleId, dayStart]);

  const id = cleanVehicleId(vehicleId);
  const fresh = !!result && result.vehicleId === id && result.dayStart === dayStart;
  return {
    dayStart,
    loaded: fresh,
    counts: fresh ? result.counts : null,
    error: fresh ? result.error : null,
  };
}