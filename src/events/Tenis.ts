import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { pelotaKit } from '../core/kit';
import { ajustes } from '../core/nivel';
import { efecto, destellar, tiroSuper } from '../core/fx';
import { chip } from '../core/music';
import { txt, flash, rafaga } from '../core/ui';
import { rotular } from '../core/input';
import { Painter, hex } from '../gfx/paint';
import { lado } from '../core/equipos';
import { EventScene, prueba, type Competidor } from './base';
import { queueEscenario } from './escenario';
import type { Paso } from '../core/coach';

/*
 * La cancha se mide en unidades propias, vista desde atrás de tu equipo (como el tenis del Switch Sports, en 2D):
 * x va de lado a lado (0 en el medio), d es la profundidad (0 tu línea de fondo, LARGO la de ellos) y z la altura.
 * Lo de lejos se ve más chico y más arriba: la proyección está en `pant()`.
 */
/** lo ancho de la cancha de dobles y lo largo */
const ANCHO = 200;
const LARGO = 400;
const RED_D = LARGO / 2;
/** lo alto de la red */
const RED_H = 24;
/** las líneas de saque, a cada lado de la red */
const SAQUE = 95;
const G = 420;
/** a cuántos puntos se gana */
const META = 7;
/** la perspectiva: cuánto se achica lo que está a `d` de profundidad */
const D0 = 480;
const CX = 320;
/** la cancha va de la fila 322 (tu fondo) a la 114 (el fondo de ellos) */
const KX = 1.35, KY = 457.6, HOR = -135.6;
const esc = (d: number) => D0 / (D0 + d);

type Tiro = 'drive' | 'globo' | 'volea' | 'smash' | 'saque' | 'fuego';
interface Tenista {
  c: Competidor; fig: Figura; sombra: Phaser.GameObjects.Ellipse;
  x: number; d: number; z: number; vz: number; st: 'piso' | 'aire'; golpeT: number; cool: number;
  puntos: number; pensar: number; quiereX: number; quiereD: number; fallo: boolean;
  /** hacia dónde apuntaba la palanca al pegar (la persona elige el lado y lo hondo) */
  mira: { x: number; y: number };
  /** la máquina decide una vez por pelota: le pega bien, mal o no llega, cuánto tarda en reaccionar y cuánto se desvía */
  plan: { n: number; tipo: 'bien' | 'mala' | 'falla'; reaccion: number; ruido: number };
}
interface Bola {
  x: number; d: number; z: number; vx: number; vd: number; vz: number;
  en: 'mano' | 'aire' | 'piso'; dueño: Tenista | null; ultimo: Tenista | null; ultimoTiro: Tiro | null;
  /** el lado que le pegó por último y cuántas veces (un solo golpe por lado) */
  lado: 0 | 1; toques: number;
  /** los piques desde el último golpe */
  botes: number; red: boolean; n: number;
  spr: Phaser.GameObjects.Image; sombra: Phaser.GameObjects.Ellipse; marca: Phaser.GameObjects.Ellipse;
  rastro: Phaser.GameObjects.Particles.ParticleEmitter; fuego: Phaser.GameObjects.Particles.ParticleEmitter;
}

/**
 * Tenis de dobles en Đà Lạt, visto desde atrás de tu equipo: la cancha de arcilla en profundidad, tú abajo y ellos
 * arriba, más chicos. Te mueves libre por tu lado con la palanca. Un solo golpe por lado (como en el tenis de verdad):
 * la pelota puede picar una vez de tu lado o se la devuelves en el aire. Puño es el drive (la palanca apunta a dónde:
 * a un lado, hondo o corto), patada el globo, pegado a la red el puño es la volea, y la que viene alta cerca de la red
 * (saltando o no) es el smash. Tu pareja cubre la mitad que tú dejas libre y le pega a las que te quedan lejos. Si
 * pica afuera o se queda en la red, punto para el otro. La barra Nekketsu se llena devolviendo y con los puntos que
 * pierdes; llena, especial con la pelota cerca es el DRIVE NEKKETSU, de fuego y al hueco. Gana el primero a 7.
 */
export class Tenis extends EventScene {
  private pat: Tenista[] = [];
  private bola!: Bola;
  private marcador: [number, number] = [0, 0];
  private nek: [number, number] = [0, 0];
  private avisoT = 0;
  private saca: 0 | 1 = 0;
  private pausaT = 0;
  private clock = 0;
  private hud!: Phaser.GameObjects.Graphics;
  private scoreTxt!: { setText(s: string): unknown };
  private toqueTxt!: Phaser.GameObjects.BitmapText;
  private terminado = false;
  private redG!: Phaser.GameObjects.Graphics;
  /** entrenamiento */
  private pasadas = 0;
  private remates = 0;
  private llego = false;
  private globos = 0;
  private pasoSmash = false;
  private avisoDoble = 0;

  constructor() { super('Tenis'); }

  preload() { super.preload(); queueEscenario(this, 'dalat'); }

  create() {
    this.pat = [];
    this.pasoSmash = false;
    this.marcador = [0, 0];
    this.nek = [0, 0];
    this.avisoT = 0;
    this.avisoDoble = 0;
    this.saca = 0;
    this.pausaT = 0;
    this.clock = 0;
    this.terminado = false;
    this.pasadas = 0;
    this.remates = 0;
    this.globos = 0;
    this.llego = false;
    // toda la cancha a la vista, sin cámara que se mueva; en los celulares anchos se ve más borde a los lados
    this.setup(1, 800);
    this.cameras.main.setBounds(-80, 0, 800, 360).centerOn(CX, 180);
    this.texturas();
    this.cancha();
    // entrenando: tú solo de este lado y Kenji del otro, que te la devuelve suave
    const gente: Competidor[] = this.d.practica ? [this.gente[0], { id: this.rivalEntreno, team: 1, human: false }] : this.gente;
    gente.forEach((c) => {
      const nuestro = c.team === 0;
      const compas = gente.filter((o) => o.team === c.team);
      const k = compas.indexOf(c);
      // la persona (o el primero) a la derecha y atrás; el compañero a la izquierda y más cerca de la red
      const casa = this.casa(c.team, k, compas.length);
      const fig = new Figura(this, 0, 0, c.id, 'idle');
      fig.row = nuestro ? 'up' : 'down';
      const sombra = this.add.ellipse(0, 0, 22, 6, 0x000000, 0.3);
      this.pat.push({ c, fig, sombra, x: casa.x, d: casa.d, z: 0, vz: 0, st: 'piso', golpeT: 0, cool: 0, puntos: 0, pensar: Math.random() * 0.2, quiereX: casa.x, quiereD: casa.d, fallo: false, mira: { x: 0, y: 0 }, plan: { n: -1, tipo: 'bien', reaccion: 0, ruido: 0 } });
    });
    const pk = pelotaKit(this, 'pelota_tenis', '64');
    const spr = (pk ? this.add.image(0, 0, 'pelotas', pk) : this.add.image(0, 0, 'pelota_tenis')).setScale(2).setDepth(5000);
    const rastro = this.add.particles(0, 0, 'px', { lifespan: 300, scale: { start: 1.2, end: 0 }, alpha: { start: 0.75, end: 0 }, tint: 0xffffff, frequency: 20 }).setDepth(4999);
    rastro.startFollow(spr);
    const fuego = this.add.particles(0, 0, 'px', { lifespan: 320, scale: { start: 1.5, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffe040, 0xff6020, 0xffffff], frequency: 12, emitting: false }).setDepth(4998);
    fuego.startFollow(spr);
    const sombra = this.add.ellipse(0, 0, 11, 4, 0x000000, 0.4);
    const marca = this.add.ellipse(0, 0, 26, 10).setStrokeStyle(2, 0xffe040, 0.9).setVisible(false);
    this.bola = { x: 0, d: 0, z: 0, vx: 0, vd: 0, vz: 0, en: 'mano', dueño: null, ultimo: null, ultimoTiro: null, lado: 0, toques: 0, botes: 0, red: false, n: 0, spr, sombra, marca, rastro, fuego };
    this.alSaque(this.d.practica ? 1 : 0);
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.scoreTxt = this.marcadorTV(320, 16, 8001);
    this.uiAdd(txt(this, 250, 16, lado(0).corto, 'fuente_ui', 1, 1).setDepth(8001).setTint(0x9ac8ff));
    this.uiAdd(txt(this, 390, 16, lado(1).corto, 'fuente_ui', 1, 0).setDepth(8001).setTint(0xffa0a0));
    this.toqueTxt = this.uiAdd(txt(this, 320, 34, '', 'fuente_ui', 1).setDepth(8001).setTint(0xffe080));
    this.tema('dalat_niebla');
    this.ambiente('pinos_dalat');
    if (this.d.practica) void this.entrenar('TENIS', this.pasos());
    else void this.previa('TENIS DE DOBLES', 'ĐÀ LẠT, VIETNAM', '{MOVER} POR LA CANCHA · {PUÑO} DRIVE (APUNTA CON LA PALANCA) · {PATADA} GLOBO · EN LA RED: VOLEA Y SMASH · {ESPECIAL}: DRIVE NEKKETSU');
  }

  /** Dónde se para cada uno al empezar el punto: el de atrás a la derecha, el de la red a la izquierda (ellos, espejado). */
  private casa(team: 0 | 1, k: number, n: number) {
    const atras = n === 1 || k === 0;
    const d = team === 0 ? (atras ? 18 : RED_D - 60) : atras ? LARGO - 18 : RED_D + 60;
    const x = (atras ? 42 : -42) * (team === 0 ? 1 : -1);
    return { x, d };
  }

  // ------------------------------------------------------------------ la proyección y el dibujo de la cancha

  /** Un punto del mundo (x, d, z) en la pantalla: [x, y, escala]. */
  private pant(x: number, d: number, z = 0): [number, number, number] {
    const s = esc(d);
    return [CX + x * s * KX, HOR + KY * s - z * s, s];
  }

  private texturas() {
    if (this.textures.exists('pelota_tenis')) return;
    const p = new Painter(6, 6);
    p.circle(2.5, 2.5, 2.8, hex('#5a6a1a'));
    p.circle(2.5, 2.5, 2.2, hex('#d8f040'));
    p.px(1, 2, hex('#f8fff0')); p.px(2, 3, hex('#f8fff0')); p.px(3, 3, hex('#f8fff0'));
    this.textures.addCanvas('pelota_tenis', p.done());
  }

  /**
   * El estadio pintado por código, hasta que llegue el de PixelForja (PEDIDO_TENIS_VERTICAL.md): el cielo de Đà Lạt
   * con la niebla, las montañas, el lago Xuân Hương, los pinos, la grada de dos pisos con público, las vallas de
   * publicidad, la silla del juez, los bancos, las hortensias y la arcilla en perspectiva con sus marcas de rastrillo.
   */
  private cancha() {
    const g = this.add.graphics().setDepth(-20);
    const R = (seed: number) => { const x = Math.sin(seed * 12.9898) * 43758.5453; return x - Math.floor(x); };
    const arte = ['cielo', 'lejos', 'cerca_0'].every((n) => this.textures.exists(`esc_dalat_${n}`));
    if (arte) this.fondoArte(); else this.fondoCodigo(g, R);
    // el césped alrededor (más oscuro lejos) y la tierra de la cancha
    g.fillGradientStyle(0x3a703a, 0x3a703a, 0x4a8a44, 0x4a8a44, 1).fillRect(-80, 114, 800, 246);
    const poly = (x0: number, d0: number, x1: number, d1: number, color: number, alpha = 1) => {
      const a = this.pant(x0, d1), b = this.pant(x1, d1), c = this.pant(x1, d0), d = this.pant(x0, d0);
      g.fillStyle(color, alpha).fillPoints([{ x: a[0], y: a[1] }, { x: b[0], y: b[1] }, { x: c[0], y: c[1] }, { x: d[0], y: d[1] }], true);
    };
    // la arcilla, el borde más oscuro afuera de las líneas y las marcas del rastrillo
    poly(-ANCHO / 2 - 70, -40, ANCHO / 2 + 70, LARGO + 50, 0x9c4a30);
    poly(-ANCHO / 2 - 4, -4, ANCHO / 2 + 4, LARGO + 4, 0xb85a3a);
    for (let d = 10; d < LARGO; d += 14) poly(-ANCHO / 2, d, ANCHO / 2, d + 5, 0xc06240, 0.18);
    for (let i = 0; i < 70; i++) { const x = -ANCHO / 2 + R(i) * ANCHO, d = R(i + 100) * LARGO; const [px, py, ps] = this.pant(x, d); g.fillStyle(0xa04c30, 0.6).fillRect(px, py, 2 * ps, 1); }
    // las líneas: fondo, laterales de dobles y de singles, de saque y la del medio
    const linea = (x0: number, d0: number, x1: number, d1: number, w = 2) => {
      const a = this.pant(x0, d0), b = this.pant(x1, d1);
      g.lineStyle(w, 0xf4ecd8, 0.95).lineBetween(a[0], a[1], b[0], b[1]);
    };
    for (const d of [0, LARGO]) linea(-ANCHO / 2, d, ANCHO / 2, d, 3);
    for (const x of [-ANCHO / 2, ANCHO / 2, -ANCHO / 2 + 26, ANCHO / 2 - 26]) linea(x, 0, x, LARGO);
    for (const d of [RED_D - SAQUE, RED_D + SAQUE]) linea(-ANCHO / 2 + 26, d, ANCHO / 2 - 26, d);
    linea(0, RED_D - SAQUE, 0, RED_D + SAQUE);
    // la red: la malla entre dos palos, a la altura de la mitad de la cancha
    this.redG = this.add.graphics();
    const [lx, ly, ls] = this.pant(-ANCHO / 2 - 8, RED_D), [rx] = this.pant(ANCHO / 2 + 8, RED_D);
    const h = RED_H * ls;
    this.redG.setDepth(ly);
    this.redG.fillStyle(0x2a2a32, 0.55).fillRect(lx, ly - h, rx - lx, h);
    for (let x = lx; x <= rx; x += 4) this.redG.lineStyle(1, 0x14141c, 0.5).lineBetween(x, ly - h, x, ly);
    for (let y = ly - h; y <= ly; y += 4) this.redG.lineStyle(1, 0x14141c, 0.5).lineBetween(lx, y, rx, y);
    this.redG.lineStyle(2, 0xf4f4f4).lineBetween(lx, ly - h, rx, ly - h);
    this.redG.fillStyle(0x3a3a44).fillRect(lx - 2, ly - h - 4, 4, h + 4).fillRect(rx - 2, ly - h - 4, 4, h + 4);
    // la sombra de la red sobre la arcilla
    this.redG.fillStyle(0x000000, 0.12).fillRect(lx, ly, rx - lx, 3);
    this.adornos(g, R);
  }

  /**
   * El fondo con el arte de Đà Lạt de PixelForja (el escenario de lado, visto ahora desde la cancha): el cielo de la
   * mañana, las montañas con la iglesia y el lago, y detrás de la línea de fondo la reja del club con el letrero,
   * los pinos de verdad, la silla del juez y las hortensias, achicados por la distancia.
   */
  private fondoArte() {
    this.add.image(-80, 0, 'esc_dalat_cielo').setOrigin(0).setDepth(-30).setCrop(0, 0, 800, 130);
    this.add.image(-330, -34, 'esc_dalat_lejos').setOrigin(0).setDepth(-29);
    // la reja con todo lo suyo, tres veces para cubrir los celulares anchos, al tamaño del fondo de la cancha
    for (const x of [-400, 80, 560]) this.add.image(x, 114, 'esc_dalat_cerca_0').setOrigin(0, 1).setScale(0.6).setDepth(-28);
    // los recortes del escenario de lado que se usan sueltos por la cancha
    const t = this.textures.get('esc_dalat_cerca_0');
    const cortes: Record<string, [number, number, number, number]> = {
      pino_a: [40, 0, 145, 205], pino_b: [600, 0, 150, 205], pino_gris: [188, 88, 84, 118], pino_gris2: [323, 94, 84, 112],
      silla_juez: [403, 208, 36, 82], flores_a: [148, 256, 54, 28], flores_b: [222, 256, 42, 28], flores_c: [343, 256, 54, 28],
      banco: [272, 248, 60, 40], farol: [714, 168, 24, 120], bicis: [742, 244, 56, 46], gente: [16, 248, 34, 40],
    };
    for (const [n, [x, y, w, h]] of Object.entries(cortes)) if (!t.has(n)) t.add(n, 0, x, y, w, h);
  }

  /** El fondo pintado por código, si el arte de Đà Lạt no llegó: cielo, montañas, lago, pinos y la grada del fondo. */
  private fondoCodigo(g: Phaser.GameObjects.Graphics, R: (n: number) => number) {
    g.fillGradientStyle(0x6fa6d6, 0x6fa6d6, 0xdfe9ef, 0xdfe9ef, 1).fillRect(-80, 0, 800, 72);
    g.fillStyle(0xfff4d0, 0.8).fillCircle(540, 22, 11);
    g.fillStyle(0x8fa9c4, 1);
    for (let i = -1; i < 9; i++) g.fillTriangle(-80 + i * 100, 72, -80 + i * 100 + 55, 38 + (i % 3) * 6, -80 + i * 100 + 110, 72);
    g.fillStyle(0x5f7f9a, 1);
    for (let i = -1; i < 10; i++) g.fillTriangle(-110 + i * 90, 76, -110 + i * 90 + 45, 50 + ((i * 7) % 4) * 4, -110 + i * 90 + 90, 76);
    g.fillStyle(0x7fb4cc, 1).fillRect(-80, 70, 800, 16);
    for (let i = 0; i < 40; i++) g.fillStyle(0xd8f0f8, 0.6).fillRect(-80 + i * 20 + (i % 3) * 5, 73 + (i % 4) * 3, 8 + (i % 3) * 3, 1);
    g.fillStyle(0x3a5a40, 1).fillRect(-80, 84, 800, 6);
    for (let i = 0; i < 28; i++) {
      const x = -72 + i * 30 + Math.floor(R(i + 50) * 8), h = 26 + Math.floor(R(i + 9) * 12), base = 96;
      g.fillStyle(i % 2 ? 0x2f5a3a : 0x3a6a44).fillTriangle(x, base - h, x - 10, base, x + 10, base).fillTriangle(x, base - h - 9, x - 7, base - h + 10, x + 7, base - h + 10);
      g.fillStyle(0x4a3524).fillRect(x - 1, base - 3, 3, 5);
    }
    g.fillStyle(0x3b4a5a).fillRect(-80, 96, 800, 20);
    const ropa = [0xe8c070, 0xd05050, 0x5080d0, 0xf0f0f0, 0x60b060, 0xf0a040, 0x9060c0];
    for (let fila = 0; fila < 2; fila++) for (let i = 0; i < 68; i++) {
      const x = -78 + i * 12 + (fila ? 6 : 0), y = 98 + fila * 9;
      if (R(i * 3 + fila) < 0.12) continue;
      g.fillStyle(ropa[(i + fila * 3) % ropa.length]).fillRect(x, y + 3, 5, 5);
      g.fillStyle(R(i + fila * 7) < 0.5 ? 0x8a5a3a : 0xf0c8a0).fillRect(x + 1, y, 3, 3);
    }
    g.fillStyle(0x1e2630).fillRect(-80, 116, 800, 3);
  }

  /**
   * Lo que rodea la cancha, en perspectiva: las vallas de publicidad paradas como tableros (con su cara de lado y su
   * sombra), las gradas de tres escalones con el público a los costados, y los recortes del arte de Đà Lạt (pinos,
   * hortensias, la silla del juez, el banco, el farol, las bicis) cada uno a su profundidad.
   */
  private adornos(g: Phaser.GameObjects.Graphics, R: (n: number) => number) {
    const arte = this.textures.exists('esc_dalat_cerca_0') && this.textures.get('esc_dalat_cerca_0').has('pino_a');
    const vallas: [number, number][] = [[0xe02020, 0xffffff], [0x1040a0, 0xffe040], [0xf2c230, 0x102040], [0x208040, 0xffffff]];
    const ropa = [0xe8c070, 0xd05050, 0x5080d0, 0xf0f0f0, 0x60b060, 0xf0a040, 0x9060c0];
    const P = (x: number, d: number, z = 0) => { const [sx, sy] = this.pant(x, d, z); return { x: sx, y: sy }; };
    for (const lado of [-1, 1] as const) {
      // las vallas, de a tramos, entre la cancha y las gradas
      const xv = lado * (ANCHO / 2 + 58);
      for (let k = 0; k < 5; k++) {
        const d0 = 14 + k * 76, d1 = d0 + 66;
        const [fondo, raya] = vallas[(k + (lado > 0 ? 2 : 0)) % 4];
        // la sombra en el césped, hacia la cancha
        g.fillStyle(0x000000, 0.18).fillPoints([P(xv, d0), P(xv, d1), P(xv - lado * 9, d1), P(xv - lado * 9, d0)], true);
        // la cara de frente (mira a la cancha) y el canto de arriba
        g.fillStyle(fondo).fillPoints([P(xv, d0), P(xv, d1), P(xv, d1, 17), P(xv, d0, 17)], true);
        g.fillStyle(raya, 0.95).fillPoints([P(xv, d0 + 12), P(xv, d1 - 12), P(xv, d1 - 12, 10), P(xv, d0 + 12, 10)], true);
        g.fillStyle(0xffffff, 0.35).fillPoints([P(xv, d0), P(xv, d1), P(xv, d1, 3), P(xv, d0, 3)], true);
        g.fillStyle(0x202830).fillPoints([P(xv, d0, 17), P(xv, d1, 17), P(xv + lado * 3, d1, 18), P(xv + lado * 3, d0, 18)], true);
      }
      // las gradas: tres escalones que suben alejándose de la cancha, con el público sentado
      const xg = lado * (ANCHO / 2 + 100);
      for (let k = 2; k >= 0; k--) {
        const x0 = xg + lado * k * 22, x1 = x0 + lado * 22, z = 8 + k * 11;
        g.fillStyle(k % 2 ? 0x8a90a4 : 0x9aa0b4).fillPoints([P(x0, 20, z), P(x1, 20, z), P(x1, 380, z), P(x0, 380, z)], true);
        g.fillStyle(0x5a6074).fillPoints([P(x0, 20, z), P(x0, 380, z), P(x0, 380, z - 11), P(x0, 20, z - 11)], true);
        for (let d = 34; d < 372; d += 15) {
          if (R(d * 3 + k + (lado + 1) * 7) < 0.15) continue;
          const [px, py, ps] = this.pant(x0 + lado * 11, d, z);
          g.fillStyle(ropa[(Math.floor(d / 15) + k * 2 + (lado + 1)) % ropa.length]).fillRect(px - 3 * ps, py - 9 * ps, 6 * ps, 7 * ps);
          g.fillStyle(R(d + k * 5) < 0.5 ? 0x8a5a3a : 0xf0c8a0).fillRect(px - 2 * ps, py - 13 * ps, 4 * ps, 4 * ps);
        }
      }
      g.fillStyle(0x3a4050).fillPoints([P(xg, 18), P(xg + lado * 66, 18), P(xg + lado * 66, 18, 30), P(xg, 18, 8)], true);
      g.fillStyle(0x3a4050).fillPoints([P(xg, 382), P(xg + lado * 66, 382), P(xg + lado * 66, 382, 30), P(xg, 382, 8)], true);
    }
    if (!arte) {
      const [jx, jy, js] = this.pant(ANCHO / 2 + 46, RED_D);
      g.fillStyle(0x4a3524).fillRect(jx - 6 * js, jy - 46 * js, 3 * js, 46 * js).fillRect(jx + 3 * js, jy - 46 * js, 3 * js, 46 * js);
      g.fillStyle(0xf4f4f4).fillRect(jx - 9 * js, jy - 54 * js, 18 * js, 7 * js);
      g.fillStyle(0x203060).fillRect(jx - 4 * js, jy - 62 * js, 8 * js, 9 * js);
      g.fillStyle(0xf0c8a0).fillRect(jx - 3 * js, jy - 68 * js, 6 * js, 6 * js);
      for (const lado of [-1, 1]) for (let k = 0; k < 5; k++) {
        const [hx, hy, hs] = this.pant(lado * (ANCHO / 2 + 80), 40 + k * 76);
        g.fillStyle(0x3f6f3f).fillCircle(hx, hy - 6 * hs, 10 * hs);
        g.fillStyle(k % 2 ? 0xe890c0 : 0x90a8f0).fillCircle(hx - 4 * hs, hy - 9 * hs, 4 * hs).fillCircle(hx + 4 * hs, hy - 8 * hs, 4 * hs).fillCircle(hx, hy - 12 * hs, 4 * hs);
      }
      return;
    }
    // los recortes del arte, cada uno parado en su punto de la cancha y ordenado por profundidad
    const pon = (cuadro: string, x: number, d: number, k = 1, flip = false) => {
      const [sx, sy, s] = this.pant(x, d);
      return this.add.image(Math.round(sx), Math.round(sy), 'esc_dalat_cerca_0', cuadro).setOrigin(0.5, 1).setScale(s * k).setFlipX(flip).setDepth(sy);
    };
    pon('pino_a', -ANCHO / 2 - 215, 70, 0.9); pon('pino_gris', -ANCHO / 2 - 230, 170, 0.9); pon('pino_b', -ANCHO / 2 - 225, 290, 0.9); pon('pino_gris2', -ANCHO / 2 - 210, 395, 0.9);
    pon('pino_b', ANCHO / 2 + 215, 60, 0.9, true); pon('pino_gris2', ANCHO / 2 + 235, 180, 0.9); pon('pino_a', ANCHO / 2 + 225, 300, 0.9, true); pon('pino_gris', ANCHO / 2 + 210, 400, 0.9);
    pon('silla_juez', ANCHO / 2 + 44, RED_D, 1.1);
    pon('banco', -ANCHO / 2 - 46, RED_D - 60, 1.05); pon('gente', -ANCHO / 2 - 44, RED_D + 70, 1.05);
    pon('bicis', ANCHO / 2 + 70, 2, 1);
    pon('farol', -ANCHO / 2 - 82, 6, 1.1); pon('farol', ANCHO / 2 + 82, 390, 1.1);
    const flores = ['flores_a', 'flores_b', 'flores_c'];
    for (const lado of [-1, 1]) for (let k = 0; k < 5; k++) pon(flores[(k + (lado > 0 ? 1 : 0)) % 3], lado * (ANCHO / 2 + 80), 46 + k * 76, 1.1, lado > 0);
  }

  // ------------------------------------------------------------------ la pelota

  /**
   * Lanza la pelota para que pique en (tx, td) en `t` segundos. Si no pasaría por encima de la red, la levanta
   * (más tiempo de vuelo) hasta que pase; el drive Nekketsu la atraviesa igual y la mal pegada se queda como sale.
   */
  private lanzar(tx: number, td: number, t: number, libre = false) {
    const c = this.bola;
    c.en = 'aire';
    c.dueño = null;
    c.red = false;
    c.botes = 0;
    c.n++;
    for (let k = 0; k < 6; k++) {
      c.vx = (tx - c.x) / t;
      c.vd = (td - c.d) / t;
      c.vz = (G * t) / 2 - c.z / t;
      if (libre) return;
      const tn = (RED_D - c.d) / c.vd;
      if (!(tn > 0 && tn < t)) return;
      const zn = c.z + c.vz * tn - (G * tn * tn) / 2;
      if (zn >= RED_H + 10) return;
      t += 0.12;
    }
  }

  /**
   * Dónde pica la pelota la próxima vez (y en cuánto tiempo). Con `golpe`, sigue después del primer pique hasta que la
   * pelota vuelve a bajar a la cintura: ahí conviene pegarle, y ahí va la máquina.
   */
  private caida(golpe = false): { x: number; d: number; t: number } {
    const c = this.bola;
    if (c.en !== 'aire') return { x: c.x, d: c.d, t: 0 };
    let x = c.x, d = c.d, z = c.z, vx = c.vx, vd = c.vd, vz = c.vz, botes = c.botes;
    const dt = 1 / 60;
    for (let k = 1; k < 600; k++) {
      vz -= G * dt; x += vx * dt; d += vd * dt; z += vz * dt;
      if (z <= 0) {
        if (!golpe || botes > 0) return { x, d, t: k * dt };
        botes = 1; vz = Math.abs(vz) * 0.7; vx *= 0.62; vd *= 0.62; z = 0.1;
      }
      // ya picó y baja a la cintura: ahí; si antes se va más atrás de la línea de fondo, en la línea (no hay más cancha)
      if (golpe && botes > 0 && vz < 0 && z <= 30) return { x, d, t: k * dt };
      if (golpe && botes > 0 && (d < -10 || d > LARGO + 10)) return { x, d: Phaser.Math.Clamp(d, -10, LARGO + 10), t: k * dt };
    }
    return { x, d, t: 10 };
  }

  /** De qué lado está una profundidad. */
  private ladoDe(d: number): 0 | 1 { return d < RED_D ? 0 : 1; }

  /** El que saca tiene la pelota en la mano, al fondo; todos vuelven a su casa. */
  private alSaque(team: 0 | 1) {
    this.saca = team;
    const c = this.bola;
    const del = this.pat.filter((p) => p.c.team === team);
    const quien = del.find((p) => p.c.human) ?? del[0];
    this.pat.forEach((p) => { const n = this.pat.filter((o) => o.c.team === p.c.team); const h = this.casa(p.c.team, n.indexOf(p), n.length); p.x = h.x; p.d = h.d; p.z = 0; p.vz = 0; p.st = 'piso'; p.quiereX = h.x; p.quiereD = h.d; p.fig.set('idle'); });
    // el que saca, al fondo, del lado que toca según los puntos jugados
    const par = (this.marcador[0] + this.marcador[1]) % 2 === 0;
    quien.x = (par ? 40 : -40) * (team === 0 ? 1 : -1);
    quien.d = team === 0 ? 4 : LARGO - 4;
    c.en = 'mano';
    c.dueño = quien;
    c.lado = team;
    c.toques = 0;
    c.ultimo = null;
    c.ultimoTiro = null;
    c.botes = 0;
    c.vx = c.vd = c.vz = 0;
    quien.cool = quien.c.human ? 0 : 0.9;
  }

  /** ¿Le llega la raqueta? Devuelve lo alto de la pelota sobre sus pies, o null. */
  private alcance(p: Tenista): number | null {
    const c = this.bola;
    if (c.en !== 'aire') return null;
    const paseo = ajustes().nombre === 'PASEO' && p.c.human;
    const r = paseo ? 34 : 26;
    if (Math.abs(c.x - p.x) > r || Math.abs(c.d - p.d) > r + 6) return null;
    const alto = c.z - p.z;
    if (p.st === 'aire') return alto >= 0 && alto <= 100 ? alto : null;
    if (alto < 2 || alto > (paseo ? 90 : 82)) return null;
    return alto;
  }

  /** ¿Puede tirar el drive Nekketsu? La pelota cerca, de su lado y sin que su lado ya le haya pegado. */
  private alcanceFuego(p: Tenista): boolean {
    const c = this.bola;
    if (c.en !== 'aire' || Math.abs(c.x - p.x) > 50 || Math.abs(c.d - p.d) > 50 || c.z > 130) return false;
    return this.ladoDe(c.d) === p.c.team && c.lado !== p.c.team;
  }

  /** El mejor lugar del otro lado para mandarla: el más lejos de los que lo cuidan (con algo de azar entre los mejores). */
  private hueco(team: 0 | 1): { x: number; d: number } {
    const rivales = this.pat.filter((o) => o.c.team !== team);
    const c: { x: number; d: number; v: number }[] = [];
    for (let x = -80; x <= 80; x += 20) for (const d of team === 0 ? [RED_D + 70, RED_D + 120, LARGO - 40, LARGO - 15] : [RED_D - 70, RED_D - 120, 40, 15]) {
      const v = Math.min(...rivales.map((r) => Math.abs(r.x - x) + Math.abs(r.d - d) * 0.6));
      c.push({ x, d, v });
    }
    c.sort((a, b) => b.v - a.v);
    return c[Math.floor(Math.random() * Math.min(3, c.length))];
  }

  /** A dónde manda la persona el drive: la palanca elige el lado (izquierda, medio, derecha) y lo hondo (arriba) o corto (abajo). */
  private puntoPersona(p: Tenista, hondo: number, corto: number): { x: number; d: number } {
    const s = p.c.team === 0 ? 1 : -1;
    const x = p.mira.x * 70 + (Math.random() - 0.5) * 20;
    const d = p.mira.y < -0.3 ? hondo : p.mira.y > 0.3 ? corto : (hondo + corto) / 2;
    return { x: Phaser.Math.Clamp(x, -85, 85), d: p.c.team === 0 ? d : LARGO - d + 0 * s };
  }

  private tocar(p: Tenista, quiere: 'drive' | 'globo' | 'fuego', forzarMalo = false) {
    if (p.golpeT > 0) return;
    const c = this.bola;
    const team = p.c.team;
    // el saque: cruzado al cuadro de enfrente
    if (c.en === 'mano' && c.dueño === p) {
      c.x = p.x; c.d = p.d; c.z = 46;
      const tx = -Math.sign(p.x || 1) * (20 + Math.random() * 40);
      const td = team === 0 ? RED_D + 35 + Math.random() * 45 : RED_D - 35 - Math.random() * 45;
      const al = this.d.practica && team === 1 ? this.pat[0] : null;
      this.lanzar(al ? Phaser.Math.Clamp(al.x + (Math.random() - 0.5) * 30, -70, 70) : tx, al ? 70 + Math.random() * 40 : td, 0.95);
      this.golpeAnim(p, 'tennis_serve', 'weapon_swing_heavy');
      c.ultimo = p; c.ultimoTiro = 'saque'; c.lado = team; c.toques = 1;
      this.sfx('esquiva', 0.3);
      return;
    }
    if (quiere === 'fuego' && !this.alcanceFuego(p)) quiere = 'drive';
    const alto = quiere === 'fuego' ? c.z : this.alcance(p);
    const enRed = Math.abs(p.d - RED_D) < 75;
    // cerca de la red, la que viene por encima del hombro es el smash (saltando, cualquiera)
    const altaCerca = alto !== null && alto > 36 && Math.abs(p.d - RED_D) < 95;
    const smash = alto !== null && (p.st === 'aire' || altaCerca) && quiere === 'drive';
    if (smash) this.golpeAnim(p, 'tn_smash', 'weapon_swing_heavy');
    else if (quiere !== 'fuego' && enRed && quiere === 'drive') this.golpeAnim(p, 'tn_volley', 'weapon_swing');
    else this.golpeAnim(p, quiere === 'globo' || (c.x - p.x) * (team === 0 ? 1 : -1) < 0 ? 'backhand' : 'forehand', 'weapon_swing');
    // le pegó al aire: recupera rápido y sigue moviéndose
    if (alto === null) { p.golpeT = 0.12; p.fallo = true; return; }
    // un solo golpe por lado: si tu lado ya le pegó, la raqueta pasa de largo (no es falta: es que ya iba)
    if (c.lado === team && c.toques > 0) {
      p.golpeT = 0.12; p.fallo = true;
      if (p.c.human && this.avisoDoble <= 0) { this.avisoDoble = 2; this.letrero(p, '¡YA LE PEGÓ TU PAREJA!', 0xffb080); }
      return;
    }
    c.lado = team; c.toques = 1;
    const paseo = ajustes().nombre === 'PASEO' && p.c.human;
    const certera = p.c.human || Math.random() < 0.25 + 0.5 * ajustes().cpuAgresion;
    const perfecto = alto >= 14 && alto <= 40 && certera && !smash;
    const conmigo = !p.c.human && this.pat.some((o) => o.c.human && o.c.team === team);
    const malo = forzarMalo || (!paseo && !conmigo && !p.c.human && (alto < 5 || alto > 62) && !smash);
    const lejosD = team === 0 ? LARGO - 30 : 30, cortoD = team === 0 ? RED_D + 55 : RED_D - 55;
    let tiro: Tiro;
    let destino = p.c.human ? this.puntoPersona(p, LARGO - 30, RED_D + 50) : this.hueco(team);
    if (quiere === 'fuego') {
      tiro = 'fuego';
      this.nek[team] = 0;
      destino = this.hueco(team);
      this.lanzar(destino.x, destino.d, 0.42, true);
      this.letrero(p, '¡DRIVE NEKKETSU!', 0xff8020);
      destellar(c.spr, 140, 0xffa040);
      this.uiAdd(rafaga(this));
      const [ex, ey] = this.pant(p.x, p.d);
      efecto(this, 'aura_nekketsu', ex, ey, { depth: ey - 0.1 });
      this.corte(p.c.id, '¡DRIVE NEKKETSU!', team);
      this.shake(240, 0.012);
      flash(this, 120);
      for (const o of this.pat) if (o.c.team !== team && Math.random() < (team === 1 ? 0.5 + 0.35 * ajustes().cpuAgresion : 0.85)) o.plan = { n: c.n, tipo: 'falla', reaccion: 1, ruido: 0 };
    } else if (smash) {
      // el smash: picado y rápido, cerca de la línea de saque de ellos
      tiro = 'smash';
      const d = team === 0 ? RED_D + 40 + Math.random() * 90 : RED_D - 40 - Math.random() * 90;
      this.lanzar(p.c.human ? Phaser.Math.Clamp(p.mira.x * 70 + (Math.random() - 0.5) * 30, -85, 85) : destino.x, d, 0.42, true);
      if (c.vz < 40) c.vz = 40;
      this.letrero(p, '¡SMASH!', 0xffe040);
      destellar(c.spr, 90);
      p.fig.destello(60, 0xffe040);
      { const [gx, gy] = this.pant(c.x, c.d, c.z); this.golpeFuerte(gx, gy); }
      if (p.c.human) this.remates++;
    } else if (quiere === 'globo') {
      // el globo: alto por encima del de la red y al fondo
      tiro = 'globo';
      const d = malo ? (team === 0 ? LARGO + 40 : -40) : lejosD + (Math.random() - 0.5) * 20;
      this.lanzar(malo ? destino.x : Phaser.Math.Clamp(destino.x, -75, 75), d, 1.55);
      c.vz = Math.max(c.vz, 230);
      if (p.c.human) this.globos++;
    } else if (enRed) {
      // la volea: corta y rápida, al hueco del otro lado
      tiro = 'volea';
      this.lanzar(destino.x, p.c.human ? destino.d : cortoD + (Math.random() - 0.5) * 50, 0.62);
    } else {
      tiro = 'drive';
      let t = perfecto ? 0.72 : 0.9;
      // entrenando, Kenji te la devuelve suave cerca de donde estás (y en el paso del smash, alta y corta para rematar)
      if (this.d.practica && team === 1) {
        const me = this.pat[0];
        destino = this.pasoSmash ? { x: me.x, d: RED_D - 50 } : { x: Phaser.Math.Clamp(me.x + (Math.random() - 0.5) * 60, -70, 70), d: 60 + Math.random() * 60 };
        t = this.pasoSmash ? 1.5 : 1.15;
      }
      // mal pegada: a la red o afuera
      if (malo) { if (Math.random() < 0.5) { destino = { x: c.x, d: RED_D + (team === 0 ? 4 : -4) }; t = 0.5; } else destino = { x: Math.sign(destino.x || 1) * (ANCHO / 2 + 25), d: lejosD }; }
      this.lanzar(destino.x, destino.d, t, malo);
      if (this.d.practica && team === 1 && this.pasoSmash) c.vz = Math.max(c.vz, 260);
      if (perfecto && p.c.human) { this.letrero(p, '¡QUÉ DRIVE!', 0x8ae08a); p.fig.destello(60, 0xffe040); }
      if (p.c.human && !malo) this.pasadas++;
    }
    c.ultimo = p;
    c.ultimoTiro = tiro;
    if (tiro !== 'fuego' && !malo) this.carga(team, 12);
    this.sfx('golpe', p.c.human ? 0.35 : 0.2);
    const [sx, sy] = this.pant(c.x, c.d, c.z);
    efecto(this, 'chispa_golpe_liviano', sx, sy, { depth: 5001 });
  }

  private carga(team: 0 | 1, n: number) {
    if (team === 1 && !this.d.practica) n *= Math.max(0.4, ajustes().cpuAgresion);
    const antes = this.nek[team];
    this.nek[team] = Math.min(100, antes + n);
    const me = this.pat.find((q) => q.c.human);
    if (team === 0 && antes < 100 && this.nek[0] >= 100 && me) { this.letrero(me, '¡BARRA LLENA!', 0xffe040); this.sfx('elegir', 0.4); }
  }

  private aviso(p: Tenista) {
    if (this.avisoT > 0) return;
    this.avisoT = 1;
    this.letrero(p, this.nek[0] >= 100 ? '¡CON LA PELOTA CERCA!' : 'LLENA LA BARRA', 0xffe080);
  }

  private golpeAnim(p: Tenista, anim: string, respaldo: string) {
    p.golpeT = 0.3;
    p.fallo = false;
    p.fig.contacto(anim, respaldo, 1.4);
  }

  // ------------------------------------------------------------------ puntos

  private punto(team: 0 | 1, motivo: string | null) {
    if (this.pausaT > 0 || this.terminado) return;
    const c = this.bola;
    const smash = c.ultimoTiro === 'smash' && c.ultimo?.c.team === team;
    this.marcador[team] += 1;
    this.carga(team === 0 ? 1 : 0, 20);
    if (c.ultimo && c.ultimo.c.team === team) c.ultimo.puntos += 1;
    c.en = 'piso';
    this.pausaT = 1.6;
    const s = motivo ?? (c.ultimoTiro === 'fuego' && c.ultimo?.c.team === team ? '¡NEKKETSU!' : smash ? '¡SMASH!' : `¡PUNTO ${lado(team).corto}!`);
    const t = this.uiAdd(txt(this, 320, 90, s, 'fuente_titulo', 1).setDepth(8500).setTint(team === 0 ? 0x9ac8ff : 0xffa0a0));
    this.tweens.add({ targets: t, y: 74, alpha: 0, delay: 900, duration: 500, onComplete: () => t.destroy() });
    chip.blip(team === 0 ? 988 : 330, 0.25, 'sq25', 0.16, team === 0 ? 1318 : 220);
    if (team === 0) flash(this, 80);
    for (const p of this.pat) if (p.st === 'piso' && p.golpeT <= 0) p.fig.set(p.c.team === team ? 'celebrate' : 'sad', true);
    this.saca = this.d.practica ? 1 : team;
    if (!this.d.practica && this.marcador[team] >= META) this.terminar(team);
  }

  /**
   * La pelota picó. El primer pique del otro lado vale (rebota y sigue); afuera, en el propio lado o tras la red es
   * punto para el otro; el segundo pique es punto para el que pegó.
   */
  private aterriza() {
    const c = this.bola;
    const [sx, sy] = this.pant(c.x, c.d);
    efecto(this, 'polvo_caer_chico', sx, sy, { scale: esc(c.d) });
    this.sfx('paso_tierra_0', 0.3);
    const quien = c.ultimo?.c.team ?? this.saca;
    const otro: 0 | 1 = quien === 0 ? 1 : 0;
    const afuera = Math.abs(c.x) > ANCHO / 2 + 3 || c.d < -3 || c.d > LARGO + 3;
    if (c.red) { this.punto(otro, '¡A LA RED!'); return; }
    if (c.botes === 0) {
      if (afuera) { this.punto(otro, '¡AFUERA!'); return; }
      if (this.ladoDe(c.d) === quien) { this.punto(otro, null); return; }
      c.botes = 1;
      c.vz = Math.abs(c.vz) * 0.7;
      c.vx *= 0.62; c.vd *= 0.62;
      c.z = 0.1;
      if (c.ultimoTiro !== 'fuego') c.n++;
      return;
    }
    this.punto(quien, null);
  }

  // ------------------------------------------------------------------ cuadro a cuadro

  update(_t: number, dms: number) {
    const dt = this.dtJuego(dms);
    const p = this.pad.read();
    if (this.endTick(p)) { this.animar(dt); this.filterUi(); return; }
    const jugando = this.fase === 'juego' && !this.terminado;
    if (jugando) this.clock += dt;
    this.coach?.tick(dt);
    if (this.pausaT > 0) {
      this.pausaT -= dt;
      if (this.pausaT <= 0 && !this.terminado) this.alSaque(this.saca);
    }
    const c = this.bola;
    this.avisoT = Math.max(0, this.avisoT - dt);
    this.avisoDoble = Math.max(0, this.avisoDoble - dt);
    for (const q of this.pat) {
      q.golpeT = Math.max(0, q.golpeT - dt);
      q.cool = Math.max(0, q.cool - dt);
      let mx = 0, my = 0, salta = false, drive = false, globo = false, corre = false, fuego = false;
      if (jugando && this.pausaT <= 0) {
        if (q.c.human) {
          mx = p.x; my = p.y; corre = p.run; salta = p.pressed.jump; drive = p.pressed.punch; globo = p.pressed.kick;
          q.mira = { x: p.x, y: p.y };
          if (p.pressed.special) { if (this.nek[0] >= 100 && this.alcanceFuego(q)) fuego = true; else this.aviso(q); }
        } else ({ mx, my, salta, drive, globo, fuego, corre } = this.cpu(q, dt));
      }
      if (c.en === 'mano' && c.dueño === q) { if ((drive || globo) && q.cool <= 0) this.tocar(q, 'drive'); mx = 0; my = 0; }
      else if (fuego) this.tocar(q, 'fuego');
      else if (drive) this.tocar(q, 'drive');
      else if (globo) this.tocar(q, 'globo');
      // moverse por su lado de la cancha: la palanca arriba es hacia la red (para ellos, al revés)
      const vel = (corre ? 150 : 105) * (q.c.human || this.pat.some((o) => o.c.human && o.c.team === q.c.team) ? 1 : ajustes().cpuVel);
      const haciaRed = q.c.team === 0 ? -my : my;
      if (q.golpeT <= 0 || q.st === 'aire' || q.fallo) { q.x += mx * vel * dt; q.d += haciaRed * vel * 0.8 * dt; }
      q.x = Phaser.Math.Clamp(q.x, -ANCHO / 2 - 40, ANCHO / 2 + 40);
      q.d = q.c.team === 0 ? Phaser.Math.Clamp(q.d, -14, RED_D - 14) : Phaser.Math.Clamp(q.d, RED_D + 14, LARGO + 40);
      // siempre de cara a la red; de lado cuando corre a un costado
      if (q.golpeT <= 0) {
        q.fig.row = mx ? (q.c.team === 0 ? 'up_right' : 'down_right') : q.c.team === 0 ? 'up' : 'down';
        if (mx) q.fig.left = mx < 0;
      }
      if (salta && q.st === 'piso' && q.golpeT <= 0) { q.st = 'aire'; q.vz = 270; q.fig.set('jump_rise', true); }
      if (q.st === 'aire') {
        q.vz -= 700 * dt;
        q.z += q.vz * dt;
        if (q.z <= 0) { q.z = 0; q.vz = 0; q.st = 'piso'; q.fig.set('land', true); }
        else if (q.golpeT <= 0 && q.vz < 0 && q.fig.anim.name !== 'jump_fall') q.fig.set('jump_fall');
      }
      if (q.st === 'piso' && q.golpeT <= 0) {
        const mueve = mx || my;
        const quiere = mueve ? (corre ? 'run' : 'walk') : q.fig.anim.has('tn_ready') ? 'tn_ready' : 'idle';
        const libre = ['idle', 'tn_ready', 'walk', 'run'].includes(q.fig.anim.name) || q.fig.anim.done || !!mueve;
        if (libre && q.fig.anim.name !== quiere) q.fig.set(quiere);
      }
      q.fig.step(dt, Math.hypot(mx, haciaRed * 0.8) * vel * dt);
    }
    // la pelota
    if (c.en === 'mano' && c.dueño) {
      const d = c.dueño;
      c.x = d.x + (d.c.team === 0 ? 10 : -10); c.d = d.d;
      c.z = 22 + Math.sin(this.time.now / 160) * 2;
    } else if (c.en === 'aire') {
      const d0 = c.d;
      c.vz -= G * dt;
      c.x += c.vx * dt; c.d += c.vd * dt; c.z += c.vz * dt;
      // la red: si cruza por debajo, rebota y cae de este lado (el drive Nekketsu la atraviesa)
      const cruza = (d0 < RED_D) !== (c.d < RED_D);
      if (cruza && c.z < RED_H && c.ultimoTiro !== 'fuego' && Math.abs(c.x) < ANCHO / 2 + 10) {
        c.d = d0;
        c.vd *= -0.12; c.vx *= 0.3;
        c.vz = Math.min(c.vz, 0);
        c.red = true;
        this.sfx('esquiva', 0.3);
      }
      // la que ya picó y se va lejos sin que nadie la toque: segundo pique
      if (c.botes > 0 && (Math.abs(c.x) > ANCHO / 2 + 80 || c.d < -90 || c.d > LARGO + 90)) { c.z = 0; this.aterriza(); }
      else if (c.z <= 0) { c.z = 0; this.aterriza(); }
    }
    if (jugando && this.d.practica) this.entrenador();
    this.render();
    this.filterUi();
  }

  private animar(dt: number) { for (const q of this.pat) q.fig.step(dt); this.render(); }

  // ------------------------------------------------------------------ la máquina

  private cpu(q: Tenista, dt: number) {
    const r = { mx: 0, my: 0, salta: false, drive: false, globo: false, fuego: false, corre: false };
    const c = this.bola, team = q.c.team;
    q.pensar -= dt;
    const dif = this.marcador[1] - this.marcador[0];
    const base = Phaser.Math.Clamp(0.5 - 0.36 * ajustes().cpuAgresion + (dif >= 3 ? 0.12 * ajustes().ayuda : 0), 0.04, 0.6);
    const conmigo = this.pat.some((o) => o.c.human && o.c.team === team);
    const error = this.d.practica ? 0 : conmigo ? 0.05 : base;
    if (c.en === 'mano' && c.dueño === q) { if (q.cool <= 0) r.drive = true; return r; }
    const compa = this.pat.find((o) => o !== q && o.c.team === team);
    const persona = compa?.c.human ? compa : null;
    if (c.en === 'aire' && q.plan.n !== c.n) {
      const dado = Math.random();
      const torpe = conmigo ? 0 : 1 - ajustes().cpuAgresion;
      q.plan = { n: c.n, tipo: dado < error * 0.45 ? 'falla' : dado < error ? 'mala' : 'bien', reaccion: 0.08 + torpe * 0.3 + Math.random() * 0.12, ruido: (Math.random() - 0.5) * (6 + torpe * 24) };
      if (this.d.practica && this.coach?.ultimo && c.ultimo?.c.human && (c.ultimoTiro === 'smash' || Math.random() < 0.5)) q.plan.tipo = 'falla';
    }
    q.plan.reaccion = Math.max(0, q.plan.reaccion - dt);
    // a dónde ir: si la pelota viene a mi lado y me toca, a donde conviene pegarle; si no, a cubrir mi mitad
    let meta = { x: q.quiereX, d: q.quiereD }, yo = false;
    const viene = c.en === 'aire' && c.lado !== team && this.ladoDe(this.caida().d) === team;
    if (viene) {
      const g = this.caida(true);
      const dist = (o: Tenista) => Math.abs(o.x - g.x) + Math.abs(o.d - g.d) * 0.7;
      // la toma el más cerca; la persona cuenta como más cerca solo si de verdad está ahí (si no, la pareja va)
      if (!compa) yo = true;
      else if (persona) yo = dist(persona) > 48 || dist(q) < dist(persona) - 10;
      else yo = dist(q) <= dist(compa);
      if (yo) meta = { x: g.x + q.plan.ruido + (team === 0 ? -8 : 8), d: g.d + (team === 0 ? -16 : 16) };
      // la alta cerca de la red: salta al smash
      if (yo && q.st === 'piso' && Math.abs(q.d - RED_D) < 80 && Math.abs(c.x - q.x) < 30 && Math.abs(c.d - q.d) < 30 && c.z > 60 && c.z < 110 && c.vz < 0 && q.plan.tipo === 'bien' && Math.random() < 0.3 + ajustes().cpuAgresion * 0.3) r.salta = true;
    }
    if (!yo) {
      // cubrir: la mitad contraria a la del compañero; adelante si el compañero está atrás, y al revés
      const otroX = compa ? compa.x : 0;
      const atras = compa ? (team === 0 ? compa.d < RED_D / 2 : compa.d > RED_D + RED_D / 2) : true;
      const dMio = compa ? (atras ? (team === 0 ? RED_D - 65 : RED_D + 65) : team === 0 ? 24 : LARGO - 24) : team === 0 ? 30 : LARGO - 30;
      meta = { x: Phaser.Math.Clamp(-Math.sign(otroX || 1) * 45, -80, 80), d: dMio };
    }
    if (q.pensar <= 0 && q.plan.reaccion <= 0) { q.pensar = 0.08 + Math.random() * 0.08; q.quiereX = meta.x; q.quiereD = meta.d; }
    const dx = q.quiereX - q.x, dd = q.quiereD - q.d;
    r.mx = Math.abs(dx) > 5 ? Math.sign(dx) : 0;
    const haciaRed = Math.abs(dd) > 6 ? Math.sign(dd) : 0;
    r.my = team === 0 ? -haciaRed : haciaRed;
    r.corre = Math.abs(dx) + Math.abs(dd) > 60;
    // pegarle, solo si le toca: a la altura de la cintura bajando (o saltando, arriba)
    const alto = this.alcance(q);
    if (yo && alto !== null && q.golpeT <= 0 && q.plan.tipo !== 'falla') {
      const bueno = q.st === 'aire' ? alto <= 96 : alto >= 10 && alto <= 48;
      if ((bueno && (c.vz < 0 || c.botes > 0)) || alto < 6) {
        const conFuego = this.nek[team] >= 100 && !this.d.practica && !persona && bueno && this.alcanceFuego(q) && Math.random() < 0.6;
        if (q.plan.tipo === 'mala') this.tocar(q, 'drive', true);
        else if (conFuego) r.fuego = true;
        else if (q.st === 'piso' && Math.abs(q.d - RED_D) > 120 && Math.random() < 0.15) r.globo = true;
        else r.drive = true;
      }
    }
    return r;
  }

  // ------------------------------------------------------------------ entrenamiento

  private pasos(): Paso[] {
    return [
      { texto: 'EL CÍRCULO AMARILLO DICE DÓNDE PICA:\nMUÉVETE AHÍ CON {MOVER}', botones: ['stick'], listo: () => this.llego },
      { texto: 'CUANDO LA PELOTA TE LLEGUE A LA CINTURA,\n{PUÑO} LE PEGA EL DRIVE', botones: ['punch'], listo: () => this.pasadas >= 1 },
      { texto: '¡ESO! LA PALANCA APUNTA A DÓNDE VA.\nPÁSALA 3 VECES MÁS', botones: ['stick', 'punch'], listo: () => this.pasadas >= 4 },
      { texto: 'ACÉRCATE A LA RED: LA QUE VIENE ALTA,\n{PUÑO} ES EL SMASH', botones: ['stick', 'punch'], antes: () => { this.pasoSmash = true; }, listo: () => this.remates >= 1 },
      { texto: `{PATADA} ES EL GLOBO, ALTO Y AL FONDO.\nGÁNALE UN PUNTO A ${this.rivalEntrenoNombre}`, botones: ['stick', 'punch', 'kick'], antes: () => { this.pasoSmash = false; }, listo: () => this.marcador[0] >= 1 },
    ];
  }

  private entrenador() {
    const me = this.pat[0];
    const c = this.bola;
    if (c.en !== 'aire') return;
    const g = this.caida();
    if (g.d < RED_D && Math.abs(me.x - g.x) < 22 && Math.abs(me.d - g.d) < 30 && c.z > 10) this.llego = true;
  }

  // ------------------------------------------------------------------ dibujo y final

  private render() {
    const c = this.bola;
    for (const q of this.pat) {
      const [sx, sy, s] = this.pant(q.x, q.d);
      q.fig.setPosition(Math.round(sx), Math.round(sy - q.z * s)).setScale(s).setDepth(sy);
      q.sombra.setPosition(Math.round(sx), Math.round(sy)).setScale(s * Math.max(0.5, 1 - q.z / 80), s).setDepth(sy - 1);
    }
    const [bx, by, bs] = this.pant(c.x, c.d, c.z);
    const [, gy] = this.pant(c.x, c.d);
    c.spr.setPosition(Math.round(bx), Math.round(by)).setVisible(c.en !== 'piso' || this.pausaT > 0).setDepth(gy + 0.5);
    if (c.en === 'aire') c.spr.setRotation(c.spr.rotation + (c.vx > 0 ? 0.25 : -0.25));
    // el drive Nekketsu: la pelota achatada y en llamas; si no, del tamaño que le toca por la distancia
    const fuego = c.en === 'aire' && c.ultimoTiro === 'fuego';
    if (!fuego) c.spr.setScale(2 * Math.max(0.75, bs));
    tiroSuper(this, c.spr, fuego);
    c.rastro.emitting = c.en === 'aire';
    c.fuego.emitting = fuego;
    c.sombra.setPosition(Math.round(bx), Math.round(gy)).setScale(bs * Math.max(0.4, 1 - c.z / 140)).setVisible(c.en !== 'piso').setDepth(gy - 0.5);
    // el círculo: dónde va a picar, cuando viene a tu lado (en Nekketsu no hay ayuda)
    const g = this.caida();
    const ayuda = ajustes().nombre !== 'NEKKETSU' || !!this.d.practica;
    const viene = c.en === 'aire' && c.lado !== 0 && g.d < RED_D && g.d > -20;
    const [mx, my, ms] = this.pant(g.x, g.d);
    c.marca.setVisible(ayuda && viene).setPosition(Math.round(mx), Math.round(my)).setScale(ms).setDepth(my - 0.4);
    // marcador
    this.scoreTxt.setText(`${this.marcador[0]} - ${this.marcador[1]}`);
    const llena = this.nek[0] >= 100 ? '{ESPECIAL}: ¡DRIVE NEKKETSU!' : '';
    this.toqueTxt.setY(42).setText(rotular(c.en === 'mano' && c.dueño?.c.human ? '{PUÑO}: SACAR' : llena, this.pad.fuente));
    const h = this.hud;
    h.clear();
    h.fillStyle(0x000000, 0.45).fillRect(170, 6, 300, 20);
    for (const t of [0, 1] as const) {
      const x = t === 0 ? 176 : 360, lleno = this.nek[t] >= 100;
      h.fillStyle(0x000000, 0.6).fillRect(x, 28, 104, 6);
      h.fillStyle(lleno ? (Math.floor(this.time.now / 150) % 2 ? 0xffe040 : 0xff6020) : t === 0 ? 0x5a9af0 : 0xf05a5a).fillRect(x + 2, 29, this.nek[t], 4);
    }
  }

  private sfx(name: string, vol = 0.5) { if (this.cache.audio.exists(name)) this.sound.play(name, { volume: vol }); }
  private shake(ms: number, k: number) { this.cameras.main.shake(ms, k); }
  private letrero(p: Tenista, s: string, color: number) {
    const [sx, sy, es] = this.pant(p.x, p.d);
    const t = txt(this, sx, sy - (p.z + 56) * es, s, 'fuente_ui', 1).setTint(color).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 12, alpha: 0, delay: 400, duration: 450, onComplete: () => t.destroy() });
  }

  private terminar(ganador: 0 | 1) {
    if (this.terminado) return;
    this.terminado = true;
    void this.banner(`¡${lado(ganador).gana}!`, 'fuente_titulo', 2, 1600, 110);
    this.time.delayedCall(2400, () => {
      for (const q of this.pat) q.fig.set(q.c.team === ganador ? 'victory' : 'sad', true);
      const orden = [...this.pat]
        .sort((a, b) => Number(b.c.team === ganador) - Number(a.c.team === ganador) || b.puntos - a.puntos)
        .map((q) => ({ c: q.c, valor: `${q.puntos} PUNTOS` }));
      this.resultados(prueba('Tenis').nombre, orden);
    });
  }
}
