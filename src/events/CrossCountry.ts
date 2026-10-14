import Phaser from 'phaser';
import { MAX_W } from '../core/pantalla';
import { Actor, HUECO, Item, NOTHING, type Intent, type World } from '../fight/actor';
import { chip } from '../core/music';
import { ajustes, goma } from '../core/nivel';
import { txt, flash } from '../core/ui';
import { EventScene, prueba, type Competidor, type EventData } from './base';
import hem from '../../data/stages/saigon_hem.layout.json';
import benthanh from '../../data/stages/saigon_benthanh.layout.json';
import rio from '../../data/stages/saigon_rio.layout.json';
import azoteas from '../../data/stages/saigon_azoteas.layout.json';
import estadio from '../../data/stages/saigon_estadio.layout.json';
import type { Paso } from '../core/coach';
import { hayArte, pintarEscenario, queueEscenario } from './escenario';
import { efecto, talla } from '../core/fx';
import { kit, npcs, aves, type Ave } from '../core/kit';
import { Figura } from '../core/figura';
import { spriteVehiculo, vehiculos as vehiculosKit } from '../core/interfaz';

/** El formato de layout de PixelForja (PEDIDO 10.2), la parte que el Cross Country usa. */
interface Caja { x: number; y: number; w: number; d: number; z: number; tipo?: string; subible?: boolean }
interface Agua { x0: number; x1: number; y0?: number; y1?: number; nivel: number; corriente?: number; nombre?: string }
interface Entidad {
  tipo: string; x?: number; y?: number; x0?: number; x1?: number; objeto?: string; vehiculo?: string; animal?: string; carril?: number; cada?: number;
  w?: number; d?: number; z?: number; velocidad?: number; espera?: number;
}
interface Layout {
  id: string; nombre: string; tramo: number; largo: number; franja: { atras: number; adelante: number }; hora: string; clima: string[];
  piso: { x0: number; x1: number; y0?: number; y1?: number; tipo: string; nombre?: string }[];
  huecos: { x0: number; x1: number; y0: number; y1: number; caida: 'agua' | 'vacio'; nombre?: string }[];
  plataformas: Caja[]; muros: Caja[]; solidos: Caja[];
  agua: Agua[];
  bajo: { x0: number; x1: number; y0: number; y1: number; z: number; tipo?: string }[];
  postes: { x: number; y: number; alto: number; tipo?: string }[];
  carriles: { y: number }[];
  entidades: Entidad[];
}

/** Los cinco tramos, en orden: del hẻm a la meta en el estadio. */
const TRAMOS = [hem, benthanh, rio, azoteas, estadio] as unknown as Layout[];

/** Cómo es un recorrido: sus tramos, la ciudad, y si saltar justo antes de un obstáculo da impulso. */
export interface Recorrido { tramos: Layout[]; ciudad: string; impulso?: boolean }
export type { Layout };
/** Lo que se dice antes de cada tramo. */
const AYUDA: Record<string, string> = {
  saigon_hem: 'MANTÉN {MOVER} ADELANTE PARA CORRER · {SALTO} SALTA CANALES Y MUROS · A LOS GOLPES SI HACE FALTA',
  saigon_benthanh: 'PASILLOS ANGOSTOS: ELIGE UNO · SI PISAS LAS FRUTAS, EL DE ATRÁS SE RESBALA',
  saigon_rio: 'EL FERRY ES SEGURO PERO HAY QUE ESPERARLO · NADANDO VAS DIRECTO: OJO CON LOS JACINTOS',
  saigon_azoteas: '{SALTO} CORRIENDO ENTRE EDIFICIOS · CON LLUVIA SE RESBALA · LA VIGA CRUZA EL HUECO ANCHO',
  saigon_estadio: '¡LA RECTA FINAL! {SALTO} LAS VALLAS Y A LA META',
  medellin_c13: 'SUBE HASTA EL MIRADOR · {SALTO} JUSTO ANTES DE UN OBSTÁCULO DA IMPULSO · NO PISES AL PERRO',
};
/** la escalera eléctrica va al revés: empuja para atrás a quien va encima */
const ESCALERA = 50;
// todos los tramos comparten la franja: la cámara y el marcador no cambian de uno a otro
const FT = 200;
const DEPTH = 130;
/** escala 1: el arte de PixelForja está pensado para verse entero, sin pixeles disparejos */
const ZOOM = 1;
/** la vista inclinada del gris: la misma diagonal de las juntas del piso de la azotea de la pelea */
const INCLINA = 0.35;
/** lo que se sube de un paso, sin saltar */
const PASO = 6;
const ALTO = 44;
/** agua hasta acá es un charco (resbala); desde acá se nada */
const CHARCO = 2;
const HONDO = 20;

interface Corredor {
  c: Competidor; a: Actor; done: boolean; time: number; safe: [number, number]; koT: number; carril: number; duda: number; cool: number; rodeo: number; rodeoY: number;
  /** río: por dónde cruza la máquina */
  ruta: 'ferry' | 'nado';
  enredo: number; resbalo: number; aire: boolean; enCharco: boolean; enFruta: boolean;
  /** para despegar a la máquina si se queda dando vueltas en el mismo lugar */
  mejorX: number; mejorT: number; desatasco: number; desatascoY: number;
}
/** `spr` es la tira del kit (lote D2), cuando la hay: la moto pita al acercarse a alguien y frena al atropellar */
interface Vehiculo { x: number; y: number; v: number; g: Phaser.GameObjects.Container; spr?: Phaser.GameObjects.Sprite; id?: string; anim?: string }
/** El ferry del río: una plataforma que va y viene entre los muelles y se lleva a quien esté encima. */
interface Ferry extends Caja { x0: number; x1: number; v: number; espera: number; quieto: number; dir: 1 | -1; g: Phaser.GameObjects.Container; spr?: Phaser.GameObjects.Sprite | null }
interface Jacinto { x: number; y: number; g: Phaser.GameObjects.Graphics | Phaser.GameObjects.Sprite; tocados: Set<Actor> }
interface Fruta { x0: number; x1: number; y0: number; y1: number; t: number; dueño: Actor; g: Phaser.GameObjects.Graphics | Phaser.GameObjects.Container }
/** Un perro de la calle que duerme en el camino: si lo pisas, despierta, te tumba y te persigue un poco. */
/**
 * Un perro dormido. Con el del kit (lote C7c): al pisarlo se despierta (`wake`) y embiste (`pounce`), y tumba en el
 * `impacto` si alcanza; sin él, Thor más oscuro que tumba de una.
 */
interface Perro {
  x: number; y: number; z: number; x0: number; f: Figura; zz: Phaser.GameObjects.BitmapText; despierto: number; presa: Actor | null;
  kitPerro: boolean; fase: 'duerme' | 'despierta' | 'embiste' | 'vuelve';
}
/** Un gato al pie de un techo bajo: si alguien se acerca, se sube de un salto (`jump_wall` medido del lote C7c). */
interface Gato { x: number; y: number; f: Figura; caja: { x: number; z: number }; arriba: boolean; t: number }
/** Bailarines de break en rueda: el que choca con uno, al piso. */
interface Rueda { x: number; y: number; z: number; r: number; t: number; g: (Phaser.GameObjects.Graphics | Quieto)[] }
/** Un NPC del kit en su sitio: lo suyo en bucle (`normal`) y su reacción cuando pasa alguien (`reac`). */
/** Un ave del kit: el gallo se asusta en su sitio; la paloma se va volando y vuelve. `alt` es la altura del dibujo. */
interface Pajaro {
  id: string; a: Ave; s: Phaser.GameObjects.Sprite; sombra: Phaser.GameObjects.Ellipse;
  x: number; y: number; alt: number; x0: number; y0: number; z0: number; izq0: boolean;
  estado: 'suelo' | 'susto' | 'despega' | 'vuela' | 'vuelve' | 'aterriza'; t: number; vx: number; oir: boolean;
}
interface Quieto { s: Phaser.GameObjects.Sprite; id: string; normal: string; reac: string; espera: number; x: number; y: number }
/** Los pelados que juegan fútbol: cada tanto la pelota cruza el callejón de lado a lado. */
interface Pelados { x: number; cada: number; t: number; bola: { x: number; y: number; g: Phaser.GameObjects.Graphics | Phaser.GameObjects.Sprite } | null; chicos: Quieto[]; patea: boolean }

/** Para pasar de un tramo al siguiente: los mismos cuatro y lo que llevan acumulado. */
interface CrossData extends EventData { tramo?: number; suelto?: boolean; cross?: { gente: Competidor[]; acum: Record<string, number> } }

/**
 * Cross Country Saigón, cinco tramos seguidos: el hẻm, el mercado Bến Thành, el río, las azoteas bajo el aguacero
 * y la recta final en el estadio. Gana el menor tiempo sumado. En el camino, a los golpes, como en el original.
 * Cada tramo se ve con el arte de PixelForja si ya llegó, y en gris si no.
 */
export class CrossCountry extends EventScene implements World {
  actors: Actor[] = [];
  items: Item[] = [];
  floorTop = FT;
  /**
   * El borde de abajo queda medio pixel adentro: el terreno cubre la profundidad de 0 a DEPTH sin incluir DEPTH, y
   * pegado justo en DEPTH no había muros, huecos ni agua (se pasaba todo por el borde).
   */
  limites = { xmin: 12, xmax: 3828, depth: DEPTH - 0.5 };
  /** la del arte de PixelForja (0 mientras lo pinte derecho); INCLINA en el gris */
  inclinacion = 0;
  private L!: Layout;
  private tramo = 0;
  /** un tramo suelto (desde Pruebas sueltas): termina con su tabla, sin seguir al siguiente */
  private suelto = false;
  private acum: Record<string, number> = {};
  private gente2: Corredor[] = [];
  private cajas: Caja[] = [];
  private arte: ReturnType<typeof pintarEscenario> | null = null;
  /** el agua sobre los pies de cada uno, justo delante de su figura */
  private aguaPies = new Map<Actor, Phaser.GameObjects.Graphics>();
  /** la silueta de color de quien queda tapado detrás de algo alto (un puesto, un muro), para no perderlo de vista */
  private siluetas = new Map<Actor, Phaser.GameObjects.Sprite>();
  private vehiculos: Vehiculo[] = [];
  private vehT: number[] = [];
  private ferry: Ferry | null = null;
  private jacintos: Jacinto[] = [];
  private jacT = 0;
  private frutas: Fruta[] = [];
  private derrame = new Map<Caja, number>();
  private lluvia: Phaser.GameObjects.TileSprite | null = null;
  private perros: Perro[] = [];
  private gatos: Gato[] = [];
  private ruedas: Rueda[] = [];
  private quietos: Quieto[] = [];
  private pajaros: Pajaro[] = [];
  private cantoInicio = false;
  private pelados: Pelados[] = [];
  /** el metrocable del fondo, en gris: las cabinas que cruzan el cielo */
  private cabinas: { g: Phaser.GameObjects.Graphics; u: number }[] = [];
  private meta = 3790;
  private clock = 0;
  private holdRun = 0;
  private stop = 0;
  private entre: { t: number; go: () => void } | null = null;
  private hud!: Phaser.GameObjects.Graphics;
  private timeTxt!: Phaser.GameObjects.BitmapText;
  private heads: { img: Phaser.GameObjects.Image; r: Corredor }[] = [];
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dusts!: Phaser.GameObjects.Particles.ParticleEmitter;
  private splash!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(key = 'CrossCountry', private recorrido: Recorrido = { tramos: TRAMOS, ciudad: 'SAIGÓN' }) { super(key); }

  private get tramos() { return this.recorrido.tramos; }

  init(d: CrossData) {
    super.init(d);
    // el entrenamiento es siempre el hẻm; `tramo` sirve también para probar uno suelto
    this.tramo = this.d.practica ? 0 : Phaser.Math.Clamp(d.tramo ?? 0, 0, this.tramos.length - 1);
    this.acum = {};
    if (d.cross && !this.d.practica) { this.gente = d.cross.gente; this.acum = { ...d.cross.acum }; }
    this.L = this.tramos[this.tramo];
    this.suelto = !!d.suelto && !this.d.practica;
    // "otra vez" repite el mismo tramo suelto
    if (this.suelto) Object.assign(this.d, { tramo: this.tramo, suelto: true });
    if (this.L.franja.atras !== FT || this.L.franja.adelante - this.L.franja.atras !== DEPTH) throw new Error(`${this.L.id}: la franja tiene que ser 200 a 330`);
  }

  preload() { super.preload(); queueEscenario(this, this.L.id); }

  get sc(): Phaser.Scene { return this; }

  /** Tu equipo pega más según el nivel. */
  multDaño(from: Actor | null) { return from?.team === 0 ? ajustes().daño : 1; }

  create() {
    const L = this.L;
    this.actors = [];
    this.items = [];
    this.gente2 = [];
    this.aguaPies.clear();
    this.siluetas.clear();
    this.vehiculos = [];
    this.jacintos = [];
    this.frutas = [];
    this.derrame.clear();
    this.heads = [];
    this.clock = 0;
    this.jacT = 0;
    this.holdRun = 0;
    this.stop = 0;
    this.entre = null;
    this.lluvia = null;
    this.perros = [];
    this.gatos = [];
    this.ruedas = [];
    this.quietos = [];
    this.pajaros = [];
    this.cantoInicio = false;
    this.pelados = [];
    this.cabinas = [];
    this.limites = { xmin: 12, xmax: L.largo - 12, depth: DEPTH - 0.5 };
    this.cajas = [...L.plataformas, ...L.muros, ...L.solidos];
    this.meta = L.entidades.find((e) => e.tipo === 'meta')?.x ?? L.largo - 50;
    const salida = L.entidades.find((e) => e.tipo === 'salida')?.x ?? 40;
    this.vehT = this.vias().map((e) => (e.cada ?? 5) * 0.6);
    this.setup(ZOOM, L.largo);
    // el arte de PixelForja si ya llegó; si no, el gris, visto inclinado
    this.arte = hayArte(this, L.id) ? pintarEscenario(this, L.id, 5000) : null;
    this.inclinacion = this.arte ? this.arte.inclinacion : INCLINA;
    this.cameras.main.setBounds(0, 0, L.largo + this.inclinacion * DEPTH, 360);
    if (!this.arte) this.dibujar();
    this.armarFerry();
    this.sparks = this.add.particles(0, 0, 'px', { speed: { min: 60, max: 180 }, lifespan: 260, scale: { start: 0.9, end: 0 }, tint: [0xffffff, 0xffe040, 0xffa020], emitting: false }).setDepth(5000);
    this.dusts = this.add.particles(0, 0, 'px', { speedX: { min: -40, max: 40 }, speedY: { min: -30, max: -6 }, lifespan: 380, scale: { start: 0.8, end: 0 }, tint: 0xb0a8b8, alpha: { start: 0.7, end: 0 }, emitting: false }).setDepth(4999);
    this.splash = this.add.particles(0, 0, 'px', { speed: { min: 30, max: 90 }, angle: { min: 200, max: 340 }, gravityY: 300, lifespan: 420, scale: { start: 1, end: 0.3 }, tint: [0xffffff, 0x9ad8f0], emitting: false }).setDepth(5000);
    for (const e of L.entidades) if (e.tipo === 'objeto' && e.objeto && this.hayObjeto(e.objeto)) this.items.push(new Item(this, e.objeto, e.x ?? 0, e.y ?? 60));
    // el primer clima de la lista es el de hoy; los demás son los que el escenario puede tener otro día
    if (L.clima[0] === 'aguacero') this.ponerLluvia();
    this.armarPerros();
    this.armarGatos();
    this.armarGente();
    this.armarAves();

    this.gente.forEach((c, i) => {
      const y = L.carriles[i % L.carriles.length].y;
      const a = new Actor(this, c.id, c.team, salida, y, c.human);
      if (c.team === 0) a.maxHp = a.hp = Math.round(a.maxHp * ajustes().vida);
      a.left = false;
      this.actors.push(a);
      this.gente2.push({ c, a, done: false, time: 0, safe: [salida, y], koT: 0, carril: y, duda: 0, cool: 1, rodeo: -1, rodeoY: 0, ruta: Math.random() < 0.4 ? 'ferry' : 'nado', enredo: 0, resbalo: 0, aire: false, enCharco: false, enFruta: false, mejorX: salida, mejorT: 0, desatasco: 0, desatascoY: 1 });
    });
    this.cameras.main.centerOn(salida + 200, 360 - 180 / ZOOM);
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.timeTxt = this.uiAdd(txt(this, 626, 14, '0.00', 'fuente_ui', 2, 1).setDepth(8001));
    const varios = this.tramos.length > 1;
    if (!this.d.practica && varios) this.uiAdd(txt(this, 626, 32, `TRAMO ${this.tramo + 1}/${this.tramos.length}`, 'fuente_ui', 1, 1).setDepth(8001).setTint(0xffe080));
    for (const r of this.gente2) this.heads.push({ img: this.uiAdd(this.add.image(0, 22, 'cabecitas', r.c.id).setDepth(8002)), r });
    if (!this.arte) this.uiAdd(txt(this, 14, 326, varios ? `TRAMO ${this.tramo + 1} · ESCENARIO EN GRIS` : 'ESCENARIO EN GRIS', 'fuente_ui', 1, 0).setDepth(8001).setTint(0x8a8ab0));
    this.tema(this.L.id.startsWith('medellin') ? 'parce_corra' : this.L.id.startsWith('saigon') ? 'saigon_chay' : null);
    if (this.L.id.startsWith('medellin') || this.L.id.startsWith('saigon')) this.ambiente(this.L.id.startsWith('medellin') ? 'comuna' : 'trafico_saigon');
    const p = prueba(this.scene.key);
    if (this.d.practica) { void this.entrenar(p.nombre, this.pasos(), 40); return; }
    const titulo = this.suelto ? `${p.nombre} · TRAMO ${this.tramo + 1}` : this.tramo === 0 ? p.nombre : `TRAMO ${this.tramo + 1} DE ${this.tramos.length}`;
    void this.previa(titulo, `${L.nombre}, ${this.recorrido.ciudad}`, AYUDA[L.id] ?? '');
  }

  /** Solo los objetos que el kit ya trae (D1); los que pida un layout y no estén esperan a su lote. */
  private hayObjeto(id: string) { return id in kit().objetos; }

  /** Entrenamiento: te lleva a cada obstáculo y espera a que lo pases. */
  private pasos(): Paso[] {
    const r = () => this.gente2[0];
    const ir = (x: number, y: number) => () => { const a = r().a; a.x = x; a.y = y; a.z = 0; a.setSt('idle', 'idle'); r().safe = [x, y]; this.cameras.main.centerOn(this.px(x, y) + 80, 360 - 180 / ZOOM); flash(this, 120); };
    if (this.L.id === 'medellin_c13') return [
      { texto: 'MANTÉN {MOVER} ADELANTE\nY ARRANCAS A CORRER', botones: ['stick'], listo: () => r().a.st === 'run' },
      { texto: 'UN PERRO DORMIDO: NO LO PISES,\nSÁLTALO CON {SALTO}', botones: ['stick', 'jump'], antes: ir(340, 30), listo: () => r().a.x > 470 && r().a.grounded },
      { texto: 'ESCALONES: SE SUBEN SOLOS\nCAMINANDO, HASTA LA TERRAZA', botones: ['stick'], antes: ir(470, 60), listo: () => r().a.x > 600 && r().a.base >= 24 },
      { texto: 'BAILARINES DE BREAK: RODÉALOS\nPOR ARRIBA O POR ABAJO', botones: ['stick'], antes: ir(700, 64), listo: () => r().a.x > 880 },
      { texto: 'EL MURO PINTADO: {SALTO} JUSTO\nANTES DE LLEGAR. ¡DA IMPULSO!', botones: ['jump'], antes: ir(980, 64), listo: () => r().a.x > 1080 && r().a.grounded },
      { texto: 'LA ESCALERA ELÉCTRICA VA AL REVÉS:\nCORRE FUERTE, O SUBE SALTANDO AL LADO', botones: ['stick', 'jump'], antes: ir(1100, 30), listo: () => r().a.x > 1260 && r().a.base >= 66 },
      { texto: 'LA BARANDA: CRÚZALA EN EQUILIBRIO\nO SALTA EL HUECO CORRIENDO', botones: ['stick', 'jump'], antes: ir(2560, 67), listo: () => r().a.x > 2690 && r().a.grounded },
      { texto: '¡ESO! AHORA SUBE\nHASTA EL MIRADOR', botones: ['stick', 'jump'], listo: () => r().done },
    ];
    return [
      { texto: 'MANTÉN {MOVER} ADELANTE\nY ARRANCAS A CORRER', botones: ['stick'], listo: () => r().a.st === 'run' },
      { texto: 'UN CANAL: CORRE Y TOCA {SALTO}\nJUSTO ANTES DEL BORDE', botones: ['stick', 'jump'], antes: ir(1080, 40), listo: () => r().a.x > 1266 && r().a.grounded },
      { texto: 'MURO BAJO:\nSÁLTALO CON {SALTO}', botones: ['jump'], antes: ir(1320, 60), listo: () => r().a.x > 1424 && r().a.grounded },
      { texto: 'MURO ALTO: RODÉALO POR EL PORTÓN\nDE ABAJO, O TREPA LAS CAJAS', botones: ['stick', 'jump'], antes: ir(1480, 30), listo: () => r().a.x > 1730 },
      { texto: 'CALLE INUNDADA: TE FRENA Y\nTE EMPUJA. ¡SIGUE PA\' LANTE!', botones: ['stick'], antes: ir(2340, 64), listo: () => r().a.x > 2905 },
      { texto: 'CANAL ANCHO: TOMA IMPULSO\nY SALTA CON {SALTO}', botones: ['stick', 'jump'], antes: ir(2900, 64), listo: () => r().a.x > 3084 && r().a.grounded },
      { texto: '¡ESO! AHORA\nLLEGA A LA META', botones: ['stick'], listo: () => r().done },
    ];
  }

  // ------------------------------------------------------------------ el terreno

  private enHueco(x: number, y: number) { return this.L.huecos.some((h) => x >= h.x0 && x < h.x1 && y >= h.y0 && y < h.y1); }

  /** El agua en (x, y), si hay: charco, calle inundada o río hondo según su nivel. */
  private aguaEn(x: number, y: number) { return this.L.agua.find((w) => x >= w.x0 && x < w.x1 && y >= (w.y0 ?? 0) && y < (w.y1 ?? DEPTH)); }

  /** El tipo de piso en (x, y): el último que lo cubre gana, como en PixelForja. */
  private pisoEn(x: number, y: number) {
    let t = 'asfalto';
    for (const p of this.L.piso) if (x >= p.x0 && x < p.x1 && y >= (p.y0 ?? 0) && y < (p.y1 ?? DEPTH)) t = p.tipo;
    return t;
  }

  /** El techo más alto bajo (x, y) que quede a la altura de los pies (o un escalón más arriba). */
  suelo(x: number, y: number, z: number): number {
    let top = this.enHueco(x, y) ? HUECO : 0;
    for (const c of this.cajas) if (x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.d && c.z <= z + PASO && c.z > top) top = c.z;
    return top;
  }

  bloquea(x: number, y: number, z: number): boolean {
    return this.cajas.some((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.d && c.z > z + PASO);
  }

  caida(a: Actor) {
    const r = this.gente2.find((g) => g.a === a);
    if (!r) return;
    const agua = this.L.huecos.find((h) => a.x >= h.x0 && a.x < h.x1)?.caida !== 'vacio';
    if (agua) { if (!efecto(this, 'chapuzon_grande', this.px(a.x, a.y), FT + a.y - 40, { depth: 5003 })) this.splash.explode(16, this.px(a.x, a.y), FT + a.y); }
    else efecto(this, 'polvo_caer_grande', this.px(r.safe[0], r.safe[1]), FT + r.safe[1]);
    this.sfx('esquiva', 0.4);
    if (a.human) this.letrero(a, agua ? '¡AL AGUA!' : '¡CASI TE CAES DEL EDIFICIO!', 0x9ad8ff);
    a.x = r.safe[0]; a.y = r.safe[1]; a.z = 0; a.vx = 0; a.vy = 0; a.vz = 0;
    a.dropAll();
    a.setSt('idle', 'idle');
    a.invul = 1.2;
  }

  // ------------------------------------------------------------------ World

  hitstop(s: number) { this.stop = Math.max(this.stop, s); }
  shake(ms: number, k: number) { this.cameras.main.shake(ms, k); }
  sfx(name: string, vol = 0.5) { if (this.cache.audio.exists(name)) this.sound.play(name, { volume: vol }); }
  spark(x: number, y: number, z: number, big: boolean) {
    efecto(this, big ? 'chispa_golpe_pesado' : 'chispa_golpe_medio', this.px(x, y), FT + y - z, { depth: 5002 });
    this.sparks.explode(big ? 8 : 4, this.px(x, y), FT + y - z);
  }
  dust(x: number, y: number) {
    // en el agua salpica; en seco, polvo
    const enAgua = !!this.aguaEn(x, y);
    if (!efecto(this, enAgua ? 'salpicadura_piso' : 'polvo_caer_medio', this.px(x, y), FT + y)) this.dusts.explode(7, this.px(x, y), FT + y);
  }

  /** Cada paso: nubecita o salpicadura, y el sonido del piso (piedra, madera o agua). */
  paso(a: Actor) {
    const piso = this.pisoBajo(a);
    if (piso === 'agua') efecto(this, 'salpicadura_piso', this.px(a.x, a.y), FT + a.y, { flip: a.left });
    else if (a.st === 'run') efecto(this, `polvo_correr_${talla(a.fig.celda)}`, this.px(a.x, a.y), FT + a.y - a.base, { flip: a.left, depth: a.fig.depth + 0.1 });
    if (a.human) this.sfx(`paso_${piso}_${Math.floor(Math.random() * 3)}`, 0.28);
  }

  /** Qué hay bajo los pies, para el sonido: agua, madera, tierra, pasto o piedra. */
  private pisoBajo(a: Actor): 'agua' | 'madera' | 'piedra' | 'tierra' {
    if (a.base > 0) {
      const c = this.cajas.find((b) => a.x >= b.x && a.x < b.x + b.w && a.y >= b.y && a.y < b.y + b.d && Math.abs(b.z - a.base) < 1);
      if (c && /carro|cajas|mesas|puesto|muelle|banca|bote|ferry|canastas/.test(c.tipo ?? '')) return 'madera';
      return 'piedra';
    }
    if (this.aguaEn(a.x, a.y)) return 'agua';
    const p = this.pisoEn(a.x, a.y);
    return p === 'madera' ? 'madera' : p === 'tierra' || p === 'cancha' ? 'tierra' : 'piedra';
  }
  number(x: number, y: number, n: number) {
    const t = txt(this, this.px(x, y), FT + y - 52, `${n}`, 'fuente_ui', 1).setTint(0xff6060).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 650, onComplete: () => t.destroy() });
  }
  onHit(_from: Actor | null, v: Actor, _dmg: number, kd: boolean) {
    this.sfx(kd ? 'critico' : 'golpe', kd ? 0.5 : 0.4);
    this.hitstop(kd ? 0.07 : 0.04);
    if (kd && v.human) this.shake(100, 0.005);
  }
  onKO(a: Actor) {
    this.sfx('enemigo_muere', 0.4);
    const r = this.gente2.find((g) => g.a === a);
    if (r) r.koT = 2.4;
    if (a.human) this.letrero(a, '¡K.O.! YA TE PARAS...', 0xffa0a0);
  }
  special(a: Actor) { a.meter = 0; }

  // ------------------------------------------------------------------ cuadro a cuadro

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    const p = this.pad.read();
    if (this.endTick(p)) { for (const r of this.gente2) r.a.update(dt, NOTHING); this.render(); this.filterUi(); return; }
    if (this.entre) {
      // entre tramos: la tabla se queda un rato y sigue sola (o con un botón)
      this.entre.t -= dt;
      for (const r of this.gente2) r.a.update(dt, NOTHING);
      if (this.entre.t <= 0 || (this.entre.t < 2.4 && (p.pressed.punch || p.pressed.jump || p.pressed.start || p.pressed.kick))) { const go = this.entre.go; this.entre = null; go(); }
      this.render(); this.filterUi(); return;
    }
    if (this.stop > 0) { this.stop -= dt; this.render(); this.filterUi(); return; }
    const juego = this.fase === 'juego';
    if (juego) this.clock += dt;
    // correr sin doble toque: mantener adelante un ratito
    this.holdRun = p.x > 0 ? this.holdRun + dt : 0;
    this.moverFerry(dt);
    for (const r of this.gente2) {
      const a = r.a;
      const prevX = a.x, prevY = a.y;
      let it: Intent = NOTHING;
      if (juego && !r.done) it = a.human
        ? { x: p.x, y: p.y, run: p.run || this.holdRun > 0.22, punch: p.pressed.punch, kick: p.pressed.kick, jump: p.pressed.jump, special: false }
        : this.cerebro(r, dt);
      // enredado en los jacintos: no avanza hasta soltarse
      if (r.enredo > 0) { r.enredo -= dt; it = { ...NOTHING, punch: it.punch, kick: it.kick }; }
      // en el río hondo se nada: no se salta
      const w = this.aguaEn(a.x, a.y);
      if (w && w.nivel >= HONDO && a.z < 3) it = { ...it, jump: false };
      // la máquina corre según el nivel, y con la goma si va muy adelante o muy atrás
      if (!a.human) a.vel = ajustes().cpuVel * goma(a.x - this.gente2[0].a.x);
      a.update(dt, it);
      this.terreno(r, prevX, prevY, dt);
    }
    for (const i of this.items) i.update(dt);
    if (juego && !this.d.practica) { this.trafico(dt); this.rio(dt); }
    this.fruta(dt);
    this.perrosTick(dt);
    this.gatosTick(dt);
    this.genteTick(dt);
    this.avesTick(dt);
    this.coach?.tick(dt);
    this.render();
    if (juego) this.checkEnd();
    this.filterUi();
  }

  /** Agua, toldos, resbalones, punto seguro para volver, KO y llegada. */
  private terreno(r: Corredor, prevX: number, prevY: number, dt: number) {
    const a = r.a;
    const L = this.L;
    // si algo lo dejó metido en una caja (cargado, empujado, el ferry que llega), sale por arriba
    if (a.st !== 'lifted') {
      const dentro = this.cajas.filter((c) => a.x >= c.x && a.x < c.x + c.w && a.y >= c.y && a.y < c.y + c.d && c.z > a.z + PASO);
      if (dentro.length) a.z = Math.max(...dentro.map((c) => c.z));
    }
    // agua: el charco resbala, la calle inundada frena y empuja, y en el río se nada contra la corriente
    const ag = this.aguaEn(a.x, a.y);
    if (ag && a.z < 6 && ag.nivel > CHARCO) {
      const k = ag.nivel >= HONDO ? 0.74 : 0.62;
      a.x = prevX + (a.x - prevX) * k + (ag.corriente ?? 0) * dt;
      if (ag.nivel >= HONDO) a.y = prevY + (a.y - prevY) * k;
      if (Math.abs(a.x - prevX) > 0.5 && Math.random() < dt * 10) this.splash.explode(2, this.px(a.x, a.y), FT + a.y);
    }
    const charco = !!ag && ag.nivel <= CHARCO && a.grounded && a.base === 0;
    if (charco && !r.enCharco && a.st === 'run' && Math.random() < (a.human ? 0.45 : 0.3)) this.resbalar(r, '¡RESBALÓN EN EL CHARCO!');
    r.enCharco = charco;
    // con aguacero, caer corriendo de un salto puede terminar de nalgas (en el zinc, más)
    if (r.aire && a.grounded && a.st !== 'fall' && L.clima[0] === 'aguacero' && Math.abs(a.x - prevX) > 1.5) {
      const zinc = this.pisoEn(a.x, a.y) === 'metal' && a.base === 0;
      if (Math.random() < (zinc ? 0.25 : 0.1)) this.resbalar(r, zinc ? '¡EL ZINC MOJADO RESBALA!' : '¡RESBALÓN!');
    }
    // la escalera eléctrica al revés empuja para atrás a quien va encima
    if (a.grounded && a.base > 0 && this.cajas.some((c) => c.tipo === 'escalera_electrica' && a.x >= c.x && a.x < c.x + c.w && a.y >= c.y && a.y < c.y + c.d && Math.abs(c.z - a.base) < 1)) a.x -= ESCALERA * dt;
    // el impulso: saltar justo antes de un obstáculo lleva más lejos
    if (this.recorrido.impulso && !r.aire && !a.grounded && a.st === 'jump' && a.vz > 150) {
      const dir = a.left ? -1 : 1;
      const obst = this.cajas.some((c) => c.z > a.base + PASO && a.y >= c.y && a.y < c.y + c.d && (dir > 0 ? c.x - a.x : a.x - (c.x + c.w)) > 6 && (dir > 0 ? c.x - a.x : a.x - (c.x + c.w)) < 34);
      if (obst && Math.abs(a.vx) > 50) {
        a.vx *= 1.35;
        a.vz *= 1.08;
        this.fx(a);
        if (a.human) { this.letrero(a, '¡IMPULSO!', 0xffe040); chip.blip(1320, 0.12, 'sq25', 0.14, 1760); }
      }
    }
    // frutas: quien cae encima de un puesto de frutas las tumba al pasillo
    if (r.aire && a.grounded && a.base > 0) {
      const c = this.cajas.find((b) => b.tipo === 'puesto_frutas' && a.x >= b.x && a.x < b.x + b.w && a.y >= b.y && a.y < b.y + b.d && Math.abs(b.z - a.base) < 1);
      if (c) this.derramar(c, a);
    }
    r.aire = !a.grounded;
    // toldo bajo: quien salta debajo se da en la cabeza
    if (a.vz > 0 && L.bajo.some((b) => a.x >= b.x0 && a.x < b.x1 && a.y >= b.y0 && a.y < b.y1 && a.z + ALTO > b.z)) {
      a.vz = -40;
      this.sfx('bloqueo', a.human ? 0.4 : 0.1);
      if (a.human) this.letrero(a, '¡AY, EL TOLDO!', 0xffe080);
    }
    // el último piso firme, lejos de los huecos y fuera del agua honda, para volver si se cae
    if (a.grounded && a.base >= 0 && !(ag && ag.nivel >= HONDO) && !L.huecos.some((h) => a.x > h.x0 - 50 && a.x < h.x1 + 10) && !(this.ferry && a.base === this.ferry.z && a.x >= this.ferry.x0 - 4 && a.x <= this.ferry.x1 + 4)) r.safe = [a.x, a.y];
    if (r.resbalo > 0) r.resbalo -= dt;
    // KO: en una carrera nadie queda fuera, se para un rato después
    if (r.koT > 0) {
      r.koT -= dt;
      if (r.koT <= 0 && !a.alive) { a.hp = Math.round(a.maxHp * 0.5); a.setSt('idle', 'idle'); a.invul = 1.5; }
    }
    if (!r.done && a.x >= this.meta) {
      r.done = true;
      r.time = this.clock;
      a.fig.row = 'down';
      a.setSt('win', 'victory');
      const lugar = this.gente2.filter((g) => g.done).length;
      this.letrero(a, `¡${lugar}° LUGAR!`, lugar === 1 ? 0xffd040 : 0xffffff);
      if (a.human) { flash(this, 120); chip.blip(1568, 0.3, 'sq25', 0.2, 2093); void this.banner('¡META!', 'fuente_titulo', 2, 900, 110); }
    }
  }

  /** Al piso sin daño: solo el susto y el tiempo perdido. */
  /** Tumba al que pisó algo resbaloso o chocó con alguien. Dice si de verdad lo tumbó. */
  private resbalar(r: Corredor, s: string): boolean {
    const a = r.a;
    if (r.resbalo > 0 || !a.canBeHit() || a.carrying) return false;
    r.resbalo = 2.5;
    a.knockdown(a.left ? -1 : 1, 70, 90);
    // el resbalón mojado del kit: los pies para arriba y de nalgas
    if (a.tiene('slip_wet')) a.play('slip_wet', true);
    this.sfx('esquiva', a.human ? 0.45 : 0.15);
    if (a.human) this.letrero(a, s, 0x9ad8ff);
    return true;
  }

  // ------------------------------------------------------------------ mercado: frutas al piso

  /** Las frutas del puesto ruedan al pasillo, justo detrás; el que lo pisó ya pasó, el que viene se resbala. */
  private derramar(c: Caja, a: Actor) {
    if ((this.derrame.get(c) ?? 0) > this.clock) return;
    this.derrame.set(c, this.clock + 12);
    const f: Fruta = { x0: c.x + c.w, x1: c.x + c.w + 54, y0: c.y, y1: c.y + c.d, t: 10, dueño: a, g: this.add.graphics() };
    const fk = vehiculosKit().frutas_regadas;
    if (fk && this.textures.exists('veh_frutas_regadas')) {
      // la fruta regada del kit (lote D2), en manchones por todo el pasillo de atrás del puesto
      f.g.destroy();
      const cont = this.add.container(0, 0);
      for (let yy = f.y0; yy < f.y1 - 4; yy += fk.huella.d + 2) for (let xx = f.x0; xx < f.x1 - 8; xx += fk.huella.w - 6) {
        const x = xx + Math.random() * 6, y = yy + Math.random() * 3;
        cont.add(this.add.image(Math.round(this.px(x, y)), FT + y, 'veh_frutas_regadas', 0).setOrigin(fk.ancla[0] / fk.w, fk.ancla[1] / fk.h));
      }
      f.g = cont;
    } else {
      const g = f.g as Phaser.GameObjects.Graphics;
      const col = [0xff9a20, 0xffd040, 0x7ac83a, 0xe8403a, 0xb04ad0];
      for (let i = 0; i < 26; i++) {
        const x = f.x0 + Math.random() * (f.x1 - f.x0), y = f.y0 + 2 + Math.random() * (f.y1 - f.y0 - 4);
        g.fillStyle(col[i % col.length]).fillCircle(Math.round(this.px(x, y)), Math.round(FT + y), 2 + (i % 2));
      }
    }
    f.g.setDepth(FT + f.y0 - 0.2);
    this.frutas.push(f);
    this.sfx('romper', a.human ? 0.4 : 0.15);
    if (a.human) this.letrero(a, '¡SE CAYERON LAS FRUTAS!', 0xffb040);
  }

  private fruta(dt: number) {
    for (const f of this.frutas) {
      f.t -= dt;
      if (f.t < 1.5) f.g.setAlpha(Math.max(0, f.t / 1.5));
      for (const r of this.gente2) {
        const a = r.a;
        const en = a.x >= f.x0 && a.x < f.x1 && a.y >= f.y0 && a.y < f.y1 && a.grounded && a.base === 0;
        if (en && !r.enFruta && a !== f.dueño && a.st === 'run' && Math.random() < 0.6) this.resbalar(r, '¡UNA CÁSCARA! ¡RESBALÓN!');
        r.enFruta = en;
      }
    }
    this.frutas = this.frutas.filter((f) => { if (f.t <= 0) { f.g.destroy(); return false; } return true; });
  }

  /** El brillito del impulso a los pies. */
  private fx(a: Actor) { efecto(this, 'brillo_record', this.px(a.x, a.y), FT + a.y - a.z - 10, { depth: a.fig.depth + 0.2 }); }

  // ------------------------------------------------------------------ comuna: perros dormidos

  private armarPerros() {
    for (const e of this.L.entidades) {
      if (e.tipo !== 'animal' || !String(e.animal ?? '').startsWith('perro')) continue;
      const x = e.x ?? 0, y = e.y ?? 60;
      const z = Math.max(0, this.suelo(x, y, 999));
      // el perro de la calle del kit, enroscado; si no llegó, Thor más oscuro, echado
      const kitPerro = !!kit().animales.perro_calle_1;
      const f = kitPerro ? new Figura(this, this.px(x, y), FT + y - z, 'perro_calle_1', 'sleep') : new Figura(this, this.px(x, y), FT + y - z, 'thor', 'lie').setTint(0x8a7a6a);
      f.row = kitPerro ? 'right' : 'down_right';
      const zz = txt(this, this.px(x, y) + 10, FT + y - z - 30, 'Z z', 'fuente_ui', 1).setTint(0xc8d8ff);
      this.tweens.add({ targets: zz, y: zz.y - 6, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
      this.perros.push({ x, y, z, x0: x, f, zz, despierto: 0, presa: null, kitPerro, fase: 'duerme' });
    }
  }

  /** Un monito gris para la gente del gris (bailarín, grafitero, músico, pelado): cabeza, cuerpo y brazos. */
  private monito(color: number) {
    const g = this.add.graphics();
    g.fillStyle(0x2a2a34).fillEllipse(0, 0, 14, 4);
    g.fillStyle(color).fillRect(-4, -22, 8, 14);
    g.fillStyle(0x3a3a48).fillRect(-4, -8, 3, 8).fillRect(1, -8, 3, 8);
    g.fillStyle(0xd8a888).fillCircle(0, -27, 5);
    g.fillStyle(color).fillRect(-8, -20, 4, 3).fillRect(4, -20, 4, 3);
    return g;
  }

  /** Un NPC del kit parado en (x, y) del mundo, con sus pies en el ancla, tocando `anim` en bucle (null si no llegó). */
  private npc(id: string, anim: string, x: number, y: number) {
    const n = npcs()[id];
    if (!n || !this.textures.exists(`npc_${id}`) || !this.anims.exists(`npc_${id}_${anim}`)) return null;
    const z = Math.max(0, this.suelo(x, y, 999));
    const s = this.add.sprite(Math.round(this.px(x, y)), FT + y - z, `npc_${id}`, n.anims[anim].desde)
      .setOrigin((n.ancla[0] + 0.5) / n.w, (n.ancla[1] + 0.5) / n.h).setDepth(this.profundidadEn(x, y, z));
    s.play(`npc_${id}_${anim}`);
    return s;
  }

  /** La profundidad de algo parado en (x, y, z): sobre una caja, después de esa caja; en el piso, por su y. */
  private profundidadEn(x: number, y: number, z: number) {
    if (z > 0) {
      const c = this.cajas.find((b) => x >= b.x && x < b.x + b.w && y >= b.y && y < b.y + b.d && Math.abs(b.z - z) < 1);
      if (c) return FT + this.ordenCaja(c) + 0.5;
    }
    return FT + y;
  }

  /** Toca una reacción y después vuelve a lo suyo. Mientras reacciona (y un ratito después) no vuelve a reaccionar. */
  private reaccion(q: Quieto) {
    if (q.espera > 0 || !this.anims.exists(`npc_${q.id}_${q.reac}`)) return;
    q.espera = 2.2;
    q.s.play(`npc_${q.id}_${q.reac}`);
    q.s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => { if (q.s.active) q.s.play(`npc_${q.id}_${q.normal}`); });
  }

  /** La gente de la calle según el layout: bailarines de break, pelados con su pelota y el resto, que reacciona al pasar. */
  private armarGente() {
    for (const e of this.L.entidades) {
      if (e.tipo !== 'npc') continue;
      const x = e.x ?? 0, y = e.y ?? 60, z = Math.max(0, this.suelo(x, y, 999));
      const npc = String((e as { npc?: string }).npc ?? '');
      if (npc === 'bailarines_break') {
        // con el arte del kit, tres bailarines distintos: uno en el piso con el molino y dos de pie
        const g: Rueda['g'] = [];
        for (let i = 0; i < 3; i++) {
          const s = this.npc(`bailarin_${i + 1}`, i === 0 ? 'molino' : 'toprock', x, y);
          if (s) g.push({ s, id: `bailarin_${i + 1}`, normal: i === 0 ? 'molino' : 'toprock', reac: 'reclama', espera: 0, x, y });
        }
        const col = [0xff4fa0, 0x40d0ff, 0xffd040];
        this.ruedas.push({ x, y, z, r: (e as { radio?: number }).radio ?? 26, t: 0, g: g.length === 3 ? g : col.map((c) => this.monito(c)) });
        if (g.length < 3 && !this.arte) this.rotulo(this.px(x, y) - 30, FT + y - z - 50, 'BAILARINES DE BREAK');
      } else if (npc === 'pelados_futbol') {
        // los pelados al fondo del callejón, esperando el pase
        const chicos: Quieto[] = [];
        for (const [k, id] of ['pelado_1', 'pelado_2'].entries()) {
          const s = this.npc(id, 'espera', x - 20 + k * 40, 2);
          if (s) chicos.push({ s, id, normal: 'espera', reac: 'perdon', espera: 0, x: x - 20 + k * 40, y: 2 });
        }
        this.pelados.push({ x, cada: e.cada ?? 3, t: 1, bola: null, chicos, patea: false });
        if (!chicos.length && !this.arte) {
          for (const [k, c] of [0x40c060, 0xe0e0e8].entries()) { const zz = Math.max(0, this.suelo(x - 20 + k * 40, 2, 999)); this.monito(c).setPosition(this.px(x - 20 + k * 40, 2), FT + 2 - zz).setDepth(this.profundidadEn(x - 20 + k * 40, 2, zz)); }
          this.rotulo(this.px(x, 2) - 30, FT - Math.max(0, this.suelo(x, 2, 999)) - 40, 'LOS PELADOS JUEGAN FÚTBOL');
        }
      } else {
        // el grafitero pinta, los músicos tocan y el vendedor llama; cuando pasa alguien cerca, reaccionan
        const que: Record<string, [string, string]> = { grafitero: ['pintar', 'mirar'], musicos: ['tocar', 'animar'], vendedor_paletas: ['llamar', 'ofrecer'] };
        const [normal, reac] = que[npc] ?? ['', ''];
        const s = normal ? this.npc(npc, normal, x, y) : null;
        if (s) this.quietos.push({ s, id: npc, normal, reac, espera: 0, x, y });
        else if (!this.arte) {
          this.monito(npc === 'grafitero' ? 0xb04ad0 : npc === 'musicos' ? 0xf2a03a : 0x6a9ad0).setPosition(this.px(x, y), FT + y - z).setDepth(this.profundidadEn(x, y, z));
          this.rotulo(this.px(x, y) - 24, FT + y - z - 40, npc.toUpperCase().replace(/_/g, ' '));
        }
      }
    }
    for (const e of this.L.entidades) if (e.tipo === 'animal' && e.animal === 'gallo' && !aves().gallo && !this.arte) {
      const x = e.x ?? 0, y = e.y ?? 20, z = Math.max(0, this.suelo(x, y, 999));
      const g = this.add.graphics().setPosition(this.px(x, y), FT + y - z).setDepth(FT + y);
      g.fillStyle(0xe8e0d0).fillEllipse(0, -6, 12, 9).fillStyle(0xd03020).fillRect(2, -14, 4, 4).fillStyle(0xf2c230).fillRect(6, -9, 3, 2).fillStyle(0x2a6a3a).fillRect(-8, -12, 4, 6);
      this.rotulo(this.px(x, y) - 12, FT + y - z - 22, 'GALLO');
    }
  }

  // ------------------------------------------------------------------ aves: el gallo y las palomas (lote C7b)

  /** El gallo del techo y las palomas, donde el layout los pone. Sin el kit de aves no se pone nada (el gallo gris sí). */
  private armarAves() {
    for (const e of this.L.entidades) {
      if (e.tipo !== 'animal' || (e.animal !== 'gallo' && e.animal !== 'paloma')) continue;
      // el gallo mira a los que vienen; las palomas, para cualquier lado
      this.ave(e.animal, e.x ?? 0, e.y ?? 60, e.animal === 'gallo' || Math.random() < 0.5);
    }
  }

  private ave(id: string, x: number, y: number, izq: boolean) {
    const a = aves()[id];
    if (!a || !this.anims.exists(`ave_${id}_idle`)) return;
    const z = Math.max(0, this.suelo(x, y, 999));
    const s = this.add.sprite(0, 0, `ave_${id}`, a.anims.idle.desde);
    const sombra = this.add.ellipse(0, 0, Math.round(a.w * 0.5), 3, 0x000000, 0.25);
    const p: Pajaro = { id, a, s, sombra, x, y, alt: z, x0: x, y0: y, z0: z, izq0: izq, estado: 'suelo', t: Math.random() * 2, vx: 0, oir: false };
    this.voltear(p, izq);
    s.play({ key: `ave_${id}_idle`, startFrame: Phaser.Math.Between(0, a.anims.idle.cuadros - 1) });
    // los eventos del kit: el canto en el cuadro 3 de cantar, el aleteo en el 1 de asustarse y despegar
    s.on(Phaser.Animations.Events.ANIMATION_UPDATE, (anim: Phaser.Animations.Animation, f: Phaser.Animations.AnimationFrame) => {
      const n = anim.key.slice(`ave_${id}_`.length);
      const i = Number(f.textureFrame) - (a.anims[n]?.desde ?? 0);
      for (const ev of a.eventos?.[n] ?? []) {
        if (ev.cuadro !== i || (!this.aveEnVista(p) && !p.oir)) continue;
        // el gallo y el aleteo del kit (lote H2); sin ellos, los sintetizados de antes
        if (ev.tipo === 'canto') { const v = this.aveEnVista(p) ? 0.5 : 0.25; this.suena('gallo', v, () => chip.kikiriki(v / 5)); }
        else if (ev.tipo === 'aleteo') this.suena('aleteo', 0.4, () => chip.aleteo(0.1));
      }
    });
    this.pajaros.push(p);
    this.ponerAve(p);
  }

  /** Miran a la derecha: a la izquierda, espejo, con el ancla en el mismo pixel de las patas. */
  private voltear(p: Pajaro, izq: boolean) {
    const { w, h, ancla } = p.a;
    p.s.setFlipX(izq).setOrigin((izq ? w - ancla[0] - 0.5 : ancla[0] + 0.5) / w, (ancla[1] + 0.5) / h);
  }

  private aveEnVista(p: Pajaro) {
    const v = this.cameras.main.worldView, sx = this.px(p.x, p.y);
    return sx > v.x - 10 && sx < v.right + 10;
  }

  /** Toca una animación del ave y, al terminar, `luego` (una sola espera a la vez). Si el kit no la trae, salta a `luego`. */
  private aveAnim(p: Pajaro, n: string, luego?: () => void) {
    p.s.off(Phaser.Animations.Events.ANIMATION_COMPLETE);
    if (!this.anims.exists(`ave_${p.id}_${n}`)) { luego?.(); return; }
    p.s.play(`ave_${p.id}_${n}`);
    if (luego) p.s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, luego);
  }

  /** El dibujo a su altura y la sombra en el piso que tiene abajo; volando va encima de todo. */
  private ponerAve(p: Pajaro) {
    const piso = p.estado === 'suelo' || p.estado === 'susto' ? p.alt : Math.max(0, this.suelo(p.x, p.y, 999));
    const sx = Math.round(this.px(p.x, p.y)), alto = p.alt - piso;
    p.s.setPosition(sx, Math.round(FT + p.y - p.alt));
    p.sombra.setPosition(sx, Math.round(FT + p.y - piso)).setScale(Math.max(0.35, 1 - alto / 90)).setVisible(alto < 140);
    const d = this.profundidadEn(p.x, p.y, piso);
    p.s.setDepth(alto > 10 ? 4500 : d);
    p.sombra.setDepth(d - 0.05);
  }

  private avesTick(dt: number) {
    const juego = this.fase === 'juego';
    // el gallo canta cuando arranca la carrera, aunque esté lejos
    const arranca = juego && !this.cantoInicio;
    if (arranca) this.cantoInicio = true;
    const cerca = (p: Pajaro, d = 40) => this.gente2.find((r) => Math.hypot(r.a.x - p.x, r.a.y - p.y) < d && Math.abs(r.a.z - p.z0) < 30)?.a;
    for (const p of this.pajaros) {
      p.t -= dt;
      const quien = cerca(p);
      if (p.id === 'gallo') {
        if (arranca) { p.oir = true; p.estado = 'susto'; this.aveAnim(p, 'cantar', () => { p.oir = false; this.aveQuieta(p); }); }
        else if (p.estado === 'suelo' && quien) {
          p.estado = 'susto';
          this.aveAnim(p, 'asustarse', () => { p.t = 1.2; this.aveQuieta(p); });
        } else if (p.estado === 'suelo' && p.t <= 0) {
          // entre medio picotea, se queda quieto y, si está a la vista, canta cada tanto
          p.t = 2 + Math.random() * 3;
          const canta = this.aveEnVista(p) && Math.random() < 0.3;
          if (canta || Math.random() < 0.5) { p.estado = 'susto'; this.aveAnim(p, canta ? 'cantar' : 'picotear', () => this.aveQuieta(p)); }
        }
      } else this.palomaTick(p, dt, quien);
      this.ponerAve(p);
    }
  }

  /** Vuelve al idle en su sitio. */
  private aveQuieta(p: Pajaro) {
    if (!p.s.active) return;
    p.estado = 'suelo';
    this.aveAnim(p, 'idle');
  }

  /** La paloma: picotea y camina; si pasa alguien, despega, se va volando, vuelve y aterriza donde estaba. */
  private palomaTick(p: Pajaro, dt: number, quien: Actor | undefined) {
    const vuelta = Math.hypot(p.x - p.x0, p.y - p.y0);
    switch (p.estado) {
      case 'suelo': {
        if (quien) {
          // sale para el lado contrario de quien viene
          p.estado = 'despega';
          const izq = quien.x > p.x;
          this.voltear(p, izq);
          p.vx = (izq ? -1 : 1) * (70 + Math.random() * 30);
          this.aveAnim(p, 'despegar', () => { p.estado = 'vuela'; p.t = 1.6 + Math.random() * 0.8; this.aveAnim(p, 'volar'); });
          break;
        }
        if (p.s.anims.currentAnim?.key === `ave_${p.id}_caminar`) {
          p.x += (p.s.flipX ? -1 : 1) * 8 * dt;
          if (Math.abs(p.x - p.x0) > 14) this.voltear(p, p.x > p.x0);
        }
        if (p.t > 0) break;
        p.t = 1 + Math.random() * 2;
        const r = Math.random();
        if (r < 0.35) { this.voltear(p, Math.random() < 0.5); this.aveAnim(p, 'caminar'); }
        else if (r < 0.75) { this.aveAnim(p, 'picotear', () => this.aveAnim(p, 'idle')); }
        else this.aveAnim(p, 'idle');
        break;
      }
      case 'despega':
        // los cuadros ya suben 3 px: el juego solo la empuja un poco
        p.x += p.vx * 0.3 * dt;
        break;
      case 'vuela':
        // se va para el fondo, subiendo
        p.x += p.vx * dt;
        p.y = Math.max(0, p.y - 14 * dt);
        p.alt = Math.min(p.z0 + 90, p.alt + 45 * dt);
        if (p.t <= 0) { p.estado = 'vuelve'; this.voltear(p, p.x0 < p.x); }
        break;
      case 'vuelve': {
        // si todavía hay gente donde estaba, da otra vuelta
        if (vuelta < 70 && this.gente2.some((r) => Math.hypot(r.a.x - p.x0, r.a.y - p.y0) < 50)) { p.estado = 'vuela'; p.t = 1; p.vx = -p.vx; this.voltear(p, p.vx < 0); break; }
        const v = Math.min(1, (75 * dt) / Math.max(1, vuelta));
        p.x += (p.x0 - p.x) * v;
        p.y += (p.y0 - p.y) * v;
        // baja a medida que llega: a 4 px del sitio toca el piso con los cuadros de aterrizar
        p.alt = p.z0 + Math.min(p.alt - p.z0, Math.max(0, vuelta - 4) * 0.6);
        if (vuelta < 4) {
          p.x = p.x0; p.y = p.y0; p.alt = p.z0;
          p.estado = 'aterriza';
          this.aveAnim(p, 'aterrizar', () => { p.t = 1.5; this.voltear(p, p.izq0); this.aveQuieta(p); });
        }
        break;
      }
      default:
    }
  }

  /** La pelota que sale de la patada: la del kit girando, o una dibujada si no llegó. */
  private pelota() {
    const n = npcs().pelota;
    if (n && this.textures.exists('npc_pelota') && this.anims.exists('npc_pelota_girar')) {
      return this.add.sprite(0, 0, 'npc_pelota').setOrigin((n.ancla[0] + 0.5) / n.w, (n.ancla[1] + 0.5) / n.h).play('npc_pelota_girar');
    }
    const g = this.add.graphics();
    g.fillStyle(0xf4f4f4).fillCircle(0, -4, 4).fillStyle(0x202020).fillRect(-1, -6, 2, 2).fillRect(-3, -3, 2, 2).fillRect(2, -3, 2, 2);
    return g;
  }

  private genteTick(dt: number) {
    // alguien corriendo a menos de 40 px de un NPC lo hace reaccionar
    const cerca = (x: number, y: number, d = 40) => this.gente2.some((r) => Math.hypot(r.a.x - x, r.a.y - y) < d);
    for (const q of this.quietos) {
      q.espera = Math.max(0, q.espera - dt);
      if (cerca(q.x, q.y)) this.reaccion(q);
    }
    for (const w of this.ruedas) {
      w.t += dt;
      w.g.forEach((d, i) => {
        const a = w.t * 1.8 + (i * Math.PI * 2) / w.g.length;
        const x = w.x + Math.cos(a) * w.r, y = w.y + Math.sin(a) * w.r * 0.5;
        if ('s' in d) {
          // los del kit: el molino ya gira en su dibujo
          d.x = x; d.y = y;
          d.espera = Math.max(0, d.espera - dt);
          d.s.setPosition(Math.round(this.px(x, y)), Math.round(FT + y - w.z)).setDepth(this.profundidadEn(x, y, w.z));
        } else {
          // uno hace el molino de cabeza, los otros bailan de pie
          d.setPosition(Math.round(this.px(x, y)), Math.round(FT + y - w.z)).setDepth(this.profundidadEn(x, y, w.z)).setAngle(i === 0 ? (w.t * 720) % 360 : Math.sin(w.t * 8 + i) * 12);
        }
        for (const r of this.gente2) {
          const a2 = r.a;
          if (a2.z > w.z + 10 || Math.abs(a2.x - x) > 12 || Math.abs(a2.y - y) > 7) continue;
          if (this.resbalar(r, '¡CUIDADO CON EL BREAK!') && 's' in d) this.reaccion(d);
        }
      });
    }
    for (const p of this.pelados) {
      for (const q of p.chicos) q.espera = Math.max(0, q.espera - dt);
      if (!p.bola) {
        p.t -= dt;
        if (p.t > 0 || p.patea) continue;
        p.t = p.cada * (0.8 + Math.random() * 0.4);
        const sale = (bx: number) => {
          p.patea = false;
          p.bola = { x: bx, y: -4, g: this.pelota() };
          this.sfx('golpe', 0.15);
        };
        // con el arte, uno de los pelados patea y la pelota sale en el cuadro del impacto
        const q = p.chicos.length ? p.chicos[Phaser.Math.Between(0, p.chicos.length - 1)] : null;
        const imp = q ? npcs()[q.id]?.eventos?.patear?.find((e) => e.tipo === 'impacto')?.cuadro : undefined;
        if (q && imp !== undefined && this.anims.exists(`npc_${q.id}_patear`)) {
          p.patea = true;
          q.espera = 9;
          q.s.play(`npc_${q.id}_patear`);
          const ver = (_a: Phaser.Animations.Animation, f: Phaser.Animations.AnimationFrame) => {
            if (f.index - 1 !== imp) return;
            q.s.off(Phaser.Animations.Events.ANIMATION_UPDATE, ver);
            sale(q.x + 6);
          };
          q.s.on(Phaser.Animations.Events.ANIMATION_UPDATE, ver);
          q.s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
            q.s.off(Phaser.Animations.Events.ANIMATION_UPDATE, ver);
            if (p.patea) sale(q.x + 6);
            q.espera = 0;
            if (q.s.active) q.s.play(`npc_${q.id}_${q.normal}`);
          });
        } else sale(p.x + Phaser.Math.Between(-24, 24));
        continue;
      }
      const b = p.bola;
      b.y += 120 * dt;
      const z = Math.max(0, this.suelo(b.x, Math.min(DEPTH - 1, Math.max(0, b.y)), 999));
      // la del kit gira sola; la dibujada se gira aquí
      b.g.setPosition(Math.round(this.px(b.x, b.y)), Math.round(FT + b.y - z - Math.abs(Math.sin(b.y / 9)) * 6)).setDepth(this.profundidadEn(b.x, Math.max(0, b.y), z));
      if (b.g instanceof Phaser.GameObjects.Graphics) b.g.setAngle(b.y * 8);
      for (const r of this.gente2) {
        const a = r.a;
        if (a.z > z + 8 || Math.abs(a.x - b.x) > 9 || Math.abs(a.y - b.y) > 6) continue;
        // ¡perdón, señor!: los pelados se encogen
        if (this.resbalar(r, '¡LA PELOTA! ¡PERDÓN, SEÑOR!')) for (const q of p.chicos) { q.espera = 0; this.reaccion(q); }
      }
      if (b.y > DEPTH + 8) { b.g.destroy(); p.bola = null; }
    }
    for (const c of this.cabinas) {
      c.u = (c.u + dt * 0.012) % 1;
      const cx = -60 + c.u * (MAX_W + 120);
      c.g.setPosition(Math.round(cx), Math.round(74 - (cx + 20) * 56 / 720 - 4));
    }
  }

  /** Quien pisa a un perro dormido lo despierta: ladra, lo tumba y lo persigue un ratito. */
  private perrosTick(dt: number) {
    for (const p of this.perros) {
      const ev = p.f.step(dt);
      if (p.kitPerro && (p.fase === 'despierta' || p.fase === 'embiste')) this.perroEmbiste(p, ev);
      else if (p.despierto > 0) {
        p.despierto -= dt;
        const q = p.presa;
        if (q && p.despierto > 0.6) { p.x += Math.sign(q.x - p.x) * Math.min(150 * dt, Math.abs(q.x - p.x)); p.f.left = q.x < p.x; }
        else { p.x += Math.sign(p.x0 - p.x) * Math.min(90 * dt, Math.abs(p.x0 - p.x)); p.f.left = p.x0 < p.x; }
        p.f.set(Math.abs(p.x - p.x0) > 2 || (q && p.despierto > 0.6) ? 'run' : 'idle');
        if (p.despierto <= 0) {
          p.f.set(p.kitPerro ? 'sleep' : 'lie'); p.f.row = p.kitPerro ? 'right' : 'down_right';
          p.zz.setVisible(true); p.presa = null; p.fase = 'duerme';
        }
      } else {
        for (const r of this.gente2) {
          const a = r.a;
          if (!a.grounded || Math.abs(a.base - p.z) > 2 || Math.abs(a.x - p.x) > 14 || Math.abs(a.y - p.y) > 8 || !a.canBeHit()) continue;
          p.presa = a;
          p.zz.setVisible(false);
          this.sfx('ladrido', a.human ? 0.7 : 0.25);
          if (p.kitPerro) {
            // se despierta de golpe y embiste: el que lo pisó tiene un ratico para escaparse
            p.fase = 'despierta';
            p.f.row = 'right';
            p.f.left = a.x < p.x;
            p.f.set('wake', true, 1.8);
            if (a.human) this.letrero(a, '¡GUAU! ¡DESPERTASTE AL PERRO!', 0xffa060);
          } else {
            p.despierto = 2.2;
            p.f.set('bark', true);
            a.knockdown(a.left ? -1 : 1, 60, 110);
            if (a.human) this.letrero(a, '¡GUAU! ¡DESPERTASTE AL PERRO!', 0xffa060);
          }
          break;
        }
      }
      p.f.setPosition(Math.round(this.px(p.x, p.y)), FT + p.y - p.z).setDepth(FT + p.y + 0.2);
    }
  }

  /** El perro del kit: despierta, embiste hacia el que lo pisó entre el despegue y el aterrizaje, y tumba en el impacto. */
  private perroEmbiste(p: Perro, ev: { tipo: string }[]) {
    const q = p.presa;
    if (p.fase === 'despierta') {
      if (!p.f.anim.done) return;
      p.fase = 'embiste';
      if (q) p.f.left = q.x < p.x;
      p.f.set('pounce', true);
      return;
    }
    // en el aire va hacia la presa (el pounce no avanza solo)
    const f = p.f.anim.frame;
    if (q && f >= p.f.cuadroDe('despegue') && f < p.f.cuadroDe('aterriza')) {
      const dt = this.game.loop.delta / 1000;
      p.x += Math.sign(q.x - p.x) * Math.min(200 * dt, Math.max(0, Math.abs(q.x - p.x) - 6));
      p.y += Math.sign(q.y - p.y) * Math.min(60 * dt, Math.abs(q.y - p.y));
    }
    if (q && ev.some((e) => e.tipo === 'impacto') && Math.abs(q.x - p.x) < 20 && Math.abs(q.y - p.y) < 10 && q.grounded && q.canBeHit()) {
      q.knockdown(p.f.left ? -1 : 1, 70, 120);
      this.sfx('ladrido', q.human ? 0.6 : 0.2);
    }
    if (p.f.anim.done) { p.fase = 'vuelve'; p.despierto = 1.4; p.presa = null; }
  }

  /** Gatos al pie de los techos bajos de la Comuna (los que su salto cubre): uno cada tanto, no todos. */
  private armarGatos() {
    const g = kit().animales.gato_1?.anims.jump_wall;
    if (!g?.subida || !this.L.id.startsWith('medellin')) return;
    const min = g.muro_min ?? 14, max = g.muro_max ?? 42;
    const techos = this.L.plataformas.filter((c) => c.z >= min && c.z <= max && c.subible).filter((_c, i) => i % 3 === 0).slice(0, 3);
    for (const c of techos) {
      const x = c.x - 10, y = c.y + Math.min(10, c.d / 2);
      const f = new Figura(this, this.px(x, y), FT + y, 'gato_1', 'sit');
      f.row = 'right';
      this.gatos.push({ x, y, f, caja: { x: c.x + 8, z: c.z }, arriba: false, t: Math.random() * 3 });
    }
  }

  private gatosTick(dt: number) {
    for (const g of this.gatos) {
      g.f.step(dt);
      let z = g.arriba ? g.caja.z : 0;
      if (g.f.anim.name === 'jump_wall') {
        // en cada cuadro sube lo que dice `subida` del alto de este techo, y avanza hasta arriba entre despegue y aterrizaje
        const d = g.f.anim.data, i = g.f.anim.frame;
        z = (d.subida?.[i] ?? 0) * g.caja.z;
        const a = g.f.cuadroDe('despegue'), b = g.f.cuadroDe('aterriza');
        const u = Phaser.Math.Clamp((g.f.anim.pos - a) / Math.max(1, b - a), 0, 1);
        g.f.setX(Math.round(this.px(g.x + (g.caja.x - g.x) * u, g.y)));
        if (g.f.anim.done) { g.arriba = true; g.x = g.caja.x; g.f.set('sit', true); z = g.caja.z; }
      } else if (!g.arriba && this.gente2.some((r) => Math.abs(r.a.x - g.x) < 40 && Math.abs(r.a.y - g.y) < 24)) {
        g.f.set('jump_wall', true);
      } else g.f.setX(Math.round(this.px(g.x, g.y)));
      g.f.setY(FT + g.y - z).setDepth(FT + g.y + 0.2);
    }
  }

  // ------------------------------------------------------------------ río: ferry y jacintos

  private armarFerry() {
    this.ferry = null;
    const e = this.L.entidades.find((v) => v.tipo === 'vehiculo' && v.vehiculo === 'ferry');
    if (!e) return;
    const w = e.w ?? 110, d = e.d ?? 40, z = e.z ?? 12, x0 = e.x0 ?? 0, y = e.y ?? 0;
    const K = this.inclinacion;
    const g = this.add.container(Math.round(this.px(x0, y)), FT + y);
    // el ferry de PixelForja (lote D2): su ancla es la esquina de atrás a la izquierda de la huella, como el gris
    const spr = spriteVehiculo(this, 'ferry', 'atracado');
    if (spr) {
      g.add(spr);
      g.setDepth(FT + y + d - 0.5);
      this.ferry = { x: x0, y, w, d, z, tipo: 'ferry', x0, x1: e.x1 ?? x0 + 400, v: e.velocidad ?? 80, espera: e.espera ?? 2, quieto: e.espera ?? 2, dir: 1, g, spr };
      this.cajas.push(this.ferry);
      return;
    }
    // la cubierta, el casco rojo al frente y su costado izquierdo, en la misma vista inclinada que el resto
    const casco = this.add.graphics();
    const kd = Math.round(K * d);
    casco.fillStyle(0x6a2a1e).fillPoints([{ x: 0, y: -z }, { x: kd, y: d - z }, { x: kd, y: d }, { x: 0, y: 0 }], true);
    casco.fillStyle(0xd8d0b8).fillPoints([{ x: 0, y: -z }, { x: w, y: -z }, { x: w + kd, y: d - z }, { x: kd, y: d - z }], true);
    for (let x = 12; x < w; x += 12) casco.fillStyle(0x000000, 0.1).fillRect(x + Math.round(K * d / 2), d / 2 - z, 1, 1);
    casco.fillStyle(0x8a3a2a).fillRect(kd, d - z, w, z);
    casco.fillStyle(0x30303a).fillRect(kd, d - z, w, 2);
    casco.lineStyle(1, 0x303038).strokeRect(kd + 0.5, d - z + 0.5, w - 1, z - 1);
    g.add([casco, this.add.bitmapText(w / 2 + kd / 2, -z - 6, 'fuente_ui', 'FERRY').setOrigin(0.5).setTint(0xf0f0f8)]);
    g.setDepth(FT + y + d - 0.5);
    this.ferry = { x: x0, y, w, d, z, tipo: 'ferry', x0, x1: e.x1 ?? x0 + 400, v: e.velocidad ?? 80, espera: e.espera ?? 2, quieto: e.espera ?? 2, dir: 1, g };
    this.cajas.push(this.ferry);
  }

  /** El ferry espera en cada muelle y cruza; quien va encima viaja con él. */
  private moverFerry(dt: number) {
    const f = this.ferry;
    if (!f || this.fase !== 'juego') return;
    let dx = 0;
    // atracado mientras espera en el muelle, andando (con su espuma) mientras cruza
    const anim = f.quieto > 0 ? 'veh_ferry_atracado' : 'veh_ferry_andando';
    if (f.spr && f.spr.anims.currentAnim?.key !== anim && this.anims.exists(anim)) f.spr.play(anim);
    if (f.quieto > 0) f.quieto -= dt;
    else {
      const fin = f.dir > 0 ? f.x1 - f.w : f.x0;
      dx = Phaser.Math.Clamp(fin - f.x, -f.v * dt, f.v * dt);
      if (Math.abs(fin - (f.x + dx)) < 0.5) { dx = fin - f.x; f.quieto = f.espera; f.dir = f.dir > 0 ? -1 : 1; this.sfx('bloqueo', 0.15); }
    }
    if (!dx) return;
    for (const a of this.actors) if (a.grounded && Math.abs(a.base - f.z) < 1 && a.x >= f.x && a.x < f.x + f.w && a.y >= f.y && a.y < f.y + f.d) a.x += dx;
    f.x += dx;
    f.g.setX(Math.round(this.px(f.x, f.y)));
  }

  /** ¿El ferry está atracado en este muelle (izquierda o derecha)? */
  private atracado(lado: 'izq' | 'der') {
    const f = this.ferry;
    if (!f || f.quieto <= 0) return false;
    return lado === 'izq' ? f.x <= f.x0 + 0.5 : f.x + f.w >= f.x1 - 0.5;
  }

  /** Jacintos de agua que bajan con la corriente por el río hondo: quien se los topa se enreda un rato. */
  private rio(dt: number) {
    const hondos = this.L.agua.filter((w) => w.nivel >= HONDO && (w.y1 ?? DEPTH) - (w.y0 ?? 0) > 60);
    const me = this.gente2[0].a;
    this.jacT -= dt;
    if (hondos.length && this.jacT <= 0) {
      this.jacT = 1.7 + Math.random() * 1.1;
      const w = hondos[Math.floor(Math.random() * hondos.length)];
      // salen delante de quien va más adelante dentro del río, para que siempre haya alguno por esquivar
      const xs = this.actors.filter((a) => a.x >= w.x0 - 200 && a.x < w.x1).map((a) => a.x);
      if (xs.length) {
        const x = Math.min(w.x1 - 10, Math.max(...xs) + 140 + Math.random() * 160);
        const y = (w.y0 ?? 0) + 6 + Math.random() * ((w.y1 ?? DEPTH) - (w.y0 ?? 0) - 12);
        // los del kit (lote D2) flotando, con su ancla corrida para que (x, y) quede en el centro de la huella
        const jk = vehiculosKit().jacintos;
        const spr = jk ? spriteVehiculo(this, 'jacintos', 'flotando') : null;
        let g: Phaser.GameObjects.Graphics | Phaser.GameObjects.Sprite;
        if (spr && jk) g = spr.setOrigin((jk.ancla[0] + jk.huella.w / 2 + this.inclinacion * jk.huella.d / 2) / jk.w, (jk.ancla[1] - jk.huella.d / 2) / jk.h);
        else {
          const gg = this.add.graphics();
          gg.fillStyle(0x2a7a3a).fillEllipse(0, 0, 26, 9);
          gg.fillStyle(0x4aa84a).fillEllipse(-4, -1, 14, 6).fillEllipse(6, 0, 10, 5);
          gg.fillStyle(0xb08ae0).fillCircle(-2, -3, 2).fillCircle(5, -2, 1.5);
          g = gg;
        }
        this.jacintos.push({ x, y, g, tocados: new Set() });
      }
    }
    for (const j of this.jacintos) {
      const w = this.aguaEn(j.x, j.y);
      j.x += ((w?.corriente ?? -12) * 1.6 - 8) * dt;
      j.g.setPosition(Math.round(this.px(j.x, j.y)), Math.round(FT + j.y)).setDepth(FT + j.y + 0.3);
      for (const r of this.gente2) {
        const a = r.a;
        if (j.tocados.has(a) || a.z > 4 || Math.abs(a.x - j.x) > 15 || Math.abs(a.y - j.y) > 8) continue;
        j.tocados.add(a);
        r.enredo = 0.8;
        this.splash.explode(4, this.px(a.x, a.y), FT + a.y);
        this.sfx('bloqueo', a.human ? 0.4 : 0.1);
        if (a.human) this.letrero(a, '¡TE ENREDASTE EN LOS JACINTOS!', 0x8ae08a);
      }
    }
    this.jacintos = this.jacintos.filter((j) => { const w = this.aguaEn(j.x, j.y); if (!w || j.x < me.x - 500) { j.g.destroy(); return false; } return true; });
  }

  /**
   * La máquina corre hacia la meta: salta huecos y muros bajos, rodea lo que es muy alto,
   * cruza el río en ferry o nadando, y pelea con quien se le cruce del otro equipo.
   */
  private cerebro(r: Corredor, dt: number): Intent {
    const a = r.a;
    r.cool -= dt;
    if (!a.controllable) return NOTHING;
    if (r.duda > 0) { r.duda -= dt; return { ...NOTHING, x: 1 }; }
    // si lleva rato sin avanzar (y no es que espera el ferry), prueba por otro lado un momento
    if (a.x > r.mejorX + 24) { r.mejorX = a.x; r.mejorT = this.clock; }
    const esperaFerry = !!this.ferry && a.x > this.ferry.x0 - 40 && a.x < this.ferry.x1 + 10 && Math.abs(a.base - this.ferry.z) < 1;
    if (r.desatasco > 0) { r.desatasco -= dt; return { ...NOTHING, x: r.desatasco > 0.7 ? -1 : 1, y: r.desatascoY, run: true, jump: r.desatasco < 0.35 && a.grounded }; }
    if (!esperaFerry && this.clock - r.mejorT > 3) {
      r.mejorT = this.clock; r.rodeo = -1;
      r.desatasco = 1.3;
      r.desatascoY = a.y < DEPTH / 2 ? 1 : -1;
      if (Math.random() < 0.3) r.desatascoY = -r.desatascoY;
    }
    // rodeando: retrocede hasta pasar la caja que le tapaba el paso
    if (r.rodeo >= 0) {
      if (a.x > r.rodeo && a.controllable) return { ...NOTHING, x: -1, y: r.rodeoY };
      r.rodeo = -1;
    }
    const it: Intent = { x: 1, y: 0, run: true, punch: false, kick: false, jump: false, special: false };
    const base = a.base;
    let destinoY = r.carril;
    // el río: por el muelle hasta el ferry, o al agua por la parte de adelante
    const f = this.ferry;
    if (f) {
      const muelleIni = f.x0 - 330, muelleFin = f.x1 + 300;
      if (a.x > muelleIni && a.x < muelleFin) {
        destinoY = r.ruta === 'ferry' ? f.y + f.d / 2 : Math.min(DEPTH - 20, f.y + f.d + 40);
        const encima = a.grounded && Math.abs(base - f.z) < 1;
        if (r.ruta === 'ferry' && encima) {
          const enFerry = a.x >= f.x && a.x < f.x + f.w;
          if (enFerry && !this.atracado('der')) return { ...NOTHING, y: Math.sign(f.y + f.d / 2 - a.y) * (Math.abs(f.y + f.d / 2 - a.y) > 6 ? 1 : 0) };
          // en el muelle de salida: espera al borde a que el ferry esté
          if (!enFerry && a.x > f.x0 - 26 && a.x < f.x0 && !this.atracado('izq')) return NOTHING;
          if (enFerry && a.x > f.x + f.w - 20 && !this.atracado('der')) return NOTHING;
        }
        if (r.ruta === 'ferry' && a.x > f.x0 - 30 && a.x < f.x1 && base < f.z - 1 && a.grounded) r.ruta = 'nado';
      }
    }
    const ahead = a.x + 22;
    // un hueco adelante: salta corriendo (a veces duda y se cae, como cualquiera)
    if (a.grounded && this.suelo(ahead, a.y, a.z) <= HUECO / 2) {
      if (Math.random() < 0.04) { r.duda = 0.25; return { ...NOTHING, x: 1 }; }
      it.jump = true;
    }
    // una caja adelante: si se sube de un salto, salta; si es muy alta, la rodea por donde quede más cerca
    const delante = (lejos: number) => this.cajas
      .filter((c) => c !== f && c.x + c.w > a.x && c.x - a.x < lejos && a.y >= c.y - 4 && a.y < c.y + c.d + 4 && c.z > base + PASO)
      .sort((p, q) => p.x - q.x)[0];
    // lo que no se salta de un brinco se rodea: busca la fila libre más cercana en los próximos metros
    const libre = (y: number) => !this.cajas.some((c) => c !== f && c.z > base + 32 && c.x + c.w > a.x && c.x - a.x < 160 && y >= c.y - 6 && y < c.y + c.d + 6);
    let acomodando = false;
    if (!libre(a.y)) {
      let best = -1;
      for (let y = 4; y <= DEPTH - 4; y += 4) if (libre(y) && (best < 0 || Math.abs(y - a.y) < Math.abs(best - a.y))) best = y;
      if (best >= 0) {
        destinoY = best;
        acomodando = Math.abs(a.y - best) > 4;
        const sy = Math.sign(best - a.y);
        const lo = Math.min(a.y, best), hi = Math.max(a.y, best);
        // cajas que tapan el camino en diagonal: si ya está encima, retrocede; si está cerca, se para y se corre de lado
        const tapa = this.cajas
          .filter((c) => c !== f && c.z > base + PASO && c.x + c.w > a.x - 2 && c.x - a.x < 60 && c.y < hi && c.y + c.d > lo)
          .sort((p, q) => p.x - q.x)[0];
        if (acomodando && tapa && a.x >= tapa.x - 2) { r.rodeo = tapa.x - 10; r.rodeoY = sy; return { ...NOTHING, x: -1, y: sy }; }
        if (acomodando && tapa && tapa.x - a.x < 34) return { ...NOTHING, y: sy };
        const pared = this.cajas.find((c) => c !== f && c.z > base + 32 && c.x + c.w > a.x && c.x - a.x < 24 && a.y >= c.y - 4 && a.y < c.y + c.d + 4);
        if (acomodando && pared) return { ...NOTHING, y: sy };
      }
    }
    // lo que se salta de un brinco, solo si no está acomodándose hacia un paso libre
    const pegada = delante(22);
    if (pegada && pegada.z <= base + 32 && a.y >= pegada.y && a.y < pegada.y + pegada.d && !acomodando) { if (a.grounded) it.jump = true; }
    if (Math.abs(a.y - destinoY) > 3) it.y = Math.sign(destinoY - a.y);
    // una moto o un xích lô que viene de frente por su carril: se hace a un lado
    const viene = this.vehiculos.find((m) => m.x - a.x > -10 && m.x - a.x < 170 && Math.abs(m.y - a.y) < 16);
    if (viene && a.grounded) it.y = viene.y > DEPTH / 2 ? (a.y <= viene.y ? -1 : 1) : (a.y >= viene.y ? 1 : -1);
    // a los golpes con el rival que tenga al lado
    const rival = this.gente2.find((o) => o !== r && o.c.team !== r.c.team && o.a.canBeHit() && Math.abs(o.a.x - a.x) < 26 && Math.abs(o.a.y - a.y) < 10);
    if (rival && r.cool <= 0 && a.grounded) {
      r.cool = (0.5 + Math.random() * 0.9) / ajustes().cpuAgresion;
      a.left = rival.a.x < a.x;
      if (Math.random() < 0.6) return { ...NOTHING, x: Math.sign(rival.a.x - a.x), punch: Math.random() < 0.55, kick: Math.random() >= 0.55 };
    }
    return it;
  }

  /** Los vehículos que vienen en contra por su carril (motos, xích lô), cada uno en su tramo de calle. */
  private vias() { return this.L.entidades.filter((e) => e.tipo === 'vehiculo' && e.vehiculo !== 'ferry' && e.carril); }

  private trafico(dt: number) {
    const L = this.L;
    const me = this.gente2[0].a;
    this.vias().forEach((v, i) => {
      this.vehT[i] -= dt;
      if (this.vehT[i] > 0) return;
      this.vehT[i] = (v.cada ?? 5) * (0.8 + Math.random() * 0.4);
      const x0 = v.x0 ?? 0, x1 = v.x1 ?? L.largo;
      // solo en su calle: no entran al mercado ni al río
      if (me.x < x0 - 380 || me.x > x1) return;
      const y = L.carriles[Math.max(0, (v.carril ?? 1) - 1)].y;
      const x = Math.min(x1 + 40, me.x + 420);
      const moto = v.vehiculo !== 'xich_lo';
      const g = this.add.container(this.px(x, y), FT + y);
      const sombra = this.add.graphics();
      sombra.fillStyle(0x000000, 0.3).fillEllipse(0, 0, moto ? 44 : 56, 8);
      g.add(sombra);
      const vida = `esc_${L.id}_vida`;
      // la moto (de un color al azar) o el xích lô de PixelForja (lote D2): (x, y) es el centro de su huella
      const colores = Object.keys(vehiculosKit()).filter((id) => id.startsWith('moto_'));
      const id = moto ? colores[Math.floor(Math.random() * colores.length)] : 'xich_lo';
      const vk = id ? vehiculosKit()[id] : undefined;
      const spr = vk ? spriteVehiculo(this, id, 'andando') : null;
      if (spr && vk) {
        // al doble: los conductores del kit miden 12 px y así se ven del tamaño con que atropellan (40 de largo)
        const E = 2;
        spr.setScale(E).setPosition(-Math.round(E * (vk.huella.w / 2 + this.inclinacion * vk.huella.d / 2)), -Math.round(E * vk.huella.d / 2));
        g.add(spr);
      } else if (moto && this.arte && this.textures.exists(vida) && this.textures.get(vida).has('motos_fondo_0')) {
        // la moto de PixelForja, la misma que cruza al fondo
        const img = this.add.image(0, 2, vida, 'motos_fondo_0').setOrigin(0.5, 1);
        this.tweens.addCounter({ from: 0, to: 1, duration: 125, repeat: -1, onRepeat: () => img.setFrame(img.frame.name === 'motos_fondo_0' ? 'motos_fondo_1' : 'motos_fondo_0') });
        g.add(img);
      } else if (moto) {
        const body = this.add.graphics();
        body.fillStyle(0xc03030).fillRect(-18, -20, 36, 12);
        body.fillStyle(0x303038).fillCircle(-12, -6, 6).fillCircle(12, -6, 6);
        body.fillStyle(0xe8e8f0).fillRect(-6, -34, 10, 14);
        g.add([body, txt(this, 0, -14, 'MOTO', 'fuente_ui', 1)]);
      } else {
        // xích lô: el pasajero adelante en su asiento y el que pedalea atrás
        const body = this.add.graphics();
        body.fillStyle(0x3a6ab0).fillRect(-26, -26, 24, 16);
        body.fillStyle(0x303038).fillCircle(-22, -6, 6).fillCircle(-6, -6, 6).fillCircle(20, -6, 6);
        body.fillStyle(0xe8e8f0).fillRect(10, -40, 10, 18);
        body.lineStyle(2, 0x303038).lineBetween(-4, -12, 20, -12);
        g.add([body, txt(this, 0, -48, 'XÍCH LÔ', 'fuente_ui', 1)]);
      }
      this.vehiculos.push({ x, y, v: moto ? -230 : -110, g, spr: spr ?? undefined, id: spr ? id : undefined, anim: 'andando' });
      chip.blip(moto ? 523 : 880, 0.12, 'sq50', 0.12, moto ? 494 : 988);
      this.time.delayedCall(140, () => chip.blip(moto ? 523 : 880, 0.12, 'sq50', 0.12, moto ? 494 : 988));
      const aviso = this.uiAdd(txt(this, 600, 180 + (y - 60) * 0.8, moto ? '¡MOTO! «' : '¡XÍCH LÔ! «', 'fuente_ui', 2, 1).setDepth(8100).setTint(0xff6060));
      this.tweens.add({ targets: aviso, alpha: 0.2, duration: 160, yoyo: true, repeat: 3, onComplete: () => aviso.destroy() });
    });
    for (const m of this.vehiculos) {
      m.x += m.v * dt;
      m.g.setPosition(Math.round(this.px(m.x, m.y)), FT + m.y).setDepth(FT + m.y);
      // la moto pita cuando tiene a alguien adelante en su carril, y anda otra vez cuando pasó
      if (m.spr && m.id?.startsWith('moto_') && m.anim !== 'frenando') {
        const alguien = this.gente2.some((r) => Math.abs(r.a.y - m.y) < 14 && r.a.x < m.x && m.x - r.a.x < 110);
        const quiere = alguien ? 'corneta' : 'andando';
        if (quiere !== m.anim) { m.anim = quiere; m.spr.play(`veh_${m.id}_${quiere}`); }
      }
      for (const r of this.gente2) {
        const a = r.a;
        if (Math.abs(a.x - m.x) < 20 && Math.abs(a.y - m.y) < 10 && a.z < 14 && a.canBeHit()) {
          a.hp = Math.max(1, a.hp - 8);
          a.knockdown(-1, 160, 200);
          // la moto frena de golpe (con su polvo) y sigue al rato
          if (m.spr && m.id?.startsWith('moto_') && m.anim !== 'frenando') {
            m.anim = 'frenando';
            m.spr.play(`veh_${m.id}_frenando`);
            const v0 = m.v;
            m.v = v0 * 0.25;
            this.time.delayedCall(450, () => { if (!m.spr?.active) return; m.v = v0; m.anim = 'andando'; m.spr.play(`veh_${m.id}_andando`); });
          }
          this.onHit(null, a, 8, true);
          this.sfx('critico', a.human ? 0.5 : 0.2);
          if (a.human) this.letrero(a, m.v < -150 ? '¡PI PI! ¡TE ATROPELLÓ LA MOTO!' : '¡CUIDADO CON EL XÍCH LÔ!', 0xff8080);
        }
      }
    }
    this.vehiculos = this.vehiculos.filter((m) => { if (m.x < me.x - 500 || m.x < -60) { m.g.destroy(); return false; } return true; });
  }

  private letrero(a: Actor, s: string, color: number) {
    const t = txt(this, this.px(a.x, a.y), FT + a.y - a.z - 62, s, 'fuente_ui', 1).setDepth(6000).setTint(color);
    this.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  // ------------------------------------------------------------------ dibujo

  /** La lluvia que cae: el efecto `lluvia` del kit en mosaico sobre la pantalla (o rayitas si no está). */
  private ponerLluvia() {
    if (this.textures.exists('fx_lluvia')) {
      this.lluvia = this.add.tileSprite(0, 0, MAX_W, 360, 'fx_lluvia', 0).setOrigin(0).setScrollFactor(0).setDepth(7000).setAlpha(0.45);
      return;
    }
    this.add.particles(0, 0, 'px', { x: { min: 0, max: MAX_W + 60 }, y: -10, speedY: { min: 380, max: 460 }, speedX: -60, lifespan: 1000, quantity: 3, scaleY: 3, alpha: 0.4, tint: 0xc8e0ff }).setScrollFactor(0).setDepth(7000);
  }

  /** La x de pantalla de un punto del mundo: con la vista inclinada, lo del fondo queda a la izquierda. */
  private px(x: number, y: number) { return x + this.inclinacion * y; }

  /** Un rectángulo del mundo (x0 a x1 a lo largo, y0 a y1 de fondo) a la altura z, visto inclinado: un paralelogramo. */
  private plano(g: Phaser.GameObjects.Graphics, x0: number, x1: number, y0: number, y1: number, z = 0) {
    const p = (x: number, y: number) => ({ x: Math.round(this.px(x, y)), y: FT + y - z });
    g.fillPoints([p(x0, y0), p(x1, y0), p(x1, y1), p(x0, y1)], true);
  }

  /** Una línea de un pixel que va hacia el fondo (de y0 a y1, a la altura z), en escalera como la dibujaría un pixelero. */
  private junta(g: Phaser.GameObjects.Graphics, x: number, y0: number, y1: number, z = 0) {
    for (let ya = y0; ya < y1;) {
      const cx = Math.round(this.px(x, ya));
      let yb = ya + 1;
      while (yb < y1 && Math.round(this.px(x, yb)) === cx) yb++;
      g.fillRect(cx, FT + ya - z, 1, yb - ya);
      ya = yb;
    }
  }

  /** La altura de lo que hay pegado a la izquierda de una caja, por tramos de fondo: hasta ahí su cara de ese lado queda tapada. */
  private alLado(c: Caja): { y0: number; y1: number; z: number }[] {
    const x = c.x - 0.5;
    const vecinos = this.cajas.filter((o) => o !== c && o !== this.ferry && x >= o.x && x < o.x + o.w && o.y < c.y + c.d && o.y + o.d > c.y);
    const cortes = [...new Set([c.y, c.y + c.d, ...vecinos.flatMap((o) => [o.y, o.y + o.d])])].filter((y) => y >= c.y && y <= c.y + c.d).sort((p, q) => p - q);
    const tramos: { y0: number; y1: number; z: number }[] = [];
    for (let i = 0; i < cortes.length - 1; i++) {
      const m = (cortes[i] + cortes[i + 1]) / 2;
      const z = Math.min(c.z, Math.max(0, ...vecinos.filter((o) => m >= o.y && m < o.y + o.d).map((o) => o.z)));
      tramos.push({ y0: cortes[i], y1: cortes[i + 1], z });
    }
    return tramos;
  }

  /** El escenario en gris: cielo según la hora, piso por tipo, huecos, agua, cajas con su nombre, postes, toldos, salida y meta. */
  private dibujar() {
    const L = this.L;
    const W = L.largo;
    const K = this.inclinacion;
    const cielo: Record<string, [number, number]> = { manana: [0x8ab0d0, 0xd8e4ec], mediodia: [0x6aa8e0, 0xcfe6f6], tarde: [0x5a6070, 0x9aa0aa], atardecer: [0xd07a4a, 0xf2c890] };
    const [c0, c1] = cielo[L.hora] ?? cielo.manana;
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-20);
    sky.fillGradientStyle(c0, c0, c1, c1).fillRect(0, 0, MAX_W, 360);
    // fachadas en bloques grises al fondo de la franja (en las azoteas, la ciudad queda abajo y lejos)
    const fondo = this.add.graphics().setDepth(-10);
    const bajos = L.id === 'saigon_azoteas';
    for (let x = 0, k = 0; x < W + 80; k++) {
      const w = 60 + ((k * 37) % 50), h = (bajos ? 30 : 70) + ((k * 53) % 60);
      fondo.fillStyle(k % 2 ? 0x9a9aa4 : 0xa8a8b2).fillRect(x, FT - h, w, h);
      for (let wy = FT - h + 8; wy < FT - 10; wy += 16) for (let wx = x + 6; wx < x + w - 8; wx += 14) fondo.fillStyle(0x7a7a86).fillRect(wx, wy, 7, 8);
      x += w;
    }
    const g = this.add.graphics().setDepth(-5);
    const PISO: Record<string, number> = { asfalto: 0x5a5a64, acera: 0x8a8a94, baldosa: 0x8e8278, tierra: 0x8a6a4a, madera: 0x7a5a3a, metal: 0x7a8490, cancha: 0xa8483a, agua: 0x2a6aa0, pasto: 0x4a8a3a };
    const color = (t: string) => PISO[t] ?? 0x5a5a64;
    // el piso: cada tipo es un paralelogramo; los bordes del mundo se estiran para que no quede un triángulo vacío
    const ext = (x0: number, x1: number) => [x0 <= 0 ? -K * DEPTH - 20 : x0, x1 >= W ? W + 20 : x1];
    for (const p of L.piso) { const [x0, x1] = ext(p.x0, p.x1); g.fillStyle(color(p.tipo)); this.plano(g, x0, x1, p.y0 ?? 0, p.y1 ?? DEPTH); }
    // el borde de adelante: la cara del piso que da a la cámara, como el bordillo de la azotea de la pelea
    const borde = this.add.graphics().setDepth(FT + DEPTH + 1);
    const frenteDe = (x: number) => { let t = 'asfalto'; for (const p of L.piso) if (x >= p.x0 && x < p.x1 && (p.y1 ?? DEPTH) >= DEPTH) t = p.tipo; return t; };
    for (let x = -60; x < W + 20; x += 8) {
      const col = Phaser.Display.Color.ValueToColor(color(frenteDe(Math.max(0, x)))).darken(28).color;
      borde.fillStyle(col).fillRect(Math.round(x + K * DEPTH), FT + DEPTH, 8, 360 - FT - DEPTH);
    }
    borde.fillStyle(0xffffff, 0.18).fillRect(-60, FT + DEPTH, W + 200, 1);
    for (let x = 0; x < W + 60; x += 32) borde.fillStyle(0x000000, 0.25).fillRect(Math.round(x + K * DEPTH), FT + DEPTH + 1, 1, 360 - FT - DEPTH);
    // las juntas del piso: hacia el fondo, en la misma diagonal que todo lo demás, y a lo ancho cada vez más separadas
    const juntas = this.add.graphics().setDepth(-4.9);
    juntas.fillStyle(0x000000, 0.16);
    for (let x = -64; x < W + 40; x += 32) this.junta(juntas, x, 0, DEPTH);
    for (let y = 18, paso = 16; y < DEPTH; paso += 4, y += paso) juntas.fillStyle(0xffffff, 0.07).fillRect(Math.round(this.px(-60, y)), FT + y, W + 120, 1);
    if (L.id === 'saigon_hem') for (let x = 0; x < W; x += 80) { g.fillStyle(0x66666f); this.plano(g, x, x + 40, 63, 65); }
    if (L.id === 'saigon_estadio') for (const y of [35, 65, 95]) { g.fillStyle(0xf4f4f4, 0.7); this.plano(g, 300, W, y, y + 1); }
    for (const p of L.piso) if (p.nombre && p.tipo !== 'agua') this.rotulo(this.px(Math.max(4, p.x0 + 4), (p.y0 ?? 0) + 6), FT + (p.y0 ?? 0) + 6, p.nombre.toUpperCase());
    // agua: charcos, calle inundada y río
    for (const w of L.agua) {
      const y0 = w.y0 ?? 0, y1 = w.y1 ?? DEPTH;
      const hondo = w.nivel >= HONDO;
      g.fillStyle(hondo ? 0x285a90 : 0x3a7ab0, w.nivel <= CHARCO ? 0.55 : 0.8);
      this.plano(g, w.x0, w.x1, y0, y1);
      for (let x = w.x0 + 6; x < w.x1 - 8; x += 22) for (let y = y0 + 8; y < y1; y += 18) g.fillStyle(0x9ad8f0, 0.7).fillRect(Math.round(this.px(x + (y % 11), y)), FT + y, 8, 1);
      const dice = w.nivel <= CHARCO ? 'CHARCO · RESBALA' : hondo ? `${(w.nombre ?? 'río').split(':')[0].toUpperCase()} · SE NADA` : 'CALLE INUNDADA · TE FRENA Y TE EMPUJA';
      this.rotulo(this.px(w.x0 + 4, y0), w.nivel <= CHARCO ? FT + y0 - 4 : hondo ? FT + y0 + 8 : FT + DEPTH + 12, dice);
    }
    // huecos: se ve la pared del fondo, la del lado de allá (inclinada) y abajo el agua del canal o el vacío
    // los huecos de la misma columna separados por una viga o una baranda se dibujan como uno solo: abajo no hay piso
    const huecos = [...L.huecos].sort((p, q) => p.x0 - q.x0 || p.y0 - q.y0).reduce<typeof L.huecos>((acc, h) => {
      const u = acc[acc.length - 1];
      if (u && u.x0 === h.x0 && u.x1 === h.x1 && u.caida === h.caida && h.y0 - u.y1 <= 20) acc[acc.length - 1] = { ...u, y1: h.y1 };
      else acc.push({ ...h });
      return acc;
    }, []);
    for (const h of huecos) {
      const hondo = h.caida === 'vacio' ? 60 : 18;
      g.fillStyle(h.caida === 'vacio' ? 0x101018 : 0x1a2a40);
      this.plano(g, h.x0, h.x1, h.y0, h.y1);
      if (h.caida === 'agua') {
        g.fillStyle(0x2a5a90).fillPoints([
          { x: Math.round(this.px(h.x0, h.y0)), y: FT + h.y0 + hondo }, { x: Math.round(this.px(h.x1, h.y0)), y: FT + h.y0 + hondo },
          { x: Math.round(this.px(h.x1, h.y1 - hondo)), y: FT + h.y1 }, { x: Math.round(this.px(h.x0, h.y1 - hondo)), y: FT + h.y1 },
        ], true);
        g.fillStyle(0x9ad8f0).fillRect(Math.round(this.px(h.x0, h.y0)), FT + h.y0 + hondo, h.x1 - h.x0, 1);
      }
      // la pared del fondo del hueco (de frente) y la del otro lado (la cara de la izquierda del piso que sigue)
      const prof = Math.min(hondo, h.y1 - h.y0);
      g.fillStyle(h.caida === 'vacio' ? 0x3a3a46 : 0x4a4a54).fillRect(Math.round(this.px(h.x0, h.y0)), FT + h.y0, h.x1 - h.x0, prof);
      g.fillStyle(h.caida === 'vacio' ? 0x2a2a34 : 0x3a3a44).fillPoints([
        { x: Math.round(this.px(h.x1, h.y0)), y: FT + h.y0 }, { x: Math.round(this.px(h.x1, h.y1)), y: FT + h.y1 },
        { x: Math.round(this.px(h.x1, h.y1 - prof)), y: FT + h.y1 }, { x: Math.round(this.px(h.x1, h.y0)), y: FT + h.y0 + prof },
      ], true);
      // si llega adelante, el corte se ve en el borde
      if (h.y1 >= DEPTH) {
        borde.fillStyle(h.caida === 'vacio' ? 0x08080e : 0x141e30).fillRect(Math.round(this.px(h.x0, DEPTH)), FT + DEPTH, h.x1 - h.x0, 360 - FT - DEPTH);
        if (h.caida === 'agua') borde.fillStyle(0x2a5a90).fillRect(Math.round(this.px(h.x0, DEPTH)), FT + DEPTH + hondo, h.x1 - h.x0, 360 - FT - DEPTH - hondo);
      }
      if (h.y0 === 0 || h.y1 === DEPTH) this.rotulo(this.px(h.x0, DEPTH), FT + DEPTH + 12, h.caida === 'vacio' ? '¡SALTA CORRIENDO!' : h.y1 < DEPTH ? 'CANAL · PUENTECITO ADELANTE' : 'CANAL · ¡SALTA CORRIENDO!');
    }
    // marcas cada 320 px, en diagonal como las juntas
    for (let x = 320; x < W; x += 320) { g.fillStyle(0xffffff, 0.35); this.junta(g, x, 0, DEPTH); this.rotulo(this.px(x + 3, 6), FT + 6, `${x}`); }
    // salida y meta: la cuadrícula sigue la diagonal
    const sal = L.entidades.find((e) => e.tipo === 'salida')?.x ?? 40;
    for (const [x, s] of [[sal, 'SALIDA'], [this.meta, 'META']] as [number, string][]) {
      for (let y = 0; y < DEPTH; y += 6) for (let k = 0; k < 2; k++) { g.fillStyle((y / 6 + k) % 2 ? 0x101010 : 0xf4f4f4); this.plano(g, x + k * 4, x + k * 4 + 4, y, y + 6); }
      this.add.bitmapText(x + 4, FT - 30, 'fuente_titulo', s).setOrigin(0.5).setDepth(-4);
    }
    // postes, parados en lo que tengan debajo
    for (const p of L.postes) {
      const z = Math.max(0, this.suelo(p.x, p.y, 999)), x = Math.round(this.px(p.x, p.y)), y = FT + p.y - z;
      const t = this.add.graphics().setDepth(FT + p.y);
      t.fillStyle(0x4a4a54).fillRect(x, y - p.alto, 4, p.alto).fillStyle(0x34343e).fillRect(x + 3, y - p.alto, 1, p.alto);
      if (p.tipo !== 'asta_bandera') t.fillStyle(0xf2e090).fillRect(x - 6, y - p.alto, 12, 4);
      t.fillStyle(0x000000, 0.25).fillEllipse(x + 2, y, 10, 3);
    }
    // lo que cuelga bajo: toldos, techos, ropa
    for (const b of L.bajo) {
      const t = this.add.graphics().setDepth(FT + b.y1);
      if (b.tipo === 'techo_escalera') {
        // el techo naranja ondulado de las escaleras eléctricas de la Comuna 13, sobre cuatro columnas grises
        for (const [cx, cy] of [[b.x0, b.y0], [b.x1 - 3, b.y0], [b.x0, b.y1 - 1], [b.x1 - 3, b.y1 - 1]]) {
          const z0 = Math.max(0, this.suelo(cx + 1, cy, 999));
          const col = this.add.graphics().setDepth(FT + cy + (cy > b.y0 ? 0.6 : -0.6));
          col.fillStyle(cy > b.y0 ? 0x6a6a74 : 0x54545e).fillRect(Math.round(this.px(cx, cy)), FT + cy - b.z, 3, b.z - z0);
        }
        t.fillStyle(0xe8742a); this.plano(t, b.x0 - 4, b.x1 + 4, b.y0, b.y1, b.z);
        t.fillStyle(0xb8501a);
        for (let x = b.x0; x < b.x1 + 4; x += 6) this.junta(t, x, b.y0, b.y1, b.z);
        t.fillStyle(0xa04a18).fillRect(Math.round(this.px(b.x0 - 4, b.y1)), FT + b.y1 - b.z, b.x1 - b.x0 + 8, 4);
        continue;
      }
      if (b.tipo === 'tendedero') {
        // la cuerda con ropa de colores, de un lado a otro del callejón
        const ym = Math.round((b.y0 + b.y1) / 2), y = FT + ym - b.z;
        t.setDepth(FT + ym);
        t.lineStyle(1, 0x30303a).lineBetween(this.px(b.x0, ym), y, this.px(b.x1, ym), y);
        const ropa = [0xe84a4a, 0x4a8ae8, 0xf2c230, 0x5ac85a, 0xf4f4f4, 0xd06ad0];
        for (let x = b.x0 + 6, k = 0; x < b.x1 - 8; x += 16, k++) t.fillStyle(ropa[k % ropa.length]).fillRect(Math.round(this.px(x, ym)), y, 10, 12 + (k % 3) * 3);
        this.rotulo(this.px(b.x0, ym), y - 8, 'TENDEDERO · NO SALTES ABAJO');
        continue;
      }
      t.fillStyle(0xc85a3a, 0.85); this.plano(t, b.x0, b.x1, b.y0, b.y1, b.z);
      t.fillStyle(0xf4e8d0, 0.85);
      for (let x = b.x0; x < b.x1; x += 12) this.plano(t, x, Math.min(b.x1, x + 6), b.y0, b.y1, b.z);
      t.fillStyle(0x8a3a22).fillRect(Math.round(this.px(b.x0, b.y1)), FT + b.y1 - b.z, b.x1 - b.x0, 3);
      this.rotulo(this.px(b.x0, b.y0), FT + b.y0 - b.z - 8, `${(b.tipo ?? 'TOLDO').toUpperCase().replace(/_/g, ' ')} · NO SALTES ABAJO`);
    }
    // la bandera en su asta
    for (const p of L.postes) if (p.tipo === 'asta_bandera' && this.textures.exists('flag_co')) this.add.image(this.px(p.x, p.y) + 4, FT + p.y - Math.max(0, this.suelo(p.x, p.y, 999)) - p.alto + 10, 'flag_co').setOrigin(0, 0.5).setScale(0.9).setDepth(FT + p.y);
    this.adornos();
    for (const c of this.cajas) this.caja(c);
    this.escaleras();
  }

  /**
   * Una caja en vista inclinada, como un volumen de verdad: el techo es un paralelogramo, el frente un rectángulo y la cara
   * de la izquierda (la que queda a la vista) sube desde lo que tenga pegado a ese lado. En un tramo de escalones esa cara
   * es la contrahuella, así que la escalera se lee escalón por escalón.
   */
  private caja(c: Caja) {
    const L = this.L;
    const K = this.inclinacion;
    // techo y frente por tipo, para leer el gris: ladrillo, zinc, la escalera eléctrica, la fruta
    const COLOR: Record<string, [number, number]> = {
      puesto_frutas: [0xe0b060, 0x9a6a30], terraza: [0xc89a7a, 0x9a5a3a], muro_ladrillo: [0xb8704a, 0x8a4a2a],
      techo_lata: [0xa8b4c4, 0x6a7888], escalera_electrica: [0xd0d4dc, 0xd06a2a], escalones: [0xd8c8a8, 0xa89878], escalon: [0xd8c8a8, 0xa89878],
      viga: [0x7a7a8a, 0x4a4a58], muelle: [0xa87a4a, 0x6a4a2a], baranda: [0x7a8aa0, 0x4a5a70],
      muro_grafiti: [0xd8b8a0, 0xb04ad0], escalera_pintada: [0xf2c230, 0x40a0d0], mirador: [0xd8c8b0, 0xa88868],
      letras_comuna13: [0x30303a, 0x20202a], carrito_paletas: [0xf2e060, 0x40a040], tanque_agua: [0x3a3a44, 0x24242c],
    };
    const muro = L.muros.includes(c);
    const [techo, frente] = COLOR[c.tipo ?? ''] ?? (muro ? [0xb0a090, 0x807060] : [0xc8c8d0, 0x8a8a96]);
    const lado = Phaser.Display.Color.ValueToColor(frente).darken(18).color;
    const x0 = c.x, x1 = c.x + c.w, y0 = c.y, y1 = c.y + c.d;
    const fx = Math.round(this.px(x0, y1));
    // una viga o una baranda es delgada: se ve el canto, no un muro hasta el piso
    const alto = c.tipo === 'viga' || c.tipo === 'baranda' ? Math.min(c.z, 8) : c.z;
    const box = this.add.graphics().setDepth(FT + y1 - 0.5);
    box.fillStyle(techo); this.plano(box, x0, x1, y0, y1, c.z);
    box.fillStyle(frente).fillRect(fx, FT + y1 - c.z, c.w, alto);
    // las juntas del techo van hacia el fondo, igual que las del piso
    box.fillStyle(0x000000, 0.12);
    const cada = c.w > 120 ? 32 : 16;
    for (let x = x0 + cada; x < x1 - 2; x += cada) this.junta(box, x, y0, y1, c.z);
    // ladrillo o zinc en el frente
    if (c.tipo === 'terraza' || c.tipo === 'muro_ladrillo' || c.tipo === 'mirador') for (let y = FT + y1 - c.z + 6; y < FT + y1 - c.z + alto; y += 8) box.fillStyle(0x000000, 0.14).fillRect(fx, y, c.w, 1);
    if (c.tipo === 'techo_lata') for (let x = fx + 3; x < fx + c.w; x += 5) box.fillStyle(0x000000, 0.12).fillRect(x, FT + y1 - c.z, 1, alto);
    // la escalera eléctrica va al revés: flechitas hacia atrás en cada escalón
    if (c.tipo === 'escalera_electrica') for (let y = y0 + 8; y < y1 - 4; y += 14) {
      const ax = Math.round(this.px(x0 + 3, y)), ay = FT + y - c.z;
      box.fillStyle(0x30303a).fillTriangle(ax, ay, ax + c.w - 7, ay - 4, ax + c.w - 7, ay + 4);
    }
    // el canto del frente con luz y el contorno, para que cada volumen se separe del de al lado
    box.fillStyle(0xffffff, 0.3).fillRect(fx, FT + y1 - c.z, c.w, 1);
    box.lineStyle(1, 0x24242c, 0.85).strokeRect(fx + 0.5, FT + y1 - c.z + 0.5, c.w - 1, alto - 1);
    const t0 = { x: Math.round(this.px(x0, y0)), y: FT + y0 - c.z }, t1 = { x: Math.round(this.px(x1, y0)), y: FT + y0 - c.z }, t2 = { x: fx + c.w, y: FT + y1 - c.z };
    box.lineBetween(t0.x + 0.5, t0.y + 0.5, t1.x - 0.5, t1.y + 0.5).lineBetween(t1.x - 0.5, t1.y + 0.5, t2.x - 0.5, t2.y + 0.5);
    // la cara de la izquierda, en su propia capa: delante de lo que va detrás de la caja y detrás de quien va a su lado
    if (K > 0) {
      const cara = this.add.graphics().setDepth(FT + y0 + 0.1);
      for (const s of this.alLado(c)) {
        const zb = Math.max(s.z, c.z - alto);
        if (zb >= c.z) continue;
        cara.fillStyle(lado).fillPoints([
          { x: Math.round(this.px(x0, s.y0)), y: FT + s.y0 - c.z }, { x: Math.round(this.px(x0, s.y1)), y: FT + s.y1 - c.z },
          { x: Math.round(this.px(x0, s.y1)), y: FT + s.y1 - zb }, { x: Math.round(this.px(x0, s.y0)), y: FT + s.y0 - zb },
        ], true);
        // la nariz del escalón (el borde de arriba de esa cara) con luz, y su pie con sombra
        cara.fillStyle(0xffffff, 0.35); this.junta(cara, x0, s.y0, s.y1, c.z);
        cara.fillStyle(0x000000, 0.3); this.junta(cara, x0, s.y0, s.y1, zb - 1);
      }
      // la sombra en el piso, hacia la derecha (la luz viene de la izquierda)
      if (Math.max(0, this.suelo(x1 + 2, (y0 + y1) / 2, c.z - PASO - 1)) === 0 && alto === c.z) {
        const sombra = this.add.graphics().setDepth(-4.5);
        sombra.fillStyle(0x000000, 0.2); this.plano(sombra, x1, x1 + Math.min(14, 4 + c.z / 6), y0, y1);
      }
    }
    // las letras grandes del mirador, una de cada color
    if (c.tipo === 'letras_comuna13') {
      const col = [0xff4fa0, 0xf2c230, 0x40d0ff, 0x5ac85a, 0xff8a30, 0xb04ad0];
      // sobre el frente del letrero: arriba de la caja quedarían debajo del marcador
      'COMUNA 13'.split('').forEach((ch, i) => this.add.bitmapText(fx + 12 + i * 18, FT + y1 - c.z + Math.min(alto, 40) / 2, 'fuente_titulo', ch).setOrigin(0, 0.5).setScale(2).setTint(col[i % col.length]).setDepth(FT + y1 - 0.3));
      return;
    }
    // el nombre encima, una vez por grupo (los escalones seguidos llevan uno solo)
    const seguido = this.cajas.some((o) => o !== c && o.tipo === c.tipo && Math.abs(o.x + o.w - c.x) < 1 && o.y === c.y);
    if (!seguido) this.add.bitmapText(Math.round(this.px(x0 + c.w / 2, y0 + c.d / 2)), FT + y0 + c.d / 2 - c.z, 'fuente_ui', (c.tipo ?? '').toUpperCase().replace(/_/g, ' ')).setOrigin(0.5).setDepth(FT + y1 - 0.4).setTint(0xf0f0f8).setAlpha(0.8);
  }

  /**
   * Las escaleras eléctricas llevan su pasamanos de vidrio con la baranda negra a los dos lados: la del fondo detrás
   * de los escalones y la de adelante delante, las dos subiendo con la pendiente.
   */
  private escaleras() {
    const usados = new Set<Caja>();
    for (const c of this.cajas) {
      if (c.tipo !== 'escalera_electrica' || usados.has(c)) continue;
      // el tramo: los escalones de la misma fila, uno pegado al otro
      const tramo = [c];
      usados.add(c);
      for (let sig = c; ;) {
        const n = this.cajas.find((o) => o.tipo === sig.tipo && o.y === sig.y && o.d === sig.d && Math.abs(o.x - (sig.x + sig.w)) < 1);
        if (!n) break;
        tramo.push(n); usados.add(n); sig = n;
      }
      if (tramo.length < 2) continue;
      const a = tramo[0], b = tramo[tramo.length - 1];
      for (const yy of [a.y + 1, a.y + a.d - 1]) {
        const p0 = { x: this.px(a.x, yy), y: FT + yy - a.z + 4 }, p1 = { x: this.px(b.x + b.w, yy), y: FT + yy - b.z };
        const g2 = this.add.graphics().setDepth(yy > a.y + 1 ? FT + a.y + a.d + 0.2 : FT + a.y - 0.2);
        g2.fillStyle(0xc8e0f0, 0.35).fillPoints([p0, p1, { x: p1.x, y: p1.y - 18 }, { x: p0.x, y: p0.y - 18 }], true);
        g2.lineStyle(3, 0x1e1e26).lineBetween(p0.x, p0.y - 18, p1.x, p1.y - 18);
        g2.lineStyle(1, 0x6a6a78).lineBetween(p0.x, p0.y, p1.x, p1.y);
        // los parales del vidrio
        for (let k = 0; k <= tramo.length; k += 2) {
          const t = k / tramo.length, x = p0.x + (p1.x - p0.x) * t, y = p0.y + (p1.y - p0.y) * t;
          g2.fillStyle(0x4a4a58).fillRect(Math.round(x), Math.round(y - 18), 1, 18);
        }
      }
    }
  }

  /** Lo que da identidad al gris: murales de colores en las paredes y el metrocable cruzando el cielo. */
  private adornos() {
    const L = this.L;
    const ranuras = (L as unknown as { ranuras_deco?: { x0: number; x1: number; capa: string; tema: string }[] }).ranuras_deco ?? [];
    const col = [0xff4fa0, 0x40d0ff, 0xffd040, 0x5ac85a, 0xb04ad0, 0xff8a30];
    for (const r of ranuras) {
      if (!/grafiti/.test(r.tema)) continue;
      // murales sobre las casas del fondo: caras, ojos, flores y franjas de color
      const g = this.add.graphics().setDepth(-9);
      for (let x = r.x0 + 10, k = 0; x < r.x1 - 40; x += 70, k++) {
        const y = FT - 90 + (k % 2) * 14, c1 = col[k % col.length], c2 = col[(k + 2) % col.length];
        g.fillStyle(c1).fillRect(x, y, 56, 70);
        g.fillStyle(c2).fillCircle(x + 28, y + 30, 16);
        g.fillStyle(0xffffff).fillCircle(x + 22, y + 26, 4).fillCircle(x + 34, y + 26, 4);
        g.fillStyle(0x101018).fillCircle(x + 22, y + 26, 2).fillCircle(x + 34, y + 26, 2);
        g.fillStyle(col[(k + 4) % col.length]).fillRect(x, y + 58, 56, 6);
      }
    }
    if ((L as unknown as { vida?: string[] }).vida?.includes('metrocable')) {
      // el cable y las cabinas rojas que cruzan el valle
      const cable = this.add.graphics().setScrollFactor(0).setDepth(-19);
      cable.lineStyle(1, 0x30303a, 0.8).lineBetween(-20, 74, MAX_W + 60, 74 - (MAX_W + 80) * 56 / 720);
      for (let i = 0; i < 3; i++) {
        const g = this.add.graphics().setScrollFactor(0).setDepth(-18);
        g.lineStyle(1, 0x30303a).lineBetween(0, -10, 0, 0);
        g.fillStyle(0xd03a2a).fillRect(-7, 0, 14, 10).fillStyle(0xe8f0f8).fillRect(-5, 2, 10, 4);
        this.cabinas.push({ g, u: i / 3 });
      }
    }
  }

  private rotulo(x: number, y: number, s: string) {
    // debajo de la franja va delante del borde del piso; arriba, detrás de las cajas
    this.add.bitmapText(Math.round(x), y, 'fuente_ui', s).setOrigin(0, 0.5).setDepth(y > FT + DEPTH ? FT + DEPTH + 2 : -3).setTint(0xf0f0f8);
  }

  /**
   * Si algo alto que va delante le tapa más de medio cuerpo, encima va su silueta: amarilla la persona, azul su equipo
   * y roja el otro. Así nadie se pierde detrás de los puestos del mercado.
   */
  private silueta(a: Actor) {
    const pies = FT + a.y - a.z, cabeza = pies - ALTO;
    const sx = this.px(a.x, a.y);
    const tapa = this.cajas.find((c) => c.y > a.y && sx > this.px(c.x, c.y) - 6 && sx < this.px(c.x + c.w, c.y + c.d) + 6 && FT + c.y - c.z < (pies + cabeza) / 2 && c.z > a.z + ALTO / 2);
    let s = this.siluetas.get(a);
    if (!tapa || !a.fig.visible) { s?.setVisible(false); return; }
    if (!s) {
      s = this.add.sprite(0, 0, a.fig.texture.key).setAlpha(0.6);
      this.siluetas.set(a, s);
    }
    const f = a.fig;
    s.setVisible(true).setTexture(f.texture.key, f.frame.name).setOrigin(f.originX, f.originY).setFlipX(f.flipX).setScale(f.scaleX, f.scaleY)
      .setPosition(f.x, f.y).setTintFill(a.human ? 0xffe040 : a.team === 0 ? 0x6ab0ff : 0xff6a6a).setDepth(FT + this.ordenCaja(tapa) + 0.6);
  }

  /**
   * El orden de dibujo de una caja, igual que el arte de PixelForja: su borde de adelante, o, si está parada encima de
   * otra (el tanque en la terraza, las letras en el mirador), justo después de la caja que tiene debajo. Quien se para
   * arriba va medio paso después, así la terraza de abajo no lo tapa.
   */
  private ordenCaja(b: Caja): number {
    let base: Caja | undefined;
    for (const o of this.cajas) if (o !== b && o.z < b.z && b.x >= o.x && b.x + b.w <= o.x + o.w && b.y >= o.y && b.y + b.d <= o.y + o.d && (!base || o.z > base.z)) base = o;
    return base ? this.ordenCaja(base) + 0.3 : b.y + b.d;
  }

  private render() {
    for (const a of this.actors) a.render();
    for (const i of this.items) i.render();
    for (const a of this.actors) {
      // encima de una caja o un muro se dibuja delante de esa caja, para que no lo tape al pasar por arriba
      const piso = a.base;
      if (piso > 0) {
        const c = this.cajas.find((b) => a.x >= b.x && a.x < b.x + b.w && a.y >= b.y && a.y < b.y + b.d && Math.abs(b.z - piso) < 1);
        if (c) a.fig.setDepth(FT + this.ordenCaja(c) + 0.5);
      }
      this.silueta(a);
      // en el agua, el agua tapa los pies (o medio cuerpo en el río)
      let g = this.aguaPies.get(a);
      if (!g) { g = this.add.graphics(); this.aguaPies.set(a, g); }
      g.clear().setDepth(a.fig.depth + 0.1);
      const w = this.aguaEn(a.x, a.y);
      if (w && w.nivel > CHARCO && a.z < 3 && a.st !== 'lifted') {
        // en el río, del color del río: se ve medio cuerpo afuera y el resto bajo el agua
        const hondo = w.nivel >= HONDO;
        const n = Math.min(w.nivel, 26);
        const x = Math.round(this.px(a.x, a.y)), y = Math.round(FT + a.y);
        g.fillStyle(hondo ? (this.arte ? 0x2a6aa0 : 0x285a90) : 0x3a8ac0, hondo ? 0.92 : 0.55).fillRect(x - 15, y - n, 30, n + 2);
        g.fillStyle(0xc8ecff, 0.85).fillRect(x - 13 + (Math.floor(this.time.now / 200) % 3), y - n, 9, 1).fillRect(x + 3 - (Math.floor(this.time.now / 260) % 3), y - n, 7, 1);
      }
    }
    const me = this.gente2[0].a;
    const cam = this.cameras.main;
    const meX = this.px(me.x, me.y);
    const cur = cam.midPoint.x || meX;
    cam.centerOn(cur + (meX + 80 - cur) * 0.1, 360 - 180 / ZOOM);
    this.arte?.tick(this.game.loop.delta / 1000, cam.scrollX, (x, y) => this.actors.some((a) => Math.abs(this.px(a.x, a.y) - x) < 70 && FT + a.y - y < 160));
    if (this.lluvia) {
      this.lluvia.setFrame(Math.floor(this.time.now / 62) % 8);
      this.lluvia.tilePositionX = cam.scrollX * 0.6;
    }
    // marcador: barra de avance con cabecitas, tiempo sumado y vida
    const g = this.hud;
    g.clear();
    g.fillStyle(0x000000, 0.55).fillRect(110, 14, 420, 16);
    g.lineStyle(1, 0xffffff, 0.6).lineBetween(120, 22, 520, 22);
    g.fillStyle(0xffffff).fillRect(519, 16, 2, 12);
    for (const h of this.heads) h.img.setPosition(120 + 400 * Phaser.Math.Clamp(h.r.a.x / this.meta, 0, 1), 22);
    // el tiempo sumado: al cerrar el tramo, el de este tramo ya está dentro del acumulado
    this.timeTxt.setText(((this.acum[this.gente2[0].c.id] ?? 0) + (this.fase === 'fin' ? 0 : this.clock)).toFixed(2));
    g.fillStyle(0x000000, 0.6).fillRect(14, 12, 84, 10);
    g.fillStyle(me.hp > me.maxHp * 0.3 ? 0x40e080 : 0xff5040).fillRect(16, 14, 80 * (me.hp / me.maxHp), 6);
  }

  private checkEnd() {
    const me = this.gente2[0];
    if (this.d.practica || this.entre) return;
    // nadie se queda esperando para siempre: 25 s después del primero, el tramo se cierra igual
    const primero = Math.min(...this.gente2.filter((r) => r.done).map((r) => r.time));
    const cierre = Number.isFinite(primero) && this.clock - primero > 25;
    if (!cierre && !this.porTiempo(this.gente2.map((r) => r.done), me.done, this.clock)) return;
    for (const r of this.gente2) if (!r.done) { r.done = true; r.time = this.clock + (this.meta - r.a.x) / 120; }
    for (const r of this.gente2) this.acum[r.c.id] = (this.acum[r.c.id] ?? 0) + r.time;
    const orden = [...this.gente2].sort((p, q) => this.acum[p.c.id] - this.acum[q.c.id]);
    if (this.suelto || this.tramo === this.tramos.length - 1) {
      this.resultados(this.suelto ? `TRAMO ${this.tramo + 1} · ${this.L.nombre}` : prueba(this.scene.key).nombre, orden.map((r) => ({ c: r.c, valor: `${this.acum[r.c.id].toFixed(2)} S` })));
      return;
    }
    this.entreTramos(orden);
  }

  /** Entre tramos: cómo van con el tiempo sumado, y al siguiente con los mismos cuatro. */
  private entreTramos(orden: Corredor[]) {
    this.fase = 'fin';
    flash(this, 120);
    chip.blip(1320, 0.2, 'sq25', 0.2, 1760);
    const g = this.uiAdd(this.add.graphics().setDepth(8400));
    g.fillStyle(0x08081a, 0.9).fillRect(140, 60, 360, 220);
    g.lineStyle(2, 0xf2c230).strokeRect(141, 61, 358, 218);
    this.uiAdd(txt(this, 320, 80, `TRAMO ${this.tramo + 1} DE ${this.tramos.length} · ${this.L.nombre}`, 'fuente_ui', 1).setDepth(8500).setTint(0xffe080));
    this.uiAdd(txt(this, 320, 98, 'ASÍ VA LA CARRERA', 'fuente_titulo', 1).setDepth(8500));
    orden.forEach((r, i) => {
      const y = 128 + i * 32;
      this.uiAdd(txt(this, 168, y, `${i + 1}°`, 'fuente_ui', 2).setDepth(8500));
      this.uiAdd(this.add.image(204, y, `retratos:${r.c.id}`, i === 0 ? 'chico_feliz' : 'chico_neutral').setScale(0.7).setDepth(8500));
      this.uiAdd(txt(this, 228, y, this.nombre(r.c.id), 'fuente_ui', 2, 0).setDepth(8500).setTint(r.c.human ? 0xffe040 : r.c.team === 0 ? 0x9ac8ff : 0xffa0a0));
      this.uiAdd(txt(this, 480, y - 4, `${this.acum[r.c.id].toFixed(2)} S`, 'fuente_ui', 2, 1).setDepth(8500));
      this.uiAdd(txt(this, 480, y + 9, `ESTE TRAMO ${r.time.toFixed(2)}`, 'fuente_ui', 1, 1).setDepth(8500).setTint(0x9a9ac0));
    });
    this.uiAdd(txt(this, 320, 266, `SIGUE: ${this.tramos[this.tramo + 1].nombre}`, 'fuente_ui', 1).setDepth(8500).setTint(0x8ae08a));
    const data: CrossData = { ...this.d, tramo: this.tramo + 1, cross: { gente: this.gente, acum: this.acum } };
    this.entre = { t: 4.2, go: () => { this.cameras.main.fadeOut(250); this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart(data)); } };
  }
}
