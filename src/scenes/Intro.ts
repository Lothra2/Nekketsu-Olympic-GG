import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { chip, MARCHA, SAIGON, TENSION } from '../core/music';
import { txt, typewrite, wait, panel, flash, speedLines } from '../core/ui';
import { Input } from '../core/input';
import { buildLogo, fireworks } from './logo';

const FAMILIA = [
  { id: 'rick', nombre: 'RICK', apodo: 'EL CAPITÁN', tecnica: 'PUÑO MACH', color: 0x2a5bd7 },
  { id: 'steph', nombre: 'STEPH', apodo: 'LA VELOZ', tecnica: 'PATADA HURACÁN', color: 0xe86aa0 },
  { id: 'sophie', nombre: 'SOPHIE', apodo: 'LA ACRÓBATA', tecnica: 'CHILENA ASESINA', color: 0x3cc86a },
  { id: 'alana', nombre: 'ALANA', apodo: 'LA PEQUEÑA TERRIBLE', tecnica: '¡THOR AL RESCATE!', color: 0xff4fa0 },
];
const INSTITUTO = ['kenji', 'ryu', 'goro', 'tetsu'];

/** La intro: Japón, la gira, la Familia GG, los rivales, el puñetazo y el logo. Se salta con cualquier botón. */
export class Intro extends Phaser.Scene {
  private done = false;
  private input2!: Input;
  private layer!: Phaser.GameObjects.Container;
  private tick: ((dt: number) => void)[] = [];

  constructor() { super('Intro'); }

  create() {
    this.done = false;
    this.tick = [];
    this.input2 = new Input(this, false);
    this.layer = this.add.container(0, 0);
    this.makePlane();
    chip.play(TENSION, 1.5);
    void this.run();
    const skip = txt(this, 632, 352, 'SALTAR »', 'fuente_ui', 1, 1).setAlpha(0.6).setDepth(9999);
    skip.setInteractive().on('pointerdown', () => this.finish());
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, over: unknown[]) => { if (!over.length && this.time.now > 1500) this.finish(); });
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    const pad = this.input2.read();
    if (pad.pressed.start || pad.pressed.punch || pad.pressed.kick || pad.pressed.jump || pad.pressed.back) this.finish();
    for (const f of this.tick) f(dt);
  }

  private finish() {
    if (this.done) return;
    this.done = true;
    this.registry.set('marcha', true);
    if (!this.registry.get('marchaSonando')) { chip.play(MARCHA); this.registry.set('marchaSonando', true); }
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Title'));
  }

  /** Borra la toma anterior. */
  private clear() {
    this.layer.removeAll(true);
    this.tick = [];
    this.cameras.main.setScroll(0, 0);
    this.blinds();
  }

  /** Persianas retro: 12 franjas negras que se abren mostrando la toma nueva. */
  private blinds() {
    for (let i = 0; i < 12; i++) {
      const r = this.add.rectangle(320, i * 30 + 15, 640, 30, 0x000000).setDepth(9800);
      this.tweens.add({ targets: r, scaleY: 0, duration: 260, delay: i * 18, ease: 'Quad.in', onComplete: () => r.destroy() });
    }
  }

  private add2<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.layer.add(o);
    return o;
  }

  private fig(id: string, x: number, y: number, anim = 'idle', scale = 2): Figura {
    const f = new Figura(this, x, y, id, anim).setScale(scale);
    this.add2(f);
    this.tick.push((dt) => { if (f.active) f.step(dt); });
    return f;
  }

  private makePlane() {
    if (this.textures.exists('avion')) return;
    const g = this.add.graphics();
    const P = (x: number, y: number, w: number, h: number, c: number) => g.fillStyle(c).fillRect(x, y, w, h);
    P(2, 6, 22, 4, 0xf4f4f4); P(0, 7, 3, 2, 0xd0d0d0); P(22, 7, 3, 2, 0xd0202a);
    P(9, 1, 5, 5, 0xe6e6e6); P(9, 10, 5, 5, 0xe6e6e6); P(2, 3, 3, 4, 0xd0202a);
    P(16, 7, 2, 1, 0x3a6ab0); P(13, 7, 2, 1, 0x3a6ab0); P(10, 7, 2, 1, 0x3a6ab0);
    g.generateTexture('avion', 26, 16);
    g.destroy();
  }

  private async run() {
    const S = this;
    const alive = () => !S.done && S.scene.isActive();

    // 1. negro y texto
    const l1 = this.add2(txt(this, 320, 160, '', 'fuente_ui', 2));
    const l2 = this.add2(txt(this, 320, 192, '', 'fuente_ui', 2).setTint(0xff4040));
    await typewrite(this, l1, 'JAPÓN. INSTITUTO NEKKETSU.', 22);
    await wait(this, 300);
    await typewrite(this, l2, '10 AÑOS INVICTOS.', 18, 440);
    await wait(this, 1200);
    if (!alive()) return;

    // 2. la azotea de Kenji
    this.clear();
    this.cameras.main.fadeIn(600);
    this.add2(this.add.image(320, 180, 'bg_japon'));
    this.petals(0xffb7d0);
    const kenji = this.fig('kenji', 320, 262, 'idle', 2);
    kenji.row = 'up';
    await wait(this, 1400);
    const box = this.dialog('kenji', 'enojo');
    await typewrite(this, box.text, '¿NADIE EN JAPÓN NOS AGUANTA?', 26, 330);
    await wait(this, 900);
    if (!alive()) return;
    kenji.row = 'down';
    kenji.set('taunt', true);
    await typewrite(this, box.text, '¡ENTONCES NOS VAMOS DE GIRA!', 26, 330);
    for (const [i, id] of ['ryu', 'goro', 'tetsu'].entries()) {
      const fromLeft = i % 2 === 0, tx = [210, 440, 140][i];
      const f = this.fig(id, fromLeft ? -40 : 680, 262, 'run', 2);
      f.left = !fromLeft;
      this.tweens.add({ targets: f, x: tx, duration: 700, delay: i * 250, onComplete: () => { f.set('idle'); f.row = 'down'; } });
    }
    await wait(this, 1900);
    if (!alive()) return;

    // 3. la ruta
    this.clear();
    this.add2(this.add.image(320, 180, 'bg_ruta'));
    const title = this.add2(txt(this, 320, 26, 'LA GIRA NEKKETSU', 'fuente_titulo', 2));
    title.setAlpha(0);
    this.tweens.add({ targets: title, alpha: 1, duration: 400 });
    const stops = [
      { k: 'jp', x: 566, y: 104, n: 'JAPÓN' },
      { k: 'vn', x: 430, y: 214, n: 'VIETNAM' },
      { k: 'co', x: 196, y: 128, n: 'COLOMBIA' },
      { k: 've', x: 92, y: 250, n: 'VENEZUELA' },
    ];
    const path = this.add2(this.add.graphics());
    const plane = this.add2(this.add.image(stops[0].x, stops[0].y, 'avion').setScale(2).setFlipX(true));
    const stamp = (s: (typeof stops)[number]) => {
      const fl = this.add2(this.add.image(s.x, s.y, `flag_${s.k}`).setScale(0));
      this.tweens.add({ targets: fl, scale: 2, duration: 260, ease: 'Back.out' });
      const t = this.add2(txt(this, s.x, s.y + 34, s.n, 'fuente_ui', 2));
      t.setTint(0xffe080);
      chip.boom(0.35);
      this.cameras.main.shake(120, 0.006);
    };
    stamp(stops[0]);
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1], b = stops[i];
      await new Promise<void>((res) => {
        const o = { t: 0 };
        this.tweens.add({
          targets: o, t: 1, duration: 900, ease: 'Sine.inOut',
          onUpdate: () => {
            const x = a.x + (b.x - a.x) * o.t, y = a.y + (b.y - a.y) * o.t - Math.sin(o.t * Math.PI) * 40;
            plane.setPosition(x, y).setFlipX(b.x < a.x);
            if (Math.floor(o.t * 30) % 2 === 0) path.fillStyle(0xffffff, 0.8).fillRect(Math.round(x), Math.round(y), 2, 2);
          },
          onComplete: () => res(),
        });
      });
      if (!alive()) return;
      stamp(b);
      await wait(this, 250);
    }
    await wait(this, 700);
    if (!alive()) return;

    // 4. Saigón: la Familia GG
    this.clear();
    chip.play(SAIGON);
    this.add2(this.add.image(320, 180, 'bg_saigon'));
    const cap = this.add2(txt(this, 320, 22, 'SAIGÓN, VIETNAM', 'fuente_titulo', 1));
    cap.setAlpha(0);
    this.tweens.add({ targets: cap, alpha: 1, duration: 300 });
    const thor = this.fig('thor', -40, 322, 'run', 2);
    this.tweens.add({ targets: thor, x: 700, duration: 1500, onComplete: () => thor.destroy() });
    chip.blip(520, 0.12, 'saw', 0.12, 300);
    this.sound.play('ladrido', { volume: 0.6 });
    await wait(this, 900);
    const spots = [200, 280, 360, 440];
    const figs: Figura[] = [];
    for (const [i, m] of FAMILIA.entries()) {
      const f = this.fig(m.id, -40, 316, 'run', 2);
      figs.push(f);
      await new Promise<void>((res) => this.tweens.add({ targets: f, x: spots[i], duration: 520, onComplete: () => res() }));
      if (!alive()) return;
      f.row = 'down';
      f.set('celebrate', true);
      const card = this.card(m);
      chip.blip(660 + i * 110, 0.1, 'sq25', 0.16);
      await wait(this, 1500);
      card.destroy();
      f.set('idle');
      if (!alive()) return;
    }
    // Thor vuelve corriendo y tiene su tarjeta
    const thor2 = this.fig('thor', 700, 330, 'run', 2);
    thor2.left = true;
    await new Promise<void>((res) => this.tweens.add({ targets: thor2, x: 520, duration: 600, onComplete: () => res() }));
    if (!alive()) return;
    thor2.set('wag');
    thor2.row = 'down_right';
    const tc = this.thorCard();
    this.sound.play('ladrido', { volume: 0.6 });
    await wait(this, 1500);
    tc.destroy();
    if (!alive()) return;
    for (const f of figs) f.set('victory', true);
    thor2.set('celebrate', true);
    const fam = this.add2(txt(this, 320, 60, 'FAMILIA GG', 'fuente_titulo', 3));
    const sub = this.add2(txt(this, 320, 92, 'DE CARACAS A SAIGÓN', 'fuente_ui', 2));
    sub.setTint(0xffe080);
    this.tweens.add({ targets: fam, scale: { from: 5, to: 3 }, duration: 260, ease: 'Back.out' });
    chip.boom(0.4);
    await wait(this, 1800);
    if (!alive()) return;

    // 5. los rivales que esperan
    const rivales: [string, string, string[]][] = [
      ['bg_bogota', 'BOGOTÁ, COLOMBIA', ['ryu', 'tetsu']],
      ['bg_maracaibo', 'MARACAIBO, VENEZUELA', ['goro', 'kenji']],
      ['bg_caracas', 'CARACAS, VENEZUELA', ['kenji', 'ryu', 'tetsu']],
    ];
    for (const [bg, name, ids] of rivales) {
      this.clear();
      this.add2(this.add.image(320, 180, bg));
      if (bg === 'bg_bogota') this.rain();
      if (bg === 'bg_maracaibo') this.lightning();
      if (bg === 'bg_caracas') this.add2(this.add.image(320, 280, 'bg_azotea'));
      ids.forEach((id, i) => {
        const f = this.fig(id, 320 + (i - (ids.length - 1) / 2) * 90, 318, 'idle', 2);
        f.row = 'down';
        f.setTintFill(0x05050c);
      });
      this.add2(txt(this, 320, 22, name, 'fuente_titulo', 1));
      const q = this.add2(txt(this, 320, 150, '¿QUIÉNES SERÁN?', 'fuente_titulo_plata', 2));
      this.tweens.add({ targets: q, alpha: 0.3, duration: 300, yoyo: true, repeat: -1 });
      chip.blip(220, 0.25, 'tri', 0.2, 110);
      await wait(this, 1500);
      if (!alive()) return;
    }

    // 6. VS
    this.clear();
    chip.play(TENSION);
    const g = this.add2(this.add.graphics());
    const vsBg = () => {
      g.clear();
      const t = this.time.now / 40;
      // azul a la izquierda
      for (let i = -20; i < 40; i++) {
        g.fillStyle(i % 2 ? 0x1a3a9a : 0x2a5bd7).fillTriangle(i * 24 - (t % 48), 0, i * 24 + 24 - (t % 48), 0, i * 24 - 80 - (t % 48), 360);
      }
      // rojo a la derecha de la diagonal (330,0)-(250,360): fondo y franjas paralelas a la diagonal, sin huecos
      g.fillStyle(0x9a1a2a).fillPoints([{ x: 330, y: 0 }, { x: 640, y: 0 }, { x: 640, y: 360 }, { x: 250, y: 360 }], true);
      const off = (t * 2) % 28;
      for (let k = -1; k < 16; k++) {
        const x0 = 330 + k * 28 - off, l = Math.max(330, x0), r = x0 + 14;
        if (r <= 330) continue;
        g.fillStyle(0xd0303a).fillPoints([{ x: l, y: 0 }, { x: r, y: 0 }, { x: r - 80, y: 360 }, { x: l - 80, y: 360 }], true);
      }
      g.fillStyle(0xffffff).fillPoints([{ x: 324, y: 0 }, { x: 336, y: 0 }, { x: 256, y: 360 }, { x: 244, y: 360 }], true);
    };
    this.tick.push(vsBg);
    vsBg();
    FAMILIA.forEach((m, i) => {
      const f = this.fig(m.id, 52 + i * 62, 300 - (i % 2) * 18, 'idle', 2); f.row = 'down_right';
      this.add2(txt(this, f.x, f.y + 12, m.nombre, 'fuente_ui', 1)).setTint(0xffe080);
    });
    INSTITUTO.forEach((id, i) => {
      const f = this.fig(id, 400 + i * 62, 300 - (i % 2) * 18, 'idle', 2); f.row = 'down_right'; f.left = true;
      this.add2(txt(this, f.x, f.y + 12, id.toUpperCase(), 'fuente_ui', 1)).setTint(0xffd0d0);
    });
    const vs = this.add2(txt(this, 320, 110, 'VS', 'fuente_titulo', 6));
    vs.setScale(14);
    this.tweens.add({ targets: vs, scale: 6, duration: 240, ease: 'Quad.in', onComplete: () => { chip.boom(0.6); this.cameras.main.shake(200, 0.012); flash(this, 160); } });
    this.add2(txt(this, 140, 40, 'FAMILIA GG', 'fuente_titulo', 2));
    this.add2(txt(this, 500, 40, 'INSTITUTO NEKKETSU', 'fuente_titulo_plata', 1));
    await wait(this, 2300);
    if (!alive()) return;

    // 7. el puñetazo a la cámara
    this.clear();
    chip.stop(0.1);
    this.cameras.main.setBackgroundColor('#000000');
    const lines = this.add2(speedLines(this, 1, 0xd0303a));
    const k = this.fig('kenji', 320, 300, 'walk', 4);
    k.row = 'down';
    this.tweens.add({ targets: k, scale: 8, y: 470, duration: 900, ease: 'Quad.in' });
    await wait(this, 900);
    if (!alive()) return;
    k.set('jab', true);
    let hit = false;
    this.tick.push(() => {
      if (!hit && k.anim.frame >= 2) {
        hit = true;
        chip.boom(0.9);
        this.sound.play('critico', { volume: 0.8 });
        flash(this, 240);
        this.cameras.main.shake(380, 0.03);
        lines.destroy();
        this.crack(400, 200);
      }
    });
    await wait(this, 1200);
    if (!alive()) return;

    // 8. el logo
    this.clear();
    this.cameras.main.setBackgroundColor('#0b0b14');
    this.add2(this.add.image(320, 180, 'bg_caracas'));
    this.add2(this.add.image(320, 280, 'bg_azotea'));
    chip.play(MARCHA);
    this.registry.set('marchaSonando', true);
    await buildLogo(this, this.layer, true);
    this.add2(fireworks(this));
    await wait(this, 2600);
    this.finish();
  }

  /** Caja de diálogo con retrato. */
  private dialog(id: string, expr: string) {
    this.add2(panel(this, 20, 286, 600, 64));
    this.add2(this.add.image(54, 318, `retratos:${id}`, `chico_${expr}`).setScale(1));
    const name = this.add2(txt(this, 86, 300, id === 'kenji' ? 'KENJI "TORO" SAKAMOTO' : id, 'fuente_ui', 1, 0));
    name.setTint(0xf2c230);
    const text = this.add2(txt(this, 86, 324, '', 'fuente_ui', 2, 0));
    return { text };
  }

  /** Tarjeta de presentación de un atleta. */
  private card(m: (typeof FAMILIA)[number]) {
    const c = this.add.container(0, 0);
    this.layer.add(c);
    const g = this.add.graphics();
    g.fillStyle(0x08081a, 0.92).fillRect(20, 90, 230, 104);
    g.fillStyle(m.color).fillRect(20, 90, 6, 104);
    g.lineStyle(2, 0xf2c230).strokeRect(21, 91, 228, 102);
    c.add(g);
    c.add(this.add.image(84, 142, `retratos:${m.id}`, 'grande_feliz').setScale(0.8));
    c.add(txt(this, 140, 108, m.nombre, 'fuente_titulo', 1, 0));
    c.add(txt(this, 140, 130, m.apodo, 'fuente_ui', 1, 0).setTint(0xffe080));
    c.add(txt(this, 140, 150, 'TÉCNICA', 'fuente_ui', 1, 0).setTint(0x8a8ab0));
    c.add(txt(this, 140, 164, m.tecnica, 'fuente_ui', 1, 0).setTint(0xff6a6a));
    c.x = -260;
    this.tweens.add({ targets: c, x: 0, duration: 220, ease: 'Back.out' });
    return c;
  }

  private thorCard() {
    const c = this.add.container(0, 0);
    this.layer.add(c);
    const g = this.add.graphics();
    g.fillStyle(0x08081a, 0.92).fillRect(390, 90, 230, 104);
    g.fillStyle(0xc87a3a).fillRect(614, 90, 6, 104);
    g.lineStyle(2, 0xf2c230).strokeRect(391, 91, 228, 102);
    c.add(g);
    const t = new Figura(this, 440, 178, 'thor', 'wag').setScale(2);
    t.row = 'down_right';
    c.add(t);
    this.tick.push((dt) => { if (t.active) t.step(dt); });
    c.add(txt(this, 486, 108, 'THOR', 'fuente_titulo', 1, 0));
    c.add(txt(this, 486, 130, 'EL GUARDIÁN', 'fuente_ui', 1, 0).setTint(0xffe080));
    c.add(txt(this, 486, 150, 'TÉCNICA', 'fuente_ui', 1, 0).setTint(0x8a8ab0));
    c.add(txt(this, 486, 164, '¡GUAU GUAU!', 'fuente_ui', 1, 0).setTint(0xff6a6a));
    c.x = 260;
    this.tweens.add({ targets: c, x: 0, duration: 220, ease: 'Back.out' });
    return c;
  }

  private petals(color: number) {
    const ps: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 40; i++) ps.push(this.add2(this.add.image(Math.random() * 640, Math.random() * 360, 'px').setTint(color).setScale(0.5 + Math.random() * 0.5)));
    this.tick.push((dt) => {
      for (const p of ps) {
        p.x -= (40 + (p.scale * 30)) * dt;
        p.y += (18 + Math.sin(p.x / 20) * 20) * dt;
        if (p.x < -4) { p.x = 644; p.y = Math.random() * 300; }
        if (p.y > 364) p.y = -4;
      }
    });
  }

  private rain() {
    const g = this.add2(this.add.graphics());
    const drops = Array.from({ length: 140 }, () => ({ x: Math.random() * 700, y: Math.random() * 360 }));
    this.tick.push((dt) => {
      g.clear();
      g.lineStyle(1, 0xa8c0e0, 0.6);
      for (const d of drops) {
        d.x -= 90 * dt; d.y += 420 * dt;
        if (d.y > 360) { d.y = -10; d.x = Math.random() * 700; }
        g.lineBetween(d.x, d.y, d.x - 2, d.y + 7);
      }
    });
  }

  private lightning() {
    const g = this.add2(this.add.graphics());
    let next = 0.3;
    this.tick.push((dt) => {
      next -= dt;
      if (next > 0) return;
      next = 0.6 + Math.random();
      g.clear();
      let x = 420 + Math.random() * 180, y = 120;
      g.lineStyle(2, 0xf0e8ff, 1);
      while (y < 220) { const nx = x + (Math.random() - 0.5) * 24, ny = y + 8 + Math.random() * 10; g.lineBetween(x, y, nx, ny); x = nx; y = ny; }
      flash(this, 140, 0xd0c0ff, 0.45);
      this.time.delayedCall(120, () => g.clear());
    });
  }

  /** Vidrio roto desde el punto del golpe. */
  private crack(cx: number, cy: number) {
    const g = this.add2(this.add.graphics().setDepth(9500));
    g.lineStyle(2, 0xffffff, 0.95);
    for (let i = 0; i < 14; i++) {
      let a = (i / 14) * Math.PI * 2 + Math.random() * 0.3, x = cx, y = cy;
      for (let s = 0; s < 6; s++) {
        const nx = x + Math.cos(a) * (20 + Math.random() * 40), ny = y + Math.sin(a) * (20 + Math.random() * 40);
        g.lineBetween(x, y, nx, ny);
        x = nx; y = ny; a += (Math.random() - 0.5) * 0.6;
      }
    }
    g.lineStyle(1, 0xffffff, 0.7);
    for (const r of [26, 60, 110]) {
      g.beginPath();
      for (let k = 0; k <= 16; k++) { const a = (k / 16) * Math.PI * 2, rr = r + (Math.random() - 0.5) * r * 0.3; const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr; if (k === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.strokePath();
    }
  }
}
