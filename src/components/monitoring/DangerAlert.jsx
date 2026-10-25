import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X, Gauge, Shield } from 'lucide-react';
import { activeDangerEvents, buildDangerAlert, nextDangerExpiryMs, DANGER_WINDOW_MS } from '../../utils/vehicleLogic';

let audioContext = null;

function getAudioContext() {
  if (audioContext) return audioContext;
  const Ctx = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
  if (!Ctx) return null;
  audioContext = new Ctx();
  return audioContext;
}

function playAlertSound(severity) {
  try {
    const ac = getAudioContext();
    if (!ac) return;
    if (ac.state === 'suspended') ac.resume().catch(() => {});
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

const STYLES = {
  critical: { border: 'border-red-600', badge: 'bg-red-600 text-white', text: 'text-red-400', bar: 'bg-red-600', iconBg: 'bg-red-500/15' },
  danger: { border: 'border-red-500/70', badge: 'bg-red-500 text-white', text: 'text-red-400', bar: 'bg-red-500', iconBg: 'bg-red-500/15' },
  warning: { border: 'border-yellow-500/70', badge: 'bg-yellow-500 text-dark-primary', text: 'text-yellow-400', bar: 'bg-yellow-500', iconBg: 'bg-yellow-500/15' },
};

const TYPE_ICON = { overspeed: Gauge, forced_brake: Shield };

// DangerAlert: tampil selama ada event overspeed atau forced brake yang berumur <= 5 detik
// (jam server), lalu hilang otomatis. Event yang masuk bersamaan digabung dalam satu kartu.
export default function DangerAlert({ events, serverNow }) {
  const [now, setNow] = useState(() => serverNow());
  const [dismissed, setDismissed] = useState(() => new Set());
  const soundedRef = useRef(new Set());
  const barRef = useRef({ key: null, ms: 0 });

  // Samakan jam setiap daftar event berubah, lalu jadwalkan pembaruan saat event paling awal kedaluwarsa.
  useEffect(() => {
    setNow(serverNow());
  }, [events, serverNow]);

  useEffect(() => {
    const wait = nextDangerExpiryMs(events, serverNow());
    if (wait === null) return undefined;
    const timer = setTimeout(() => setNow(serverNow()), wait);
    return () => clearTimeout(timer);
  }, [events, now, serverNow]);

  const active = activeDangerEvents(events, now).filter((e) => !dismissed.has(e.id));
  const danger = buildDangerAlert(active);
  const dangerIdsKey = danger ? danger.ids.join('|') : '';

  // Bunyi sekali untuk event yang baru muncul.
  useEffect(() => {
    const known = new Set((events || []).map((e) => e.id));
    soundedRef.current = new Set([...soundedRef.current].filter((id) => known.has(id)));
    if (!danger) return;
    const fresh = danger.ids.filter((id) => !soundedRef.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => soundedRef.current.add(id));
    playAlertSound(danger.severity);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dangerIdsKey, events]);

  if (!danger) return null;

  // Lama bilah waktu dihitung sekali per event terbaru agar animasinya tidak melompat.
  if (barRef.current.key !== danger.newestTimestamp) {
    barRef.current = { key: danger.newestTimestamp, ms: Math.max(0, danger.newestTimestamp + DANGER_WINDOW_MS - now) };
  }

  const st = STYLES[danger.severity] || STYLES.warning;

  return (
    <>
      <style>{`
        @keyframes dangerIn  { from { transform:translateX(110%); opacity:0 } to { transform:translateX(0); opacity:1 } }
        @keyframes dangerBar { from { width:100% } to { width:0% } }
      `}</style>
      <div className="fixed top-20 right-4 z-[100] w-[380px] max-w-[calc(100vw-2rem)]" role="alert" aria-live="assertive" data-testid="danger-alert">
        <div className={`bg-dark-secondary border-2 ${st.border} rounded-xl overflow-hidden shadow-2xl`}
          style={{ animation: 'dangerIn 0.3s ease forwards' }}>
          <div className="h-1 bg-white/[0.04]">
            <div key={danger.newestTimestamp} className={`h-full ${st.bar}`}
              style={{ animation: `dangerBar ${barRef.current.ms}ms linear forwards` }} />
          </div>
          <div className="p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className={`w-4 h-4 ${st.text}`} />
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${st.badge}`}>{danger.severityLabel}</span>
              </div>
              <button type="button" onClick={() => setDismissed((prev) => new Set([...prev, ...danger.ids]))}
                className="p-1 rounded hover:bg-white/10 text-gray-600 hover:text-white" aria-label="Tutup peringatan">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-3">
              {danger.items.map((item) => {
                const Icon = TYPE_ICON[item.type] || AlertTriangle;
                return (
                  <div key={item.type} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${st.iconBg}`}>
                      <Icon className={`w-4 h-4 ${st.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${st.text}`}>
                        {item.label}
                        {item.count > 1 && <span className="ml-1.5 text-xs font-normal text-gray-500">×{item.count}</span>}
                      </p>
                      {item.details && <p className="text-xs text-gray-400 mt-0.5">{item.details}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}