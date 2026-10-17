let ctx = null;
let master = null;
let muted = false;
const VOLUME = 0.7;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() { ac(); }
export function setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : VOLUME; }
export function isMuted() { return muted; }

function tone(freq, start, dur, o = {}) {
  const c = ac();
  if (!c || muted) return;
  const { type = 'sine', gain = 0.3, slideTo = null, attack = 0.005 } = o;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.03);
}

function noise(start, dur, o = {}) {
  const c = ac();
  if (!c || muted) return;
  const { gain = 0.2, type = 'bandpass', freq = 1000, freqTo = null, q = 1 } = o;
  const t0 = c.currentTime + start;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0); src.stop(t0 + dur + 0.03);
}

function clinkAt(s, j = 1) {
  tone(2093 * j, s, 0.14, { gain: 0.16 });
  tone(3136 * j, s, 0.09, { gain: 0.09 });
  tone(1568 * j, s + 0.06, 0.18, { type: 'triangle', gain: 0.11 });
}

const N = { E4: 329.63, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, C6: 1046.5, F4: 349.23, D4: 293.66 };

const sfx = {
  click: () => tone(900, 0, 0.05, { type: 'square', gain: 0.07 }),
  tick: () => tone(1200, 0, 0.03, { type: 'square', gain: 0.05 }),
  clink: () => clinkAt(0, 1 + Math.random() * 0.08),
  coinDrop: () => { clinkAt(0); clinkAt(0.09, 1.06); },
  dagdag: () => { clinkAt(0); clinkAt(0.1, 1.2); tone(600, 0, 0.22, { slideTo: 1300, gain: 0.08 }); },
  handoff: () => { tone(440, 0, 0.12, { type: 'triangle', gain: 0.22 }); tone(660, 0.1, 0.16, { type: 'triangle', gain: 0.22 }); },
  night: () => { tone(110, 0, 0.9, { gain: 0.22 }); tone(116, 0, 0.9, { gain: 0.16 }); tone(220, 0.1, 0.7, { type: 'triangle', gain: 0.06 }); },
  cupFlip: () => { noise(0, 0.25, { freq: 400, freqTo: 2400, gain: 0.22, q: 0.8 }); tone(150, 0.18, 0.2, { slideTo: 60, gain: 0.4 }); },
  pour: () => {
    for (let i = 0; i < 14; i++) clinkAt(i * 0.07 + Math.random() * 0.03, 0.9 + Math.random() * 0.3);
    noise(0, 1, { type: 'lowpass', freq: 1200, gain: 0.1 });
  },
  vote: () => { tone(820, 0, 0.09, { type: 'triangle', gain: 0.35, slideTo: 520 }); noise(0, 0.03, { type: 'highpass', freq: 2000, gain: 0.08 }); },
  silip: () => { tone(1200, 0, 0.25, { slideTo: 1800, gain: 0.14 }); tone(1800, 0.12, 0.3, { gain: 0.1 }); },
  reveal: () => [N.C5, N.E5, N.G5].forEach((f, i) => tone(f, i * 0.08, 0.22, { type: 'triangle', gain: 0.22 })),
  kumpleto: () => [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * 0.09, 0.2, { gain: 0.2 })),
  kulang: () => { tone(220, 0, 0.32, { type: 'sawtooth', gain: 0.12, slideTo: 150 }); tone(208, 0, 0.32, { type: 'sawtooth', gain: 0.09, slideTo: 140 }); },
  lechon: () => [N.G4, N.C5, N.E5, N.G5].forEach((f, i) => tone(f, i * 0.09, 0.18, { type: 'triangle', gain: 0.26 })),
  sira: () => {
    tone(392, 0, 0.28, { type: 'sawtooth', gain: 0.11, slideTo: 370 });
    tone(349, 0.3, 0.28, { type: 'sawtooth', gain: 0.11, slideTo: 330 });
    tone(311, 0.6, 0.55, { type: 'sawtooth', gain: 0.11, slideTo: 240 });
  },
  evil: () => { tone(196, 0, 0.5, { type: 'sawtooth', gain: 0.14, slideTo: 147 }); tone(207, 0, 0.5, { type: 'sawtooth', gain: 0.1, slideTo: 150 }); },
  good: () => [N.G5, N.B4 * 2, N.D5 * 2].forEach((f, i) => tone(f, i * 0.1, 0.35, { gain: 0.16 })),
  win: () => {
    [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * 0.12, 0.3, { type: 'triangle', gain: 0.26 }));
    [N.C6, N.G5, N.C6].forEach((f, i) => tone(f, 0.55 + i * 0.1, 0.35, { gain: 0.14 }));
    clinkAt(0.7); clinkAt(0.85, 1.1);
  },
  lose: () => [N.A4, N.F4, N.D4].forEach((f, i) => tone(f, i * 0.22, 0.4, { type: 'triangle', gain: 0.22 })),
};

export const SOUND_NAMES = Object.keys(sfx);
export function play(name) { if (!muted && sfx[name]) sfx[name](); }
export { sfx };
