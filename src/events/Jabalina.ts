import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { chip, PELEA } from '../core/music';
import { txt, flash } from '../core/ui';
import { Painter, hex } from '../gfx/paint';
import { EventScene, PRUEBAS_GIRA, type Competidor } from './base';
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

interface Lanzador { c: Competidor; fig: Figura; best: number; marcas: number[]; top: number }
interface Vuelo { x: number; z: number; vx: number; vz: number; img: Phaser.GameObjects.Image; sombra: Phaser.GameObjects.Ellipse }

/**
 * Jabalina llanera: carrerita alternando botones, mantén SALTO para subir el ángulo y suéltalo para lanzar.
 * Si pisas la raya es nulo. Dos intentos, cuenta el mejor.
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
  private hud!: Phaser.GameObjects.Graphics;
  private bg!: Phaser.GameObjects.TileSprite;
  private camX = RUN0;
  private skip = false;

  constructor() { super('Jabalina'); }

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
    this.bg = this.fondo('bg_llanos');
    this.add.image(0, TOP - 6, 'campo').setOrigin(0, 0).setDepth(-5);
    for (let m = 10; m * PX_M + FOUL < WORLD - 20; m += 10) this.add.bitmapText(FOUL + m * PX_M, TOP + 112, 'fuente_ui', `${m}`).setOrigin(0.5).setDepth(-4).setTint(0xf4f0e8);
    // el orden: primero los de la máquina, de último tú (así sabes la marca a batir)
    const orden = this.d.practica ? [this.gente[0]] : [this.gente[1], this.gente[2], this.gente[3], this.gente[0]];
    orden.forEach((c, i) => {
      const fig = new Figura(this, 0, 0, c.id, 'idle');
      fig.anim.prefer = 'atletismo';
      fig.set('idle');
      fig.row = 'down_right';
      const top = c.id === 'tetsu' || c.id === 'goro' ? 66 : c.id === 'kenji' ? 62 : 56;
      this.gente2.push({ c, fig, best: 0, marcas: [], top });
      fig.setPosition(18 + i * 13, TOP + (WAIT_Y[i % 3] ?? 42));
    });
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    chip.play(PELEA);
    this.cameras.main.centerOn(this.camX, 360 - 180 / ZOOM);
    if (this.d.practica) void this.entrenar('JABALINA LLANERA', this.pasos(), 100);
    else void this.previa('JABALINA LLANERA', 'LLANOS DE APURE, VENEZUELA', 'ALTERNA {PUÑO} Y {PATADA} PARA CORRER · MANTÉN {SALTO} Y SUELTA PARA LANZAR');
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
    const j = new Painter(30, 3);
    j.rect(0, 1, 30, 1, hex('#e8e8f0'));
    j.rect(12, 0, 6, 3, hex('#d02a2a'));
    j.rect(27, 1, 3, 1, hex('#606070'));
    this.textures.addCanvas('jabalina', j.done());
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    const p = this.pad.read();
    if (this.endTick(p)) { for (const l of this.gente2) l.fig.step(dt); this.filterUi(); return; }
    for (const l of this.gente2) if (l !== this.cur || this.st === 'espera') l.fig.step(dt);
    if (this.fase === 'juego') this.tick(dt, p);
    this.coach?.tick(dt);
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
        this.boost = Math.max(0, this.boost - 36 * dt);
        target = this.boost * 1.7;
        if (p.held.jump) {
          if (!this.holding) { this.holding = true; this.angT = 0; }
          this.angT += dt;
          // sube de 10 a 60 grados y baja otra vez, por si te pasas
          this.ang = 10 + 50 * Math.abs(Math.sin(this.angT * 1.6));
        } else if (this.holding) this.lanza();
      } else {
        target = this.cur.top * 2.6;
        if (this.x >= this.cpuSuelta) { this.ang = this.cpuAng; this.lanza(); }
      }
      this.v += Phaser.Math.Clamp(target - this.v, -200 * dt, 240 * dt);
      const dx = this.v * dt;
      this.x += dx;
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
    this.camX = RUN0 + 100;
    const intento = this.d.practica ? `INTENTO ${this.ronda + 1}` : `INTENTO ${this.ronda + 1} DE ${INTENTOS}`;
    const t = this.uiAdd(txt(this, 320, 84, `${this.nombre(this.cur.c.id)} · ${intento}`, 'fuente_ui', 2).setDepth(8500).setTint(this.cur.c.human ? 0xffe040 : this.cur.c.team === 0 ? 0x9ac8ff : 0xffa0a0));
    this.time.delayedCall(1300, () => t.destroy());
    this.st = 'carrera';
    if (this.cur.c.human && this.ronda === 0) {
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
    this.cur.fig.anim.pos = 4;
    this.cur.fig.anim.speed = 1;
    if (this.cur.c.human) chip.blip(440, 0.1, 'sq25', 0.18, 880);
  }

  private suelta([px, py]: [number, number]) {
    if (this.x > FOUL) this.nulo = true;
    const fuerza = 120 + this.vLanza * 2.1;
    const a = Phaser.Math.DegToRad(this.nulo && this.ang === 0 ? 20 : this.ang);
    const x = this.x + px, z = -py;
    const img = this.add.image(x, TOP + RUN_Y - z, 'jabalina').setOrigin(0.6, 0.5);
    const sombra = this.add.ellipse(x, TOP + RUN_Y, 22, 2, 0x000000, 0.3).setDepth(TOP + RUN_Y - 1);
    this.vuelo = { x, z, vx: Math.cos(a) * fuerza, vz: Math.sin(a) * fuerza, img, sombra };
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
      f.sombra.destroy();
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
    l.best = Math.max(l.best, m);
    const s = this.nulo ? '¡NULO!' : `${m.toFixed(2)} M`;
    const t = this.uiAdd(txt(this, 320, this.d.practica ? 200 : 130, s, 'fuente_titulo', 2).setDepth(8500).setTint(this.nulo ? 0xff6060 : 0xffffff));
    this.tweens.add({ targets: t, scale: { from: 4, to: 2 }, duration: 240, ease: 'Back.out' });
    if (this.nulo) { chip.blip(220, 0.3, 'sq50', 0.25, 110); l.fig.set('sad', true); }
    else if (l.c.human && record) { flash(this, 100); chip.blip(1320, 0.2, 'sq25', 0.2, 1760); l.fig.set('celebrate', true); }
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

  private final() {
    this.fase = 'fin';
    const orden = [...this.gente2].sort((a, b) => b.best - a.best).map((l) => ({ c: l.c, valor: l.best > 0 ? `${l.best.toFixed(2)} M` : 'NULO' }));
    this.camX = RUN0 + 100;
    this.resultados(PRUEBAS_GIRA[2].nombre, orden);
  }

  private camera(dt: number) {
    let want = this.camX;
    if (this.vuelo) want = this.vuelo.x;
    else if (this.st === 'carrera' || this.st === 'lanza') want = this.x + 90;
    else if (this.st === 'marca') want = this.camX;
    this.camX += (want - this.camX) * Math.min(1, dt * (this.vuelo ? 10 : 4));
    const cam = this.cameras.main;
    cam.centerOn(this.camX, 360 - 180 / ZOOM);
    this.bg.tilePositionX = cam.scrollX * 0.2;
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
    this.carreraTxt = this.uiAdd(txt(this, 66, 326, 'CARRERA', 'fuente_ui', 1).setDepth(8001));
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
    const cx = 160, cy = 344;
    g.lineStyle(1, 0xffffff, 0.5).beginPath().arc(cx, cy, 30, Phaser.Math.DegToRad(-90), 0).strokePath();
    g.lineStyle(1, 0x40ff80, 0.6).lineBetween(cx, cy, cx + Math.cos(Phaser.Math.DegToRad(-42)) * 30, cy + Math.sin(Phaser.Math.DegToRad(-42)) * 30);
    if (this.holding) {
      g.lineStyle(3, 0xffe040).lineBetween(cx, cy, cx + Math.cos(Phaser.Math.DegToRad(-this.ang)) * 32, cy + Math.sin(Phaser.Math.DegToRad(-this.ang)) * 32);
      this.angTxt.setText(`${Math.round(this.ang)}°`);
    }
  }
}
