import { findAnim, type AnimData, type Evento } from './kit';

/**
 * Reproduce una animación del kit. Con `avance`, el cuadro avanza por distancia recorrida (los pies no patinan).
 * Devuelve los eventos que se cruzaron en cada paso: el juego pega, suena o suelta en el cuadro exacto.
 */
export class AnimPlayer {
  name = '';
  pack = '';
  data!: AnimData;
  /** cuadro con fracción */
  pos = 0;
  done = false;
  speed = 1;
  /** recién empezada: los eventos del cuadro 0 todavía no salieron */
  private fresh = true;

  constructor(public id: string) {}

  get frame(): number {
    return Math.min(this.data.cuadros - 1, Math.floor(this.pos));
  }

  has(name: string): boolean {
    return !!findAnim(this.id, name);
  }

  /** Cambia de animación. Si ya está sonando y `restart` es falso, no la reinicia. */
  play(name: string, restart = false, speed = 1): boolean {
    if (this.name === name && !restart) { this.speed = speed; return true; }
    const f = findAnim(this.id, name);
    if (!f) return false;
    this.name = name;
    this.pack = f.pack;
    this.data = f.data;
    this.pos = 0;
    this.done = false;
    this.speed = speed;
    this.fresh = true;
    return true;
  }

  /**
   * Avanza. `dist` (opcional) es la distancia recorrida en pixeles: si la animación tiene avance, manda la distancia.
   * Devuelve los eventos cuyo cuadro se alcanzó en este paso.
   */
  update(dt: number, dist?: number): Evento[] {
    if (this.done) return [];
    const d = this.data;
    const before = this.pos;
    let step: number;
    if (dist !== undefined && d.avance) {
      step = (Math.abs(dist) / d.avance) * d.cuadros;
      step = Math.min(step, d.fps * 2.4 * dt);
    } else step = d.fps * dt * this.speed;
    this.pos += step;
    const out: Evento[] = [];
    const evs = d.eventos ?? [];
    const b = this.fresh ? -1 : Math.floor(before), a = Math.floor(this.pos);
    this.fresh = false;
    const crossed = (c: number) => {
      if (!d.loop) return c > b && c <= a;
      for (let k = b + 1; k <= a; k++) if (((k % d.cuadros) + d.cuadros) % d.cuadros === c) return true;
      return false;
    };
    for (const e of evs) if (crossed(e.cuadro)) out.push(e);
    if (d.loop) this.pos %= d.cuadros;
    else if (this.pos >= d.cuadros) { this.pos = d.cuadros - 0.001; this.done = true; }
    return out;
  }
}
