import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { ajustes } from '../core/nivel';
import { efecto } from '../core/fx';
import { chip } from '../core/music';
import { txt, flash } from '../core/ui';
import { rotular } from '../core/input';
import { Painter, hex } from '../gfx/paint';
import { EventScene, prueba, type Competidor } from './base';
import { queueEscenario } from './escenario';
import type { Paso } from '../core/coach';

const WORLD = 1560;
const TOP = 226;
/** carril de carrera (y desde TOP) y donde esperan los demás */
const RUN_Y = 70;
const WAIT_Y = [18, 30, 42];
const RUN0 = 60;
const FOUL = 380;
/** 10 pixeles por metro */
const PX_M = 10;
const ZOOM = 1.5;
const GRAV = 380;
const INTENTOS = 2;

interface Lanzador { c: Competidor; fig: Figura; best: number; marcas: number[]; top: number; rayo: number }
interface Vuelo { x: number; z: number; vx: number; vz: number; img: Phaser.GameObjects.Image; sombra: Phaser.GameObjects.Ellipse; fuego?: Phaser.GameObjects.Particles.ParticleEmitter }

/**
 * Jabalina llanera: carrerita alternando botones, mantén SALTO para subir el ángulo y suéltalo para lanzar (un toque
 * corto lanza a 40°). Si sueltas pasada la raya es nulo. Corriendo a tope se llena la barra del rayo, que sigue de un
 * intento al otro; llena, ESPECIAL es la lanza del Catatumbo: sale sola a 45° con un rayo y más fuerza.
 * Dos intentos, cuenta el mejor.
 */
export class Jabalina extends EventScene {
  private gente2: Lanzador[] = [];
  private turno = 0;
  private ronda = 0;
  private st: 'espera' | 'carrera' | 'lanza' | 'vuelo' | 'marca' = 'espera';
  private cur!: Lanzador;
  private x = RUN0;
  private v = 0;
  private boost = 0;
  private last = '';
  private ang = 0;
  private holding = false;
  private angT = 0;
  private dist = 0;
  private vuelo: Vuelo | null = null;
  private nulo = false;
  private cpuSuelta = 0;
  /** velocidad que llevaba al plantar: es la que se lleva la jabalina */
  private vLanza = 0;
  private cpuAng = 0;
  /** este lanzamiento es la lanza del Catatumbo */
  private catatumbo = false;
  /** dónde estaba al soltar: el nulo se mide ahí */
  private xSuelta = 0;
  private cpuRayo = false;
  private avisoT = 0;
  private hud!: Phaser.GameObjects.Graphics;
  /** el fondo de código que se repite (sin el arte de PixelForja) */
  private bg?: Phaser.GameObjects.TileSprite;
  private camX = RUN0;
  private skip = false;

  constructor() { super('Jabalina'); }

  preload() { super.preload(); queueEscenario(this, 'llanos_apure'); }

  create() {
    this.gente2 = [];
    this.turno = 0;
    this.ronda = 0;
    this.st = 'espera';
    this.vuelo = null;
    this.marcasTxt = [];
    this.camX = RUN0 + 100;
    this.setup(ZOOM, WORLD);
    this.makeTextures();
    // el arte de PixelForja trae el cielo, lo lejano con su paralaje y la cancha; sin él, el fondo de código
    this.bg = undefined;
    this.escenario('llanos_apure', () => { this.bg = this.fondo('bg_llanos'); this.add.image(0, TOP - 6, 'campo').setOrigin(0, 0).setDepth(-5); });
    for (let m = 10; m * PX_M + FOUL < WORLD - 20; m += 10) this.add.bitmapText(FOUL + m * PX_M, TOP + 112, 'fuente_ui', `${m}`).setOrigin(0.5).setDepth(-4).setTint(0xf4f0e8);
    // el orden: primero los de la máquina, de último tú (así sabes la marca a batir)
    const orden = this.d.practica ? [this.gente[0]] : [this.gente[1], this.gente[2], this.gente[3], this.gente[0]];
    orden.forEach((c, i) => {
      const fig = new Figura(this, 0, 0, c.id, 'idle');
      fig.anim.prefer = 'atletismo';
      fig.set('idle');
      fig.row = 'down_right';
      const top = c.id === 'tetsu' || c.id === 'goro' ? 66 : c.id === 'kenji' ? 62 : 56;
      this.gente2.push({ c, fig, best: 0, marcas: [], top, rayo: 0 });
      fig.setPosition(18 + i * 13, TOP + (WAIT_Y[i % 3] ?? 42));
    });
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.tema('pajarillo_llano');
    this.ambiente('llano');
    this.cameras.main.centerOn(this.camX, 360 - 180 / ZOOM);
    if (this.d.practica) void this.entrenar('JABALINA LLANERA', this.pasos(), 100);
    else void this.previa('JABALINA LLANERA', 'LLANOS DE APURE, VENEZUELA', 'ALTERNA {PUÑO} Y {PATADA} PARA CORRER · MANTÉN {SALTO} Y SUELTA PARA LANZAR · RAYO LLENO: {ESPECIAL}');
  }

  private pasos(): Paso[] {
    const validos = () => this.gente2[0].marcas.filter((m) => m > 0).length;
    let base = 0;
    return [
      { texto: 'ALTERNA {PUÑO} Y {PATADA} PARA\nAGARRAR VELOCIDAD', botones: ['punch', 'kick'], listo: () => this.boost > 50 },
      { texto: 'MANTÉN {SALTO} APRETADO: LA FLECHA\nAMARILLA DE ABAJO SUBE Y BAJA', botones: ['jump'], listo: () => this.holding && this.angT > 0.2 },
      { texto: 'SUELTA {SALTO} PARA LANZAR\nANTES DE LA RAYA BLANCA', botones: ['punch', 'kick', 'jump'], antes: () => { base = validos(); }, listo: () => validos() > base },
      { texto: 'EL TRUCO: MUCHA VELOCIDAD Y\nSOLTAR CERCA DE 45°. ¡PASA LOS 40 M!', botones: ['punch', 'kick', 'jump'], listo: () => this.gente2[0].best > 40 },
    ];
  }

  private makeTextures() {
    if (this.textures.exists('campo')) return;
    const H = 126;
    const p = new Painter(WORLD, H);
    p.rect(0, 0, WORLD, H, hex('#5a9a3a'));
    for (let x = 0; x < WORLD; x += 60) p.rect(x, 0, 30, H, hex('#529034'));
    for (let i = 0; i < 3000; i++) p.px(Math.random() * WORLD, Math.random() * H, Math.random() < 0.5 ? hex('#6aac44') : hex('#467e2c'));
    // pista de impulso
    p.rect(0, RUN_Y - 10 + 6, FOUL, 16, hex('#b8442e'));
    for (let i = 0; i < 300; i++) p.px(Math.random() * FOUL, RUN_Y - 4 + Math.random() * 16, hex('#a83a26'));
    p.rect(0, RUN_Y - 4 + 6 - 6, FOUL, 1, hex('#f4f0e8'));
    p.rect(0, RUN_Y + 12, FOUL, 1, hex('#f4f0e8'));
    p.rect(FOUL - 2, RUN_Y - 6, 4, 22, hex('#f4f4f4'));
    // sector de caída con rayas cada 10 metros
    for (let m = 10; m * PX_M + FOUL < WORLD; m += 10) for (let y = 4; y < H - 18; y += 3) p.px(FOUL + m * PX_M, y, hex('#e8f0d8'));
    for (let x = FOUL; x < WORLD; x += 3) { p.px(x, 4, hex('#e8f0d8')); p.px(x, H - 20, hex('#e8f0d8')); }
    this.textures.addCanvas('campo', p.done());
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    const p = this.pad.read();
    if (this.endTick(p)) { for (const l of this.gente2) l.fig.step(dt); this.filterUi(); return; }
    for (const l of this.gente2) if (l !== this.cur || this.st === 'espera') l.fig.step(dt);
    if (this.fase === 'juego') this.tick(dt, p);
    this.coach?.tick(dt);
    if (this.avisoT > 0) { this.avisoT -= dt; if (this.avisoT <= 0) this.avisoTxt?.setVisible(false); }
    this.camera(dt);
    this.drawHud();
    this.filterUi();
  }

  private tick(dt: number, p: ReturnType<typeof this.pad.read>) {
    if (this.st === 'espera') { this.prepara(); return; }
    const human = this.cur.c.human;
    if (!human && this.st !== 'carrera' && this.st !== 'marca' && (p.pressed.start || p.pressed.punch)) this.skip = true;
    if (this.st === 'carrera') {
      let target: number;
      if (human) {
        if (p.pressed.punch || p.pressed.kick) {
          const k = p.pressed.punch ? 'p' : 'k';
          this.boost = Math.min(100, this.boost + (k !== this.last ? 15 : 5));
          this.last = k;
        }
        // apuntando con el mismo pulgar no se puede correr: la carrera baja más lento mientras mantienes salto
        this.boost = Math.max(0, this.boost - (this.holding ? 14 : 36) * dt);
        target = this.boost * 1.7;
        // a tope, se llena la barra del rayo
        if (this.boost > 80) this.cargaRayo(this.cur, 20 * dt);
        if (p.pressed.special) {
          if (this.cur.rayo >= 100) { this.ang = 45; this.catatumbo = true; this.lanza(); }
          else this.aviso('¡CORRE A TOPE PARA LLENAR EL RAYO!');
        }
        if (this.st !== 'carrera') { /* ya lanzó con el rayo */ } else if (p.held.jump) {
          if (!this.holding) { this.holding = true; this.angT = 0; }
          this.angT += dt;
          // sube de 20 a 60 grados y baja otra vez, por si te pasas
          this.ang = 20 + 40 * Math.abs(Math.sin(this.angT * 1.4));
        } else if (this.holding) {
          // un toque corto: lanzamiento a 40°, lo que haría cualquiera
          if (this.angT < 0.2) this.ang = 40;
          this.lanza();
        }
        // en el nivel suave no hay nulo: al llegar a la raya lanza solo
        if (ajustes().sinNulo && this.x > FOUL - 8 && this.st === 'carrera') { if (!this.holding) this.ang = 40; this.lanza(); }
      } else {
        target = this.cur.top * 2.6 * ajustes().cpuVel;
        if (this.v > this.cur.top * 2.2) this.cargaRayo(this.cur, 20 * dt);
        if (this.x >= this.cpuSuelta) {
          // la máquina usa el rayo a veces, cuando lo tiene
          if (this.cur.rayo >= 100 && this.cpuRayo) { this.ang = 45; this.catatumbo = true; }
          else this.ang = this.cpuAng;
          this.lanza();
        }
      }
      this.v += Phaser.Math.Clamp(target - this.v, -200 * dt, 240 * dt);
      const dx = this.v * dt;
      this.x += dx;
      // una nubecita cada tanto en la carrerita
      if (Math.floor(this.dist / 22) !== Math.floor((this.dist + dx) / 22)) efecto(this, 'polvo_correr_medio', this.x, TOP + RUN_Y);
      this.dist += dx;
      // carrerita con la jabalina al hombro: los primeros cuadros del lanzamiento, por distancia
      this.cur.fig.anim.pos = (this.dist / 7) % 3;
      this.cur.fig.refresh();
      if (this.dist > 0 && Math.random() < dt * 4 && this.v > 30) this.sound.play(`paso_piedra_${Math.floor(Math.random() * 3)}`, { volume: human ? 0.18 : 0.06 });
      if (this.x > FOUL + 40) { this.nulo = true; this.ang = 0; this.lanza(); }
    } else if (this.st === 'lanza') {
      const before = this.cur.fig.anim.frame;
      const ev = this.cur.fig.step(dt * (this.skip ? 2 : 1));
      const d = this.cur.fig.anim.data.desplazamiento ?? [];
      const now = this.cur.fig.anim.frame;
      if (now > before) this.x += (d[now] ?? 0) - (d[before] ?? 0);
      // planta y frena: solo el paso de la animación lo mueve
      this.v = Math.max(0, this.v - 900 * dt);
      this.x += this.v * dt * 0.15;
      for (const e of ev) if (e.tipo === 'suelta') this.suelta(e.punto?.[0] ?? [12, -22]);
      if (this.cur.fig.anim.done && this.vuelo == null && this.st === 'lanza') this.cierra(0);
    }
    this.cur.fig.setPosition(Math.round(this.x), TOP + RUN_Y).setDepth(TOP + RUN_Y);
    if (this.vuelo) this.vuela(dt);
  }

  /** Le toca al siguiente: sale a la pista. */
  private prepara() {
    this.cur = this.gente2[this.turno];
    this.x = RUN0; this.v = 0; this.boost = 0; this.dist = 0; this.ang = 0; this.holding = false; this.nulo = false; this.skip = false;
    this.cur.fig.row = 'right';
    this.cur.fig.set('javelin', true);
    this.cur.fig.anim.speed = 0;
    this.cur.fig.setPosition(RUN0, TOP + RUN_Y);
    this.cpuSuelta = FOUL - 14 - Math.random() * 30 + (Math.random() < 0.08 ? 40 : 0);
    this.cpuAng = 36 + Math.random() * 12;
    this.catatumbo = false;
    this.cpuRayo = Math.random() < 0.4 + 0.3 * ajustes().cpuAgresion;
    this.camX = RUN0 + 100;
    const intento = this.d.practica ? `INTENTO ${this.ronda + 1}` : `INTENTO ${this.ronda + 1} DE ${INTENTOS}`;
    const t = this.uiAdd(txt(this, 320, 84, `${this.nombre(this.cur.c.id)} · ${intento}`, 'fuente_ui', 2).setDepth(8500).setTint(this.cur.c.human ? 0xffe040 : this.cur.c.team === 0 ? 0x9ac8ff : 0xffa0a0));
    this.time.delayedCall(1300, () => t.destroy());
    this.st = 'carrera';
    if (this.cur.c.human) {
      const m = Math.max(...this.gente2.map((l) => l.best));
      if (m > 0) {
        const b = this.uiAdd(txt(this, 320, 104, `MARCA A BATIR: ${m.toFixed(2)} M`, 'fuente_ui', 1).setDepth(8500).setTint(0xf2c230));
        this.time.delayedCall(1800, () => b.destroy());
      }
    }
  }

  private lanza() {
    this.holding = false;
    this.st = 'lanza';
    this.vLanza = this.v;
    this.xSuelta = this.x;
    if (this.catatumbo) {
      this.cur.rayo = 0;
      efecto(this, 'aura_nekketsu', this.x, TOP + RUN_Y, { depth: TOP + RUN_Y - 0.1 });
      if (this.cur.c.human) void this.banner('¡LANZA DEL CATATUMBO!', 'fuente_titulo', 2, 600);
      this.sound.play('esquiva', { volume: 0.4, rate: 0.7 });
    }
    this.cur.fig.anim.pos = 4;
    this.cur.fig.anim.speed = 1;
    if (this.cur.c.human) chip.blip(440, 0.1, 'sq25', 0.18, 880);
  }

  private suelta([px, py]: [number, number]) {
    // el nulo se mide donde soltaste, no donde termina el paso
    if (this.xSuelta > FOUL && !(this.cur.c.human && ajustes().sinNulo)) this.nulo = true;
    const fuerza = (120 + this.vLanza * 2.1) * (this.catatumbo ? 1.2 : 1);
    const a = Phaser.Math.DegToRad(this.nulo && this.ang === 0 ? 20 : this.ang);
    const x = this.x + px, z = -py;
    const img = this.add.image(x, TOP + RUN_Y - z, 'jabalina').setOrigin(0.6, 0.5);
    const sombra = this.add.ellipse(x, TOP + RUN_Y, 22, 2, 0x000000, 0.3).setDepth(TOP + RUN_Y - 1);
    this.vuelo = { x, z, vx: Math.cos(a) * fuerza, vz: Math.sin(a) * fuerza, img, sombra };
    if (this.catatumbo) {
      // el rayo del Catatumbo cae sobre la lanza y la lanza va en llamas
      efecto(this, 'rayo_catatumbo', x + 30, TOP - 40, { depth: 6000 });
      flash(this, 120);
      this.cameras.main.shake(200, 0.008);
      const fuego = this.add.particles(0, 0, 'px', { lifespan: 300, scale: { start: 1.4, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffe040, 0x8ae0ff, 0xffffff], frequency: 12 }).setDepth(TOP + RUN_Y);
      fuego.startFollow(img);
      this.vuelo.fuego = fuego;
    }
    this.st = 'vuelo';
    this.sound.play('esquiva', { volume: this.cur.c.human ? 0.5 : 0.2 });
    if (this.cur.c.human) this.cameras.main.shake(80, 0.004);
  }

  private vuela(dt: number) {
    const f = this.vuelo!;
    const k = this.skip ? 3 : 1;
    for (let i = 0; i < k; i++) {
      if (f.z <= 0 && f.vz < 0) break;
      f.vz -= GRAV * dt;
      f.x += f.vx * dt;
      f.z += f.vz * dt;
    }
    f.img.setPosition(Math.round(f.x), Math.round(TOP + RUN_Y - Math.max(0, f.z))).setRotation(-Math.atan2(f.vz, f.vx)).setDepth(TOP + RUN_Y + 1);
    f.sombra.setPosition(Math.round(f.x), TOP + RUN_Y);
    if (f.z <= 0 && f.vz < 0) {
      // clavada en el suelo
      f.img.setPosition(Math.round(f.x), TOP + RUN_Y - 4).setRotation(0.6);
      efecto(this, 'polvo_caer_chico', f.x, TOP + RUN_Y);
      f.sombra.destroy();
      if (f.fuego) { f.fuego.stop(); this.time.delayedCall(400, () => f.fuego?.destroy()); }
      this.vuelo = null;
      this.sound.play('golpe', { volume: this.cur.c.human ? 0.4 : 0.15, rate: 0.7 });
      this.cameras.main.shake(70, 0.003);
      const m = Math.max(0, (f.x - FOUL) / PX_M);
      this.cierra(this.nulo ? 0 : m);
      this.time.delayedCall(2600, () => f.img.destroy());
    }
  }

  private cierra(m: number) {
    this.st = 'marca';
    const l = this.cur;
    l.marcas.push(m);
    // entrenando se tira las veces que haga falta: el tablero muestra las dos últimas
    if (this.d.practica && l.marcas.length > INTENTOS) l.marcas.shift();
    const record = m > l.best && m > 0;
    // la mejor de todos hasta ahora (y ya había marcas): ¡RÉCORD! con su cinta dorada
    const deTodos = !this.nulo && m > 0 && l.c.human && this.gente2.some((o) => o.best > 0) && this.gente2.every((o) => m > o.best);
    l.best = Math.max(l.best, m);
    if (deTodos) void this.banner('¡RÉCORD!', 'fuente_titulo', 2, 1000, 90);
    const s = this.nulo ? '¡NULO!' : `${m.toFixed(2)} M`;
    const t = this.uiAdd(txt(this, 320, this.d.practica ? 200 : 130, s, 'fuente_titulo', 2).setDepth(8500).setTint(this.nulo ? 0xff6060 : 0xffffff));
    this.tweens.add({ targets: t, scale: { from: 4, to: 2 }, duration: 240, ease: 'Back.out' });
    if (this.nulo) { chip.blip(220, 0.3, 'sq50', 0.25, 110); l.fig.set('sad', true); }
    else if (l.c.human && record) {
      flash(this, 100); chip.blip(1320, 0.2, 'sq25', 0.2, 1760); l.fig.set('celebrate', true);
      // el brillo de récord sobre la jabalina clavada
      const b = efecto(this, 'brillo_record', FOUL + m * PX_M, TOP + RUN_Y - 14, { depth: 6000 });
      if (b) this.time.delayedCall(1600, () => b.destroy());
    }
    else l.fig.set(m > 45 ? 'celebrate' : 'idle', true);
    l.fig.row = 'down_right';
    this.time.delayedCall(this.skip ? 900 : 1800, () => {
      if (this.fase !== 'juego') { t.destroy(); return; }
      t.destroy();
      l.fig.set('idle', true);
      const i = this.gente2.indexOf(l);
      l.fig.setPosition(18 + i * 13, TOP + WAIT_Y[i % 3]).setDepth(TOP + WAIT_Y[i % 3]);
      this.turno++;
      if (this.turno >= this.gente2.length) { this.turno = 0; this.ronda++; }
      if (this.ronda >= INTENTOS && !this.d.practica) this.final();
      else this.st = 'espera';
    });
  }

  /** Llena la barra del rayo; cuando la tuya se llena, avisa. */
  private cargaRayo(l: Lanzador, n: number) {
    const antes = l.rayo;
    l.rayo = Math.min(100, l.rayo + n);
    if (l.c.human && antes < 100 && l.rayo >= 100) { this.aviso('¡RAYO LLENO! {ESPECIAL}'); this.sound.play('elegir', { volume: 0.4, rate: 1.4 }); }
  }

  private avisoTxt?: Phaser.GameObjects.BitmapText;
  private aviso(s: string) {
    this.avisoTxt ??= this.uiAdd(txt(this, 320, 280, '', 'fuente_ui', 1).setDepth(8501).setTint(0x8ae0ff));
    this.avisoTxt.setText(rotular(s, this.pad.fuente)).setVisible(true);
    this.avisoT = 1.4;
  }

  private final() {
    this.fase = 'fin';
    const orden = [...this.gente2].sort((a, b) => b.best - a.best).map((l) => ({ c: l.c, valor: l.best > 0 ? `${l.best.toFixed(2)} M` : 'NULO' }));
    this.camX = RUN0 + 100;
    this.resultados(prueba('Jabalina').nombre, orden);
  }

  private camera(dt: number) {
    let want = this.camX;
    if (this.vuelo) want = this.vuelo.x;
    else if (this.st === 'carrera' || this.st === 'lanza') want = this.x + 90;
    else if (this.st === 'marca') want = this.camX;
    this.camX += (want - this.camX) * Math.min(1, dt * (this.vuelo ? 10 : 4));
    const cam = this.cameras.main;
    cam.centerOn(this.camX, 360 - 180 / ZOOM);
    if (this.bg) this.bg.tilePositionX = cam.scrollX * 0.2;
  }

  private marcasTxt: Phaser.GameObjects.BitmapText[][] = [];
  private angTxt!: Phaser.GameObjects.BitmapText;
  private ojo!: Phaser.GameObjects.BitmapText;
  private carreraTxt!: Phaser.GameObjects.BitmapText;

  /** Tablero de marcas y medidores: se arman una vez y se actualizan. */
  private buildHud() {
    this.marcasTxt = [];
    this.gente2.forEach((l, i) => {
      const y = 18 + i * 16;
      this.uiAdd(this.add.image(20, y, 'cabecitas', l.c.id).setDepth(8001));
      this.uiAdd(txt(this, 32, y, this.nombre(l.c.id), 'fuente_ui', 1, 0).setDepth(8001).setTint(l.c.human ? 0xffe040 : l.c.team === 0 ? 0x9ac8ff : 0xffa0a0));
      this.marcasTxt.push(Array.from({ length: INTENTOS }, (_, r) => this.uiAdd(txt(this, 150 + r * 46, y, '-', 'fuente_ui', 1, 1).setDepth(8001))));
    });
    this.carreraTxt = this.uiAdd(txt(this, 66, 326, 'CARRERA · RAYO', 'fuente_ui', 1).setDepth(8001));
    this.angTxt = this.uiAdd(txt(this, 206, 334, '', 'fuente_ui', 1).setDepth(8001));
    this.ojo = this.uiAdd(txt(this, 320, 300, '¡OJO CON LA RAYA!', 'fuente_ui', 2).setDepth(8001).setTint(0xff6060));
  }

  private drawHud() {
    const g = this.hud;
    g.clear();
    if (!this.marcasTxt.length) this.buildHud();
    g.fillStyle(0x000000, 0.55).fillRect(8, 8, 236, 70);
    this.gente2.forEach((l, i) => this.marcasTxt[i].forEach((t, r) => {
      const m = l.marcas[r];
      t.setText(m === undefined ? '-' : m > 0 ? m.toFixed(1) : 'X').setTint(m === 0 ? 0xff6060 : 0xffffff);
    }));
    const show = !!this.cur?.c.human && this.st === 'carrera' && this.fase === 'juego';
    this.carreraTxt.setVisible(show);
    this.angTxt.setVisible(show && this.holding);
    this.ojo.setVisible(show && this.x > FOUL - 60);
    if (!show) return;
    g.fillStyle(0x000000, 0.6).fillRect(14, 334, 104, 12);
    g.fillStyle(this.boost > 70 ? 0xff6040 : 0xf2c230).fillRect(16, 336, this.boost, 8);
    // la barra del rayo, debajo de la carrera
    const lleno = this.cur.rayo >= 100;
    g.fillStyle(0x000000, 0.6).fillRect(14, 348, 104, 6);
    g.fillStyle(lleno ? (Math.floor(this.time.now / 150) % 2 ? 0xffe040 : 0x8ae0ff) : 0x5a9af0).fillRect(16, 349, this.cur.rayo, 4);
    const cx = 160, cy = 344;
    g.lineStyle(1, 0xffffff, 0.5).beginPath().arc(cx, cy, 30, Phaser.Math.DegToRad(-90), 0).strokePath();
    g.lineStyle(1, 0x40ff80, 0.6).lineBetween(cx, cy, cx + Math.cos(Phaser.Math.DegToRad(-42)) * 30, cy + Math.sin(Phaser.Math.DegToRad(-42)) * 30);
    if (this.holding) {
      g.lineStyle(3, 0xffe040).lineBetween(cx, cy, cx + Math.cos(Phaser.Math.DegToRad(-this.ang)) * 32, cy + Math.sin(Phaser.Math.DegToRad(-this.ang)) * 32);
      this.angTxt.setText(`${Math.round(this.ang)}°`);
    }
  }
}
