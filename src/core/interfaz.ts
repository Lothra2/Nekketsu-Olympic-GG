import Phaser from 'phaser';
import { KIT, kit } from './kit';
import { desarmar, urlKit, type Paquete } from './carga';
import { txt, type Font } from './ui';
import { chip } from './music';

/**
 * Las piezas de interfaz de PixelForja (lote G1) y los vehículos de la vista inclinada (lote D2). Se cargan al
 * arrancar (pesan poco) como `ui_<pieza>` y `veh_<id>`. Si el kit no las trae, cada uso cae a lo dibujado de antes.
 */

export interface PiezaUi {
  archivo: string; w: number; h: number;
  cuadros?: number; fps?: number; loop?: boolean;
  /** 9-slice: izquierda, arriba, derecha, abajo */
  nueve?: [number, number, number, number];
  /** 3-slice horizontal: izquierda, derecha */
  tres?: [number, number];
  /** el rectángulo del banner donde va el texto: x, y, ancho, alto */
  texto?: [number, number, number, number];
  hueco?: [number, number, number, number];
  relleno?: { x: number; y: number; h: number };
  recorrido?: number;
  letras?: string;
  celda?: [number, number];
}

export interface Vehiculo {
  archivo: string; w: number; h: number; cuadros: number;
  /** dónde cae en el cuadro la esquina de atrás a la izquierda de la huella, en el piso */
  ancla: [number, number];
  huella: { w: number; d: number; z: number };
  anims: Record<string, { desde: number; cuadros: number; fps: number; loop: boolean }>;
  mira?: 'izquierda' | 'derecha';
}

type ConUi = { ui: { interfaz?: Record<string, PiezaUi>; logo?: PiezaUi & { chico?: PiezaUi } }; vehiculos?: Record<string, Vehiculo | string>; paquete_ui?: Paquete };
const m = () => kit() as unknown as ConUi;

export const piezas = (): Record<string, PiezaUi> => m().ui.interfaz ?? {};
export const pieza = (id: string): PiezaUi | undefined => piezas()[id];
export const vehiculos = (): Record<string, Vehiculo> =>
  Object.fromEntries(Object.entries(m().vehiculos ?? {}).filter(([, v]) => typeof v === 'object')) as Record<string, Vehiculo>;

/** ¿Está cargada esta pieza (`barra_marco`, `control_a`...)? */
export const hayUi = (scene: Phaser.Scene, id: string) => scene.textures.exists(`ui_${id}`);

/** Pone en la cola las piezas de interfaz, el logo y los vehículos. En el artifact vienen juntos en un paquete. */
export function queueInterfaz(scene: Phaser.Scene) {
  const hoja = (key: string, p: { archivo: string; w: number; h: number; cuadros?: number; celda?: [number, number] }) => {
    if (scene.textures.exists(key)) return;
    if (p.celda) scene.load.spritesheet(key, urlKit(p.archivo), { frameWidth: p.celda[0], frameHeight: p.celda[1] });
    else if ((p.cuadros ?? 1) > 1) scene.load.spritesheet(key, urlKit(p.archivo), { frameWidth: p.w, frameHeight: p.h });
    else scene.load.image(key, urlKit(p.archivo));
  };
  const encolar = () => {
    for (const [id, p] of Object.entries(piezas())) hoja(`ui_${id}`, p);
    const logo = m().ui.logo;
    if (logo) { hoja('ui_logo', logo); if (logo.chico) hoja('ui_logo_chico', logo.chico); }
    for (const [id, v] of Object.entries(vehiculos())) hoja(`veh_${id}`, v);
  };
  const paq = m().paquete_ui;
  if (!paq) { encolar(); return; }
  scene.load.binary('paq:ui', KIT + paq.archivo);
  scene.load.once('filecomplete-binary-paq:ui', (_k: string, _t: string, datos: ArrayBuffer) => {
    desarmar(paq, datos);
    scene.cache.binary.remove('paq:ui');
    encolar();
  });
}

/** Las animaciones de los vehículos (`veh_<id>_<anim>`), del logo y de las piezas que brillan. */
export function animarInterfaz(scene: Phaser.Scene) {
  const crear = (key: string, tex: string, desde: number, n: number, fps: number, loop: boolean) => {
    if (!scene.textures.exists(tex) || scene.anims.exists(key)) return;
    scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(tex, { start: desde, end: desde + n - 1 }), frameRate: fps, repeat: loop ? -1 : 0 });
  };
  for (const [id, v] of Object.entries(vehiculos())) if (v.cuadros > 1) for (const [an, a] of Object.entries(v.anims)) crear(`veh_${id}_${an}`, `veh_${id}`, a.desde, a.cuadros, a.fps, a.loop);
  const logo = m().ui.logo;
  if (logo?.cuadros) { crear('ui_logo', 'ui_logo', 0, logo.cuadros, logo.fps ?? 10, true); if (logo.chico) crear('ui_logo_chico', 'ui_logo_chico', 0, logo.chico.cuadros ?? 1, logo.chico.fps ?? 10, true); }
  for (const [id, p] of Object.entries(piezas())) if ((p.cuadros ?? 1) > 1 && p.fps) crear(`ui_${id}`, `ui_${id}`, 0, p.cuadros!, p.fps, p.loop ?? true);
}

/**
 * Un vehículo en la vista inclinada: el ancla del cuadro va en el punto de pantalla de su (x, y) en el piso.
 * Devuelve el sprite listo para ponerle la posición con `px(x, y)` y `FT + y`.
 */
export function spriteVehiculo(scene: Phaser.Scene, id: string, anim: string): Phaser.GameObjects.Sprite | null {
  const v = vehiculos()[id];
  if (!v || !scene.textures.exists(`veh_${id}`)) return null;
  const s = scene.add.sprite(0, 0, `veh_${id}`, v.cuadros > 1 ? 0 : undefined).setOrigin(v.ancla[0] / v.w, v.ancla[1] / v.h);
  if (scene.anims.exists(`veh_${id}_${anim}`)) s.play(`veh_${id}_${anim}`);
  return s;
}

/** El fondo de PixelForja que le toca a un letrero grande, según lo que dice (null: va sin fondo, como antes). */
function fondoLetrero(s: string): string | null {
  const t = s.toUpperCase();
  if (/JONR/.test(t)) return 'banner_jonron';
  if (/\bGOL\b/.test(t)) return 'banner_gol';
  if (/R[ÉE]CORD/.test(t)) return 'banner_record';
  if (/META/.test(t)) return 'banner_meta';
  if (/CHAO PESCAO/.test(t)) return 'banner_chao_pescao';
  if (/^¡?(YA|HAJIME)!?$/.test(t)) return 'banner_ya';
  if (/LISTOS|EN SUS MARCAS|ENTRENAMIENTO/.test(t)) return 'banner_listos';
  // quien gana: la cinta dorada con destellos
  if (/^¡?GANA/.test(t)) return 'banner_record';
  // los especiales y los golpes de oro: la explosión
  if (/NEKKETSU|FUEGO|CATATUMBO|DE ORO|IPPON|WAZA|CLAVADA|TACLEADA|RECTA|BATAZO|PULSO|GARROCHA/.test(t)) return 'banner_ya';
  return null;
}

/**
 * El letrero grande del medio de la pantalla (¡LISTOS!, ¡YA!, ¡GOL!...), con su fondo del kit cuando hay uno que le
 * quede. El fondo se estira a lo ancho si el texto no cabe en su rectángulo. `poner` lo manda a la capa del marcador.
 */
export function letreroGrande(scene: Phaser.Scene, poner: <T extends Phaser.GameObjects.GameObject>(o: T) => T, s: string, font: Font, scale: number, hold: number, y = 150) {
  return new Promise<void>((res) => {
    const c = poner(scene.add.container(320, y).setDepth(8500).setAlpha(0).setScale(2));
    const t = txt(scene, 0, 0, s, font, scale);
    const id = fondoLetrero(s);
    const p = id ? pieza(id) : undefined;
    if (id && p?.texto && hayUi(scene, id)) {
      const [rx, ry, rw, rh] = p.texto;
      // al doble para los letreros enormes (¡YA!); a lo ancho, lo que haga falta para que quepa el texto
      const esc = scale >= 3 ? 2 : 1;
      const sx = Math.max(esc, (t.width + 24) / rw);
      const fondo = scene.add.image(0, 0, `ui_${id}`).setScale(sx, esc);
      // el centro del texto va en el centro de su rectángulo
      t.setPosition((rx + rw / 2 - p.w / 2) * sx, (ry + rh / 2 - p.h / 2) * esc);
      c.add([fondo, t]);
    } else c.add(t);
    scene.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 200, ease: 'Back.out' });
    chip.boom(0.3);
    scene.time.delayedCall(hold, () => scene.tweens.add({ targets: c, alpha: 0, scale: 1.3, duration: 200, onComplete: () => { c.destroy(); res(); } }));
  });
}

/**
 * Marcador de TV: la placa oscura 9-slice con los números del kit (`0123456789+-:x`). Lo que no está en esa lista
 * (letras) se escribe con la fuente. `setText` cambia lo que dice.
 */
export class MarcadorTV {
  readonly c: Phaser.GameObjects.Container;
  private placa: Phaser.GameObjects.NineSlice | null = null;
  private letras: Phaser.GameObjects.GameObject[] = [];
  private texto = '';

  constructor(private scene: Phaser.Scene, x: number, y: number, private escala = 1) {
    this.c = scene.add.container(x, y);
    const p = pieza('numeros_placa');
    if (p?.nueve && hayUi(scene, 'numeros_placa')) {
      const [l, t, r, b] = p.nueve;
      this.placa = scene.add.nineslice(0, 0, 'ui_numeros_placa', undefined, 40, 26, l, r, t, b);
      this.c.add(this.placa);
    }
  }

  static disponible(scene: Phaser.Scene) { return hayUi(scene, 'numeros') && !!pieza('numeros')?.letras; }

  setText(s: string) {
    if (s === this.texto) return this;
    this.texto = s;
    for (const o of this.letras) o.destroy();
    this.letras = [];
    const p = pieza('numeros')!;
    const letras = p.letras ?? '';
    const [cw, ch] = p.celda ?? [14, 18];
    const e = this.escala;
    const sep = 1;
    const ancho = (k: string) => (letras.includes(k.toLowerCase()) ? (k === ':' ? 8 : cw) : 8) * e + sep;
    const total = [...s].reduce((a, k) => a + ancho(k), 0) - sep;
    let x = -total / 2;
    for (const k of s) {
      const i = letras.indexOf(k.toLowerCase());
      const w = ancho(k);
      if (i >= 0) this.letras.push(this.scene.add.image(x + (w - sep) / 2, 0, 'ui_numeros', i).setScale(e));
      else if (k !== ' ') this.letras.push(txt(this.scene, x + (w - sep) / 2, 0, k, 'fuente_ui', e));
      x += w;
    }
    this.c.add(this.letras);
    this.ancho = Math.max(24, total + 14 * e);
    this.placa?.setSize(this.ancho, ch * e + 8);
    return this;
  }

  /** Lo ancho de la placa ahora. */
  ancho = 24;

  setVisible(v: boolean) { this.c.setVisible(v); return this; }
  setTint(color: number) { for (const o of this.letras) (o as Phaser.GameObjects.Image).setTint?.(color); return this; }
}

/**
 * El marcador de un partido: el placa de TV con los puntos en el medio y el nombre de cada equipo a su lado, en su
 * color. Sin las piezas del kit, el texto de siempre (`NOMBRE a - b NOMBRE`).
 */
export class MarcadorPartido {
  private tv: MarcadorTV | null = null;
  private texto: Phaser.GameObjects.BitmapText | null = null;
  private izq: Phaser.GameObjects.BitmapText | null = null;
  private der: Phaser.GameObjects.BitmapText | null = null;

  constructor(scene: Phaser.Scene, poner: <T extends Phaser.GameObjects.GameObject>(o: T) => T, private x: number, y: number, private nombres: [string, string], tintes: [number, number] = [0x9ac8ff, 0xffa0a0]) {
    if (MarcadorTV.disponible(scene)) {
      this.tv = new MarcadorTV(scene, x, y);
      poner(this.tv.c.setDepth(8001));
      this.izq = poner(txt(scene, x, y, nombres[0], 'fuente_ui', 1, 1).setDepth(8001).setTint(tintes[0]));
      this.der = poner(txt(scene, x, y, nombres[1], 'fuente_ui', 1, 0).setDepth(8001).setTint(tintes[1]));
    } else this.texto = poner(txt(scene, x, y - 2, '', 'fuente_titulo', 1).setDepth(8001));
  }

  /** Los puntos de cada lado. */
  set(a: number, b: number) {
    if (this.texto) { this.texto.setText(`${this.nombres[0]} ${a} - ${b} ${this.nombres[1]}`); return; }
    this.tv!.setText(`${a}-${b}`);
    const medio = this.tv!.ancho / 2 + 10;
    this.izq!.setX(this.x - medio);
    this.der!.setX(this.x + medio);
  }

  /** Entrenando no hay marcador. */
  setVisible(v: boolean) {
    this.texto?.setVisible(v);
    this.tv?.setVisible(v);
    this.izq?.setVisible(v);
    this.der?.setVisible(v);
  }
}
