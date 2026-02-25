/* ─── GAME CONSTANTS ─── */
export const TILE = 1.4;
export const COLS = 20, ROWS = 14;
export const W = COLS * TILE, H = ROWS * TILE;

export const TOWER_TYPES = {
  fire:   { cost: 30, range: 3.5, damage: 12, rate: 0.9,  color: 0xff6644, emissive: 0xff4422, name: "Fire",   icon: "🔥", desc: "Fast, moderate dmg",
    upgrades: [ { cost: 25, damage: 18, rate: 0.85, range: 3.8 }, { cost: 45, damage: 28, rate: 0.75, range: 4.2 } ] },
  ice:    { cost: 40, range: 4.0, damage: 8,  rate: 1.2,  color: 0x44aaff, emissive: 0x2288dd, name: "Frost",  icon: "❄️", desc: "Slows enemies 40%",
    upgrades: [ { cost: 30, damage: 12, rate: 1.1, range: 4.5 }, { cost: 55, damage: 18, rate: 1.0, range: 5.0 } ] },
  earth:  { cost: 50, range: 3.0, damage: 25, rate: 1.8,  color: 0x66ff88, emissive: 0x44cc66, name: "Earth",  icon: "🪨", desc: "Heavy dmg, slow",
    upgrades: [ { cost: 35, damage: 40, rate: 1.6, range: 3.3 }, { cost: 65, damage: 65, rate: 1.4, range: 3.6 } ] },
  arcane: { cost: 70, range: 5.0, damage: 18, rate: 1.0,  color: 0xffcc44, emissive: 0xddaa22, name: "Arcane", icon: "✨", desc: "Long range, chains",
    upgrades: [ { cost: 50, damage: 28, rate: 0.9, range: 5.5 }, { cost: 85, damage: 42, rate: 0.8, range: 6.0 } ] },
};

export const SELL_REFUND = 0.65;

export const PATH_POINTS = [
  [0,1],  [4,1],  [4,4],  [1,4],  [1,7],
  [6,7],  [6,2],  [9,2],  [9,7],  [9,10],
  [3,10], [3,12], [10,12],[10,9], [14,9],
  [14,5], [11,5], [11,2], [14,2], [17,2],
  [17,6], [14,6], [14,11],[17,11],[17,8],
  [19,8],
];

/*
 * WAVE DEFINITIONS
 * Each wave has: name, groups[]
 * Each group: { type, count, hp, reward, delay }
 *   type   – enemy key from ENEMY_VISUALS (shade, wraith, golem, knight, etc.)
 *   count  – number of enemies in this group
 *   hp     – hit-points per enemy
 *   reward – gold earned per kill
 *   delay  – seconds between spawns within this group
 *
 * Groups spawn sequentially: all of group[0], then group[1], etc.
 * Speed comes from ENEMY_VISUALS[type].baseSpeed (not stored here).
 *
 * Difficulty curve:
 *   Waves 1-2  – gentle intro, single enemy type
 *   Wave 3     – ramp begins (more count, more hp, tighter delays)
 *   Waves 4-7  – mixed compositions, rising pressure
 *   Wave 8     – guardian wall with swarm/warlord support (28 enemies)
 *   Wave 9     – fast blitz: voidwalkers + spirits + knights (28 enemies)
 *   Wave 10    – multi-phase boss assault: knights → guardians → swarm →
 *                boss (4620 hp) → voidwalkers → spirits (40 enemies)
 */
export const WAVES = [
  /* Wave 1: slow trickle of shades — learn to place towers */
  { name: "Forgotten Shades", groups: [
    { type: "shade", count: 8, hp: 50, reward: 8, delay: 0.9 },
  ]},
  /* Wave 2: slightly faster wraiths — learn targeting */
  { name: "Temple Wraiths", groups: [
    { type: "wraith", count: 10, hp: 65, reward: 9, delay: 0.8 },
  ]},
  /* Wave 3: tanky golems, tighter spacing — difficulty ramp starts */
  { name: "Stone Golems", groups: [
    { type: "golem", count: 14, hp: 92, reward: 9, delay: 0.66 },
  ]},
  /* Wave 4: fast knight core with expendable shade scouts ahead */
  { name: "Shadow Vanguard", groups: [
    { type: "shade", count: 4, hp: 52, reward: 5, delay: 0.44 },
    { type: "knight", count: 9, hp: 144, reward: 11, delay: 0.61 },
  ]},
  /* Wave 5: swarm flood followed by drifting wraith flankers */
  { name: "Cursed Swarm", groups: [
    { type: "swarm", count: 12, hp: 118, reward: 10, delay: 0.39 },
    { type: "wraith", count: 5, hp: 108, reward: 9, delay: 0.58 },
  ]},
  /* Wave 6: warlord column sandwiched between knight charges */
  { name: "Warlord Warband", groups: [
    { type: "knight", count: 5, hp: 124, reward: 9, delay: 0.51 },
    { type: "warlord", count: 9, hp: 196, reward: 13, delay: 0.56 },
    { type: "knight", count: 4, hp: 124, reward: 9, delay: 0.44 },
  ]},
  /* Wave 7: full mixed horde — fast swarm bookends around spirits & wraiths */
  { name: "Spirit Horde", groups: [
    { type: "swarm", count: 7, hp: 98, reward: 8, delay: 0.27 },
    { type: "spirit", count: 9, hp: 180, reward: 12, delay: 0.39 },
    { type: "wraith", count: 5, hp: 144, reward: 10, delay: 0.51 },
    { type: "swarm", count: 6, hp: 98, reward: 8, delay: 0.22 },
  ]},
  /* Wave 8: guardian wall with fast swarm pressure and warlord muscle */
  { name: "Temple Guardians", groups: [
    { type: "swarm", count: 6, hp: 110, reward: 7, delay: 0.2 },
    { type: "warlord", count: 5, hp: 320, reward: 15, delay: 0.6 },
    { type: "guardian", count: 5, hp: 1000, reward: 42, delay: 1.3 },
    { type: "warlord", count: 4, hp: 320, reward: 15, delay: 0.5 },
    { type: "swarm", count: 8, hp: 110, reward: 7, delay: 0.18 },
  ]},
  /* Wave 9: fast rush — voidwalkers and spirits with knight escorts */
  { name: "Void Onslaught", groups: [
    { type: "voidwalker", count: 6, hp: 270, reward: 12, delay: 0.3 },
    { type: "knight", count: 5, hp: 210, reward: 10, delay: 0.28 },
    { type: "spirit", count: 6, hp: 250, reward: 11, delay: 0.28 },
    { type: "voidwalker", count: 7, hp: 270, reward: 12, delay: 0.25 },
    { type: "knight", count: 4, hp: 210, reward: 10, delay: 0.22 },
  ]},
  /* Wave 10: boss emerges mid-wave amid chaotic mixed assault */
  { name: "The Sealed One", groups: [
    { type: "knight", count: 6, hp: 220, reward: 7, delay: 0.25 },
    { type: "guardian", count: 3, hp: 800, reward: 30, delay: 1.2 },
    { type: "swarm", count: 12, hp: 130, reward: 5, delay: 0.15 },
    { type: "boss", count: 1, hp: 4620, reward: 200, delay: 0.8 },
    { type: "voidwalker", count: 10, hp: 260, reward: 8, delay: 0.2 },
    { type: "spirit", count: 8, hp: 240, reward: 8, delay: 0.25 },
  ]},
];

export const ENDLESS_NAMES = [
  "Risen","Empowered","Ancient","Abyssal","Infernal","Spectral","Corrupted","Forsaken","Eldritch","Ascended",
];

export const ENDLESS_BOSS_NAMES = [
  "Herald of Ruin","Dread Colossus","Void Titan","Flame Archon","Frozen Leviathan",
  "Stone Primarch","Shadow Overlord","Spirit Sovereign","Chaos Incarnate","The Unbound",
];

export const ENEMY_VISUALS = {
  shade: {
    bodyColor: 0x442244, emissive: 0x331133, emissiveIntensity: 0.6,
    glowColor: 0x663366, eyeColor: 0xff44ff,
    scale: 0.75, opacity: 0.6, hpBarColor: 0xcc66cc,
    bobSpeed: 6, bobAmp: 0.08, spinSpeed: 0, baseSpeed: 3.5,
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
    bobSpeed: 2, bobAmp: 0.02, spinSpeed: 0, baseSpeed: 1.5,
  },
  knight: {
    bodyColor: 0x331111, emissive: 0x440000, emissiveIntensity: 0.7,
    glowColor: 0x661122, eyeColor: 0xff2222,
    scale: 1.0, opacity: 0.85, hpBarColor: 0xff4444,
    bobSpeed: 4, bobAmp: 0.04, spinSpeed: 1.5, baseSpeed: 4.2,
  },
  swarm: {
    bodyColor: 0x557722, emissive: 0x334400, emissiveIntensity: 0.5,
    glowColor: 0x669933, eyeColor: 0xccff44,
    scale: 0.55, opacity: 0.8, hpBarColor: 0xaacc44,
    bobSpeed: 10, bobAmp: 0.06, spinSpeed: 0, baseSpeed: 5.5,
  },
  warlord: {
    bodyColor: 0x551122, emissive: 0x440011, emissiveIntensity: 0.6,
    glowColor: 0x882233, eyeColor: 0xff6644,
    scale: 1.25, opacity: 0.9, hpBarColor: 0xff6644,
    bobSpeed: 3, bobAmp: 0.03, spinSpeed: 0.8, baseSpeed: 2.0,
  },
  spirit: {
    bodyColor: 0x225566, emissive: 0x11aacc, emissiveIntensity: 1.2,
    glowColor: 0x22ccee, eyeColor: 0x44ffff,
    scale: 0.85, opacity: 0.7, hpBarColor: 0x44ddee,
    bobSpeed: 5, bobAmp: 0.1, spinSpeed: 3.0, baseSpeed: 4.8,
  },
  guardian: {
    bodyColor: 0xaa8833, emissive: 0xcc9922, emissiveIntensity: 1.5,
    glowColor: 0xffcc44, eyeColor: 0xffee88,
    scale: 1.8, opacity: 0.9, hpBarColor: 0xffcc44,
    bobSpeed: 2, bobAmp: 0.05, spinSpeed: 1.0, baseSpeed: 1.2,
  },
  voidwalker: {
    bodyColor: 0x110022, emissive: 0x220044, emissiveIntensity: 0.9,
    glowColor: 0x440088, eyeColor: 0xcc44ff,
    scale: 0.9, opacity: 0.75, hpBarColor: 0xaa44ff,
    bobSpeed: 7, bobAmp: 0.07, spinSpeed: 2.0, baseSpeed: 6.0,
  },
  boss: {
    bodyColor: 0x661111, emissive: 0xff4400, emissiveIntensity: 2.0,
    glowColor: 0xff6622, eyeColor: 0xffdd44,
    scale: 2.2, opacity: 0.95, hpBarColor: 0xff8844,
    bobSpeed: 1.5, bobAmp: 0.04, spinSpeed: 0.5, baseSpeed: 1.2,
  },
};
