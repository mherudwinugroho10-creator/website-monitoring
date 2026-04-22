import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// ============================================================
// DANGER ALERT COMPONENT
// - 1 notifikasi saja, TIDAK ganda
// - Compact: badge + judul + detail singkat
// - Progress bar auto-dismiss
// - Sound alert per severity
// ============================================================

function playAlertSound(severity) {
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const now = ac.currentTime;

    if (severity === 'critical') {
      for (let i = 0; i < 8; i++) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type = 'square'; o.frequency.value = 1000; g.gain.value = 0.15;
        o.start(now + i * 0.25); o.stop(now + i * 0.25 + 0.15);
      }
    } else if (severity === 'danger') {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = 'sawtooth'; g.gain.value = 0.12;
      o.frequency.setValueAtTime(400, now);
      o.frequency.linearRampToValueAtTime(800, now + 0.3);
      g.gain.linearRampToValueAtTime(0, now + 0.6);
      o.start(now); o.stop(now + 0.6);
    } else {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type = 'sine'; o.frequency.value = 660; g.gain.value = 0.1;
      o.start(now); o.stop(now + 0.25);
    }
  } catch (e) {}
}

export default function DangerAlert({ alerts }) {
  const [current, setCurrent] = useState(null);
  const [visible, setVisible] = useState(false);
  const lastIdRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!alerts || alerts.length === 0) return;
    const latest = alerts[alerts.length - 1];
    if (latest.id === lastIdRef.current) return;
    lastIdRef.current = latest.id;

    const sev = latest.type === 'auto_brake' ? 'critical' : latest.severity;
    const dur = sev === 'critical' ? 8 : sev === 'danger' ? 5 : 4;

    playAlertSound(sev);
    if (timerRef.current) clearTimeout(timerRef.current);

    setCurrent({ ...latest, sev, dur });
    setVisible(true);

    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setCurrent(null), 300);
    }, dur * 1000);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [alerts]);

  function dismiss() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
    setTimeout(() => setCurrent(null), 300);
  }

  if (!current) return null;

  const s = current.sev;
  const styles = {
    critical: {
      border: 'border-red-600',
      badge: 'bg-red-600 text-white',
      badgeText: 'KRITIS',
      text: 'text-red-400',
      bar: 'bg-red-600',
    },
    danger: {
      border: 'border-red-500/70',
      badge: 'bg-red-500 text-white',
      badgeText: 'BAHAYA',
      text: 'text-red-400',
      bar: 'bg-red-500',
    },
    warning: {
      border: 'border-yellow-500/70',
      badge: 'bg-yellow-500 text-dark-primary',
      badgeText: 'PERINGATAN',
      text: 'text-yellow-400',
      bar: 'bg-yellow-500',
    },
  };
  const st = styles[s] || styles.warning;

  return (
    <>
      <style>{`
        @keyframes alertSlideIn { from { transform: translateX(110%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes alertSlideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(110%); opacity: 0; } }
        @keyframes barShrink { from { width: 100%; } to { width: 0%; } }
      `}</style>

      <div className="fixed top-12 right-4 z-[100] w-[360px] max-w-[calc(100vw-2rem)]">
        <div
          className={`bg-dark-secondary border-2 ${st.border} rounded-xl overflow-hidden shadow-2xl`}
          style={{ animation: `${visible ? 'alertSlideIn' : 'alertSlideOut'} 0.3s ease forwards` }}
        >
          {/* Progress bar */}
          <div className="h-1 bg-white/[0.04]">
            <div
              className={`h-full ${st.bar}`}
              style={{ animation: `barShrink ${current.dur}s linear forwards` }}
            />
          </div>

          <div className="p-4">
            <div className="flex items-start gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${s === 'warning' ? 'bg-yellow-500/15' : 'bg-red-500/15'}`}>
                <AlertTriangle className={`w-4 h-4 ${st.text}`} />
              </div>

              <div className="flex-1 min-w-0">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${st.badge}`}>
                  {st.badgeText}
                </span>
                <p className={`text-sm font-semibold mt-1 ${st.text}`}>{current.message}</p>
                {current.details && (
                  <p className="text-xs text-gray-500 mt-1">{current.details}</p>
                )}
              </div>

              <button onClick={dismiss} className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-white flex-shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
