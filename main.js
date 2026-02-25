import * as THREE from "three";
import { TILE, COLS, ROWS, W, H, TOWER_TYPES, SELL_REFUND, PATH_POINTS, WAVES, ENEMY_VISUALS } from "./constants.js";
import { initAudio, resumeAudio, SFX } from "./audio.js";
import { glowTex, floorTex, pathTex } from "./textures.js";
import { gridToWorld, pathWorldPoints, isPathTile, tmpVec3A, tmpVec3B, isMobile, $ } from "./utils.js";
import {
  getWaveInfo, getWavePreview, showToast, updateGold, updateLives, updateWaveUI,
  showGameOver, showVictory, enterEndless, startWave, buildTowerBar, selectTower,
  showTowerPopup, hideTowerPopup, upgradeTower, sellTower,
  speed, autoWave, paused, muted, setSpeed, setAutoWave, setPaused, setMuted,
  updatePauseBtn, updateAutoBtn, updateSpeedBtn, updateMuteBtn,
  getSelectedTower, clearSelectedTower, setStateRef, setRangeCircleRef
} from "./ui.js";

const mobile = isMobile();
let state = null;

/* ─── INIT 3D GAME ─── */
function init() {
  initAudio(); resumeAudio();
  $("title-screen").style.display = "none";
  $("game-screen").style.display = "";

  const el = $("game-mount");

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060504);
  scene.fog = new THREE.FogExp2(0x060504, 0.015);

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
  renderer.toneMappingExposure = 1.8;
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

  /* Path runes — ancient glowing waypoint markers */
  const runeGeo = new THREE.RingGeometry(0.05, 0.12, 6);
  const runeGeo2 = new THREE.RingGeometry(0.18, 0.22, 6);
  const runeMat = new THREE.MeshStandardMaterial({ color: 0x8a7e60, emissive: 0x5a4e30, emissiveIntensity: 0.8, side: THREE.DoubleSide });
  const runeMat2 = new THREE.MeshStandardMaterial({ color: 0x665540, emissive: 0x332a18, emissiveIntensity: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
  pathWorldPoints().forEach((p, i) => {
    const rune = new THREE.Mesh(runeGeo, runeMat);
    rune.rotation.x = -Math.PI / 2; rune.position.set(p.x, 0.02, p.z); scene.add(rune);
    /* Outer decorative ring on every other waypoint */
    if (i % 2 === 0) {
      const rune2 = new THREE.Mesh(runeGeo2, runeMat2);
      rune2.rotation.x = -Math.PI / 2; rune2.position.set(p.x, 0.015, p.z); scene.add(rune2);
    }
  });

  /* Entry & exit portals — dramatic rifts visible from overhead */
  const entryPos = gridToWorld(PATH_POINTS[0][0], PATH_POINTS[0][1]);
  const exitPos = gridToWorld(PATH_POINTS[PATH_POINTS.length-1][0], PATH_POINTS[PATH_POINTS.length-1][1]);
  const portalGeo = new THREE.TorusGeometry(0.85, 0.14, 10, 32);
  const portalInnerGeo = new THREE.TorusGeometry(0.65, 0.06, 8, 32);

  /* Entry portal — ominous red rift */
  const entryPortal = new THREE.Mesh(portalGeo, new THREE.MeshStandardMaterial({ color: 0xff4444, emissive: 0xff2222, emissiveIntensity: 3.0, transparent: true, opacity: 0.85 }));
  entryPortal.rotation.x = -Math.PI / 2; entryPortal.position.set(entryPos.x, 0.3, entryPos.z); scene.add(entryPortal);
  const entryRing2 = new THREE.Mesh(portalInnerGeo, new THREE.MeshStandardMaterial({ color: 0xff8844, emissive: 0xff4400, emissiveIntensity: 4.0, transparent: true, opacity: 0.6 }));
  entryRing2.rotation.x = -Math.PI / 2; entryRing2.position.set(entryPos.x, 0.4, entryPos.z); scene.add(entryRing2);
  const portalDiscGeo = new THREE.CircleGeometry(0.65, 32);
  const entryDisc = new THREE.Mesh(portalDiscGeo, new THREE.MeshBasicMaterial({ color: 0xff2200, transparent: true, opacity: 0.3, side: THREE.DoubleSide }));
  entryDisc.rotation.x = -Math.PI / 2; entryDisc.position.set(entryPos.x, 0.28, entryPos.z); scene.add(entryDisc);
  /* Large glow sprite — most visible element from overhead */
  const entrySprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0xff3300, transparent: true, opacity: 0.6 }));
  entrySprite.scale.set(4.0, 4.0, 1); entrySprite.position.set(entryPos.x, 0.8, entryPos.z); scene.add(entrySprite);
  const entryLight = new THREE.PointLight(0xff4444, 160, 18); entryLight.position.set(entryPos.x, 2.5, entryPos.z); scene.add(entryLight);
  const entryGlow = new THREE.PointLight(0xff2200, 70, 8); entryGlow.position.set(entryPos.x, 0.3, entryPos.z); scene.add(entryGlow);

  /* Exit portal — eerie green */
  const exitPortal = new THREE.Mesh(portalGeo, new THREE.MeshStandardMaterial({ color: 0x44ff44, emissive: 0x22dd22, emissiveIntensity: 3.0, transparent: true, opacity: 0.85 }));
  exitPortal.rotation.x = -Math.PI / 2; exitPortal.position.set(exitPos.x, 0.3, exitPos.z); scene.add(exitPortal);
  const exitRing2 = new THREE.Mesh(portalInnerGeo, new THREE.MeshStandardMaterial({ color: 0x88ffaa, emissive: 0x44dd66, emissiveIntensity: 4.0, transparent: true, opacity: 0.6 }));
  exitRing2.rotation.x = -Math.PI / 2; exitRing2.position.set(exitPos.x, 0.4, exitPos.z); scene.add(exitRing2);
  const exitDisc = new THREE.Mesh(portalDiscGeo, new THREE.MeshBasicMaterial({ color: 0x22ff44, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
  exitDisc.rotation.x = -Math.PI / 2; exitDisc.position.set(exitPos.x, 0.28, exitPos.z); scene.add(exitDisc);
  const exitSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0x22dd44, transparent: true, opacity: 0.5 }));
  exitSprite.scale.set(3.5, 3.5, 1); exitSprite.position.set(exitPos.x, 0.8, exitPos.z); scene.add(exitSprite);
  const exitLight = new THREE.PointLight(0x44ff44, 140, 18); exitLight.position.set(exitPos.x, 2.5, exitPos.z); scene.add(exitLight);
  const exitGlow = new THREE.PointLight(0x22dd22, 60, 8); exitGlow.position.set(exitPos.x, 0.3, exitPos.z); scene.add(exitGlow);

  /* ─── PATH RUNE LIGHTS — warm glow along the path bends ─── */
  const runeLights = [];
  pathWorldPoints().forEach((p, i) => {
    if (i % 2 !== 0) return;
    const rl = new THREE.PointLight(0x886633, 18, 5.5);
    rl.position.set(p.x, 0.6, p.z); scene.add(rl);
    runeLights.push(rl);
  });

  /* Lighting — lost chamber atmosphere */
  scene.add(new THREE.AmbientLight(0x1a1510, 2.0));
  const dirLight = new THREE.DirectionalLight(0x332211, 1.5);
  dirLight.position.set(-5, 12, -3); scene.add(dirLight);
  const fillLight = new THREE.HemisphereLight(0x111018, 0x0a0908, 0.6);
  scene.add(fillLight);
  const torchData = [[-W/2+1,4,-H/2+1],[W/2-1,4,-H/2+1],[-W/2+1,4,H/2-1],[W/2-1,4,H/2-1],[0,5,0],[-W/4,4.5,0],[W/4,4.5,0],[0,4.5,-H/4],[0,4.5,H/4]];
  const torchLights = [];
  const torchFlames = []; /* visible flame meshes */
  const flameGeo = new THREE.SphereGeometry(0.12, 6, 6);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8833, transparent: true, opacity: 0.7 });
  const flameCoreMat = new THREE.MeshBasicMaterial({ color: 0xffdd88, transparent: true, opacity: 0.9 });
  const flameCoreGeo = new THREE.SphereGeometry(0.06, 4, 4);

  torchData.forEach(([x,y,z], i) => {
    const tl = new THREE.PointLight(0xff8844, i===4?120:60, 40);
    tl.position.set(x,y,z);
    if (!mobile && i < 2) { tl.castShadow = true; tl.shadow.mapSize.width = 512; tl.shadow.mapSize.height = 512; }
    scene.add(tl); torchLights.push(tl);
    if (i < 4) {
      const sconce = new THREE.Mesh(new THREE.CylinderGeometry(0.1,0.15,0.4,8), darkStoneMat);
      sconce.position.set(x,y-0.8,z); scene.add(sconce);
      /* Visible flame on sconce */
      const flame = new THREE.Mesh(flameGeo, flameMat.clone());
      flame.position.set(x, y - 0.35, z); scene.add(flame);
      const core = new THREE.Mesh(flameCoreGeo, flameCoreMat.clone());
      core.position.set(x, y - 0.3, z); scene.add(core);
      torchFlames.push({ flame, core, baseY: y - 0.35 });
    }
  });

  /* Dust particles — ancient chamber atmosphere */
  const dustCount = mobile ? 200 : 500;
  const dustGeo = new THREE.BufferGeometry();
  const dustPos = new Float32Array(dustCount * 3);
  const dustVel = new Float32Array(dustCount * 3);
  const dustColors = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i++) {
    dustPos[i*3] = (Math.random()-0.5)*W; dustPos[i*3+1] = Math.random()*8; dustPos[i*3+2] = (Math.random()-0.5)*H;
    dustVel[i*3] = (Math.random()-0.5)*0.004; dustVel[i*3+1] = (Math.random()-0.5)*0.003; dustVel[i*3+2] = (Math.random()-0.5)*0.004;
    /* Warm dust tones — aged gold to pale amber */
    const warmth = 0.6 + Math.random() * 0.4;
    dustColors[i*3] = 0.8 * warmth; dustColors[i*3+1] = 0.65 * warmth; dustColors[i*3+2] = 0.45 * warmth;
  }
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("color", new THREE.BufferAttribute(dustColors, 3));
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ size: 0.08, vertexColors: true, transparent: true, opacity: 0.4, sizeAttenuation: true })));

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
  setRangeCircleRef(rangeCircle);

  /* Cache range circle geometries to avoid per-mousemove allocation */
  const rangeGeoCache = {};
  let currentRangeKey = "3.4";
  function setRangeCircleRange(range) {
    const key = range.toFixed(2);
    if (key === currentRangeKey) return;
    if (!rangeGeoCache[key]) rangeGeoCache[key] = new THREE.RingGeometry(range - 0.05, range, 48);
    rangeCircle.geometry = rangeGeoCache[key];
    currentRangeKey = key;
  }

  /* ─── WIRE POPUP BUTTONS ─── */
  const tpEl = $("tower-popup");
  tpEl.addEventListener("touchstart", (e) => e.stopPropagation(), { passive: false });
  tpEl.addEventListener("touchend", (e) => e.stopPropagation(), { passive: false });
  tpEl.addEventListener("mousedown", (e) => e.stopPropagation());
  $("tp-upgrade").addEventListener("click", (e) => { e.stopPropagation(); upgradeTower(rangeCircle, setRangeCircleRange, state); });
  $("tp-sell").addEventListener("click", (e) => { e.stopPropagation(); sellTower(rangeCircle, state, scene); });
  $("tp-close").addEventListener("click", (e) => { e.stopPropagation(); hideTowerPopup(rangeCircle); });

  /* ─── GAME STATE ─── */
  state = {
    towers: [], enemies: [], projectiles: [],
    gold: 150, lives: 20, wave: 0,
    waveActive: false, spawnTimer: 0, spawned: 0, enemiesAlive: 0,
    gameOver: false, victory: false, endless: false, currentWaveInfo: null, selectedTower: "fire",
    stats: { kills: 0, goldEarned: 0, towersBuilt: 0, upgrades: 0 },
    towerMeshMap: new Map(),
  };

  /* Wire up UI state reference */
  setStateRef(state);

  /* Select the default tower visually */
  selectTower(state, "fire");
  updateGold(state);
  updateWaveUI(state);

  /* Auto-start wave 1 if auto mode is on */
  if (autoWave) {
    setTimeout(() => { if (!state.gameOver && !state.victory) startWave(state); }, 1500);
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
  const enemyHpBgGeo = new THREE.PlaneGeometry(0.7, 0.12);
  const enemyHpFillGeo = new THREE.PlaneGeometry(0.68, 0.09);
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
    state.towers.push(tower); state.stats.towersBuilt++;
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
      state.lives = Math.max(0, state.lives - 1); updateLives(state);
      if (state.lives <= 0 && !state.gameOver) { state.gameOver = true; showGameOver(state); }
      return;
    }
    const speedMod = enemy.slowTimer > 0 ? 0.6 : 1;
    if (enemy.slowTimer > 0) enemy.slowTimer -= dt;
    let remaining = enemy.speed * speedMod * dt;
    while (remaining > 0 && enemy.pathIndex < pts.length - 1) {
      const from = pts[enemy.pathIndex], to = pts[enemy.pathIndex + 1];
      const dist = from.distanceTo(to);
      const needed = (1 - enemy.pathProgress) * dist;
      if (remaining >= needed) {
        remaining -= needed;
        enemy.pathProgress = 0;
        enemy.pathIndex++;
      } else {
        enemy.pathProgress += remaining / dist;
        remaining = 0;
      }
    }
    if (enemy.pathIndex < pts.length - 1) {
      const a = pts[enemy.pathIndex], b = pts[enemy.pathIndex + 1];
      enemy.group.position.x = a.x + (b.x - a.x) * enemy.pathProgress;
      enemy.group.position.z = a.z + (b.z - a.z) * enemy.pathProgress;
      tmpVec3A.subVectors(b, a).normalize();
      enemy.group.lookAt(enemy.group.position.x + tmpVec3A.x, 0.4, enemy.group.position.z + tmpVec3A.z);
    }
  }

  /* ─── RAYCASTING ─── */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  const _hitVec = new THREE.Vector3();
  function getGridFromXY(clientX, clientY) {
    const rect = el.getBoundingClientRect();
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(groundPlane, _hitVec);
    if (!_hitVec) return null;
    const col = Math.floor((_hitVec.x + W / 2) / TILE);
    const row = Math.floor((_hitVec.z + H / 2) / TILE);
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
      if (getSelectedTower() === existing) hideTowerPopup(rangeCircle);
      else showTowerPopup(existing, rangeCircle, setRangeCircleRange, state);
      return;
    }
    if (getSelectedTower()) hideTowerPopup(rangeCircle);
    if (isPathTile(col, row)) { showToast("Can't build on the path"); return; }
    const info = TOWER_TYPES[state.selectedTower];
    if (state.gold < info.cost) { showToast("Not enough gold!"); return; }
    state.gold -= info.cost; updateGold(state);
    createTower(col, row, state.selectedTower);
    SFX.towerPlace();
  }

  function showHover(clientX, clientY) {
    if (getSelectedTower()) return;
    const cell = getGridFromXY(clientX, clientY);
    if (!cell) { hoverRing.visible = false; rangeCircle.visible = false; return; }
    const existing = state.towerMeshMap.get(cell.col + "," + cell.row);
    if (existing) {
      hoverRing.visible = false;
      const pos = existing.group.position;
      rangeCircle.position.x = pos.x; rangeCircle.position.z = pos.z;
      setRangeCircleRange(existing.range);
      rangeCircle.visible = true; return;
    }
    if (isPathTile(cell.col, cell.row)) { hoverRing.visible = false; rangeCircle.visible = false; return; }
    const pos = gridToWorld(cell.col, cell.row);
    hoverRing.position.x = pos.x; hoverRing.position.z = pos.z; hoverRing.visible = true;
    const s = TOWER_TYPES[state.selectedTower].range;
    rangeCircle.position.x = pos.x; rangeCircle.position.z = pos.z;
    setRangeCircleRange(s);
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
  const MAX_PARTICLES = mobile ? 250 : 700;
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
  /* Impact burst when projectile hits — element-colored sparks + faint smoke */
  function spawnHitVFX(x, y, z, towerType) {
    const color = TOWER_TYPES[towerType]?.color || 0xffffff;
    const count = mobile ? 4 : 8;
    emitParticles(x, y, z, color, count, 1.0, 2.5, 0.3);
    /* Faint dark smoke wisp */
    if (!mobile) emitParticles(x, y + 0.1, z, 0x221100, 2, 0.4, 0.6, 0.6);
  }

  /* Death explosion — larger, more dramatic with secondary ember ring */
  function spawnDeathVFX(x, y, z, enemyType) {
    const vis = ENEMY_VISUALS[enemyType];
    const color = vis ? vis.bodyColor : 0xff4444;
    const glowColor = vis ? vis.glowColor : 0xff8844;
    const count = mobile ? 8 : 18;
    emitParticles(x, y, z, color, count, 1.5, 3.5, 0.5);
    /* White core flash */
    emitParticles(x, y, z, 0xffffff, mobile ? 3 : 6, 0.5, 1.5, 0.2);
    /* Secondary glow-colored ember ring */
    if (!mobile) emitParticles(x, y, z, glowColor, 6, 2.0, 2.0, 0.7);
    /* Upward soul wisp */
    emitParticles(x, y + 0.2, z, 0x886644, mobile ? 2 : 4, 0.2, 1.8, 0.9);
  }

  /* Muzzle flash on tower orb — brighter, with secondary glow */
  function spawnMuzzleFlash(tower) {
    const color = tower.info.color;
    const pos = tower.group.position;
    const orbY = tower.orbBaseY || 2.2;
    emitParticles(pos.x, orbY, pos.z, color, mobile ? 2 : 5, 0.5, 1.8, 0.15);
    if (!mobile) emitParticles(pos.x, orbY, pos.z, 0xffffff, 1, 0.2, 1.0, 0.08);
  }

  /* Enemy leak flash at exit — more dramatic warning */
  function spawnLeakVFX(x, y, z) {
    emitParticles(x, y, z, 0xff2222, mobile ? 5 : 12, 1.2, 2.0, 0.4);
    emitParticles(x, y, z, 0xff8800, mobile ? 3 : 6, 0.8, 3.0, 0.3);
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
        const base = i === 4 ? 140 : (i >= 5 ? 80 : 70);
        tl.intensity = base + Math.sin(time*8+i*3)*18 + Math.sin(time*13+i)*12;
        /* Color temperature shift — warmer/cooler flicker */
        if (i < 4) {
          const warmth = 0.5 + Math.sin(time * 6 + i * 2) * 0.2;
          tl.color.setRGB(1.0, 0.5 + warmth * 0.2, 0.2 + warmth * 0.1);
        }
      });

      /* Animate visible flames */
      torchFlames.forEach((tf, i) => {
        const flicker = Math.sin(time * 12 + i * 4) * 0.03 + Math.sin(time * 18 + i * 7) * 0.02;
        tf.flame.position.y = tf.baseY + flicker;
        tf.flame.scale.set(1 + Math.sin(time * 10 + i) * 0.15, 1.1 + Math.sin(time * 14 + i) * 0.25, 1 + Math.sin(time * 10 + i) * 0.15);
        tf.flame.material.opacity = 0.55 + Math.sin(time * 11 + i * 3) * 0.15;
        tf.core.position.y = tf.baseY + 0.05 + flicker;
        tf.core.scale.setScalar(0.8 + Math.sin(time * 16 + i) * 0.2);
      });

      /* Portal animations — rotate rings counter to each other, pulse glow */
      entryPortal.rotation.z = time * 0.5;
      entryRing2.rotation.z = -time * 0.8;
      entryDisc.material.opacity = 0.12 + Math.sin(time * 2.5) * 0.05;
      exitPortal.rotation.z = -time * 0.5;
      exitRing2.rotation.z = time * 0.8;
      exitDisc.material.opacity = 0.10 + Math.sin(time * 2.5 + 1) * 0.04;

      entryLight.intensity = 140 + Math.sin(time*3)*40;
      exitLight.intensity = 120 + Math.sin(time*3+1)*35;
      entryGlow.intensity = 55 + Math.sin(time * 4) * 25;
      exitGlow.intensity = 45 + Math.sin(time * 4 + 1) * 20;

      /* Portal sprite breathing */
      const entryPulse = 3.6 + Math.sin(time * 2) * 0.5;
      entrySprite.scale.set(entryPulse, entryPulse, 1);
      entrySprite.material.opacity = 0.5 + Math.sin(time * 2.5) * 0.15;
      const exitPulse = 3.2 + Math.sin(time * 2 + 1) * 0.4;
      exitSprite.scale.set(exitPulse, exitPulse, 1);
      exitSprite.material.opacity = 0.4 + Math.sin(time * 2.5 + 1) * 0.12;

      /* Rune path lights — slow ancient pulse */
      runeLights.forEach((rl, i) => {
        rl.intensity = 14 + Math.sin(time * 1.5 + i * 1.8) * 8;
      });

      /* Portal ambient particles — wisps rising from portals */
      if (Math.random() < 0.25) {
        emitParticles(entryPos.x + (Math.random() - 0.5) * 0.9, 0.3, entryPos.z + (Math.random() - 0.5) * 0.9,
          0xff3311, mobile ? 1 : 2, 0.4, 1.2, 1.5);
      }
      if (Math.random() < 0.18) {
        emitParticles(exitPos.x + (Math.random() - 0.5) * 0.9, 0.3, exitPos.z + (Math.random() - 0.5) * 0.9,
          0x33ff55, mobile ? 1 : 2, 0.4, 1.0, 1.3);
      }

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
        t.glow.material.opacity = 0.3 + Math.sin(time*3+t.col)*0.15;
        t.glow.position.y = t.orb.position.y;
        t.glow.scale.set(1.3 + Math.sin(time*2.5+t.row)*0.2, 1.3 + Math.sin(time*2.5+t.row)*0.2, 1);
        if (t.light) { t.light.intensity = 35 + Math.sin(time*4+t.row)*15; t.light.position.y = t.orb.position.y; }
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
          state.waveActive = false; state.currentWaveInfo = null; updateWaveUI(state);
          if (!state.endless && state.wave >= WAVES.length) {
            state.victory = true; showVictory(state);
          } else {
            const next = getWavePreview(state.wave + 1);
            showToast("Next: " + next.breakdown, 3500);
            if (autoWave) {
              setTimeout(() => {
                if (state.gameOver || (state.victory && !state.endless)) return;
                startWave(state);
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
        tmpVec3A.set(t.group.position.x, 0, t.group.position.z);
        let closest = null, closestDist = t.range;
        state.enemies.forEach(e => {
          if (!e.alive) return;
          tmpVec3B.set(e.group.position.x, 0, e.group.position.z);
          const d = tmpVec3A.distanceTo(tmpVec3B);
          if (d < closestDist) { closestDist = d; closest = e; }
        });
        if (closest) { fireProjectile(t, closest); t.cooldown = t.rate; }
      });

      for (let i = state.projectiles.length - 1; i >= 0; i--) {
        const p = state.projectiles[i];
        if (!p.target.alive) { scene.remove(p.mesh); state.projectiles.splice(i, 1); continue; }
        tmpVec3A.subVectors(p.target.group.position, p.mesh.position);
        if (tmpVec3A.length() < 0.3) {
          p.target.hp -= p.damage;
          if (p.type === "ice") p.target.slowTimer = 2.0;
          if (p.type === "arcane") {
            let cc = 0;
            tmpVec3B.copy(p.target.group.position);
            state.enemies.forEach(e => {
              if (!e.alive || e === p.target || cc >= 2) return;
              if (e.group.position.distanceTo(tmpVec3B) < 2.5) {
                e.hp -= p.damage * 0.5; flashEnemyDamage(e); cc++;
                if (e.hp <= 0 && e.alive) {
                  spawnDeathVFX(e.group.position.x, e.group.position.y, e.group.position.z, e.type);
                  SFX.enemyDeath();
                  e.alive = false; scene.remove(e.group); state.enemiesAlive--;
                  const r1 = Math.floor(e.reward * 0.95);
                  state.gold += r1; state.stats.kills++; state.stats.goldEarned += r1; updateGold(state);
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
            const r2 = Math.floor(p.target.reward * 0.95);
            state.gold += r2; state.stats.kills++; state.stats.goldEarned += r2; updateGold(state);
          }
          scene.remove(p.mesh); state.projectiles.splice(i, 1);
        } else { tmpVec3A.normalize(); p.mesh.position.addScaledVector(tmpVec3A, p.speed * dt); }
      }

      /* Clean up dead enemies */
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
$("wave-info").addEventListener("click", () => { resumeAudio(); if (state) startWave(state); });
$("auto-btn").addEventListener("click", () => { resumeAudio(); SFX.uiClick(); setAutoWave(!autoWave); updateAutoBtn(); });
$("speed-btn").addEventListener("click", () => { resumeAudio(); SFX.uiClick(); setSpeed(speed >= 3 ? 1 : speed + 1); updateSpeedBtn(); });
$("pause-btn").addEventListener("click", () => { resumeAudio(); SFX.uiClick(); setPaused(!paused); updatePauseBtn(); });
$("mute-btn").addEventListener("click", () => { setMuted(!muted); updateMuteBtn(); });
$("restart-btn").addEventListener("click", () => window.location.reload());
$("endless-btn").addEventListener("click", () => { resumeAudio(); if (state) enterEndless(state); });