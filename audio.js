/* ══════════════════════════════════════════════════════
   AUDIO ENGINE — Web Audio API synthesized sounds
   ══════════════════════════════════════════════════════ */

let audioCtx = null;
let masterGain = null;
let audioReady = false;

export function initAudio() {
  if (audioReady) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.4;
    masterGain.connect(audioCtx.destination);
    audioReady = true;
  } catch (e) { /* audio not supported */ }
}

export function resumeAudio() {
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}

export function setMasterVolume(volume) {
  if (masterGain) masterGain.gain.value = volume;
}

function playTone(freq, duration, gain, type, detune) {
  if (!audioReady) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = type || "sine";
  osc.frequency.setValueAtTime(freq, t);
  if (detune) osc.detune.setValueAtTime(detune, t);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(g); g.connect(masterGain);
  osc.start(t); osc.stop(t + duration + 0.01);
}

function playNoise(duration, freq, gain, type) {
  if (!audioReady) return;
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  const flt = audioCtx.createBiquadFilter();
  osc.type = type || "sawtooth";
  osc.frequency.setValueAtTime(freq, t);
  flt.type = "lowpass"; flt.frequency.setValueAtTime(freq * 3, t);
  flt.frequency.exponentialRampToValueAtTime(Math.max(20, freq * 0.5), t + duration);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.connect(flt); flt.connect(g); g.connect(masterGain);
  osc.start(t); osc.stop(t + duration + 0.01);
}

function playWhiteNoise(duration, gain) {
  if (!audioReady) return;
  const t = audioCtx.currentTime;
  const len = Math.max(1, Math.floor(audioCtx.sampleRate * duration));
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = audioCtx.createBufferSource(); src.buffer = buf;
  const g = audioCtx.createGain();
  const flt = audioCtx.createBiquadFilter();
  flt.type = "bandpass"; flt.frequency.value = 3000; flt.Q.value = 0.5;
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  src.connect(flt); flt.connect(g); g.connect(masterGain);
  src.start(t); src.stop(t + duration + 0.01);
}

export const SFX = {
  _lastHit: 0, _lastDeath: 0, _lastFire: 0,
  towerFire: {
    fire()   { if (!SFX._throttle("_lastFire", 60)) return; playNoise(0.07, 900, 0.12, "sawtooth"); playWhiteNoise(0.05, 0.06); },
    ice()    { if (!SFX._throttle("_lastFire", 80)) return; playTone(1200, 0.12, 0.08, "sine"); playTone(1800, 0.1, 0.04, "sine"); },
    earth()  { if (!SFX._throttle("_lastFire", 100)) return; playNoise(0.1, 120, 0.15, "square"); playTone(80, 0.12, 0.1, "sine"); },
    arcane() { if (!SFX._throttle("_lastFire", 80)) return; playTone(600, 0.15, 0.06, "triangle"); playTone(900, 0.13, 0.04, "sine", 50); },
  },
  _throttle(key, minMs) { const now = performance.now(); if (now - SFX[key] < minMs) return false; SFX[key] = now; return true; },
  hit() { if (!SFX._throttle("_lastHit", 30)) return; playWhiteNoise(0.03, 0.06); playTone(400, 0.05, 0.06, "square"); },
  enemyDeath() { if (!SFX._throttle("_lastDeath", 50)) return; playTone(300, 0.12, 0.1, "sawtooth"); playTone(150, 0.2, 0.08, "sine"); playWhiteNoise(0.1, 0.05); },
  enemyLeak() { playTone(200, 0.25, 0.12, "sine"); playTone(100, 0.35, 0.08, "sine"); },
  towerPlace() { playTone(150, 0.1, 0.12, "square"); playWhiteNoise(0.06, 0.08); },
  towerUpgrade() { playTone(400, 0.12, 0.08, "sine"); setTimeout(() => playTone(600, 0.12, 0.08, "sine"), 80); setTimeout(() => playTone(800, 0.18, 0.1, "sine"), 160); },
  towerSell() { playTone(800, 0.06, 0.06, "sine"); playTone(600, 0.08, 0.05, "sine"); },
  waveStart() { playTone(220, 0.25, 0.1, "sawtooth"); playTone(330, 0.2, 0.08, "sawtooth"); setTimeout(() => { playTone(440, 0.35, 0.12, "sawtooth"); playTone(550, 0.3, 0.06, "sine"); }, 150); },
  gameOver() { playTone(120, 0.8, 0.15, "sawtooth"); playTone(80, 1.0, 0.12, "sine"); setTimeout(() => playTone(60, 1.2, 0.1, "sine"), 300); },
  victory() { playTone(440, 0.25, 0.1, "sine"); setTimeout(() => playTone(550, 0.25, 0.1, "sine"), 120); setTimeout(() => playTone(660, 0.25, 0.1, "sine"), 240); setTimeout(() => { playTone(880, 0.5, 0.12, "sine"); playTone(660, 0.4, 0.06, "triangle"); }, 360); },
  uiClick() { playTone(700, 0.03, 0.04, "sine"); },
};
