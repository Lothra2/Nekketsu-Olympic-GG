import Phaser from 'phaser';

/** Botones del juego. Iguales en teclado, mando y táctil. */
export type Btn = 'punch' | 'kick' | 'jump' | 'special' | 'start' | 'back';
const BTNS: Btn[] = ['punch', 'kick', 'jump', 'special', 'start', 'back'];
/** Lo que el entrenamiento puede señalar en pantalla: un botón o la palanca. */
export type Control = Btn | 'stick';

export interface Pad {
  x: number;
  y: number;
  held: Record<Btn, boolean>;
  pressed: Record<Btn, boolean>;
  /** doble toque a un lado: correr */
  run: boolean;
}

const empty = (): Record<Btn, boolean> => ({ punch: false, kick: false, jump: false, special: false, start: false, back: false });

/** Con qué se está jugando: los textos nombran los botones de eso. */
export type Fuente = 'teclado' | 'tactil' | 'mando';

/**
 * Nombre de cada control según con qué se juega. Sale del mismo mapa que lee `Input.read`,
 * así lo que dicen los carteles es lo que de verdad funciona.
 */
const NOMBRE: Record<Fuente, Record<Control | 'correr', string>> = {
  teclado: { punch: 'J', kick: 'K', jump: 'L', special: 'U', start: 'ENTER', back: 'ESC', stick: 'LAS FLECHAS', correr: 'DOS TOQUES ADELANTE' },
  tactil: { punch: 'A', kick: 'B', jump: 'C', special: 'LA ESTRELLA', start: 'PAUSA', back: 'ATRÁS', stick: 'LA PALANCA', correr: 'LA PALANCA HASTA EL BORDE' },
  mando: { punch: 'X', kick: 'A', jump: 'B', special: 'Y', start: 'START', back: 'SELECT', stick: 'LA CRUCETA', correr: 'DOS TOQUES ADELANTE' },
};
/** Las teclas que también sirven, para la línea chiquita del cartel. */
const TECLAS: Record<Control | 'correr', string> = {
  punch: 'J O Z', kick: 'K O X', jump: 'L, C O ESPACIO', special: 'U O V', start: 'ENTER', back: 'ESC', stick: 'FLECHAS O WASD', correr: 'DOS TOQUES ADELANTE O SHIFT',
};
const TOKENS: Record<string, Control | 'correr'> = { PUÑO: 'punch', PATADA: 'kick', SALTO: 'jump', ESPECIAL: 'special', PAUSA: 'start', MOVER: 'stick', CORRER: 'correr' };

/** Cambia {PUÑO}, {PATADA}, {SALTO}, {ESPECIAL}, {MOVER} y {CORRER} por el botón de verdad. */
export function rotular(s: string, f: Fuente): string {
  return s.replace(/\{([A-ZÑ]+)\}/g, (m, k: string) => (TOKENS[k] ? NOMBRE[f][TOKENS[k]] : m));
}

/** Línea de ayuda con todas las teclas que sirven para esos controles. */
export function teclasDe(ctrls: (Control | 'correr')[]): string {
  const n: Record<string, string> = { punch: 'PUÑO', kick: 'PATADA', jump: 'SALTO', special: 'ESPECIAL', stick: 'MOVER', correr: 'CORRER', start: 'PAUSA', back: 'VOLVER' };
  return ctrls.map((c) => `${n[c]}: ${TECLAS[c]}`).join(' · ');
}

/** Hay pantalla táctil (tablet o teléfono). */
export const isTouch = () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

/**
 * Entrada del jugador 1: teclado (flechas o WASD, J puño, K patada, L salto, U especial, Enter),
 * mando (cruceta o palanca, X puño, A patada, B salto, Y o RB especial, Start) y táctil (palanca y botones).
 */
export class Input {
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private prev = empty();
  private touch: TouchPad | null = null;
  private lastTap = { dir: 0, t: 0 };
  private prevX = 0;
  running = false;
  /** lo último que se tocó: teclado, pantalla o mando */
  fuente: Fuente;

  constructor(private scene: Phaser.Scene, withTouch = isTouch(), layer?: Phaser.GameObjects.Layer) {
    const kb = scene.input.keyboard;
    if (kb) {
      const K = Phaser.Input.Keyboard.KeyCodes;
      const map: Record<string, number> = {
        left: K.LEFT, right: K.RIGHT, up: K.UP, down: K.DOWN, a: K.A, d: K.D, w: K.W, s: K.S,
        j: K.J, z: K.Z, k: K.K, x: K.X, l: K.L, c: K.C, space: K.SPACE, u: K.U, v: K.V, enter: K.ENTER, esc: K.ESC, shift: K.SHIFT,
      };
      for (const [n, c] of Object.entries(map)) this.keys[n] = kb.addKey(c, true, false);
    }
    if (withTouch) this.touch = new TouchPad(scene, layer);
    this.fuente = (scene.registry.get('fuente') as Fuente | undefined) ?? (isTouch() ? 'tactil' : 'teclado');
  }

  private usa(f: Fuente) { if (this.fuente !== f) { this.fuente = f; this.scene.registry.set('fuente', f); } }

  private key(n: string) { return this.keys[n]?.isDown ?? false; }

  read(): Pad {
    let x = 0, y = 0;
    const held = empty();
    if (this.key('left') || this.key('a')) x -= 1;
    if (this.key('right') || this.key('d')) x += 1;
    if (this.key('up') || this.key('w')) y -= 1;
    if (this.key('down') || this.key('s')) y += 1;
    held.punch = this.key('j') || this.key('z');
    held.kick = this.key('k') || this.key('x');
    held.jump = this.key('l') || this.key('c') || this.key('space');
    held.special = this.key('u') || this.key('v');
    held.start = this.key('enter');
    held.back = this.key('esc');
    let shift = this.key('shift');
    if (x || y || shift || BTNS.some((n) => held[n])) this.usa('teclado');

    const gp = this.scene.input.gamepad;
    if (gp) for (const p of gp.gamepads) {
      if (!p) continue;
      const ax = p.leftStick.x, ay = p.leftStick.y;
      if (Math.abs(ax) > 0.35) x = Math.sign(ax);
      if (Math.abs(ay) > 0.35) y = Math.sign(ay);
      if (p.left) x = -1;
      if (p.right) x = 1;
      if (p.up) y = -1;
      if (p.down) y = 1;
      const b = (i: number) => !!p.buttons[i]?.pressed;
      held.punch ||= b(2);
      held.kick ||= b(0);
      held.jump ||= b(1);
      held.special ||= b(3) || b(5);
      held.start ||= b(9);
      held.back ||= b(8);
      shift ||= b(4) || b(7);
      if (p.buttons.some((k) => k?.pressed) || Math.abs(ax) > 0.35 || Math.abs(ay) > 0.35) this.usa('mando');
    }

    if (this.touch) {
      const t = this.touch.read();
      if (t.x || t.y || t.run || BTNS.some((n) => t.held[n])) this.usa('tactil');
      if (t.x || t.y) { x = t.x; y = t.y; }
      for (const n of BTNS) held[n] ||= t.held[n];
      shift ||= t.run;
    }

    const pressed = empty();
    for (const n of BTNS) pressed[n] = held[n] && !this.prev[n];
    this.prev = held;

    // doble toque en la misma dirección: corre hasta soltar o cambiar de lado
    const now = this.scene.time.now;
    if (x !== 0 && this.prevX === 0) {
      if (this.lastTap.dir === x && now - this.lastTap.t < 280) this.running = true;
      this.lastTap = { dir: x, t: now };
    }
    if (x === 0 || (this.running && x !== this.lastTap.dir)) this.running = false;
    this.prevX = x;
    return { x, y, held, pressed, run: this.running || (shift && x !== 0) };
  }

  setTouchVisible(v: boolean) { this.touch?.setVisible(v); }

  /** Hay controles táctiles en pantalla. */
  get hasTouch() { return !!this.touch; }

  /** Hace latir los botones táctiles indicados (el entrenamiento los señala). Lista vacía: ninguno. */
  highlight(btns: Control[]) { this.touch?.highlight(btns); }
}

/** Palanca a la izquierda y botones a la derecha, en coordenadas del juego (640 x 360). */
class TouchPad {
  private stick: { id: number; ox: number; oy: number; x: number; y: number } | null = null;
  private btnDown = new Map<number, Btn>();
  private base: Phaser.GameObjects.Arc;
  private knob: Phaser.GameObjects.Arc;
  private buttons: { btn: Btn; x: number; y: number; r: number; g: Phaser.GameObjects.Container }[] = [];
  private runBtn = false;
  private glow: Phaser.Tweens.Tween[] = [];

  constructor(private scene: Phaser.Scene, layer?: Phaser.GameObjects.Layer) {
    scene.input.addPointer(3);
    const depth = 10000;
    this.base = scene.add.circle(78, 286, 38, 0xffffff, 0.08).setStrokeStyle(2, 0xffffff, 0.35).setScrollFactor(0).setDepth(depth);
    this.knob = scene.add.circle(78, 286, 16, 0xffffff, 0.3).setScrollFactor(0).setDepth(depth);
    const defs: { btn: Btn; x: number; y: number; r: number; label: string; color: number }[] = [
      { btn: 'punch', x: 528, y: 302, r: 22, label: 'A', color: 0xe8453c },
      { btn: 'kick', x: 586, y: 270, r: 22, label: 'B', color: 0x3c7ae8 },
      { btn: 'jump', x: 586, y: 326, r: 18, label: 'C', color: 0x3cc86a },
      { btn: 'special', x: 528, y: 246, r: 16, label: '★', color: 0xf2c230 },
      { btn: 'start', x: 320, y: 20, r: 11, label: '‖', color: 0x888888 },
    ];
    for (const d of defs) {
      const c = scene.add.container(d.x, d.y).setScrollFactor(0).setDepth(depth);
      c.add(scene.add.circle(0, 0, d.r, d.color, 0.35).setStrokeStyle(2, 0xffffff, 0.5));
      c.add(scene.add.text(0, 0, d.label, { fontFamily: 'monospace', fontSize: `${Math.round(d.r)}px`, color: '#ffffff' }).setOrigin(0.5).setAlpha(0.85));
      this.buttons.push({ ...d, g: c });
    }
    layer?.add([this.base, this.knob, ...this.buttons.map((b) => b.g)]);
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.down(p));
    scene.input.on('pointermove', (p: Phaser.Input.Pointer) => this.move(p));
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => this.up(p));
    scene.input.on('pointerupoutside', (p: Phaser.Input.Pointer) => this.up(p));
  }

  private down(p: Phaser.Input.Pointer) {
    const { x, y } = p;
    for (const b of this.buttons) if (Math.hypot(x - b.x, y - b.y) < b.r + 10) { this.btnDown.set(p.id, b.btn); b.g.setScale(0.9); return; }
    if (x < 320 && !this.stick) {
      this.stick = { id: p.id, ox: x, oy: y, x, y };
      this.base.setPosition(x, y);
      this.knob.setPosition(x, y);
    }
  }

  private move(p: Phaser.Input.Pointer) {
    if (this.stick && p.id === this.stick.id) {
      this.stick.x = p.x;
      this.stick.y = p.y;
      const dx = p.x - this.stick.ox, dy = p.y - this.stick.oy, m = Math.hypot(dx, dy), r = Math.min(m, 30);
      this.knob.setPosition(this.stick.ox + (m ? (dx / m) * r : 0), this.stick.oy + (m ? (dy / m) * r : 0));
      this.runBtn = m > 34;
    }
  }

  private up(p: Phaser.Input.Pointer) {
    if (this.stick && p.id === this.stick.id) {
      this.stick = null;
      this.runBtn = false;
      this.base.setPosition(78, 286);
      this.knob.setPosition(78, 286);
    }
    const b = this.btnDown.get(p.id);
    if (b) { this.btnDown.delete(p.id); this.buttons.find((x) => x.btn === b)?.g.setScale(1); }
  }

  read() {
    const held = empty();
    for (const b of this.btnDown.values()) held[b] = true;
    let x = 0, y = 0;
    if (this.stick) {
      const dx = this.stick.x - this.stick.ox, dy = this.stick.y - this.stick.oy;
      if (Math.abs(dx) > 10) x = Math.sign(dx);
      if (Math.abs(dy) > 10) y = Math.sign(dy);
    }
    return { x, y, held, run: this.runBtn };
  }

  highlight(btns: Control[]) {
    for (const t of this.glow) t.remove();
    this.glow = [];
    for (const b of this.buttons) {
      b.g.setAlpha(1);
      if (!btns.includes(b.btn)) continue;
      this.glow.push(this.scene.tweens.add({ targets: b.g, alpha: 0.35, duration: 280, yoyo: true, repeat: -1 }));
    }
    // la palanca también, si el paso es moverse
    this.base.setStrokeStyle(2, btns.includes('stick') ? 0xf2c230 : 0xffffff, 0.5);
  }

  setVisible(v: boolean) {
    this.base.setVisible(v);
    this.knob.setVisible(v);
    for (const b of this.buttons) b.g.setVisible(v);
  }
}
