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
    this.setFlipX(this.left);
  }

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
    return { x: this.x + (this.left ? -o.x : o.x) * this.scaleX, y: this.y + o.y * this.scaleY, detras: !!o.detras };
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

  /** El cuadro de un evento de la animación que suena (o -1 si no lo trae). */
  cuadroDe(tipo: Evento['tipo']): number {
    return this.anim.data?.eventos?.find((e) => e.tipo === tipo)?.cuadro ?? -1;
  }

  /** Un punto de los datos por cuadro, ya espejado si mira a la izquierda. */
  mirror([x, y]: [number, number]): [number, number] {
    return [this.left ? -x : x, y];
  }
}
