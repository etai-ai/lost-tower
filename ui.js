import { TOWER_TYPES, SELL_REFUND, WAVES, ENEMY_VISUALS, ENDLESS_NAMES, ENDLESS_BOSS_NAMES } from "./constants.js";
import { $, isMobile } from "./utils.js";
import { SFX, setMasterVolume } from "./audio.js";

/* ─── UI STATE ─── */
export let speed = 1;
export let autoWave = true;
export let paused = false;
export let muted = false;
let toastTimer = null;
let selectedTowerObj = null;
let _stateRef = null;
let _rangeCircleRef = null;
export function setStateRef(s) { _stateRef = s; }
export function setRangeCircleRef(rc) { _rangeCircleRef = rc; }

export function setSpeed(value) { speed = value; }
export function setAutoWave(value) { autoWave = value; }
export function setPaused(value) { paused = value; }
export function setMuted(value) { muted = value; }
export function getSelectedTower() { return selectedTowerObj; }
export function clearSelectedTower() { selectedTowerObj = null; }

/* ─── WAVE GENERATION ─── */
export function generateEndlessWave(waveNum) {
  const n = waveNum - WAVES.length;
  const isBoss = n % 5 === 0;
  const isMega = n % 10 === 0;

  const hpScale = Math.pow(1.22, n);
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

export function buildSpawnList(waveDef) {
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

export function getWaveInfo(waveNum) {
  const raw = waveNum <= WAVES.length ? WAVES[waveNum - 1] : generateEndlessWave(waveNum);
  const spawnList = buildSpawnList(raw);
  return { name: raw.name, groups: raw.groups, spawnList, enemies: spawnList.length };
}

export function getWavePreview(waveNum) {
  const raw = waveNum <= WAVES.length ? WAVES[waveNum - 1] : generateEndlessWave(waveNum);
  let total = 0;
  const mobCounts = {};
  for (const g of raw.groups) {
    total += g.count;
    mobCounts[g.type] = (mobCounts[g.type] || 0) + g.count;
  }
  const breakdown = Object.entries(mobCounts)
    .map(([t, c]) => c + "\u00D7 " + t[0].toUpperCase() + t.slice(1))
    .join(", ");
  return { name: raw.name, enemies: total, breakdown };
}

/* ─── DOM HELPERS ─── */
export function showToast(text, ms = 2800) {
  const el = $("toast");
  el.textContent = text;
  el.style.display = "";
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.display = "none"; }, ms);
}

export function updateGold(state) {
  $("gold-display").textContent = "⭐ " + state.gold;
  document.querySelectorAll(".tower-btn").forEach(btn => {
    const info = TOWER_TYPES[btn.dataset.type];
    btn.style.opacity = state.gold >= info.cost ? "1" : (isMobile() ? "0.35" : "0.5");
  });
  if (selectedTowerObj) {
    const t = selectedTowerObj;
    const maxLvl = 1 + t.info.upgrades.length;
    if (t.level < maxLvl) $("tp-upgrade").disabled = state.gold < t.info.upgrades[t.level - 1].cost;
  }
}

export function updateLives(state) {
  const el = $("lives-display");
  el.textContent = "♥ " + state.lives;
  el.style.color = state.lives <= 5 ? "#ff4444" : "#ff8866";
}

export function updateWaveUI(state) {
  const el = $("wave-info");
  const hudCenter = $("hud-center");

  if (state.gameOver) { hudCenter.style.display = "none"; return; }
  if (state.victory && !state.endless) { hudCenter.style.display = "none"; return; }
  hudCenter.style.display = "";

  const isEndless = state.endless || state.wave > WAVES.length;
  const prefix = isEndless ? "∞ " : "";

  if (state.waveActive) {
    const cur = getWavePreview(state.wave);
    el.textContent = prefix + "Wave " + state.wave + " — " + cur.name;
    el.style.cursor = "default"; el.style.opacity = "0.8";
  } else {
    const nextNum = state.wave + 1;
    if (!state.endless && state.wave >= WAVES.length) {
      el.textContent = "All waves complete"; el.style.cursor = "default"; el.style.opacity = "0.8";
    } else {
      const next = getWavePreview(nextNum);
      el.textContent = "▶ " + prefix + "Wave " + nextNum + " — " + next.name;
      el.style.cursor = "pointer"; el.style.opacity = "1";
    }
  }
}

export function updatePauseBtn() {
  const btn = $("pause-btn");
  btn.textContent = paused ? "▶" : "⏸";
  btn.style.background = paused ? "rgba(255,100,100,0.25)" : "rgba(138,126,96,0.1)";
  btn.style.borderColor = paused ? "rgba(255,100,100,0.5)" : "rgba(138,126,96,0.25)";
  btn.style.color = paused ? "#ff8866" : "#8a7e60";
}

export function updateAutoBtn() {
  const btn = $("auto-btn");
  btn.textContent = autoWave ? "AUTO" : "MANUAL";
  btn.style.background = autoWave ? "rgba(100,180,100,0.2)" : "rgba(138,126,96,0.15)";
  btn.style.borderColor = autoWave ? "rgba(100,200,100,0.5)" : "rgba(138,126,96,0.3)";
  btn.style.color = autoWave ? "#88cc88" : "#8a7e60";
}

export function updateSpeedBtn() {
  const btn = $("speed-btn");
  btn.textContent = speed + "x";
  btn.style.background = speed > 1 ? "rgba(255,204,68,0.25)" : "rgba(138,126,96,0.1)";
  btn.style.borderColor = speed > 1 ? "rgba(255,204,68,0.6)" : "rgba(138,126,96,0.25)";
  btn.style.color = speed > 1 ? "#ffcc44" : "#8a7e60";
}

export function updateMuteBtn() {
  const btn = $("mute-btn");
  btn.textContent = muted ? "🔇" : "🔊";
  btn.style.background = muted ? "rgba(200,100,100,0.2)" : "rgba(138,126,96,0.1)";
  btn.style.borderColor = muted ? "rgba(200,100,100,0.4)" : "rgba(138,126,96,0.25)";
  btn.style.color = muted ? "#dd8888" : "#8a7e60";
  setMasterVolume(muted ? 0 : 0.4);
}

export function selectTower(state, type) {
  if (state) state.selectedTower = type;
  if (selectedTowerObj) hideTowerPopup(_rangeCircleRef);
  document.querySelectorAll(".tower-btn").forEach(btn => {
    const sel = btn.dataset.type === type;
    if (isMobile()) {
      btn.style.background = sel ? "rgba(138,126,96,0.45)" : "rgba(10,9,8,0.85)";
      btn.style.border = sel ? "2px solid rgba(212,200,160,0.8)" : "1px solid rgba(138,126,96,0.3)";
    } else {
      btn.style.background = sel ? "rgba(138,126,96,0.35)" : "rgba(10,9,8,0.85)";
      btn.style.border = sel ? "1px solid rgba(212,200,160,0.6)" : "1px solid rgba(138,126,96,0.3)";
    }
  });
}

export function showGameOver(state) {
  $("game-over").style.display = "";
  const s = state.stats;
  if (state.endless) {
    $("game-over-wave").textContent = "Endless Wave " + state.wave + " reached";
    $("game-over-stats").innerHTML =
      s.kills + " kills · " + s.goldEarned + " gold earned<br>" +
      s.towersBuilt + " towers built · " + s.upgrades + " upgrades<br>" +
      state.towers.length + " towers standing · " + state.gold + " gold left";
  } else {
    $("game-over-wave").textContent = "The temple has been lost. Wave " + state.wave + ".";
    $("game-over-stats").innerHTML = "";
  }
  updateWaveUI(state);
  SFX.gameOver();
}

export function showVictory(state) {
  if (state.endless) return;
  const s = state.stats;
  $("victory-screen").style.display = "";
  $("victory-stats").innerHTML =
    s.kills + " kills · " + s.goldEarned + " gold earned<br>" +
    s.towersBuilt + " towers built · " + s.upgrades + " upgrades · " + state.gold + " gold left";
  $("endless-btn").style.display = "";
  updateWaveUI(state);
  SFX.victory();
}

export function enterEndless(state) {
  $("victory-screen").style.display = "none";
  state.victory = false;
  state.endless = true;
  state.lives = Math.max(state.lives, 10);
  state.gold += 100;
  updateGold(state); updateLives(state); updateWaveUI(state);
  showToast("🌀 Endless Mode — +100g +10♥", 3500);
  if (autoWave) {
    setTimeout(() => { if (!state.gameOver) startWave(state); }, 2000);
  }
}

export function startWave(state) {
  if (!state || state.waveActive || state.gameOver) return;
  if (state.victory && !state.endless) return;
  if (!state.endless && state.wave >= WAVES.length) return;
  state.wave++; state.waveActive = true; state.spawned = 0; state.spawnTimer = 0.5; state.currentWaveInfo = null;
  updateWaveUI(state);
  SFX.waveStart();
}

/* ─── TOWER POPUP ─── */
export function showTowerPopup(tower, rangeCircle, setRangeCircleRange, state) {
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
    statsHtml += '<div class="tp-max">★ MAX ★</div>';
  }
  statsHtml += "Dmg: <strong>" + tower.damage + "</strong>";
  if (nextUpgrade) statsHtml += ' <span class="stat-upgrade">→' + nextUpgrade.damage + '</span>';
  statsHtml += " &middot; " + (tower.damage / tower.rate).toFixed(1) + " dps";
  statsHtml += "<br>Rate: <strong>" + tower.rate.toFixed(2) + "s</strong>";
  if (nextUpgrade) statsHtml += ' <span class="stat-upgrade">→' + nextUpgrade.rate.toFixed(2) + 's</span>';
  statsHtml += "<br>Range: <strong>" + tower.range.toFixed(1) + "</strong>";
  if (nextUpgrade) statsHtml += ' <span class="stat-upgrade">→' + nextUpgrade.range.toFixed(1) + '</span>';
  $("tp-stats").innerHTML = statsHtml;

  const upBtn = $("tp-upgrade");
  if (isMax) {
    upBtn.style.display = "none";
  } else {
    upBtn.textContent = "⚒ " + nextUpgrade.cost + "g";
    upBtn.disabled = state.gold < nextUpgrade.cost;
    upBtn.style.display = "";
  }
  $("tp-sell").textContent = "✖ " + Math.floor(tower.totalInvested * SELL_REFUND) + "g";
  popup.style.display = ""; popup.style.left = "50%"; popup.style.bottom = isMobile() ? "90px" : "130px"; popup.style.top = "auto"; popup.style.transform = "translateX(-50%)";
  if (rangeCircle) {
    const pos = tower.group.position;
    rangeCircle.position.x = pos.x; rangeCircle.position.z = pos.z;
    setRangeCircleRange(tower.range);
    rangeCircle.visible = true;
  }
}

export function hideTowerPopup(rangeCircle) {
  $("tower-popup").style.display = "none";
  selectedTowerObj = null;
  if (rangeCircle) rangeCircle.visible = false;
}

export function upgradeTower(rangeCircle, setRangeCircleRange, state) {
  if (!selectedTowerObj || !state) return;
  const tower = selectedTowerObj, info = tower.info, lvl = tower.level;
  if (lvl >= 1 + info.upgrades.length) return;
  const upgrade = info.upgrades[lvl - 1];
  if (state.gold < upgrade.cost) { showToast("Not enough gold!"); return; }
  state.gold -= upgrade.cost; tower.totalInvested += upgrade.cost; tower.level = lvl + 1; state.stats.upgrades++;
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
  updateGold(state); SFX.towerUpgrade();
  showTowerPopup(tower, rangeCircle, setRangeCircleRange, state);
}

export function sellTower(rangeCircle, state, scene) {
  if (!selectedTowerObj || !state) return;
  const tower = selectedTowerObj;
  const sellValue = Math.floor(tower.totalInvested * SELL_REFUND);
  state.gold += sellValue;
  if (tower.group.parent) tower.group.parent.remove(tower.group);
  if (tower.light) { tower.light.intensity = 0; tower.light.position.set(0, -100, 0); }
  const idx = state.towers.indexOf(tower);
  if (idx !== -1) state.towers.splice(idx, 1);
  state.towerMeshMap.delete(tower.col + "," + tower.row);
  updateGold(state); SFX.towerSell(); hideTowerPopup(rangeCircle);
  showToast("Sold for " + sellValue + "g");
}

export function buildTowerBar() {
  const bar = $("tower-bar");
  Object.entries(TOWER_TYPES).forEach(([key, info]) => {
    const btn = document.createElement("button");
    btn.className = "tower-btn";
    btn.dataset.type = key;
    const colorHex = "#" + info.color.toString(16).padStart(6, "0");

    if (isMobile()) {
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

    btn.addEventListener("click", () => selectTower(_stateRef, key));
    bar.appendChild(btn);
  });
}
