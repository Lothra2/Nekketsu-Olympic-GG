import Phaser from 'phaser';
import { Painter, hex, rng, type RGB } from './paint';

/**
 * Fondos pintados por código para la intro, el título y la pelea, mientras llegan los escenarios de PixelForja
 * (lotes E). Todos a 640 x 360, con tramado retro y la misma luz por hora del día.
 */

const W = 640, H = 360;
const C = (s: string) => hex(s);

function stars(p: Painter, y1: number, n: number, seed: number) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * p.w), y = Math.floor(r() * y1);
    const b = r();
    p.px(x, y, b > 0.9 ? C('#ffffff') : b > 0.6 ? C('#c8c8ff') : C('#7a78b8'));
  }
}

interface BuildOpts { x0: number; x1: number; base: number; minH: number; maxH: number; minW: number; maxW: number; cols: RGB[]; win: RGB; winOff: RGB; lit: number; seed: number; roof?: RGB; gap?: number }
function buildings(p: Painter, o: BuildOpts) {
  const r = rng(o.seed);
  let x = o.x0;
  while (x < o.x1) {
    const w = Math.round(o.minW + r() * (o.maxW - o.minW));
    const h = Math.round(o.minH + r() * (o.maxH - o.minH));
    const col = o.cols[Math.floor(r() * o.cols.length)];
    const top = o.base - h;
    p.rect(x, top, w, h, col);
    if (o.roof) p.rect(x, top, w, 1, o.roof);
    // ventanas en grilla
    for (let wy = top + 4; wy < o.base - 4; wy += 5) for (let wx = x + 2; wx < x + w - 2; wx += 4) {
      if (r() < 0.12) continue;
      p.rect(wx, wy, 2, 2, r() < o.lit ? o.win : o.winOff);
    }
    x += w + (o.gap ?? Math.floor(r() * 3));
  }
}

function floorBand(p: Painter, y0: number, y1: number, base: RGB, line: RGB, tile = 32, shear = 0.35) {
  for (let y = y0; y < y1; y++) for (let x = 0; x < p.w; x++) p.px(x, y, base);
  // juntas horizontales cada vez más separadas hacia adelante
  let y = y0 + 6, step = 8;
  while (y < y1) { p.rect(0, y, p.w, 1, line); y += step; step += 3; }
  // juntas que van "hacia el fondo": oblicuas
  for (let x = -200; x < p.w + 200; x += tile) for (let yy = y0; yy < y1; yy++) p.px(x + (yy - y0) * shear, yy, line);
  // manchas y desgaste
  const r = rng(y0 * 7 + y1);
  for (let i = 0; i < 260; i++) { const xx = r() * p.w, yy = y0 + r() * (y1 - y0); p.px(xx, yy, line); }
}

export function flag(p: Painter, kind: 'jp' | 'vn' | 'co' | 've', x: number, y: number, w = 36, h = 24) {
  p.rect(x - 1, y - 1, w + 2, h + 2, C('#101018'));
  if (kind === 'jp') { p.rect(x, y, w, h, C('#f4f4f4')); p.circle(x + w / 2, y + h / 2, Math.round(h * 0.3), C('#d0202a')); }
  if (kind === 'vn') {
    p.rect(x, y, w, h, C('#da251d'));
    // estrella de 5 puntas: punto dentro del polígono
    const cx = x + w / 2, cy = y + h / 2 + 0.5, R = h * 0.4, r = R * 0.4;
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) { const ang = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R; pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]); }
    for (let yy = Math.floor(cy - R); yy <= cy + R; yy++) for (let xx = Math.floor(cx - R); xx <= cx + R; xx++) {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const [xi, yi] = pts[i], [xj, yj] = pts[j];
        if (yi > yy + 0.5 !== yj > yy + 0.5 && xx + 0.5 < ((xj - xi) * (yy + 0.5 - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (inside) p.px(xx, yy, C('#ffcd00'));
    }
  }
  if (kind === 'co') { p.rect(x, y, w, h / 2, C('#fcd116')); p.rect(x, y + h / 2, w, h / 4, C('#003893')); p.rect(x, y + (h * 3) / 4, w, h / 4, C('#ce1126')); }
  if (kind === 've') {
    p.rect(x, y, w, h / 3, C('#ffcc00')); p.rect(x, y + h / 3, w, h / 3, C('#00247d')); p.rect(x, y + (2 * h) / 3, w, h / 3 + 1, C('#cf142b'));
    for (let i = 0; i < 8; i++) { const a = Math.PI * (0.15 + (0.7 * i) / 7); p.px(x + w / 2 - Math.cos(a) * w * 0.28, y + h / 2 + 2 - Math.sin(a) * h * 0.2, C('#ffffff')); }
  }
}

// ------------------------------------------------------------------ escenas

/** Japón: azotea de la escuela al atardecer, sol retro y reja. */
function japon(): HTMLCanvasElement {
  const p = new Painter(W, H);
  p.vgrad(0, 240, [C('#1d1238'), C('#3d1d52'), C('#7a2c66'), C('#c4466a'), C('#f07a4a'), C('#ffbe6a')]);
  // sol a franjas
  const sx = 320, sy = 178, R = 58;
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    if (x * x + y * y > R * R) continue;
    const yy = sy + y;
    if (y > 0 && Math.floor(y / 6) % 2 === 1 && y % 6 < 1 + y / 14) continue;
    p.dither(sx + x, yy, C('#ffe9a0'), C('#ff9a4a'), (y + R) / (2 * R));
  }
  buildings(p, { x0: 0, x1: W, base: 240, minH: 14, maxH: 52, minW: 14, maxW: 40, cols: [C('#3a1840'), C('#341538')], win: C('#ffb060'), winOff: C('#2a1030'), lit: 0.18, seed: 11 });
  p.rect(0, 238, W, 2, C('#241030'));
  floorBand(p, 240, 360, C('#5d566e'), C('#4a4459'), 40, 0.5);
  // reja de alambre
  for (let y = 196; y < 262; y++) for (let x = 0; x < W; x++) if ((x + y) % 7 === 0 || (x - y + 700) % 7 === 0) p.px(x, y, C('#1a1226'), 200);
  p.rect(0, 194, W, 2, C('#1a1226'));
  for (let x = 6; x < W; x += 80) p.rect(x, 190, 3, 74, C('#140e1e'));
  return p.done();
}

/** Ruta del avión: mar con tramado y olas. */
function ruta(): HTMLCanvasElement {
  const p = new Painter(W, H);
  p.vgrad(0, H, [C('#071a3c'), C('#0b2752'), C('#0f3a6e'), C('#14508a')]);
  const r = rng(5);
  for (let i = 0; i < 420; i++) { const x = r() * W, y = r() * H; p.rect(x, y, 3 + Math.floor(r() * 4), 1, C('#2e6aa8')); }
  for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * H; p.rect(x, y, 2, 1, C('#7ab4e8')); }
  return p.done();
}

/** Saigón al amanecer: Landmark 81, Bitexco, casas tubo y cables. */
function saigon(): HTMLCanvasElement {
  const p = new Painter(W, H);
  p.vgrad(0, 250, [C('#16244e'), C('#3a3672'), C('#8c4a86'), C('#e2807e'), C('#ffc49a')]);
  // Landmark 81: torre escalonada que se afina
  const lx = 470;
  for (let y = 36; y < 250; y++) {
    const t = (y - 36) / 214, half = Math.round(3 + t * 15 - (y < 70 ? 0 : 0));
    p.rect(lx - half, y, half * 2, 1, C('#2c2c58'));
    if (y % 6 === 0 && y > 60) for (let x = lx - half + 2; x < lx + half - 2; x += 3) if ((x + y) % 5 < 2) p.px(x, y + 2, C('#ffd48a'));
  }
  p.rect(lx - 1, 22, 2, 14, C('#2c2c58'));
  p.px(lx, 21, C('#ff4040'));
  // Bitexco con su helipuerto
  const bx = 548;
  for (let y = 80; y < 250; y++) { const half = Math.round(6 + ((y - 80) / 170) * 7); p.rect(bx - half, y, half * 2 - 2, 1, C('#33335e')); }
  p.rect(bx - 16, 118, 22, 3, C('#3a3a66'));
  buildings(p, { x0: 0, x1: W, base: 250, minH: 20, maxH: 70, minW: 16, maxW: 36, cols: [C('#3b3460'), C('#433a68')], win: C('#ffd48a'), winOff: C('#2c2850'), lit: 0.25, seed: 7 });
  // casas tubo
  const r = rng(21);
  const pastel = ['#e89aa8', '#9ed6c0', '#f2d48a', '#a8c4ec', '#f0e6d6', '#c8a8e0', '#f4b490'].map(C);
  let x = -4;
  while (x < W) {
    const w = 22 + Math.floor(r() * 16), h = 100 + Math.floor(r() * 70), top = 300 - h;
    const col = pastel[Math.floor(r() * pastel.length)];
    const shade: RGB = [col[0] * 0.72, col[1] * 0.68, col[2] * 0.8];
    p.rect(x, top, w, h, col);
    p.rect(x + w - 3, top, 3, h, shade);
    p.rect(x, top, w, 2, shade);
    for (let fy = top + 8; fy < 290; fy += 24) {
      p.rect(x + 3, fy, w - 8, 9, r() < 0.4 ? C('#ffe2a6') : C('#3a3050'));
      p.rect(x + 1, fy + 12, w - 3, 2, C('#4a3a40'));
      for (let bx2 = x + 1; bx2 < x + w - 2; bx2 += 3) p.px(bx2, fy + 11, C('#4a3a40'));
      if (r() < 0.5) p.rect(x + w - 9, fy + 3, 5, 4, C('#c8c8d0'));
      if (r() < 0.5) for (let k = 0; k < 6; k++) p.px(x + 2 + k * 2, fy + 10 - (k % 2), C('#3e8a4a'));
    }
    if (r() < 0.6) p.rect(x + 4, top - 7, 9, 7, C('#5a7ab0'));
    x += w;
  }
  // cables enredados
  for (let i = 0; i < 14; i++) {
    const y0 = 150 + r() * 70, y1 = 150 + r() * 70;
    p.cable(-10, y0, W + 10, y1, 6 + r() * 18, C('#141020'));
  }
  for (let px2 = 30; px2 < W; px2 += 150) p.rect(px2, 140, 3, 160, C('#2a2430'));
  floorBand(p, 300, 360, C('#46424e'), C('#38343f'), 48, 0.45);
  for (let xx = 0; xx < W; xx += 40) p.rect(xx, 334, 20, 2, C('#e8c040'));
  return p.done();
}

/** Bogotá: Monserrate, casas coloniales y cielo de llovizna. */
function bogota(): HTMLCanvasElement {
  const p = new Painter(W, H);
  p.vgrad(0, 260, [C('#2c3442'), C('#46505e'), C('#66707c'), C('#8a929c')]);
  p.ridge(250, 40, 31, C('#1e3328'), C('#2e4a3a'), (u) => 0.25 + 0.75 * Math.pow(Math.max(0, 1 - Math.abs(u - 0.72) * 1.7), 1.4));
  // iglesia de Monserrate en la cima
  const cx = 461, cy = 46;
  p.rect(cx - 6, cy, 12, 8, C('#e8e4d8'));
  p.rect(cx - 2, cy - 7, 4, 7, C('#e8e4d8'));
  p.px(cx, cy - 9, C('#e8e4d8')); p.px(cx - 1, cy - 8, C('#e8e4d8')); p.px(cx + 1, cy - 8, C('#e8e4d8'));
  const r = rng(9);
  let x = -6;
  while (x < W) {
    const w = 46 + Math.floor(r() * 30), h = 60 + Math.floor(r() * 30), top = 300 - h;
    const wall = r() < 0.7 ? C('#e6dfcc') : r() < 0.5 ? C('#d6c87a') : C('#9ec4cc');
    p.rect(x, top, w, h, wall);
    for (let k = 0; k < 7; k++) p.rect(x - 3 + k, top - 7 + k, w + 6 - 2 * k, 1, k % 2 ? C('#8a3424') : C('#a8452c'));
    p.rect(x - 3, top, w + 6, 2, C('#6a2a1c'));
    for (let wx = x + 8; wx < x + w - 10; wx += 18) {
      p.rect(wx, top + 12, 9, 13, C('#2a4a6a'));
      p.rect(wx - 2, top + 25, 13, 2, C('#6a3c1c'));
      for (let b = 0; b < 13; b += 2) p.px(wx - 2 + b, top + 24, C('#6a3c1c'));
    }
    p.rect(x + Math.floor(w / 2) - 5, 300 - 22, 10, 22, r() < 0.5 ? C('#2a6a4a') : C('#2a4a8a'));
    x += w + 4;
  }
  floorBand(p, 300, 360, C('#5a5652'), C('#4a4642'), 22, 0.3);
  return p.done();
}

/** Maracaibo: atardecer de fuego, el Lago y el puente. */
function maracaibo(): HTMLCanvasElement {
  const p = new Painter(W, H);
  p.vgrad(0, 230, [C('#2a1236'), C('#6a1f3a'), C('#b2372a'), C('#ec6a24'), C('#ffb03a'), C('#ffe08a')]);
  p.circle(150, 206, 34, C('#fff2b0'));
  p.circle(150, 206, 30, C('#ffffe0'));
  p.vgrad(230, 360, [C('#7a3a3a'), C('#3a2a52'), C('#1c2246')]);
  const r = rng(3);
  for (let i = 0; i < 260; i++) { const y = 232 + Math.pow(r(), 1.6) * 128, w = 2 + r() * 10, x = 150 - 60 + r() * 120 + (y - 230) * (r() - 0.5) * 2; p.rect(x, y, w, 1, r() < 0.5 ? C('#ffb03a') : C('#ffe08a')); }
  for (let i = 0; i < 200; i++) p.rect(r() * W, 236 + r() * 120, 3 + r() * 5, 1, C('#4a4a78'));
  // el puente: tablero, pilares y torres atirantadas
  p.rect(0, 222, W, 3, C('#1a0e1e'));
  for (let x = 4; x < W; x += 22) p.rect(x, 225, 3, 14, C('#1a0e1e'));
  for (const tx of [300, 400, 500, 600]) {
    p.rect(tx - 6, 170, 3, 55, C('#1a0e1e')); p.rect(tx + 4, 170, 3, 55, C('#1a0e1e')); p.rect(tx - 6, 196, 13, 2, C('#1a0e1e'));
    for (let k = 1; k <= 5; k++) { p.line(tx - 4, 172 + k * 3, tx - 4 - k * 9, 222, C('#2a1424')); p.line(tx + 5, 172 + k * 3, tx + 5 + k * 9, 222, C('#2a1424')); }
  }
  return p.done();
}

/** Caracas de noche: El Ávila con la Cruz, Parque Central y la azotea. */
function caracasCielo(): HTMLCanvasElement {
  const p = new Painter(W, H);
  p.vgrad(0, 220, [C('#07081c'), C('#0f1030'), C('#1d1646'), C('#3a1f5a'), C('#5a2a66')]);
  stars(p, 130, 140, 77);
  // El Ávila
  const tops = p.ridge(205, 46, 101, C('#101a34'), C('#1e2c52'), (u) => 0.35 + 0.65 * Math.pow(Math.sin(Math.min(1, Math.max(0, (u - 0.05) / 0.95)) * Math.PI), 0.55));
  // la Cruz del Ávila, encendida, sobre la cresta cerca de la cumbre
  const tx = 410, ty = tops[tx];
  const cy = ty + 6;
  p.rect(tx - 1, cy - 9, 3, 15, C('#fff2a0'));
  p.rect(tx - 5, cy - 5, 11, 3, C('#fff2a0'));
  for (let a = 0; a < 40; a++) { const ang = (a / 40) * Math.PI * 2, d = 8 + (a % 3) * 2; p.px(tx + Math.cos(ang) * d, cy - 2 + Math.sin(ang) * d, C('#ffd860'), 90); }
  // luces del pie del cerro
  const r = rng(4);
  for (let i = 0; i < 300; i++) { const x = r() * W, y = 168 + r() * 40; p.px(x, y, r() < 0.7 ? C('#ffb060') : C('#ffe6a0'), 200); }
  buildings(p, { x0: 0, x1: W, base: 214, minH: 20, maxH: 70, minW: 14, maxW: 30, cols: [C('#151532'), C('#1a183a')], win: C('#ffcf7a'), winOff: C('#202044'), lit: 0.3, seed: 15 });
  // torres de Parque Central
  for (const bx of [118, 152]) {
    p.rect(bx, 52, 24, 162, C('#1c1c40'));
    p.rect(bx + 21, 52, 3, 162, C('#14142e'));
    for (let y = 58; y < 210; y += 4) for (let x = bx + 3; x < bx + 20; x += 3) if (r() < 0.38) p.rect(x, y, 2, 2, C('#ffd88a'));
    p.rect(bx + 11, 44, 2, 8, C('#2a2a4a'));
    p.px(bx + 11, 43, C('#ff3030'));
  }
  return p.done();
}

/** Azotea de la pelea: muro del fondo con baranda, piso de baldosas y borde de adelante. */
function caracasAzotea(): HTMLCanvasElement {
  const p = new Painter(W, 160);
  // tanques de agua al fondo
  for (const tx of [40, 560]) {
    p.rect(tx, 0, 46, 26, C('#3a4a6a'));
    p.rect(tx, 0, 46, 3, C('#5a6a8a'));
    for (let k = 0; k < 46; k += 6) p.rect(tx + k, 3, 1, 23, C('#30405e'));
    p.rect(tx + 4, 26, 3, 8, C('#2a3048')); p.rect(tx + 39, 26, 3, 8, C('#2a3048'));
  }
  // muro del fondo
  p.rect(0, 30, W, 12, C('#4a4660'));
  p.rect(0, 30, W, 2, C('#6a6684'));
  for (let x = 0; x < W; x += 16) p.rect(x, 32, 1, 10, C('#3e3a52'));
  // baranda
  p.rect(0, 22, W, 2, C('#8a8aa6'));
  for (let x = 4; x < W; x += 20) p.rect(x, 22, 2, 9, C('#7a7a96'));
  floorBand(p, 42, 148, C('#6a6478'), C('#5a5468'), 36, 0.42);
  // borde de adelante
  p.rect(0, 148, W, 12, C('#3c3850'));
  p.rect(0, 148, W, 2, C('#7a7690'));
  for (let x = 0; x < W; x += 24) p.rect(x, 150, 1, 10, C('#2e2a40'));
  return p.done();
}


/** Eje Cafetero: valle de Cocora con neblina, palmas de cera y cafetales. */
function cocora(): HTMLCanvasElement {
  const p = new Painter(W, H);
  p.vgrad(0, 200, [C('#7ab0d8'), C('#a6cce4'), C('#cfe2ea'), C('#e8eee8')]);
  p.ridge(170, 40, 201, C('#6e9a8a'), C('#9cbcb0'), (u) => 0.5 + 0.4 * Math.sin(u * 5 + 1));
  for (let y = 120; y < 175; y++) for (let x = 0; x < W; x++) if ((x * 7 + y * 13) % 5 === 0) p.px(x, y, C('#e8eee8'), 120);
  p.ridge(205, 90, 202, C('#3e7a4a'), C('#5e9a5e'), (u) => 0.45 + 0.35 * Math.sin(u * 3.3 + 2));
  p.ridge(232, 150, 203, C('#2e6a3a'), C('#4e8a4a'), (u) => 0.5 + 0.3 * Math.sin(u * 6.1));
  // cafetales: hileras de matas
  const r = rng(31);
  for (let i = 0; i < 380; i++) { const x = r() * W, y = 190 + r() * 45; p.circle(x, y, 2, r() < 0.5 ? C('#1e5a2a') : C('#2a6a32')); if (r() < 0.2) p.px(x + 1, y - 1, C('#c8202a')); }
  // palmas de cera altísimas
  for (const [x, top] of [[60, 40], [150, 70], [255, 30], [420, 55], [520, 25], [600, 80]] as [number, number][]) {
    for (let y = top; y < 236; y++) { p.px(x, y, C('#d8d4c8')); p.px(x + 1, y, C('#a8a49a')); }
    for (let a = 0; a < 9; a++) { const ang = Math.PI * (0.95 + (a / 8) * 1.1); for (let k = 0; k < 12; k++) p.px(x + Math.cos(ang) * k, top + Math.sin(ang) * k * 0.6 + k * k * 0.04, C('#3a6a3a')); }
  }
  for (let y = 60; y < 120; y++) for (let x = 0; x < W; x++) if ((x * 3 + y * 11) % 9 === 0) p.px(x, y, C('#ffffff'), 70);
  return p.done();
}

/** Bahía de Hạ Long: islotes de piedra caliza, juncos de velas rojas y mar quieto. */
function halong(): HTMLCanvasElement {
  const p = new Painter(W, H);
  p.vgrad(0, 190, [C('#9cc4e0'), C('#c4dcea'), C('#f2e2cc'), C('#f8d8b8')]);
  const r = rng(41);
  const karst = (cx: number, base: number, w: number, h: number, col: RGB, light: RGB) => {
    for (let x = -w; x <= w; x++) {
      const u = x / w;
      const top = base - h * Math.pow(Math.max(0, 1 - u * u), 0.35) * (0.9 + 0.1 * Math.sin(x * 0.7 + cx));
      for (let y = Math.round(top); y < base; y++) p.px(cx + x, y, (x < -w * 0.3 && y < top + 10) ? light : col);
    }
  };
  for (let i = 0; i < 9; i++) karst(20 + r() * 600, 190, 14 + r() * 18, 40 + r() * 50, C('#9aaab0'), C('#b8c4c8'));
  for (let i = 0; i < 6; i++) karst(r() * 640, 196, 18 + r() * 24, 70 + r() * 70, C('#4a6a5a'), C('#6a8a6a'));
  p.vgrad(196, 360, [C('#4a8aa0'), C('#2a6a8a'), C('#1a4a6a')]);
  for (let i = 0; i < 260; i++) p.rect(r() * W, 198 + r() * 160, 2 + r() * 6, 1, r() < 0.3 ? C('#cfe8f0') : C('#6aaac0'));
  // juncos con velas rojas
  for (const [x, y] of [[110, 200], [470, 204], [330, 198]] as [number, number][]) {
    p.rect(x - 14, y, 30, 4, C('#4a2a1a'));
    p.rect(x - 10, y + 4, 22, 2, C('#3a1a10'));
    for (const [sx, sh] of [[-6, 22], [4, 26], [12, 18]] as [number, number][]) {
      p.rect(x + sx, y - sh, 1, sh, C('#3a2010'));
      for (let k = 0; k < sh - 2; k++) p.rect(x + sx + 1, y - sh + k, 7 - Math.floor(k / 6), 1, k % 4 === 0 ? C('#8a2a1a') : C('#b8402a'));
    }
  }
  return p.done();
}

/** Llanos de Apure al atardecer: sabana, morichales y un caney. */
function llanos(): HTMLCanvasElement {
  const p = new Painter(W, H);
  p.vgrad(0, 210, [C('#3a2a6a'), C('#8a3a7a'), C('#e2604a'), C('#ffa848'), C('#ffd88a')]);
  p.circle(470, 196, 26, C('#fff0b0'));
  p.vgrad(206, 360, [C('#a8a040'), C('#7a8a30'), C('#5a7a2a'), C('#3e6a22')]);
  const r = rng(51);
  for (let i = 0; i < 900; i++) { const x = r() * W, y = 208 + r() * 150; p.px(x, y, r() < 0.5 ? C('#c8b850') : C('#4a6a20')); }
  // morichales: palmas de abanico
  for (const [x, top] of [[40, 120], [90, 140], [560, 110], [610, 132], [300, 150]] as [number, number][]) {
    for (let y = top; y < 212; y++) { p.px(x, y, C('#3a2a1a')); p.px(x + 1, y, C('#2a1a12')); }
    for (let a = 0; a < 16; a++) { const ang = Math.PI * (1 + (a / 15)); for (let k = 0; k < 16; k++) p.px(x + Math.cos(ang) * k, top + Math.sin(ang) * k * 0.7, C('#2a3a1a')); }
  }
  // caney
  p.rect(200, 192, 34, 16, C('#6a4a2a'));
  for (let k = 0; k < 10; k++) p.rect(196 + k, 184 + k, 42 - 2 * k, 1, C('#a08040'));
  p.rect(212, 198, 8, 10, C('#2a1a10'));
  return p.done();
}

/** Registra todos los fondos como texturas. */
export function makeBackdrops(scene: Phaser.Scene) {
  const add = (k: string, c: HTMLCanvasElement) => { if (!scene.textures.exists(k)) scene.textures.addCanvas(k, c); };
  add('bg_japon', japon());
  add('bg_ruta', ruta());
  add('bg_saigon', saigon());
  add('bg_bogota', bogota());
  add('bg_maracaibo', maracaibo());
  add('bg_caracas', caracasCielo());
  add('bg_azotea', caracasAzotea());
  add('bg_cocora', cocora());
  add('bg_halong', halong());
  add('bg_llanos', llanos());
  // banderas sueltas
  for (const k of ['jp', 'vn', 'co', 've'] as const) {
    const p = new Painter(38, 26);
    flag(p, k, 1, 1, 36, 24);
    add(`flag_${k}`, p.done());
  }
  // pixel blanco para partículas y destellos
  const px = new Painter(4, 4);
  px.rect(0, 0, 4, 4, C('#ffffff'));
  add('px', px.done());
}
