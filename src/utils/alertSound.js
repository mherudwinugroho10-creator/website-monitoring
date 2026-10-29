// Bunyi peringatan bahaya (Web Audio). Dipakai DangerAlert pengemudi dan panel peringatan admin.
// Gagal diam-diam bila AudioContext tidak tersedia atau diblokir peramban; peringatan tetap tampil tanpa suara.

let audioContext = null;

function getAudioContext() {
  if (audioContext) return audioContext;
  const Ctx = typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null;
  if (!Ctx) return null;
  audioContext = new Ctx();
  return audioContext;
}

export function playAlertSound(severity) {
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