/** Pincel de pixel art sobre un lienzo: pixeles enteros, tramado de Bayer, sin suavizado. */

export type RGB = [number, number, number];
export const hex = (h: string): RGB => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

/** Aleatorio con semilla (mulberry32): el mismo fondo cada vez. */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Painter {
  readonly canvas: HTMLCanvasElement;
  readonly img: ImageData;
  readonly d: Uint8ClampedArray;

  constructor(readonly w: number, readonly h: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.img = new ImageData(w, h);
    this.d = this.img.data;
  }

  px(x: number, y: number, c: RGB, a = 255) {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    if (a >= 255) { this.d[i] = c[0]; this.d[i + 1] = c[1]; this.d[i + 2] = c[2]; this.d[i + 3] = 255; return; }
    const k = a / 255, ka = this.d[i + 3] / 255;
    this.d[i] = c[0] * k + this.d[i] * (1 - k);
    this.d[i + 1] = c[1] * k + this.d[i + 1] * (1 - k);
    this.d[i + 2] = c[2] * k + this.d[i + 2] * (1 - k);
    this.d[i + 3] = Math.min(255, (k + ka * (1 - k)) * 255);
  }

  get(x: number, y: number): RGB {
    const i = (Math.round(y) * this.w + Math.round(x)) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2]];
  }

  rect(x: number, y: number, w: number, h: number, c: RGB, a = 255) {
    for (let yy = Math.max(0, Math.round(y)); yy < Math.min(this.h, Math.round(y + h)); yy++)
      for (let xx = Math.max(0, Math.round(x)); xx < Math.min(this.w, Math.round(x + w)); xx++) this.px(xx, yy, c, a);
  }

  /** Degradé vertical por bandas con tramado ordenado entre colores vecinos. */
  vgrad(y0: number, y1: number, cols: RGB[], x0 = 0, x1 = this.w) {
    const n = cols.length - 1;
    for (let y = y0; y < y1; y++) {
      const t = ((y - y0) / Math.max(1, y1 - y0 - 1)) * n;
      const i = Math.min(n - 1, Math.floor(t)), f = t - i;
      for (let x = x0; x < x1; x++) this.px(x, y, f * 16 > BAYER[y & 3][x & 3] + 0.5 ? cols[i + 1] : cols[i]);
    }
  }

  /** Mezcla tramada de dos colores con proporción f (0 a 1). */
  dither(x: number, y: number, a: RGB, b: RGB, f: number) {
    this.px(x, y, f * 16 > BAYER[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + 0.5 ? b : a);
  }

  circle(cx: number, cy: number, r: number, c: RGB, a = 255) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.px(cx + x, cy + y, c, a);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: RGB, a = 255) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Cable que cuelga entre dos puntos. */
  cable(x0: number, y0: number, x1: number, y1: number, sag: number, c: RGB) {
    const n = Math.max(2, Math.abs(x1 - x0));
    let px = x0, py = y0;
    for (let i = 1; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(Math.PI * t) * sag;
      this.line(px, py, x, y, c);
      px = x; py = y;
    }
  }

  /** Silueta de montaña: línea de cresta con ruido, rellena hasta abajo, con luz tramada en las crestas. */
  ridge(base: number, peak: number, seed: number, col: RGB, light: RGB, shape?: (x: number) => number): number[] {
    const r = rng(seed);
    const tops: number[] = [];
    const ph = [r() * 6, r() * 6, r() * 6, r() * 6];
    for (let x = 0; x < this.w; x++) {
      const u = x / this.w;
      let hgt = shape ? shape(u) : 0.5 + 0.5 * Math.sin(u * Math.PI);
      hgt += 0.08 * Math.sin(u * 13 + ph[0]) + 0.05 * Math.sin(u * 29 + ph[1]) + 0.025 * Math.sin(u * 71 + ph[2]) + 0.012 * Math.sin(u * 151 + ph[3]);
      const top = Math.round(base - hgt * (base - peak));
      tops.push(top);
      for (let y = top; y < this.h; y++) {
        const k = (y - top) / 14;
        if (k < 1) this.dither(x, y, light, col, Math.min(1, k + 0.15));
        else this.px(x, y, col);
      }
    }
    return tops;
  }

  done(): HTMLCanvasElement {
    this.canvas.getContext('2d')!.putImageData(this.img, 0, 0);
    return this.canvas;
  }
}
