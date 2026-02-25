import * as THREE from "three";
import { TILE, W, H, PATH_POINTS } from "./constants.js";

/* ─── GRID & PATH HELPERS ─── */

export function gridToWorld(col, row) {
  return new THREE.Vector3(col * TILE - W / 2 + TILE / 2, 0, row * TILE - H / 2 + TILE / 2);
}

/* Cache path points — allocated once, never changes */
const cachedPathPoints = PATH_POINTS.map(([c, r]) => gridToWorld(c, r));
export function pathWorldPoints() { return cachedPathPoints; }

/* Pre-compute path tile set for O(1) lookup */
const pathTileSet = new Set();
(function() {
  for (let i = 0; i < PATH_POINTS.length - 1; i++) {
    const [c1, r1] = PATH_POINTS[i], [c2, r2] = PATH_POINTS[i + 1];
    if (c1 === c2) { const a = Math.min(r1, r2), b = Math.max(r1, r2); for (let r = a; r <= b; r++) pathTileSet.add(c1 + "," + r); }
    else { const a = Math.min(c1, c2), b = Math.max(c1, c2); for (let c = a; c <= b; c++) pathTileSet.add(c + "," + r1); }
  }
})();

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
