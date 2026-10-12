import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { chip, MARCHA, PELEA, SAIGON, TENSION } from '../core/music';
import { txt, typewrite, wait, panel, flash, speedLines } from '../core/ui';
import { Input } from '../core/input';
import { buildLogo, fireworks } from './logo';
import { JET, PARADAS } from '../gfx/mapa';

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
  /** máscaras de los paneles inclinados del montaje (no se dibujan; se borran con la toma) */
  private masks: Phaser.GameObjects.Graphics[] = [];

  constructor() { super('Intro'); }

  create() {
    this.done = false;
    this.tick = [];
    this.input2 = new Input(this, false);
    this.layer = this.add.container(0, 0);
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
    for (const m of this.masks) m.destroy();
    this.masks = [];
    const cam = this.cameras.main;
    cam.panEffect.reset();
    cam.zoomEffect.reset();
    cam.setZoom(1).setScroll(0, 0);
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

  private async run() {
    const S = this;
    const alive = () => !S.done && S.scene.isActive();

    // 0. la presentación
    await this.presenta();
    if (!alive()) return;
    this.clear();

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
    // rayo, trueno y Kenji se agranda (el cuadro de diálogo queda quieto)
    flash(this, 200, 0xd0c0ff, 0.8);
    chip.boom(0.8);
    this.cameras.main.shake(260, 0.012);
    const aura = this.add2(speedLines(this, 1, 0xff4040));
    aura.setAlpha(0.45);
    this.layer.bringToTop(kenji);
    this.tweens.add({ targets: kenji, scale: 3, duration: 380, ease: 'Back.out' });
    await typewrite(this, box.text, '¡ENTONCES NOS VAMOS DE GIRA!', 26, 330);
    this.tweens.add({ targets: kenji, scale: 2, duration: 300 });
    aura.destroy();
    for (const [i, id] of ['ryu', 'goro', 'tetsu'].entries()) {
      const fromLeft = i % 2 === 0, tx = [210, 440, 140][i];
      const f = this.fig(id, fromLeft ? -40 : 680, 262, 'run', 2);
      f.left = !fromLeft;
      this.tweens.add({ targets: f, x: tx, duration: 700, delay: i * 250, onComplete: () => { f.set('idle'); f.row = 'down'; } });
    }
    await wait(this, 1900);
    if (!alive()) return;

    // 3. la gira: el jet despega y la ruta en el mapa
    await this.vuelo(alive);
    if (!alive()) return;
    await this.ruta(alive);
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

    // 4b. el montaje de las pruebas
    await this.montaje(alive);
    if (!alive()) return;
    chip.play(TENSION);

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

  /** El jet de la Nekketsu Air cruza el atardecer con el Instituto en las ventanillas. */
  private async vuelo(alive: () => boolean) {
    this.clear();
    this.add2(this.add.image(320, 180, 'cielo_vuelo'));
    // nubes en tres capas: lejos lentas, cerca rápidas y grandes
    const capas: { img: Phaser.GameObjects.Image; v: number }[] = [];
    const nube = (key: string, x: number, y: number, v: number, scale: number, alpha: number) => {
      const img = this.add2(this.add.image(x, y, key).setScale(scale).setAlpha(alpha));
      capas.push({ img, v });
    };
    for (let i = 0; i < 5; i++) nube('nube_2', i * 150 + 40, 120 + (i % 3) * 26, 50, 1, 0.55);
    for (let i = 0; i < 4; i++) nube('nube_0', i * 200 + 80, 230 + (i % 2) * 30, 160, 1.5, 0.85);
    const rayas = this.add2(this.add.graphics());
    const jet = this.add2(this.add.image(300, 170, 'jet').setScale(2));
    const mid = (wx: number, wy: number): [number, number] => [jet.x + (wx - JET.w / 2) * 2, jet.y + (wy - JET.h / 2) * 2];
    const caras = INSTITUTO.map((id, i) => this.add2(this.add.image(...mid(...JET.ventanas[i]), 'cabecitas', id).setScale(1.4)));
    const marca = this.add2(txt(this, 0, 0, 'NEKKETSU AIR', 'fuente_ui', 1).setTint(0x1a2a5a));
    const estela = this.add.particles(0, 0, 'px', { speedX: { min: -320, max: -220 }, speedY: { min: -8, max: 8 }, lifespan: 700, scale: { start: 1.6, end: 0 }, alpha: { start: 0.8, end: 0 }, frequency: 16, tint: 0xffffff });
    this.add2(estela);
    for (let i = 0; i < 3; i++) nube('nube_1', i * 320 + 100, 330 + (i % 2) * 14, 520, 2, 1);
    let t = 0;
    this.tick.push((dt) => {
      t += dt;
      for (const c of capas) { c.img.x -= c.v * dt; if (c.img.x < -c.img.displayWidth / 2) c.img.x += 640 + c.img.displayWidth; }
      jet.y = 170 + Math.sin(t * 2.6) * 4;
      caras.forEach((c, i) => c.setPosition(...mid(...JET.ventanas[i])));
      marca.setPosition(...mid(64, 31));
      estela.setPosition(...mid(84, 42));
      rayas.clear();
      for (let k = 0; k < 14; k++) {
        const y = 30 + ((k * 53 + Math.floor(t * 40)) % 300), x = 640 - ((t * 900 + k * 137) % 760);
        rayas.fillStyle(0xffffff, 0.5).fillRect(x, y, 40 + (k % 3) * 20, 1);
      }
    });
    chip.blip(160, 1.2, 'saw', 0.08, 60);
    await wait(this, 350);
    const title = this.add2(txt(this, 320, 40, 'LA GIRA NEKKETSU', 'fuente_titulo', 2));
    title.setScale(7);
    this.tweens.add({ targets: title, scale: 2, duration: 200, ease: 'Quad.in', onComplete: () => { chip.boom(0.6); this.cameras.main.shake(160, 0.01); } });
    const ruta = this.add2(txt(this, 320, 66, 'TOKIO · SAIGÓN · BOGOTÁ · CARACAS', 'fuente_ui', 1).setTint(0xffe080).setAlpha(0));
    this.tweens.add({ targets: ruta, alpha: 1, duration: 300, delay: 300 });
    await wait(this, 2100);
    if (!alive()) return;
    // acelera y se va
    chip.blip(120, 0.6, 'saw', 0.12, 900);
    this.tweens.add({ targets: jet, x: 980, duration: 520, ease: 'Quad.in' });
    flash(this, 120);
    await wait(this, 560);
  }

  /**
   * La ruta en el mapa: la cámara sigue al avión desde Tokio, pasando por Saigón, cruza el Pacífico
   * hasta Bogotá y salta a Caracas. En cada parada cae un pin con su bandera y se sella el pasaporte.
   */
  private async ruta(alive: () => boolean) {
    this.clear();
    const world = this.add2(this.add.container(0, 0));
    world.add(this.add.image(0, 0, 'mapa_mundo').setOrigin(0));
    const trail = this.add.graphics();
    world.add(trail);
    // nubes que pasan sobre el mapa
    const nubes = [0, 1, 2, 3].map((i) => this.add.image(80 + i * 170, 60 + (i % 2) * 150, i % 2 ? 'nube_0' : 'nube_2').setAlpha(0.45));
    world.add(nubes);
    const sombra = this.add.image(0, 0, 'avion_arriba').setTintFill(0x000000).setAlpha(0.3);
    const avion = this.add.image(0, 0, 'avion_arriba');
    world.add([sombra, avion]);
    // la vista: centro y acercamiento, siempre sin salirse del mapa
    const view = { cx: PARADAS[0].at[0], cy: PARADAS[0].at[1], z: 2.6 };
    this.tick.push((dt) => {
      world.setScale(view.z);
      world.x = Phaser.Math.Clamp(320 - view.cx * view.z, 640 - 640 * view.z, 0);
      world.y = Phaser.Math.Clamp(180 - view.cy * view.z, 360 - 360 * view.z, 0);
      for (const n of nubes) { n.x -= 6 * dt; if (n.x < -70) n.x = 710; }
    });
    // arriba el título; abajo el pasaporte que se va llenando
    const barra = this.add2(this.add.graphics());
    barra.fillStyle(0x08081a, 0.82).fillRect(0, 0, 640, 26).fillRect(0, 312, 640, 48);
    barra.fillStyle(0xf2c230).fillRect(0, 26, 640, 1).fillRect(0, 311, 640, 1);
    this.add2(txt(this, 320, 14, 'LA GIRA NEKKETSU', 'fuente_titulo', 1));
    this.add2(txt(this, 14, 320, 'PASAPORTE', 'fuente_ui', 1, 0).setTint(0x8a8ab0));
    const pon = (x: number, y: number, rot = 0) => { avion.setPosition(x, y).setRotation(rot); sombra.setPosition(x + 3, y + 5).setRotation(rot); };
    pon(...PARADAS[0].at);

    const parada = async (i: number) => {
      const p = PARADAS[i];
      const [x, y] = p.at;
      const pin = this.add.graphics();
      pin.fillStyle(0x000000, 0.35).fillEllipse(1, 1, 5, 2);
      pin.lineStyle(1, 0xe8e8f0).lineBetween(0, 0, 0, -9);
      pin.fillStyle(0xd0202a).fillCircle(0, -10, 3.2);
      pin.fillStyle(0xffffff).fillRect(-1, -12, 1, 1);
      pin.setPosition(x, y - 30).setAlpha(0);
      const flag = this.add.image(x + 9, y - 14, `flag_${p.k}`).setScale(0);
      const name = txt(this, x, y + 7, p.ciudad, 'fuente_ui', 1).setScale(0.5).setAlpha(0);
      world.add([pin, flag, name]);
      this.tweens.add({ targets: pin, y, alpha: 1, duration: 260, ease: 'Bounce.out' });
      this.tweens.add({ targets: flag, scale: 0.42, duration: 240, delay: 160, ease: 'Back.out' });
      this.tweens.add({ targets: name, alpha: 1, duration: 200, delay: 200 });
      chip.blip(880 + i * 120, 0.08, 'sq25', 0.16);
      await wait(this, 260);
      // sello del pasaporte
      const sx = 136 + i * 136, sy = 336, rot = [-0.12, 0.08, -0.05, 0.14][i];
      const sello = this.add2(this.add.container(sx, sy));
      const g = this.add.graphics();
      g.lineStyle(2, 0xd02a2a).strokeRoundedRect(-56, -17, 112, 34, 5);
      g.lineStyle(1, 0xd02a2a).strokeRoundedRect(-52, -13, 104, 26, 3);
      sello.add([g, txt(this, 0, -4, p.pais, 'fuente_ui', 2).setTint(0xe03a3a), txt(this, 0, 9, 'GIRA NEKKETSU', 'fuente_ui', 1).setTint(0xe03a3a)]);
      sello.setRotation(rot).setScale(3).setAlpha(0);
      this.tweens.add({ targets: sello, scale: 1, alpha: 0.92, duration: 170, ease: 'Quad.in', onComplete: () => { chip.boom(0.45); this.cameras.main.shake(110, 0.006); } });
      await wait(this, 380);
    };

    /** Vuela de una parada a otra en curva, con estela punteada y la cámara detrás. */
    const volar = (a: number, b: number, ms: number, alto: number, z?: number[]) => new Promise<void>((res) => {
      const [x0, y0] = PARADAS[a].at, [x1, y1] = PARADAS[b].at;
      const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - alto;
      const o = { t: 0 };
      let last = -1;
      chip.blip(300, ms / 1000, 'saw', 0.05, 180);
      this.tweens.add({
        targets: o, t: 1, duration: ms, ease: 'Sine.inOut',
        onUpdate: () => {
          const t = o.t, u = 1 - t;
          const x = u * u * x0 + 2 * u * t * mx + t * t * x1, y = u * u * y0 + 2 * u * t * my + t * t * y1;
          const dx = 2 * u * (mx - x0) + 2 * t * (x1 - mx), dy = 2 * u * (my - y0) + 2 * t * (y1 - my);
          pon(x, y, Math.atan2(dy, dx));
          const k = Math.floor(t * ms / 30);
          if (k !== last) { last = k; if (k % 2 === 0) trail.fillStyle(0xffffff, 0.9).fillRect(Math.round(x) - 0.5, Math.round(y) - 0.5, 1.5, 1.5); }
          view.cx = x; view.cy = y;
          if (z) view.z = t < 0.5 ? z[0] + (z[1] - z[0]) * (t / 0.5) : z[1] + (z[2] - z[1]) * ((t - 0.5) / 0.5);
        },
        onComplete: () => res(),
      });
    });

    await wait(this, 300);
    await parada(0);
    if (!alive()) return;
    await volar(0, 1, 1200, 20, [2.6, 2.3, 2.2]);
    await parada(1);
    if (!alive()) return;
    await volar(1, 2, 2600, 150, [2.2, 1.15, 2.0]);
    await parada(2);
    if (!alive()) return;
    await volar(2, 3, 800, 14, [2.0, 2.2, 2.3]);
    await parada(3);
    if (!alive()) return;
    // se aleja y se ve toda la gira
    this.tweens.add({ targets: view, z: 1, cx: 320, cy: 180, duration: 700, ease: 'Sine.inOut' });
    await wait(this, 750);
    const lema = this.add2(txt(this, 320, 150, '¡4 PAÍSES, 1 COPA!', 'fuente_titulo', 2));
    lema.setScale(8);
    this.tweens.add({ targets: lema, scale: 2, duration: 200, ease: 'Quad.in', onComplete: () => { chip.boom(0.8); flash(this, 120); this.cameras.main.shake(220, 0.014); } });
    await wait(this, 1500);
  }

  /** "FAMILIA GG PRESENTA": letra por letra, con Thor moviendo la cola. */
  private async presenta() {
    const word = 'FAMILIA GG';
    const letters: Phaser.GameObjects.BitmapText[] = [];
    const w = 34;
    for (let i = 0; i < word.length; i++) {
      if (word[i] === ' ') continue;
      const t = this.add2(txt(this, 320 + (i - (word.length - 1) / 2) * w, 150, word[i], 'fuente_titulo', 3));
      t.setAlpha(0).setY(110);
      letters.push(t);
      this.tweens.add({ targets: t, alpha: 1, y: 150, duration: 260, delay: i * 70, ease: 'Bounce.out', onStart: () => chip.blip(660 + i * 90, 0.06, 'sq25', 0.14) });
    }
    await wait(this, word.length * 70 + 300);
    const pre = this.add2(txt(this, 320, 196, 'PRESENTA', 'fuente_ui', 2).setTint(0xffe080).setAlpha(0));
    this.tweens.add({ targets: pre, alpha: 1, duration: 300 });
    const thor = this.fig('thor', 320, 270, 'wag', 2);
    thor.row = 'down_right';
    chip.blip(1320, 0.3, 'sq25', 0.18, 1760);
    this.time.delayedCall(140, () => chip.blip(1760, 0.4, 'sq25', 0.16, 2093));
    this.sound.play('ladrido', { volume: 0.5 });
    // brillo que cruza las letras
    for (const [i, t] of letters.entries()) this.time.delayedCall(500 + i * 50, () => { if (t.active) { t.setTintFill(0xffffff); this.time.delayedCall(70, () => t.active && t.clearTint()); } });
    await wait(this, 1900);
  }

  /**
   * Montaje estilo anime: cortes rápidos de cada prueba en paneles inclinados con líneas de velocidad,
   * y al final los cuatro a la vez con "¡A COMPETIR!".
   */
  private async montaje(alive: () => boolean) {
    chip.play(PELEA);
    const cortes = [
      { bg: 'bg_cocora', color: 0x3cc86a, id: 'sophie', pack: 'atletismo', anim: 'hurdles', palabra: '¡VALLAS!', agua: false },
      { bg: 'bg_halong', color: 0x40c0ff, id: 'alana', pack: 'natacion', anim: 'swim_fly', palabra: '¡NATACIÓN!', agua: true },
      { bg: 'bg_llanos', color: 0xf2a03a, id: 'rick', pack: 'atletismo', anim: 'javelin', palabra: '¡JABALINA!', agua: false },
      { bg: 'bg_caracas', color: 0xd0303a, id: 'steph', pack: 'ngg_golpe', anim: 'kick_martial', palabra: '¡PELEA!', agua: false },
    ];
    for (const [n, c] of cortes.entries()) {
      this.clear();
      const der = n % 2 === 0;
      this.add2(this.add.rectangle(320, 180, 640, 360, 0x05050c));
      // panel inclinado con el escenario adentro
      const poly = der
        ? [{ x: 120, y: 0 }, { x: 640, y: 0 }, { x: 640, y: 360 }, { x: 20, y: 360 }]
        : [{ x: 0, y: 0 }, { x: 520, y: 0 }, { x: 620, y: 360 }, { x: 0, y: 360 }];
      const bg = this.add2(this.add.image(320, 180, c.bg).setScale(1.25));
      bg.setMask(this.mask(poly));
      this.tweens.add({ targets: bg, x: der ? 300 : 340, duration: 1300 });
      const tinte = this.add2(this.add.graphics());
      tinte.fillStyle(c.color, 0.25).fillPoints(poly, true);
      const lines = this.add2(speedLines(this, 1, 0xffffff));
      lines.setAlpha(0.5).setDepth(0);
      if (c.agua) { const a = this.add2(this.add.graphics()); a.fillStyle(0x1f7fb8, 0.75).fillRect(0, 300, 640, 60); a.fillStyle(0x9ad8f0).fillRect(0, 300, 640, 2); }
      // el atleta grande, entrando de lado
      const f = this.fig(c.id, der ? -80 : 720, c.agua ? 330 : 340, 'idle', 4);
      f.anim.prefer = c.pack;
      f.set(c.anim, true);
      f.left = !der;
      this.tick.push(() => { if (f.active && f.anim.done) f.set(c.anim, true); });
      this.tweens.add({ targets: f, x: der ? 250 : 390, duration: 260, ease: 'Quad.out' });
      // el borde blanco del corte
      const filo = this.add2(this.add.graphics());
      filo.fillStyle(0xffffff).fillPoints(der ? [{ x: 114, y: 0 }, { x: 124, y: 0 }, { x: 24, y: 360 }, { x: 14, y: 360 }] : [{ x: 516, y: 0 }, { x: 526, y: 0 }, { x: 626, y: 360 }, { x: 616, y: 360 }], true);
      flash(this, 90);
      chip.boom(0.5);
      await wait(this, 220);
      const w = this.add2(txt(this, der ? 450 : 190, 100, c.palabra, 'fuente_titulo', 3));
      w.setScale(9).setAngle(der ? -6 : 6);
      this.tweens.add({ targets: w, scale: 3, duration: 180, ease: 'Quad.in', onComplete: () => { chip.boom(0.7); this.cameras.main.shake(160, 0.012); } });
      await wait(this, 1080);
      if (!alive()) return;
    }
    // los cuatro a la vez
    this.clear();
    this.add2(this.add.rectangle(320, 180, 640, 360, 0xffffff));
    for (const [i, c] of cortes.entries()) {
      const x0 = -40 + i * 170;
      const poly = [{ x: x0 + 40, y: 0 }, { x: x0 + 204, y: 0 }, { x: x0 + 164, y: 360 }, { x: x0, y: 360 }];
      const bg = this.add2(this.add.image(x0 + 100, 180, c.bg));
      bg.setMask(this.mask(poly));
      const tinte = this.add2(this.add.graphics());
      tinte.fillStyle(c.color, 0.3).fillPoints(poly, true);
      if (c.agua) { const a = this.add2(this.add.graphics()); a.fillStyle(0x1f7fb8, 0.8).fillPoints([{ x: x0 + 17, y: 280 }, { x: x0 + 181, y: 280 }, { x: x0 + 164, y: 360 }, { x: x0, y: 360 }], true); }
      const f = this.fig(c.id, x0 + 96, c.agua ? 300 : 316, 'idle', 2.5);
      f.anim.prefer = c.pack;
      f.set(c.anim, true);
      this.tick.push(() => { if (f.active && f.anim.done) f.set(c.anim, true); });
      f.setAlpha(0);
      this.tweens.add({ targets: f, alpha: 1, duration: 120, delay: i * 110, onStart: () => chip.blip(520 + i * 130, 0.08, 'sq25', 0.16) });
    }
    await wait(this, 520);
    const go = this.add2(txt(this, 320, 110, '¡A COMPETIR!', 'fuente_titulo', 4));
    go.setScale(12);
    this.tweens.add({ targets: go, scale: 4, duration: 220, ease: 'Quad.in', onComplete: () => { chip.boom(0.9); flash(this, 160); this.cameras.main.shake(280, 0.018); } });
    await wait(this, 1700);
  }

  /** Máscara con la forma de un panel. */
  private mask(poly: { x: number; y: number }[]) {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff).fillPoints(poly, true);
    this.masks.push(g);
    return g.createGeometryMask();
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
