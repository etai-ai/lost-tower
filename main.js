import * as THREE from "three";

/* ─── CONSTANTS ─── */
const TILE = 1.4;
const COLS = 20, ROWS = 14;
const W = COLS * TILE, H = ROWS * TILE;

const TOWER_TYPES = {
  fire:   { cost: 30, range: 3.5, damage: 12, rate: 0.9,  color: 0xff6644, emissive: 0xff4422, name: "Fire",   icon: "\u{1F525}", desc: "Fast, moderate dmg" },
  ice:    { cost: 40, range: 4.0, damage: 8,  rate: 1.2,  color: 0x44aaff, emissive: 0x2288dd, name: "Frost",  icon: "\u2744\uFE0F", desc: "Slows enemies 40%" },
  earth:  { cost: 50, range: 3.0, damage: 25, rate: 1.8,  color: 0x66ff88, emissive: 0x44cc66, name: "Earth",  icon: "\u{1FAA8}", desc: "Heavy dmg, slow" },
  arcane: { cost: 70, range: 5.0, damage: 18, rate: 1.0,  color: 0xffcc44, emissive: 0xddaa22, name: "Arcane", icon: "\u2728", desc: "Long range, chains" },
};

const PATH_POINTS = [
  [0,1],  [4,1],  [4,4],  [1,4],  [1,7],
  [6,7],  [6,2],  [9,2],  [9,7],  [9,10],
  [3,10], [3,12], [10,12],[10,9], [14,9],
  [14,5], [11,5], [11,2], [14,2], [17,2],
  [17,6], [14,6], [14,11],[17,11],[17,8],
  [19,8],
];

const WAVES = [
  { enemies: 8,  hp: 50,  speed: 2.4, reward: 8,  delay: 0.9, name: "Forgotten Shades" },
  { enemies: 10, hp: 65,  speed: 2.6, reward: 9,  delay: 0.8, name: "Temple Wraiths" },
  { enemies: 12, hp: 80,  speed: 2.8, reward: 10, delay: 0.75, name: "Stone Golems" },
  { enemies: 10, hp: 120, speed: 3.2, reward: 12, delay: 0.7, name: "Shadow Knights" },
  { enemies: 14, hp: 100, speed: 3.0, reward: 11, delay: 0.55, name: "Cursed Swarm" },
  { enemies: 12, hp: 160, speed: 3.4, reward: 14, delay: 0.65, name: "Ancient Warlords" },
  { enemies: 16, hp: 150, speed: 3.6, reward: 13, delay: 0.45, name: "Spirit Horde" },
  { enemies: 4,  hp: 700, speed: 1.8, reward: 50, delay: 1.8, name: "Temple Guardians" },
  { enemies: 18, hp: 200, speed: 4.0, reward: 15, delay: 0.4, name: "Void Walkers" },
  { enemies: 1,  hp: 2500, speed: 1.5, reward: 200, delay: 3.0, name: "The Sealed One" },
];

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
let toastTimer = null;
let state = null;

/* ─── DOM HELPERS ─── */
const $ = (id) => document.getElementById(id);

function showToast(text, ms = 1800) {
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
}

function updateLives() {
  const el = $("lives-display");
  el.textContent = "\u2665 " + state.lives;
  el.style.color = state.lives <= 5 ? "#ff4444" : "#ff8866";
}

function updateWaveUI() {
  const waveBtn = $("wave-btn");
  const waveStatus = $("wave-status");
  const waveName = $("wave-name");
  const enemiesLeftEl = $("enemies-left");
  const hudCenter = $("hud-center");

  if (state.gameOver || state.victory) {
    hudCenter.style.display = "none";
    waveName.style.display = "none";
    return;
  }
  hudCenter.style.display = "";

  if (!state.waveActive && state.wave < WAVES.length) {
    waveBtn.style.display = "";
    waveStatus.style.display = "none";
    waveBtn.textContent = state.wave === 0 ? "\u25B6 Wave 1" : "\u25B6 Wave " + (state.wave + 1);
  } else {
    waveBtn.style.display = "none";
    waveStatus.style.display = "";
    $("wave-num").textContent = "Wave " + state.wave + "/" + WAVES.length;
    if (state.waveActive && state.wave > 0) {
      enemiesLeftEl.style.display = "";
    } else {
      enemiesLeftEl.style.display = "none";
    }
  }

  const currentWave = state.wave > 0 ? WAVES[state.wave - 1] : null;
  if (currentWave && state.waveActive) {
    waveName.style.display = "";
    waveName.textContent = currentWave.name;
  } else {
    waveName.style.display = "none";
  }
}

function updateEnemiesLeft(count) {
  $("enemies-left").textContent = Math.max(0, count) + " left";
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

function selectTower(type) {
  state.selectedTower = type;
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
  $("game-over-wave").textContent = "The temple has been lost. Wave " + state.wave + ".";
  updateWaveUI();
}

function showVictory() {
  $("victory-screen").style.display = "";
  $("victory-stats").textContent = state.towers.length + " towers \u00B7 " + state.gold + " gold left";
  updateWaveUI();
}

function startWave() {
  if (!state || state.waveActive || state.gameOver || state.victory) return;
  if (state.wave >= WAVES.length) return;
  state.wave++; state.waveActive = true; state.spawned = 0; state.spawnTimer = 0.5;
  updateWaveUI();
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
      btn.style.cssText = "width:68px;padding:8px 4px;cursor:pointer;background:rgba(10,9,8,0.85);border:1px solid rgba(138,126,96,0.3);border-radius:10px;color:#d4c8a0;font-family:'Georgia',serif;text-align:center;transition:all 0.15s;-webkit-tap-highlight-color:transparent;";
      btn.innerHTML =
        '<div style="font-size:22px;line-height:1">' + info.icon + '</div>' +
        '<div style="font-size:10px;margin-top:3px;color:' + colorHex + ';font-weight:bold">' + info.name + '</div>' +
        '<div style="font-size:11px;color:#ffcc44;margin-top:2px;font-weight:bold">' + info.cost + 'g</div>';
    } else {
      btn.style.cssText = "padding:8px 14px;cursor:pointer;background:rgba(10,9,8,0.85);border:1px solid rgba(138,126,96,0.3);border-radius:6px;color:#d4c8a0;font-family:'Georgia',serif;transition:all 0.2s;min-width:110px;text-align:center;";
      btn.innerHTML =
        '<div style="font-size:18px;line-height:1">' + info.icon + '</div>' +
        '<div style="font-size:13px;color:' + colorHex + ';font-weight:bold;margin-top:4px">' + info.name + '</div>' +
        '<div style="font-size:10px;opacity:0.5;margin-top:2px">' + info.desc + '</div>' +
        '<div style="font-size:12px;color:#ffcc44;margin-top:4px">' + info.cost + 'g</div>';
    }

    btn.addEventListener("click", () => selectTower(key));
    bar.appendChild(btn);
  });
}

/* ─── INIT 3D GAME ─── */
function init() {
  $("title-screen").style.display = "none";
  $("game-screen").style.display = "";

  const el = $("game-mount");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0908);
  scene.fog = new THREE.FogExp2(0x0a0908, 0.018);

  const camera = new THREE.PerspectiveCamera(55, el.clientWidth / el.clientHeight, 0.1, 200);
  camera.position.set(0, 24, 18);
  camera.lookAt(0, 0, 0);

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

  /* ─── GAME STATE ─── */
  state = {
    towers: [], enemies: [], projectiles: [],
    gold: 150, lives: 20, wave: 0,
    waveActive: false, spawnTimer: 0, spawned: 0, enemiesAlive: 0,
    gameOver: false, victory: false, selectedTower: "fire",
    towerMeshMap: new Map(),
  };

  /* Select the default tower visually */
  selectTower("fire");
  updateGold();

  /* ─── TOWER CREATION ─── */
  function createTower(col, row, type) {
    const info = TOWER_TYPES[type];
    const pos = gridToWorld(col, row);
    const group = new THREE.Group();
    group.position.set(pos.x, 0, pos.z);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.3, 8), darkStoneMat);
    base.position.y = 0.15; base.castShadow = !mobile; group.add(base);

    let body;
    const bodyMat = new THREE.MeshStandardMaterial({ color: info.color, emissive: info.emissive, emissiveIntensity: 0.8, roughness: 0.3, metalness: 0.6 });
    if (type === "fire") body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 1.6, 6), bodyMat);
    else if (type === "ice") { body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.8, 4), bodyMat.clone()); body.material.transparent = true; body.material.opacity = 0.85; body.rotation.y = Math.PI/4; }
    else if (type === "earth") body = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.8, 0.5), bodyMat.clone());
    else body = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.3, 2.0, 3), bodyMat.clone());
    body.position.y = 1.1; body.castShadow = !mobile; group.add(body);

    const orbMat = new THREE.MeshStandardMaterial({ color: info.color, emissive: info.emissive, emissiveIntensity: 2.0, roughness: 0.05, metalness: 0.9, transparent: true, opacity: 0.9 });
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 12), orbMat);
    orb.position.y = 2.2; group.add(orb);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ color: info.color, transparent: true, opacity: 0.3 }));
    glow.scale.set(1.0, 1.0, 1); glow.position.y = 2.2; group.add(glow);

    const light = new THREE.PointLight(info.color, 30, 10);
    light.position.y = 2.2; group.add(light);
    scene.add(group);

    const tower = { group, orb, glow, light, col, row, type, info, cooldown: 0 };
    state.towers.push(tower);
    state.towerMeshMap.set(col + "," + row, tower);
    return tower;
  }

  /* ─── ENEMY CREATION ─── */
  function spawnEnemy(hp, spd, reward) {
    const group = new THREE.Group();
    const startPos = gridToWorld(PATH_POINTS[0][0], PATH_POINTS[0][1]);
    group.position.copy(startPos); group.position.y = 0.4;

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x442233, emissive: 0x331122, emissiveIntensity: 0.5, roughness: 0.4, metalness: 0.6, transparent: true, opacity: 0.85 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), bodyMat);
    body.castShadow = !mobile; group.add(body);

    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff2244, emissive: 0xff1133, emissiveIntensity: 2.0 });
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
    eye1.position.set(-0.1, 0.1, -0.25); group.add(eye1);
    const eye2 = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), eyeMat);
    eye2.position.set(0.1, 0.1, -0.25); group.add(eye2);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x662244, transparent: true, opacity: 0.25 }));
    glow.scale.set(1.2, 1.2, 1); group.add(glow);

    const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.08), new THREE.MeshBasicMaterial({ color: 0x220000, transparent: true, opacity: 0.7 }));
    hpBg.position.y = 0.65; hpBg.rotation.x = -0.3; group.add(hpBg);
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.68, 0.06), new THREE.MeshBasicMaterial({ color: 0xff3344 }));
    hpFill.position.y = 0.65; hpFill.position.z = 0.001; hpFill.rotation.x = -0.3; group.add(hpFill);

    scene.add(group);
    const enemy = { group, body, hpFill, glow, hp, maxHp: hp, speed: spd, reward, pathIndex: 0, pathProgress: 0, slowTimer: 0, alive: true };
    state.enemies.push(enemy);
    state.enemiesAlive++;
    return enemy;
  }

  /* ─── PROJECTILE ─── */
  function fireProjectile(tower, target) {
    const mat = new THREE.MeshStandardMaterial({ color: tower.info.color, emissive: tower.info.emissive, emissiveIntensity: 3, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), mat);
    mesh.position.copy(tower.group.position); mesh.position.y = 2.2;
    scene.add(mesh);
    state.projectiles.push({ mesh, target, tower, speed: 12, damage: tower.info.damage, type: tower.type });
  }

  /* ─── PATH FOLLOWING ─── */
  function moveEnemy(enemy, dt) {
    if (!enemy.alive) return;
    const pts = pathWorldPoints();
    if (enemy.pathIndex >= pts.length - 1) {
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
    if (state.gameOver || state.victory) return;
    const cell = getGridFromXY(clientX, clientY);
    if (!cell) return;
    const { col, row } = cell;
    if (isPathTile(col, row)) { showToast("Can't build on the path"); return; }
    if (state.towerMeshMap.has(col + "," + row)) { showToast("Tile occupied"); return; }
    const info = TOWER_TYPES[state.selectedTower];
    if (state.gold < info.cost) { showToast("Not enough gold!"); return; }
    state.gold -= info.cost; updateGold();
    createTower(col, row, state.selectedTower);
  }

  function showHover(clientX, clientY) {
    const cell = getGridFromXY(clientX, clientY);
    if (!cell || isPathTile(cell.col, cell.row) || state.towerMeshMap.has(cell.col + "," + cell.row)) {
      hoverRing.visible = false; rangeCircle.visible = false; return;
    }
    const pos = gridToWorld(cell.col, cell.row);
    hoverRing.position.x = pos.x; hoverRing.position.z = pos.z; hoverRing.visible = true;
    const s = TOWER_TYPES[state.selectedTower].range;
    rangeCircle.position.x = pos.x; rangeCircle.position.z = pos.z;
    rangeCircle.geometry.dispose();
    rangeCircle.geometry = new THREE.RingGeometry(s - 0.05, s, 48);
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

  function onMouseDownAll(e) { onMouseDown(e); onMouseDownPlace(e); }
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

  /* ─── ANIMATION LOOP ─── */
  let time = 0;
  const clock = new THREE.Clock();

  function animate() {
    const rawDt = Math.min(clock.getDelta(), 0.05);
    const dt = rawDt * speed;
    time += rawDt;

    camera.position.x = Math.sin(camAngle) * camDist * 0.5;
    camera.position.z = Math.cos(camAngle) * camDist * 0.5 + 4;
    camera.position.y = camHeight;
    camera.lookAt(0, 0, 0);

    if (!state.gameOver && !state.victory) {
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
        t.orb.position.y = 2.2 + Math.sin(time*2+t.col+t.row)*0.1;
        t.orb.rotation.y = time;
        t.glow.material.opacity = 0.2 + Math.sin(time*3+t.col)*0.1;
        t.light.intensity = 25 + Math.sin(time*4+t.row)*10;
      });

      if (state.waveActive) {
        const waveInfo = WAVES[state.wave - 1];
        if (waveInfo && state.spawned < waveInfo.enemies) {
          state.spawnTimer -= dt;
          if (state.spawnTimer <= 0) {
            spawnEnemy(waveInfo.hp, waveInfo.speed, waveInfo.reward);
            state.spawned++; state.spawnTimer = waveInfo.delay;
            updateEnemiesLeft(waveInfo.enemies - state.spawned + state.enemiesAlive);
          }
        }
        if (state.spawned >= (waveInfo?.enemies || 0) && state.enemiesAlive <= 0) {
          state.waveActive = false; updateWaveUI();
          if (state.wave >= WAVES.length) { state.victory = true; showVictory(); }
          else if (autoWave) {
            setTimeout(() => {
              if (state.gameOver || state.victory) return;
              state.wave++; state.waveActive = true; state.spawned = 0; state.spawnTimer = 0.5;
              updateWaveUI();
            }, 1500);
          }
        }
        updateEnemiesLeft((waveInfo ? waveInfo.enemies - state.spawned : 0) + state.enemiesAlive);
      }

      state.enemies.forEach(e => moveEnemy(e, dt));
      state.enemies.forEach(e => {
        if (!e.alive) return;
        e.body.position.y = Math.sin(time*4+e.pathProgress*10)*0.05;
        e.glow.material.opacity = 0.2 + Math.sin(time*3)*0.08;
        e.body.material.emissive.setHex(e.slowTimer > 0 ? 0x2244aa : 0x331122);
      });

      state.towers.forEach(t => {
        t.cooldown -= dt; if (t.cooldown > 0) return;
        const tPos = new THREE.Vector3(t.group.position.x, 0, t.group.position.z);
        let closest = null, closestDist = t.info.range;
        state.enemies.forEach(e => {
          if (!e.alive) return;
          const d = tPos.distanceTo(new THREE.Vector3(e.group.position.x, 0, e.group.position.z));
          if (d < closestDist) { closestDist = d; closest = e; }
        });
        if (closest) { fireProjectile(t, closest); t.cooldown = t.info.rate; }
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
            state.enemies.forEach(e => { if (!e.alive || e === p.target || cc >= 2) return; if (e.group.position.distanceTo(hitPos) < 2.5) { e.hp -= p.damage * 0.5; cc++; } });
          }
          const ratio = Math.max(0, p.target.hp / p.target.maxHp);
          p.target.hpFill.scale.x = ratio;
          p.target.hpFill.position.x = -0.34 * (1 - ratio);
          if (ratio < 0.4) p.target.hpFill.material.color.setHex(0xff8800);
          if (ratio < 0.2) p.target.hpFill.material.color.setHex(0xff0000);
          if (p.target.hp <= 0) {
            p.target.alive = false; scene.remove(p.target.group); state.enemiesAlive--;
            state.gold += p.target.reward; updateGold();
          }
          scene.remove(p.mesh); state.projectiles.splice(i, 1);
        } else { dir.normalize(); p.mesh.position.addScaledVector(dir, p.speed * dt); }
      }

      state.enemies.forEach(e => { if (!e.alive && e.group.parent) scene.remove(e.group); });
      state.enemies = state.enemies.filter(e => e.alive);
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

$("start-btn").addEventListener("click", init);
$("wave-btn").addEventListener("click", startWave);
$("auto-btn").addEventListener("click", () => { autoWave = !autoWave; updateAutoBtn(); });
$("speed-btn").addEventListener("click", () => { speed = speed >= 3 ? 1 : speed + 1; updateSpeedBtn(); });
$("restart-btn").addEventListener("click", () => window.location.reload());
$("replay-btn").addEventListener("click", () => window.location.reload());
