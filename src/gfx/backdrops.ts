import Phaser from 'phaser';
import { Painter, hex, rng, type RGB } from './paint';

/**
 * Fondos pintados por código para la intro, el título y la pelea, mientras llegan los escenarios de PixelForja
 * (lotes E). Todos a 640 x 360, con tramado retro y la misma luz por hora del día, y con M pixeles más a cada lado
 * para las pantallas anchas (ver core/pantalla): lo que se ve en 640 no se mueve, los costados son más de lo mismo.
 */

const W = 640, H = 360;
const M = 80, X0 = -M, X1 = W + M, AW = W + 2 * M;
/** el primer x de una serie cada `paso`, alineada con la que empezaba en `a`, desde el borde izquierdo con margen */
const desde = (a: number, paso: number) => a - Math.ceil(M / paso) * paso;
const C = (s: string) => hex(s);

function stars(p: Painter, y1: number, n: number, seed: number) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(p.x0 + r() * (p.x1 - p.x0)), y = Math.floor(r() * y1);
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
  for (let y = y0; y < y1; y++) for (let x = p.x0; x < p.x1; x++) p.px(x, y, base);
  // juntas horizontales cada vez más separadas hacia adelante
  let y = y0 + 6, step = 8;
  while (y < y1) { p.rect(p.x0, y, p.x1 - p.x0, 1, line); y += step; step += 3; }
  // juntas que van "hacia el fondo": oblicuas
  for (let x = -200 - Math.ceil(p.ox / tile) * tile; x < p.x1 + 200; x += tile) for (let yy = y0; yy < y1; yy++) p.px(x + (yy - y0) * shear, yy, line);
  // manchas y desgaste
  const r = rng(y0 * 7 + y1);
  for (let i = 0; i < 260; i++) { const xx = p.x0 + r() * (p.x1 - p.x0), yy = y0 + r() * (y1 - y0); p.px(xx, yy, line); }
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
  const p = new Painter(W, H, M);
  p.vgrad(0, 240, [C('#1d1238'), C('#3d1d52'), C('#7a2c66'), C('#c4466a'), C('#f07a4a'), C('#ffbe6a')]);
  // sol a franjas
  const sx = 320, sy = 178, R = 58;
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    if (x * x + y * y > R * R) continue;
    const yy = sy + y;
    if (y > 0 && Math.floor(y / 6) % 2 === 1 && y % 6 < 1 + y / 14) continue;
    p.dither(sx + x, yy, C('#ffe9a0'), C('#ff9a4a'), (y + R) / (2 * R));
  }
  buildings(p, { x0: X0, x1: X1, base: 240, minH: 14, maxH: 52, minW: 14, maxW: 40, cols: [C('#3a1840'), C('#341538')], win: C('#ffb060'), winOff: C('#2a1030'), lit: 0.18, seed: 11 });
  p.rect(X0, 238, AW, 2, C('#241030'));
  floorBand(p, 240, 360, C('#5d566e'), C('#4a4459'), 40, 0.5);
  // reja de alambre
  for (let y = 196; y < 262; y++) for (let x = X0; x < X1; x++) if ((x + y) % 7 === 0 || (x - y + 700) % 7 === 0) p.px(x, y, C('#1a1226'), 200);
  p.rect(X0, 194, AW, 2, C('#1a1226'));
  for (let x = desde(6, 80); x < X1; x += 80) p.rect(x, 190, 3, 74, C('#140e1e'));
  return p.done();
}

/** Ruta del avión: mar con tramado y olas. */
function ruta(): HTMLCanvasElement {
  const p = new Painter(W, H, M);
  p.vgrad(0, H, [C('#071a3c'), C('#0b2752'), C('#0f3a6e'), C('#14508a')]);
  const r = rng(5);
  for (let i = 0; i < 420; i++) { const x = (X0 + r() * AW), y = r() * H; p.rect(x, y, 3 + Math.floor(r() * 4), 1, C('#2e6aa8')); }
  for (let i = 0; i < 90; i++) { const x = (X0 + r() * AW), y = r() * H; p.rect(x, y, 2, 1, C('#7ab4e8')); }
  return p.done();
}

/** Saigón al amanecer: Landmark 81, Bitexco, casas tubo y cables. */
function saigon(): HTMLCanvasElement {
  const p = new Painter(W, H, M);
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
  buildings(p, { x0: X0, x1: X1, base: 250, minH: 20, maxH: 70, minW: 16, maxW: 36, cols: [C('#3b3460'), C('#433a68')], win: C('#ffd48a'), winOff: C('#2c2850'), lit: 0.25, seed: 7 });
  // casas tubo
  const r = rng(21);
  const pastel = ['#e89aa8', '#9ed6c0', '#f2d48a', '#a8c4ec', '#f0e6d6', '#c8a8e0', '#f4b490'].map(C);
  let x = X0 - 4;
  while (x < X1) {
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
    p.cable(X0 - 10, y0, X1 + 10, y1, 6 + r() * 18, C('#141020'));
  }
  for (let px2 = desde(30, 150); px2 < X1; px2 += 150) p.rect(px2, 140, 3, 160, C('#2a2430'));
  floorBand(p, 300, 360, C('#46424e'), C('#38343f'), 48, 0.45);
  for (let xx = desde(0, 40); xx < X1; xx += 40) p.rect(xx, 334, 20, 2, C('#e8c040'));
  return p.done();
}

/** Bogotá: Monserrate, casas coloniales y cielo de llovizna. */
function bogota(): HTMLCanvasElement {
  const p = new Painter(W, H, M);
  p.vgrad(0, 260, [C('#2c3442'), C('#46505e'), C('#66707c'), C('#8a929c')]);
  p.ridge(250, 40, 31, C('#1e3328'), C('#2e4a3a'), (u) => 0.25 + 0.75 * Math.pow(Math.max(0, 1 - Math.abs(u - 0.72) * 1.7), 1.4));
  // iglesia de Monserrate en la cima
  const cx = 461, cy = 46;
  p.rect(cx - 6, cy, 12, 8, C('#e8e4d8'));
  p.rect(cx - 2, cy - 7, 4, 7, C('#e8e4d8'));
  p.px(cx, cy - 9, C('#e8e4d8')); p.px(cx - 1, cy - 8, C('#e8e4d8')); p.px(cx + 1, cy - 8, C('#e8e4d8'));
  const r = rng(9);
  let x = X0 - 6;
  while (x < X1) {
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
  const p = new Painter(W, H, M);
  p.vgrad(0, 230, [C('#2a1236'), C('#6a1f3a'), C('#b2372a'), C('#ec6a24'), C('#ffb03a'), C('#ffe08a')]);
  p.circle(150, 206, 34, C('#fff2b0'));
  p.circle(150, 206, 30, C('#ffffe0'));
  p.vgrad(230, 360, [C('#7a3a3a'), C('#3a2a52'), C('#1c2246')]);
  const r = rng(3);
  for (let i = 0; i < 260; i++) { const y = 232 + Math.pow(r(), 1.6) * 128, w = 2 + r() * 10, x = 150 - 60 + r() * 120 + (y - 230) * (r() - 0.5) * 2; p.rect(x, y, w, 1, r() < 0.5 ? C('#ffb03a') : C('#ffe08a')); }
  for (let i = 0; i < 200; i++) p.rect((X0 + r() * AW), 236 + r() * 120, 3 + r() * 5, 1, C('#4a4a78'));
  // el puente: tablero, pilares y torres atirantadas
  p.rect(X0, 222, AW, 3, C('#1a0e1e'));
  for (let x = desde(4, 22); x < X1; x += 22) p.rect(x, 225, 3, 14, C('#1a0e1e'));
  for (const tx of [300, 400, 500, 600]) {
    p.rect(tx - 6, 170, 3, 55, C('#1a0e1e')); p.rect(tx + 4, 170, 3, 55, C('#1a0e1e')); p.rect(tx - 6, 196, 13, 2, C('#1a0e1e'));
    for (let k = 1; k <= 5; k++) { p.line(tx - 4, 172 + k * 3, tx - 4 - k * 9, 222, C('#2a1424')); p.line(tx + 5, 172 + k * 3, tx + 5 + k * 9, 222, C('#2a1424')); }
  }
  return p.done();
}

/** Caracas de noche: El Ávila con la Cruz, Parque Central y la azotea. */
function caracasCielo(): HTMLCanvasElement {
  const p = new Painter(W, H, M);
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
  for (let i = 0; i < 300; i++) { const x = (X0 + r() * AW), y = 168 + r() * 40; p.px(x, y, r() < 0.7 ? C('#ffb060') : C('#ffe6a0'), 200); }
  buildings(p, { x0: X0, x1: X1, base: 214, minH: 20, maxH: 70, minW: 14, maxW: 30, cols: [C('#151532'), C('#1a183a')], win: C('#ffcf7a'), winOff: C('#202044'), lit: 0.3, seed: 15 });
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
  const p = new Painter(W, 160, M);
  // tanques de agua al fondo
  for (const tx of [40, 560]) {
    p.rect(tx, 0, 46, 26, C('#3a4a6a'));
    p.rect(tx, 0, 46, 3, C('#5a6a8a'));
    for (let k = 0; k < 46; k += 6) p.rect(tx + k, 3, 1, 23, C('#30405e'));
    p.rect(tx + 4, 26, 3, 8, C('#2a3048')); p.rect(tx + 39, 26, 3, 8, C('#2a3048'));
  }
  // muro del fondo
  p.rect(X0, 30, AW, 12, C('#4a4660'));
  p.rect(X0, 30, AW, 2, C('#6a6684'));
  for (let x = desde(0, 16); x < X1; x += 16) p.rect(x, 32, 1, 10, C('#3e3a52'));
  // baranda
  p.rect(X0, 22, AW, 2, C('#8a8aa6'));
  for (let x = desde(4, 20); x < X1; x += 20) p.rect(x, 22, 2, 9, C('#7a7a96'));
  floorBand(p, 42, 148, C('#6a6478'), C('#5a5468'), 36, 0.42);
  // borde de adelante
  p.rect(X0, 148, AW, 12, C('#3c3850'));
  p.rect(X0, 148, AW, 2, C('#7a7690'));
  for (let x = desde(0, 24); x < X1; x += 24) p.rect(x, 150, 1, 10, C('#2e2a40'));
  return p.done();
}


/** Eje Cafetero: valle de Cocora con neblina, palmas de cera y cafetales. */
function cocora(): HTMLCanvasElement {
  const p = new Painter(W, H, M);
  p.vgrad(0, 200, [C('#7ab0d8'), C('#a6cce4'), C('#cfe2ea'), C('#e8eee8')]);
  p.ridge(170, 40, 201, C('#6e9a8a'), C('#9cbcb0'), (u) => 0.5 + 0.4 * Math.sin(u * 5 + 1));
  for (let y = 120; y < 175; y++) for (let x = X0; x < X1; x++) if ((x * 7 + y * 13) % 5 === 0) p.px(x, y, C('#e8eee8'), 120);
  p.ridge(205, 90, 202, C('#3e7a4a'), C('#5e9a5e'), (u) => 0.45 + 0.35 * Math.sin(u * 3.3 + 2));
  p.ridge(232, 150, 203, C('#2e6a3a'), C('#4e8a4a'), (u) => 0.5 + 0.3 * Math.sin(u * 6.1));
  // cafetales: hileras de matas
  const r = rng(31);
  for (let i = 0; i < 380; i++) { const x = (X0 + r() * AW), y = 190 + r() * 45; p.circle(x, y, 2, r() < 0.5 ? C('#1e5a2a') : C('#2a6a32')); if (r() < 0.2) p.px(x + 1, y - 1, C('#c8202a')); }
  // palmas de cera altísimas
  for (const [x, top] of [[60, 40], [150, 70], [255, 30], [420, 55], [520, 25], [600, 80]] as [number, number][]) {
    for (let y = top; y < 236; y++) { p.px(x, y, C('#d8d4c8')); p.px(x + 1, y, C('#a8a49a')); }
    for (let a = 0; a < 9; a++) { const ang = Math.PI * (0.95 + (a / 8) * 1.1); for (let k = 0; k < 12; k++) p.px(x + Math.cos(ang) * k, top + Math.sin(ang) * k * 0.6 + k * k * 0.04, C('#3a6a3a')); }
  }
  for (let y = 60; y < 120; y++) for (let x = X0; x < X1; x++) if ((x * 3 + y * 11) % 9 === 0) p.px(x, y, C('#ffffff'), 70);
  return p.done();
}

/** Bahía de Hạ Long: islotes de piedra caliza, juncos de velas rojas y mar quieto. */
function halong(): HTMLCanvasElement {
  const p = new Painter(W, H, M);
  p.vgrad(0, 190, [C('#9cc4e0'), C('#c4dcea'), C('#f2e2cc'), C('#f8d8b8')]);
  const r = rng(41);
  const karst = (cx: number, base: number, w: number, h: number, col: RGB, light: RGB) => {
    for (let x = -w; x <= w; x++) {
      const u = x / w;
      const top = base - h * Math.pow(Math.max(0, 1 - u * u), 0.35) * (0.9 + 0.1 * Math.sin(x * 0.7 + cx));
      for (let y = Math.round(top); y < base; y++) p.px(cx + x, y, (x < -w * 0.3 && y < top + 10) ? light : col);
    }
  };
  for (let i = 0; i < 9; i++) karst(X0 + 20 + r() * (AW - 40), 190, 14 + r() * 18, 40 + r() * 50, C('#9aaab0'), C('#b8c4c8'));
  for (let i = 0; i < 6; i++) karst(X0 + r() * AW, 196, 18 + r() * 24, 70 + r() * 70, C('#4a6a5a'), C('#6a8a6a'));
  p.vgrad(196, 360, [C('#4a8aa0'), C('#2a6a8a'), C('#1a4a6a')]);
  for (let i = 0; i < 260; i++) p.rect((X0 + r() * AW), 198 + r() * 160, 2 + r() * 6, 1, r() < 0.3 ? C('#cfe8f0') : C('#6aaac0'));
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
  const p = new Painter(W, H, M);
  p.vgrad(0, 210, [C('#3a2a6a'), C('#8a3a7a'), C('#e2604a'), C('#ffa848'), C('#ffd88a')]);
  p.circle(470, 196, 26, C('#fff0b0'));
  p.vgrad(206, 360, [C('#a8a040'), C('#7a8a30'), C('#5a7a2a'), C('#3e6a22')]);
  const r = rng(51);
  for (let i = 0; i < 900; i++) { const x = (X0 + r() * AW), y = 208 + r() * 150; p.px(x, y, r() < 0.5 ? C('#c8b850') : C('#4a6a20')); }
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


/** Un farol de seda de Hội An encendido, con su brillo alrededor. */
function farol(p: Painter, x: number, y: number, col: RGB, chico = false) {
  const w = chico ? 4 : 6, h = chico ? 5 : 8;
  for (let r = 6; r > 0; r--) p.circle(x, y + h / 2, w + r * 1.5, col, 10);
  p.rect(x - 1, y - 3, 2, 3, C('#3a2418'));
  for (let k = 0; k < h; k++) {
    const ww = Math.round(w * (0.6 + 0.4 * Math.sin((k / (h - 1)) * Math.PI)));
    p.rect(x - Math.floor(ww / 2), y + k, ww, 1, col);
  }
  p.rect(x - Math.floor(w / 4), y + 1, 1, h - 2, C('#fff2c8'), 150);
  p.rect(x - 2, y + h, 4, 1, C('#3a2418'));
  p.px(x, y + h + 1, C('#f2c230'));
}

const FAROLES = ['#e83a3a', '#f2a03a', '#f2d24a', '#e85aa0', '#4ac0a0', '#e8603a'].map(C);

/** Hội An de noche, lo de atrás: el cielo, la luna, la otra orilla y el río Thu Bồn con el puente japonés. */
function hoianLejos(): HTMLCanvasElement {
  const p = new Painter(W, 200, M);
  p.vgrad(0, 150, [C('#0a0e2c'), C('#161a44'), C('#2c2456'), C('#54305a')]);
  stars(p, 110, 160, 61);
  p.circle(500, 44, 13, C('#fff4d0'));
  p.circle(496, 41, 3, C('#e8dcb0')); p.circle(506, 50, 2, C('#e8dcb0'));
  for (let r = 1; r < 8; r++) p.circle(500, 44, 13 + r * 2, C('#fff4d0'), 8);
  // la otra orilla: árboles oscuros y casitas con luz
  const h = p.ridge(150, 112, 63, C('#141a30'), C('#1e2440'), (u) => 0.5 + 0.3 * Math.sin(u * 9) + 0.15 * Math.sin(u * 23));
  void h;
  buildings(p, { x0: X0, x1: X1, base: 152, minH: 8, maxH: 18, minW: 14, maxW: 26, cols: [C('#2a2440'), C('#30284a')], win: C('#ffcf7a'), winOff: C('#1c1830'), lit: 0.45, seed: 64 });
  // el río: agua oscura con los reflejos de las luces
  p.vgrad(152, 200, [C('#1a2048'), C('#121838'), C('#0c1230')]);
  const r = rng(65);
  for (let i = 0; i < 220; i++) { const x = X0 + r() * AW, y = 154 + r() * 44; p.rect(x, y, 1 + r() * 4, 1, r() < 0.5 ? C('#ffcf7a') : FAROLES[Math.floor(r() * FAROLES.length)], 90 + r() * 120); }
  // el puente japonés (Chùa Cầu): arco de madera con su techito
  const bx = 150, by = 150;
  for (let x = -44; x <= 44; x++) { const yy = by - Math.round(10 * Math.cos((x / 44) * Math.PI / 2)); p.rect(bx + x, yy, 1, 5, C('#4a2a22')); }
  p.rect(bx - 24, by - 26, 48, 12, C('#6a3a2a'));
  for (let k = 0; k < 6; k++) p.rect(bx - 30 + k, by - 30 + k, 60 - 2 * k, 1, C('#3a2a30'));
  for (const x of [-18, -6, 6, 18]) farol(p, bx + x, by - 14, C('#e83a3a'), true);
  for (let x = -44; x <= 44; x += 8) p.rect(bx + x, by - 2, 1, 8, C('#3a2018'));
  // botecitos con faroles en el río
  for (const [x, y] of [[300, 176], [420, 186], [560, 170], [40, 188]] as [number, number][]) {
    p.rect(x - 12, y, 24, 3, C('#3a2418'));
    p.rect(x - 9, y + 3, 18, 2, C('#2a1810'));
    farol(p, x, y - 10, FAROLES[(x / 20) % FAROLES.length | 0], true);
  }
  return p.done();
}

/** Hội An de noche, la calle: las casas amarillas con faroles, la calle de piedra, el muelle y las velitas en el río. */
function hoianCalle(): HTMLCanvasElement {
  const p = new Painter(W, 360, M);
  const r = rng(71);
  // casas amarillas de dos pisos con techo de teja y balcón de madera, con dos claros que dan al río y al puente
  const claros: [number, number][] = [[84, 226], [372, 452]];
  let x = X0 - 10;
  while (x < X1) {
    const claro = claros.find(([a, b2]) => x + 40 > a && x < b2);
    if (claro) {
      // la orilla: el murito del río con sus matas y un farol colgando de un palo
      p.rect(claro[0], 230, claro[1] - claro[0], 16, C('#6a5a50'));
      p.rect(claro[0], 230, claro[1] - claro[0], 2, C('#8a7a6a'));
      for (let k = claro[0]; k < claro[1]; k += 9) p.rect(k, 232, 1, 14, C('#4a3e3a'));
      for (let i = 0; i < 30; i++) p.circle(claro[0] + r() * (claro[1] - claro[0]), 226 + r() * 4, 2, r() < 0.5 ? C('#1e4a2a') : C('#2a5a32'));
      const mx = (claro[0] + claro[1]) / 2 + 20;
      p.rect(mx, 186, 2, 44, C('#3a2418'));
      p.rect(mx - 10, 186, 22, 2, C('#3a2418'));
      farol(p, mx - 8, 189, C('#e83a3a'));
      farol(p, mx + 10, 189, C('#f2d24a'));
      x = claro[1];
      continue;
    }
    const w = Math.min(62 + Math.floor(r() * 26), (claros.find(([a]) => a > x)?.[0] ?? X1 + 60) - x - 2);
    if (w < 30) { x += w + 2; continue; }
    const top = 116 + Math.floor(r() * 18);
    const pared = r() < 0.75 ? C('#d8a83a') : C('#c89a5a');
    const sombra: RGB = [pared[0] * 0.7, pared[1] * 0.66, pared[2] * 0.6];
    p.rect(x, top, w, 246 - top, pared);
    p.rect(x + w - 4, top, 4, 246 - top, sombra);
    // techo de tejas
    for (let k = 0; k < 9; k++) p.rect(x - 6 + k, top - 9 + k, w + 12 - 2 * k, 1, k % 2 ? C('#4a2a26') : C('#5a3430'));
    for (let tx = x - 4; tx < x + w + 4; tx += 4) p.rect(tx, top - 9, 1, 9, C('#3a2020'));
    // segundo piso: ventanas con luz cálida y balcón
    for (let wx = x + 8; wx < x + w - 14; wx += 18) {
      const luz = r() < 0.7;
      p.rect(wx, top + 10, 10, 14, luz ? C('#ffcf7a') : C('#3a2a30'));
      p.rect(wx + 4, top + 10, 1, 14, C('#5a3a2a'));
      p.rect(wx - 1, top + 9, 12, 1, C('#5a3a2a'));
    }
    p.rect(x + 2, top + 28, w - 6, 3, C('#5a3424'));
    for (let bx2 = x + 3; bx2 < x + w - 4; bx2 += 3) p.rect(bx2, top + 31, 1, 6, C('#4a2a1e'));
    // segundo techito sobre la planta baja
    for (let k = 0; k < 5; k++) p.rect(x - 3 + k, top + 44 + k, w + 6 - 2 * k, 1, k % 2 ? C('#4a2a26') : C('#5a3430'));
    // planta baja de madera, abierta y encendida (tiendas de faroles y de té)
    p.rect(x + 3, top + 50, w - 7, 246 - top - 50, C('#4a2a1e'));
    const abierta = r() < 0.8;
    if (abierta) {
      p.rect(x + 8, top + 56, w - 17, 246 - top - 60, C('#ffb860'));
      p.rect(x + 8, top + 56, w - 17, 246 - top - 60, C('#e8803a'), 90);
      for (let k = 0; k < 5; k++) farol(p, x + 14 + k * ((w - 28) / 4), top + 60 + (k % 2) * 6, FAROLES[Math.floor(r() * FAROLES.length)], true);
      p.rect(x + 8, 236, w - 17, 4, C('#5a3424'));
    } else for (let k = x + 8; k < x + w - 9; k += 4) p.rect(k, top + 56, 3, 246 - top - 60, C('#6a3a26'));
    // buganvilla en la esquina
    if (r() < 0.5) for (let i = 0; i < 40; i++) p.px(x + w - 6 + r() * 10, top + 2 + r() * 50, r() < 0.7 ? C('#e85aa0') : C('#2a6a3a'));
    // faroles grandes en el alero
    for (let fx = x + 10; fx < x + w - 6; fx += 22) farol(p, fx, top + 38, FAROLES[Math.floor(r() * FAROLES.length)]);
    x += w + 2;
  }
  // la calle de piedra (la franja de la pelea) y la acera de atrás
  floorBand(p, 246, 330, C('#5c5058'), C('#4a4048'), 34);
  p.rect(X0, 246, AW, 14, C('#6a5e64'));
  p.rect(X0, 259, AW, 1, C('#3e343c'));
  // el resplandor de los faroles en la piedra
  for (let i = 0; i < 900; i++) { const xx = X0 + r() * AW, yy = 260 + r() * 70; p.px(xx, yy, FAROLES[Math.floor(r() * FAROLES.length)], 50); }
  // el muelle de madera adelante
  for (let yy = 330; yy < 344; yy++) p.rect(X0, yy, AW, 1, yy % 4 === 0 ? C('#3a2418') : C('#5a3a26'));
  for (let xx = desde(0, 40); xx < X1; xx += 40) for (let yy = 330; yy < 344; yy++) p.px(xx + (yy - 330) * 0.35, yy, C('#2a1810'));
  // el río adelante con las velitas de papel flotando
  p.vgrad(344, 360, [C('#141a40'), C('#0c1030')]);
  for (let i = 0; i < 26; i++) { const xx = X0 + r() * AW, yy = 347 + r() * 10; p.rect(xx - 2, yy, 5, 2, C('#e8dcc0')); p.px(xx, yy - 1, C('#ffcf5a')); p.circle(xx, yy - 1, 3, C('#ffcf5a'), 40); }
  return p.done();
}


/**
 * Parque Tao Đàn en Saigón, de mañana: los árboles dầu gigantes, la reja del parque con las motos pasando detrás,
 * las torres de la ciudad a lo lejos, gente haciendo tai chi y la cancha de tierra apisonada de đá cầu.
 */
function taodan(): HTMLCanvasElement {
  const p = new Painter(W, H, M);
  const r = rng(81);
  p.vgrad(0, 200, [C('#8cc4e8'), C('#b4dcf0'), C('#e2f0f0'), C('#f6eedc')]);
  // la ciudad a lo lejos: Landmark 81 y Bitexco entre las torres
  buildings(p, { x0: X0, x1: X1, base: 196, minH: 16, maxH: 54, minW: 14, maxW: 30, cols: [C('#9ab0c4'), C('#a8bccc'), C('#8ca4b8')], win: C('#d8e4ec'), winOff: C('#7a92a8'), lit: 0.4, seed: 82 });
  for (let y = 60; y < 196; y++) { const half = Math.round(3 + ((y - 60) / 136) * 11); p.rect(520 - half, y, half * 2, 1, C('#8aa0b6')); }
  p.rect(519, 50, 2, 10, C('#8aa0b6'));
  for (let y = 104; y < 196; y++) { const half = Math.round(5 + ((y - 104) / 92) * 5); p.rect(120 - half, y, half * 2, 1, C('#94aabe')); }
  p.rect(108, 126, 20, 3, C('#94aabe'));
  // la calle detrás de la reja, con motos
  p.rect(X0, 196, AW, 22, C('#7a7a84'));
  for (let x = desde(0, 30); x < X1; x += 30) p.rect(x, 207, 14, 1, C('#e8e8e0'));
  const motos: [number, number, string][] = [[60, 204, '#d03a3a'], [190, 210, '#3a6ad0'], [300, 203, '#2a2a2a'], [450, 211, '#e8c030'], [590, 205, '#3aa060']];
  for (const [x, y, c] of motos) {
    p.rect(x - 7, y + 3, 14, 3, C(c));
    p.circle(x - 5, y + 7, 2, C('#1a1a1a')); p.circle(x + 5, y + 7, 2, C('#1a1a1a'));
    p.rect(x - 2, y - 4, 4, 7, C('#3a5aa0'));
    p.circle(x, y - 6, 2, C(['#f2c230', '#e83a3a', '#ffffff'][x % 3]));
  }
  // la reja amarilla del parque
  p.rect(X0, 222, AW, 2, C('#c8a040'));
  p.rect(X0, 236, AW, 2, C('#c8a040'));
  for (let x = desde(0, 6); x < X1; x += 6) p.rect(x, 218, 1, 26, C('#b89030'));
  // los árboles dầu: troncos altísimos y copas anchas que tapan el cielo de arriba
  const copa = (cx: number, cy: number, rad: number) => {
    for (let i = 0; i < rad * 9; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad; p.circle(cx + Math.cos(a) * d * 1.4, cy + Math.sin(a) * d * 0.7, 3 + r() * 4, r() < 0.5 ? C('#2e6a3a') : r() < 0.6 ? C('#3e7a44') : C('#5a9a4e')); }
  };
  for (const [x, top] of [[-30, 58], [175, 70], [465, 62], [690, 66]] as [number, number][]) {
    // el tronco grueso y claro de los dầu, con sus raíces abiertas al pie
    for (let y = top; y < 262; y++) {
      const w = 14 + Math.max(0, (y - 236) * 0.9);
      p.rect(x - w / 2, y, w, 1, C('#8a7a68'));
      p.rect(x - w / 2, y, 3, 1, C('#5e5044'));
      p.rect(x + w / 2 - 3, y, 3, 1, C('#a89a86'));
      if (y % 11 === 0) p.rect(x - w / 2 + 3, y, w - 6, 1, C('#6e6050'));
    }
    copa(x, top - 6, 58);
    copa(x - 40, top + 14, 30);
    copa(x + 42, top + 10, 32);
  }
  // gente haciendo tai chi y una señora barriendo, chiquitos al fondo
  for (const [x, c] of [[150, '#e8e0d0'], [168, '#f2c2c2'], [186, '#e8e0d0'], [470, '#a8c8e8'], [488, '#e8e0d0']] as [number, string][]) {
    p.rect(x - 2, 240, 4, 9, C(c)); p.circle(x, 237, 2, C('#e0b090')); p.rect(x - 5, 242, 10, 1, C(c)); p.rect(x - 2, 249, 1, 5, C('#3a3a4a')); p.rect(x + 1, 249, 1, 5, C('#3a3a4a'));
  }
  // el pasto y la cancha de tierra apisonada
  p.rect(X0, 244, AW, 26, C('#5a9a4e'));
  for (let i = 0; i < 500; i++) p.px(X0 + r() * AW, 244 + r() * 26, r() < 0.5 ? C('#4a8a40') : C('#6aaa5a'));
  p.vgrad(270, 340, [C('#c8a070'), C('#b88e5e'), C('#a87e50')]);
  for (let i = 0; i < 1600; i++) p.px(X0 + r() * AW, 270 + r() * 70, r() < 0.5 ? C('#a07848') : C('#d4b080'));
  p.rect(X0, 340, AW, 20, C('#5a9a4e'));
  for (let i = 0; i < 300; i++) p.px(X0 + r() * AW, 340 + r() * 20, r() < 0.5 ? C('#4a8a40') : C('#6aaa5a'));
  return p.done();
}


/**
 * La Candelaria en Bogotá, de tarde nublada: Monserrate con su iglesia blanca arriba, las casas coloniales de colores
 * con techo de teja y balcones de madera, banderitas de Colombia y la cancha de tejo de arena.
 */
function candelaria(): HTMLCanvasElement {
  const p = new Painter(W, H, M);
  const r = rng(91);
  p.vgrad(0, 180, [C('#8aa4c0'), C('#a8bcd0'), C('#c8d4dc'), C('#dcdcd4')]);
  // nubes de Bogotá
  for (let i = 0; i < 14; i++) { const cx = X0 + r() * AW, cy = 20 + r() * 60; for (let k = 0; k < 7; k++) p.circle(cx + k * 9 - 27, cy + Math.sin(k) * 3, 8 + r() * 5, C('#eef0f2'), 200); }
  // Monserrate: el cerro empinado, verde oscuro, con la iglesia blanca en la punta y el teleférico
  const cerro = (x: number) => 190 - 150 * Math.exp(-Math.pow((x - 300) / 110, 2)) - 40 * Math.exp(-Math.pow((x - 520) / 160, 2));
  for (let x = X0; x < X1; x++) { const top = Math.round(cerro(x)); for (let y = top; y < 200; y++) p.px(x, y, (x + y) % 7 === 0 ? C('#3e6a46') : y < top + 3 ? C('#5a8a5a') : C('#2e5a3a')); }
  p.rect(292, 34, 16, 10, C('#f4f4ec')); p.rect(296, 26, 4, 8, C('#f4f4ec')); p.rect(302, 28, 4, 6, C('#f4f4ec')); p.px(298, 24, C('#c8a040')); p.px(304, 26, C('#c8a040'));
  p.line(140, 160, 296, 46, C('#3a3a40'));
  p.rect(214, 101, 5, 4, C('#d03a3a'));
  // casas coloniales de colores con techo de teja y balcón de madera verde
  let x = X0 - 6;
  while (x < X1) {
    const w = 54 + Math.floor(r() * 30), top = 150 + Math.floor(r() * 26);
    const pared = [C('#f2d26a'), C('#7ab0e0'), C('#f4f0e2'), C('#e88a5a'), C('#9ad0a0'), C('#e8a0b8')][Math.floor(r() * 6)];
    const sombra: RGB = [pared[0] * 0.75, pared[1] * 0.72, pared[2] * 0.7];
    p.rect(x, top, w, 262 - top, pared);
    p.rect(x + w - 3, top, 3, 262 - top, sombra);
    p.rect(x, 252, w, 10, sombra);
    for (let k = 0; k < 7; k++) p.rect(x - 4 + k, top - 7 + k, w + 8 - 2 * k, 1, k % 2 ? C('#a8442e') : C('#c0583a'));
    for (let tx = x - 3; tx < x + w + 3; tx += 3) p.rect(tx, top - 7, 1, 7, C('#8a3424'));
    // ventanas con reja y el balcón de madera
    for (let wx = x + 7; wx < x + w - 14; wx += 18) {
      p.rect(wx, top + 12, 10, 14, C('#3a4a5a'));
      for (let k = 0; k < 10; k += 3) p.rect(wx + k, top + 12, 1, 14, C('#2a3a2a'));
    }
    if (r() < 0.6) { p.rect(x + 4, top + 28, w - 8, 3, C('#2e6a3a')); for (let bx2 = x + 5; bx2 < x + w - 5; bx2 += 3) p.rect(bx2, top + 31, 1, 6, C('#2e6a3a')); }
    // puerta de madera grande
    p.rect(x + Math.floor(w / 2) - 7, 232, 14, 22, C('#5a3420'));
    p.rect(x + Math.floor(w / 2) - 1, 232, 1, 22, C('#3a2014'));
    // matas en el balcón
    if (r() < 0.5) for (let i = 0; i < 16; i++) p.px(x + 6 + r() * (w - 12), top + 26 + r() * 3, r() < 0.6 ? C('#e83a5a') : C('#2a7a3a'));
    x += w + 1;
  }
  // el letrero de la cancha
  p.rect(380, 196, 120, 18, C('#f4ecd8'));
  p.rect(380, 196, 120, 2, C('#c0302a'));
  p.rect(380, 212, 120, 2, C('#2a3aa0'));
  // banderitas de Colombia cruzando la calle
  for (const [y0, y1] of [[150, 158], [176, 170]] as [number, number][]) {
    p.cable(X0, y0, X1, y1, 14, C('#4a4a4a'));
    for (let fx = X0 + 6; fx < X1; fx += 12) {
      const u = (fx - X0) / AW, fy = Math.round(y0 + (y1 - y0) * u + 14 * 4 * u * (1 - u)) + 1;
      const col = [C('#f2d230'), C('#2a3aa0'), C('#d02a2a')][Math.floor((fx - X0) / 12) % 3];
      for (let k = 0; k < 5; k++) p.rect(fx - 2 + Math.floor(k / 2), fy + k, 5 - k, 1, col);
    }
  }
  // la cancha: piso de arena y el andén
  p.rect(X0, 262, AW, 6, C('#9a9a94'));
  p.vgrad(268, 344, [C('#c8a878'), C('#b89868'), C('#a88a5c')]);
  for (let i = 0; i < 1400; i++) p.px(X0 + r() * AW, 268 + r() * 76, r() < 0.5 ? C('#a88a5a') : C('#d8bc8a'));
  p.rect(X0, 344, AW, 16, C('#7a7a74'));
  for (let xx = desde(0, 30); xx < X1; xx += 30) p.rect(xx, 344, 1, 16, C('#5a5a54'));
  return p.done();
}


/**
 * Hà Nội de madrugada: el lago Hoàn Kiếm con la Torre de la Tortuga en su islote, el puente rojo Thê Húc hacia el
 * templo Ngọc Sơn, los sauces, la neblina, y el tatami del dojo al aire libre en la orilla.
 */
function hanoi(): HTMLCanvasElement {
  const p = new Painter(W, H, M);
  const r = rng(101);
  p.vgrad(0, 150, [C('#f2c8a8'), C('#f6dcc0'), C('#eae6d8'), C('#d8e0d8')]);
  // la ciudad vieja a lo lejos, entre la neblina
  buildings(p, { x0: X0, x1: X1, base: 150, minH: 10, maxH: 34, minW: 16, maxW: 34, cols: [C('#c8c4bc'), C('#bcb8b2'), C('#d0ccc4')], win: C('#e8e2d8'), winOff: C('#aaa49c'), lit: 0.3, seed: 102 });
  for (let y = 110; y < 150; y++) for (let x = X0; x < X1; x++) if ((x * 5 + y * 3) % 4 === 0) p.px(x, y, C('#f0ece4'), 90);
  // el lago, verde y quieto
  p.vgrad(150, 232, [C('#8aa89a'), C('#6e9484'), C('#5a8474')]);
  for (let i = 0; i < 300; i++) p.rect(X0 + r() * AW, 152 + r() * 78, 2 + r() * 6, 1, r() < 0.5 ? C('#a8c4b4') : C('#4e7666'), 160);
  // la Torre de la Tortuga en su islote
  p.circle(470, 168, 18, C('#4a6a4a'));
  p.rect(452, 166, 36, 6, C('#3e5e3e'));
  p.rect(462, 132, 16, 34, C('#c8b89a'));
  p.rect(464, 120, 12, 12, C('#c0b090'));
  p.rect(467, 110, 6, 10, C('#b8a888'));
  for (const [y, w] of [[132, 22], [120, 18], [110, 12]] as [number, number][]) p.rect(470 - w / 2, y - 2, w, 2, C('#7a5a44'));
  for (let k = 0; k < 3; k++) { p.rect(465 + k * 4, 140, 2, 6, C('#5a4a3a')); p.rect(465 + k * 4, 150, 2, 6, C('#5a4a3a')); }
  // el puente rojo Thê Húc, en arco, y el templo Ngọc Sơn al final
  for (let x = 40; x <= 230; x++) {
    const u = (x - 40) / 190, y = 196 - Math.sin(u * Math.PI) * 18;
    p.rect(x, y, 1, 4, C('#d02a2a'));
    if (x % 6 === 0) p.rect(x, y - 6, 1, 6, C('#b02020'));
    p.rect(x, y - 6, 1, 1, C('#e04040'));
    if (x % 24 === 0) p.rect(x, y + 4, 2, 232 - y - 4, C('#8a2020'));
  }
  p.rect(222, 170, 46, 26, C('#c8a060'));
  for (let k = 0; k < 7; k++) p.rect(216 + k, 162 + k, 58 - 2 * k, 1, k % 2 ? C('#5a3a2a') : C('#7a4a30'));
  p.rect(238, 180, 14, 16, C('#5a2a1a'));
  // sauces llorones en la orilla
  for (const x of [-30, 330, 610]) {
    p.rect(x - 3, 120, 6, 112, C('#5a4a3a'));
    for (let i = 0; i < 220; i++) { const a = r() * Math.PI, d = r() * 50; const lx = x + Math.cos(a) * d * 1.3, ly = 110 + Math.sin(a) * 20 - 10; for (let k = 0; k < 8 + r() * 30; k += 2) p.px(lx, ly + k, r() < 0.5 ? C('#6a9a4a') : C('#8aba5a')); }
  }
  // la orilla y la tarima del dojo
  p.rect(X0, 232, AW, 14, C('#7a5a3e'));
  p.rect(X0, 232, AW, 2, C('#9a7a5a'));
  for (let xx = desde(0, 20); xx < X1; xx += 20) p.rect(xx, 234, 1, 12, C('#5a4030'));
  // el tatami: esteras verdes y amarillas con sus bordes
  for (let y = 246; y < 344; y++) for (let x = p.x0; x < p.x1; x++) {
    const cx = Math.floor((x + 400) / 64), cy = Math.floor((y - 246) / 33);
    p.px(x, y, (cx + cy) % 2 ? C('#c8c070') : C('#9ab05a'));
  }
  for (let y = 246; y < 344; y += 33) p.rect(X0, y, AW, 1, C('#5a6a3a'));
  for (let x = desde(0, 64) - 16; x < X1; x += 64) p.rect(x, 246, 1, 98, C('#5a6a3a'));
  for (let i = 0; i < 1600; i++) p.px(X0 + r() * AW, 246 + r() * 98, C('#6a7a4a'), 70);
  // la zona de combate, en rojo
  p.rect(100, 252, 440, 2, C('#c03a2a'));
  p.rect(100, 336, 440, 2, C('#c03a2a'));
  p.rect(100, 252, 2, 86, C('#c03a2a'));
  p.rect(538, 252, 2, 86, C('#c03a2a'));
  p.rect(X0, 344, AW, 16, C('#6a4a32'));
  for (let xx = desde(0, 24); xx < X1; xx += 24) p.rect(xx, 344, 1, 16, C('#4a3022'));
  return p.done();
}

/**
 * Cartagena al atardecer: el cielo naranja y rosado, el sol bajando sobre el Caribe, la muralla, la Torre del Reloj
 * amarilla, la cúpula de San Pedro Claver y los techos de teja de la ciudad amurallada. Las azoteas de la prueba van
 * encima, en el mundo.
 */
function cartagena(): HTMLCanvasElement {
  const p = new Painter(W, H, M);
  const r = rng(57);
  p.vgrad(0, 176, [C('#3a3470'), C('#7a3e7a'), C('#d0607a'), C('#f2904a'), C('#f8c868')]);
  // el sol, a medio hundir
  p.circle(470, 168, 26, C('#ffe6a0'));
  p.circle(470, 168, 22, C('#fff4d0'));
  // nubes largas, encendidas por abajo
  for (let i = 0; i < 9; i++) {
    const cx = X0 + r() * AW, cy = 40 + r() * 90, w = 40 + r() * 70;
    p.rect(cx, cy, w, 3, C('#f4a0a0'), 200);
    p.rect(cx + 6, cy + 3, w - 12, 2, C('#ffd0a0'), 220);
  }
  // el mar: el reflejo del sol en rayitas
  p.vgrad(170, 200, [C('#3a4a8a'), C('#2a3a70')]);
  for (let y = 172; y < 200; y += 3) for (let k = 0; k < 4; k++) { const w = 14 - (y - 172) / 3 + r() * 6; p.rect(470 - w / 2 + (r() - 0.5) * 10, y, w, 1, C('#ffd890'), 220); }
  for (let i = 0; i < 120; i++) p.px(X0 + r() * AW, 172 + r() * 28, C('#5a6aa8'));
  // gaviotas
  for (let i = 0; i < 7; i++) { const x = X0 + r() * AW, y = 60 + r() * 70; p.px(x, y, C('#2a1a3a')); p.px(x - 1, y - 1, C('#2a1a3a')); p.px(x + 1, y - 1, C('#2a1a3a')); p.px(x - 2, y - 1, C('#2a1a3a')); p.px(x + 2, y - 1, C('#2a1a3a')); }
  // la muralla de piedra coralina
  p.rect(X0, 196, AW, 12, C('#b8945a'));
  p.rect(X0, 196, AW, 2, C('#d8b47a'));
  for (let x = desde(0, 10); x < X1; x += 10) p.rect(x, 192, 6, 4, C('#b8945a'));
  // la cúpula y el campanario de San Pedro Claver
  p.rect(520, 140, 40, 60, C('#e8b05a'));
  p.circle(540, 140, 18, C('#d8984a'));
  p.rect(522, 140, 36, 2, C('#f8d890'));
  p.rect(538, 118, 4, 6, C('#f4f0e2'));
  p.rect(566, 120, 14, 80, C('#e8c070'));
  p.rect(568, 112, 10, 8, C('#d8a050'));
  p.rect(571, 106, 4, 6, C('#f4f0e2'));
  for (let y = 130; y < 190; y += 14) p.rect(570, y, 6, 8, C('#6a3a2a'));
  // la Torre del Reloj: amarilla, con su reloj y la puerta de arcos
  const tx = 168;
  p.rect(tx, 120, 44, 86, C('#f2c84a'));
  p.rect(tx + 40, 120, 4, 86, C('#c8a03a'));
  p.rect(tx + 6, 104, 32, 16, C('#f4d870'));
  p.rect(tx + 12, 92, 20, 12, C('#f2c84a'));
  p.rect(tx + 18, 82, 8, 10, C('#d8a040'));
  p.rect(tx + 21, 76, 2, 6, C('#2a2a2a'));
  p.circle(tx + 22, 132, 8, C('#f4f0e2'));
  p.line(tx + 22, 132, tx + 22, 127, C('#2a2a2a'));
  p.line(tx + 22, 132, tx + 26, 132, C('#2a2a2a'));
  for (const ax of [tx + 6, tx + 18, tx + 30]) { p.rect(ax, 180, 8, 26, C('#5a3a2a')); p.circle(ax + 4, 180, 4, C('#5a3a2a')); }
  // los techos de teja de la ciudad, en filas
  for (const [y0, col, alto] of [[198, '#a8503a', 10], [206, '#c0603e', 14]] as [number, string, number][]) {
    let x = X0 - 10;
    while (x < X1) {
      const w = 20 + Math.floor(r() * 30), h = alto + Math.floor(r() * 6);
      const pared = [C('#f2d26a'), C('#7ab0e0'), C('#f4f0e2'), C('#e88a5a'), C('#e8a0b8'), C('#9ad0a0')][Math.floor(r() * 6)];
      p.rect(x, y0, w, 40, pared);
      for (let k = 0; k < 4; k++) p.rect(x - 2 + k, y0 - h / 2 + k, w + 4 - 2 * k, 1, C(col));
      p.rect(x, y0 - h / 2 + 4, w, 3, C(col));
      if (r() < 0.5) for (let i = 0; i < 6; i++) p.px(x + r() * w, y0 + 2 + r() * 4, C('#e0368a'));
      x += w + 1;
    }
  }
  p.rect(X0, 222, AW, H - 222, C('#6a3a3a'));
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
  add('bg_hoian_lejos', hoianLejos());
  add('bg_hoian', hoianCalle());
  add('bg_taodan', taodan());
  add('bg_candelaria', candelaria());
  add('bg_hanoi', hanoi());
  add('bg_cartagena', cartagena());
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
