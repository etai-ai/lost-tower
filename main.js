import * as THREE from "three";

/* ─── CONSTANTS ─── */
const TILE = 1.4;
const COLS = 20, ROWS = 14;
const W = COLS * TILE, H = ROWS * TILE;

const TOWER_TYPES = {
  fire:   { cost: 30, range: 3.5, damage: 12, rate: 0.9,  color: 0xff6644, emissive: 0xff4422, name: "Fire",   icon: "\u{1F525}", desc: "Fast, moderate dmg",
    upgrades: [ { cost: 25, damage: 18, rate: 0.85, range: 3.8 }, { cost: 45, damage: 28, rate: 0.75, range: 4.2 } ] },
  ice:    { cost: 40, range: 4.0, damage: 8,  rate: 1.2,  color: 0x44aaff, emissive: 0x2288dd, name: "Frost",  icon: "\u2744\uFE0F", desc: "Slows enemies 40%",
    upgrades: [ { cost: 30, damage: 12, rate: 1.1, range: 4.5 }, { cost: 55, damage: 18, rate: 1.0, range: 5.0 } ] },
  earth:  { cost: 50, range: 3.0, damage: 25, rate: 1.8,  color: 0x66ff88, emissive: 0x44cc66, name: "Earth",  icon: "\u{1FAA8}", desc: "Heavy dmg, slow",
    upgrades: [ { cost: 35, damage: 40, rate: 1.6, range: 3.3 }, { cost: 65, damage: 65, rate: 1.4, range: 3.6 } ] },
  arcane: { cost: 70, range: 5.0, damage: 18, rate: 1.0,  color: 0xffcc44, emissive: 0xddaa22, name: "Arcane", icon: "\u2728", desc: "Long range, chains",
    upgrades: [ { cost: 50, damage: 28, rate: 0.9, range: 5.5 }, { cost: 85, damage: 42, rate: 0.8, range: 6.0 } ] },
};
const SELL_REFUND = 0.65;

const PATH_POINTS = [
  [0,1],  [4,1],  [4,4],  [1,4],  [1,7],
  [6,7],  [6,2],  [9,2],  [9,7],  [9,10],
  [3,10], [3,12], [10,12],[10,9], [14,9],
  [14,5], [11,5], [11,2], [14,2], [17,2],
  [17,6], [14,6], [14,11],[17,11],[17,8],
  [19,8],
];

const WAVES = [
  /* Wave 1-3: single type intro */
  { name: "Forgotten Shades", groups: [
    { type: "shade", count: 8, hp: 50, reward: 8, delay: 0.9 },
  ]},
  { name: "Temple Wraiths", groups: [
    { type: "wraith", count: 10, hp: 65, reward: 9, delay: 0.8 },
  ]},
  { name: "Stone Golems", groups: [
    { type: "golem", count: 12, hp: 80, reward: 10, delay: 0.75 },
  ]},
  /* Wave 4: Knights with shade scouts */
  { name: "Shadow Vanguard", groups: [
    { type: "shade", count: 3, hp: 40, reward: 6, delay: 0.5 },
    { type: "knight", count: 8, hp: 120, reward: 12, delay: 0.7 },
  ]},
  /* Wave 5: Swarm with wraith flankers */
  { name: "Cursed Swarm", groups: [
    { type: "swarm", count: 10, hp: 100, reward: 11, delay: 0.45 },
    { type: "wraith", count: 4, hp: 90, reward: 10, delay: 0.7 },
  ]},
  /* Wave 6: Warlords with knight guards */
  { name: "Warlord Warband", groups: [
    { type: "knight", count: 4, hp: 100, reward: 10, delay: 0.6 },
    { type: "warlord", count: 8, hp: 160, reward: 14, delay: 0.65 },
    { type: "knight", count: 3, hp: 100, reward: 10, delay: 0.5 },
  ]},
  /* Wave 7: True horde — spirits + swarm + wraiths */
  { name: "Spirit Horde", groups: [
    { type: "swarm", count: 6, hp: 80, reward: 9, delay: 0.3 },
    { type: "spirit", count: 8, hp: 150, reward: 13, delay: 0.45 },
    { type: "wraith", count: 4, hp: 120, reward: 11, delay: 0.6 },
    { type: "swarm", count: 5, hp: 80, reward: 9, delay: 0.25 },
  ]},
  /* Wave 8: Guardians with warlord escort */
  { name: "Temple Guardians", groups: [
    { type: "warlord", count: 3, hp: 200, reward: 18, delay: 1.0 },
    { type: "guardian", count: 3, hp: 700, reward: 50, delay: 2.0 },
    { type: "warlord", count: 2, hp: 200, reward: 18, delay: 0.8 },
  ]},
  /* Wave 9: Fast mixed rush */
  { name: "Void Onslaught", groups: [
    { type: "knight", count: 4, hp: 150, reward: 12, delay: 0.35 },
    { type: "voidwalker", count: 10, hp: 200, reward: 15, delay: 0.4 },
    { type: "spirit", count: 5, hp: 180, reward: 13, delay: 0.35 },
    { type: "knight", count: 3, hp: 150, reward: 12, delay: 0.3 },
  ]},
  /* Wave 10: Boss with guardian escorts */
  { name: "The Sealed One", groups: [
    { type: "guardian", count: 2, hp: 500, reward: 40, delay: 2.0 },
    { type: "boss", count: 1, hp: 2500, reward: 200, delay: 3.0 },
  ]},
];

/* ─── ENDLESS MODE WAVE GENERATOR ─── */
const ENDLESS_NAMES = [
  "Risen","Empowered","Ancient","Abyssal","Infernal","Spectral","Corrupted","Forsaken","Eldritch","Ascended",
];
const ENDLESS_BOSS_NAMES = [
  "Herald of Ruin","Dread Colossus","Void Titan","Flame Archon","Frozen Leviathan",
  "Stone Primarch","Shadow Overlord","Spirit Sovereign","Chaos Incarnate","The Unbound",
];

function generateEndlessWave(waveNum) {
  const n = waveNum - WAVES.length; /* endless wave index: 1, 2, 3... */
  const isBoss = n % 5 === 0;
  const isMega = n % 10 === 0;

  /* Scaling factors */
  const hpScale = Math.pow(1.22, n);
  /* Speed multiplier: enemies get faster each endless wave, capping at ~1.5x their base */
  const speedMult = Math.min(1.0 + n * 0.025, 1.5);

  const pool = ["shade","wraith","golem","knight","swarm","warlord","spirit","voidwalker"];
  const groups = [];
  let name;

  if (isMega) {
    name = ENDLESS_BOSS_NAMES[(Math.floor(n / 10) - 1) % ENDLESS_BOSS_NAMES.length];
    const escortType = pool[(n + 3) % pool.length];
    groups.push({ type: escortType, count: 4, hp: Math.round(150 * hpScale), reward: Math.round(12 + n * 1.5), delay: 0.6 });
    groups.push({ type: "boss", count: 2, hp: Math.round(2500 * hpScale), reward: Math.round(200 + n * 20), delay: 2.5 });
  } else if (isBoss) {
    name = ENDLESS_BOSS_NAMES[(Math.floor(n / 5) - 1) % ENDLESS_BOSS_NAMES.length];
    const escortType = pool[(n + 1) % pool.length];
    groups.push({ type: escortType, count: 3, hp: Math.round(120 * hpScale), reward: Math.round(10 + n), delay: 0.8 });
    groups.push({ type: "guardian", count: 3, hp: Math.round(700 * hpScale), reward: Math.round(50 + n * 8), delay: 1.5 });
  } else {
    /* Mixed: pick 2-3 types */
    const idx = (n - 1) % pool.length;
    const primary = pool[idx];
    const secondary = pool[(idx + 3) % pool.length];
    const prefix = ENDLESS_NAMES[(Math.floor((n - 1) / pool.length)) % ENDLESS_NAMES.length];
    const baseName = WAVES.find(w => w.groups.some(g => g.type === primary))?.name || primary;
    name = prefix + " " + baseName;

    const totalCount = Math.min(8 + Math.floor(n * 1.2), 30);
    const secCount = Math.max(2, Math.floor(totalCount * 0.3));
    const priCount = totalCount - secCount;
    const baseHp = (80 + n * 15);
    const reward = Math.round(10 + n * 1.5);
    const delay = Math.max(0.2, 0.6 - n * 0.01);

    groups.push({ type: secondary, count: secCount, hp: Math.round(baseHp * 0.7 * hpScale), reward: Math.round(reward * 0.8), delay: delay * 0.8 });
    groups.push({ type: primary, count: priCount, hp: Math.round(baseHp * hpScale), reward, delay });
    if (n >= 5 && n % 3 === 0) {
      const tertiary = pool[(idx + 5) % pool.length];
      const terCount = Math.max(2, Math.floor(totalCount * 0.15));
      groups.push({ type: tertiary, count: terCount, hp: Math.round(baseHp * 1.2 * hpScale), reward: Math.round(reward * 1.2), delay: delay * 1.2 });
    }
  }

  return { name, groups, speedMult };
}

/* Flatten a wave definition (with groups) into a sequential spawn list */
function buildSpawnList(waveDef) {
  const list = [];
  const sMult = waveDef.speedMult || 1.0;
  for (const g of waveDef.groups) {
    const speed = (ENEMY_VISUALS[g.type]?.baseSpeed || 2.5) * sMult;
    for (let i = 0; i < g.count; i++) {
      list.push({ type: g.type, hp: g.hp, speed, reward: g.reward, delay: g.delay });
    }
  }
  return list;
}

function getWaveInfo(waveNum) {
  const raw = waveNum <= WAVES.length ? WAVES[waveNum - 1] : generateEndlessWave(waveNum);
  const spawnList = buildSpawnList(raw);
  return { name: raw.name, groups: raw.groups, spawnList, enemies: spawnList.length };
}

const ENEMY_VISUALS = {
  shade: {
    bodyColor: 0x442244, emissive: 0x331133, emissiveIntensity: 0.6,
    glowColor: 0x663366, eyeColor: 0xff44ff,
    scale: 0.75, opacity: 0.6, hpBarColor: 0xcc66cc,
    bobSpeed: 6, bobAmp: 0.08, spinSpeed: 0, baseSpeed: 3.2,
  },
  wraith: {
    bodyColor: 0x8899bb, emissive: 0x556688, emissiveIntensity: 0.8,
    glowColor: 0x8899cc, eyeColor: 0xaaccff,
    scale: 0.8, opacity: 0.45, hpBarColor: 0x88aadd,
    bobSpeed: 3, bobAmp: 0.12, spinSpeed: 0, baseSpeed: 2.8,
  },
  golem: {
    bodyColor: 0x554433, emissive: 0x221100, emissiveIntensity: 0.2,
    glowColor: 0x443322, eyeColor: 0xffaa33,
    scale: 1.3, opacity: 0.95, hpBarColor: 0xbb8844,
    bobSpeed: 2, bobAmp: 0.02, spinSpeed: 0, baseSpeed: 2.0,
  },
  knight: {
    bodyColor: 0x331111, emissive: 0x440000, emissiveIntensity: 0.7,
    glowColor: 0x661122, eyeColor: 0xff2222,
    scale: 1.0, opacity: 0.85, hpBarColor: 0xff4444,
    bobSpeed: 4, bobAmp: 0.04, spinSpeed: 1.5, baseSpeed: 3.4,
  },
  swarm: {
    bodyColor: 0x557722, emissive: 0x334400, emissiveIntensity: 0.5,
    glowColor: 0x669933, eyeColor: 0xccff44,
    scale: 0.55, opacity: 0.8, hpBarColor: 0xaacc44,
    bobSpeed: 10, bobAmp: 0.06, spinSpeed: 0, baseSpeed: 3.8,
  },
  warlord: {
    bodyColor: 0x551122, emissive: 0x440011, emissiveIntensity: 0.6,
    glowColor: 0x882233, eyeColor: 0xff6644,
    scale: 1.25, opacity: 0.9, hpBarColor: 0xff6644,
    bobSpeed: 3, bobAmp: 0.03, spinSpeed: 0.8, baseSpeed: 2.4,
  },
  spirit: {
    bodyColor: 0x225566, emissive: 0x11aacc, emissiveIntensity: 1.2,
    glowColor: 0x22ccee, eyeColor: 0x44ffff,
    scale: 0.85, opacity: 0.7, hpBarColor: 0x44ddee,
    bobSpeed: 5, bobAmp: 0.1, spinSpeed: 3.0, baseSpeed: 3.6,
  },
  guardian: {
    bodyColor: 0xaa8833, emissive: 0xcc9922, emissiveIntensity: 1.5,
    glowColor: 0xffcc44, eyeColor: 0xffee88,
    scale: 1.8, opacity: 0.9, hpBarColor: 0xffcc44,
    bobSpeed: 2, bobAmp: 0.05, spinSpeed: 1.0, baseSpeed: 1.8,
  },
  voidwalker: {
    bodyColor: 0x110022, emissive: 0x220044, emissiveIntensity: 0.9,
    glowColor: 0x440088, eyeColor: 0xcc44ff,
    scale: 0.9, opacity: 0.75, hpBarColor: 0xaa44ff,
    bobSpeed: 7, bobAmp: 0.07, spinSpeed: 2.0, baseSpeed: 4.0,
  },
  boss: {
    bodyColor: 0x661111, emissive: 0xff4400, emissiveIntensity: 2.0,
    glowColor: 0xff6622, eyeColor: 0xffdd44,
    scale: 2.2, opacity: 0.95, hpBarColor: 0xff8844,
    bobSpeed: 1.5, bobAmp: 0.04, spinSpeed: 0.5, baseSpeed: 1.5,
  },
};

/* ══════════════════════════════════════════════════════
   AUDIO ENGINE — Web Audio API synthesized sounds
   ══════════════════════════════════════════════════════ */
let audioCtx = null;
let masterGain = null;
let audioReady = false;

function initAudio() {
  if (audioReady) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0.4;
    masterGain.connect(audioCtx.destination);
    audioReady = true;
  } catch (e) { /* audio not supported */ }
}

function resumeAudio() {
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
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

const SFX = {
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

function gridToWorld(col, row) {
  return new THREE.Vector3(col * TILE - W / 2 + TILE / 2, 0, row * TILE - H / 2 + TILE / 2);
}
function pathWorldPoints() { return PATH_POINTS.map(([c, r]) => gridToWorld(c, r)); }

function isPathTile(col, row) {
  const pts = PATH_POINTS;
  for (let i = 0; i < pts.length - 1; i++) {
    const [c1, r1] = pts[i], [c2, r2] = pts[i + 1];
    if (c1 === c2) { const a = Math.min(r1, r2), b = Math.max(r1, r2); if (col === c1 && row >= a && row <= b) return true; }
    else { const a = Math.min(c1, c2), b = Math.max(c1, c2); if (row === r1 && col >= a && col <= b) return true; }
  }
  return false;
}

/* ─── GLOW TEXTURE ─── */
function glowTex() {
  const c = document.createElement("canvas"); c.width = 64; c.height = 64;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)");
  g.addColorStop(0.4, "rgba(255,255,255,0.4)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); return t;
}

/* ─── TEXTURE GENERATORS ─── */
function createCanvasTex(w, h, fn) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  fn(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
function floorTex() {
  return createCanvasTex(512, 512, (ctx, w, h) => {
    ctx.fillStyle = "#2a2520"; ctx.fillRect(0,0,w,h);
    const ts = 64;
    for (let x = 0; x < w; x += ts) for (let y = 0; y < h; y += ts) {
      const v = Math.random()*15-7;
      ctx.fillStyle = `rgb(${42+v},${37+v},${32+v})`; ctx.fillRect(x+1,y+1,ts-2,ts-2);
    }
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = `rgba(${30+Math.random()*30},${25+Math.random()*25},${20+Math.random()*20},0.4)`;
      ctx.fillRect(Math.random()*w, Math.random()*h, Math.random()*3+1, Math.random()*3+1);
    }
  });
}
function pathTex() {
  return createCanvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = "#1e1a15"; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2000; i++) {
      const v = Math.random() * 20 - 10;
      ctx.fillStyle = `rgba(${25+v},${22+v},${18+v},0.5)`;
      ctx.fillRect(Math.random()*w, Math.random()*h, Math.random()*4+1, Math.random()*4+1);
    }
    ctx.strokeStyle = "rgba(100,80,40,0.08)"; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  });
}

/* ─── DETECT MOBILE ─── */
function isMobile() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
}

const mobile = isMobile();

/* ─── UI STATE ─── */
let speed = 1;
let autoWave = true;
let paused = false;
let muted = false;
let toastTimer = null;
let state = null;
let selectedTowerObj = null;

/* ─── DOM HELPERS ─── */
const $ = (id) => document.getElementById(id);

function showToast(text, ms = 2800) {
  const el = $("toast");
  el.textContent = text;
  el.style.display = "";
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = "none"; }, ms);
}

function updateGold() {
  $("gold-display").textContent = "\u2B25 " + state.gold;
  document.querySelectorAll(".tower-btn").forEach(btn => {
    const info = TOWER_TYPES[btn.dataset.type];
    btn.style.opacity = state.gold >= info.cost ? "1" : (mobile ? "0.35" : "0.5");
  });
  if (selectedTowerObj) {
    const t = selectedTowerObj;
    const maxLvl = 1 + t.info.upgrades.length;
    if (t.level < maxLvl) $("tp-upgrade").disabled = state.gold < t.info.upgrades[t.level - 1].cost;
  }
}

function updateLives() {
  const el = $("lives-display");
  el.textContent = "\u2665 " + state.lives;
  el.style.color = state.lives <= 5 ? "#ff4444" : "#ff8866";
}

function updateWaveUI() {
  const el = $("wave-info");
  const hudCenter = $("hud-center");

  if (state.gameOver) { hudCenter.style.display = "none"; return; }
  if (state.victory && !state.endless) { hudCenter.style.display = "none"; return; }
  hudCenter.style.display = "";

  const isEndless = state.endless || state.wave > WAVES.length;
  const prefix = isEndless ? "\u221E " : "";

  if (state.waveActive) {
    const cur = getWaveInfo(state.wave);
    el.textContent = prefix + "Wave " + state.wave + " \u2014 " + cur.name;
    el.style.cursor = "default"; el.style.opacity = "0.8";
  } else {
    const nextNum = state.wave + 1;
    if (!state.endless && state.wave >= WAVES.length) {
      el.textContent = "All waves complete"; el.style.cursor = "default"; el.style.opacity = "0.8";
    } else {
      const next = getWaveInfo(nextNum);
      el.textContent = "\u25B6 " + prefix + "Wave " + nextNum + " \u2014 " + next.name;
      el.style.cursor = "pointer"; el.style.opacity = "1";
    }
  }
}

function updatePauseBtn() {
  const btn = $("pause-btn");
  btn.textContent = paused ? "\u25B6" : "\u23F8";
  btn.style.background = paused ? "rgba(255,100,100,0.25)" : "rgba(138,126,96,0.1)";
  btn.style.borderColor = paused ? "rgba(255,100,100,0.5)" : "rgba(138,126,96,0.25)";
  btn.style.color = paused ? "#ff8866" : "#8a7e60";
}

function updateAutoBtn() {
  const btn = $("auto-btn");
  btn.textContent = autoWave ? "AUTO" : "MANUAL";
  btn.style.background = autoWave ? "rgba(100,180,100,0.2)" : "rgba(138,126,96,0.15)";
  btn.style.borderColor = autoWave ? "rgba(100,200,100,0.5)" : "rgba(138,126,96,0.3)";
  btn.style.color = autoWave ? "#88cc88" : "#8a7e60";
}

function updateSpeedBtn() {
  const btn = $("speed-btn");
  btn.textContent = speed + "x";
  btn.style.background = speed > 1 ? "rgba(255,204,68,0.25)" : "rgba(138,126,96,0.1)";
  btn.style.borderColor = speed > 1 ? "rgba(255,204,68,0.6)" : "rgba(138,126,96,0.25)";
  btn.style.color = speed > 1 ? "#ffcc44" : "#8a7e60";
}

function updateMuteBtn() {
  const btn = $("mute-btn");
  btn.textContent = muted ? "\u{1F507}" : "\u{1F50A}";
  btn.style.background = muted ? "rgba(200,100,100,0.2)" : "rgba(138,126,96,0.1)";
  btn.style.borderColor = muted ? "rgba(200,100,100,0.4)" : "rgba(138,126,96,0.25)";
  btn.style.color = muted ? "#dd8888" : "#8a7e60";
  if (masterGain) masterGain.gain.value = muted ? 0 : 0.4;
}

function selectTower(type) {
  if (state) state.selectedTower = type;
  if (selectedTowerObj) hideTowerPopup(null);
  document.querySelectorAll(".tower-btn").forEach(btn => {
    const sel = btn.dataset.type === type;
    if (mobile) {
      btn.style.background = sel ? "rgba(138,126,96,0.45)" : "rgba(10,9,8,0.85)";
      btn.style.border = sel ? "2px solid rgba(212,200,160,0.8)" : "1px solid rgba(138,126,96,0.3)";
    } else {
      btn.style.background = sel ? "rgba(138,126,96,0.35)" : "rgba(10,9,8,0.85)";
      btn.style.border = sel ? "1px solid rgba(212,200,160,0.6)" : "1px solid rgba(138,126,96,0.3)";
    }
  });
}

function showGameOver() {
  $("game-over").style.display = "";
  if (state.endless) {
    $("game-over-wave").textContent = "Endless Wave " + state.wave + " reached \u2014 " + state.towers.length + " towers built";
  } else {
    $("game-over-wave").textContent = "The temple has been lost. Wave " + state.wave + ".";
  }
  updateWaveUI();
  SFX.gameOver();
}

function showVictory() {
  if (state.endless) return; /* endless mode ends on game over, never victory */
  $("victory-screen").style.display = "";
  $("victory-stats").textContent = state.towers.length + " towers \u00B7 " + state.gold + " gold left";
  $("endless-btn").style.display = "";
  updateWaveUI();
  SFX.victory();
}

function enterEndless() {
  $("victory-screen").style.display = "none";
  state.victory = false;
  state.endless = true;
  state.lives = Math.max(state.lives, 10); /* restore at least 10 lives */
  state.gold += 100; /* bonus gold for entering endless */
  updateGold(); updateLives(); updateWaveUI();
  showToast("\u{1F300} Endless Mode \u2014 +100g +10\u2665", 3500);
  if (autoWave) {
    setTimeout(() => { if (!state.gameOver) startWave(); }, 2000);
  }
}

function startWave() {
  if (!state || state.waveActive || state.gameOver) return;
  if (state.victory && !state.endless) return;
  /* Campaign: capped at WAVES.length. Endless: unlimited. */
  if (!state.endless && state.wave >= WAVES.length) return;
  state.wave++; state.waveActive = true; state.spawned = 0; state.spawnTimer = 0.5; state.currentWaveInfo = null;
  updateWaveUI();
  SFX.waveStart();
}

/* ─── TOWER POPUP ─── */
function showTowerPopup(tower, rangeCircle) {
  selectedTowerObj = tower;
  const popup = $("tower-popup");
  const info = tower.info;
  const lvl = tower.level;
  const maxLvl = 1 + info.upgrades.length;
  const isMax = lvl >= maxLvl;
  const nextUpgrade = !isMax ? info.upgrades[lvl - 1] : null;
  const colorHex = "#" + info.color.toString(16).padStart(6, "0");

  $("tp-icon").textContent = info.icon;
  $("tp-name").innerHTML = '<span style="color:' + colorHex + '">' + info.name + '</span>';
  $("tp-level").textContent = isMax ? "" : "Lv " + lvl;

  let statsHtml = "";
  if (isMax) {
    statsHtml += '<div class="tp-max">\u2605 MAX \u2605</div>';
  }
  statsHtml += "Dmg: <strong>" + tower.damage + "</strong>";
  if (nextUpgrade) statsHtml += ' <span class="stat-upgrade">\u2192' + nextUpgrade.damage + '</span>';
  statsHtml += " &middot; " + (tower.damage / tower.rate).toFixed(1) + " dps";
  statsHtml += "<br>Rate: <strong>" + tower.rate.toFixed(2) + "s</strong>";
  if (nextUpgrade) statsHtml += ' <span class="stat-upgrade">\u2192' + nextUpgrade.rate.toFixed(2) + 's</span>';
  statsHtml += "<br>Range: <strong>" + tower.range.toFixed(1) + "</strong>";
  if (nextUpgrade) statsHtml += ' <span class="stat-upgrade">\u2192' + nextUpgrade.range.toFixed(1) + '</span>';
  $("tp-stats").innerHTML = statsHtml;

  const upBtn = $("tp-upgrade");
  if (isMax) {
    upBtn.style.display = "none";
  } else {
    upBtn.textContent = "\u2692 " + nextUpgrade.cost + "g";
    upBtn.disabled = state.gold < nextUpgrade.cost;
    upBtn.style.display = "";
  }
  $("tp-sell").textContent = "\u2716 " + Math.floor(tower.totalInvested * SELL_REFUND) + "g";
  popup.style.display = ""; popup.style.left = "50%"; popup.style.bottom = mobile ? "90px" : "130px"; popup.style.top = "auto"; popup.style.transform = "translateX(-50%)";
  if (rangeCircle) {
    const pos = tower.group.position;
    rangeCircle.position.x = pos.x; rangeCircle.position.z = pos.z;
    rangeCircle.geometry.dispose(); rangeCircle.geometry = new THREE.RingGeometry(tower.range - 0.05, tower.range, 48);
    rangeCircle.visible = true;
  }
}

function hideTowerPopup(rangeCircle) {
  $("tower-popup").style.display = "none";
  selectedTowerObj = null;
  if (rangeCircle) rangeCircle.visible = false;
}

function upgradeTower(rangeCircle) {
  if (!selectedTowerObj || !state) return;
  const tower = selectedTowerObj, info = tower.info, lvl = tower.level;
  if (lvl >= 1 + info.upgrades.length) return;
  const upgrade = info.upgrades[lvl - 1];
  if (state.gold < upgrade.cost) { showToast("Not enough gold!"); return; }
  state.gold -= upgrade.cost; tower.totalInvested += upgrade.cost; tower.level = lvl + 1;
  tower.damage = upgrade.damage; tower.rate = upgrade.rate; tower.range = upgrade.range;
  const lvlUp = tower.level - 1;
  /* Body: wider, taller, brighter */
  tower.body.scale.set(1.0 + lvlUp * 0.15, 1.0 + lvlUp * 0.25, 1.0 + lvlUp * 0.15);
  tower.body.position.y = 1.1 + lvlUp * 0.2;
  tower.body.material.emissiveIntensity = 0.8 + lvlUp * 0.8;
  tower.body.material.metalness = 0.6 + lvlUp * 0.15;
  /* Orb: much bigger, brighter */
  tower.orb.scale.setScalar(1.0 + lvlUp * 0.5);
  tower.orb.material.emissiveIntensity = 2.0 + lvlUp * 2.0;
  /* Glow: significantly larger */
  tower.glow.scale.set(1.0 + lvlUp * 0.7, 1.0 + lvlUp * 0.7, 1);
  tower.glow.material.opacity = 0.3 + lvlUp * 0.15;
  /* Reposition orb/glow higher */
  const orbBaseY = 2.2 + lvlUp * 0.35;
  tower.orbBaseY = orbBaseY; tower.orb.position.y = orbBaseY; tower.glow.position.y = orbBaseY;
  /* Light: brighter, wider reach */
  if (tower.light) { tower.light.position.y = orbBaseY; tower.light.intensity = 30 + lvlUp * 30; tower.light.distance = 10 + lvlUp * 4; }
  updateGold(); SFX.towerUpgrade();
  showToast(info.name + " \u2192 Lv " + tower.level + "!");
  showTowerPopup(tower, rangeCircle);
}

function sellTower(rangeCircle) {
  if (!selectedTowerObj || !state) return;
  const tower = selectedTowerObj;
  const sellValue = Math.floor(tower.totalInvested * SELL_REFUND);
  state.gold += sellValue;
  if (tower.group.parent) tower.group.parent.remove(tower.group);
  if (tower.light) { tower.light.intensity = 0; tower.light.position.set(0, -100, 0); }
  const idx = state.towers.indexOf(tower);
  if (idx !== -1) state.towers.splice(idx, 1);
  state.towerMeshMap.delete(tower.col + "," + tower.row);
  updateGold(); SFX.towerSell(); hideTowerPopup(rangeCircle);
  showToast("Sold for " + sellValue + "g");
}

/* ─── BUILD TOWER BAR ─── */
function buildTowerBar() {
  const bar = $("tower-bar");
  Object.entries(TOWER_TYPES).forEach(([key, info]) => {
    const btn = document.createElement("button");
    btn.className = "tower-btn";
    btn.dataset.type = key;
    const colorHex = "#" + info.color.toString(16).padStart(6, "0");

    if (mobile) {
      btn.style.cssText = "width:70px;padding:8px 4px;cursor:pointer;background:rgba(10,9,8,0.92);border:1px solid rgba(138,126,96,0.3);border-radius:6px;color:#d4c8a0;font-family:'Georgia',serif;text-align:center;transition:all 0.15s;-webkit-tap-highlight-color:transparent;pointer-events:auto;";
      btn.innerHTML =
        '<div style="font-size:26px;line-height:1">' + info.icon + '</div>' +
        '<div style="font-size:12px;margin-top:4px;color:' + colorHex + ';font-weight:bold">' + info.name + '</div>' +
        '<div style="font-size:13px;color:#ffcc44;margin-top:3px;font-weight:bold">' + info.cost + 'g</div>';
    } else {
      btn.style.cssText = "padding:8px 14px;cursor:pointer;background:rgba(10,9,8,0.92);border:1px solid rgba(138,126,96,0.3);border-radius:6px;color:#d4c8a0;font-family:'Georgia',serif;transition:all 0.2s;min-width:100px;text-align:center;pointer-events:auto;";
      btn.innerHTML =
        '<div style="font-size:20px;line-height:1">' + info.icon + '</div>' +
        '<div style="font-size:13px;color:' + colorHex + ';font-weight:bold;margin-top:3px">' + info.name + '</div>' +
        '<div style="font-size:9px;opacity:0.5;margin-top:1px">' + info.desc + '</div>' +
        '<div style="font-size:12px;color:#ffcc44;margin-top:3px">' + info.cost + 'g</div>';
    }

    btn.addEventListener("click", () => selectTower(key));
    bar.appendChild(btn);
  });
}

/* ─── INIT 3D GAME ─── */
function init() {
  initAudio(); resumeAudio();
  $("title-screen").style.display = "none";
  $("game-screen").style.display = "";

  const el = $("game-mount");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0908);
  scene.fog = new THREE.FogExp2(0x0a0908, 0.018);

  const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.1, 200);
  camera.position.set(0, 24, 18);
  camera.lookAt(0, 0, 3);

  THREE.ColorManagement.enabled = false;
  const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.setSize(el.clientWidth, el.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  el.appendChild(renderer.domElement);

  /* Materials */
  const glowMap = glowTex();
  const flTex = floorTex(); flTex.repeat.set(4, 3);
  const pTex = pathTex();
  const floorMat = new THREE.MeshStandardMaterial({ map: flTex, roughness: 0.8, metalness: 0.05 });
  const pathMat = new THREE.MeshStandardMaterial({ map: pTex, roughness: 0.9, metalness: 0.02 });
  const darkStoneMat = new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.7, metalness: 0.2 });

  /* Ground */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(W + 4, H + 4), floorMat);
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.01; ground.receiveShadow = true; scene.add(ground);

  /* Path tiles */
  for (let c = 0; c < COLS; c++) for (let r = 0; r < ROWS; r++) {
    if (isPathTile(c, r)) {
      const pos = gridToWorld(c, r);
      const tile = new THREE.Mesh(new THREE.PlaneGeometry(TILE - 0.05, TILE - 0.05), pathMat);
      tile.rotation.x = -Math.PI / 2; tile.position.set(pos.x, 0.01, pos.z); tile.receiveShadow = true; scene.add(tile);
    }
  }

  /* Path runes */
  const runeGeo = new THREE.RingGeometry(0.05, 0.12, 6);
  const runeMat = new THREE.MeshStandardMaterial({ color: 0x8a7e60, emissive: 0x4a3e20, emissiveIntensity: 0.5, side: THREE.DoubleSide });
  pathWorldPoints().forEach(p => {
    const rune = new THREE.Mesh(runeGeo, runeMat);
    rune.rotation.x = -Math.PI / 2; rune.position.set(p.x, 0.02, p.z); scene.add(rune);
  });

  /* Entry & exit portals */
  const entryPos = gridToWorld(PATH_POINTS[0][0], PATH_POINTS[0][1]);
  const exitPos = gridToWorld(PATH_POINTS[PATH_POINTS.length-1][0], PATH_POINTS[PATH_POINTS.length-1][1]);
  const portalGeo = new THREE.TorusGeometry(0.6, 0.1, 8, 24);

  const entryPortal = new THREE.Mesh(portalGeo, new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff2222, emissiveIntensity: 1.5, transparent: true, opacity: 0.7 }));
  entryPortal.rotation.x = -Math.PI / 2; entryPortal.position.set(entryPos.x, 0.3, entryPos.z); scene.add(entryPortal);
  const entryLight = new THREE.PointLight(0xff4444, 80, 12); entryLight.position.set(entryPos.x, 1, entryPos.z); scene.add(entryLight);

  const exitPortal = new THREE.Mesh(portalGeo, new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22dd22, emissiveIntensity: 1.5, transparent: true, opacity: 0.7 }));
  exitPortal.rotation.x = -Math.PI / 2; exitPortal.position.set(exitPos.x, 0.3, exitPos.z); scene.add(exitPortal);
  const exitLight = new THREE.PointLight(0x44ff44, 80, 12); exitLight.position.set(exitPos.x, 1, exitPos.z); scene.add(exitLight);

  /* Lighting */
  scene.add(new THREE.AmbientLight(0x1a1510, 3.0));
  const torchData = [[-W/2+1,4,-H/2+1],[W/2-1,4,-H/2+1],[-W/2+1,4,H/2-1],[W/2-1,4,H/2-1],[0,5,0],[-W/4,4.5,0],[W/4,4.5,0],[0,4.5,-H/4],[0,4.5,H/4]];
  const torchLights = [];
  torchData.forEach(([x,y,z], i) => {
    const tl = new THREE.PointLight(0xff8844, i===4?120:60, 40);
    tl.position.set(x,y,z);
    if (!mobile && i < 2) { tl.castShadow = true; tl.shadow.mapSize.width = 512; tl.shadow.mapSize.height = 512; }
    scene.add(tl); torchLights.push(tl);
    if (i < 4) {
      const sconce = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.15,0.4,8), darkStoneMat);
      sconce.position.set(x,y-0.8,z); scene.add(sconce);
    }
  });

  /* Dust particles */
  const dustCount = mobile ? 150 : 400;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustVel = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i*3] = (Math.random()-0.5)*W; dustPos[i*3+1] = Math.random()*8; dustPos[i*3+2] = (Math.random()-0.5)*H;
    dustVel[i*3] = (Math.random()-0.5)*0.004; dustVel[i*3+1] = (Math.random()-0.5)*0.003; dustVel[i*3+2] = (Math.random()-0.5)*0.004;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xccaa88, size: 0.06, transparent: true, opacity: 0.35 })));

  /* Hover indicator */
  const hoverRing = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.65, 32),
    new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
  );
  hoverRing.rotation.x = -Math.PI / 2; hoverRing.visible = false; hoverRing.position.y = 0.03; scene.add(hoverRing);

  const rangeCircle = new THREE.Mesh(
    new THREE.RingGeometry(3.4, 3.5, 48),
    new THREE.MeshBasicMaterial({ color: 0xffcc44, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
  );
  rangeCircle.rotation.x = -Math.PI / 2; rangeCircle.visible = false; rangeCircle.position.y = 0.02; scene.add(rangeCircle);

  /* ─── WIRE POPUP BUTTONS ─── */
  const tpEl = $("tower-popup");
  tpEl.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: false });
  tpEl.addEventListener("touchend", (e) => e.stopPropagation(), { passive: false });
  tpEl.addEventListener("mousedown", (e) => e.stopPropagation());
  $("tp-upgrade").addEventListener("click", (e) => { e.stopPropagation(); upgradeTower(rangeCircle); });
  $("tp-sell").addEventListener("click", (e) => { e.stopPropagation(); sellTower(rangeCircle); });
  $("tp-close").addEventListener("click", (e) => { e.stopPropagation(); hideTowerPopup(rangeCircle); });

  /* ─── GAME STATE ─── */
  state = {
    towers: [], enemies: [], projectiles: [],
    gold: 150, lives: 20, wave: 0,
    waveActive: false, spawnTimer: 0, spawned: 0, enemiesAlive: 0,
    gameOver: false, victory: false, endless: false, currentWaveInfo: null, selectedTower: "fire",
    towerMeshMap: new Map(),
  };

  /* Select the default tower visually */
  selectTower("fire");
  updateGold();
  updateWaveUI();

  /* Auto-start wave 1 if auto mode is on */
  if (autoWave) {
    setTimeout(() => { if (!state.gameOver && !state.victory) startWave(); }, 1500);
  }

  /* ─── PRE-BUILT GEOMETRIES & MATERIALS ─── */
  const towerGeo = {
    base: new THREE.CylinderGeometry(0.35, 0.5, 0.3, 8),
    fire: new THREE.CylinderGeometry(0.12, 0.25, 1.6, 6),
    ice: new THREE.CylinderGeometry(0.18, 0.18, 1.8, 4),
    earth: new THREE.BoxGeometry(0.5, 1.8, 0.5),
    arcane: new THREE.CylinderGeometry(0.08, 0.3, 2.0, 3),
    orb: new THREE.SphereGeometry(0.15, 12, 12),
  };
  const towerMat = {};
  const towerGlowMat = {};
  const towerOrbMat = {};
  Object.entries(TOWER_TYPES).forEach(([key, info]) => {
    towerMat[key] = new THREE.MeshStandardMaterial({ color: info.color, emissive: info.emissive, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.6 });
    if (key === "ice") { towerMat[key].transparent = true; towerMat[key].opacity = 0.85; }
    towerOrbMat[key] = new THREE.MeshStandardMaterial({ color: info.color, emissive: info.emissive, emissiveIntensity: 2.0, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.9 });
    towerGlowMat[key] = new THREE.SpriteMaterial({ map: glowMap, color: info.color, transparent: true, opacity: 0.3 });
  });

  /* ─── ENEMY GEOMETRIES PER TYPE ─── */
  const enemyGeoByType = {
    shade:      new THREE.SphereGeometry(0.3, 10, 10),
    wraith:     new THREE.CylinderGeometry(0.12, 0.18, 0.6, 8),
    golem:      new THREE.BoxGeometry(0.45, 0.45, 0.45),
    knight:     new THREE.SphereGeometry(0.3, 10, 10),
    swarm:      new THREE.SphereGeometry(0.3, 8, 8),
    warlord:    new THREE.SphereGeometry(0.3, 10, 10),
    spirit:     new THREE.DodecahedronGeometry(0.3, 0),
    guardian:   new THREE.OctahedronGeometry(0.3, 0),
    voidwalker: new THREE.IcosahedronGeometry(0.3, 0),
    boss:       new THREE.SphereGeometry(0.3, 16, 16),
  };
  /* Shared small geometries */
  const enemyEyeGeo = new THREE.SphereGeometry(0.05, 6, 6);
  const enemyHpBgGeo = new THREE.PlaneGeometry(0.7, 0.08);
  const enemyHpFillGeo = new THREE.PlaneGeometry(0.68, 0.06);
  const enemyHpBgMat = new THREE.MeshBasicMaterial({ color: 0x220000, transparent: true, opacity: 0.7 });

  /* Knight spike geometry */
  const spikeGeo = new THREE.ConeGeometry(0.04, 0.18, 4);

  /* Guardian / Boss ring geometry */
  const orbitRingGeo = new THREE.TorusGeometry(0.35, 0.02, 6, 24);

  /* Pre-build materials per enemy type */
  const enemyMats = {};
  Object.entries(ENEMY_VISUALS).forEach(([type, v]) => {
    enemyMats[type] = {
      body: new THREE.MeshStandardMaterial({
        color: v.bodyColor, emissive: v.emissive, emissiveIntensity: v.emissiveIntensity,
        roughness: 0.4, metalness: 0.6, transparent: true, opacity: v.opacity,
      }),
      eye: new THREE.MeshStandardMaterial({
        color: v.eyeColor, emissive: v.eyeColor, emissiveIntensity: 2.0,
      }),
      glow: new THREE.SpriteMaterial({
        map: glowMap, color: v.glowColor, transparent: true, opacity: 0.25,
      }),
    };
  });

  /* ─── TOWER LIGHT POOL ─── */
  /* Pre-allocate all possible tower lights so the light count never changes at runtime */
  const MAX_TOWER_LIGHTS = 50;
  const towerLightPool = [];
  for (let i = 0; i < MAX_TOWER_LIGHTS; i++) {
    const pl = new THREE.PointLight(0xffffff, 0, 10);
    pl.position.set(0, -100, 0);
    scene.add(pl);
    towerLightPool.push(pl);
  }
  let nextLight = 0;

  /* Force shader compilation with all lights present */
  renderer.render(scene, camera);

  /* ─── TOWER CREATION ─── */
  function createTower(col, row, type) {
    const info = TOWER_TYPES[type];
    const pos = gridToWorld(col, row);
    const group = new THREE.Group();
    group.position.set(pos.x, 0, pos.z);
    const base = new THREE.Mesh(towerGeo.base, darkStoneMat);
    base.position.y = 0.15; base.castShadow = !mobile; group.add(base);
    const body = new THREE.Mesh(towerGeo[type], towerMat[type].clone());
    if (type === "ice") body.rotation.y = Math.PI/4;
    body.position.y = 1.1; body.castShadow = !mobile; group.add(body);
    const orb = new THREE.Mesh(towerGeo.orb, towerOrbMat[type].clone());
    orb.position.y = 2.2; group.add(orb);
    const glow = new THREE.Sprite(towerGlowMat[type].clone());
    glow.scale.set(1.0, 1.0, 1); glow.position.y = 2.2; group.add(glow);
    let light = null;
    if (nextLight < towerLightPool.length) {
      light = towerLightPool[nextLight++];
      light.color.setHex(info.color); light.intensity = 30; light.position.set(pos.x, 2.2, pos.z);
    }
    scene.add(group);
    const tower = {
      group, body, orb, glow, light, col, row, type, info, cooldown: 0,
      level: 1, damage: info.damage, rate: info.rate, range: info.range,
      totalInvested: info.cost, orbBaseY: 2.2,
    };
    state.towers.push(tower);
    state.towerMeshMap.set(col + "," + row, tower);
    return tower;
  }

  /* ─── ENEMY CREATION ─── */
  function spawnEnemy(hp, spd, reward, type) {
    const vis = ENEMY_VISUALS[type] || ENEMY_VISUALS.shade;
    const mats = enemyMats[type] || enemyMats.shade;
    const s = vis.scale;

    const group = new THREE.Group();
    const startPos = gridToWorld(PATH_POINTS[0][0], PATH_POINTS[0][1]);
    group.position.copy(startPos);
    group.position.y = 0.15 + 0.25 * s;

    /* Body */
    const body = new THREE.Mesh(enemyGeoByType[type] || enemyGeoByType.shade, mats.body.clone());
    body.scale.setScalar(s);
    body.castShadow = !mobile;
    group.add(body);

    /* Eyes — positioned relative to scale */
    const eyeScale = Math.min(s, 1.2);
    const eye1 = new THREE.Mesh(enemyEyeGeo, mats.eye);
    eye1.position.set(-0.1 * s, 0.08 * s, -0.25 * s);
    eye1.scale.setScalar(eyeScale);
    group.add(eye1);
    const eye2 = new THREE.Mesh(enemyEyeGeo, mats.eye);
    eye2.position.set(0.1 * s, 0.08 * s, -0.25 * s);
    eye2.scale.setScalar(eyeScale);
    group.add(eye2);

    /* Type-specific decorations */
    const extras = [];

    if (type === "knight") {
      /* Crown of spikes */
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0x880000, emissive: 0x440000, emissiveIntensity: 0.8, metalness: 0.8 });
      for (let i = 0; i < 5; i++) {
        const spike = new THREE.Mesh(spikeGeo, spikeMat);
        const angle = (i / 5) * Math.PI * 2;
        spike.position.set(Math.cos(angle) * 0.22, 0.28, Math.sin(angle) * 0.22);
        spike.rotation.z = -Math.cos(angle) * 0.4;
        spike.rotation.x = Math.sin(angle) * 0.4;
        extras.push(spike);
        group.add(spike);
      }
    }

    if (type === "warlord") {
      /* Horns */
      const hornMat = new THREE.MeshStandardMaterial({ color: 0x442200, emissive: 0x221100, emissiveIntensity: 0.3, metalness: 0.7 });
      const hornGeo = new THREE.ConeGeometry(0.05, 0.3, 5);
      const horn1 = new THREE.Mesh(hornGeo, hornMat);
      horn1.position.set(-0.2 * s, 0.25 * s, -0.05 * s);
      horn1.rotation.z = 0.4;
      group.add(horn1); extras.push(horn1);
      const horn2 = new THREE.Mesh(hornGeo, hornMat);
      horn2.position.set(0.2 * s, 0.25 * s, -0.05 * s);
      horn2.rotation.z = -0.4;
      group.add(horn2); extras.push(horn2);
    }

    if (type === "guardian") {
      /* Orbiting ring */
      const ringMat = new THREE.MeshStandardMaterial({ color: 0xffcc44, emissive: 0xddaa22, emissiveIntensity: 1.5, metalness: 0.9, transparent: true, opacity: 0.6 });
      const ring = new THREE.Mesh(orbitRingGeo, ringMat);
      ring.scale.setScalar(s);
      group.add(ring);
      extras.push(ring);
    }

    if (type === "boss") {
      /* Multiple orbiting rings */
      const ringMat1 = new THREE.MeshStandardMaterial({ color: 0xff4422, emissive: 0xff2200, emissiveIntensity: 2.0, metalness: 0.9, transparent: true, opacity: 0.5 });
      const ringMat2 = new THREE.MeshStandardMaterial({ color: 0xffcc22, emissive: 0xddaa00, emissiveIntensity: 1.5, metalness: 0.9, transparent: true, opacity: 0.5 });
      const ring1 = new THREE.Mesh(orbitRingGeo, ringMat1);
      ring1.scale.setScalar(s * 0.9);
      group.add(ring1); extras.push(ring1);
      const ring2 = new THREE.Mesh(orbitRingGeo, ringMat2);
      ring2.scale.setScalar(s * 1.1);
      ring2.rotation.x = Math.PI / 2;
      group.add(ring2); extras.push(ring2);
      /* Inner core glow */
      const coreMat = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xff6600, emissiveIntensity: 3.0, transparent: true, opacity: 0.6 });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 8), coreMat);
      core.scale.setScalar(s);
      group.add(core); extras.push(core);
    }

    /* Glow sprite */
    const glow = new THREE.Sprite(mats.glow.clone());
    glow.scale.set(1.0 * s, 1.0 * s, 1);
    group.add(glow);

    /* HP bar — scaled up for large enemies */
    const hpScale = Math.max(1, s * 0.8);
    const hpBg = new THREE.Mesh(enemyHpBgGeo, enemyHpBgMat);
    hpBg.position.y = 0.35 * s + 0.35;
    hpBg.scale.x = hpScale;
    hpBg.rotation.x = -0.3;
    group.add(hpBg);
    const hpFill = new THREE.Mesh(enemyHpFillGeo, new THREE.MeshBasicMaterial({ color: vis.hpBarColor }));
    hpFill.position.y = 0.35 * s + 0.35;
    hpFill.position.z = 0.001;
    hpFill.scale.x = hpScale;
    hpFill.rotation.x = -0.3;
    group.add(hpFill);

    scene.add(group);

    const enemy = {
      group, body, hpFill, glow, extras,
      hp, maxHp: hp, speed: spd, reward,
      pathIndex: 0, pathProgress: 0, slowTimer: 0, alive: true,
      type, vis, hpScale,
    };
    state.enemies.push(enemy);
    state.enemiesAlive++;
    return enemy;
  }

  /* ─── PROJECTILE ─── */
  const projGeo = new THREE.SphereGeometry(0.08, 6, 6);
  const projMat = {};
  Object.entries(TOWER_TYPES).forEach(([key, info]) => {
    projMat[key] = new THREE.MeshStandardMaterial({ color: info.color, emissive: info.emissive, emissiveIntensity: 3, transparent: true, opacity: 0.9 });
  });

  function fireProjectile(tower, target) {
    const mesh = new THREE.Mesh(projGeo, projMat[tower.type]);
    mesh.position.copy(tower.group.position); mesh.position.y = 2.2;
    scene.add(mesh);
    state.projectiles.push({ mesh, target, tower, speed: 12, damage: tower.damage, type: tower.type });
    /* Tower fire sound */
    const fn = SFX.towerFire[tower.type];
    if (fn) fn();
    /* Muzzle flash */
    spawnMuzzleFlash(tower);
  }

  /* ─── PATH FOLLOWING ─── */
  function moveEnemy(enemy, dt) {
    if (!enemy.alive) return;
    const pts = pathWorldPoints();
    if (enemy.pathIndex >= pts.length - 1) {
      /* Leak VFX + sound */
      spawnLeakVFX(enemy.group.position.x, enemy.group.position.y, enemy.group.position.z);
      SFX.enemyLeak();
      enemy.alive = false; scene.remove(enemy.group); state.enemiesAlive--;
      state.lives = Math.max(0, state.lives - 1); updateLives();
      if (state.lives <= 0 && !state.gameOver) { state.gameOver = true; showGameOver(); }
      return;
    }
    const from = pts[enemy.pathIndex], to = pts[enemy.pathIndex + 1];
    const dist = from.distanceTo(to);
    const speedMod = enemy.slowTimer > 0 ? 0.6 : 1;
    enemy.pathProgress += (enemy.speed * speedMod * dt) / dist;
    if (enemy.slowTimer > 0) enemy.slowTimer -= dt;
    if (enemy.pathProgress >= 1) { enemy.pathProgress -= 1; enemy.pathIndex++; }
    if (enemy.pathIndex < pts.length - 1) {
      const a = pts[enemy.pathIndex], b = pts[enemy.pathIndex + 1];
      enemy.group.position.x = a.x + (b.x - a.x) * enemy.pathProgress;
      enemy.group.position.z = a.z + (b.z - a.z) * enemy.pathProgress;
      const dir = new THREE.Vector3().subVectors(b, a).normalize();
      enemy.group.lookAt(enemy.group.position.x + dir.x, 0.4, enemy.group.position.z + dir.z);
    }
  }

  /* ─── RAYCASTING ─── */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  function getGridFromXY(clientX, clientY) {
    const rect = el.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hit = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, hit);
    if (!hit) return null;
    const col = Math.floor((hit.x + W / 2) / TILE);
    const row = Math.floor((hit.z + H / 2) / TILE);
    if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return null;
    return { col, row };
  }

  function tryPlaceTower(clientX, clientY) {
    if (state.gameOver || (state.victory && !state.endless)) return;
    const cell = getGridFromXY(clientX, clientY);
    if (!cell) { hideTowerPopup(rangeCircle); return; }
    const { col, row } = cell;
    const existing = state.towerMeshMap.get(col + "," + row);
    if (existing) {
      if (selectedTowerObj === existing) hideTowerPopup(rangeCircle);
      else showTowerPopup(existing, rangeCircle);
      return;
    }
    if (selectedTowerObj) hideTowerPopup(rangeCircle);
    if (isPathTile(col, row)) { showToast("Can't build on the path"); return; }
    const info = TOWER_TYPES[state.selectedTower];
    if (state.gold < info.cost) { showToast("Not enough gold!"); return; }
    state.gold -= info.cost; updateGold();
    createTower(col, row, state.selectedTower);
    SFX.towerPlace();
  }

  function showHover(clientX, clientY) {
    if (selectedTowerObj) return;
    const cell = getGridFromXY(clientX, clientY);
    if (!cell) { hoverRing.visible = false; rangeCircle.visible = false; return; }
    const existing = state.towerMeshMap.get(cell.col + "," + cell.row);
    if (existing) {
      hoverRing.visible = false;
      const pos = existing.group.position;
      rangeCircle.position.x = pos.x; rangeCircle.position.z = pos.z;
      rangeCircle.geometry.dispose(); rangeCircle.geometry = new THREE.RingGeometry(existing.range - 0.05, existing.range, 48);
      rangeCircle.visible = true; return;
    }
    if (isPathTile(cell.col, cell.row)) { hoverRing.visible = false; rangeCircle.visible = false; return; }
    const pos = gridToWorld(cell.col, cell.row);
    hoverRing.position.x = pos.x; hoverRing.position.z = pos.z; hoverRing.visible = true;
    const s = TOWER_TYPES[state.selectedTower].range;
    rangeCircle.position.x = pos.x; rangeCircle.position.z = pos.z;
    rangeCircle.geometry.dispose(); rangeCircle.geometry = new THREE.RingGeometry(s - 0.05, s, 48);
    rangeCircle.visible = true;
  }

  /* ─── CAMERA STATE ─── */
  let camAngle = 0, camDist = 26, camHeight = 24;

  /* ─── MOUSE CONTROLS (desktop) ─── */
  let rightDrag = false, lastMX = 0;

  function onMouseDown(e) { if (e.button === 2) { rightDrag = true; lastMX = e.clientX; } }
  function onMouseUpGlobal(e) { if (e.button === 2) rightDrag = false; }
  function onMouseMoveGlobal(e) {
    if (rightDrag) { camAngle += (e.clientX - lastMX) * 0.005; lastMX = e.clientX; }
    else { showHover(e.clientX, e.clientY); }
  }
  function onMouseDownPlace(e) { if (e.button === 0) tryPlaceTower(e.clientX, e.clientY); }
  function onWheel(e) { camDist = Math.max(12, Math.min(45, camDist + e.deltaY * 0.02)); camHeight = camDist * 0.9; }
  function onCtx(e) { e.preventDefault(); }

  function onMouseDownAll(e) { resumeAudio(); onMouseDown(e); onMouseDownPlace(e); }
  el.addEventListener("mousedown", onMouseDownAll);
  document.addEventListener("mouseup", onMouseUpGlobal);
  document.addEventListener("mousemove", onMouseMoveGlobal);
  el.addEventListener("wheel", onWheel, { passive: true });
  el.addEventListener("contextmenu", onCtx);

  /* ─── TOUCH CONTROLS (mobile) ─── */
  let touchMode = "none";
  let touchStartTime = 0, touchStartX = 0, touchStartY = 0;
  let pinchStartDist = 0, pinchStartCamDist = 0;
  let panLastX = 0;

  function getTouchDist(t0, t1) {
    const dx = t0.clientX - t1.clientX, dy = t0.clientY - t1.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function onTouchStart(e) {
    e.preventDefault();
    resumeAudio();
    const touches = e.touches;
    if (touches.length === 1) {
      touchMode = "tap";
      touchStartTime = Date.now();
      touchStartX = touches[0].clientX;
      touchStartY = touches[0].clientY;
      panLastX = touches[0].clientX;
      showHover(touches[0].clientX, touches[0].clientY);
    } else if (touches.length === 2) {
      touchMode = "pinch";
      pinchStartDist = getTouchDist(touches[0], touches[1]);
      pinchStartCamDist = camDist;
      panLastX = (touches[0].clientX + touches[1].clientX) / 2;
      hoverRing.visible = false; rangeCircle.visible = false;
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    const touches = e.touches;
    if (touches.length === 1 && (touchMode === "tap" || touchMode === "pan")) {
      const dx = touches[0].clientX - touchStartX;
      const dy = touches[0].clientY - touchStartY;
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        touchMode = "pan";
        hoverRing.visible = false; rangeCircle.visible = false;
      }
      if (touchMode === "pan") {
        camAngle += (touches[0].clientX - panLastX) * 0.006;
        panLastX = touches[0].clientX;
      }
    } else if (touches.length === 2 && touchMode === "pinch") {
      const dist = getTouchDist(touches[0], touches[1]);
      const scale = pinchStartDist / dist;
      camDist = Math.max(12, Math.min(45, pinchStartCamDist * scale));
      camHeight = camDist * 0.9;
      const midX = (touches[0].clientX + touches[1].clientX) / 2;
      camAngle += (midX - panLastX) * 0.004;
      panLastX = midX;
    }
  }

  function onTouchEnd(e) {
    e.preventDefault();
    if (touchMode === "tap" && Date.now() - touchStartTime < 300) {
      tryPlaceTower(touchStartX, touchStartY);
    }
    if (e.touches.length === 0) { touchMode = "none"; }
    else if (e.touches.length === 1) { touchMode = "pan"; panLastX = e.touches[0].clientX; }
    hoverRing.visible = false; rangeCircle.visible = false;
  }

  el.addEventListener("touchstart", onTouchStart, { passive: false });
  el.addEventListener("touchmove", onTouchMove, { passive: false });
  el.addEventListener("touchend", onTouchEnd, { passive: false });

  /* ══════════════════════════════════════════════════════
     VFX PARTICLE SYSTEM
     ══════════════════════════════════════════════════════ */
  const MAX_PARTICLES = mobile ? 200 : 500;
  const particlePositions = new Float32Array(MAX_PARTICLES * 3);
  const particleColors = new Float32Array(MAX_PARTICLES * 3);
  const particleSizes = new Float32Array(MAX_PARTICLES);
  const particleVelocities = []; /* { vx,vy,vz, life, maxLife, idx } */

  for (let i = 0; i < MAX_PARTICLES; i++) {
    particlePositions[i * 3] = 0; particlePositions[i * 3 + 1] = -100; particlePositions[i * 3 + 2] = 0;
    particleColors[i * 3] = 1; particleColors[i * 3 + 1] = 1; particleColors[i * 3 + 2] = 1;
    particleSizes[i] = 0;
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
  particleGeo.setAttribute("color", new THREE.BufferAttribute(particleColors, 3));
  particleGeo.setAttribute("size", new THREE.BufferAttribute(particleSizes, 1));

  /* Custom shader for per-particle size + color */
  const particleMat = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const particleMesh = new THREE.Points(particleGeo, particleMat);
  scene.add(particleMesh);

  let nextParticle = 0;

  function emitParticles(x, y, z, color, count, spread, speed, lifetime) {
    const c = new THREE.Color(color);
    for (let i = 0; i < count; i++) {
      const idx = nextParticle % MAX_PARTICLES;
      nextParticle++;
      particlePositions[idx * 3] = x;
      particlePositions[idx * 3 + 1] = y;
      particlePositions[idx * 3 + 2] = z;
      particleColors[idx * 3] = c.r;
      particleColors[idx * 3 + 1] = c.g;
      particleColors[idx * 3 + 2] = c.b;
      particleSizes[idx] = 0.15 + Math.random() * 0.1;

      const vx = (Math.random() - 0.5) * spread * speed;
      const vy = Math.random() * spread * speed * 0.7 + speed * 0.3;
      const vz = (Math.random() - 0.5) * spread * speed;
      particleVelocities.push({ vx, vy, vz, life: lifetime, maxLife: lifetime, idx });
    }
  }

  function updateParticles(dt) {
    for (let i = particleVelocities.length - 1; i >= 0; i--) {
      const p = particleVelocities[i];
      p.life -= dt;
      if (p.life <= 0) {
        particlePositions[p.idx * 3 + 1] = -100;
        particleSizes[p.idx] = 0;
        particleVelocities.splice(i, 1);
        continue;
      }
      const t = p.life / p.maxLife;
      particlePositions[p.idx * 3] += p.vx * dt;
      particlePositions[p.idx * 3 + 1] += p.vy * dt;
      particlePositions[p.idx * 3 + 2] += p.vz * dt;
      p.vy -= 2.5 * dt; /* gravity */
      particleSizes[p.idx] = (0.08 + 0.12 * t);
      /* Fade alpha via color brightness */
      const fade = t * t;
      const ci = p.idx * 3;
      particleColors[ci] *= (1 - dt * 2) + dt * 2 * fade;
    }
    particleGeo.attributes.position.needsUpdate = true;
    particleGeo.attributes.color.needsUpdate = true;
    particleGeo.attributes.size.needsUpdate = true;
  }

  /* ─── VFX HELPERS ─── */
  /* Impact burst when projectile hits */
  function spawnHitVFX(x, y, z, towerType) {
    const color = TOWER_TYPES[towerType]?.color || 0xffffff;
    const count = mobile ? 4 : 8;
    emitParticles(x, y, z, color, count, 1.0, 2.5, 0.3);
  }

  /* Death explosion */
  function spawnDeathVFX(x, y, z, enemyType) {
    const vis = ENEMY_VISUALS[enemyType];
    const color = vis ? vis.bodyColor : 0xff4444;
    const count = mobile ? 8 : 16;
    emitParticles(x, y, z, color, count, 1.5, 3.5, 0.5);
    /* White core flash */
    emitParticles(x, y, z, 0xffffff, mobile ? 3 : 6, 0.5, 1.5, 0.2);
  }

  /* Muzzle flash on tower orb */
  function spawnMuzzleFlash(tower) {
    const color = tower.info.color;
    const pos = tower.group.position;
    emitParticles(pos.x, 2.2, pos.z, color, mobile ? 2 : 4, 0.4, 1.5, 0.12);
  }

  /* Enemy leak flash at exit */
  function spawnLeakVFX(x, y, z) {
    emitParticles(x, y, z, 0xff2222, mobile ? 5 : 10, 1.2, 2.0, 0.4);
  }

  /* Damage flash on enemy body — brief emissive spike */
  const damageFlashes = []; /* { enemy, timer } */

  function flashEnemyDamage(enemy) {
    if (!enemy.alive) return;
    enemy.body.material.emissiveIntensity = 4.0;
    damageFlashes.push({ enemy, timer: 0.08 });
  }

  function updateDamageFlashes(dt) {
    for (let i = damageFlashes.length - 1; i >= 0; i--) {
      const f = damageFlashes[i];
      f.timer -= dt;
      if (f.timer <= 0) {
        if (f.enemy.alive && f.enemy.vis) {
          f.enemy.body.material.emissiveIntensity = f.enemy.vis.emissiveIntensity;
        }
        damageFlashes.splice(i, 1);
      } else if (f.enemy.alive) {
        const t = f.timer / 0.08;
        f.enemy.body.material.emissiveIntensity = f.enemy.vis.emissiveIntensity + (4.0 - f.enemy.vis.emissiveIntensity) * t;
      }
    }
  }

  /* ─── ANIMATION LOOP ─── */
  let time = 0;
  const clock = new THREE.Clock();

  function animate() {
    const rawDt = Math.min(clock.getDelta(), 0.05);
    const dt = paused ? 0 : rawDt * speed;
    time += paused ? 0 : rawDt;

    camera.position.x = Math.sin(camAngle) * camDist * 0.5;
    camera.position.z = Math.cos(camAngle) * camDist * 0.5 + 4;
    camera.position.y = camHeight;
    camera.lookAt(0, 0, 3);

    if (!state.gameOver && !(state.victory && !state.endless)) {
      torchLights.forEach((tl, i) => {
        const base = i === 4 ? 120 : (i >= 5 ? 70 : 60);
        tl.intensity = base + Math.sin(time*8+i*3)*10 + Math.sin(time*13+i)*8;
      });
      entryPortal.rotation.z = time * 0.5;
      exitPortal.rotation.z = -time * 0.5;
      entryLight.intensity = 80 + Math.sin(time*3)*25;
      exitLight.intensity = 80 + Math.sin(time*3+1)*25;

      const dpos = dustGeo.attributes.position.array;
      for (let i = 0; i < dustCount; i++) {
        dpos[i*3] += dustVel[i*3]; dpos[i*3+1] += dustVel[i*3+1]; dpos[i*3+2] += dustVel[i*3+2];
        if (Math.abs(dpos[i*3]) > W/2) dustVel[i*3] *= -1;
        if (dpos[i*3+1] < 0 || dpos[i*3+1] > 8) dustVel[i*3+1] *= -1;
        if (Math.abs(dpos[i*3+2]) > H/2) dustVel[i*3+2] *= -1;
      }
      dustGeo.attributes.position.needsUpdate = true;

      state.towers.forEach(t => {
        const oby = t.orbBaseY || 2.2;
        t.orb.position.y = oby + Math.sin(time*2+t.col+t.row)*0.1;
        t.orb.rotation.y = time;
        t.glow.material.opacity = 0.2 + Math.sin(time*3+t.col)*0.1;
        t.glow.position.y = t.orb.position.y;
        if (t.light) { t.light.intensity = 25 + Math.sin(time*4+t.row)*10; t.light.position.y = t.orb.position.y; }
      });

      if (state.waveActive) {
        const waveInfo = state.currentWaveInfo || (state.currentWaveInfo = getWaveInfo(state.wave));
        if (waveInfo && state.spawned < waveInfo.enemies) {
          state.spawnTimer -= dt;
          if (state.spawnTimer <= 0) {
            const s = waveInfo.spawnList[state.spawned];
            spawnEnemy(s.hp, s.speed, s.reward, s.type);
            state.spawned++;
            state.spawnTimer = state.spawned < waveInfo.enemies ? waveInfo.spawnList[state.spawned]?.delay || 0.5 : 0;
          }
        }
        if (state.spawned >= (waveInfo?.enemies || 0) && state.enemiesAlive <= 0) {
          state.waveActive = false; state.currentWaveInfo = null; updateWaveUI();
          if (!state.endless && state.wave >= WAVES.length) {
            state.victory = true; showVictory();
          } else {
            const next = getWaveInfo(state.wave + 1);
            const desc = next.groups.map(g => g.count + "\u00D7 " + (g.type.charAt(0).toUpperCase() + g.type.slice(1))).join(", ");
            showToast("Next: " + desc, 3500);
            if (autoWave) {
              setTimeout(() => {
                if (state.gameOver || (state.victory && !state.endless)) return;
                startWave();
              }, 2000);
            }
          }
        }
      }

      state.enemies.forEach(e => moveEnemy(e, dt));
      state.enemies.forEach(e => {
        if (!e.alive) return;
        const v = e.vis;

        /* Per-type body animation */
        e.body.position.y = Math.sin(time * v.bobSpeed + e.pathProgress * 10) * v.bobAmp;
        if (v.spinSpeed > 0) {
          e.body.rotation.y = time * v.spinSpeed;
        }

        /* Glow pulse */
        e.glow.material.opacity = 0.18 + Math.sin(time * 3 + e.pathProgress * 5) * 0.1;

        /* Slow visual override */
        if (e.slowTimer > 0) {
          e.body.material.emissive.setHex(0x2244aa);
        } else {
          e.body.material.emissive.setHex(v.emissive);
        }

        /* Shade: flicker opacity */
        if (e.type === "shade") {
          e.body.material.opacity = 0.4 + Math.sin(time * 8 + e.pathProgress * 20) * 0.2;
        }

        /* Wraith: ghostly vertical float */
        if (e.type === "wraith") {
          e.group.position.y = 0.3 + Math.sin(time * 3 + e.pathProgress * 8) * 0.15;
        }

        /* Swarm: jitter */
        if (e.type === "swarm") {
          e.body.position.x = Math.sin(time * 15 + e.pathProgress * 30) * 0.03;
          e.body.position.z = Math.cos(time * 12 + e.pathProgress * 25) * 0.03;
        }

        /* Guardian: ring orbit */
        if (e.type === "guardian" && e.extras.length > 0) {
          e.extras[0].rotation.x = time * 1.2;
          e.extras[0].rotation.z = time * 0.8;
        }

        /* Boss: ring orbits + core pulse */
        if (e.type === "boss" && e.extras.length >= 3) {
          e.extras[0].rotation.x = time * 0.7;
          e.extras[0].rotation.z = time * 1.1;
          e.extras[1].rotation.y = time * 0.9;
          e.extras[1].rotation.z = time * 0.6;
          const pulse = 0.4 + Math.sin(time * 4) * 0.2;
          e.extras[2].material.opacity = pulse;
          e.extras[2].material.emissiveIntensity = 2.0 + Math.sin(time * 6) * 1.0;
        }

        /* Knight: spike crown rotation */
        if (e.type === "knight" && e.extras.length > 0) {
          e.extras.forEach((spike, i) => {
            const angle = (i / 5) * Math.PI * 2 + time * 2;
            spike.position.set(Math.cos(angle) * 0.22, 0.28, Math.sin(angle) * 0.22);
          });
        }

        /* Spirit: faster spin + scale pulse */
        if (e.type === "spirit") {
          const pulse = 1.0 + Math.sin(time * 5) * 0.08;
          e.body.scale.setScalar(v.scale * pulse);
        }

        /* Voidwalker: scale flicker */
        if (e.type === "voidwalker") {
          const flicker = 1.0 + Math.sin(time * 10 + e.pathProgress * 15) * 0.05;
          e.body.scale.setScalar(v.scale * flicker);
          e.body.material.opacity = 0.6 + Math.sin(time * 7) * 0.15;
        }
      });

      state.towers.forEach(t => {
        t.cooldown -= dt; if (t.cooldown > 0) return;
        const tPos = new THREE.Vector3(t.group.position.x, 0, t.group.position.z);
        let closest = null, closestDist = t.range;
        state.enemies.forEach(e => {
          if (!e.alive) return;
          const d = tPos.distanceTo(new THREE.Vector3(e.group.position.x, 0, e.group.position.z));
          if (d < closestDist) { closestDist = d; closest = e; }
        });
        if (closest) { fireProjectile(t, closest); t.cooldown = t.rate; }
      });

      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        if (!p.target.alive) { scene.remove(p.mesh); state.projectiles.splice(i, 1); continue; }
        const dir = new THREE.Vector3().subVectors(p.target.group.position, p.mesh.position);
        if (dir.length() < 0.3) {
          p.target.hp -= p.damage;
          if (p.type === "ice") p.target.slowTimer = 2.0;
          if (p.type === "arcane") {
            let cc = 0; const hitPos = p.target.group.position.clone();
            state.enemies.forEach(e => {
              if (!e.alive || e === p.target || cc >= 2) return;
              if (e.group.position.distanceTo(hitPos) < 2.5) {
                e.hp -= p.damage * 0.5; flashEnemyDamage(e); cc++;
                if (e.hp <= 0 && e.alive) {
                  spawnDeathVFX(e.group.position.x, e.group.position.y, e.group.position.z, e.type);
                  SFX.enemyDeath();
                  e.alive = false; scene.remove(e.group); state.enemiesAlive--;
                  state.gold += e.reward; updateGold();
                }
              }
            });
          }
          /* Hit VFX + sound */
          const hp = p.target.group.position;
          spawnHitVFX(hp.x, hp.y, hp.z, p.type);
          flashEnemyDamage(p.target);
          SFX.hit();

          const ratio = Math.max(0, p.target.hp / p.target.maxHp);
          const hs = p.target.hpScale || 1;
          p.target.hpFill.scale.x = ratio * hs;
          p.target.hpFill.position.x = -0.34 * hs * (1 - ratio);
          if (ratio < 0.4) p.target.hpFill.material.color.setHex(0xff8800);
          if (ratio < 0.2) p.target.hpFill.material.color.setHex(0xff0000);
          if (p.target.hp <= 0) {
            /* Death VFX + sound */
            spawnDeathVFX(hp.x, hp.y, hp.z, p.target.type);
            SFX.enemyDeath();
            p.target.alive = false; scene.remove(p.target.group); state.enemiesAlive--;
            state.gold += p.target.reward; updateGold();
          }
          scene.remove(p.mesh); state.projectiles.splice(i, 1);
        } else { dir.normalize(); p.mesh.position.addScaledVector(dir, p.speed * dt); }
      }

      state.enemies.forEach(e => { if (!e.alive && e.group.parent) scene.remove(e.group); });
      state.enemies = state.enemies.filter(e => e.alive);

      /* Update VFX */
      updateParticles(dt);
      updateDamageFlashes(dt);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  const onResize = () => {
    const w = el.clientWidth, h = el.clientHeight;
    camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);
  };
  window.addEventListener("resize", onResize);
}

/* ─── ENTRY POINT ─── */
if (mobile) document.body.classList.add("mobile");
buildTowerBar();
updateAutoBtn();
updateSpeedBtn();
updatePauseBtn();
updateMuteBtn();

$("start-btn").addEventListener("click", init);
$("wave-info").addEventListener("click", () => { resumeAudio(); startWave(); });
$("auto-btn").addEventListener("click", () => { resumeAudio(); SFX.uiClick(); autoWave = !autoWave; updateAutoBtn(); });
$("speed-btn").addEventListener("click", () => { resumeAudio(); SFX.uiClick(); speed = speed >= 3 ? 1 : speed + 1; updateSpeedBtn(); });
$("pause-btn").addEventListener("click", () => { resumeAudio(); SFX.uiClick(); paused = !paused; updatePauseBtn(); });
$("mute-btn").addEventListener("click", () => { muted = !muted; updateMuteBtn(); });
$("restart-btn").addEventListener("click", () => window.location.reload());
$("endless-btn").addEventListener("click", () => { resumeAudio(); enterEndless(); });