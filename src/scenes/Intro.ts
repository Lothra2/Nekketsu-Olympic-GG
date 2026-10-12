import Phaser from 'phaser';
import { margen } from '../core/pantalla';
import { Figura } from '../core/figura';
import { chip, MARCHA, PELEA, SAIGON, TENSION } from '../core/music';
import { txt, typewrite, wait, panel, flash, speedLines } from '../core/ui';
import { Input } from '../core/input';
import { efecto } from '../core/fx';
import { kit } from '../core/kit';
import { buildLogo, fireworks } from './logo';
import { JET, PARADAS } from '../gfx/mapa';

const FAMILIA = [
  { id: 'rick', nombre: 'RICK', apodo: 'EL CAPITÁN', tecnica: 'PUÑO MACH', color: 0x2a5bd7 },
  { id: 'steph', nombre: 'STEPH', apodo: 'LA VELOZ', tecnica: 'PATADA HURACÁN', color: 0xe86aa0 },
  { id: 'sophie', nombre: 'SOPHIE', apodo: 'LA ACRÓBATA', tecnica: 'CHILENA ASESINA', color: 0x3cc86a },
  { id: 'alana', nombre: 'ALANA', apodo: 'LA PEQUEÑA TERRIBLE', tecnica: '¡THOR AL RESCATE!', color: 0xff4fa0 },
];
const INSTITUTO = ['kenji', 'ryu', 'goro', 'tetsu'];

/**
 * La altura de los ojos de cada uno, en pixeles del kit bajo su punto `cabeza` (medida en su sprite de frente). El
 * punto `cabeza` del kit no cae en el mismo lugar de la cara en todos: en Rick está a la altura de los lentes y en
 * Goro en la frente. Las lágrimas salen de aquí y el sonrojo va un poco más abajo.
 */
const OJOS: Record<string, number> = { rick: -1, steph: 5, sophie: 5, alana: 5, kenji: 3, ryu: 3, goro: 7, tetsu: 4 };

/**
 * La intro: la presentación (con Thor arreglando el letrero), Japón, la gira, la Familia GG entrando cada uno a su
 * manera, el montaje de las pruebas, el encuentro con el Instituto (que termina con Goro asustado de Thor), el VS,
 * el puñetazo a la cámara y el logo. Se salta con cualquier botón.
 */
export class Intro extends Phaser.Scene {
  private done = false;
  private input2!: Input;
  private layer!: Phaser.GameObjects.Container;
  private tick: ((dt: number) => void)[] = [];
  /** las reacciones que van sobre la cabeza: siempre encima de todo */
  private marcas: Phaser.GameObjects.GameObject[] = [];
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
    // en la esquina de verdad, también en pantallas anchas
    const skip = txt(this, 632 + margen(this), 352, 'SALTAR »', 'fuente_ui', 1, 1).setAlpha(0.6).setDepth(9999);
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
    this.marcas = [];
    for (const m of this.masks) m.destroy();
    this.masks = [];
    const cam = this.cameras.main;
    cam.panEffect.reset();
    cam.zoomEffect.reset();
    // en pantallas anchas, el cuadro de 640 centrado; el fondo de siempre
    cam.setZoom(1).setScroll(-margen(this), 0).setBackgroundColor('#0b0b14');
    this.blinds();
  }

  /** Persianas retro: 12 franjas negras que se abren mostrando la toma nueva. */
  private blinds() {
    for (let i = 0; i < 12; i++) {
      const r = this.add.rectangle(320, i * 30 + 15, 800, 30, 0x000000).setDepth(9800);
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

  /** Un tween que se puede esperar. */
  private ir(targets: object, props: Phaser.Types.Tweens.TweenBuilderConfig | object, ms: number, ease = 'Linear') {
    return new Promise<void>((res) => this.tweens.add({ targets, ...props, duration: ms, ease, onComplete: () => res() }));
  }

  /**
   * El centro de la cabeza en el cuadro que se ve ahora y su radio, con los datos por cuadro del kit (`cabeza`): así
   * sigue a la cabeza aunque se agache, salte o mire al otro lado.
   */
  private cabeza(f: Figura): [number, number, number] {
    const s = f.scaleX;
    const r = f.celda * 0.19 * s;
    const c = f.anim.data.cabeza?.[f.rowIndex]?.[f.anim.frame];
    if (c) { const [cx, cy] = f.mirror(c); return [f.x + cx * s, f.y + cy * s, r]; }
    return [f.x, f.y - (f.pivote[1] - f.celda * 0.3) * s, r];
  }

  /** Dónde va cada reacción: las lágrimas desde los ojos, el sonrojo en los cachetes y lo demás arriba al costado. */
  private puntoReac(f: Figura, id: string): [number, number] {
    const [x, y, r] = this.cabeza(f);
    const ojos = y + (OJOS[f.who] ?? 4) * f.scaleY;
    if (id === 'lagrima_comica') return [x, ojos];
    if (id === 'sonrojo') return [x, ojos + 3 * f.scaleY];
    // las estrellas giran centradas sobre la cabeza
    if (id === 'estrellas_mareo') return [Phaser.Math.Clamp(x, 16 * f.scaleX + 4, 636 - 16 * f.scaleX), y - r * 0.8];
    // arriba a la derecha de la cabeza; pegado al borde derecho, a la izquierda (el efecto se dibuja espejado)
    const ancho = 16 * f.scaleX;
    return x + r * 0.45 + ancho > 636 ? [x - r * 0.45, y - r * 0.6] : [x + r * 0.45, y - r * 0.6];
  }

  /** Trae una figura al frente sin tapar las reacciones que van sobre las cabezas. */
  private alFrente(f: Figura) {
    this.layer.bringToTop(f);
    for (const m of this.marcas) if (m.active) this.layer.bringToTop(m);
  }

  /** Una reacción de manga (vena, gota, ¡!, lágrima, sonrojo) pegada a la cabeza, que la sigue mientras dura. */
  private reac(f: Figura, id: string, ms = 1400) {
    // a escala entera, como la figura: los pixeles quedan parejos
    const s = efecto(this, id, ...this.puntoReac(f, id), { scale: f.scaleX, queda: true });
    if (!s) return;
    this.add2(s);
    s.setName(`reac:${id}:${f.who}`);
    // lo que va en la cara queda pegado a su figura (si alguien está delante, la tapa igual que a la cara);
    // lo que va sobre la cabeza queda encima de todo, también de las tarjetas que salgan después
    if (id === 'lagrima_comica' || id === 'sonrojo') this.layer.moveAbove(s, f);
    else this.marcas.push(s);
    this.tick.push(() => {
      if (!s.active || !f.active) return;
      const [x, y] = this.puntoReac(f, id);
      s.setPosition(x, y);
      // del lado izquierdo de la cabeza va espejado, para que siga saliendo hacia afuera
      if (id !== 'lagrima_comica' && id !== 'sonrojo' && id !== 'estrellas_mareo') s.setFlipX(x < this.cabeza(f)[0]).setOrigin(x < this.cabeza(f)[0] ? 1 - 0.5 / 16 : 0.5 / 16, s.originY);
      // si su figura se va de la pantalla, la reacción se va con ella
      if (f.x < -10 || f.x > 650) s.destroy();
    });
    this.time.delayedCall(ms, () => { if (s.active) this.tweens.add({ targets: s, alpha: 0, duration: 160, onComplete: () => s.destroy() }); });
  }

  /** Un efecto suelto en la toma (polvo, chispa, chapuzón). Con `dura`, los que se repiten se apagan solos. */
  private fx(id: string, x: number, y: number, scale = 2, flip = false, dura = 0) {
    const s = efecto(this, id, x, y, { scale, flip });
    if (s) this.add2(s);
    if (s && dura) this.time.delayedCall(dura, () => { if (s.active) this.tweens.add({ targets: s, alpha: 0, duration: 150, onComplete: () => s.destroy() }); });
    return s;
  }

  /** Onomatopeya de cómic que salta y se va. */
  private pop(x: number, y: number, s: string, color = 0xffffff, scale = 2) {
    const t = this.add2(txt(this, x, y, s, 'fuente_titulo', scale).setTint(color).setAngle(Phaser.Math.Between(-8, 8)));
    t.setScale(scale * 2);
    this.tweens.add({ targets: t, scale, duration: 140, ease: 'Back.out' });
    this.tweens.add({ targets: t, y: y - 18, alpha: 0, delay: 650, duration: 300, onComplete: () => t.destroy() });
    return t;
  }

  /** Salto en arco de un punto a otro, con sus cuadros de subir, arriba y bajar (o una animación entera, `anim`). */
  private async salto(f: Figura, x1: number, y1: number, ms: number, alto: number, anim?: string) {
    const x0 = f.x, y0 = f.y;
    const o = { t: 0 };
    f.set(anim ?? 'jump_rise', true);
    this.sound.play('esquiva', { volume: 0.35 });
    await new Promise<void>((res) => this.tweens.add({
      targets: o, t: 1, duration: ms,
      onUpdate: () => {
        f.x = x0 + (x1 - x0) * o.t;
        f.y = y0 + (y1 - y0) * o.t - Math.sin(o.t * Math.PI) * alto;
        if (!anim) f.set(o.t < 0.4 ? 'jump_rise' : o.t < 0.6 ? 'jump_apex' : 'jump_fall');
      },
      onComplete: () => res(),
    }));
    if (!anim) f.set('land', true);
  }

  private async run() {
    const S = this;
    const alive = () => !S.done && S.scene.isActive();

    // 0. la presentación
    await this.presenta(alive);
    if (!alive()) return;
    this.clear();

    // 1. negro y texto
    const l1 = this.add2(txt(this, 320, 160, '', 'fuente_ui', 2));
    const l2 = this.add2(txt(this, 320, 192, '', 'fuente_ui', 2).setTint(0xff4040));
    await typewrite(this, l1, 'JAPÓN. INSTITUTO NEKKETSU.', 22);
    await wait(this, 300);
    await typewrite(this, l2, '10 AÑOS INVICTOS.', 18, 440);
    await wait(this, 1100);
    if (!alive()) return;

    // 2. la azotea de Kenji
    await this.azotea(alive);
    if (!alive()) return;

    // 3. la gira: el jet despega y la ruta en el mapa
    await this.vuelo(alive);
    if (!alive()) return;
    await this.ruta(alive);
    if (!alive()) return;

    // 4. Saigón: la Familia GG, cada uno a su manera
    await this.familia(alive);
    if (!alive()) return;

    // 5. el montaje de las pruebas
    await this.montaje(alive);
    if (!alive()) return;

    // 6. el encuentro con el Instituto
    await this.encuentro(alive);
    if (!alive()) return;

    // 7. VS
    await this.vs();
    if (!alive()) return;

    // 8. el puñetazo a la cámara
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

    // 9. el logo, y Thor que se cuela al final
    this.clear();
    this.cameras.main.setBackgroundColor('#0b0b14');
    this.add2(this.add.image(320, 180, 'bg_caracas'));
    this.add2(this.add.image(320, 280, 'bg_azotea'));
    chip.play(MARCHA);
    this.registry.set('marchaSonando', true);
    await buildLogo(this, this.layer, true);
    this.add2(fireworks(this));
    await wait(this, 1100);
    if (!alive()) return;
    const thor = this.fig('thor', -140, 338, 'run', 2);
    await this.ir(thor, { x: 560 }, 700);
    if (!alive()) return;
    thor.set('sit');
    thor.row = 'down_right';
    await wait(this, 250);
    thor.set('bark', true);
    this.sound.play('ladrido', { volume: 0.6 });
    this.pop(580, 290, '¡GUAU!', 0xffe080, 1);
    await wait(this, 1500);
    this.finish();
  }

  /** "FAMILIA GG PRESENTA": la última G se cae y Thor la vuelve a poner en su sitio. */
  private async presenta(alive: () => boolean) {
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
    await wait(this, word.length * 70 + 450);
    if (!alive()) return;
    // la última G tiembla... y se cae
    const g = letters[letters.length - 1];
    const gx = g.x;
    await this.ir(g, { angle: 12 }, 90);
    await this.ir(g, { angle: -10 }, 90);
    chip.blip(880, 0.4, 'sq50', 0.16, 180);
    this.tweens.add({ targets: g, angle: 70, duration: 420 });
    await this.ir(g, { y: 300 }, 480, 'Bounce.out');
    if (!alive()) return;
    this.sound.play('golpe', { volume: 0.4 });
    this.fx('polvo_caer_medio', g.x, 304, 2);
    await wait(this, 300);
    // Thor la ve, la recoge y la tira para arriba
    const thor = this.fig('thor', 800, 318, 'run', 2);
    thor.left = true;
    await this.ir(thor, { x: gx + 34 }, 520);
    if (!alive()) return;
    thor.set('idle');
    this.reac(thor, 'exclamacion', 700);
    chip.blip(1320, 0.08, 'sq25', 0.14);
    await wait(this, 450);
    thor.set('pickup', true);
    await wait(this, 300);
    thor.set('jump', true);
    this.sound.play('ladrido', { volume: 0.5 });
    this.tweens.add({ targets: g, angle: 0, duration: 380 });
    await this.ir(g, { y: 150 }, 380, 'Back.out');
    if (!alive()) return;
    chip.blip(1320, 0.3, 'sq25', 0.18, 1760);
    flash(this, 90);
    thor.set('wag');
    thor.row = 'down_right';
    const pre = this.add2(txt(this, 320, 196, 'PRESENTA', 'fuente_ui', 2).setTint(0xffe080).setAlpha(0));
    this.tweens.add({ targets: pre, alpha: 1, duration: 300 });
    // una ola que recorre las letras (cada una salta un poquito) y un destello al final
    for (const [i, t] of letters.entries()) this.tweens.add({ targets: t, y: t.y - 6, duration: 90, yoyo: true, delay: 200 + i * 55, ease: 'Quad.out' });
    this.time.delayedCall(200 + letters.length * 55, () => { const ul = letters[letters.length - 1]; if (ul?.active) this.fx('brillo_record', ul.x + 6, ul.y - 4, 2, false, 700); });
    await wait(this, 1500);
  }

  /** La azotea de Kenji: la ira, el rayo, la gira y Tetsu que llega tarde y se estrella. */
  private async azotea(alive: () => boolean) {
    this.clear();
    this.cameras.main.fadeIn(600);
    this.add2(this.add.image(320, 180, 'bg_japon'));
    this.petals(0xffb7d0);
    const kenji = this.fig('kenji', 320, 262, 'idle', 2);
    kenji.row = 'up';
    await wait(this, 1300);
    const box = this.dialog('kenji', 'enojo');
    await typewrite(this, box.text, '¿NADIE EN JAPÓN NOS AGUANTA?', 26, 330);
    this.reac(kenji, 'vena_enojo', 1600);
    await wait(this, 800);
    if (!alive()) return;
    kenji.row = 'down';
    kenji.set('taunt', true);
    // rayo, trueno y Kenji se agranda (el cuadro de diálogo queda quieto)
    flash(this, 200, 0xd0c0ff, 0.8);
    chip.boom(0.8);
    this.cameras.main.shake(260, 0.012);
    const aura = this.add2(speedLines(this, 1, 0xff4040));
    aura.setAlpha(0.45);
    this.alFrente(kenji);
    this.tweens.add({ targets: kenji, scale: 3, duration: 380, ease: 'Back.out' });
    await typewrite(this, box.text, '¡ENTONCES NOS VAMOS DE GIRA!', 26, 330);
    this.tweens.add({ targets: kenji, scale: 2, duration: 300 });
    aura.destroy();
    for (const [i, id] of ['ryu', 'goro'].entries()) {
      const fromLeft = i === 0, tx = [210, 440][i];
      const f = this.fig(id, fromLeft ? -140 : 780, 262, 'run', 2);
      f.left = !fromLeft;
      this.tweens.add({ targets: f, x: tx, duration: 650, delay: i * 220, onComplete: () => { f.set('idle'); f.row = 'down'; } });
    }
    await wait(this, 1000);
    if (!alive()) return;
    // Tetsu llega tarde, a toda velocidad... y se tropieza
    const tetsu = this.fig('tetsu', -140, 262, 'run', 2);
    await this.ir(tetsu, { x: 70 }, 260);
    tetsu.set('ko_bounce', true);
    this.sound.play('golpe', { volume: 0.5 });
    this.pop(100, 200, '¡PAF!', 0xffe080);
    this.fx('polvo_caer_medio', 100, 264, 2);
    await this.ir(tetsu, { x: 120 }, 380, 'Quad.out');
    if (!alive()) return;
    box.text.setText('');
    for (const f of [kenji, this.layer.list.find((o) => o instanceof Figura && o.who === 'ryu') as Figura]) if (f) { f.left = true; this.reac(f, 'gota_nervios', 1300); }
    chip.blip(330, 0.4, 'tri', 0.14, 220);
    await typewrite(this, box.text, '...', 6, 220);
    tetsu.set('fall_getup', true);
    await wait(this, 450);
    if (!alive()) return;
    // se para, mira a la cámara y se pone colorado
    tetsu.row = 'down';
    tetsu.set('idle');
    this.reac(tetsu, 'sonrojo', 1000);
    await wait(this, 800);
  }

  /** La Familia GG llega a Saigón, cada uno con su entrada; después Thor. */
  private async familia(alive: () => boolean) {
    this.clear();
    chip.play(SAIGON);
    this.add2(this.add.image(320, 180, 'bg_saigon'));
    const cap = this.add2(txt(this, 320, 22, 'SAIGÓN, VIETNAM', 'fuente_titulo', 1));
    cap.setAlpha(0);
    this.tweens.add({ targets: cap, alpha: 1, duration: 300 });
    const thor = this.fig('thor', -140, 322, 'run', 2);
    this.tweens.add({ targets: thor, x: 800, duration: 1500, onComplete: () => thor.destroy() });
    chip.blip(520, 0.12, 'saw', 0.12, 300);
    this.sound.play('ladrido', { volume: 0.6 });
    await wait(this, 800);
    const Y = 316, spots = [190, 270, 350, 430];
    const [rick, steph, sophie, alana] = FAMILIA.map((m) => this.fig(m.id, -160, Y, 'idle', 2));
    const todos = [rick, steph, sophie, alana];
    const tarjeta = async (i: number, ms = 1250) => {
      const card = this.card(FAMILIA[i], todos[i], todos);
      chip.blip(660 + i * 110, 0.1, 'sq25', 0.16);
      await wait(this, ms);
      await card.cerrar();
    };

    // Rick: llega, posa y brilla
    rick.set('run');
    await this.ir(rick, { x: spots[0] }, 520);
    if (!alive()) return;
    rick.row = 'down';
    rick.set('victory', true);
    this.fx('brillo_record', rick.x + 8, Y - 50, 2, false, 750);
    chip.blip(1760, 0.12, 'sq25', 0.12);
    await tarjeta(0);
    if (!alive()) return;

    // Steph: llega tan rápido que se pasa, frena y vuelve caminando para atrás
    steph.set('run');
    const lineas = this.add2(speedLines(this, 1, 0xffffff)).setAlpha(0.25);
    await this.ir(steph, { x: 610 }, 260);
    this.fx('polvo_frenar_grande', 610, Y, 2);
    this.sound.play('esquiva', { volume: 0.5 });
    this.pop(560, 230, '¡ÑIIIC!', 0xffffff, 1);
    await wait(this, 300);
    lineas.destroy();
    steph.left = true;
    steph.set('walk');
    this.reac(steph, 'gota_nervios', 900);
    await this.ir(steph, { x: spots[1] }, 650);
    if (!alive()) return;
    steph.left = false;
    steph.row = 'down';
    steph.set('celebrate', true);
    await tarjeta(1);
    if (!alive()) return;

    // Sophie: entra dando un salto y cae justo en su sitio
    sophie.x = -130; sophie.y = Y;
    await this.salto(sophie, spots[2], Y, 700, 110);
    this.fx('polvo_caer_medio', spots[2], Y, 2);
    sophie.row = 'down';
    sophie.set('celebrate', true);
    chip.blip(1320, 0.15, 'sq25', 0.14, 1760);
    await tarjeta(2);
    if (!alive()) return;

    // Alana: llega caminando tranquila... y con una mirada los asusta a todos
    alana.set('walk');
    await this.ir(alana, { x: spots[3] }, 900);
    if (!alive()) return;
    alana.row = 'down';
    alana.set('idle');
    await wait(this, 200);
    for (const f of [rick, steph, sophie]) { f.left = false; f.row = 'right'; f.set('idle'); }
    alana.left = true;
    alana.set('taunt', true);
    this.reac(alana, 'vena_enojo', 1500);
    this.cameras.main.shake(140, 0.006);
    chip.blip(160, 0.3, 'saw', 0.16, 90);
    await wait(this, 350);
    for (const f of [rick, steph, sophie]) this.reac(f, 'gota_nervios', 1400);
    await tarjeta(3, 1400);
    if (!alive()) return;
    alana.left = false;

    // Thor vuelve corriendo y tiene su tarjeta
    const thor2 = this.fig('thor', 800, 330, 'run', 2);
    thor2.left = true;
    await this.ir(thor2, { x: 515 }, 550);
    if (!alive()) return;
    thor2.set('wag');
    thor2.row = 'down_right';
    const tc = this.thorCard(thor2, [...todos, thor2]);
    this.sound.play('ladrido', { volume: 0.6 });
    await wait(this, 1300);
    await tc.cerrar();
    if (!alive()) return;
    for (const f of [rick, steph, sophie, alana]) { f.row = 'down'; f.set('victory', true); }
    thor2.set('celebrate', true);
    const fam = this.add2(txt(this, 320, 60, 'FAMILIA GG', 'fuente_titulo', 3));
    const sub = this.add2(txt(this, 320, 92, 'DE CARACAS A SAIGÓN', 'fuente_ui', 2));
    sub.setTint(0xffe080);
    this.tweens.add({ targets: fam, scale: { from: 5, to: 3 }, duration: 260, ease: 'Back.out' });
    this.add2(fireworks(this));
    chip.boom(0.4);
    await wait(this, 1700);
  }

  /**
   * Montaje estilo anime: un panel inclinado por prueba, con el atleta haciendo lo suyo de verdad
   * (corre, salta la valla, se clava al agua, lanza, patea), y al final las cinco a la vez.
   */
  private async montaje(alive: () => boolean) {
    chip.play(PELEA);
    const cortes: { bg: string; color: number; palabra: string; lugar: string; escena: (der: boolean) => Promise<void> }[] = [
      { bg: 'bg_saigon', color: 0xf2c230, palabra: '¡CROSS COUNTRY!', lugar: 'SAIGÓN · 5 TRAMOS', escena: (der) => this.corteCross(der) },
      { bg: 'bg_cocora', color: 0x3cc86a, palabra: '¡VALLAS!', lugar: 'EJE CAFETERO, COLOMBIA', escena: (der) => this.corteVallas(der) },
      { bg: 'bg_halong', color: 0x40c0ff, palabra: '¡NATACIÓN!', lugar: 'BAHÍA DE HẠ LONG, VIETNAM', escena: (der) => this.corteNatacion(der) },
      { bg: 'bg_llanos', color: 0xf2a03a, palabra: '¡JABALINA!', lugar: 'LLANOS DE APURE, VENEZUELA', escena: (der) => this.corteJabalina(der) },
      { bg: 'bg_caracas', color: 0xd0303a, palabra: '¡KACHINUKI!', lugar: 'AZOTEA DE CARACAS', escena: (der) => this.cortePelea(der) },
    ];
    for (const [n, c] of cortes.entries()) {
      this.clear();
      const der = n % 2 === 0;
      this.add2(this.add.rectangle(320, 180, 800, 360, 0x05050c));
      // panel inclinado con el escenario adentro
      const poly = der
        ? [{ x: 90, y: 0 }, { x: 720, y: 0 }, { x: 720, y: 360 }, { x: 0, y: 360 }]
        : [{ x: -80, y: 0 }, { x: 550, y: 0 }, { x: 640, y: 360 }, { x: -80, y: 360 }];
      const bg = this.add2(this.add.image(320, 180, c.bg).setScale(1.2));
      bg.setMask(this.mask(poly));
      this.tweens.add({ targets: bg, x: der ? 296 : 344, duration: 1700 });
      if (c.bg === 'bg_caracas') { const az = this.add2(this.add.image(320, 290, 'bg_azotea')); az.setMask(this.mask(poly)); }
      const tinte = this.add2(this.add.graphics());
      tinte.fillStyle(c.color, 0.16).fillPoints(poly, true);
      const vel = this.fx('lineas_velocidad', -80, 0, 1);
      vel?.setAlpha(0.35).setScale(800 / 640, 1);
      // la palabra y el lugar
      const w = this.add2(txt(this, der ? 420 : 220, 70, c.palabra, 'fuente_titulo', c.palabra.length > 10 ? 2 : 3));
      const sc = w.scaleX;
      w.setScale(sc * 3).setAngle(der ? -5 : 5);
      this.tweens.add({ targets: w, scale: sc, duration: 170, ease: 'Quad.in', onComplete: () => { chip.boom(0.7); this.cameras.main.shake(150, 0.012); } });
      const l = this.add2(txt(this, der ? 420 : 220, 104, c.lugar, 'fuente_ui', 1).setTint(0xffe080).setAlpha(0).setAngle(der ? -5 : 5));
      this.tweens.add({ targets: l, alpha: 1, delay: 250, duration: 200 });
      // el borde blanco del corte
      const filo = this.add2(this.add.graphics());
      filo.fillStyle(0xffffff).fillPoints(der ? [{ x: 84, y: 0 }, { x: 94, y: 0 }, { x: 4, y: 360 }, { x: -6, y: 360 }] : [{ x: 546, y: 0 }, { x: 556, y: 0 }, { x: 646, y: 360 }, { x: 636, y: 360 }], true);
      flash(this, 90);
      await c.escena(der);
      if (!alive()) return;
    }
    // las cinco a la vez
    this.clear();
    this.add2(this.add.rectangle(320, 180, 800, 360, 0xffffff));
    const poses: { id: string; pack: string; anim: string; agua?: boolean }[] = [
      { id: 'steph', pack: 'ngg_mov', anim: 'run' },
      { id: 'sophie', pack: 'atletismo', anim: 'sprint' },
      { id: 'alana', pack: 'natacion', anim: 'tread_water', agua: true },
      { id: 'rick', pack: 'atletismo', anim: 'javelin' },
      { id: 'thor', pack: '', anim: 'bark' },
    ];
    for (const [i, c] of cortes.entries()) {
      const x0 = -36 + i * 136;
      const poly = [{ x: x0 + 40, y: 0 }, { x: x0 + 172, y: 0 }, { x: x0 + 132, y: 360 }, { x: x0, y: 360 }];
      const bg = this.add2(this.add.image(x0 + 86, 180, c.bg));
      bg.setMask(this.mask(poly));
      const tinte = this.add2(this.add.graphics());
      tinte.fillStyle(c.color, 0.22).fillPoints(poly, true);
      const p = poses[i];
      if (p.agua) { const a = this.add2(this.add.graphics()); a.fillStyle(0x1f7fb8, 0.85).fillPoints([{ x: x0 + 13, y: 296 }, { x: x0 + 145, y: 296 }, { x: x0 + 132, y: 360 }, { x: x0, y: 360 }], true); a.fillStyle(0x9ad8f0).fillRect(x0 + 13, 296, 132, 2); }
      const f = this.fig(p.id, x0 + 76, p.agua ? 318 : 322, 'idle', 2.5);
      if (p.pack) f.anim.prefer = p.pack;
      f.set(p.anim, true);
      f.row = p.id === 'thor' ? 'down_right' : 'right';
      this.tick.push(() => { if (f.active && f.anim.done) f.set(p.anim, true); });
      f.setAlpha(0);
      this.tweens.add({ targets: f, alpha: 1, duration: 120, delay: i * 100, onStart: () => chip.blip(520 + i * 130, 0.08, 'sq25', 0.16) });
    }
    await wait(this, 560);
    const go = this.add2(txt(this, 320, 100, '¡A COMPETIR!', 'fuente_titulo', 4));
    go.setScale(12);
    this.tweens.add({ targets: go, scale: 4, duration: 220, ease: 'Quad.in', onComplete: () => { chip.boom(0.9); flash(this, 160); this.cameras.main.shake(280, 0.018); } });
    await wait(this, 1700);
  }

  /** Cross: Steph pasa volando con Rick detrás, y una moto que casi se los lleva. */
  private async corteCross(der: boolean) {
    const dir = der ? 1 : -1, x0 = der ? -160 : 800, x1 = der ? 840 : -200;
    const steph = this.fig('steph', x0, 318, 'run', 3); steph.left = !der;
    const rick = this.fig('rick', x0 - dir * 90, 324, 'run', 3); rick.left = !der;
    const moto = this.add2(this.add.container(der ? 860 : -220, 300));
    const body = this.add.graphics();
    body.fillStyle(0xc03030).fillRect(-27, -30, 54, 18).fillStyle(0x303038).fillCircle(-18, -9, 9).fillCircle(18, -9, 9).fillStyle(0xe8e8f0).fillRect(-9, -51, 15, 21);
    moto.add(body);
    let paso = 0;
    this.tick.push((dt) => {
      paso += dt;
      if (paso > 0.12 && steph.active) { paso = 0; this.fx('polvo_correr_medio', steph.x - dir * 10, 318, 2, !der); }
    });
    this.tweens.add({ targets: steph, x: x1, duration: 1500 });
    this.tweens.add({ targets: rick, x: x1 - dir * 90, duration: 1500 });
    await wait(this, 520);
    chip.blip(523, 0.12, 'sq50', 0.12, 494);
    this.time.delayedCall(140, () => chip.blip(523, 0.12, 'sq50', 0.12, 494));
    this.tweens.add({ targets: moto, x: der ? -240 : 880, duration: 800 });
    this.pop(320, 200, '¡PI PI!', 0xff8080, 1);
    this.reac(rick, 'exclamacion', 600);
    await wait(this, 1000);
  }

  /** Vallas: Sophie a toda velocidad y la valla por encima. */
  private async corteVallas(der: boolean) {
    const vx = 330;
    this.add2(this.add.image(vx, 338, 'valla').setOrigin(0.5, 1).setScale(3).setFlipX(!der));
    const sophie = this.fig('sophie', der ? -150 : 790, 338, 'sprint', 3);
    sophie.anim.prefer = 'atletismo';
    sophie.set('sprint', true);
    sophie.left = !der;
    const dir = der ? 1 : -1;
    await this.ir(sophie, { x: vx - dir * 110 }, 520);
    // el salto de longitud del pack de atletismo: así no cambia de ropa en el aire
    await this.salto(sophie, vx + dir * 110, 338, 520, 70, 'long_jump');
    sophie.set('sprint', true);
    this.fx('polvo_caer_medio', sophie.x, 338, 2);
    this.tweens.add({ targets: sophie, x: der ? 720 : -80, duration: 520 });
    await wait(this, 620);
  }

  /** Natación: Alana se tira del poyete, se clava y sale nadando con su estela. */
  private async corteNatacion(der: boolean) {
    const agua = this.add2(this.add.graphics());
    agua.fillStyle(0x1f7fb8, 0.75).fillRect(-80, 300, 800, 60);
    agua.fillStyle(0x9ad8f0).fillRect(-80, 300, 800, 2);
    const bx = der ? 70 : 570;
    const poyete = this.add2(this.add.graphics());
    poyete.fillStyle(0xe8e8f0).fillRect(bx - 30, 270, 60, 30).fillStyle(0x8a8a96).fillRect(bx - 30, 296, 60, 6);
    const alana = this.fig('alana', bx, 270, 'idle', 3);
    alana.anim.prefer = 'natacion';
    alana.set('idle', true);
    alana.left = !der;
    await wait(this, 250);
    const dir = der ? 1 : -1, cx = bx + dir * 230;
    alana.set('dive', true);
    this.sound.play('esquiva', { volume: 0.4 });
    const o = { t: 0 };
    await new Promise<void>((res) => this.tweens.add({ targets: o, t: 1, duration: 560, onUpdate: () => { alana.x = bx + (cx - bx) * o.t; alana.y = 270 + 52 * o.t - Math.sin(o.t * Math.PI) * 60; }, onComplete: () => res() }));
    this.fx('chapuzon_grande', cx, 306, 2.5);
    this.sound.play('esquiva', { volume: 0.5, rate: 0.6 });
    this.pop(cx, 220, '¡SPLASH!', 0x9ad8f0, 1);
    alana.set('swim', true);
    alana.y = 326;
    const estela = this.fx('estela', alana.x - dir * 30, 306, 2.5, !der);
    this.tick.push(() => { if (estela?.active && alana.active) estela.setPosition(alana.x - dir * 30, 306); });
    await this.ir(alana, { x: der ? 800 : -160 }, 1100);
  }

  /** Jabalina: Rick corre, lanza, y la jabalina cruza el cielo hasta el récord. */
  private async corteJabalina(der: boolean) {
    const rick = this.fig('rick', der ? 80 : 560, 336, 'javelin', 3);
    rick.anim.prefer = 'atletismo';
    rick.set('javelin', true);
    rick.left = !der;
    const dir = der ? 1 : -1;
    this.tweens.add({ targets: rick, x: rick.x + dir * 120, duration: 520 });
    await wait(this, 620);
    const j = this.add2(this.add.image(rick.x + dir * 20, 250, 'jabalina').setScale(3).setFlipX(!der).setAngle(der ? -30 : 30));
    chip.blip(440, 0.5, 'saw', 0.12, 1320);
    this.sound.play('esquiva', { volume: 0.5 });
    const o = { t: 0 }, xa = j.x, xb = der ? 800 : -160;
    await new Promise<void>((res) => this.tweens.add({ targets: o, t: 1, duration: 760, onUpdate: () => {
      j.x = xa + (xb - xa) * o.t;
      j.y = 250 - Math.sin(o.t * Math.PI * 0.8) * 120 + o.t * 30;
      j.setAngle((der ? 1 : -1) * (-30 + o.t * 60));
    }, onComplete: () => res() }));
    rick.set('celebrate', true);
    const rec = this.add2(txt(this, der ? 500 : 140, 150, '¡RÉCORD!', 'fuente_titulo', 2).setTint(0xffe040));
    rec.setScale(5);
    this.tweens.add({ targets: rec, scale: 2, duration: 160, ease: 'Quad.in' });
    this.fx('brillo_record', der ? 560 : 80, 140, 3, false, 700);
    await wait(this, 520);
  }

  /** Kachinuki: Steph le mete una patada a Kenji y lo saca volando con estrellitas. */
  private async cortePelea(der: boolean) {
    const kx = der ? 430 : 210;
    const kenji = this.fig('kenji', kx, 330, 'taunt', 3);
    kenji.left = der;
    const steph = this.fig('steph', der ? -150 : 790, 330, 'run', 3);
    steph.left = !der;
    const dir = der ? 1 : -1;
    await this.ir(steph, { x: kx - dir * 70 }, 380);
    steph.set('kick_martial', true);
    await wait(this, 160);
    this.fx('chispa_golpe_pesado', kx - dir * 10, 270, 3);
    this.sound.play('critico', { volume: 0.7 });
    chip.boom(0.7);
    flash(this, 100);
    this.cameras.main.shake(220, 0.02);
    // el golpe congela un instante y la cámara se acerca de un tirón
    const cam = this.cameras.main;
    this.tweens.add({ targets: cam, zoom: 1.3, duration: 70, yoyo: true, hold: 160 });
    this.pop(kx, 200, '¡PUM!', 0xffe040, 3);
    kenji.set('ko_bounce', true);
    await wait(this, 180);
    this.tweens.add({ targets: kenji, x: kx + dir * 150, duration: 520, ease: 'Quad.out' });
    this.tweens.add({ targets: kenji, y: 270, duration: 260, yoyo: true, ease: 'Quad.out' });
    await wait(this, 560);
    this.reac(kenji, 'estrellas_mareo', 900);
    steph.row = 'down_right';
    steph.set('victory', true);
    await wait(this, 650);
  }

  /**
   * El encuentro en Saigón: el Instituto aparece entre rayos y se burla. Alana llama a Thor, Thor ladra, Goro
   * (el gigante) se asusta y se esconde detrás de Kenji. Kenji, rojo de la pena: "¡nos vemos en la pista!".
   */
  private async encuentro(alive: () => boolean) {
    this.clear();
    chip.play(SAIGON);
    this.add2(this.add.image(320, 180, 'bg_saigon'));
    const Y = 318;
    const fam = FAMILIA.map((m, i) => { const f = this.fig(m.id, 70 + i * 62, Y, 'celebrate', 2); f.row = 'down_right'; return f; });
    const [rick, , sophie, alana] = fam;
    const thor = this.fig('thor', 330, Y + 6, 'wag', 2);
    thor.row = 'down_right';
    await wait(this, 700);
    if (!alive()) return;
    // se nubla, rayo, y llegan ellos
    chip.play(TENSION);
    const sombra = this.add2(this.add.rectangle(320, 180, 800, 360, 0x0a0a20, 0));
    this.tweens.add({ targets: sombra, fillAlpha: 0.5, duration: 400 });
    flash(this, 160, 0xd0c0ff, 0.8);
    chip.boom(0.7);
    this.cameras.main.shake(200, 0.01);
    for (const f of fam) { f.set('idle'); f.row = 'right'; }
    // Kenji adelante, el resto detrás en fila: Ryu, Goro (el gigante) y Tetsu
    const xs = [440, 506, 566, 622];
    const inst = INSTITUTO.map((id, i) => {
      const f = this.fig(id, 800 + i * 30, Y, 'run', 2);
      f.left = true;
      f.setTintFill(0x05050c);
      this.tweens.add({ targets: f, x: xs[i], duration: 600, delay: i * 120, onComplete: () => f.set('idle') });
      return f;
    });
    this.layer.bringToTop(sombra);
    for (const f of [...fam, thor, ...inst]) this.alFrente(f);
    await wait(this, 1100);
    if (!alive()) return;
    flash(this, 140);
    for (const f of inst) f.clearTint();
    const [kenji, ryu, goro, tetsu] = inst;
    const nombre = this.add2(txt(this, 520, 40, 'INSTITUTO NEKKETSU', 'fuente_titulo_plata', 1));
    nombre.setScale(4);
    this.tweens.add({ targets: nombre, scale: 1, duration: 180, ease: 'Quad.in', onComplete: () => chip.boom(0.5) });
    for (const f of fam) this.reac(f, 'exclamacion', 700);
    await wait(this, 700);
    this.tweens.add({ targets: nombre, alpha: 0, duration: 200 });
    const box = this.dialog('kenji', 'feliz', true);
    kenji.set('taunt', true);
    await typewrite(this, box.text, '¿ESTOS SON LOS CAMPEONES? JA.', 24, 330);
    this.reac(rick, 'vena_enojo', 1400);
    this.reac(sophie, 'vena_enojo', 1400);
    await wait(this, 400);
    if (!alive()) return;
    // Goro se ríe a carcajadas
    goro.set('taunt', true);
    for (const [i, s] of ['¡JA!', '¡JA!', '¡JA!'].entries()) this.time.delayedCall(i * 220, () => { this.pop(goro.x - 10 + i * 18, 214 - i * 10, s, 0xffd0d0, 1); chip.blip(220 - i * 20, 0.08, 'sq50', 0.14); });
    this.cameras.main.shake(400, 0.004);
    await wait(this, 900);
    if (!alive()) return;
    box.close();
    // Alana: ¡THOR!
    const box2 = this.dialog('alana', 'enojo', true);
    alana.set('taunt', true);
    this.reac(alana, 'vena_enojo', 1200);
    await typewrite(this, box2.text, '¡THOR! ¡AL RESCATE!', 22, 880);
    if (this.cache.audio.exists('thor_rescate')) this.sound.play('thor_rescate', { volume: 0.7 });
    if (!alive()) return;
    thor.set('run');
    thor.row = 'right';
    await this.ir(thor, { x: kenji.x - 66 }, 420);
    if (!alive()) return;
    box2.close();
    thor.set('bark', true);
    this.sound.play('ladrido', { volume: 0.8 });
    this.pop(thor.x + 8, this.cabeza(thor)[1] - 30, '¡GUAU!', 0xffe080);
    this.cameras.main.shake(160, 0.01);
    await wait(this, 250);
    // el gigante pega un brinco y se esconde detrás de Kenji
    this.reac(goro, 'exclamacion', 600);
    chip.blip(660, 0.3, 'sq50', 0.18, 1760);
    // ... y cae detrás de Kenji, que no lo tapa ni a la mitad
    this.tweens.add({ targets: goro, y: Y - 80, duration: 280, ease: 'Quad.out', yoyo: true });
    // se asoma por un lado: el cuerpo detrás de Kenji y la cara afuera, para que se vea el llanto
    await this.ir(goro, { x: kenji.x + 34 }, 560);
    this.layer.moveBelow(goro, kenji);
    // de frente, temblando detrás de Kenji (que no lo tapa ni a la mitad), llorando a chorros
    goro.row = 'down';
    goro.set('sad', true);
    const tiembla = this.tweens.add({ targets: goro, x: goro.x + 2, duration: 50, yoyo: true, repeat: -1 });
    this.reac(goro, 'lagrima_comica', 1900);
    this.pop(goro.x + 30, this.cabeza(goro)[1] - 26, '¡BUAAA!', 0x9ad8ff, 1);
    thor.set('bark', true);
    this.sound.play('ladrido', { volume: 0.6 });
    // Ryu se aparta del llorón, y Tetsu tampoco sabe qué hacer
    this.tweens.add({ targets: ryu, x: ryu.x + 34, duration: 260, ease: 'Quad.out' });
    for (const f of [ryu, tetsu]) this.reac(f, 'gota_nervios', 1500);
    await wait(this, 700);
    if (!alive()) return;
    // Kenji, colorado, de frente a la cámara
    kenji.row = 'down';
    kenji.set('idle');
    this.reac(kenji, 'sonrojo', 1800);
    const box3 = this.dialog('kenji', 'enojo', true);
    await typewrite(this, box3.text, '¡N-NOS VEMOS EN LA PISTA!', 26, 330);
    if (!alive()) return;
    // deja de temblar para salir corriendo con los demás
    tiembla.stop();
    goro.row = 'right';
    kenji.row = 'right';
    for (const [i, f] of inst.entries()) { f.left = false; f.set('run'); this.tweens.add({ targets: f, x: 860 + i * 20, duration: 600, delay: (3 - i) * 60 }); }
    chip.blip(880, 0.4, 'sq25', 0.12, 220);
    await wait(this, 600);
    box3.close();
    this.tweens.add({ targets: sombra, fillAlpha: 0, duration: 300 });
    for (const f of fam) { f.row = 'down'; f.set('victory', true); }
    thor.row = 'down_right';
    thor.set('celebrate', true);
    this.pop(320, 160, '¡JA!', 0xffe080, 3);
    chip.blip(1320, 0.3, 'sq25', 0.2, 1760);
    await wait(this, 1300);
  }

  /** VS: los dos equipos frente a frente. */
  private async vs() {
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
      g.fillStyle(0x9a1a2a).fillPoints([{ x: 330, y: 0 }, { x: 720, y: 0 }, { x: 720, y: 360 }, { x: 250, y: 360 }], true);
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
    await wait(this, 2200);
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
      for (const c of capas) { c.img.x -= c.v * dt; if (c.img.x < -80 - c.img.displayWidth / 2) c.img.x += 800 + c.img.displayWidth; }
      jet.y = 170 + Math.sin(t * 2.6) * 4;
      caras.forEach((c, i) => c.setPosition(...mid(...JET.ventanas[i])));
      marca.setPosition(...mid(64, 31));
      estela.setPosition(...mid(84, 42));
      rayas.clear();
      for (let k = 0; k < 14; k++) {
        const y = 30 + ((k * 53 + Math.floor(t * 40)) % 300), x = 720 - ((t * 900 + k * 137) % 880);
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
    await wait(this, 2000);
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
      // el mapa siempre cubre la pantalla entera, también la ancha: el acercamiento mínimo lo da su ancho
      const m = margen(this), z = Math.max(view.z, (640 + 2 * m) / 640);
      world.setScale(z);
      world.x = Phaser.Math.Clamp(320 - view.cx * z, 640 + m - 640 * z, -m);
      world.y = Phaser.Math.Clamp(180 - view.cy * z, 360 - 360 * z, 0);
      for (const n of nubes) { n.x -= 6 * dt; if (n.x < -150) n.x = 790; }
    });
    // arriba el título; abajo el pasaporte que se va llenando
    const barra = this.add2(this.add.graphics());
    barra.fillStyle(0x08081a, 0.82).fillRect(-80, 0, 800, 26).fillRect(-80, 312, 800, 48);
    barra.fillStyle(0xf2c230).fillRect(-80, 26, 800, 1).fillRect(-80, 311, 800, 1);
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
    await volar(1, 2, 2400, 150, [2.2, 1.15, 2.0]);
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
    await wait(this, 1400);
  }

  /** Máscara con la forma de un panel. */
  private mask(poly: { x: number; y: number }[]) {
    const g = this.make.graphics({}, false);
    g.fillStyle(0xffffff).fillPoints(poly, true);
    this.masks.push(g);
    return g.createGeometryMask();
  }

  /** Caja de diálogo con retrato. `arriba` la pone arriba, para no tapar a nadie. `close` la quita. */
  private dialog(id: string, expr: string, arriba = false) {
    const c = this.add2(this.add.container(0, arriba ? -262 : 0)).setName('dialogo');
    c.add(panel(this, 20, 286, 600, 64));
    c.add(this.add.image(54, 318, `retratos:${id}`, `chico_${expr}`).setScale(1));
    const nombres: Record<string, string> = { kenji: 'KENJI "TORO" SAKAMOTO', alana: 'ALANA, LA PEQUEÑA TERRIBLE' };
    c.add(txt(this, 86, 300, nombres[id] ?? (kit().atletas[id]?.nombre ?? id), 'fuente_ui', 1, 0).setTint(0xf2c230));
    const text = txt(this, 86, 324, '', 'fuente_ui', 2, 0);
    c.add(text);
    return { text, close: () => c.destroy() };
  }

  /** Tarjeta de presentación de un atleta. */
  /**
   * La tarjeta de presentación sobre quien se presenta, con su flechita apuntándole. Los demás quedan en penumbra
   * mientras dura, para que el ojo vaya directo a quien toca.
   */
  private tarjetaSobre(f: Figura, otros: Figura[], color: number, llenar: (c: Phaser.GameObjects.Container, x0: number, y0: number) => void) {
    const W = 228, H = 96;
    const [hx, hy, r] = this.cabeza(f);
    const cx = Phaser.Math.Clamp(hx, W / 2 + 10, 640 - W / 2 - 10), x0 = Math.round(cx - W / 2);
    const y1 = Math.round(hy - r - 14), y0 = y1 - H;
    const c = this.add.container(0, 0).setName('tarjeta');
    this.layer.add(c);
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35).fillRect(x0 + 4, y0 + 4, W, H);
    g.fillStyle(0x08081a, 0.94).fillRect(x0, y0, W, H);
    g.fillStyle(color).fillRect(x0, y0, W, 4);
    g.lineStyle(2, 0xf2c230).strokeRect(x0 + 1, y0 + 1, W - 2, H - 2);
    // la flechita, del borde de abajo a la cabeza
    const px = Phaser.Math.Clamp(hx, x0 + 14, x0 + W - 14);
    g.fillStyle(0xf2c230).fillTriangle(px - 8, y1, px + 8, y1, hx, y1 + 10);
    g.fillStyle(0x08081a).fillTriangle(px - 5, y1 - 1, px + 5, y1 - 1, hx, y1 + 6);
    c.add(g);
    llenar(c, x0, y0);
    // las reacciones que ya están en pantalla siguen viéndose encima de la tarjeta
    for (const m of this.marcas) if (m.active) this.layer.bringToTop(m);
    // aparece desde arriba, con rebote
    c.setY(y0 - 30).setAlpha(0);
    this.tweens.add({ targets: c, y: 0, alpha: 1, duration: 260, ease: 'Back.out' });
    const sombra = otros.filter((o) => o !== f);
    for (const o of sombra) o.setTint(0x6a6a88);
    // un destello que barre a quien se presenta
    const brillo = this.add2(this.add.rectangle(hx, f.y - f.celda * f.scaleY * 0.5, 6, f.celda * f.scaleY, 0xffffff, 0.5).setAngle(18));
    this.tweens.add({ targets: brillo, x: hx + 40, alpha: 0, duration: 380, onComplete: () => brillo.destroy() });
    return {
      cerrar: () => new Promise<void>((res) => {
        for (const o of sombra) o.clearTint();
        this.tweens.add({ targets: c, alpha: 0, y: -12, duration: 160, onComplete: () => { c.destroy(); res(); } });
      }),
    };
  }

  private card(m: (typeof FAMILIA)[number], f: Figura, otros: Figura[]) {
    return this.tarjetaSobre(f, otros, m.color, (c, x0, top) => {
      c.add(this.add.image(x0 + 42, top + 50, `retratos:${m.id}`, 'grande_feliz').setScale(0.7));
      c.add(txt(this, x0 + 84, top + 16, m.nombre, 'fuente_titulo', 1, 0));
      c.add(txt(this, x0 + 84, top + 38, m.apodo, 'fuente_ui', 1, 0).setTint(0xffe080));
      c.add(txt(this, x0 + 84, top + 58, 'TÉCNICA', 'fuente_ui', 1, 0).setTint(0x8a8ab0));
      c.add(txt(this, x0 + 84, top + 72, m.tecnica, 'fuente_ui', 1, 0).setTint(0xff6a6a));
    });
  }

  private thorCard(f: Figura, otros: Figura[]) {
    return this.tarjetaSobre(f, otros, 0xc87a3a, (c, x0, top) => {
      const t = new Figura(this, x0 + 42, top + 86, 'thor', 'wag').setScale(2);
      t.row = 'down_right';
      c.add(t);
      this.tick.push((dt) => { if (t.active) t.step(dt); });
      c.add(txt(this, x0 + 84, top + 16, 'THOR', 'fuente_titulo', 1, 0));
      c.add(txt(this, x0 + 84, top + 38, 'EL GUARDIÁN', 'fuente_ui', 1, 0).setTint(0xffe080));
      c.add(txt(this, x0 + 84, top + 58, 'TÉCNICA', 'fuente_ui', 1, 0).setTint(0x8a8ab0));
      c.add(txt(this, x0 + 84, top + 72, '¡GUAU GUAU!', 'fuente_ui', 1, 0).setTint(0xff6a6a));
    });
  }

  private petals(color: number) {
    const ps: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < 40; i++) ps.push(this.add2(this.add.image(-80 + Math.random() * 800, Math.random() * 360, 'px').setTint(color).setScale(0.5 + Math.random() * 0.5)));
    this.tick.push((dt) => {
      for (const p of ps) {
        p.x -= (40 + (p.scale * 30)) * dt;
        p.y += (18 + Math.sin(p.x / 20) * 20) * dt;
        if (p.x < -4) { p.x = 644; p.y = Math.random() * 300; }
        if (p.y > 364) p.y = -4;
      }
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
