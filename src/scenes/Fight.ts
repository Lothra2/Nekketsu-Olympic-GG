import Phaser from 'phaser';
import { Actor, HUECO, Item, NOTHING, type Intent, type World } from '../fight/actor';
import { Brain } from '../fight/brain';
import { DEPTH, FLOOR_TOP, XMAX, XMIN, type AttackDef } from '../fight/defs';
import { Figura } from '../core/figura';
import { ajustes } from '../core/nivel';
import { efecto, talla } from '../core/fx';
import { Input, rotular } from '../core/input';
import { chip, PELEA } from '../core/music';
import { txt, flash, speedLines, pantallaCarga } from '../core/ui';
import { letreroGrande, MarcadorTV, hayUi, pieza } from '../core/interfaz';

/** El reloj del marcador: el de TV del kit o el texto de siempre. */
interface Reloj { setText(s: string): Reloj; setTint(c: number): Reloj }
import { nombreTecnica } from './Select';
import { nuestros, ellos, lado, equipos, conJugador, victoria } from '../core/equipos';
import { cargarAtletas, packsDe } from '../core/carga';
import { PUNTOS, type Gira } from '../events/base';
import { Coach, type Paso } from '../core/coach';
import { kit, bucle } from '../core/kit';
import azotea from '../../data/stages/caracas_azotea.layout.json';
import { hayArte, pintarEscenario, queueEscenario } from '../events/escenario';

/** acercamiento de la cámara en la pelea: más cerca en 1 contra 1 */
const ZOOMS: Record<string, number> = { '1v1': 1.75, '4v4': 1.45 };
const ZOOMS_ARTE: Record<string, number> = { '1v1': 1.35, '4v4': 1.25 };

const ARMAS_PISO = ['chancleta', 'tubo', 'pote_basura', 'silla_plastica', 'coco', 'paraguas', 'escoba', 'chancleta_rosada', 'cono', 'llanta'];

/** Qué técnica usa cada atleta con la barra Nekketsu llena. */
const TECNICA: Record<string, 'mach' | 'huracan' | 'chilena' | 'thor' | 'dragon' | 'tackle'> = {
  rick: 'mach', steph: 'huracan', sophie: 'chilena', alana: 'thor', kenji: 'dragon', ryu: 'huracan', goro: 'tackle', tetsu: 'mach',
  minh: 'huracan', lan: 'mach', tuan: 'tackle', ba_hoa: 'chilena', andres: 'dragon', camila: 'huracan', pipe: 'chilena', don_hernando: 'tackle',
  gabo: 'mach', yuli: 'huracan', toto: 'chilena', carmen: 'mach', ender: 'dragon', yusmary: 'huracan', jhonder: 'chilena', abuela_nerva: 'tackle',
};

interface FightData { modo: string; jugador: string; rival: string; gira?: boolean; practica?: boolean }

/** El borde sin baranda: donde empieza el hueco del layout de la azotea. */
const BORDE = azotea.huecos[0].x0;
/** hasta dónde llega el borde cuando la azotea se achica */
const BORDE_MIN = 420;
/** cada cuánto cae algo pesado del cielo, y cuándo se empieza a achicar */
const CADA_GRANDE = 30;
const ACHICA = 90;
const PESADOS = ['llanta', 'pote_basura', 'silla_plastica'];

/** Lo que dice cada uno en la pantalla del VS. */
const FRASE: Record<string, string> = {
  rick: '¡AQUÍ NADIE SE RINDE, PANA!', steph: '¡ORDEN EN ESTA AZOTEA!', sophie: '¡TE VOY A GANAR, YA VERÁS!', alana: '¡THOR Y YO TE GANAMOS!',
  kenji: '¡ESTA AZOTEA ES MÍA!', ryu: '¡ERES DEMASIADO LENTO!', goro: '¡GORO TIENE HAMBRE!', tetsu: '¡JE, JE! ¡PREPÁRATE!',
  minh: '¡EL DRAGÓN NUNCA PIERDE!', lan: '¡NI ME VAS A VER PASAR!', tuan: '¡HOY HAY BÁNH MÌ PARA EL QUE GANE!', ba_hoa: '¡RESPETA A TU ABUELA, MIJO!',
  andres: '¡TE RECETO UNA DERROTA!', camila: '¡HÁGALE PUES, SUMERCÉ!', pipe: '¡QUÉ CHIMBA DE PELEA, PARCE!', don_hernando: '¡EN MIS TIEMPOS ESTO ERA EN SERIO!',
  gabo: '¡AQUÍ MANDAN LOS PANAS!', yuli: '¡VAS A VER LO QUE ES BUENO!', toto: '¡CHAMO, NO TE ME ESCAPES!', carmen: '¡ESTA CHANCLETA TIENE TU NOMBRE!',
  ender: '¡MOLLEJA, PRIMO! ¿Y QUÉ?', yusmary: '¡EL RELÁMPAGO NO AVISA!', jhonder: '¡ME COMÍ TRES PATACONES Y VOY POR TI!', abuela_nerva: '¡AY, MI AMOR, TE VOY A BENDECIR!',
};
/** Las burlas del Instituto cuando te tumba. */
const BURLAS = ['¡JAJAJA!', '¿ESO ES TODO?', '¡QUÉ LENTO!', '¡NI ME DESPEINÉ!', '¡LEVÁNTATE, PUES!'];
/** Las onomatopeyas de cómic de los golpes fuertes. */
const PUM = ['¡POW!', '¡BAM!', '¡CATAPLUM!', '¡PUM!', '¡KRAK!'];
const PAF = ['¡PAF!', '¡ZAS!', '¡TOING!', '¡PLAF!'];

export class Fight extends Phaser.Scene implements World {
  actors: Actor[] = [];
  items: Item[] = [];
  private brains = new Map<Actor, Brain>();
  private player!: Actor;
  private pad!: Input;
  private stop = 0;
  private cut = 0;
  private cutObjs: Phaser.GameObjects.GameObject[] = [];
  private phase: 'intro' | 'play' | 'end' = 'intro';
  private paused = false;
  private pauseObjs: Phaser.GameObjects.GameObject[] = [];
  private hud!: Phaser.GameObjects.Graphics;
  private hudObjs: Phaser.GameObjects.GameObject[] = [];
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dusts!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dropT = 9;
  private slow = 0;
  private data0!: FightData;
  private endChoice: ((p: ReturnType<Input['read']>) => void) | null = null;
  private coach: Coach | null = null;
  /** entrenamiento: con qué animación pegó la persona cada golpe */
  private golpes: string[] = [];
  private thorFan: Figura | null = null;
  private thorRun: { f: Figura; x: number; owner: Actor; hit: Set<Actor>; dir: number } | null = null;
  /** las técnicas en curso; la tijera del vovinam lleva a su rival (`v`), que cae cuadro a cuadro con ella */
  private specials = new Map<Actor, { kind: string; n: number; t: number; v?: Actor; arma?: string; sueltas?: number; objetivo?: Actor }>();
  /** el aura de fuego de cada uno mientras hace su técnica */
  private auras = new Map<Actor, Phaser.GameObjects.Sprite>();
  /** el arma en la mano durante una técnica de equipo (el furro, el palo, la silla, la chancleta) */
  private tecArma: Phaser.GameObjects.Image | null = null;
  private fullMeter = new Set<Actor>();
  private ui!: Phaser.GameObjects.Layer;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private camLock = false;
  private zoom = 1.45;
  private get camY() { return 360 - 180 / this.zoom; }
  /** Kachinuki: el borde, el reloj, lo que cae del cielo y los que se cayeron */
  limites?: { xmin: number; xmax: number; depth: number };
  private borde = BORDE;
  private reloj = 0;
  private grandeT = CADA_GRANDE;
  private achicando = false;
  private derrumbe = 0;
  private caidos = new Set<Actor>();
  private rescates = 0;
  private bordeG: Phaser.GameObjects.Graphics | null = null;
  /** el arte de PixelForja de la azotea, si llegó (si no, el fondo pintado de antes) */
  private arte: ReturnType<typeof pintarEscenario> | null = null;
  /** la vista inclinada del arte: lo del fondo queda a la izquierda (px = x + inclinacion * y) */
  inclinacion = 0;
  /** con el arte: la ciudad allá abajo que se ve donde el piso se cayó, y el filo que se desmorona */
  private vacio: { img: Phaser.GameObjects.TileSprite; mascara: Phaser.GameObjects.Graphics } | null = null;
  private filo: Phaser.GameObjects.Sprite | null = null;
  /** Judo y Vovinam: los puntos de cada lado (lanzamiento = ippon, 2; tumbar de un golpe = waza-ari, 1), el reloj y el punto de oro */
  private puntos: [number, number] = [0, 0];
  private relojJudo = 0;
  private oro = false;
  private get judo() { return this.data0.modo === 'judo'; }
  /** para el actor: en el tatami la patada agarrando es la proyección */
  get esJudo() { return this.judo; }
  private relojTxt: Reloj | null = null;
  /** las barras del marcador hechas con las piezas del kit (lote G1), una por luchador en el uno contra uno */
  private hudKit: { a: Actor; right: boolean; vida: Phaser.GameObjects.Image | null; nek: Phaser.GameObjects.Image; llena: Phaser.GameObjects.TileSprite }[] = [];
  private pesado: { it: Item; sombra: Phaser.GameObjects.Ellipse } | null = null;
  /** la arepa que cae de vez en cuando: quien la pisa recupera vida */
  private arepas: { x: number; y: number; g: Phaser.GameObjects.Graphics; t: number }[] = [];
  private arepaT = 24;
  /** el contador de golpes seguidos de la persona */
  private racha = { n: 0, t: 0 };
  private rachaTxt: Phaser.GameObjects.BitmapText | null = null;

  constructor() { super('Fight'); }

  init(d: FightData) {
    this.data0 = { modo: d.modo ?? '1v1', jugador: d.jugador ?? 'rick', rival: d.rival ?? 'kenji', gira: !!d.gira, practica: !!d.practica };
    conJugador(this.data0.jugador);
    this.coach = null;
    this.golpes = [];
    this.actors = [];
    this.items = [];
    this.brains.clear();
    this.specials.clear();
    this.auras.clear();
    this.fullMeter.clear();
    this.stop = 0; this.cut = 0; this.slow = 0;
    this.phase = 'intro';
    this.paused = false;
    this.endChoice = null;
    this.thorRun = null;
    this.dropT = 9;
    this.borde = BORDE;
    this.reloj = 0;
    this.grandeT = CADA_GRANDE;
    this.achicando = false;
    this.derrumbe = 0;
    this.caidos.clear();
    this.rescates = ajustes().rescates;
    this.pesado = null;
    this.arepas = [];
    this.arepaT = 20 + Math.random() * 8;
    this.racha = { n: 0, t: 0 };
    this.rachaTxt = null;
    // entrenando no hay borde: el saco y tú no se caen
    this.limites = this.data0.practica || this.data0.modo === 'judo' ? undefined : { xmin: XMIN, xmax: 700, depth: DEPTH };
    this.puntos = [0, 0];
    this.relojJudo = 90;
    this.oro = false;
  }

  get sc(): Phaser.Scene { return this; }

  /** Para la máquina: dónde hay comida en el piso. */
  get comida() { return this.arepas.map((a) => ({ x: a.x, y: a.y })); }

  /** El globo de una burla de equipo, en el gesto fuerte: blanco con su colita, y la frase de su equipo. */
  frase(a: Actor) {
    const eq = (kit().atletas[a.id] as { equipo?: string } | undefined)?.equipo ?? '';
    const s = Phaser.Utils.Array.GetRandom(equipos()[eq]?.frases ?? BURLAS);
    const x = this.px(a.x, a.y), y = FLOOR_TOP + a.y - a.z - 66;
    const t = txt(this, x, y, s, 'fuente_ui', 1).setDepth(6001).setTint(a.team === 0 ? 0x2a5ab0 : 0xb02a3a);
    const w = t.width + 10, h = 14;
    const g = this.add.graphics().setDepth(6000).setPosition(x, y);
    g.fillStyle(0xffffff).fillRoundedRect(-w / 2, -h / 2, w, h, 4).fillTriangle(-3, h / 2 - 1, 3, h / 2 - 1, a.dir > 0 ? -6 : 6, h / 2 + 5);
    g.lineStyle(1, 0x1e1418).strokeRoundedRect(-w / 2, -h / 2, w, h, 4);
    g.setScale(0.3); t.setScale(0.3);
    this.tweens.add({ targets: [g, t], scale: 1, duration: 160, ease: 'Back.out' });
    this.tweens.add({ targets: [g, t], alpha: 0, delay: 1100, duration: 300, onComplete: () => { g.destroy(); t.destroy(); } });
  }

  /** Un cartelito de cómic chiquito sobre alguien. */
  aviso(a: Actor, s: string, color: number) {
    const t = txt(this, this.px(a.x, a.y), FLOOR_TOP + a.y - a.z - 58, s, 'fuente_ui', 1).setTint(color).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 14, alpha: 0, delay: 350, duration: 550, onComplete: () => t.destroy() });
  }

  /** Una onomatopeya de cómic con su estallido detrás: ¡POW! */
  private onomatopeya(x: number, y: number, s: string, grande: boolean) {
    const g = this.add.graphics().setDepth(6000).setPosition(x, y);
    const n = 12, R = grande ? 22 : 15, r = grande ? 13 : 9;
    const pts = Array.from({ length: n * 2 }, (_, i) => { const ang = (i * Math.PI) / n + Math.random() * 0.15, rr = i % 2 ? r : R + Math.random() * 4; return { x: Math.cos(ang) * rr * 1.5, y: Math.sin(ang) * rr }; });
    g.fillStyle(grande ? 0xffe040 : 0xffffff).fillPoints(pts, true);
    g.lineStyle(2, 0x1e1418).strokePoints(pts, true, true);
    const t = txt(this, x, y, s, grande ? 'fuente_titulo' : 'fuente_ui', 1).setDepth(6001).setTint(grande ? 0xe8402a : 0x1e1418);
    const todo = [g, t];
    g.setScale(0.2); t.setScale(0.2);
    this.tweens.add({ targets: todo, scale: 1, angle: Phaser.Math.Between(-12, 12), duration: 110, ease: 'Back.out' });
    this.tweens.add({ targets: todo, alpha: 0, y: y - 10, delay: 380, duration: 260, onComplete: () => todo.forEach((o) => o.destroy()) });
  }

  /** Tu equipo pega más según el nivel. */
  multDaño(from: Actor | null) { return from?.team === 0 ? ajustes().daño : 1; }

  /** Pasado el borde no hay piso: quien vuela hasta ahí se cae. */
  suelo(x: number) { return this.limites && x >= this.borde ? HUECO : 0; }

  /** Caminando no se sale de la azotea: solo te sacan a golpes (o saltando como loco). */
  bloquea(x: number, _y: number, z: number) { return !!this.limites && x >= this.borde - 2 && z <= 0.5; }

  /** Se cayó: Thor lo salva si le quedan rescates (solo a la persona); si no, queda fuera. */
  caida(a: Actor) {
    if (this.caidos.has(a) || !a.alive) return;
    if (a.human && this.rescates > 0) {
      this.rescates--;
      a.x = this.borde - 70; a.z = 0; a.vx = 0; a.vy = 0; a.vz = 0;
      a.hp = Math.max(1, Math.round(a.hp - a.maxHp * 0.15));
      a.setSt('idle', 'idle');
      a.invul = 1.6;
      this.thorFan?.set('bark', true);
      this.sfx('ladrido', 0.6);
      flash(this, 120);
      this.letrero(a, '¡THOR TE SALVÓ!', 0xffe080);
      return;
    }
    this.caidos.add(a);
    const fig = a.fig;
    // delante del vacío y del filo, detrás de lo que sigue en la azotea
    fig.setDepth(this.arte ? FLOOR_TOP - 0.2 : -7.9);
    chip.blip(1320, 0.7, 'sq50', 0.14, 110);
    this.tweens.add({ targets: fig, y: fig.y + 220, angle: a.left ? -200 : 200, duration: 900, ease: 'Quad.in', onComplete: () => fig.setVisible(false) });
    this.letrero(a, '¡FUERA!', 0xff8080);
    this.shake(160, 0.008);
    a.fuera();
  }

  private letrero(a: Actor, s: string, color: number) {
    const t = txt(this, this.px(Math.min(a.x, this.borde - 40), a.y), FLOOR_TOP + a.y - 64, s, 'fuente_titulo', 1).setTint(color).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, delay: 500, duration: 600, onComplete: () => t.destroy() });
  }

  /** el escenario de PixelForja: el dojo de Hà Nội en el judo, la azotea de Caracas en la pelea */
  private get escenario() { return this.judo ? 'judo_hanoi' : 'caracas_azotea'; }

  preload() {
    pantallaCarga(this, this.judo ? 'JUDO Y VOVINAM' : 'KACHINUKI CARACAS');
    const j = this.data0.jugador, r = this.data0.rival;
    // en el judo, cada uno en su judogi (lote B4B6 bis): blanco el de la persona, azul el rival; sin el pack, lo de antes
    if (this.judo && kit().atletas[j]?.packs.judo) cargarAtletas(this, [j, r], (id) => (id === j && id === r ? ['judo', 'judo_azul'] : id === j ? ['judo'] : ['judo_azul']), undefined, true);
    else cargarAtletas(this, [...nuestros(), ...ellos(), j, r], packsDe('Fight'), undefined, true);
    queueEscenario(this, this.escenario);
  }

  /** el tema que suena en bucle (lotes H2 y H3 de PixelForja) */
  private temaSonando: Phaser.Sound.BaseSound | null = null;

  /**
   * La música de la pelea: el tema del Instituto en el 4 contra 4 y el de Caracas en el 1 contra 1. El judo y el
   * entrenamiento siguen con la pelea del chip, y también todo si el kit no trae el tema.
   */
  private tema() {
    this.temaSonando = null;
    this.ambienteSonando = null;
    const n = this.judo || this.data0.practica ? null : this.data0.modo === '4v4' ? 'tema_instituto' : 'pana_dale';
    // debajo: la ciudad de noche en la azotea de Caracas (lote H7), o el dojo de Hà Nội en el judo (lote B7H8)
    const amb = this.judo ? 'dojo_hanoi' : 'azotea_noche';
    if (kit().audio.ambientes?.[amb]) void bucle(this, 'ambientes', amb, 0.3, true).then((s) => { this.ambienteSonando = s; if (this.phase === 'end') this.callarTema(); });
    if (!n || !kit().audio.musica?.[n]) { chip.play(PELEA); return; }
    chip.stop(0.2);
    void bucle(this, 'musica', n, 0.4).then((s) => { this.temaSonando = s; if (this.phase === 'end') this.callarTema(); });
  }

  private ambienteSonando: Phaser.Sound.BaseSound | null = null;

  private callarTema() {
    for (const s of [this.temaSonando, this.ambienteSonando]) if (s) this.tweens.add({ targets: s, volume: 0, duration: 300, onComplete: () => s.stop() });
    this.temaSonando = null;
    this.ambienteSonando = null;
  }

  /** Un efecto del kit si lo trae (los del judo, lote H2). */
  private suena(n: string, volumen = 0.5) { if (this.cache.audio.exists(n)) this.sound.play(n, { volume: volumen }); }

  /** La x de pantalla de un punto del piso, con la vista inclinada del arte. */
  px(x: number, y: number) { return x + this.inclinacion * y; }

  create() {
    this.cameras.main.fadeIn(250);
    // el mundo se ve de cerca y sigue la acción; el marcador va en su propia capa, sin acercar
    this.ui = this.add.layer().setDepth(10000);
    // entrenando, un poco más lejos: el cartel de arriba no tapa a nadie
    this.arte = hayArte(this, this.escenario) ? pintarEscenario(this, this.escenario, 5000) : null;
    // con el arte, un poco más lejos: los neones, las torres y el Ávila se ven enteros debajo del marcador
    this.zoom = this.judo ? 1.5 : this.arte ? (this.data0.practica ? 1.25 : ZOOMS_ARTE[this.data0.modo] ?? 1.25) : this.data0.practica ? 1.45 : ZOOMS[this.data0.modo] ?? 1.45;
    this.inclinacion = this.arte?.inclinacion ?? 0;
    this.vacio = null;
    this.filo = null;
    this.cameras.main.setZoom(this.zoom).setBounds(0, 0, this.arte?.ancho ?? 640, 360).centerOn(320, this.camY);
    this.cameras.main.ignore(this.ui);
    this.uiCam = this.cameras.add(0, 0, 640, 360).setName('ui');
    this.camLock = false;
    if (this.judo) { if (!this.arte) this.add.image(320, 180, 'bg_hanoi').setDepth(-10); }
    else if (!this.arte) {
      this.add.image(320, 180, 'bg_caracas').setDepth(-10).setScrollFactor(0.45, 1);
      this.add.image(320, 280, 'bg_azotea').setDepth(-9);
      // en los edificios, más abajo que el marcador: se ven enteros con cualquier acercamiento
      this.neon('AREPERA LA CHAMA', 470, 194, 0xff4fa0);
      this.neon('CARACAS', 160, 190, 0x40e0ff);
    }
    // Thor mira desde el fondo, lejos del borde (con el arte, en su lugar del layout: delante de los tanques)
    const npc = azotea.entidades.find((e) => e.tipo === 'npc');
    const ty = this.arte ? (npc?.y ?? 2) : -2;
    this.thorFan = new Figura(this, this.px(npc?.x ?? 40, Math.max(0, ty)), FLOOR_TOP + ty, 'thor', 'sit').setDepth(FLOOR_TOP + ty);
    // en el dojo, Thor mira desde la orilla
    if (this.judo) this.thorFan.setPosition(70, FLOOR_TOP - 6).setDepth(FLOOR_TOP - 6);
    this.thorFan.row = 'down_right';
    this.bordeG = this.data0.practica || this.arte || this.judo ? null : this.add.graphics().setDepth(-8);
    this.dibujarBorde();

    this.sparks = this.add.particles(0, 0, 'px', { speed: { min: 60, max: 180 }, lifespan: 260, scale: { start: 0.9, end: 0 }, tint: [0xffffff, 0xffe040, 0xffa020], emitting: false }).setDepth(5000);
    this.dusts = this.add.particles(0, 0, 'px', { speedX: { min: -40, max: 40 }, speedY: { min: -30, max: -6 }, lifespan: 380, scale: { start: 0.8, end: 0 }, tint: 0xb0a8b8, alpha: { start: 0.7, end: 0 }, emitting: false }).setDepth(4999);

    const { modo, jugador, rival } = this.data0;
    const mios = modo === '4v4' ? [jugador, ...nuestros().filter((f) => f !== jugador)] : [jugador];
    const suyos = modo === '4v4' ? ellos() : [rival];
    mios.forEach((id, i) => {
      const a = new Actor(this, id, 0, 90 + (i % 2) * 40, 20 + i * 22, i === 0);
      this.actors.push(a);
      // tu equipo aguanta más según el nivel
      a.maxHp = a.hp = Math.round(a.maxHp * ajustes().vida);
      if (i === 0) this.player = a; else this.brains.set(a, new Brain(a, 0.9));
    });
    suyos.forEach((id, i) => {
      const a = new Actor(this, id, 1, this.data0.practica ? 230 : 550 - (i % 2) * 40, 20 + i * 22);
      this.actors.push(a);
      // entrenando, el rival es un saco: no se mueve ni pega
      if (!this.data0.practica) this.brains.set(a, new Brain(a, (modo === '4v4' ? 0.85 : 1) * ajustes().cpuAgresion));
    });
    // en el tatami, cada uno con su judogi: el pack blanco para la persona y el azul para el rival
    if (this.judo) for (const a of this.actors) { a.fig.anim.prefer = a.team === 0 ? 'judo' : 'judo_azul'; a.play('idle', true); }
    // en el tatami no hay armas
    const n = this.judo ? 0 : modo === '4v4' ? 6 : 4;
    for (let i = 0; i < n; i++) this.items.push(new Item(this, ARMAS_PISO[i], 200 + Math.random() * 240, 10 + Math.random() * (DEPTH - 20)));
    if (!this.judo && !this.items.some((i) => i.kind === 'chancleta')) this.items.push(new Item(this, 'chancleta', this.player.x + 40, this.player.y));

    this.pad = new Input(this, undefined, this.ui);
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.buildHud();
    this.registry.set('marchaSonando', false);
    this.tema();
    if (this.data0.practica) void this.entrenar(); else void this.roundIntro();
  }

  // ------------------------------------------------------------------ entrenamiento

  private async entrenar() {
    this.dropT = 1e9;
    await this.banner('ENTRENAMIENTO', 'fuente_titulo_plata', 2, 1100);
    this.phase = 'play';
    this.coach = new Coach(this, this.ui, this.pad, this.pasos(), () => this.finPractica(), 58);
  }

  private pasos(): Paso[] {
    const yo = this.player;
    const saco = this.actors.find((a) => a.team === 1)!;
    const chancla = () => this.items.find((i) => i.kind === 'chancleta');
    let x0 = 0, y0 = 0, n0 = 0;
    const desde = () => this.golpes.slice(n0);
    const marca = () => { n0 = this.golpes.length; };
    return [
      { texto: 'MUÉVETE CON {MOVER}\nY ACÉRCATE AL RIVAL', botones: ['stick'], antes: () => { x0 = yo.x; y0 = yo.y; }, listo: () => Math.hypot(yo.x - x0, yo.y - y0) > 50 },
      { texto: '{PUÑO} ES PUÑO: PÉGALE\n3 VECES SEGUIDAS', botones: ['punch'], antes: marca, listo: () => desde().length >= 3 },
      { texto: '{PATADA} ES PATADA:\nPÉGALE UNA PATADA', botones: ['kick'], antes: marca, listo: () => desde().some((g) => g.includes('kick')) },
      { texto: '{SALTO} ES SALTO: SALTA Y EN EL AIRE\nTOCA {PATADA}, ¡PATADA VOLADORA!', botones: ['jump', 'kick'], antes: marca, listo: () => desde().some((g) => g === 'air_kick') },
      { texto: 'MANTÉN {ESPECIAL} Y TE CUBRES:\nLOS GOLPES DE FRENTE CASI NO DUELEN', botones: ['special'], listo: () => yo.st === 'guard' && yo.t > 0.6 },
      {
        texto: 'PÉGALE Y SIGUE CAMINANDO HACIA ÉL: ¡LO AGARRAS!\n{PUÑO} RODILLAZO · {PATADA} LO BOTAS', botones: ['punch', 'stick'], antes: marca,
        listo: () => desde().some((g) => g === 'knee_grab' || g === 'grab_hold'),
      },
      { texto: 'PARA CORRER USA\n{CORRER}', botones: ['correr'], listo: () => yo.st === 'run' },
      {
        texto: 'ESTÁ EN EL PISO: PÁRATE AL LADO\nY TOCA {PUÑO} PARA LEVANTARLO', botones: ['punch'],
        cada: () => { if (['idle', 'walk', 'dizzy', 'hurt'].includes(saco.st)) saco.knockdown(yo.x < saco.x ? 1 : -1, 10, 60); },
        listo: () => yo.carrying === saco,
      },
      { texto: '¡ARRIBA! CAMINA SI QUIERES\nY TOCA {PUÑO} PARA LANZARLO', botones: ['punch'], listo: () => saco.st === 'thrown' },
      {
        texto: 'RECOGE UN ARMA DEL PISO:\nPÁRATE ENCIMA Y TOCA {PUÑO}', botones: ['punch', 'stick'],
        antes: () => { const c = chancla(); if (c && c.st !== 'hand') { c.st = 'floor'; c.x = yo.x + yo.dir * 30; c.y = yo.y; c.z = 0; } },
        listo: () => !!yo.weapon,
      },
      { texto: '{PATADA} LA LANZA\n¡LA CHANCLETA VUELVE GIRANDO!', botones: ['kick'], listo: () => this.items.some((i) => i.st === 'flying' && i.thrower === yo) },
      { texto: 'TU BARRA NEKKETSU ESTÁ LLENA:\nTOCA {ESPECIAL}: TU TÉCNICA', botones: ['special'], antes: () => { yo.meter = 100; }, listo: () => this.specials.has(yo) || yo.st === 'special' },
    ];
  }

  private finPractica() {
    this.phase = 'end';
    this.callarTema();
    victoria(this, lado(0).id);
    flash(this, 150);
    const g = this.uiAdd(this.add.graphics().setDepth(8400));
    g.fillStyle(0x08081a, 0.88).fillRect(30, 100, 580, 120);
    g.lineStyle(2, 0xf2c230).strokeRect(31, 101, 578, 118);
    this.uiAdd(txt(this, 320, 128, '¡YA SABES PELEAR!', 'fuente_titulo', 2).setDepth(8500));
    this.uiAdd(txt(this, 320, 156, '¿TE ANIMAS CONTRA KENJI?', 'fuente_ui', 2).setDepth(8500).setTint(0xffe080));
    this.endMenu(['JUGAR DE VERDAD', 'OTRA VEZ', 'MENÚ'], undefined, (i) => {
      if (i === 0) this.scene.restart({ modo: '1v1', jugador: this.data0.jugador, rival: 'kenji' });
      else if (i === 1) this.scene.restart(this.data0);
      else this.toMenu();
    }, 196);
  }

  // ------------------------------------------------------------------ World

  hitstop(s: number) { this.stop = Math.max(this.stop, s); }
  shake(ms: number, k: number) { this.cameras.main.shake(ms, k); }
  sfx(name: string, vol = 0.5) { if (this.cache.audio.exists(name)) this.sound.play(name, { volume: vol }); }
  spark(x: number, y: number, z: number, big: boolean) {
    // la chispa del kit en el punto del golpe; las partículas quedan de relleno
    const sx = this.px(x, y);
    efecto(this, big ? 'chispa_golpe_pesado' : 'chispa_golpe_medio', sx, FLOOR_TOP + y - z, { depth: 5002 });
    this.sparks.explode(big ? 8 : 4, sx, FLOOR_TOP + y - z);
    const ring = this.add.circle(sx, FLOOR_TOP + y - z, 3, 0xffffff, 0).setStrokeStyle(2, 0xffffff).setDepth(5001);
    this.tweens.add({ targets: ring, scale: big ? 5 : 3, alpha: 0, duration: 160, onComplete: () => ring.destroy() });
  }
  dust(x: number, y: number) {
    if (!efecto(this, 'polvo_caer_medio', this.px(x, y), FLOOR_TOP + y)) this.dusts.explode(7, this.px(x, y), FLOOR_TOP + y);
  }
  /** Al correr, una nubecita en cada paso; la persona además suena. */
  paso(a: Actor) {
    if (a.st === 'run') efecto(this, `polvo_correr_${talla(a.fig.celda)}`, this.px(a.x, a.y), FLOOR_TOP + a.y, { flip: a.left });
    if (a.human) this.sfx(`paso_piedra_${Math.floor(Math.random() * 3)}`, 0.25);
  }
  number(x: number, y: number, n: number) {
    const t = txt(this, this.px(x, y), FLOOR_TOP + y - 52, `${n}`, 'fuente_ui', 1).setTint(0xff6060).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 650, onComplete: () => t.destroy() });
  }
  onHit(from: Actor | null, v: Actor, _dmg: number, kd: boolean) {
    // el seoi nage es ippon; el o-soto-gari, waza-ari; tumbarlo de un golpe, waza-ari
    // la tijera del vovinam con la barra llena también es ippon (la palmada suena cuando cae, en su aterriza)
    const tijera = !!from && this.specials.get(from)?.kind === 'tijera';
    if (this.judo && kd && from && from.team !== v.team && this.phase === 'play') this.puntoJudo(from, (from.st === 'grab' && from.tecnica !== 'osoto') || from.st === 'throw' || tijera, tijera);
    if (from === this.player && this.data0.practica) this.golpes.push(from.fig.anim.name);
    this.sfx(kd ? 'critico' : 'golpe', kd ? 0.55 : 0.45);
    this.sfx(v.team === 0 ? 'jugador_dolor' : 'enemigo_dolor', 0.25);
    this.hitstop(kd ? 0.09 : 0.05);
    if (kd) this.shake(110, 0.006);
    if (kd && v.team === 1 && this.thorFan?.visible && Math.random() < 0.5) { this.thorFan.set('bark', true); this.sfx('ladrido', 0.35); }
    // los golpes seguidos de la persona: el contador y, cada tanto, la onomatopeya
    if (from === this.player && !this.data0.practica) {
      const now = this.time.now;
      this.racha.n = now - this.racha.t < 1100 ? this.racha.n + 1 : 1;
      this.racha.t = now;
      if (this.racha.n >= 2) this.mostrarRacha();
    }
    const cabeza = FLOOR_TOP + v.y - v.z - 40;
    if (kd) this.onomatopeya(this.px(v.x, v.y) + (from ? from.dir * 10 : 0), cabeza, Phaser.Utils.Array.GetRandom(PUM), true);
    else if (from === this.player && this.racha.n % 3 === 0) this.onomatopeya(this.px(v.x, v.y), cabeza, Phaser.Utils.Array.GetRandom(PAF), false);
    // el Instituto se burla cuando te tumba (y si le pegas mientras se ríe, se lo merece); los de la Familia que
    // maneja la máquina celebran con su pulgar cuando tumban a uno del Instituto
    const seBurla = kd && from && this.phase === 'play' && (from.team === 1 ? v.human && Math.random() < 0.65 : !from.human && Math.random() < 0.35);
    if (seBurla) {
      this.time.delayedCall(520, () => {
        if (!from.alive || this.phase !== 'play') return;
        const anim = from.burla(1.1);
        // la del equipo trae su globo en el gesto fuerte (frase()); la risa y el dedo, el texto de una vez
        if (!anim || anim === from.burlaDeEquipo) return;
        const t = txt(this, this.px(from.x, from.y), FLOOR_TOP + from.y - 62, Phaser.Utils.Array.GetRandom(BURLAS), 'fuente_ui', 1).setDepth(6000).setTint(0xffa0a0);
        this.tweens.add({ targets: t, y: t.y - 8, alpha: 0, delay: 700, duration: 400, onComplete: () => t.destroy() });
      });
    }
  }

  /** "3 GOLPES": crece con la racha y se va solo. */
  private mostrarRacha() {
    const n = this.racha.n;
    this.rachaTxt?.destroy();
    const t = this.uiAdd(txt(this, 24, 78, n >= 5 ? `¡${n} GOLPES! ¡NEKKETSU!` : `${n} GOLPES`, 'fuente_titulo', 1, 0).setDepth(8100).setTint(n >= 5 ? 0xff6040 : n >= 3 ? 0xffe040 : 0xffffff));
    t.setScale(1.6);
    this.tweens.add({ targets: t, scale: 1, duration: 140, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 300, onComplete: () => t.destroy() });
    this.rachaTxt = t;
    if (n >= 3) chip.blip(660 + n * 60, 0.06, 'sq25', 0.1, 990 + n * 60);
  }
  onKO(a: Actor) {
    this.sfx('enemigo_muere', 0.5);
    const t = txt(this, this.px(a.x, a.y), FLOOR_TOP + a.y - 60, 'K.O.', 'fuente_titulo', 1).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 20, alpha: 0, delay: 600, duration: 700, onComplete: () => t.destroy() });
    const vivos = this.actors.filter((x) => x.team === a.team && x.alive);
    if (!vivos.length && this.phase === 'play') {
      // cámara lenta en el último KO
      this.slow = 1.3;
      this.camLock = true;
      this.cameras.main.zoomTo(this.zoom * 1.3, 250);
      this.cameras.main.pan(this.px(a.x, a.y), FLOOR_TOP + a.y - 30, 250);
      flash(this, 200);
      // el K.O. grande, de pantalla completa
      this.shake(380, 0.014);
      chip.boom(0.9);
      const ko = this.uiAdd(txt(this, 320, 140, 'K.O.', 'fuente_titulo', 7).setDepth(8700).setTint(a.team === 1 ? 0xffe040 : 0xff5a4a));
      this.tweens.add({ targets: ko, scale: { from: 12, to: 6 }, duration: 260, ease: 'Back.out' });
      this.tweens.add({ targets: ko, alpha: 0, delay: 1150, duration: 300, onComplete: () => ko.destroy() });
      this.time.delayedCall(1400, () => { this.cameras.main.zoomTo(this.zoom, 300); this.time.delayedCall(320, () => { this.camLock = false; }); });
    }
  }
  special(a: Actor) {
    if (a.meter < 100 || this.cut > 0) return;
    a.meter = 0;
    this.fullMeter.delete(a);
    for (const x of this.actors) if (x.st !== 'ko') x.vx = 0;
    a.st = 'special';
    a.t = 0;
    a.dropAll();
    this.cutIn(a);
  }

  // ------------------------------------------------------------------ cuadro a cuadro

  update(_t: number, dms: number) {
    let dt = Math.min(0.05, dms / 1000);
    const p = this.pad.read();
    if (this.endChoice) { this.endChoice(p); this.renderAll(); this.drawHud(); return; }
    if (p.pressed.start && this.phase === 'play') this.togglePause();
    if (this.paused) { if (p.pressed.back) this.toMenu(); return; }
    if (this.slow > 0) { this.slow -= dt; dt *= 0.3; if (this.slow <= 0) this.checkEnd(); }
    if (this.cut > 0) {
      this.cut -= dms / 1000;
      if (this.cut <= 0) this.endCutIn();
      this.renderAll();
      this.drawHud();
      return;
    }
    if (this.stop > 0) { this.stop -= dt; this.renderAll(); this.drawHud(); return; }

    const playing = this.phase === 'play';
    // la estrella con la barra llena es la técnica; sin barra, mantenida, te cubres
    const human: Intent = playing ? { x: p.x, y: p.y, run: p.run, punch: p.pressed.punch, kick: p.pressed.kick, jump: p.pressed.jump, special: p.pressed.special, guard: p.held.special && this.player.meter < 100 } : NOTHING;
    for (const a of this.actors) {
      if (this.specials.has(a)) { this.specialTick(a, dt); continue; }
      const it = a === this.player ? human : playing ? (this.brains.get(a)?.update(dt) ?? NOTHING) : NOTHING;
      a.update(dt, it);
    }
    for (const i of this.items) i.update(dt);
    this.thorTick(dt);
    this.thorFan?.step(dt);
    if (this.thorFan?.anim.done) this.thorFan.set('sit');
    for (const a of this.actors) if (a.meter >= 100 && !this.fullMeter.has(a) && a.team === 0 && a.human) { this.fullMeter.add(a); this.sfx('subir_nivel', 0.4); }

    if (this.data0.practica) {
      // nadie se cansa entrenando
      for (const a of this.actors) if (a.hp < a.maxHp * 0.5) a.hp = a.maxHp;
      this.coach?.tick(dt);
    }
    if (playing) {
      this.dropT -= dt;
      if (this.dropT <= 0) { this.dropT = 9 + Math.random() * 5; this.skyDrop(); }
      if (this.limites) this.kachinuki(dt);
      if (this.judo) this.relojDeJudo(dt);
      this.arepaTick(dt);
      if (this.slow <= 0) this.checkEnd();
    }
    this.renderAll();
    this.drawHud();
  }

  private renderAll() {
    // el escenario: paralaje, neones, luces, el helicóptero y el público
    this.arte?.tick(this.game.loop.delta / 1000, this.cameras.main.scrollX, () => false);
    // los que se cayeron de la azotea ya no se dibujan donde estaban: van cayendo solos
    for (const a of this.actors) if (!this.caidos.has(a)) a.render();
    for (const i of this.items) i.render();
    this.follow();
    // lo que no es marcador no lo dibuja la cámara del marcador
    const id = this.uiCam.id;
    for (const o of this.children.list) if ((o as unknown) !== this.ui) o.cameraFilter |= id;
  }

  private uiAdd<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.ui.add(o);
    return o;
  }

  private follow() {
    if (this.camLock) return;
    const cam = this.cameras.main;
    const p = this.player;
    const foes = this.actors.filter((a) => a.team !== p.team && a.alive);
    const near = foes.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
    const tx = near && Math.abs(near.x - p.x) < 260 ? this.px(p.x, p.y) * 0.6 + this.px(near.x, near.y) * 0.4 : this.px(p.x, p.y);
    const cur = cam.midPoint.x || 320;
    cam.centerOn(cur + (tx - cur) * 0.08, this.camY);
  }

  private checkEnd() {
    if (this.phase !== 'play' || this.slow > 0 || this.data0.practica) return;
    const nos = this.actors.filter((a) => a.team === 0 && a.alive);
    const ellos = this.actors.filter((a) => a.team === 1 && a.alive);
    if (!ellos.length) this.victory();
    else if (!nos.length || (this.data0.modo === '1v1' && !this.player.alive)) this.defeat();
  }

  // ------------------------------------------------------------------ inicio y final

  private async roundIntro() {
    await this.vs();
    if (this.judo) {
      // las reglas, en su franja, antes del ¡HAJIME!
      this.dropT = this.arepaT = 1e9;
      const band = this.uiAdd(this.add.graphics().setDepth(8400));
      band.fillStyle(0x08081a, 0.82).fillRect(-80, 120, 800, 70);
      band.fillStyle(0xf2c230).fillRect(-80, 120, 800, 2).fillRect(-80, 188, 800, 2);
      const t1 = this.uiAdd(txt(this, 320, 138, 'JUDO Y VOVINAM · GANA EL PRIMERO A 3', 'fuente_titulo_plata', 1).setDepth(8500));
      const t2 = this.uiAdd(txt(this, 320, 160, rotular('AGARRADO: ADELANTE + {PATADA} SEOI NAGE, ¡IPPON! (2)', this.pad.fuente), 'fuente_ui', 1).setDepth(8500).setTint(0xffe080));
      const t3 = this.uiAdd(txt(this, 320, 174, rotular('{PATADA} SOLA: O-SOTO-GARI · DE UN GOLPE: ¡WAZA-ARI! (1)', this.pad.fuente), 'fuente_ui', 1).setDepth(8500).setTint(0xc0c0e0));
      await new Promise<void>((r) => this.time.delayedCall(2600, r));
      band.destroy(); t1.destroy(); t2.destroy(); t3.destroy();
    }
    if (this.judo) {
      // frente a frente en el centro del tatami para el saludo, como en cada ¡HAJIME!
      for (const a of this.actors) { a.x = a.team === 0 ? 220 : 420; a.y = 50; a.vx = a.vy = 0; }
      await this.rei();
      this.suena('pitazo_largo', 0.5);
    }
    await this.banner(this.judo ? '¡HAJIME!' : '¡LISTOS!', 'fuente_titulo_plata', 3, 800);
    this.phase = 'play';
    chip.blip(1320, 0.2, 'sq50', 0.2, 1760);
    await this.banner('¡YA!', 'fuente_titulo', 5, 600);
  }

  /** La pantalla del VS antes de pelear: los dos retratos, sus nombres y lo que se dicen. */
  private vs() {
    return new Promise<void>((res) => {
      const yo = this.player, el = this.actors.find((a) => a.team === 1)!;
      const objs: Phaser.GameObjects.GameObject[] = [];
      const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { objs.push(this.uiAdd(o)); return o; };
      add(this.add.rectangle(320, 180, 800, 360, 0x000000, 0.7).setDepth(8600));
      add(this.add.rectangle(160, 160, 320, 150, 0x1a3a9a, 0.95).setDepth(8601));
      add(this.add.rectangle(480, 160, 320, 150, 0x9a1a2a, 0.95).setDepth(8601));
      add(speedLines(this, 8602));
      const pa = add(this.add.image(-120, 150, `retratos:${yo.id}`, 'grande_enojo').setDepth(8603));
      const pb = add(this.add.image(760, 150, `retratos:${el.id}`, 'grande_enojo').setDepth(8603).setFlipX(true));
      this.tweens.add({ targets: pa, x: 150, duration: 260, ease: 'Back.out' });
      this.tweens.add({ targets: pb, x: 490, duration: 260, ease: 'Back.out', delay: 120 });
      const modo4 = this.data0.modo === '4v4';
      add(txt(this, 150, 246, modo4 ? lado(0).nombre.toUpperCase() : yo.nombre.toUpperCase(), 'fuente_ui', 2).setDepth(8604).setTint(0x9ac8ff));
      add(txt(this, 490, 246, modo4 ? lado(1).nombre.toUpperCase() : el.nombre.toUpperCase(), 'fuente_ui', 2).setDepth(8604).setTint(0xffa0a0));
      const fa = add(txt(this, 150, 268, FRASE[yo.id] ?? '¡VAMOS!', 'fuente_ui', 1).setDepth(8604).setAlpha(0));
      const fb = add(txt(this, 490, 268, FRASE[el.id] ?? '¡VEN!', 'fuente_ui', 1).setDepth(8604).setAlpha(0));
      this.tweens.add({ targets: fa, alpha: 1, delay: 500, duration: 150 });
      this.tweens.add({ targets: fb, alpha: 1, delay: 1000, duration: 150 });
      const v = add(txt(this, 320, 150, 'VS', 'fuente_titulo', 4).setDepth(8605).setAlpha(0));
      this.time.delayedCall(320, () => { v.setAlpha(1); this.tweens.add({ targets: v, scale: { from: 9, to: 4 }, duration: 220, ease: 'Back.out' }); chip.boom(0.6); this.shake(150, 0.006); });
      this.time.delayedCall(2300, () => this.tweens.add({ targets: objs, alpha: 0, duration: 220, onComplete: () => { objs.forEach((o) => o.destroy()); res(); } }));
    });
  }

  private banner(s: string, font: 'fuente_titulo' | 'fuente_titulo_plata' | 'fuente_ui', scale: number, hold: number, y = 150) {
    return letreroGrande(this, (o) => this.uiAdd(o), s, font, scale, hold, y);
  }


  /**
   * Fuegos artificiales al ganar: los del kit, en el cielo que se ve con el acercamiento de la pelea (los del
   * escenario vienen más arriba, fuera de cuadro). Uno cada medio segundo, de colores, por unos segundos.
   */
  private fuegosArtificiales() {
    const colores = ['rojo', 'dorado', 'azul', 'verde'].filter((c) => this.textures.exists(`fx_fuegos_artificiales_${c}`));
    if (!colores.length) return;
    this.time.addEvent({
      delay: 450, repeat: 10, callback: () => {
        const v = this.cameras.main.worldView;
        const x = Phaser.Math.Between(Math.round(v.x + 40), Math.round(v.right - 40)), y = Phaser.Math.Between(Math.round(v.y + 55), Math.round(v.y + 100));
        // grandes y que sumen luz: sobre la ciudad encendida, los chiquitos se pierden
        efecto(this, `fuegos_artificiales_${Phaser.Utils.Array.GetRandom(colores)}`, x, y, { depth: -17, scale: 2 })?.setBlendMode(Phaser.BlendModes.ADD);
        chip.boom(0.25);
      },
    });
  }

  private victory() {
    // fuegos artificiales sobre Caracas
    this.fuegosArtificiales();
    this.phase = 'end';
    this.callarTema();
    victoria(this, lado(0).id);
    for (const a of this.actors) if (a.team === 0 && a.alive) { a.fig.row = 'down'; a.setSt('win', 'victory'); }
    this.thorFan?.set('celebrate', true);
    this.sfx('ladrido', 0.5);
    this.time.delayedCall(400, () => {
      const t = this.uiAdd(txt(this, 320, 120, '¡GANASTE, CAMPEÓN!', 'fuente_titulo', 2).setDepth(8500));
      this.tweens.add({ targets: t, scale: { from: 4, to: 2 }, duration: 260, ease: 'Back.out' });
      if (this.data0.gira) { this.cierraGira(0); return; }
      this.endMenu(['OTRA VEZ', 'MENÚ']);
    });
  }

  private defeat() {
    this.phase = 'end';
    this.callarTema();
    chip.stop(0.6);
    chip.blip(330, 0.5, 'tri', 0.25, 110);
    for (const a of this.actors) if (a.team === 1 && a.alive) { a.fig.row = 'down'; a.setSt('win', 'victory'); }
    const t = this.uiAdd(txt(this, 320, 110, 'SE ACABÓ LA VAINA', 'fuente_titulo_plata', 2).setDepth(8500));
    this.tweens.add({ targets: t, scale: { from: 4, to: 2 }, duration: 260, ease: 'Back.out' });
    if (this.data0.gira) { this.cierraGira(1); return; }
    let n = 9;
    const c = this.uiAdd(txt(this, 320, 150, '¿OTRA PARTIDITA? 9', 'fuente_ui', 2).setDepth(8500));
    const ev = this.time.addEvent({ delay: 1000, loop: true, callback: () => { n--; c.setText(`¿OTRA PARTIDITA? ${n}`); chip.blip(440, 0.06); if (n <= 0) { ev.remove(); this.toMenu(); } } });
    this.endMenu(['SÍ, DALE', 'MENÚ'], () => ev.remove());
  }

  /**
   * Cierra la prueba en la Olimpiada. La final: 20 puntos al equipo que gane. El judo es una prueba más:
   * 10 al que gana y 6 al otro, como el primero y el segundo.
   */
  private cierraGira(team: 0 | 1) {
    const gira = this.registry.get('gira') as Gira | undefined;
    const equipo = (t: number) => lado(t).corto;
    if (gira) {
      if (this.judo) {
        gira.puntos[team] += PUNTOS[0];
        gira.puntos[1 - team] += PUNTOS[1];
        const orden = [...this.actors].sort((a, b) => Number(b.team === team) - Number(a.team === team));
        gira.resultados.push({ prueba: 'JUDO Y VOVINAM', podio: orden.map((a) => a.id) });
      } else {
        gira.puntos[team] += 20;
        const vivos = this.actors.filter((a) => a.team === team).sort((a, b) => Number(b.alive) - Number(a.alive));
        gira.resultados.push({ prueba: 'KACHINUKI FINAL', podio: vivos.map((a) => a.id) });
      }
      this.registry.set('gira', gira);
    }
    const msg = this.judo ? `+${PUNTOS[0]} ${equipo(team)} · +${PUNTOS[1]} ${equipo(1 - team)}` : `+20 PTS ${equipo(team)}`;
    this.uiAdd(txt(this, 320, 152, msg, 'fuente_ui', 2).setDepth(8500).setTint(0x8ae08a));
    this.endMenu(['SIGUIENTE'], undefined, () => {
      if (gira) { gira.idx++; this.registry.set('gira', gira); }
      chip.stop(0.2);
      this.scene.start('Medallero');
    });
  }

  private endMenu(opts: string[], onPick?: () => void, solo?: (i: number) => void, y = 196) {
    let sel = 0;
    const w = opts.length === 3 ? 196 : 140;
    const items = opts.map((o, i) => this.uiAdd(txt(this, 320 + (i - (opts.length - 1) / 2) * w, y, o, 'fuente_ui', 2).setDepth(8500).setInteractive()));
    const draw = () => items.forEach((t, i) => t.setTint(i === sel ? 0xffe040 : 0x8a8aa8));
    draw();
    const pick = (i: number) => { onPick?.(); if (solo) solo(i); else if (i === 0) this.scene.restart(this.data0); else this.toMenu(); };
    items.forEach((t, i) => t.on('pointerdown', () => pick(i)));
    let lock = 0.4;
    this.endChoice = (p) => {
      lock -= 1 / 60;
      if (lock > 0) return;
      if (p.x !== 0 && p.x !== (this.data.get('lx') ?? 0)) { sel = (sel + p.x + opts.length) % opts.length; draw(); chip.blip(660, 0.04); }
      this.data.set('lx', p.x);
      if (p.pressed.punch || p.pressed.start || p.pressed.kick || p.pressed.jump) pick(sel);
      if (p.pressed.back && !solo) this.toMenu();
      for (const a of this.actors) a.update(1 / 60, NOTHING);
      this.thorFan?.step(1 / 60);
    };
  }

  private toMenu() {
    chip.stop(0.2);
    this.scene.start('Title');
  }

  private togglePause() {
    this.paused = !this.paused;
    for (const o of this.pauseObjs) o.destroy();
    this.pauseObjs = [];
    if (this.paused) {
      chip.music.gain.value = 0.15;
      this.pauseObjs.push(this.uiAdd(this.add.rectangle(320, 180, 800, 360, 0x000000, 0.6).setDepth(9000)));
      this.pauseObjs.push(this.uiAdd(txt(this, 320, 150, '¡ÉPALE, PAUSA!', 'fuente_titulo', 2).setDepth(9001)));
      const seguir = this.uiAdd(txt(this, 270, 196, 'SEGUIR', 'fuente_ui', 2).setDepth(9001).setInteractive());
      const menu = this.uiAdd(txt(this, 370, 196, 'MENÚ', 'fuente_ui', 2).setDepth(9001).setInteractive().setTint(0x8a8aa8));
      seguir.on('pointerdown', () => this.togglePause());
      menu.on('pointerdown', () => this.toMenu());
      this.pauseObjs.push(seguir, menu, this.uiAdd(txt(this, 320, 226, 'START SEGUIR · ESC MENÚ', 'fuente_ui', 1).setDepth(9001).setTint(0x8a8aa8)));
    } else chip.music.gain.value = 0.42;
  }

  // ------------------------------------------------------------------ técnicas

  private cutIn(a: Actor) {
    this.cut = 1.0;
    // el aura Nekketsu detrás de quien lanza la técnica
    const aura = efecto(this, 'aura_nekketsu', this.px(a.x, a.y), FLOOR_TOP + a.y, { depth: FLOOR_TOP + a.y - 0.5, queda: true });
    if (aura) {
      // el aura va con quien hace la técnica (si avanza, no se queda una llama sola atrás)
      this.auras.set(a, aura);
      this.time.delayedCall(1700, () => this.tweens.add({ targets: aura, alpha: 0, duration: 250, onComplete: () => { aura.destroy(); if (this.auras.get(a) === aura) this.auras.delete(a); } }));
    }
    if (a.id === 'alana') this.sfx('thor_rescate', 0.6);
    const side = a.team === 0 ? 1 : -1;
    const dark = this.uiAdd(this.add.rectangle(320, 180, 800, 360, 0x000000, 0.65).setDepth(8600));
    const band = this.uiAdd(this.add.rectangle(320, 150, 800, 110, a.team === 0 ? 0x1a3a9a : 0x9a1a2a, 0.95).setDepth(8601));
    const lines = this.uiAdd(speedLines(this, 8602));
    const por = this.uiAdd(this.add.image(320 - side * 400, 150, `retratos:${a.id}`, 'grande_enojo').setDepth(8603));
    this.tweens.add({ targets: por, x: 320 - side * 160, duration: 220, ease: 'Back.out' });
    const name = this.uiAdd(txt(this, 320 + side * 90, 136, (this.judo && a.tiene('vovinam_scissor') ? '¡TIJERA VOVINAM!' : nombreTecnica(a.id)), 'fuente_titulo', 2).setDepth(8604).setScale(5).setAlpha(0));
    this.tweens.add({ targets: name, scale: 2, alpha: 1, duration: 200, delay: 150 });
    const who = this.uiAdd(txt(this, 320 + side * 90, 172, a.nombre, 'fuente_ui', 2).setDepth(8604).setTint(0xffe080));
    this.cutObjs = [dark, band, lines, por, name, who];
    chip.boom(0.7);
    this.sfx('subir_nivel', 0.5);
    flash(this, 120);
  }

  private endCutIn() {
    for (const o of this.cutObjs) o.destroy();
    this.cutObjs = [];
    const a = this.actors.find((x) => x.st === 'special' && !this.specials.has(x));
    if (!a) return;
    // en el tatami, con la barra llena, la tijera del vovinam (lote B7H8) contra el rival más cerca
    const v = this.judo && a.tiene('vovinam_scissor') ? this.rivalTijera(a) : null;
    if (v) { this.tijera(a, v); return; }
    // la técnica de su equipo (lote B7), si el kit se la trae: `tecnica_<equipo>`, igual que la burla
    const eq = (kit().atletas[a.id] as { equipo?: string } | undefined)?.equipo;
    if (!this.judo && eq && a.tiene(`tecnica_${eq}`)) { this.tecnicaEquipo(a, eq); return; }
    const kind = TECNICA[a.id] ?? 'mach';
    this.specials.set(a, { kind, n: 0, t: 0 });
    a.hitThisAttack.clear();
    if (kind === 'mach') a.play('jab', true, 2.6);
    if (kind === 'huracan') a.play('kick_martial', true, 1.5);
    if (kind === 'chilena') { a.play('run_kick', true); a.vz = 330; a.vx = a.dir * 150; }
    if (kind === 'dragon') { a.play('uppercut', true, 0.9); a.vx = a.dir * 110; }
    if (kind === 'tackle') { a.play('run_punch', true, 0.7); a.vx = a.dir * 260; }
    if (kind === 'thor') {
      a.play('taunt', true);
      const dir = a.dir;
      const x = dir > 0 ? XMIN - 30 : XMAX + 30;
      const f = new Figura(this, this.px(x, a.y), FLOOR_TOP + a.y, 'thor', 'run').setScale(1.4);
      f.left = dir < 0;
      this.thorRun = { f, x, owner: a, hit: new Set(), dir };
      if (this.thorFan) this.thorFan.setVisible(false);
      this.sfx('ladrido', 0.7);
    }
  }

  /**
   * Arranca la técnica de equipo. Cada una tiene su arma y su golpe: el Furrazo y el Batazo de Jonrón pegan en el
   * impacto con el furro o el palo, la Silla Voladora y el Chancletazo lanzan en cada suelta, el Copetazo embiste con
   * la cabeza y la Ciclovía arranca junto con su rival (`bike_charged`), que sale volando.
   */
  private tecnicaEquipo(a: Actor, eq: string) {
    const anim = `tecnica_${eq}`;
    const ARMA: Record<string, string> = { maracuchos_del_lago: 'furro', panas_de_caracas: 'broomstick', rong_sai_gon: 'silla_plastica', familia_gg: 'chancleta' };
    a.hitThisAttack.clear();
    a.play(anim, true);
    const s: { kind: string; n: number; t: number; v?: Actor; arma?: string; sueltas?: number; objetivo?: Actor } = { kind: 'equipo', n: 0, t: 0, arma: ARMA[eq], sueltas: 0 };
    // las que pegan en el sitio (el furro, el palo, el copete) se le acercan al rival mientras preparan el golpe
    if (['maracuchos_del_lago', 'panas_de_caracas', 'instituto_nekketsu'].includes(eq)) {
      const o = this.rivalTijera(a);
      if (o) { s.objetivo = o; a.left = o.x < a.x; }
    }
    // la ciclovía: el rival de pie delante, a media celda del punto del impacto, y arrancan juntos
    if (eq === 'rolos_de_chapinero') {
      const v = this.rivalTijera(a);
      if (v && v.tiene('bike_charged')) {
        v.soltar(); v.vx = v.vy = v.vz = 0; v.z = 0;
        a.left = v.x < a.x;
        const d = a.fig.anim.data, imp = a.fig.cuadroDe('impacto');
        const p = d.eventos?.find((e) => e.tipo === 'impacto')?.punto?.[a.fig.rowIndex] ?? [20, -20];
        const avance = imp >= 0 ? d.desplazamiento?.[imp] ?? 0 : 0;
        v.x = Phaser.Math.Clamp(a.x + a.dir * (avance + p[0] + a.fig.celda / 2), XMIN, XMAX);
        v.y = a.y;
        v.left = !a.left;
        v.dropAll();
        v.setSt('frozen', 'bike_charged');
        s.v = v;
      }
    }
    this.specials.set(a, s);
  }

  /** Lo que vuela en cada suelta de la técnica (la silla, cada chancleta), desde su punto. */
  private lanzarDeTecnica(a: Actor, kind: string, punto: [number, number] | undefined, fuerte: boolean) {
    const [px, py] = punto ?? [10, -24];
    const it = new Item(this, kind, a.x + (a.fig.espejo ? -px : px), a.y, Math.max(8, -py));
    it.fuerte = fuerte;
    it.launch(a, it.x, a.y, it.z, a.dir * (kind === 'silla_plastica' ? 260 : 320), kind === 'silla_plastica' ? 90 : 60);
    this.items.push(it);
    this.sfx('esquiva', 0.5);
    // lo lanzado por la técnica no se queda tirado en la azotea
    this.time.delayedCall(2600, () => { if (it.st === 'floor' || it.st === 'falling') { it.x = -9999; it.st = 'floor'; } });
  }

  /** La técnica de equipo cuadro a cuadro. */
  private tecnicaTick(a: Actor, s: { kind: string; n: number; t: number; v?: Actor; arma?: string; sueltas?: number; objetivo?: Actor }, dt: number, done: () => void) {
    const eq = a.fig.anim.name.replace('tecnica_', '');
    const before = a.fig.anim.frame;
    const ev = a.fig.step(dt);
    const now = a.fig.anim.frame;
    // avanza lo que dice su desplazamiento (la bici, el copetazo)
    const d = a.fig.anim.data.desplazamiento ?? [];
    if (now !== before) a.x = Phaser.Math.Clamp(a.x + a.dir * ((d[now] ?? 0) - (d[before] ?? 0)), XMIN, XMAX);
    // el arma en la mano, con el dato `arma` de cada cuadro (espejada en los cuadros girados de la silla)
    const w = s.arma ? a.fig.arma() : null;
    if (w && s.arma) {
      if (!this.tecArma || !this.tecArma.active) this.tecArma = this.add.image(0, 0, 'armas', `${s.arma}_mano_0`).setOrigin(0.5, 0.5);
      this.tecArma.setVisible(true).setFrame(`${s.arma}_mano_${w.k}`).setFlipX(a.fig.espejo).setPosition(Math.round(w.x), Math.round(w.y)).setDepth(a.fig.depth + (w.detras ? -0.2 : 0.2));
    } else this.tecArma?.setVisible(false);
    const v = s.v;
    if (v && v.fig.anim.name === 'bike_charged') { v.fig.anim.pos = a.fig.anim.pos; v.fig.refresh(); }
    const imp = a.fig.cuadroDe('impacto');
    // antes del impacto, se acerca lo justo para que el golpe le llegue (el punto del impacto, más lo que le falta avanzar)
    const o = s.objetivo;
    if (o && imp >= 0 && now < imp && o.alive) {
      const p = a.fig.anim.data.eventos?.find((e) => e.tipo === 'impacto')?.punto?.[a.fig.rowIndex] ?? [20, -20];
      const falta = (d[imp] ?? 0) - (d[now] ?? 0);
      const quiero = o.x - a.dir * (p[0] + falta + 4);
      const paso = 260 * dt;
      a.x = Phaser.Math.Clamp(a.x + Phaser.Math.Clamp(quiero - a.x, -paso, paso), XMIN, XMAX);
      a.y += Phaser.Math.Clamp(o.y - a.y, -paso * 0.6, paso * 0.6);
    }
    // la ciclovía: después del impacto el rival sale volando hacia atrás hasta que cae
    if (v && imp >= 0 && now >= imp && now < 7) v.x = Phaser.Math.Clamp(v.x + a.dir * 170 * dt, XMIN, XMAX);
    for (const e of ev) {
      if (e.tipo === 'suelta' && s.arma) {
        s.sueltas = (s.sueltas ?? 0) + 1;
        // la silla y la última chancleta tumban
        this.lanzarDeTecnica(a, s.arma, e.punto?.[a.fig.rowIndex], s.arma === 'silla_plastica' || s.sueltas >= 3);
        if (s.sueltas >= 3 || s.arma === 'silla_plastica') this.tecArma?.setVisible(false);
      }
      if (e.tipo !== 'impacto') continue;
      a.hitThisAttack.clear();
      const punto = e.punto;
      if (eq === 'maracuchos_del_lago') {
        // el Furrazo: el retumbo tumba a todos los de cerca
        efecto(this, 'onda_furro', this.px(a.x, a.y), FLOOR_TOP + a.y, { depth: FLOOR_TOP + a.y + 0.3 });
        this.sfx('jefe_pisoton', 0.8);
        this.shake(320, 0.016);
        for (const o of this.actors) if (o.team !== a.team && o.canBeHit() && Math.abs(o.x - a.x) < 80 && Math.abs(o.y - a.y) < 26) o.takeHit(a, { dmg: 16, kd: true, push: 160, launch: 190 }, o.x >= a.x ? 1 : -1);
      } else if (eq === 'panas_de_caracas') {
        // el Batazo de Jonrón: lo manda a volar
        a.resolveHit(punto, { dmg: 18, kd: true, push: 230, launch: 330 }, 18);
        this.sfx('critico', 0.7);
        chip.blip(660, 0.25, 'sq25', 0.2, 1760);
        this.shake(260, 0.014);
        void this.banner('¡JONRÓN!', 'fuente_titulo', 2, 700);
      } else if (eq === 'instituto_nekketsu') {
        // el Copetazo: el cabezazo
        a.resolveHit(punto, { dmg: 16, kd: true, push: 210, launch: 160 }, 16);
        this.shake(200, 0.012);
      } else if (eq === 'rolos_de_chapinero') {
        if (v) {
          const dmg = 18;
          v.hp = Math.max(1, v.hp - dmg);
          this.number(v.x, v.y, dmg);
          this.spark(v.x - a.dir * 4, v.y, 22, true);
          this.onHit(a, v, dmg, true);
        } else a.resolveHit(punto, { dmg: 18, kd: true, push: 220, launch: 160 }, 18);
        this.shake(240, 0.014);
      }
    }
    if (v && ev.some((e) => e.tipo === 'aterriza')) this.dust(v.x, v.y);
    if (a.fig.anim.done) {
      this.tecArma?.setVisible(false);
      // el de la ciclovía queda en el piso, sin el rebote de la calle
      if (v && v.st === 'frozen') { v.knockdown(a.dir, 20, 0); v.bounces = 1; }
      done();
    }
  }

  /** El rival de la tijera: el más cerca, de pie. */
  private rivalTijera(a: Actor): Actor | null {
    const r = this.actors.filter((o) => o.team !== a.team && o.alive && o.st !== 'ko' && o.st !== 'down');
    return r.sort((x, y) => Math.abs(x.x - a.x) - Math.abs(y.x - a.x))[0] ?? null;
  }

  /**
   * La tijera del vovinam: los dos arrancan juntos, el que la tira con `vovinam_scissor` y el rival, de pie, con
   * `vovinam_scissored`, a media celda delante del punto del impacto (ahí le cierran las piernas al cuello).
   */
  private tijera(a: Actor, v: Actor) {
    for (const o of [a, v]) { o.soltar(); o.vx = o.vy = o.vz = 0; o.z = 0; }
    a.left = v.x < a.x;
    a.play('vovinam_scissor', true);
    const d = a.fig.anim.data;
    const imp = a.fig.cuadroDe('impacto');
    const p = d.eventos?.find((e) => e.tipo === 'impacto')?.punto?.[a.fig.rowIndex] ?? [20, -20];
    const avance = imp >= 0 ? d.desplazamiento?.[imp] ?? 0 : 0;
    v.x = Phaser.Math.Clamp(a.x + a.dir * (avance + p[0] + a.fig.celda / 2), XMIN, XMAX);
    v.y = a.y;
    v.left = !a.left;
    v.dropAll();
    v.setSt('frozen', v.tiene('vovinam_scissored') ? 'vovinam_scissored' : 'fight_hit');
    a.hitThisAttack.clear();
    this.specials.set(a, { kind: 'tijera', n: 0, t: 0, v });
  }

  private specialTick(a: Actor, dt: number) {
    const s = this.specials.get(a)!;
    const au = this.auras.get(a);
    if (au?.active) au.setPosition(Math.round(this.px(a.x, a.y)), FLOOR_TOP + a.y).setDepth(FLOOR_TOP + a.y - 0.5);
    s.t += dt;
    const done = () => { this.specials.delete(a); a.vx = 0; a.vz = 0; a.z = 0; a.setSt('idle', 'idle'); a.invul = 0.4; };
    const hit = (def: AttackDef, radius = 8) => a.resolveHit(a.fig.anim.data.eventos?.find((e) => e.tipo === 'impacto')?.punto, def, radius);
    if (s.kind === 'equipo') {
      this.tecnicaTick(a, s, dt, done);
    } else if (s.kind === 'tijera' && s.v) {
      const v = s.v;
      const before = a.fig.anim.frame;
      const ev = a.fig.step(dt);
      const now = a.fig.anim.frame;
      // avanza lo que dice su desplazamiento; el rival va en el mismo cuadro, sin moverse de donde lo atrapó
      const d = a.fig.anim.data.desplazamiento ?? [];
      if (now !== before) a.x = Phaser.Math.Clamp(a.x + a.dir * ((d[now] ?? 0) - (d[before] ?? 0)), XMIN, XMAX);
      if (v.fig.anim.name === 'vovinam_scissored') { v.fig.anim.pos = a.fig.anim.pos; v.fig.refresh(); }
      if (ev.some((e) => e.tipo === 'impacto')) {
        const dmg = 14;
        v.hp = Math.max(1, v.hp - dmg);
        this.number(v.x, v.y, dmg);
        this.spark(v.x - a.dir * 4, v.y, 26, true);
        this.shake(220, 0.012);
        this.onHit(a, v, dmg, true);
      }
      // al caer al tatami, la palmada del ukemi
      if (ev.some((e) => e.tipo === 'aterriza')) { this.suena('caida_tatami', 0.8); this.dust(v.x, v.y); }
      if (a.fig.anim.done) {
        // el rival queda en el piso, sin el rebote de la caída de la calle; quien la tiró sigue en guardia
        if (v.st === 'frozen') { v.knockdown(a.dir, 4, 0); v.bounces = 1; }
        done();
      }
    } else if (s.kind === 'mach') {
      a.x += a.dir * 30 * dt;
      const ev = a.fig.step(dt);
      if (ev.some((e) => e.tipo === 'impacto')) { a.hitThisAttack.clear(); hit(s.n < 7 ? { dmg: 3, push: 18 } : { dmg: 12, kd: true, push: 170, launch: 200 }, 10); }
      if (a.fig.anim.done) { s.n++; if (s.n >= 8) done(); else a.play(s.n === 7 ? 'punch' : 'jab', true, s.n === 7 ? 1.4 : 2.6); }
    } else if (s.kind === 'huracan') {
      const ev = a.fig.step(dt);
      if (ev.some((e) => e.tipo === 'impacto')) { a.hitThisAttack.clear(); hit({ dmg: 9, kd: true, push: 150 }, 16); }
      if (a.fig.anim.done) { s.n++; a.left = !a.left; if (s.n >= 3) done(); else a.play('kick_martial', true, 1.5); }
    } else if (s.kind === 'chilena') {
      a.x += a.vx * dt; a.vz -= 900 * dt; a.z = Math.max(0, a.z + a.vz * dt);
      if (a.vz < 80 && a.fig.anim.name !== 'air_kick') a.play('air_kick', true);
      a.fig.step(dt);
      if (a.fig.anim.name === 'air_kick') hit({ dmg: 18, kd: true, push: 180, launch: 240 }, 14);
      if (a.z <= 0 && s.t > 0.2) { this.dust(a.x, a.y); this.shake(150, 0.01); done(); }
    } else if (s.kind === 'dragon') {
      a.x += a.vx * dt; a.vx *= Math.pow(0.05, dt);
      const ev = a.fig.step(dt);
      if (ev.some((e) => e.tipo === 'impacto')) { hit({ dmg: 20, kd: true, push: 90, launch: 340 }, 14); this.shake(200, 0.015); }
      if (a.fig.anim.done) done();
    } else if (s.kind === 'tackle') {
      a.x += a.vx * dt;
      a.fig.step(dt);
      hit({ dmg: 14, kd: true, push: 200, launch: 160 }, 14);
      if (s.t > 0.75 || a.x <= XMIN || a.x >= XMAX) done();
    } else if (s.kind === 'thor') {
      a.fig.step(dt);
      if (!this.thorRun) { a.play('celebrate'); if (s.t > 0.3) done(); }
    }
  }

  private thorTick(dt: number) {
    const r = this.thorRun;
    if (!r) return;
    r.x += r.dir * 300 * dt;
    r.f.x = this.px(r.x, r.owner.y);
    r.f.y = FLOOR_TOP + r.owner.y;
    r.f.setDepth(FLOOR_TOP + r.owner.y + 0.3);
    r.f.step(dt, 300 * dt);
    for (const v of this.actors) {
      if (v.team === r.owner.team || r.hit.has(v) || !v.canBeHit()) continue;
      if (Math.abs(v.y - r.owner.y) > 16 || Math.abs(v.x - r.x) > 22) continue;
      r.hit.add(v);
      v.takeHit(r.owner, { dmg: 15, kd: true, push: 200, launch: 220 }, r.dir);
      this.spark(v.x, v.y, 18, true);
      this.sfx('ladrido', 0.5);
      this.hitstop(0.07);
    }
    if (r.x < XMIN - 60 || r.x > XMAX + 60) {
      r.f.destroy();
      this.thorRun = null;
      if (this.thorFan) this.thorFan.setVisible(true);
    }
  }

  // ------------------------------------------------------------------ escenario

  /** Una arepa que cae cada tanto: quien la pise se la come y recupera vida. */
  private arepaTick(dt: number) {
    if (this.data0.practica) return;
    this.arepaT -= dt;
    if (this.arepaT <= 0 && this.arepas.length === 0) {
      this.arepaT = 22 + Math.random() * 12;
      const x = Phaser.Math.Between(XMIN + 50, Math.min(XMAX, this.borde) - 70), y = Phaser.Math.Between(12, DEPTH - 12);
      const g = this.add.graphics().setPosition(this.px(x, y), FLOOR_TOP + y).setDepth(FLOOR_TOP + y - 0.5);
      // la arepa rellena: la masa dorada, el relleno asomado y las marcas del budare
      g.fillStyle(0x000000, 0.3).fillEllipse(0, 1, 18, 5);
      g.fillStyle(0xc8903a).fillEllipse(0, -3, 16, 9);
      g.fillStyle(0xf0d090).fillEllipse(0, -4, 14, 7);
      g.fillStyle(0x8a5a2a).fillRect(-4, -6, 2, 1).fillRect(2, -3, 2, 1).fillRect(-1, -5, 1, 1);
      g.fillStyle(0xf4f4e8).fillRect(-6, -3, 12, 1);
      g.fillStyle(0x2a1a14).fillRect(-5, -2, 10, 1);
      g.fillStyle(0xffffff, 0.6).fillRect(-2, -12, 1, 3).fillRect(2, -14, 1, 3);
      g.setScale(0).setY(FLOOR_TOP + y - 60);
      this.tweens.add({ targets: g, scale: 1.5, y: FLOOR_TOP + y, duration: 420, ease: 'Bounce.out' });
      this.arepas.push({ x, y, g, t: 14 });
      const t = txt(this, this.px(x, y), FLOOR_TOP + y - 26, '¡UNA AREPA!', 'fuente_ui', 1).setDepth(6000).setTint(0xffd080);
      this.tweens.add({ targets: t, y: t.y - 10, alpha: 0, delay: 900, duration: 500, onComplete: () => t.destroy() });
      chip.blip(988, 0.1, 'sq25', 0.12, 1318);
    }
    for (const ar of this.arepas) {
      ar.t -= dt;
      if (ar.t < 3) ar.g.setAlpha(Math.floor(ar.t * 6) % 2 ? 0.4 : 1);
      const quien = this.actors.find((a) => a.alive && a.grounded && ['idle', 'walk', 'run'].includes(a.st) && Math.abs(a.x - ar.x) < 13 && Math.abs(a.y - ar.y) < 8);
      if (quien) {
        ar.t = 0;
        const cura = Math.min(quien.maxHp - quien.hp, Math.round(quien.maxHp * 0.25));
        quien.hp += cura;
        this.sfx('recoger', 0.5);
        chip.blip(784, 0.08, 'sq25', 0.14, 1568);
        this.aviso(quien, `¡ÑAM! +${cura}`, 0x8ae08a);
      }
    }
    this.arepas = this.arepas.filter((ar) => { if (ar.t <= 0) { ar.g.destroy(); return false; } return true; });
  }

  /** Judo y Vovinam: el reloj baja; al terminar gana el que tiene más puntos, y si van iguales, punto de oro. */
  private relojDeJudo(dt: number) {
    for (const a of this.actors) a.hp = Math.max(a.hp, a.maxHp * 0.4);
    if (this.oro) { this.relojTxt?.setText('ORO'); return; }
    this.relojJudo = Math.max(0, this.relojJudo - dt);
    const r = Math.ceil(this.relojJudo);
    this.relojTxt?.setText(`${Math.floor(r / 60)}:${String(r % 60).padStart(2, '0')}`).setTint(r <= 10 && Math.floor(this.relojJudo * 3) % 2 ? 0xff6060 : 0xffffff);
    if (this.relojJudo > 0) return;
    if (this.puntos[0] !== this.puntos[1]) { void this.finJudo(this.puntos[0] > this.puntos[1] ? 0 : 1); return; }
    this.oro = true;
    void this.banner('¡PUNTO DE ORO!', 'fuente_titulo', 2, 1100);
  }

  /** Un punto en el judo: ¡IPPON! si fue lanzándolo desde el agarre, ¡WAZA-ARI! si lo tumbó de un golpe. Después, a empezar de nuevo. */
  private puntoJudo(from: Actor, ippon: boolean, sinCaida = false) {
    const tm = from.team;
    this.puntos[tm] += ippon ? 2 : 1;
    this.phase = 'intro';
    this.shake(ippon ? 300 : 150, ippon ? 0.012 : 0.006);
    if (ippon) flash(this, 160);
    chip.boom(ippon ? 0.9 : 0.5);
    if (!sinCaida) this.suena('caida_tatami', ippon ? 0.8 : 0.5);
    void this.banner(ippon ? '¡IPPON!' : '¡WAZA-ARI!', 'fuente_titulo', ippon ? 3 : 2, 1000);
    const fin = this.puntos[tm] >= 3 || this.oro;
    this.time.delayedCall(1700, () => {
      if (fin) { void this.finJudo(tm); return; }
      // ¡Hajime! de nuevo: cada uno a su lado, de pie
      for (const a of this.actors) {
        a.soltar();
        a.x = a.team === 0 ? 220 : 420; a.y = 50; a.z = 0; a.vx = a.vy = a.vz = 0;
        a.hp = a.maxHp;
        a.left = a.team === 1;
        a.tecnica = null;
        a.setSt('idle', 'idle');
      }
      void this.rei().then(() => this.banner('¡HAJIME!', 'fuente_titulo_plata', 2, 600)).then(() => { this.phase = 'play'; });
    });
  }

  private async finJudo(tm: 0 | 1) {
    this.phase = 'intro';
    this.suena('pitazo_largo', 0.5);
    // el rei del final, de frente al rival
    for (const a of this.actors) if (a.alive) { a.soltar(); a.left = a.team === 1; a.setSt('idle', 'idle'); }
    await this.rei();
    this.phase = 'play';
    if (tm === 0) this.victory(); else this.defeat();
  }

  /** El rei (lote B4B6 bis): los dos se saludan de frente antes de seguir. Si el kit no lo trae, no espera. */
  private async rei() {
    const conRei = this.actors.filter((a) => a.alive && a.tiene('bow'));
    if (!conRei.length) return;
    for (const a of conRei) { a.left = a.team === 1; a.setSt('rei', 'bow'); }
    await new Promise<void>((r) => this.time.delayedCall(900, r));
    for (const a of conRei) if (a.st === 'rei') a.setSt('idle', 'idle');
  }

  /** Las reglas de la final: el reloj, lo pesado que cae cada 30 s y la azotea que se achica a los 90 s. */
  private kachinuki(dt: number) {
    this.reloj += dt;
    const m = Math.floor(this.reloj / 60), sg = Math.floor(this.reloj % 60);
    this.relojTxt?.setText(`${m}:${String(sg).padStart(2, '0')}`).setTint(this.reloj > ACHICA - 10 && !this.achicando && Math.floor(this.reloj * 3) % 2 ? 0xff6060 : 0xffffff);
    this.grandeT -= dt;
    if (this.grandeT <= 0 && !this.pesado) { this.grandeT = CADA_GRANDE; this.caePesado(); }
    if (this.pesado) this.tickPesado();
    if (!this.achicando && this.reloj >= ACHICA) {
      this.achicando = true;
      void this.banner('¡LA AZOTEA SE ACHICA!', 'fuente_titulo', 2, 1200);
      this.shake(600, 0.006);
      chip.blip(110, 1.2, 'saw', 0.18, 55);
    }
    if (this.achicando && this.borde > BORDE_MIN) {
      this.borde = Math.max(BORDE_MIN, this.borde - 5 * dt);
      this.derrumbe -= dt;
      if (this.derrumbe <= 0) {
        this.derrumbe = 0.35;
        const yy = Math.random() * DEPTH;
        efecto(this, 'polvo_caer_grande', this.px(this.borde + 4, yy), FLOOR_TOP + yy, { depth: FLOOR_TOP + DEPTH });
        if (Math.random() < 0.4) this.sfx('romper', 0.15);
      }
      this.dibujarBorde();
      // quien quedó del otro lado del borde, se va con el pedazo que se cae
      for (const a of this.actors) if (a.alive && !this.caidos.has(a) && a.st !== 'lifted' && a.x > this.borde + 6) { a.z = -61; this.caida(a); }
    }
  }

  /** Algo pesado que cae del cielo: primero la sombra que crece y titila, después el golpe. */
  private caePesado() {
    const objetivo = Math.random() < 0.6 ? this.player : this.actors.filter((a) => a.alive)[Math.floor(Math.random() * this.actors.length)] ?? this.player;
    const x = Phaser.Math.Clamp(objetivo.x + Phaser.Math.Between(-30, 30), XMIN + 30, this.borde - 30);
    const y = Phaser.Math.Clamp(objetivo.y + Phaser.Math.Between(-10, 10), 8, DEPTH - 8);
    // la sombra crece y un aro rojo titila: ahí va a caer
    const sombra = this.add.ellipse(this.px(x, y), FLOOR_TOP + y, 12, 5, 0x000000, 0.55).setDepth(FLOOR_TOP + y - 1);
    const aro = this.add.ellipse(this.px(x, y), FLOOR_TOP + y, 44, 16).setStrokeStyle(2, 0xff4040).setDepth(FLOOR_TOP + y - 0.9);
    sombra.once('destroy', () => aro.destroy());
    this.tweens.add({ targets: sombra, scaleX: 3.6, scaleY: 3.6, duration: 1500 });
    this.tweens.add({ targets: aro, alpha: 0.15, duration: 130, yoyo: true, repeat: -1 });
    chip.blip(1760, 1.4, 'sq25', 0.1, 440);
    const aviso = this.uiAdd(txt(this, 320, 70, '¡CUIDADO ARRIBA!', 'fuente_ui', 2).setDepth(8100).setTint(0xff6060));
    this.tweens.add({ targets: aviso, alpha: 0.2, duration: 160, yoyo: true, repeat: 4, onComplete: () => aviso.destroy() });
    this.time.delayedCall(800, () => {
      if (this.phase !== 'play') { sombra.destroy(); return; }
      const it = new Item(this, PESADOS[Math.floor(Math.random() * PESADOS.length)], x, y, 420);
      it.vz = -120;
      this.items.push(it);
      this.pesado = { it, sombra };
    });
  }

  /** Cuando lo pesado toca el piso: tumba a quien esté debajo, del equipo que sea. */
  private tickPesado() {
    const p = this.pesado!;
    if (p.it.z > 6) return;
    this.pesado = null;
    p.sombra.destroy();
    this.shake(260, 0.016);
    this.sfx('jefe_pisoton', 0.6);
    efecto(this, 'polvo_caer_grande', this.px(p.it.x, p.it.y), FLOOR_TOP + p.it.y, { depth: FLOOR_TOP + p.it.y + 1 });
    for (const a of this.actors) {
      if (!a.alive || !a.canBeHit() || Math.abs(a.x - p.it.x) > 24 || Math.abs(a.y - p.it.y) > 12) continue;
      a.takeHit(null, { dmg: 14, kd: true, push: 90, launch: 180 }, a.x < p.it.x ? -1 : 1);
      this.spark(a.x, a.y, 30, true);
    }
  }

  /**
   * El borde que avanza con el arte de PixelForja: la ciudad allá abajo (borde_vacio, repetido) desde el canto nuevo
   * hacia la derecha, inclinado como el piso, y el filo que se desmorona encima (6 cuadros, se queda en el último).
   * Las antenas que quedan del otro lado se van con el pedazo.
   */
  private bordeArte() {
    const B = this.arte?.borde;
    if (!B || this.data0.practica || this.borde >= BORDE - 0.5) return;
    const k = this.inclinacion, abajo = 360 - FLOOR_TOP;
    if (!this.vacio) {
      const mascara = this.make.graphics({}, false);
      const img = this.add.tileSprite(0, FLOOR_TOP, (this.arte?.ancho ?? 640) + 40, abajo, B.tex.vacio).setOrigin(0).setDepth(FLOOR_TOP - 0.5);
      img.setMask(mascara.createGeometryMask());
      this.vacio = { img, mascara };
      this.filo = this.add.sprite(0, FLOOR_TOP, B.tex.filo, 0).setOrigin(0).setDepth(FLOOR_TOP - 0.3);
      if (!this.anims.exists('borde_filo')) this.anims.create({ key: 'borde_filo', frames: this.anims.generateFrameNumbers(B.tex.filo, { start: 0, end: B.filo.cuadros - 1 }), frameRate: B.filo.fps, repeat: 0 });
    }
    const b = this.borde;
    // el vacío: del canto inclinado (lo de atrás queda a la izquierda) hasta el final de lo pintado
    const m = this.vacio.mascara.clear().fillStyle(0xffffff);
    m.fillPoints([{ x: b, y: FLOOR_TOP }, { x: 2000, y: FLOOR_TOP }, { x: 2000, y: 360 }, { x: b + k * abajo, y: 360 }], true);
    // el filo cae cada vez que el canto avanza un trozo, y se queda roto en su último cuadro
    const f = this.filo!;
    const x = Math.round(b - B.filo.ancla[0]);
    if (Math.abs(f.x - x) >= 6 || !f.anims.isPlaying) {
      if (Math.abs(f.x - x) >= 6) { f.setX(x); f.play('borde_filo'); }
    }
    for (const { o, img } of this.arte?.objetos ?? []) {
      // la antena sigue parada mientras su pie (al fondo de la franja) quede de este lado del canto
      if (img.getData('cae') || o.x + img.width / 2 - k * 2 < b) continue;
      img.setData('cae', true);
      this.tweens.add({ targets: img, y: img.y + 260, angle: 25, alpha: 0, duration: 1100, ease: 'Quad.in' });
      this.sfx('romper', 0.3);
    }
  }

  /** El vacío después del borde, con la franja de peligro y el letrero. */
  private dibujarBorde() {
    this.bordeArte();
    const g = this.bordeG;
    if (!g) return;
    const b = Math.round(this.borde);
    g.clear();
    g.fillStyle(0x07070f).fillRect(b, FLOOR_TOP - 6, 640 - b + 40, 360 - FLOOR_TOP + 6);
    // las luces de la ciudad allá abajo
    for (let i = 0; i < 40; i++) {
      const x = b + 6 + ((i * 53) % Math.max(10, 640 - b)), y = FLOOR_TOP + 20 + ((i * 37) % 90);
      if (x < 640) g.fillStyle(i % 3 ? 0xf2c230 : 0x6ad0ff, 0.6).fillRect(x, y, 2, 2);
    }
    // el filo con rayas amarillas y negras
    for (let y = FLOOR_TOP - 6; y < FLOOR_TOP + DEPTH + 10; y += 6) g.fillStyle(Math.floor(y / 6) % 2 ? 0xf2c230 : 0x101010).fillRect(b - 3, y, 3, 6);
    g.fillStyle(0x5a5a68).fillRect(b - 6, FLOOR_TOP + DEPTH + 4, 6, 40);
  }

  private skyDrop() {
    if (this.items.filter((i) => i.st === 'floor').length >= 5) return;
    const kind = ARMAS_PISO[Math.floor(Math.random() * ARMAS_PISO.length)];
    const it = new Item(this, kind, XMIN + 40 + Math.random() * (Math.min(XMAX, this.borde) - XMIN - 80), 8 + Math.random() * (DEPTH - 16), 300);
    it.vz = -60;
    this.items.push(it);
    chip.blip(1400, 0.5, 'sq12', 0.06, 300);
  }

  private neon(s: string, x: number, y: number, color: number) {
    const t = txt(this, x, y, s, 'fuente_ui', 1).setTint(color).setDepth(-8);
    const glow = txt(this, x, y, s, 'fuente_ui', 1).setTint(color).setDepth(-8).setAlpha(0.35).setScale(1.15);
    this.time.addEvent({ delay: 120, loop: true, callback: () => { const on = Math.random() > 0.06; t.setAlpha(on ? 1 : 0.3); glow.setAlpha(on ? 0.35 : 0); } });
  }

  // ------------------------------------------------------------------ marcador

  private buildHud() {
    if (this.limites || this.judo) {
      if (MarcadorTV.disponible(this)) {
        // el reloj en números de marcador de TV, sobre su placa
        const tv = new MarcadorTV(this, 320, 16).setText('0:00');
        this.uiAdd(tv.c.setDepth(8001));
        this.hudObjs.push(tv.c);
        this.relojTxt = tv;
      } else {
        const t = this.uiAdd(txt(this, 320, 12, '0:00', 'fuente_ui', 2).setDepth(8001));
        this.hudObjs.push(t);
        this.relojTxt = t;
      }
    } else this.relojTxt = null;
    this.hudKit = [];
    const teams = [0, 1].map((tm) => this.actors.filter((a) => a.team === tm));
    teams.forEach((list, tm) => {
      const right = tm === 1;
      if (list.length === 1) {
        const a = list[0];
        const panel = `panel_${lado(tm).id}`;
        if (hayUi(this, 'barra_marco') && hayUi(this, 'marco_retrato_40') && hayUi(this, panel)) {
          this.hudKit.push(this.hudConKit(a, right, panel));
          return;
        }
        const x = right ? 640 - 24 : 24;
        this.hudObjs.push(this.uiAdd(this.add.image(x, 26, `retratos:${a.id}`, right ? 'chico_enojo' : 'chico_feliz').setDepth(8001).setFlipX(right)));
        this.hudObjs.push(this.uiAdd(txt(this, right ? 640 - 50 : 50, 10, a.nombre, 'fuente_ui', 1, right ? 1 : 0).setDepth(8001)));
      } else {
        list.forEach((a, i) => {
          const x = right ? 640 - 10 - (i % 2) * 150 : 10 + (i % 2) * 150, y = 8 + Math.floor(i / 2) * 18;
          this.hudObjs.push(this.uiAdd(this.add.image(x + (right ? -6 : 6), y + 4, 'cabecitas', a.id).setDepth(8001)));
          this.hudObjs.push(this.uiAdd(txt(this, right ? x - 16 : x + 16, y, a.nombre.split(' ')[0], 'fuente_ui', 1, right ? 1 : 0).setDepth(8001).setTint(a.human ? 0xffe040 : 0xffffff)));
        });
      }
    });
  }

  /**
   * El lado de un luchador con las piezas del kit: el panel en los colores de su equipo, el retrato en su marco
   * dorado, el nombre, y las barras de aguante y Nekketsu en su marco. Las de la derecha van en espejo.
   */
  private hudConKit(a: Actor, right: boolean, panel: string) {
    // con controles táctiles, los paneles un poco hacia adentro: en la esquina de arriba va la pausa (en la tablet la
    // pausa tapaba el retrato del rival)
    const off = this.pad.hasTouch ? 26 : 0;
    const X = (x: number) => (right ? 640 - x - off : x + off);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { this.hudObjs.push(this.uiAdd(o)); return o; };
    const [l, t, r, b] = pieza(panel)?.nueve ?? [8, 8, 8, 8];
    add(this.add.nineslice(X(105), 27, `ui_${panel}`, undefined, 208, 52, l, r, t, b).setAlpha(0.92).setDepth(8000));
    add(this.add.image(X(26), 27, `retratos:${a.id}`, right ? 'chico_enojo' : 'chico_feliz').setDepth(8001).setFlipX(right));
    add(this.add.image(X(26), 27, 'ui_marco_retrato_40').setDepth(8001));
    add(txt(this, X(54), 9, a.nombre, 'fuente_ui', 1, right ? 1 : 0).setDepth(8001));
    const [ml, mr] = pieza('barra_marco')?.tres ?? [4, 4];
    const marco = (x: number, y: number, w: number) => add(this.add.nineslice(X(x + w / 2), y + 5, 'ui_barra_marco', undefined, w, 10, ml, mr, 0, 0).setDepth(8001));
    const relleno = (key: string, y: number) => add(this.add.image(X(54), y, key).setOrigin(right ? 1 : 0, 0).setDepth(8002));
    let vida: Phaser.GameObjects.Image | null = null;
    if (!this.judo) { marco(52, 17, 152); vida = relleno('ui_barra_aguante', 19); }
    const yN = 31;
    marco(52, yN, 102);
    const nek = relleno('ui_barra_nekketsu', yN + 2);
    const llena = add(this.add.tileSprite(X(54), yN + 2, 98, 6, 'ui_barra_nekketsu_llena', 0).setOrigin(right ? 1 : 0, 0).setDepth(8002).setVisible(false));
    return { a, right, vida, nek, llena };
  }

  private drawHud() {
    const g = this.hud;
    g.clear();
    // las barras del kit: el relleno se estira al valor; el aguante se pone amarillo y rojo al bajar
    for (const h of this.hudKit) {
      const v = Phaser.Math.Clamp(h.a.hp / h.a.maxHp, 0, 1);
      if (h.vida) {
        h.vida.setDisplaySize(Math.max(0.01, 148 * v), 6).setVisible(v > 0);
        if (v > 0.5) h.vida.clearTint(); else h.vida.setTint(v > 0.25 ? 0xffe040 : 0xff5040);
      }
      const n = Phaser.Math.Clamp(h.a.meter / 100, 0, 1);
      h.nek.setDisplaySize(Math.max(0.01, 98 * n), 6).setVisible(n > 0 && n < 1);
      h.llena.setVisible(n >= 1);
      if (n >= 1) h.llena.setFrame(Math.floor(this.time.now / 83) % 4);
    }
    const bar = (x: number, y: number, w: number, h: number, v: number, col: number, right: boolean) => {
      g.fillStyle(0x000000, 0.75).fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle(0x3a2a3a).fillRect(x, y, w, h);
      const ww = Math.round(w * Phaser.Math.Clamp(v, 0, 1));
      g.fillStyle(col).fillRect(right ? x + w - ww : x, y, ww, h);
      g.fillStyle(0xffffff, 0.3).fillRect(right ? x + w - ww : x, y, ww, 1);
    };
    const hpCol = (v: number) => (v > 0.5 ? 0x40e070 : v > 0.25 ? 0xf0d040 : 0xf04040);
    const teams = [0, 1].map((tm) => this.actors.filter((a) => a.team === tm));
    teams.forEach((list, tm) => {
      const right = tm === 1;
      if (list.length === 1) {
        const a = list[0];
        const x = right ? 640 - 50 - 150 : 50;
        const conKit = this.hudKit.some((h) => h.a === a);
        if (this.judo) {
          // en el judo no hay vida que bajar: tres puntos por lado, el que llega a 3 gana
          for (let k = 0; k < 3; k++) {
            const cx = right ? 640 - 58 - k * 16 : 58 + k * 16;
            g.fillStyle(0x000000, 0.7).fillCircle(cx, 22, 6);
            g.fillStyle(k < this.puntos[tm] ? 0xf2c230 : 0x3a2a3a).fillCircle(cx, 22, 5);
          }
        } else if (!conKit) bar(x, 18, 150, 6, a.hp / a.maxHp, hpCol(a.hp / a.maxHp), right);
        if (conKit) return;
        const full = a.meter >= 100;
        bar(x + (right ? 50 : 0), 28, 100, 3, a.meter / 100, full ? (Math.floor(this.time.now / 120) % 2 ? 0xffffff : 0xf2c230) : 0xf2c230, right);
      } else {
        list.forEach((a, i) => {
          const x0 = right ? 640 - 10 - (i % 2) * 150 : 10 + (i % 2) * 150, y = 8 + Math.floor(i / 2) * 18;
          const bx = right ? x0 - 16 - 70 : x0 + 16 + 54;
          bar(right ? bx - 54 : bx, y - 2, 70, 4, a.hp / a.maxHp, a.alive ? hpCol(a.hp / a.maxHp) : 0x444444, right);
          if (a.human || a.team === 1) bar(right ? bx - 54 : bx, y + 4, 70, 2, a.meter / 100, a.meter >= 100 ? 0xffffff : 0xf2c230, right);
        });
      }
    });
    // la barra Nekketsu del jugador, llena, avisa
    if (this.player?.meter >= 100 && this.phase === 'play' && Math.floor(this.time.now / 300) % 2) {
      g.fillStyle(0xf2c230).fillRect(250, 44, 140, 12);
      if (!this.data.get('hint')) { this.data.set('hint', this.uiAdd(txt(this, 320, 50, '¡NEKKETSU! ESPECIAL', 'fuente_ui', 1).setDepth(8002).setTint(0x000000))); }
      (this.data.get('hint') as Phaser.GameObjects.BitmapText).setVisible(true);
    } else (this.data.get('hint') as Phaser.GameObjects.BitmapText | undefined)?.setVisible(false);
  }
}
