import Phaser from 'phaser';
import { AnimPlayer } from './anim';
import { kit, texKey, frameName, type Row, type Evento } from './kit';

/**
 * Un atleta (o Thor) en pantalla: sprite con su pivote, su animación del kit y la fila que mira.
 * La izquierda es el espejo de la derecha (flipX).
 */
export class Figura extends Phaser.GameObjects.Sprite {
  readonly anim: AnimPlayer;
  row: Row = 'right';
  left = false;
  readonly celda: number;
  readonly pivote: [number, number];

  constructor(scene: Phaser.Scene, x: number, y: number, readonly who: string, first = 'idle') {
    const a = kit().atletas[who] ?? kit().animales[who];
    const pack = 'packs' in a ? Object.keys(a.packs)[0] : 'animal';
    super(scene, x, y, texKey(who, pack));
    this.celda = a.celda;
    this.pivote = a.pivote;
    this.setOrigin(a.pivote[0] / a.celda, a.pivote[1] / a.celda);
    this.anim = new AnimPlayer(who);
    this.anim.play(first);
    this.refresh();
    scene.add.existing(this);
  }

  /** Cambia de animación (sin reiniciar si ya suena). */
  set(name: string, restart = false, speed = 1): this {
    this.anim.play(name, restart, speed);
    this.refresh();
    return this;
  }

  /** Avanza la animación y devuelve los eventos del paso. */
  step(dt: number, dist?: number): Evento[] {
    const ev = this.anim.update(dt, dist);
    this.refresh();
    return ev;
  }

  refresh() {
    const a = this.anim;
    if (!a.data) return;
    this.setTexture(texKey(this.who, a.pack), frameName(a.name, this.row, a.frame));
    this.setFlipX(this.espejo);
  }

  /** El cuadro está dibujado girado (el seoi nage de espaldas, lote B4B6 bis): se espeja al revés de como mira. */
  get girado(): boolean { return !!(this.anim.data as { girado?: boolean[] } | undefined)?.girado?.[this.anim.frame]; }

  /** Si el sprite (y los datos de este cuadro) van espejados: mira a la izquierda, o el cuadro va girado. */
  get espejo(): boolean { return this.left !== this.girado; }

  /** Índice de la fila actual en los datos por cuadro. */
  get rowIndex(): number {
    return ['right', 'down_right', 'up_right', 'down', 'up'].indexOf(this.row);
  }

  /**
   * Dónde va la pelota en este cuadro (packs sin pelota pintada), en pixeles de la escena: null si el cuadro no la
   * trae. `detras` dice si va detrás del cuerpo.
   */
  pelota(): { x: number; y: number; detras: boolean } | null {
    const o = this.anim.data?.objetos?.[this.rowIndex]?.[this.anim.frame]?.[0];
    if (!o) return null;
    return { x: this.x + (this.espejo ? -o.x : o.x) * this.scaleX, y: this.y + o.y * this.scaleY, detras: !!o.detras };
  }

  /**
   * Toca `anim` desde su cuadro de contacto (impacto, suelta o atrapa), porque el juego ya resolvió el golpe en ese
   * instante: se ve el contacto y lo que sigue. Si el kit no la trae, `respaldo` desde el principio.
   */
  contacto(anim: string, respaldo: string, speed = 1): this {
    if (!this.anim.play(anim, true, speed)) return this.set(respaldo, true, speed);
    const e = this.anim.data.eventos?.find((x) => x.tipo === 'impacto' || x.tipo === 'suelta' || x.tipo === 'atrapa');
    if (e) this.anim.pos = Math.max(0, e.cuadro - 0.5);
    this.refresh();
    return this;
  }

  /**
   * El arma del piso en la mano en este cuadro (el palo de la Chapita, el tejo): dónde va en pixeles de la escena, el
   * cuadro de su atlas (`<arma>_mano_<k>`, 16 ángulos) y si va detrás del cuerpo. null si el cuadro no la trae.
   */
  arma(): { x: number; y: number; k: number; detras: boolean } | null {
    const d = this.anim.data?.arma?.[this.rowIndex]?.[this.anim.frame];
    if (!d) return null;
    const [ax, ay, ang, detras] = d;
    return { x: this.x + (this.espejo ? -ax : ax) * this.scaleX, y: this.y + ay * this.scaleY, k: ((Math.round(ang / 22.5) % 16) + 16) % 16, detras: !!detras };
  }

  /** Dónde está, en pixeles de la escena, el punto de un evento (la suelta del tejo) en la fila que mira. */
  puntoDe(tipo: Evento['tipo']): { x: number; y: number } | null {
    const p = this.anim.data?.eventos?.find((e) => e.tipo === tipo)?.punto?.[this.rowIndex];
    if (!p) return null;
    return { x: this.x + (this.espejo ? -p[0] : p[0]) * this.scaleX, y: this.y + p[1] * this.scaleY };
  }

  /** El cuadro de un evento de la animación que suena (o -1 si no lo trae). */
  cuadroDe(tipo: Evento['tipo']): number {
    return this.anim.data?.eventos?.find((e) => e.tipo === tipo)?.cuadro ?? -1;
  }

  /** Un punto de los datos por cuadro, ya espejado si mira a la izquierda. */
  mirror([x, y]: [number, number]): [number, number] {
    return [this.left ? -x : x, y];
  }
}
