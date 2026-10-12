import Phaser from 'phaser';
import { Painter, hex, rng, type RGB } from './paint';

/**
 * El mapa de la gira: el Pacífico con Asia a la izquierda y América a la derecha, pintado en pixel art desde
 * coordenadas reales (longitud este de 90 a 300, latitud de 50 norte a 25 sur), y el jet de la Nekketsu Air.
 */

const W = 640, H = 360;
const LON0 = 90, LON1 = 300, LAT0 = 50, LAT1 = -25;
const C = (s: string) => hex(s);

/** Longitud (este positivo, oeste negativo) y latitud a pixeles del mapa. */
export function lugar(lon: number, lat: number): [number, number] {
  const e = lon < 0 ? lon + 360 : lon;
  return [((e - LON0) / (LON1 - LON0)) * W, ((LAT0 - lat) / (LAT0 - LAT1)) * H];
}

/** Las paradas de la gira, en el mapa. */
export const PARADAS = [
  { k: 'jp', ciudad: 'TOKIO', pais: 'JAPÓN', at: lugar(139.7, 35.7) },
  { k: 'vn', ciudad: 'SAIGÓN', pais: 'VIETNAM', at: lugar(106.7, 10.8) },
  { k: 'co', ciudad: 'BOGOTÁ', pais: 'COLOMBIA', at: lugar(-74.1, 4.7) },
  { k: 've', ciudad: 'CARACAS', pais: 'VENEZUELA', at: lugar(-66.9, 10.5) },
];

type LL = [number, number][];

// costas simplificadas, en [longitud este, latitud]
const ASIA: LL = [
  [90, 50], [140, 50], [138, 46], [135, 43], [131, 42.5], [129.5, 40], [129.4, 36], [126.6, 34.4], [126.2, 36.8], [125, 39.6],
  [121.5, 39], [119.4, 39.3], [118, 38.4], [119.2, 37.2], [122.5, 37.3], [120.3, 35.8], [119.4, 34.4], [120.8, 32.6], [121.9, 31],
  [121.8, 29.5], [120.2, 26.6], [118.6, 24.6], [116.6, 23.2], [114.2, 22.3], [111.5, 21.5], [110.2, 20.8], [109.6, 21.6],
  [108, 21.5], [106.6, 20.4], [105.7, 18.8], [106.7, 17.2], [108.8, 15.4], [109.4, 12.6], [109, 11.2], [107.2, 10.4],
  [106.2, 9.5], [105, 8.6], [104.7, 10.2], [103.5, 10.6], [102.6, 12.2], [100.9, 13.4], [99.9, 12.2], [99.2, 9.6], [100.3, 7],
  [101.2, 6.8], [103.2, 5.2], [103.5, 2.8], [104.3, 1.4], [103.4, 1.3], [101.4, 2.7], [100.4, 4.8], [100.2, 6.5], [98.4, 8.2],
  [98.6, 10.8], [98.4, 13.2], [97.6, 16.5], [96, 17], [94.4, 16], [94.2, 18.8], [92.6, 20.6], [92, 21.8], [90, 22],
];
const ISLAS_ASIA: LL[] = [
  // Japón: Hokkaido, Honshu, Shikoku y Kyushu
  [[140, 41.5], [140.4, 43.2], [141.7, 45.4], [143.4, 44.2], [145.5, 43.4], [143.3, 42], [141.2, 41.8]],
  [[130.9, 34.3], [132.2, 35.5], [135, 35.7], [136, 37], [137.3, 37.5], [139.5, 38.4], [139.9, 40.6], [141.4, 41.4], [142, 39.4],
    [140.9, 37.2], [140.8, 35.7], [139.8, 35], [138.8, 34.6], [136.8, 34.4], [135.1, 33.6], [133, 34.2], [131.6, 33.9]],
  [[132.6, 33.9], [134.7, 34.2], [134.6, 33.3], [133.2, 32.8]],
  [[129.7, 33.5], [131.9, 33.2], [131.3, 31.3], [130.2, 31], [129.7, 32.5]],
  // Taiwán y Hainan
  [[120.1, 23], [121, 25.3], [122, 25], [121.5, 22.5], [120.7, 21.9]],
  [[108.6, 19.2], [110.5, 20.1], [111, 19.6], [110, 18.2], [109, 18.4]],
  // Filipinas: Luzón, Visayas y Mindanao
  [[120, 18.5], [122.3, 18.5], [122.1, 16.2], [124.2, 13.2], [123, 13.4], [121.6, 13.9], [120.6, 14.4], [119.8, 16.2]],
  [[122.4, 11.8], [125.4, 12.4], [125.8, 10.3], [124, 9.6], [122.3, 9.9]],
  [[122, 7], [122.5, 8.1], [125.5, 9.8], [126.5, 7.3], [125.4, 5.6], [124, 6.3]],
  // Borneo, Sumatra, Java, Sulawesi y Nueva Guinea
  [[109.6, -1], [109, 1.5], [111.5, 2.5], [113.5, 4.5], [115.5, 5], [117, 7], [119, 5], [117.8, 1], [116.5, -1.5], [116, -4],
    [114, -3.5], [111, -3], [110, -1.8]],
  [[95.3, 5.6], [98, 4], [100.5, 1.5], [104, -1.5], [106, -5.9], [104.6, -5.9], [101.5, -3], [98.7, 0.5], [97.5, 2.3]],
  [[105.2, -6.8], [108, -6.3], [111, -6.5], [114.5, -7.7], [114.4, -8.7], [110, -8.1], [106.4, -7.4]],
  [[119.4, -5.5], [119.5, 0.5], [121, 1.2], [125, 1.5], [122.8, -0.8], [121, -1], [123.3, -4.5], [121, -4.2], [120.5, -2.8], [120.3, -5.5]],
  [[131, -1], [134, -0.9], [137.5, -1.5], [141, -2.6], [145, -4.3], [147.5, -6.2], [150, -10.4], [147, -10.1], [144, -7.6],
    [141, -9.1], [138, -8.3], [137.8, -5.3], [135, -4.4], [132, -2.8]],
  // norte de Australia
  [[113.5, -26], [113.7, -22], [116.7, -20.6], [121, -19.5], [122.3, -17], [125, -14.6], [127, -14], [129.5, -15], [130.5, -12.4],
    [132.6, -11.5], [136.8, -12.2], [135.5, -15], [140, -17.6], [141.6, -12.6], [142.5, -10.7], [143.5, -14], [145.3, -15],
    [146.3, -19], [149, -21.5], [150.8, -23], [153.2, -25.2], [153.4, -26]],
  // Hawái
  [[204.5, 20.3], [205.2, 19.8], [205, 19], [204.2, 19.3]],
  [[203.4, 21.2], [204.1, 21], [203.8, 20.6]],
  [[201.8, 21.7], [202.4, 21.5], [202.1, 21.2]],
];
const AMERICA: LL = [
  [235.5, 50], [236, 48.4], [235.9, 46], [235.6, 43], [235.6, 40.4], [237.5, 38], [239.4, 34.5], [242.8, 32.5],
  // Baja California y el golfo
  [244, 30], [245.8, 28], [247.6, 25], [250.1, 22.9], [250.5, 24.5], [248, 28], [245.4, 31.4], [246.8, 31.6],
  [248.5, 28], [250.6, 25.5], [254.6, 21.3], [255.5, 19.3], [258.5, 18.2], [261.5, 16.8], [264.5, 15.8], [267.5, 14.4],
  [270.5, 13.4], [272.4, 12.6], [274, 11.2], [275, 9.8], [276.7, 8.2], [278.4, 8.2], [279.8, 7.4], [280.8, 8.4], [282.2, 8.6],
  // costa del Pacífico de Colombia, Ecuador y Perú
  [282.6, 6.8], [282.7, 4], [281.6, 2], [280.1, 0.9], [279.1, -2.4], [279.6, -4.4], [278.8, -6.2], [280.6, -10.2], [283.2, -14.6],
  [286, -17.5], [289.7, -18.5], [289.8, -26], [301, -26], [301, 8.4],
  // costa del Caribe, de Guyana hacia el oeste
  [299.5, 8.6], [298, 10.1], [298.3, 10.7], [296, 10.6], [293, 10.6], [291.8, 10.5], [290.4, 11.4], [289.8, 11.9],
  [289.2, 11.3], [288.3, 11.5], [287.6, 12.3], [286.7, 12.4], [285.8, 11.6], [285.1, 11.2], [284.5, 10.4], [283.5, 9.4],
  [282.9, 8.6], [282.4, 9.2], [281, 9.6], [279.6, 9.2], [277.6, 10.2], [276.4, 11.2], [276.4, 14.9], [276.8, 15.6], [275, 15.9],
  [272.2, 15.8], [271.7, 17.4], [272.6, 18.6], [272.8, 21.4], [270.3, 21.5], [269.5, 20.3], [268.4, 18.7], [265.8, 18.3],
  [264.1, 19.3], [262.5, 21], [262.2, 24], [262.6, 25.8], [262.7, 27.6], [263.2, 28.5], [265.3, 29.5], [266.9, 29.4],
  [270.6, 29.2], [270.9, 30.3], [274.4, 30.2], [275.2, 29.7], [277.3, 27], [278.8, 25.2], [279.9, 26.8], [279.6, 30.5],
  [281.2, 32.2], [283.4, 34], [284.4, 35.2], [284.2, 36.9], [285.9, 38.9], [286.2, 40.5], [290, 41.5], [290.2, 43.6],
  [293.5, 44.4], [294.4, 45.4], [296.2, 45], [298, 46.2], [301, 46.6], [301, 51], [235.5, 51],
];
const ISLAS_AMERICA: LL[] = [
  // Cuba, La Española, Jamaica y Puerto Rico
  [[275.1, 21.9], [277.5, 23.2], [280, 23.1], [283.8, 20.2], [282, 19.9], [278.5, 21.5], [276, 21.8]],
  [[285.6, 19.9], [288, 19.8], [291.6, 18.5], [288.5, 17.6], [286, 18.3]],
  [[281.7, 18.5], [283.6, 18.1], [282, 17.8]],
  [[292.8, 18.4], [294.4, 18.3], [294.3, 18], [292.8, 18]],
  // Trinidad
  [[298.2, 10.8], [299.1, 10.8], [299, 10.1], [298.3, 10.1]],
];
/** El lago de Maracaibo, de vuelta en agua. */
const MARACAIBO: LL = [[288.3, 10.7], [288.6, 10.7], [288.9, 9.8], [288.6, 9.1], [288.2, 9.4], [288.2, 10.3]];

function toPx(poly: LL): [number, number][] { return poly.map(([lo, la]) => lugar(lo, la)); }

/** Relleno de polígono por par/impar, pixel por pixel. */
function fill(mask: Uint8Array, poly: [number, number][], v: number) {
  const ys = poly.map((p) => p[1]);
  const y0 = Math.max(0, Math.floor(Math.min(...ys))), y1 = Math.min(H - 1, Math.ceil(Math.max(...ys)));
  for (let y = y0; y <= y1; y++) {
    const cy = y + 0.5;
    const xs: number[] = [];
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > cy) !== (yj > cy)) xs.push(xi + ((cy - yi) / (yj - yi)) * (xj - xi));
    }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      for (let x = Math.max(0, Math.round(xs[k])); x < Math.min(W, Math.round(xs[k + 1])); x++) mask[y * W + x] = v;
    }
  }
}

function mapaMundo(): HTMLCanvasElement {
  const p = new Painter(W, H);
  const land = new Uint8Array(W * H);
  fill(land, toPx(ASIA), 1);
  for (const i of ISLAS_ASIA) fill(land, toPx(i), 1);
  fill(land, toPx(AMERICA), 1);
  for (const i of ISLAS_AMERICA) fill(land, toPx(i), 1);
  fill(land, toPx(MARACAIBO), 0);
  const isLand = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && land[y * W + x] === 1;
  // distancia a la costa (hasta 6) para playas, aguas bajas y relieve
  const dist = new Uint8Array(W * H).fill(9);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const me = isLand(x, y);
    let d = 9;
    for (let r = 1; r <= 6 && d === 9; r++) {
      for (let k = -r; k <= r && d === 9; k++) {
        if (isLand(x + k, y - r) !== me || isLand(x + k, y + r) !== me || isLand(x - r, y + k) !== me || isLand(x + r, y + k) !== me) d = r;
      }
    }
    dist[y * W + x] = d;
  }
  const r = rng(77);
  const deep = [C('#0a2a5c'), C('#0e3a78'), C('#14508f')];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const d = dist[y * W + x];
    if (!isLand(x, y)) {
      // océano: más claro cerca de la costa, tramado
      if (d <= 1) p.px(x, y, C('#7fd0f0'));
      else if (d <= 3) p.dither(x, y, C('#3a9ad0'), C('#2a78b8'), (d - 1) / 3);
      else {
        // degradé suave de arriba (más oscuro) hacia abajo, tramado entre vecinos para que no haga franjas
        const t = (y / H) * 2, i = Math.min(1, Math.floor(t));
        p.dither(x, y, deep[i], deep[i + 1], t - i);
      }
    } else {
      // tierra: playa, verde, y relieve adentro; más seco hacia el norte de México y Australia
      const lat = LAT0 - (y / H) * (LAT0 - LAT1);
      // lo seco (norte de México, interior de Australia) se mezcla de a poco con el verde, con ruido
      const ruido = Math.sin(x * 0.21) * Math.cos(y * 0.17) * 0.25;
      const b0 = Math.max(0, x > 470 ? 1 - Math.abs(lat - 29) / 7 : 0) + (lat < -13 ? (-lat - 13) / 5 : 0);
      const seco = b0 > 0 ? Phaser.Math.Clamp(b0 + ruido, 0, 1) : 0;
      const verde: RGB = lat > 40 ? C('#5a9a4a') : C('#3e9a3e');
      if (d <= 1) p.px(x, y, C('#f0dca0'));
      else if (d >= 6 && r() < 0.16) p.px(x, y, seco > 0.5 ? C('#a88a48') : C('#2e7a32'));
      else p.dither(x, y, verde, C('#c8a860'), seco);
    }
  }
  // olitas en el mar
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H);
    if (dist[y * W + x] >= 5 && !isLand(x, y) && !isLand(x + 2, y)) { p.px(x, y, C('#4a8ad0')); p.px(x + 1, y - 1, C('#4a8ad0')); p.px(x + 2, y, C('#4a8ad0')); }
  }
  // cuadrícula de meridianos y paralelos cada 15 grados, punteada
  for (let lon = 105; lon < 300; lon += 15) { const [x] = lugar(lon, 0); for (let y = 0; y < H; y += 3) if (!isLand(Math.round(x), y)) p.px(x, y, C('#2a5a9a')); }
  for (let lat = 45; lat > -25; lat -= 15) { const [, y] = lugar(100, lat); for (let x = 0; x < W; x += 3) if (!isLand(x, Math.round(y))) p.px(x, y, C('#2a5a9a')); }
  const [, ecu] = lugar(100, 0);
  for (let x = 0; x < W; x += 2) if (!isLand(x, Math.round(ecu))) p.px(x, ecu, C('#5a8ac8'));
  // rosa de los vientos en el Pacífico sur
  const [cx, cy] = lugar(215, -12);
  for (let k = -14; k <= 14; k++) { const w = Math.max(0, 3 - Math.floor(Math.abs(k) / 4)); p.rect(cx - w, cy + k, w * 2 + 1, 1, C('#e8d8a0')); p.rect(cx + k, cy - w, 1, w * 2 + 1, C('#e8d8a0')); }
  p.rect(cx - 1, cy - 16, 3, 3, C('#d02a2a'));
  return p.done();
}

/** Jet de lado, mirando a la derecha. Las ventanas 3 a 6 quedan libres para asomar cabecitas. */
export const JET = { w: 168, h: 52, ventanas: [[92, 22], [104, 22], [116, 22], [128, 22]] as [number, number][] };
function jet(): HTMLCanvasElement {
  const p = new Painter(JET.w, JET.h);
  const white = C('#f4f4f8'), shade = C('#c0c4d0'), dark = C('#8a8ea0'), red = C('#d0202a'), navy = C('#1a2a5a');
  // cola: deriva con el sol rojo
  for (let y = 2; y < 22; y++) { const x0 = 6 + Math.floor((22 - y) * 0.7); p.rect(x0, y, 26 - Math.floor((22 - y) * 0.35), 1, white); }
  p.circle(22, 12, 5, red);
  p.rect(4, 22, 30, 3, white);
  // fuselaje con panza en sombra
  for (let x = 8; x < 158; x++) {
    const nose = x > 140 ? Math.round(((x - 140) / 18) ** 2 * 9) : 0;
    const tail = x < 40 ? Math.round(((40 - x) / 32) * 8) : 0;
    const top = 16 + tail + Math.floor(nose * 0.6), bot = 36 - Math.floor(nose * 0.5);
    if (top >= bot) continue;
    p.rect(x, top, 1, bot - top, white);
    p.rect(x, bot - 4, 1, 4, shade);
    p.px(x, bot - 1, dark);
    if (x > 30 && x < 146) { p.px(x, top + 10, red); p.px(x, top + 11, red); p.px(x, top + 12, navy); }
  }
  // cabina
  p.rect(146, 20, 6, 3, navy); p.rect(152, 21, 3, 2, navy);
  // ventanas
  for (let x = 44; x < 140; x += 6) p.rect(x, 22, 3, 3, navy);
  for (const [x, y] of JET.ventanas) { p.rect(x - 5, y - 5, 11, 10, navy); p.rect(x - 4, y - 4, 9, 8, C('#7ab4e8')); }
  // puerta
  p.rect(138, 20, 1, 10, dark); p.rect(142, 20, 1, 10, dark);
  // ala y motor
  for (let k = 0; k < 10; k++) p.rect(66 + k * 3, 30 + k, 30, 1, k % 3 === 0 ? shade : C('#d8dce4'));
  p.rect(88, 39, 22, 7, C('#d8dce4')); p.rect(88, 44, 22, 2, dark); p.rect(108, 40, 3, 5, C('#30303a'));
  p.rect(84, 40, 4, 5, C('#30303a'));
  // estabilizador
  for (let k = 0; k < 5; k++) p.rect(10 + k, 27 + k, 18, 1, shade);
  return p.done();
}

/** Avión visto desde arriba, apuntando a la derecha (para el mapa). */
function avionArriba(): HTMLCanvasElement {
  const p = new Painter(24, 24);
  const white = C('#f8f8fc'), shade = C('#b8bcc8'), red = C('#d0202a');
  p.rect(3, 11, 19, 3, white); p.rect(21, 12, 2, 1, white); p.rect(3, 13, 18, 1, shade);
  for (let k = 0; k < 9; k++) { p.rect(10 + Math.floor(k * 0.4), 11 - k, 3, 1, white); p.rect(10 + Math.floor(k * 0.4), 13 + k, 3, 1, k > 6 ? shade : white); }
  for (let k = 0; k < 4; k++) { p.rect(2 + Math.floor(k * 0.3), 11 - k, 2, 1, white); p.rect(2 + Math.floor(k * 0.3), 13 + k, 2, 1, white); }
  p.rect(2, 11, 2, 3, red);
  p.rect(18, 12, 2, 1, C('#3a6ab0'));
  return p.done();
}

/** Cielo de atardecer para la toma del jet, con sol y bandas de nubes lejanas. */
function cieloVuelo(): HTMLCanvasElement {
  // con 80 px más a cada lado, para las pantallas anchas (ver core/pantalla)
  const p = new Painter(W, H, 80);
  p.vgrad(0, H, [C('#2a1a5a'), C('#6a2a7a'), C('#c84a6a'), C('#f08a4a'), C('#f8c86a')]);
  p.circle(470, 250, 46, C('#ffe8a0'));
  p.circle(470, 250, 40, C('#fff4c8'));
  const r = rng(12);
  for (let i = 0; i < 9; i++) {
    const y = 200 + i * 18, col = i % 2 ? C('#e87a6a') : C('#d86a7a');
    for (let x = p.x0; x < p.x1; x += 1) if (Math.sin(x / (30 + i * 7) + i) > 0.2 + r() * 0.05) p.px(x, y + Math.round(Math.sin(x / 11 + i) * 2), col);
  }
  return p.done();
}

/** Nube suelta, blanca con sombra rosada abajo. */
function nube(seed: number, w: number, h: number): HTMLCanvasElement {
  const p = new Painter(w, h);
  const r = rng(seed);
  const n = 5 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const cx = (w * (i + 0.5)) / n + (r() - 0.5) * 8, cy = h * 0.55 + (r() - 0.5) * h * 0.3, rad = h * (0.25 + r() * 0.2);
    p.circle(cx, cy, Math.round(rad), C('#fff8f4'));
  }
  for (let x = 0; x < w; x++) for (let y = Math.floor(h * 0.62); y < h; y++) if (p.get(x, y)[0] > 200) p.dither(x, y, C('#fff8f4'), C('#f0b8c0'), (y - h * 0.62) / (h * 0.38));
  return p.done();
}

export function makeMapa(scene: Phaser.Scene) {
  const add = (k: string, c: () => HTMLCanvasElement) => { if (!scene.textures.exists(k)) scene.textures.addCanvas(k, c()); };
  add('mapa_mundo', mapaMundo);
  add('jet', jet);
  add('avion_arriba', avionArriba);
  add('cielo_vuelo', cieloVuelo);
  add('nube_0', () => nube(3, 90, 30));
  add('nube_1', () => nube(8, 140, 40));
  add('nube_2', () => nube(15, 60, 22));
}
