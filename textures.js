import * as THREE from "three";

/* ─── GLOW TEXTURE ─── */
export function glowTex() {
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
export function createCanvasTex(w, h, fn) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  fn(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

export function floorTex() {
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

export function pathTex() {
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
