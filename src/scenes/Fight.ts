import Phaser from 'phaser';
import { Actor, HUECO, Item, NOTHING, type Intent, type World } from '../fight/actor';
import { Brain } from '../fight/brain';
import { DEPTH, FLOOR_TOP, XMAX, XMIN, type AttackDef } from '../fight/defs';
import { Figura } from '../core/figura';
import { ajustes } from '../core/nivel';
import { efecto, talla } from '../core/fx';
import { Input } from '../core/input';
import { chip, PELEA, VICTORIA } from '../core/music';
import { txt, flash, speedLines } from '../core/ui';
import { FAMILIA, INSTITUTO, INFO } from './Select';
import type { Gira } from '../events/base';
import { Coach, type Paso } from '../core/coach';
import azotea from '../../data/stages/caracas_azotea.layout.json';

/** acercamiento de la cámara en la pelea: más cerca en 1 contra 1 */
const ZOOMS: Record<string, number> = { '1v1': 1.75, '4v4': 1.45 };

const ARMAS_PISO = ['chancleta', 'tubo', 'pote_basura', 'silla_plastica', 'coco', 'paraguas', 'escoba', 'chancleta_rosada', 'cono', 'llanta'];

/** Qué técnica usa cada atleta con la barra Nekketsu llena. */
const TECNICA: Record<string, 'mach' | 'huracan' | 'chilena' | 'thor' | 'dragon' | 'tackle'> = {
  rick: 'mach', steph: 'huracan', sophie: 'chilena', alana: 'thor', kenji: 'dragon', ryu: 'huracan', goro: 'tackle', tetsu: 'mach',
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
  private thorRun: { f: Figura; owner: Actor; hit: Set<Actor>; dir: number } | null = null;
  private specials = new Map<Actor, { kind: string; n: number; t: number }>();
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
  private relojTxt: Phaser.GameObjects.BitmapText | null = null;
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
    this.coach = null;
    this.golpes = [];
    this.actors = [];
    this.items = [];
    this.brains.clear();
    this.specials.clear();
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
    this.limites = this.data0.practica ? undefined : { xmin: XMIN, xmax: 700, depth: DEPTH };
  }

  get sc(): Phaser.Scene { return this; }

  /** Para la máquina: dónde hay comida en el piso. */
  get comida() { return this.arepas.map((a) => ({ x: a.x, y: a.y })); }

  /** Un cartelito de cómic chiquito sobre alguien. */
  aviso(a: Actor, s: string, color: number) {
    const t = txt(this, a.x, FLOOR_TOP + a.y - a.z - 58, s, 'fuente_ui', 1).setTint(color).setDepth(6000);
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
    fig.setDepth(-7.9);
    chip.blip(1320, 0.7, 'sq50', 0.14, 110);
    this.tweens.add({ targets: fig, y: fig.y + 220, angle: a.left ? -200 : 200, duration: 900, ease: 'Quad.in', onComplete: () => fig.setVisible(false) });
    this.letrero(a, '¡FUERA!', 0xff8080);
    this.shake(160, 0.008);
    a.fuera();
  }

  private letrero(a: Actor, s: string, color: number) {
    const t = txt(this, Math.min(a.x, this.borde - 40), FLOOR_TOP + a.y - 64, s, 'fuente_titulo', 1).setTint(color).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, delay: 500, duration: 600, onComplete: () => t.destroy() });
  }

  create() {
    this.cameras.main.fadeIn(250);
    // el mundo se ve de cerca y sigue la acción; el marcador va en su propia capa, sin acercar
    this.ui = this.add.layer().setDepth(10000);
    // entrenando, un poco más lejos: el cartel de arriba no tapa a nadie
    this.zoom = this.data0.practica ? 1.45 : ZOOMS[this.data0.modo] ?? 1.45;
    this.cameras.main.setZoom(this.zoom).setBounds(0, 0, 640, 360).centerOn(320, this.camY);
    this.cameras.main.ignore(this.ui);
    this.uiCam = this.cameras.add(0, 0, 640, 360).setName('ui');
    this.camLock = false;
    this.add.image(320, 180, 'bg_caracas').setDepth(-10).setScrollFactor(0.45, 1);
    this.add.image(320, 280, 'bg_azotea').setDepth(-9);
    // en los edificios, más abajo que el marcador: se ven enteros con cualquier acercamiento
    this.neon('AREPERA LA CHAMA', 470, 194, 0xff4fa0);
    this.neon('CARACAS', 160, 190, 0x40e0ff);
    // Thor mira desde el fondo, lejos del borde
    const npc = azotea.entidades.find((e) => e.tipo === 'npc');
    this.thorFan = new Figura(this, npc?.x ?? 40, FLOOR_TOP - 2, 'thor', 'sit').setDepth(FLOOR_TOP - 2);
    this.thorFan.row = 'down_right';
    this.bordeG = this.data0.practica ? null : this.add.graphics().setDepth(-8);
    this.dibujarBorde();

    this.sparks = this.add.particles(0, 0, 'px', { speed: { min: 60, max: 180 }, lifespan: 260, scale: { start: 0.9, end: 0 }, tint: [0xffffff, 0xffe040, 0xffa020], emitting: false }).setDepth(5000);
    this.dusts = this.add.particles(0, 0, 'px', { speedX: { min: -40, max: 40 }, speedY: { min: -30, max: -6 }, lifespan: 380, scale: { start: 0.8, end: 0 }, tint: 0xb0a8b8, alpha: { start: 0.7, end: 0 }, emitting: false }).setDepth(4999);

    const { modo, jugador, rival } = this.data0;
    const nuestros = modo === '4v4' ? [jugador, ...FAMILIA.filter((f) => f !== jugador)] : [jugador];
    const ellos = modo === '4v4' ? INSTITUTO : [rival];
    nuestros.forEach((id, i) => {
      const a = new Actor(this, id, 0, 90 + (i % 2) * 40, 20 + i * 22, i === 0);
      this.actors.push(a);
      // tu equipo aguanta más según el nivel
      a.maxHp = a.hp = Math.round(a.maxHp * ajustes().vida);
      if (i === 0) this.player = a; else this.brains.set(a, new Brain(a, 0.9));
    });
    ellos.forEach((id, i) => {
      const a = new Actor(this, id, 1, this.data0.practica ? 230 : 550 - (i % 2) * 40, 20 + i * 22);
      this.actors.push(a);
      // entrenando, el rival es un saco: no se mueve ni pega
      if (!this.data0.practica) this.brains.set(a, new Brain(a, (modo === '4v4' ? 0.85 : 1) * ajustes().cpuAgresion));
    });
    const n = modo === '4v4' ? 6 : 4;
    for (let i = 0; i < n; i++) this.items.push(new Item(this, ARMAS_PISO[i], 200 + Math.random() * 240, 10 + Math.random() * (DEPTH - 20)));
    if (!this.items.some((i) => i.kind === 'chancleta')) this.items.push(new Item(this, 'chancleta', this.player.x + 40, this.player.y));

    this.pad = new Input(this, undefined, this.ui);
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.buildHud();
    this.registry.set('marchaSonando', false);
    chip.play(PELEA);
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
    chip.play(VICTORIA);
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
    efecto(this, big ? 'chispa_golpe_pesado' : 'chispa_golpe_medio', x, FLOOR_TOP + y - z, { depth: 5002 });
    this.sparks.explode(big ? 8 : 4, x, FLOOR_TOP + y - z);
    const ring = this.add.circle(x, FLOOR_TOP + y - z, 3, 0xffffff, 0).setStrokeStyle(2, 0xffffff).setDepth(5001);
    this.tweens.add({ targets: ring, scale: big ? 5 : 3, alpha: 0, duration: 160, onComplete: () => ring.destroy() });
  }
  dust(x: number, y: number) {
    if (!efecto(this, 'polvo_caer_medio', x, FLOOR_TOP + y)) this.dusts.explode(7, x, FLOOR_TOP + y);
  }
  /** Al correr, una nubecita en cada paso; la persona además suena. */
  paso(a: Actor) {
    if (a.st === 'run') efecto(this, `polvo_correr_${talla(a.fig.celda)}`, a.x, FLOOR_TOP + a.y, { flip: a.left });
    if (a.human) this.sfx(`paso_piedra_${Math.floor(Math.random() * 3)}`, 0.25);
  }
  number(x: number, y: number, n: number) {
    const t = txt(this, x, FLOOR_TOP + y - 52, `${n}`, 'fuente_ui', 1).setTint(0xff6060).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 650, onComplete: () => t.destroy() });
  }
  onHit(from: Actor | null, v: Actor, _dmg: number, kd: boolean) {
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
    if (kd) this.onomatopeya(v.x + (from ? from.dir * 10 : 0), cabeza, Phaser.Utils.Array.GetRandom(PUM), true);
    else if (from === this.player && this.racha.n % 3 === 0) this.onomatopeya(v.x, cabeza, Phaser.Utils.Array.GetRandom(PAF), false);
    // el Instituto se burla cuando te tumba (y si le pegas mientras se ríe, se lo merece)
    if (kd && v.human && from && from.team === 1 && this.phase === 'play' && Math.random() < 0.65) {
      this.time.delayedCall(520, () => {
        if (!from.alive || this.phase !== 'play' || !from.burla(1.1)) return;
        const t = txt(this, from.x, FLOOR_TOP + from.y - 62, Phaser.Utils.Array.GetRandom(BURLAS), 'fuente_ui', 1).setDepth(6000).setTint(0xffa0a0);
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
    const t = txt(this, a.x, FLOOR_TOP + a.y - 60, 'K.O.', 'fuente_titulo', 1).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 20, alpha: 0, delay: 600, duration: 700, onComplete: () => t.destroy() });
    const vivos = this.actors.filter((x) => x.team === a.team && x.alive);
    if (!vivos.length && this.phase === 'play') {
      // cámara lenta en el último KO
      this.slow = 1.3;
      this.camLock = true;
      this.cameras.main.zoomTo(this.zoom * 1.3, 250);
      this.cameras.main.pan(a.x, FLOOR_TOP + a.y - 30, 250);
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
      this.arepaTick(dt);
      if (this.slow <= 0) this.checkEnd();
    }
    this.renderAll();
    this.drawHud();
  }

  private renderAll() {
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
    const tx = near && Math.abs(near.x - p.x) < 260 ? p.x * 0.6 + near.x * 0.4 : p.x;
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
    await this.banner('¡LISTOS!', 'fuente_titulo_plata', 3, 800);
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
      add(txt(this, 150, 246, modo4 ? 'FAMILIA GG' : yo.nombre.toUpperCase(), 'fuente_ui', 2).setDepth(8604).setTint(0x9ac8ff));
      add(txt(this, 490, 246, modo4 ? 'INSTITUTO NEKKETSU' : el.nombre.toUpperCase(), 'fuente_ui', 2).setDepth(8604).setTint(0xffa0a0));
      const fa = add(txt(this, 150, 268, FRASE[yo.id] ?? '¡VAMOS!', 'fuente_ui', 1).setDepth(8604).setAlpha(0));
      const fb = add(txt(this, 490, 268, FRASE[el.id] ?? '¡VEN!', 'fuente_ui', 1).setDepth(8604).setAlpha(0));
      this.tweens.add({ targets: fa, alpha: 1, delay: 500, duration: 150 });
      this.tweens.add({ targets: fb, alpha: 1, delay: 1000, duration: 150 });
      const v = add(txt(this, 320, 150, 'VS', 'fuente_titulo', 4).setDepth(8605).setAlpha(0));
      this.time.delayedCall(320, () => { v.setAlpha(1); this.tweens.add({ targets: v, scale: { from: 9, to: 4 }, duration: 220, ease: 'Back.out' }); chip.boom(0.6); this.shake(150, 0.006); });
      this.time.delayedCall(2300, () => this.tweens.add({ targets: objs, alpha: 0, duration: 220, onComplete: () => { objs.forEach((o) => o.destroy()); res(); } }));
    });
  }

  private banner(s: string, font: 'fuente_titulo' | 'fuente_titulo_plata' | 'fuente_ui', scale: number, hold: number) {
    return new Promise<void>((res) => {
      const t = this.uiAdd(txt(this, 320, 150, s, font, scale * 2).setDepth(8500).setAlpha(0));
      this.tweens.add({ targets: t, scale, alpha: 1, duration: 200, ease: 'Back.out' });
      chip.boom(0.3);
      this.time.delayedCall(hold, () => this.tweens.add({ targets: t, alpha: 0, scale: scale * 1.3, duration: 200, onComplete: () => { t.destroy(); res(); } }));
    });
  }

  private victory() {
    this.phase = 'end';
    chip.play(VICTORIA);
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

  /** La final de la Olimpiada: 20 puntos al equipo que gane y al medallero. */
  private cierraGira(team: 0 | 1) {
    const gira = this.registry.get('gira') as Gira | undefined;
    if (gira) {
      gira.puntos[team] += 20;
      const vivos = this.actors.filter((a) => a.team === team).sort((a, b) => Number(b.alive) - Number(a.alive));
      gira.resultados.push({ prueba: 'KACHINUKI FINAL', podio: vivos.map((a) => a.id) });
      this.registry.set('gira', gira);
    }
    this.uiAdd(txt(this, 320, 152, `+20 PTS ${team === 0 ? 'FAMILIA GG' : 'INSTITUTO'}`, 'fuente_ui', 2).setDepth(8500).setTint(0x8ae08a));
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
    const aura = efecto(this, 'aura_nekketsu', a.x, FLOOR_TOP + a.y, { depth: FLOOR_TOP + a.y - 0.5 });
    if (aura) this.time.delayedCall(1700, () => this.tweens.add({ targets: aura, alpha: 0, duration: 250, onComplete: () => aura.destroy() }));
    if (a.id === 'alana') this.sfx('thor_rescate', 0.6);
    const side = a.team === 0 ? 1 : -1;
    const dark = this.uiAdd(this.add.rectangle(320, 180, 800, 360, 0x000000, 0.65).setDepth(8600));
    const band = this.uiAdd(this.add.rectangle(320, 150, 800, 110, a.team === 0 ? 0x1a3a9a : 0x9a1a2a, 0.95).setDepth(8601));
    const lines = this.uiAdd(speedLines(this, 8602));
    const por = this.uiAdd(this.add.image(320 - side * 400, 150, `retratos:${a.id}`, 'grande_enojo').setDepth(8603));
    this.tweens.add({ targets: por, x: 320 - side * 160, duration: 220, ease: 'Back.out' });
    const name = this.uiAdd(txt(this, 320 + side * 90, 136, INFO[a.id]?.tecnica ?? '¡TÉCNICA!', 'fuente_titulo', 2).setDepth(8604).setScale(5).setAlpha(0));
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
      const f = new Figura(this, dir > 0 ? XMIN - 30 : XMAX + 30, FLOOR_TOP + a.y, 'thor', 'run').setScale(1.4);
      f.left = dir < 0;
      this.thorRun = { f, owner: a, hit: new Set(), dir };
      if (this.thorFan) this.thorFan.setVisible(false);
      this.sfx('ladrido', 0.7);
    }
  }

  private specialTick(a: Actor, dt: number) {
    const s = this.specials.get(a)!;
    s.t += dt;
    const done = () => { this.specials.delete(a); a.vx = 0; a.vz = 0; a.z = 0; a.setSt('idle', 'idle'); a.invul = 0.4; };
    const hit = (def: AttackDef, radius = 8) => a.resolveHit(a.fig.anim.data.eventos?.find((e) => e.tipo === 'impacto')?.punto, def, radius);
    if (s.kind === 'mach') {
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
    r.f.x += r.dir * 300 * dt;
    r.f.y = FLOOR_TOP + r.owner.y;
    r.f.setDepth(FLOOR_TOP + r.owner.y + 0.3);
    r.f.step(dt, 300 * dt);
    for (const v of this.actors) {
      if (v.team === r.owner.team || r.hit.has(v) || !v.canBeHit()) continue;
      if (Math.abs(v.y - r.owner.y) > 16 || Math.abs(v.x - r.f.x) > 22) continue;
      r.hit.add(v);
      v.takeHit(r.owner, { dmg: 15, kd: true, push: 200, launch: 220 }, r.dir);
      this.spark(v.x, v.y, 18, true);
      this.sfx('ladrido', 0.5);
      this.hitstop(0.07);
    }
    if (r.f.x < XMIN - 60 || r.f.x > XMAX + 60) {
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
      const g = this.add.graphics().setPosition(x, FLOOR_TOP + y).setDepth(FLOOR_TOP + y - 0.5);
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
      const t = txt(this, x, FLOOR_TOP + y - 26, '¡UNA AREPA!', 'fuente_ui', 1).setDepth(6000).setTint(0xffd080);
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
        efecto(this, 'polvo_caer_grande', this.borde + 4, FLOOR_TOP + Math.random() * DEPTH, { depth: FLOOR_TOP + DEPTH });
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
    const sombra = this.add.ellipse(x, FLOOR_TOP + y, 12, 5, 0x000000, 0.55).setDepth(FLOOR_TOP + y - 1);
    const aro = this.add.ellipse(x, FLOOR_TOP + y, 44, 16).setStrokeStyle(2, 0xff4040).setDepth(FLOOR_TOP + y - 0.9);
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
    efecto(this, 'polvo_caer_grande', p.it.x, FLOOR_TOP + p.it.y, { depth: FLOOR_TOP + p.it.y + 1 });
    for (const a of this.actors) {
      if (!a.alive || !a.canBeHit() || Math.abs(a.x - p.it.x) > 24 || Math.abs(a.y - p.it.y) > 12) continue;
      a.takeHit(null, { dmg: 14, kd: true, push: 90, launch: 180 }, a.x < p.it.x ? -1 : 1);
      this.spark(a.x, a.y, 30, true);
    }
  }

  /** El vacío después del borde, con la franja de peligro y el letrero. */
  private dibujarBorde() {
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
    if (this.limites) {
      this.relojTxt = this.uiAdd(txt(this, 320, 12, '0:00', 'fuente_ui', 2).setDepth(8001));
      this.hudObjs.push(this.relojTxt);
    } else this.relojTxt = null;
    const teams = [0, 1].map((tm) => this.actors.filter((a) => a.team === tm));
    teams.forEach((list, tm) => {
      const right = tm === 1;
      if (list.length === 1) {
        const a = list[0];
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

  private drawHud() {
    const g = this.hud;
    g.clear();
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
        bar(x, 18, 150, 6, a.hp / a.maxHp, hpCol(a.hp / a.maxHp), right);
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
