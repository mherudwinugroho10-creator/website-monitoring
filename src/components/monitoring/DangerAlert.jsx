import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

function playAlertSound(severity) {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const now = ac.currentTime;
    if (severity === 'critical') {
      for (let i = 0; i < 4; i++) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'square'; o.frequency.value = 880;
        g.gain.setValueAtTime(0.12, now + i * 0.3);
        g.gain.linearRampToValueAtTime(0, now + i * 0.3 + 0.25);
        o.start(now + i * 0.3);
        o.stop(now + i * 0.3 + 0.25);
      }
    } else {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = 'sine'; o.frequency.value = 660;
      g.gain.setValueAtTime(0.1, now);
      g.gain.linearRampToValueAtTime(0, now + 0.3);
      o.start(now); o.stop(now + 0.3);
    }
  } catch {
    // AudioContext tidak tersedia atau diblokir browser: peringatan tetap tampil tanpa suara.
  }
}

// isConnected: status koneksi ESP dari VehicleContext
// events: array event dari Firebase
export default function DangerAlert({ events = [], isConnected = false }) {
  const [current,  setCurrent]  = useState(null);
  const [visible,  setVisible]  = useState(false);
  // Simpan ID event yang sudah ditampilkan
  const shownIdsRef = useRef(new Set());
  const timerRef    = useRef(null);
  // Waktu mount komponen — hanya tampilkan event SETELAH halaman dibuka
  const mountTimeRef = useRef(Date.now());

  useEffect(() => {
    // KUNCI: DangerAlert TIDAK muncul jika ESP tidak terhubung
    if (!isConnected) return;
    if (!events || events.length === 0) return;

    // Ambil event terbaru
    const latest = events[0];
    if (!latest) return;

    // Sudah ditampilkan sebelumnya? Skip
    if (shownIdsRef.current.has(latest.id)) return;

    // Event ini dari SEBELUM halaman dibuka? Skip (data lama Firebase)
    // Toleransi 3 detik agar event yang baru masuk saat halaman terbuka tetap tampil
    const eventTime = typeof latest.timestamp === 'number'
      ? latest.timestamp
      : Number(latest.timestamp);
    if (eventTime < mountTimeRef.current - 3000) return;

    // Tandai sudah ditampilkan
    shownIdsRef.current.add(latest.id);

    const sev = latest.severity || 'warning';
    const dur = sev === 'critical' ? 8 : sev === 'danger' ? 6 : 4;

    playAlertSound(sev);
    if (timerRef.current) clearTimeout(timerRef.current);

    const details =
      latest.type === 'forced_brake'
        ? `Kecepatan ${latest.speed} km/jam • Kemiringan ${latest.tilt}°`
        : latest.type === 'steep_slope'
        ? `Kemiringan ${latest.tilt}° • Kecepatan ${latest.speed} km/jam`
        : `Kecepatan ${latest.speed} km/jam`;

    setCurrent({ ...latest, sev, dur, details });
    setVisible(true);

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setCurrent(null), 300);
    }, dur * 1000);
  }, [events, isConnected]);

  // Reset mountTime dan shownIds saat koneksi berubah
  useEffect(() => {
    if (isConnected) {
      mountTimeRef.current = Date.now();
      shownIdsRef.current  = new Set();
    } else {
      // ESP mati — dismiss alert yang sedang tampil
      if (timerRef.current) clearTimeout(timerRef.current);
      setVisible(false);
      setTimeout(() => setCurrent(null), 300);
    }
  }, [isConnected]);

  function dismiss() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => setCurrent(null), 300);
  }

  if (!current) return null;

  const styles = {
    critical: {
      border: 'border-red-600',
      badge:  'bg-red-600 text-white',
      text:   'text-red-400',
      bar:    'bg-red-600',
      label:  'KRITIS',
      iconBg: 'bg-red-500/15',
    },
    danger: {
      border: 'border-red-500/70',
      badge:  'bg-red-500 text-white',
      text:   'text-red-400',
      bar:    'bg-red-500',
      label:  'BAHAYA',
      iconBg: 'bg-red-500/15',
    },
    warning: {
      border: 'border-yellow-500/70',
      badge:  'bg-yellow-500 text-dark-primary',
      text:   'text-yellow-400',
      bar:    'bg-yellow-500',
      label:  'PERINGATAN',
      iconBg: 'bg-yellow-500/15',
    },
  };
  const st = styles[current.sev] || styles.warning;

  return (
    <>
      <style>{`
        @keyframes alertIn  { from { transform:translateX(110%); opacity:0 } to { transform:translateX(0); opacity:1 } }
        @keyframes alertOut { from { transform:translateX(0); opacity:1 } to { transform:translateX(110%); opacity:0 } }
        @keyframes barShrink { from { width:100% } to { width:0% } }
      `}</style>
      <div className="fixed top-12 right-4 z-[100] w-[360px] max-w-[calc(100vw-2rem)]">
        <div
          className={`bg-dark-secondary border-2 ${st.border} rounded-xl overflow-hidden shadow-2xl`}
          style={{ animation: `${visible ? 'alertIn' : 'alertOut'} 0.3s ease forwards` }}
        >
          <div className="h-1 bg-white/[0.04]">
            <div
              className={`h-full ${st.bar}`}
              style={{ animation: `barShrink ${current.dur}s linear forwards` }}
            />
          </div>
          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${st.iconBg}`}>
                <AlertTriangle className={`w-4 h-4 ${st.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${st.badge}`}>
                  {st.label}
                </span>
                <p className={`text-sm font-semibold mt-1 ${st.text}`}>{current.message}</p>
                {current.details && (
                  <p className="text-xs text-gray-500 mt-1">{current.details}</p>
                )}
              </div>
              <button
                onClick={dismiss}
                className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-white flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}