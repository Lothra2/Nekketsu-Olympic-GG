import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { ajustes } from '../core/nivel';
import { efecto } from '../core/fx';
import { chip, PELEA } from '../core/music';
import { txt, flash } from '../core/ui';
import { Painter, hex, rng, type RGB } from '../gfx/paint';
import { EventScene, prueba, type Competidor } from './base';
import type { Paso } from '../core/coach';

const WORLD = 880;
/** la azotea: los pies van en esta y */
const TECHO = 262;
/** la calle, allá abajo */
const CALLE = 352;
const RUN0 = 60;
/** el filo de la azotea de salida y la cajita donde se clava la garrocha */
const BORDE = 440;
const CAJA = BORDE - 12;
/** 10 pixeles por metro */
const PX_M = 10;
const ZOOM = 1.5;
const INTENTOS = 3;
/** el hueco hasta el techo de enfrente en cada ronda, en metros: cada vez más lejos */
const HUECOS = [5, 6, 7];
const HUECO_PRACTICA = 4;
/** los cuadros de pole_vault: 0 a 2 corre, 3 clava, 7 suelta, 11 cae en la colchoneta */
const CLAVA = 3, ATERRIZA = 11;

type Caida = 'balcon' | 'carrito' | 'palenquera';
interface Saltador { c: Competidor; fig: Figura; best: number; marcas: number[]; top: number }

/**
 * Azoteas de Cartagena (Crash 'n the Boys, 1992): carrerita con la garrocha alternando botones, SALTO en la cajita
 * para clavarla y SALTO otra vez arriba para el empuje. Hay que llegar al techo de enfrente, cada ronda más lejos.
 * El que no llega cae en un balcón con buganvillas, en el carrito de frutas o al lado de la palenquera, que lo regaña.
 * Tres rondas, cuenta el salto más largo.
 */
export class Azoteas extends EventScene {
  private gente2: Saltador[] = [];
  private turno = 0;
  private ronda = 0;
  private st: 'espera' | 'carrera' | 'salto' | 'cae' | 'marca' = 'espera';
  private cur!: Saltador;
  private x = RUN0;
  private y = TECHO;
  private v = 0;
  private boost = 0;
  private last = '';
  private dist = 0;
  /** del salto: dónde clavó, dónde cae y qué tan bien */
  private x0 = 0;
  private xCae = 0;
  private eff = 0;
  private empuje = false;
  private intentoEmpuje = false;
  private viento = 0;
  private cpuClava = 0;
  private cpuEmpuja = false;
  private caida: { tipo: Caida; vy: number; vx: number; hasta: number } | null = null;
  private hueco = HUECO_PRACTICA;
  private skip = false;
  private camX = RUN0 + 100;
  private hud!: Phaser.GameObjects.Graphics;
  private bg!: Phaser.GameObjects.TileSprite;
  private enfrente!: Phaser.GameObjects.Container;
  private banderas: Phaser.GameObjects.Graphics[] = [];
  private palenquera!: Phaser.GameObjects.Image;
  private carrito!: Phaser.GameObjects.Image;
  private metros: Phaser.GameObjects.BitmapText[] = [];
  private saltos = 0;

  constructor() { super('Azoteas'); }

  create() {
    this.gente2 = [];
    this.turno = 0;
    this.ronda = 0;
    this.st = 'espera';
    this.caida = null;
    this.marcasTxt = [];
    this.hudListo = false;
    this.banderas = [];
    this.metros = [];
    this.saltos = 0;
    this.camX = RUN0 + 100;
    this.setup(ZOOM, WORLD);
    this.makeTextures();
    this.bg = this.fondo('bg_cartagena');
    // la calle de piedra, la azotea de salida y la de enfrente (se corre según la ronda)
    this.add.image(0, CALLE - 4, 'cart_calle').setOrigin(0, 0).setDepth(-6);
    this.add.tileSprite(BORDE, TECHO - 4, 120, CALLE - TECHO, 'cart_callejon').setOrigin(0, 0).setDepth(-7);
    this.add.image(-40, TECHO - 12, 'cart_salida').setOrigin(0, 0).setDepth(-5);
    this.enfrente = this.add.container(0, TECHO - 12).setDepth(-5);
    this.enfrente.add(this.add.image(0, 0, 'cart_enfrente').setOrigin(0, 0));
    // el balcón que sobresale hacia el hueco, con sus buganvillas
    this.enfrente.add(this.add.image(-16, 38, 'cart_balcon').setOrigin(0, 0));
    this.carrito = this.add.image(0, CALLE, 'cart_carrito').setOrigin(0.5, 1).setDepth(CALLE - 1);
    this.palenquera = this.add.image(0, CALLE, 'cart_palenquera').setOrigin(0.5, 1).setDepth(CALLE - 1);
    // las banderitas del viento sobre la azotea de salida
    for (const bx of [140, 300]) {
      this.add.rectangle(bx, TECHO - 14, 1, 30, 0x5a4a3a).setOrigin(0.5, 1).setDepth(-4);
      this.banderas.push(this.add.graphics().setPosition(bx, TECHO - 44).setDepth(-4));
    }
    this.ponerHueco(this.d.practica ? HUECO_PRACTICA : HUECOS[0]);
    // el orden: primero los de la máquina, de último tú (así sabes la marca a batir)
    const orden = this.d.practica ? [this.gente[0]] : [this.gente[1], this.gente[2], this.gente[3], this.gente[0]];
    orden.forEach((c, i) => {
      const fig = new Figura(this, 0, 0, c.id, 'idle');
      fig.anim.prefer = 'atletismo';
      fig.set('idle');
      fig.row = 'down_right';
      const top = c.id === 'tetsu' || c.id === 'goro' ? 66 : c.id === 'kenji' ? 62 : 56;
      this.gente2.push({ c, fig, best: 0, marcas: [], top });
      this.esperando(this.gente2[i]);
    });
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    chip.play(PELEA);
    this.cameras.main.centerOn(this.camX, 360 - 180 / ZOOM);
    if (this.d.practica) void this.entrenar('AZOTEAS DE CARTAGENA', this.pasos(), 40);
    else void this.previa('AZOTEAS DE CARTAGENA', 'CARTAGENA, COLOMBIA', 'ALTERNA {PUÑO} Y {PATADA} PARA CORRER · {SALTO} EN LA CAJITA PARA CLAVAR LA GARROCHA');
  }

  private pasos(): Paso[] {
    return [
      { texto: 'ALTERNA {PUÑO} Y {PATADA} PARA\nCORRER CON LA GARROCHA', botones: ['punch', 'kick'], listo: () => this.boost > 50 },
      { texto: 'APRIETA {SALTO} CUANDO PISES LA\nCAJITA ROJA, ANTES DEL BORDE', botones: ['punch', 'kick', 'jump'], listo: () => this.saltos > 0 && this.st !== 'salto' },
      { texto: 'EN EL AIRE, {SALTO} OTRA VEZ ARRIBA\nDEL TODO: ¡EL EMPUJE TE ESTIRA!', botones: ['punch', 'kick', 'jump'], listo: () => this.empuje },
      { texto: 'MIRA LAS BANDERITAS: EL VIENTO\nEN CONTRA FRENA. ¡PASA LOS 6 M!', botones: ['punch', 'kick', 'jump'], listo: () => this.gente2[0].best > 6 },
    ];
  }

  /** Los que esperan su turno, atrás en la azotea de salida. */
  private esperando(s: Saltador) {
    const i = this.gente2.indexOf(s);
    s.fig.set('idle', true);
    s.fig.row = 'down_right';
    s.fig.setPosition(18 + i * 13, TECHO - 6).setDepth(TECHO - 6 + i * 0.1).setVisible(true).setAngle(0);
  }

  /** Corre el techo de enfrente (y lo que hay abajo) a `m` metros del borde. */
  private ponerHueco(m: number) {
    this.hueco = m;
    const x = BORDE + m * PX_M;
    this.enfrente.x = x;
    // el carrito pegado a la pared de enfrente; la palenquera en la acera de este lado
    this.carrito.x = x - 15;
    this.palenquera.x = BORDE - 8;
    // los metros pintados en el techo de enfrente
    for (const t of this.metros) t.destroy();
    this.metros = [];
    for (let k = Math.ceil(m / 2) * 2; k <= 12; k += 2) {
      this.metros.push(this.add.bitmapText(BORDE + k * PX_M, TECHO - 6, 'fuente_ui', `${k}`).setOrigin(0.5).setDepth(-3).setTint(0xfff4d8));
      this.metros.push(this.add.bitmapText(BORDE + k * PX_M, TECHO - 1, 'fuente_ui', '|').setOrigin(0.5).setDepth(-3).setTint(0xfff4d8).setAlpha(0.7));
    }
  }

  private makeTextures() {
    if (this.textures.exists('cart_salida')) return;
    const r = rng(23);
    const C = (s: string) => hex(s);
    const PAREDES = ['#f2c84a', '#5aa0d8', '#e87aa0', '#e8904a', '#9ad0a0', '#f4f0e2'].map(C);
    /** una fachada colonial: pared de color, balcones de madera con buganvillas y puertas abajo */
    const fachada = (p: Painter, x0: number, x1: number, conCaja: boolean) => {
      // el piso de la azotea: baldosas de barro, vistas de arriba en una franja
      p.rect(x0, 0, x1 - x0, 12, C('#c8704a'));
      for (let x = x0; x < x1; x += 8) p.rect(x, 0, 1, 12, C('#a85a3a'));
      for (let y = 3; y < 12; y += 4) p.rect(x0, y, x1 - x0, 1, C('#b8603e'));
      p.rect(x0, 11, x1 - x0, 2, C('#f4ecd8'));
      if (conCaja) {
        // la cajita roja donde se clava la garrocha y la raya del borde
        p.rect(CAJA + 40 - 4, 4, 8, 6, C('#d02a2a'));
        p.rect(CAJA + 40 - 3, 5, 6, 3, C('#5a1010'));
        p.rect(BORDE + 40 - 2, 0, 2, 12, C('#f4f4f4'));
      }
      let x = x0;
      while (x < x1) {
        const w = Math.min(x1 - x, 70 + Math.floor(r() * 40));
        const pared: RGB = PAREDES[Math.floor(r() * PAREDES.length)];
        const sombra: RGB = [pared[0] * 0.78, pared[1] * 0.76, pared[2] * 0.74];
        p.rect(x, 13, w, CALLE - TECHO, pared);
        p.rect(x + w - 2, 13, 2, CALLE - TECHO, sombra);
        // el pretil con su remate
        p.rect(x, 13, w, 3, C('#e8dcc0'));
        // ventanas altas con su balcón de madera y las buganvillas
        for (let wx = x + 8; wx < x + w - 16; wx += 24) {
          p.rect(wx, 28, 12, 18, C('#3a2a2a'));
          p.rect(wx + 1, 29, 10, 16, C('#5a3a2a'));
          p.rect(wx - 3, 46, 18, 2, C('#6a3a1a'));
          for (let k = 0; k < 18; k += 3) p.rect(wx - 3 + k, 48, 1, 7, C('#6a3a1a'));
          p.rect(wx - 3, 55, 18, 2, C('#6a3a1a'));
          if (r() < 0.7) for (let i = 0; i < 26; i++) p.px(wx - 4 + r() * 20, 36 + r() * 14, r() < 0.65 ? C('#e0368a') : r() < 0.5 ? C('#f070b0') : C('#2a7a3a'));
        }
        // la puerta de la calle
        const px = x + Math.floor(w / 2) - 7;
        p.rect(px, CALLE - TECHO - 12, 14, 24, C('#4a2a1a'));
        p.rect(px + 6, CALLE - TECHO - 12, 1, 24, C('#2a1a10'));
        x += w;
      }
    };
    const salida = new Painter(BORDE + 40, CALLE - TECHO + 14);
    fachada(salida, 0, BORDE + 40, true);
    this.textures.addCanvas('cart_salida', salida.done());
    const enfrente = new Painter(420, CALLE - TECHO + 14);
    fachada(enfrente, 0, 420, false);
    // la colchoneta azul al llegar
    enfrente.rect(0, 2, 70, 9, C('#2a5ad0'));
    enfrente.rect(0, 2, 70, 2, C('#5a8af0'));
    for (let x = 10; x < 70; x += 14) enfrente.rect(x, 4, 1, 7, C('#1a3a90'));
    this.textures.addCanvas('cart_enfrente', enfrente.done());
    // el balcón que sobresale hacia el hueco
    const b = new Painter(18, 20);
    b.rect(0, 10, 18, 2, C('#6a3a1a'));
    for (let k = 0; k < 18; k += 3) b.rect(k, 12, 1, 7, C('#6a3a1a'));
    b.rect(0, 18, 18, 2, C('#5a2a10'));
    for (let i = 0; i < 40; i++) b.px(r() * 18, r() * 12, r() < 0.7 ? C('#e0368a') : C('#2a7a3a'));
    this.textures.addCanvas('cart_balcon', b.done());
    // la calle empedrada
    const calle = new Painter(WORLD, 12);
    calle.rect(0, 0, WORLD, 12, C('#8a7a6a'));
    for (let i = 0; i < 500; i++) calle.px(r() * WORLD, r() * 12, r() < 0.5 ? C('#a8968a') : C('#6a5a4a'));
    this.textures.addCanvas('cart_calle', calle.done());
    // el fondo del callejón: la pared de atrás en sombra, con una ventana prendida y un farol
    const cj = new Painter(40, CALLE - TECHO);
    cj.vgrad(0, CALLE - TECHO, [C('#7a4a5a'), C('#4a2a3a')]);
    cj.rect(12, 20, 10, 14, C('#f2c870'));
    cj.rect(16, 20, 1, 14, C('#8a5a3a'));
    cj.rect(11, 34, 12, 2, C('#5a3a2a'));
    cj.rect(30, 46, 2, 30, C('#2a1a2a'));
    cj.circle(31, 45, 3, C('#ffe0a0'));
    for (let i = 0; i < 30; i++) cj.px(r() * 40, r() * (CALLE - TECHO), C('#5a3444'));
    this.textures.addCanvas('cart_callejon', cj.done());
    // el carrito de frutas con su sombrilla
    const c = new Painter(30, 30);
    c.rect(2, 4, 26, 2, C('#e83a3a'));
    c.rect(4, 2, 22, 2, C('#f4f0e2'));
    c.rect(14, 6, 1, 10, C('#5a4a3a'));
    c.rect(2, 16, 26, 8, C('#6a9a3a'));
    c.rect(2, 16, 26, 2, C('#8aba4a'));
    for (let i = 0; i < 18; i++) c.circle(4 + r() * 22, 14 + r() * 2, 1.5, [C('#f2c230'), C('#e83a3a'), C('#f2902a'), C('#4ac03a')][i % 4]);
    c.circle(7, 27, 3, C('#3a3a3a'));
    c.circle(23, 27, 3, C('#3a3a3a'));
    this.textures.addCanvas('cart_carrito', c.done());
    // la palenquera: vestido de colores y la ponchera de frutas en la cabeza
    const q = new Painter(20, 36);
    q.circle(10, 4, 6, C('#c0c8d0'));
    q.rect(4, 3, 12, 3, C('#a8b0b8'));
    for (let i = 0; i < 10; i++) q.circle(6 + r() * 8, 1 + r() * 2, 1.5, [C('#f2c230'), C('#e83a3a'), C('#4ac03a')][i % 3]);
    q.circle(10, 10, 3, C('#5a3420'));
    q.rect(8, 9, 4, 2, C('#e83a3a'));
    q.rect(6, 13, 8, 8, C('#f2c230'));
    q.rect(4, 13, 2, 7, C('#5a3420'));
    q.rect(14, 13, 2, 7, C('#5a3420'));
    q.rect(4, 21, 12, 4, C('#e83a3a'));
    q.rect(3, 25, 14, 4, C('#2a5ad0'));
    q.rect(2, 29, 16, 4, C('#f2c230'));
    q.rect(7, 33, 2, 3, C('#5a3420'));
    q.rect(11, 33, 2, 3, C('#5a3420'));
    this.textures.addCanvas('cart_palenquera', q.done());
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    const p = this.pad.read();
    if (this.endTick(p)) { for (const s of this.gente2) s.fig.step(dt); this.filterUi(); return; }
    for (const s of this.gente2) if (s !== this.cur || this.st === 'espera' || this.st === 'marca') s.fig.step(dt);
    if (this.fase === 'juego') this.tick(dt, p);
    this.flamear();
    this.coach?.tick(dt);
    this.camera(dt);
    this.drawHud();
    this.filterUi();
  }

  private tick(dt: number, p: ReturnType<typeof this.pad.read>) {
    if (this.st === 'espera') { this.prepara(); return; }
    const human = this.cur.c.human;
    if (!human && this.st !== 'carrera' && (p.pressed.start || p.pressed.punch)) this.skip = true;
    const fig = this.cur.fig;
    if (this.st === 'carrera') {
      let target: number;
      if (human) {
        if (p.pressed.punch || p.pressed.kick) {
          const k = p.pressed.punch ? 'p' : 'k';
          this.boost = Math.min(100, this.boost + (k !== this.last ? 15 : 5));
          this.last = k;
        }
        this.boost = Math.max(0, this.boost - 36 * dt);
        target = this.boost * 1.7;
        if (p.pressed.jump && this.x > RUN0 + 20) this.clava();
        // en el nivel suave, si no la clavó, la clava sola en la cajita
        else if (ajustes().sinNulo && this.x >= CAJA) this.clava();
      } else {
        target = this.cur.top * 2.6 * ajustes().cpuVel;
        if (this.x >= this.cpuClava) this.clava();
      }
      if (this.st === 'carrera') {
        this.v += Phaser.Math.Clamp(target - this.v, -200 * dt, 240 * dt);
        const dx = this.v * dt;
        this.x += dx;
        if (Math.floor(this.dist / 22) !== Math.floor((this.dist + dx) / 22)) efecto(this, 'polvo_correr_chico', this.x, TECHO);
        this.dist += dx;
        // la carrerita con la garrocha: los tres primeros cuadros, por distancia
        fig.anim.pos = (this.dist / 7) % 3;
        fig.refresh();
        if (Math.random() < dt * 4 && this.v > 30) this.sound.play(`paso_piedra_${Math.floor(Math.random() * 3)}`, { volume: human ? 0.18 : 0.06 });
        // se pasó del borde sin clavar: para abajo
        if (this.x > BORDE + 2) { this.x0 = this.x; this.xCae = this.x; this.cae('¡SE PASÓ DEL BORDE!'); }
      }
    } else if (this.st === 'salto') {
      const k = this.skip ? 2 : 1;
      fig.step(dt * k);
      const f = fig.anim.frame;
      // el empuje: SALTO otra vez arriba del todo (de la subida al suelte)
      if (human && p.pressed.jump && !this.intentoEmpuje && f >= CLAVA + 1) {
        this.intentoEmpuje = true;
        if (f >= 5 && f <= 8) this.empujar();
      }
      if (!human && this.cpuEmpuja && !this.intentoEmpuje && f >= 6) { this.intentoEmpuje = true; this.empujar(); }
      const u = Phaser.Math.Clamp((fig.anim.pos - CLAVA) / (ATERRIZA - CLAVA), 0, 1);
      this.x = this.x0 + (this.xCae - this.x0) * (u * u * (3 - 2 * u));
      this.y = TECHO - (fig.anim.data.elevacion?.[f] ?? 0) * 1.4;
      if (f >= ATERRIZA - 1 && this.xCae < this.enfrente.x) { this.cae(null); return; }
      if (f >= ATERRIZA && this.st === 'salto' && !this.marcado) {
        this.marcado = true;
        efecto(this, 'polvo_caer_medio', this.x, TECHO);
        this.sound.play('golpe', { volume: human ? 0.35 : 0.12, rate: 0.8 });
      }
      if (fig.anim.done) this.cierra((this.xCae - BORDE) / PX_M, null);
    } else if (this.st === 'cae') this.cayendo(dt);
    fig.setPosition(Math.round(this.x), Math.round(this.y)).setDepth(TECHO + 1);
  }

  private marcado = false;

  /** Le toca al siguiente: sale a la azotea con la garrocha. */
  private prepara() {
    this.cur = this.gente2[this.turno];
    this.x = RUN0; this.y = TECHO; this.v = 0; this.boost = 0; this.dist = 0; this.skip = false; this.marcado = false;
    this.empuje = false; this.intentoEmpuje = false; this.caida = null;
    this.cur.fig.row = 'right';
    this.cur.fig.set('pole_vault', true);
    this.cur.fig.anim.speed = 0;
    this.cur.fig.setPosition(RUN0, TECHO).setAngle(0);
    // el viento de este salto: las banderitas lo muestran
    this.viento = this.d.practica && this.saltos < 2 ? 0 : Math.round((Math.random() * 3 - 1.5) * 10) / 10;
    // la máquina clava cerca de la cajita, más fino en NEKKETSU, y a veces empuja
    const fino = 1 - ajustes().cpuAgresion * 0.6;
    this.cpuClava = CAJA + (Math.random() * 2 - 1) * 22 * fino + (Math.random() < 0.04 ? 30 : 0);
    this.cpuEmpuja = Math.random() < 0.3 + ajustes().cpuAgresion * 0.4;
    this.camX = RUN0 + 100;
    const intento = this.d.practica ? `SALTO ${this.saltos + 1}` : `RONDA ${this.ronda + 1} DE ${INTENTOS} · ${this.hueco.toFixed(1)} M`;
    const t = this.uiAdd(txt(this, 320, this.d.practica ? 150 : 84, `${this.nombre(this.cur.c.id)} · ${intento}`, 'fuente_ui', 2).setDepth(8500).setTint(this.cur.c.human ? 0xffe040 : this.cur.c.team === 0 ? 0x9ac8ff : 0xffa0a0));
    this.time.delayedCall(1300, () => t.destroy());
    this.st = 'carrera';
    if (this.cur.c.human && this.ronda > 0) {
      const m = Math.max(...this.gente2.map((s) => s.best));
      if (m > 0) {
        const b = this.uiAdd(txt(this, 320, 104, `MARCA A BATIR: ${m.toFixed(2)} M`, 'fuente_ui', 1).setDepth(8500).setTint(0xf2c230));
        this.time.delayedCall(1800, () => b.destroy());
      }
    }
  }

  /**
   * Clava la garrocha. Lo bien que la clava depende de qué tan cerca de la cajita: tarde o temprano pierde impulso.
   * La distancia sale de la velocidad, de la clavada, del viento y del empuje.
   */
  private clava() {
    const off = this.x - CAJA;
    this.eff = Phaser.Math.Clamp(1 - Math.max(0, Math.abs(off) - 4) / 50, 0.35, 1);
    if (this.cur.c.human && ajustes().sinNulo) this.eff = Math.max(this.eff, 0.75);
    this.x0 = this.x;
    this.xCae = this.x0 + this.alcance();
    this.st = 'salto';
    this.saltos++;
    const fig = this.cur.fig;
    fig.anim.pos = CLAVA;
    fig.anim.speed = 1;
    fig.refresh();
    const que = this.eff > 0.92 ? '¡PERFECTA!' : off < 0 ? (this.eff > 0.7 ? '¡TEMPRANITO!' : '¡MUY TEMPRANO!') : this.eff > 0.7 ? '¡JUSTITO!' : '¡TARDE!';
    if (this.cur.c.human) {
      chip.blip(this.eff > 0.92 ? 1320 : 660, 0.1, 'sq25', 0.18, this.eff > 0.92 ? 1760 : 880);
      const t = this.add.bitmapText(this.x, TECHO - 52, 'fuente_ui', que).setOrigin(0.5).setDepth(6000).setTint(this.eff > 0.92 ? 0x8aff8a : 0xffe080);
      this.tweens.add({ targets: t, y: t.y - 10, alpha: 0, delay: 500, duration: 400, onComplete: () => t.destroy() });
    }
    this.sound.play('esquiva', { volume: this.cur.c.human ? 0.4 : 0.15, rate: 0.8 });
  }

  private alcance() {
    return (24 + this.v * 0.4) * this.eff * (1 + this.viento * 0.04) * (this.empuje ? 1.08 : 1);
  }

  private empujar() {
    this.empuje = true;
    this.xCae = this.x0 + this.alcance();
    if (!this.cur.c.human) return;
    chip.blip(990, 0.12, 'sq25', 0.2, 1480);
    const t = this.add.bitmapText(this.x, this.y - 56, 'fuente_ui', '¡EMPUJE!').setOrigin(0.5).setDepth(6000).setTint(0x8ae0ff);
    this.tweens.add({ targets: t, y: t.y - 10, alpha: 0, delay: 400, duration: 400, onComplete: () => t.destroy() });
  }

  /** No llegó: sigue de largo y cae según lo corto que se quedó. */
  private cae(msg: string | null) {
    const corto = this.enfrente.x - this.xCae;
    const tipo: Caida = msg ? 'palenquera' : corto < 14 ? 'balcon' : corto < 30 ? 'carrito' : 'palenquera';
    const hasta = tipo === 'balcon' ? TECHO + 44 : tipo === 'carrito' ? CALLE - 16 : CALLE;
    const destino = tipo === 'balcon' ? this.enfrente.x - 8 : tipo === 'carrito' ? this.carrito.x : BORDE + 6;
    this.caida = { tipo, vy: -20, vx: (destino - this.x) / 0.55, hasta };
    this.st = 'cae';
    this.cur.fig.set('jump_fall', true);
    if (msg) this.aviso(msg, 0xff8060);
    if (this.cur.c.human) chip.blip(520, 0.4, 'tri', 0.2, 130);
  }

  private cayendo(dt: number) {
    const c = this.caida!;
    this.cur.fig.step(dt);
    c.vy += 620 * dt;
    this.y += c.vy * dt;
    this.x += c.vx * dt;
    c.vx *= Math.pow(0.2, dt);
    if (this.y < c.hasta) return;
    this.y = c.hasta;
    this.caida = null;
    this.st = 'marca';
    const fig = this.cur.fig;
    fig.row = 'right';
    this.cameras.main.shake(120, 0.005);
    this.sound.play('golpe', { volume: this.cur.c.human ? 0.45 : 0.2, rate: 0.7 });
    if (c.tipo === 'balcon') {
      fig.set('land', true);
      for (let i = 0; i < 6; i++) efecto(this, 'petalo_buganvilla', this.x - 8 + Math.random() * 16, this.y - 10 - Math.random() * 10, { depth: 6000 });
      this.aviso('¡SE QUEDÓ EN EL BALCÓN DE LAS BUGANVILLAS!', 0xf070b0);
    } else if (c.tipo === 'carrito') {
      fig.set('land_flat', true);
      // las frutas vuelan
      for (let i = 0; i < 10; i++) {
        const col = [0xf2c230, 0xe83a3a, 0xf2902a, 0x4ac03a][i % 4];
        const f = this.add.circle(this.x, this.y - 6, 2, col).setDepth(6000);
        this.tweens.add({ targets: f, x: f.x + (Math.random() - 0.5) * 60, y: CALLE - 1, duration: 500 + Math.random() * 300, ease: 'Bounce.out' });
        this.time.delayedCall(2500, () => f.destroy());
      }
      this.aviso('¡CAYÓ EN EL CARRITO DE FRUTAS!', 0xf2c230);
    } else {
      fig.set('land_flat', true);
      efecto(this, 'polvo_caer_grande', this.x, this.y);
      // la palenquera lo regaña
      this.tweens.add({ targets: this.palenquera, angle: { from: -8, to: 8 }, duration: 120, yoyo: true, repeat: 4, onComplete: () => this.palenquera.setAngle(0) });
      const b = this.add.bitmapText(this.palenquera.x + 20, CALLE - 44, 'fuente_ui', '¡AY, MIJO! ¿Y ESE BRINCO?').setY(CALLE - 54).setOrigin(0.5).setDepth(6000).setTint(0xffffff);
      const g = this.add.graphics().setDepth(5999);
      g.fillStyle(0x2a1a2a, 0.85).fillRoundedRect(b.x - b.width / 2 - 4, b.y - 7, b.width + 8, 14, 3);
      this.time.delayedCall(1900, () => { b.destroy(); g.destroy(); });
      efecto(this, 'vena_enojo', this.palenquera.x + 8, CALLE - 30, { depth: 6000 });
    }
    this.time.delayedCall(this.skip ? 400 : 900, () => this.cierra(0, c.tipo));
  }

  private aviso(s: string, tint: number) {
    const t = this.uiAdd(txt(this, 320, 104, s, 'fuente_ui', 2).setDepth(8500).setTint(tint));
    this.time.delayedCall(1700, () => t.destroy());
  }

  /** Anota el salto (0 si no llegó) y pasa al siguiente. */
  private cierra(m: number, cayo: Caida | null) {
    this.st = 'marca';
    const s = this.cur;
    s.marcas.push(m);
    if (this.d.practica && s.marcas.length > INTENTOS) s.marcas.shift();
    const record = m > s.best && m > 0;
    s.best = Math.max(s.best, m);
    const label = cayo ? '¡NO LLEGÓ!' : `${m.toFixed(2)} M`;
    const t = this.uiAdd(txt(this, 320, this.d.practica ? 200 : 130, label, 'fuente_titulo', 2).setDepth(8500).setTint(cayo ? 0xff6060 : 0xffffff));
    this.tweens.add({ targets: t, scale: { from: 4, to: 2 }, duration: 240, ease: 'Back.out' });
    if (cayo) { chip.blip(220, 0.3, 'sq50', 0.25, 110); }
    else {
      s.fig.set(record && s.c.human ? 'celebrate' : 'idle', true);
      s.fig.row = 'down_right';
      if (s.c.human && record) {
        flash(this, 100); chip.blip(1320, 0.2, 'sq25', 0.2, 1760);
        const b = efecto(this, 'brillo_record', this.x, TECHO - 20, { depth: 6000 });
        if (b) this.time.delayedCall(1600, () => b.destroy());
      }
    }
    this.time.delayedCall(this.skip ? 900 : 1800, () => {
      t.destroy();
      if (this.fase !== 'juego') return;
      this.esperando(s);
      this.turno++;
      if (this.turno >= this.gente2.length) {
        this.turno = 0;
        this.ronda++;
        // el techo de enfrente se aleja
        if (!this.d.practica && this.ronda < INTENTOS) {
          this.ponerHueco(HUECOS[this.ronda]);
          this.aviso(`¡EL TECHO SE ALEJA! AHORA ${HUECOS[this.ronda].toFixed(1)} M`, 0xffe080);
        }
      }
      if (this.ronda >= INTENTOS && !this.d.practica) this.final();
      else this.st = 'espera';
    });
  }

  private final() {
    this.fase = 'fin';
    const orden = [...this.gente2].sort((a, b) => b.best - a.best).map((s) => ({ c: s.c, valor: s.best > 0 ? `${s.best.toFixed(2)} M` : 'NO LLEGÓ' }));
    this.camX = RUN0 + 100;
    this.resultados(prueba('Azoteas').nombre, orden);
  }

  /** Las banderitas flamean para el lado del viento, más largas con más viento. */
  private flamear() {
    const t = this.time.now / 1000;
    for (const [i, g] of this.banderas.entries()) {
      g.clear();
      const dir = this.viento >= 0 ? 1 : -1, largo = 6 + Math.abs(this.viento) * 5;
      const cols = [0xf2d230, 0x2a3aa0, 0xd02a2a];
      for (let k = 0; k < 3; k++) {
        const ola = Math.sin(t * 8 + i + k) * (1 + Math.abs(this.viento));
        g.fillStyle(cols[k]).fillTriangle(0, k * 4, 0, k * 4 + 4, dir * largo, k * 4 + 2 + ola);
      }
    }
  }

  private camera(dt: number) {
    let want = this.camX;
    if (this.st === 'carrera' || this.st === 'salto' || this.st === 'cae') want = this.x + (this.st === 'carrera' ? 90 : 30);
    this.camX += (want - this.camX) * Math.min(1, dt * 5);
    const cam = this.cameras.main;
    cam.centerOn(this.camX, 360 - 180 / ZOOM);
    this.bg.tilePositionX = cam.scrollX * 0.2;
  }

  private marcasTxt: Phaser.GameObjects.BitmapText[][] = [];
  private hudListo = false;
  private vientoTxt!: Phaser.GameObjects.BitmapText;
  private carreraTxt!: Phaser.GameObjects.BitmapText;
  private cajaTxt!: Phaser.GameObjects.BitmapText;

  /** Tablero de marcas y medidores: se arman una vez y se actualizan. */
  private buildHud() {
    this.hudListo = true;
    this.marcasTxt = [];
    if (!this.d.practica) this.gente2.forEach((s, i) => {
      const y = 18 + i * 16;
      this.uiAdd(this.add.image(20, y, 'cabecitas', s.c.id).setDepth(8001));
      this.uiAdd(txt(this, 32, y, this.nombre(s.c.id), 'fuente_ui', 1, 0).setDepth(8001).setTint(s.c.human ? 0xffe040 : s.c.team === 0 ? 0x9ac8ff : 0xffa0a0));
      this.marcasTxt.push(Array.from({ length: INTENTOS }, (_, r) => this.uiAdd(txt(this, 140 + r * 40, y, '-', 'fuente_ui', 1, 1).setDepth(8001))));
    });
    this.vientoTxt = this.uiAdd(txt(this, 626, 14, '', 'fuente_ui', 1, 1).setDepth(8001));
    this.carreraTxt = this.uiAdd(txt(this, 66, 326, 'CARRERA', 'fuente_ui', 1).setDepth(8001));
    this.cajaTxt = this.uiAdd(txt(this, 320, 300, '¡CLAVA EN LA CAJITA!', 'fuente_ui', 2).setDepth(8001).setTint(0xffe040));
  }

  private drawHud() {
    const g = this.hud;
    g.clear();
    if (!this.hudListo) this.buildHud();
    // entrenando, el cartel del coach va arriba y no hay tablero
    if (!this.d.practica) g.fillStyle(0x000000, 0.55).fillRect(8, 8, 218, 70);
    this.gente2.forEach((s, i) => this.marcasTxt[i]?.forEach((t, r) => {
      const m = s.marcas[r];
      t.setText(m === undefined ? '-' : m > 0 ? m.toFixed(1) : 'X').setTint(m === 0 ? 0xff6060 : 0xffffff);
    }));
    const v = this.viento;
    this.vientoTxt.setText(this.fase === 'juego' ? `VIENTO ${v > 0 ? '+' : ''}${v.toFixed(1)}` : '').setTint(v > 0.3 ? 0x8aff8a : v < -0.3 ? 0xff8a8a : 0xffffff);
    const show = !!this.cur?.c.human && this.st === 'carrera' && this.fase === 'juego';
    this.carreraTxt.setVisible(show);
    this.cajaTxt.setVisible(show && this.x > CAJA - 70);
    if (!show) return;
    g.fillStyle(0x000000, 0.6).fillRect(14, 334, 104, 12);
    g.fillStyle(this.boost > 70 ? 0xff6040 : 0xf2c230).fillRect(16, 336, this.boost, 8);
  }
}
