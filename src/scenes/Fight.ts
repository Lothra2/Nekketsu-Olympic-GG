import Phaser from 'phaser';
import { Actor, Item, NOTHING, type Intent, type World } from '../fight/actor';
import { Brain } from '../fight/brain';
import { DEPTH, FLOOR_TOP, XMAX, XMIN, type AttackDef } from '../fight/defs';
import { Figura } from '../core/figura';
import { Input } from '../core/input';
import { chip, PELEA, VICTORIA } from '../core/music';
import { txt, flash, speedLines } from '../core/ui';
import { FAMILIA, INSTITUTO, INFO } from './Select';
import type { Gira } from '../events/base';

/** acercamiento de la cámara en la pelea: más cerca en 1 contra 1 */
const ZOOMS: Record<string, number> = { '1v1': 1.75, '4v4': 1.45 };

const ARMAS_PISO = ['chancleta', 'tubo', 'pote_basura', 'silla_plastica', 'coco', 'paraguas', 'escoba', 'chancleta_rosada', 'cono', 'llanta'];

/** Qué técnica usa cada atleta con la barra Nekketsu llena. */
const TECNICA: Record<string, 'mach' | 'huracan' | 'chilena' | 'thor' | 'dragon' | 'tackle'> = {
  rick: 'mach', steph: 'huracan', sophie: 'chilena', alana: 'thor', kenji: 'dragon', ryu: 'huracan', goro: 'tackle', tetsu: 'mach',
};

interface FightData { modo: string; jugador: string; rival: string; gira?: boolean }

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
  private thorFan: Figura | null = null;
  private thorRun: { f: Figura; owner: Actor; hit: Set<Actor>; dir: number } | null = null;
  private specials = new Map<Actor, { kind: string; n: number; t: number }>();
  private fullMeter = new Set<Actor>();
  private ui!: Phaser.GameObjects.Layer;
  private uiCam!: Phaser.Cameras.Scene2D.Camera;
  private camLock = false;
  private zoom = 1.45;
  private get camY() { return 360 - 180 / this.zoom; }

  constructor() { super('Fight'); }

  init(d: FightData) {
    this.data0 = { modo: d.modo ?? '1v1', jugador: d.jugador ?? 'rick', rival: d.rival ?? 'kenji', gira: !!d.gira };
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
  }

  get sc(): Phaser.Scene { return this; }

  create() {
    this.cameras.main.fadeIn(250);
    // el mundo se ve de cerca y sigue la acción; el marcador va en su propia capa, sin acercar
    this.ui = this.add.layer().setDepth(10000);
    this.zoom = ZOOMS[this.data0.modo] ?? 1.45;
    this.cameras.main.setZoom(this.zoom).setBounds(0, 0, 640, 360).centerOn(320, this.camY);
    this.cameras.main.ignore(this.ui);
    this.uiCam = this.cameras.add(0, 0, 640, 360).setName('ui');
    this.camLock = false;
    this.add.image(320, 180, 'bg_caracas').setDepth(-10).setScrollFactor(0.45, 1);
    this.add.image(320, 280, 'bg_azotea').setDepth(-9);
    this.neon('AREPERA LA CHAMA', 506, 132, 0xff4fa0);
    this.neon('CARACAS', 70, 150, 0x40e0ff);
    this.thorFan = new Figura(this, 606, FLOOR_TOP - 2, 'thor', 'sit').setDepth(FLOOR_TOP - 2);
    this.thorFan.left = true;
    this.thorFan.row = 'down_right';

    this.sparks = this.add.particles(0, 0, 'px', { speed: { min: 60, max: 180 }, lifespan: 260, scale: { start: 0.9, end: 0 }, tint: [0xffffff, 0xffe040, 0xffa020], emitting: false }).setDepth(5000);
    this.dusts = this.add.particles(0, 0, 'px', { speedX: { min: -40, max: 40 }, speedY: { min: -30, max: -6 }, lifespan: 380, scale: { start: 0.8, end: 0 }, tint: 0xb0a8b8, alpha: { start: 0.7, end: 0 }, emitting: false }).setDepth(4999);

    const { modo, jugador, rival } = this.data0;
    const nuestros = modo === '4v4' ? [jugador, ...FAMILIA.filter((f) => f !== jugador)] : [jugador];
    const ellos = modo === '4v4' ? INSTITUTO : [rival];
    nuestros.forEach((id, i) => {
      const a = new Actor(this, id, 0, 90 + (i % 2) * 40, 20 + i * 22, i === 0);
      this.actors.push(a);
      if (i === 0) this.player = a; else this.brains.set(a, new Brain(a, 0.9));
    });
    ellos.forEach((id, i) => {
      const a = new Actor(this, id, 1, 550 - (i % 2) * 40, 20 + i * 22);
      this.actors.push(a);
      this.brains.set(a, new Brain(a, modo === '4v4' ? 0.85 : 1));
    });
    const n = modo === '4v4' ? 6 : 4;
    for (let i = 0; i < n; i++) this.items.push(new Item(this, ARMAS_PISO[i], 200 + Math.random() * 240, 10 + Math.random() * (DEPTH - 20)));
    if (!this.items.some((i) => i.kind === 'chancleta')) this.items.push(new Item(this, 'chancleta', this.player.x + 40, this.player.y));

    this.pad = new Input(this, undefined, this.ui);
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.buildHud();
    this.registry.set('marchaSonando', false);
    chip.play(PELEA);
    void this.roundIntro();
  }

  // ------------------------------------------------------------------ World

  hitstop(s: number) { this.stop = Math.max(this.stop, s); }
  shake(ms: number, k: number) { this.cameras.main.shake(ms, k); }
  sfx(name: string, vol = 0.5) { if (this.cache.audio.exists(name)) this.sound.play(name, { volume: vol }); }
  spark(x: number, y: number, z: number, big: boolean) {
    this.sparks.explode(big ? 16 : 8, x, FLOOR_TOP + y - z);
    const ring = this.add.circle(x, FLOOR_TOP + y - z, 3, 0xffffff, 0).setStrokeStyle(2, 0xffffff).setDepth(5001);
    this.tweens.add({ targets: ring, scale: big ? 5 : 3, alpha: 0, duration: 160, onComplete: () => ring.destroy() });
  }
  dust(x: number, y: number) { this.dusts.explode(7, x, FLOOR_TOP + y); }
  number(x: number, y: number, n: number) {
    const t = txt(this, x, FLOOR_TOP + y - 52, `${n}`, 'fuente_ui', 1).setTint(0xff6060).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 650, onComplete: () => t.destroy() });
  }
  onHit(_from: Actor | null, v: Actor, _dmg: number, kd: boolean) {
    this.sfx(kd ? 'critico' : 'golpe', kd ? 0.55 : 0.45);
    this.sfx(v.team === 0 ? 'jugador_dolor' : 'enemigo_dolor', 0.25);
    this.hitstop(kd ? 0.09 : 0.05);
    if (kd) this.shake(110, 0.006);
    if (kd && v.team === 1 && this.thorFan?.visible && Math.random() < 0.5) { this.thorFan.set('bark', true); this.sfx('ladrido', 0.35); }
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
    const human: Intent = playing ? { x: p.x, y: p.y, run: p.run, punch: p.pressed.punch, kick: p.pressed.kick, jump: p.pressed.jump, special: p.pressed.special } : NOTHING;
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

    if (playing) {
      this.dropT -= dt;
      if (this.dropT <= 0) { this.dropT = 9 + Math.random() * 5; this.skyDrop(); }
      if (this.slow <= 0) this.checkEnd();
    }
    this.renderAll();
    this.drawHud();
  }

  private renderAll() {
    for (const a of this.actors) a.render();
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
    if (this.phase !== 'play' || this.slow > 0) return;
    const nos = this.actors.filter((a) => a.team === 0 && a.alive);
    const ellos = this.actors.filter((a) => a.team === 1 && a.alive);
    if (!ellos.length) this.victory();
    else if (!nos.length || (this.data0.modo === '1v1' && !this.player.alive)) this.defeat();
  }

  // ------------------------------------------------------------------ inicio y final

  private async roundIntro() {
    await this.banner('¡LISTOS!', 'fuente_titulo_plata', 3, 800);
    this.phase = 'play';
    chip.blip(1320, 0.2, 'sq50', 0.2, 1760);
    await this.banner('¡YA!', 'fuente_titulo', 5, 600);
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

  private endMenu(opts: string[], onPick?: () => void, solo?: () => void) {
    let sel = 0;
    const items = opts.map((o, i) => this.uiAdd(txt(this, opts.length === 1 ? 320 : 250 + i * 140, 196, o, 'fuente_ui', 2).setDepth(8500).setInteractive()));
    const draw = () => items.forEach((t, i) => t.setTint(i === sel ? 0xffe040 : 0x8a8aa8));
    draw();
    const pick = (i: number) => { onPick?.(); if (solo) solo(); else if (i === 0) this.scene.restart(this.data0); else this.toMenu(); };
    items.forEach((t, i) => t.on('pointerdown', () => pick(i)));
    let lock = 0.4;
    this.endChoice = (p) => {
      lock -= 1 / 60;
      if (lock > 0) return;
      if (p.x !== 0 && p.x !== (this.data.get('lx') ?? 0)) { sel = (sel + 1) % opts.length; draw(); chip.blip(660, 0.04); }
      this.data.set('lx', p.x);
      if (p.pressed.punch || p.pressed.start) pick(sel);
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
      this.pauseObjs.push(this.uiAdd(this.add.rectangle(320, 180, 640, 360, 0x000000, 0.6).setDepth(9000)));
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
    const side = a.team === 0 ? 1 : -1;
    const dark = this.uiAdd(this.add.rectangle(320, 180, 640, 360, 0x000000, 0.65).setDepth(8600));
    const band = this.uiAdd(this.add.rectangle(320, 150, 640, 110, a.team === 0 ? 0x1a3a9a : 0x9a1a2a, 0.95).setDepth(8601));
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

  private skyDrop() {
    if (this.items.filter((i) => i.st === 'floor').length >= 5) return;
    const kind = ARMAS_PISO[Math.floor(Math.random() * ARMAS_PISO.length)];
    const it = new Item(this, kind, XMIN + 40 + Math.random() * (XMAX - XMIN - 80), 8 + Math.random() * (DEPTH - 16), 300);
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
