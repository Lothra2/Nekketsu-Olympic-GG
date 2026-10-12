import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { ajustes, goma } from '../core/nivel';
import { efecto } from '../core/fx';
import { chip, PELEA } from '../core/music';
import { txt, flash } from '../core/ui';
import { Painter, hex } from '../gfx/paint';
import { EventScene, prueba, type Competidor } from './base';
import type { Paso } from '../core/coach';

const WORLD = 1460;
const TOP = 226;
/** superficie del agua de cada carril, contada desde TOP */
const LANES = [24, 50, 76, 102];
const BLOCK = 112;
const START = BLOCK + 8;
const FINISH = 1360;
const ZOOM = 1.5;
/** el kit marca la superficie del agua en la fila 40 de la celda: 6 pixeles sobre el pivote */
const AGUA = 6;

interface Swimmer {
  c: Competidor; fig: Figura; x: number; lane: number; v: number; boost: number; last: string;
  st: 'set' | 'dive' | 'swim' | 'done'; t: number; time: number; react: number; top: number; falso: boolean; jalon: number;
  /** la estela detrás al nadar y las ondas al llegar (efectos del kit) */
  estela?: Phaser.GameObjects.Sprite | null; ondas?: Phaser.GameObjects.Sprite | null;
}

/** Natación Hạ Long: 50 metros libres en una piscina flotante en la bahía. Salida en falso castiga. */
export class Natacion extends EventScene {
  private swimmers: Swimmer[] = [];
  private clock = 0;
  private hud!: Phaser.GameObjects.Graphics;
  private timeTxt!: Phaser.GameObjects.BitmapText;
  private bg!: Phaser.GameObjects.TileSprite;
  private water: Phaser.GameObjects.Graphics[] = [];
  private splash!: Phaser.GameObjects.Particles.ParticleEmitter;
  private armed = false;
  private heads: { img: Phaser.GameObjects.Image; s: Swimmer }[] = [];

  constructor() { super('Natacion'); }

  create() {
    this.swimmers = [];
    this.water = [];
    this.heads = [];
    this.clock = 0;
    this.armed = false;
    this.setup(ZOOM, WORLD);
    this.makeTextures();
    this.bg = this.fondo('bg_halong');
    this.add.image(0, TOP - 6, 'piscina').setOrigin(0, 0).setDepth(-5);
    // una capa de agua delante de cada carril: tapa lo que va bajo la superficie
    LANES.forEach((y, i) => {
      const g = this.add.graphics().setDepth(TOP + y + 1);
      g.fillStyle(0x1f7fb8, 0.62).fillRect(START - 2, TOP + y, FINISH - START + 2, 12);
      g.fillStyle(0x9ad8f0, 0.7);
      for (let x = START + (i * 7) % 13; x < FINISH; x += 13) g.fillRect(x, TOP + y, 4, 1);
      this.water.push(g);
      this.add.image(BLOCK, TOP + y + 2, 'poyete').setOrigin(0.5, 1).setDepth(TOP + y - 2);
      this.add.bitmapText(BLOCK, TOP + y - 3, 'fuente_ui', `${i + 1}`).setOrigin(0.5).setDepth(TOP + y - 1).setTint(0x101830).setScale(0.5);
    });
    this.splash = this.add.particles(0, 0, 'px', {
      speed: { min: 20, max: 70 }, angle: { min: 200, max: 340 }, gravityY: 260, lifespan: 420, scale: { start: 1, end: 0.4 },
      tint: [0xffffff, 0xc8ecff, 0x9ad8f0], emitting: false,
    }).setDepth(900);

    this.gente.forEach((c, k) => {
      const i = this.d.practica ? 1 : k;
      const fig = new Figura(this, BLOCK, 0, c.id, 'idle');
      fig.anim.prefer = 'natacion';
      fig.set('dive', true);
      fig.anim.speed = 0;
      const top = c.human ? 0 : c.id === 'ryu' || c.id === 'steph' ? 112 : c.id === 'goro' ? 96 : 104;
      this.swimmers.push({ c, fig, x: BLOCK - 2, lane: i, v: 0, boost: 0, last: '', st: 'set', t: 0, time: 0, react: 0.1 + Math.random() * 0.25, top, falso: false, jalon: 0 });
    });
    this.cameras.main.centerOn(START + 110, 360 - 180 / ZOOM);
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.timeTxt = this.uiAdd(txt(this, 626, 14, '0.00', 'fuente_ui', 2, 1).setDepth(8001));
    for (const s of this.swimmers) this.heads.push({ img: this.uiAdd(this.add.image(0, 22, 'cabecitas', s.c.id).setDepth(8002)), s });
    this.uiAdd(txt(this, 66, 326, 'BRAZADA', 'fuente_ui', 1).setDepth(8001));
    chip.play(PELEA);
    // el agua de la bahía de fondo, suavecito, mientras dure la prueba
    if (this.cache.audio.exists('amb_agua')) {
      const amb = this.sound.add('amb_agua', { loop: true, volume: 0.16 });
      amb.play();
      this.events.once('shutdown', () => amb.destroy());
    }
    this.time.delayedCall(2200, () => { this.armed = true; });
    if (this.d.practica) void this.entrenar('NATACIÓN HẠ LONG', this.pasos());
    else void this.previa('NATACIÓN HẠ LONG', 'BAHÍA DE HẠ LONG, VIETNAM', '{SALTO} PARA LANZARTE · ALTERNA {PUÑO} Y {PATADA} · {ESPECIAL} DELFÍN');
  }

  private pasos(): Paso[] {
    const me = () => this.swimmers[0];
    return [
      { texto: 'TOCA {SALTO} PARA TIRARTE AL AGUA\nEN LA CARRERA, ESPERA EL ¡YA!', botones: ['jump'], listo: () => me().st === 'swim' },
      { texto: 'ALTERNA {PUÑO} Y {PATADA} PARA NADAR\nMIENTRAS MÁS RÁPIDO, MEJOR', botones: ['punch', 'kick'], listo: () => me().boost > 45 },
      { texto: 'TOCA {ESPECIAL}: PATADA DE DELFÍN\nCUANDO LA BARRA VERDE ESTÉ LLENA', botones: ['special'], listo: () => me().jalon > 0 },
      { texto: 'SIGUE NADANDO\nHASTA TOCAR LA PARED', botones: ['punch', 'kick'], listo: () => me().st === 'done' },
    ];
  }

  private makeTextures() {
    if (this.textures.exists('piscina')) return;
    const H = 124;
    const p = new Painter(WORLD, H);
    // madera del muelle flotante y el agua de la piscina
    p.rect(0, 0, WORLD, H, hex('#8a5a32'));
    for (let y = 0; y < H; y += 6) p.rect(0, y, WORLD, 1, hex('#6a4224'));
    for (let x = 0; x < WORLD; x += 37) for (let y = 0; y < H; y += 6) p.px(x + (y % 12), y + 3, hex('#5a361c'));
    p.rect(START - 4, 6, FINISH - START + 8, H - 12, hex('#e8ecf0'));
    p.vgrad(8, H - 8, [hex('#3aa8d8'), hex('#2a8ac4'), hex('#1a6aa0')], START - 2, FINISH + 2);
    for (let i = 0; i < 1400; i++) p.px(START + Math.random() * (FINISH - START), 8 + Math.random() * (H - 16), Math.random() < 0.5 ? hex('#5ac0e8') : hex('#2a88c0'));
    // corcheras rojas y blancas entre carriles
    for (const y of [36, 62, 88]) for (let x = START; x < FINISH; x += 4) p.rect(x, y + 6, 3, 2, Math.floor((x - START) / 4) % 3 === 0 ? hex('#f4f4f4') : hex('#d02a2a'));
    // marca de 15 metros y la pared de llegada
    const m15 = START + (FINISH - START) * 0.3;
    for (let y = 8; y < H - 8; y += 3) p.px(m15, y, hex('#f2c230'));
    p.rect(FINISH, 6, 10, H - 12, hex('#d8dce4'));
    for (let y = 8; y < H - 8; y += 4) p.rect(FINISH + 2, y, 6, 2, Math.floor(y / 4) % 2 ? hex('#101010') : hex('#f2c230'));
    this.textures.addCanvas('piscina', p.done());
    const b = new Painter(16, 14);
    b.rect(1, 0, 14, 4, hex('#f4f4f4'));
    b.rect(1, 3, 14, 1, hex('#b8bcc8'));
    b.rect(3, 4, 3, 10, hex('#a8acb8'));
    b.rect(10, 4, 3, 10, hex('#a8acb8'));
    b.rect(2, 0, 12, 1, hex('#2a5bd7'));
    this.textures.addCanvas('poyete', b.done());
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    const p = this.pad.read();
    if (this.endTick(p)) { for (const s of this.swimmers) s.fig.step(dt); this.render(); this.filterUi(); return; }
    // salida en falso: tirarse antes del ¡YA!
    const me = this.swimmers[0];
    if (this.fase === 'previa' && this.armed && !me.falso && !ajustes().sinFalso && (p.pressed.jump || p.pressed.punch || p.pressed.kick)) {
      me.falso = true;
      chip.blip(220, 0.3, 'sq50', 0.25, 110);
      const t = this.uiAdd(txt(this, 320, 210, '¡SALIDA EN FALSO! · TE QUEDAS UN SEGUNDO', 'fuente_ui', 2).setDepth(8600).setTint(0xff6060));
      this.time.delayedCall(1800, () => t.destroy());
    }
    if (this.fase === 'juego') this.clock += dt;
    this.coach?.tick(dt);
    for (const s of this.swimmers) this.swimmer(s, dt, p);
    this.render();
    if (this.fase === 'juego') this.checkEnd();
    this.filterUi();
  }

  private swimmer(s: Swimmer, dt: number, p: ReturnType<typeof this.pad.read>) {
    s.t += dt;
    if (s.jalon > 0) s.jalon -= dt;
    if (s.st === 'set') {
      if (this.fase !== 'juego') return;
      const go = s.c.human ? (p.pressed.jump || p.pressed.punch || p.pressed.kick) && this.clock >= (s.falso ? 1 : 0) : this.clock >= s.react;
      if (go) { s.st = 'dive'; s.t = 0; s.fig.set('dive', true); s.react = this.clock; }
      return;
    }
    if (s.st === 'dive') {
      const before = s.fig.anim.pos;
      const ev = s.fig.step(dt);
      const d = s.fig.anim.data.desplazamiento ?? [];
      const a = Math.floor(before), b = s.fig.anim.frame;
      if (b > a) s.x += ((d[b] ?? 0) - (d[a] ?? 0)) * 1.6;
      if (ev.some((e) => e.tipo === 'impacto')) {
        s.v = 120;
        if (!efecto(this, 'chapuzon_grande', s.x + 8, TOP + LANES[s.lane], { depth: TOP + LANES[s.lane] + 3 })) this.splash.explode(s.c.human ? 26 : 12, s.x + 8, TOP + LANES[s.lane]);
        this.sound.play('esquiva', { volume: s.c.human ? 0.5 : 0.15, rate: 0.6 });
      }
      if (s.fig.anim.frame >= 6) s.x += s.v * dt;
      if (s.fig.anim.done) { s.st = 'swim'; s.fig.set('swim', true); }
      return;
    }
    if (s.st === 'done') {
      s.v = Math.max(0, s.v - 200 * dt);
      s.fig.step(dt);
      return;
    }
    let target: number;
    if (s.c.human) {
      if (p.pressed.punch || p.pressed.kick) {
        const k = p.pressed.punch ? 'p' : 'k';
        s.boost = Math.min(100, s.boost + (k !== s.last ? 14 : 4));
        s.last = k;
      }
      s.boost = Math.max(0, s.boost - 38 * dt);
      target = 18 + s.boost * 1.02;
      if (p.pressed.special && s.jalon <= 0) this.delfin(s);
    } else {
      target = (s.top + Math.sin(s.t * 1.7 + s.react * 30) * 8) * ajustes().cpuVel * goma(s.x - this.swimmers[0].x);
      if (s.jalon <= 0 && Math.random() < 0.25 * ajustes().cpuAgresion * dt) this.delfin(s);
    }
    if (s.jalon > 2.2) target += 70;
    s.v += Phaser.Math.Clamp(target - s.v, -120 * dt, 140 * dt);
    const dx = s.v * dt;
    s.x += dx;
    const want = s.jalon > 2.2 ? 'swim_fly' : s.v < 20 ? 'tread_water' : 'swim';
    if (s.fig.anim.name !== want) s.fig.set(want);
    s.fig.step(dt, want === 'tread_water' ? undefined : dx);
    if (s.v > 30 && Math.random() < dt * (s.c.human ? 14 : 6)) this.splash.explode(2, s.x + Phaser.Math.Between(-14, 10), TOP + LANES[s.lane]);
    if (s.x >= FINISH - 14) {
      s.x = FINISH - 14;
      s.st = 'done';
      s.time = this.clock;
      s.fig.set('tread_water', true);
      this.splash.explode(14, FINISH - 6, TOP + LANES[s.lane]);
      s.ondas = efecto(this, 'ondas', s.x, TOP + LANES[s.lane], { depth: TOP + LANES[s.lane] + 1.5, alpha: 0.8 });
      const lugar = this.swimmers.filter((o) => o.st === 'done').length;
      const t = txt(this, s.x - 4, TOP + LANES[s.lane] - 34, `${lugar}°`, 'fuente_titulo', 1).setDepth(6000);
      this.tweens.add({ targets: t, y: t.y - 8, duration: 400, ease: 'Back.out' });
      if (s.c.human) { flash(this, 120); chip.blip(1568, 0.3, 'sq25', 0.2, 2093); }
    }
  }

  /** Patada de delfín: un empujón fuerte, una vez cada tanto. */
  private delfin(s: Swimmer) {
    s.jalon = 3;
    this.splash.explode(s.c.human ? 20 : 8, s.x, TOP + LANES[s.lane]);
    if (s.c.human) {
      chip.blip(330, 0.2, 'tri', 0.2, 660);
      const t = txt(this, s.x, TOP + LANES[s.lane] - 40, '¡DELFÍN!', 'fuente_ui', 1).setDepth(6000).setTint(0x9ad8ff);
      this.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 700, onComplete: () => t.destroy() });
    }
  }

  private render() {
    for (const s of this.swimmers) {
      const surf = TOP + LANES[s.lane];
      const a = s.fig.anim;
      const el = a.name === 'dive' ? (a.data.elevacion?.[a.frame] ?? 0) : 0;
      // en el poyete y en el aire va por encima del agua; ya mojado se dibuja detrás de su capa de agua
      const wet = a.data.agua?.[a.frame] != null;
      s.fig.setPosition(Math.round(s.x), Math.round(surf + AGUA - el)).setDepth(wet ? surf : surf + 2);
      // la estela del kit detrás de quien nada rápido
      if (s.estela === undefined) s.estela = efecto(this, 'estela', s.x, surf, { depth: surf + 1.5 });
      s.estela?.setPosition(Math.round(s.x - 14), surf).setVisible(s.st === 'swim' && s.v > 30);
    }
    const me = this.swimmers[0];
    const cam = this.cameras.main;
    const cur = cam.midPoint.x || START;
    cam.centerOn(cur + (me.x + 60 - cur) * 0.12, 360 - 180 / ZOOM);
    this.bg.tilePositionX = cam.scrollX * 0.2;
    const g = this.hud;
    g.clear();
    g.fillStyle(0x000000, 0.55).fillRect(110, 14, 420, 16);
    g.lineStyle(1, 0x9ad8ff, 0.7).lineBetween(120, 22, 520, 22);
    g.fillStyle(0xf2c230).fillRect(519, 16, 2, 12);
    for (const h of this.heads) h.img.setPosition(120 + 400 * Phaser.Math.Clamp((h.s.x - START) / (FINISH - 14 - START), 0, 1), 22);
    this.timeTxt.setText(this.clock.toFixed(2));
    g.fillStyle(0x000000, 0.6).fillRect(14, 334, 104, 12);
    g.fillStyle(me.boost > 70 ? 0x40c0ff : 0x9ad8ff).fillRect(16, 336, me.boost, 8);
    g.fillStyle(0x000000, 0.6).fillRect(124, 334, 30, 12);
    g.fillStyle(me.jalon <= 0 ? 0x40ff80 : 0x406050).fillRect(126, 336, 26 * (1 - Math.max(0, me.jalon) / 3), 8);
  }

  private checkEnd() {
    const me = this.swimmers[0];
    if (this.d.practica) {
      if (me.st === 'done' && this.coach && !this.coach.done && !this.coach.ultimo) {
        me.st = 'swim'; me.x = START + 30; me.fig.set('swim', true);
        const t = this.uiAdd(txt(this, 320, 200, '¡OTRO LARGO!', 'fuente_titulo', 1).setDepth(8500));
        this.time.delayedCall(1000, () => t.destroy());
        for (const o of this.children.list) if ((o as Phaser.GameObjects.BitmapText).text === '1°') o.destroy();
      }
      return;
    }
    if (this.porTiempo(this.swimmers.map((s) => s.st === 'done'), me.st === 'done', this.clock)) {
      for (const s of this.swimmers) if (s.st !== 'done') { s.st = 'done'; s.time = this.clock + (FINISH - s.x) / 100; }
      const orden = [...this.swimmers].sort((a, b) => a.time - b.time).map((s) => ({ c: s.c, valor: `${s.time.toFixed(2)} S` }));
      this.resultados(prueba('Natacion').nombre, orden);
    }
  }
}
