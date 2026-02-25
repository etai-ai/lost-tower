import * as THREE from "three";
import { TILE, W, H, PATH_POINTS } from "./constants.js";

/* ─── GRID & PATH HELPERS ─── */

export function gridToWorld(col, row) {
  return new THREE.Vector3(col * TILE - W / 2 + TILE / 2, 0, row * TILE - H / 2 + TILE / 2);
}

/* Mutable path caches — rebuilt when map changes */
let cachedPathPoints = PATH_POINTS.map(([c, r]) => gridToWorld(c, r));
let pathTileSet = new Set();

function rebuildPathTileSet(points) {
  const set = new Set();
  for (let i = 0; i < points.length - 1; i++) {
    const [c1, r1] = points[i], [c2, r2] = points[i + 1];
    if (c1 === c2) { const a = Math.min(r1, r2), b = Math.max(r1, r2); for (let r = a; r <= b; r++) set.add(c1 + "," + r); }
    else { const a = Math.min(c1, c2), b = Math.max(c1, c2); for (let c = a; c <= b; c++) set.add(c + "," + r1); }
  }
  return set;
}

/* Initialize with default map */
pathTileSet = rebuildPathTileSet(PATH_POINTS);

/* Re-initialize path data for a new map */
export function initMap(points) {
  cachedPathPoints = points.map(([c, r]) => gridToWorld(c, r));
  pathTileSet = rebuildPathTileSet(points);
}

export function pathWorldPoints() { return cachedPathPoints; }
export function isPathTile(col, row) { return pathTileSet.has(col + "," + row); }

/* Reusable Vector3 temporaries for hot-path calculations */
export const tmpVec3A = new THREE.Vector3();
export const tmpVec3B = new THREE.Vector3();

/* ─── DETECT MOBILE ─── */
export function isMobile() {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
}

/* ─── DOM HELPERS ─── */
export const $ = (id) => document.getElementById(id);
