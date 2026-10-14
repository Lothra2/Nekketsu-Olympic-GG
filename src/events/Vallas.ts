import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { ajustes, goma } from '../core/nivel';
import { efecto } from '../core/fx';
import { chip } from '../core/music';
import { txt, flash } from '../core/ui';
import { Painter, hex } from '../gfx/paint';
import { EventScene, prueba, type Competidor } from './base';
import { queueEscenario } from './escenario';
import type { Paso } from '../core/coach';

const WORLD = 1720;
const TOP = 228;
const LANES = [18, 46, 74, 102];
const START = 120;
const FINISH = 1570;
const HURDLES = Array.from({ length: 9 }, (_, i) => 300 + i * 145);
const ZOOM = 1.5;

interface Racer {
  c: Competidor; fig: Figura; shadow: Phaser.GameObjects.Ellipse;
  x: number; y: number; lane: number; z: number; vz: number; v: number; boost: number;
  st: 'set' | 'start' | 'run' | 'air' | 'stumble' | 'done'; t: number; time: number; react: number; last: string; cool: number; top: number;
  /** entrenamiento: corre pegado a la persona para que practique el codazo */
  sombra?: boolean;
  /** la persona: cuánto lleva la palanca arriba o abajo, la espera entre cambios de carril y el salto guardado */
  palanca?: number; espera?: number; salto?: number;
}
interface Hurdle { x: number; lane: number; down: boolean; img: Phaser.GameObjects.Image }

/**
 * Vallas del Café: 4 carriles, 9 vallas, codazos permitidos (solo a los rivales). Para cambiar de carril hay que
 * empujar la palanca bien arriba o abajo un momentico, y hay una pausa corta entre cambio y cambio; la valla que te
 * tumba es la del carril donde se te ve. El salto que tocas un pelito antes de poder saltar se guarda y sale solo.
 */
export class Vallas extends EventScene {
  private racers: Racer[] = [];
  /** entrenamiento: vallas pasadas sin tumbar y cambios de carril */
  private saltadas = 0;
  private codazos = 0;
  private cambios = 0;
  private hurdles: Hurdle[] = [];
  private clock = 0;
  private hud!: Phaser.GameObjects.Graphics;
  private timeTxt!: Phaser.GameObjects.BitmapText;
  /** el fondo de código que se repite (sin el arte de PixelForja) */
  private bg?: Phaser.GameObjects.TileSprite;

  constructor() { super('Vallas'); }

  preload() { super.preload(); queueEscenario(this, 'cocora'); }

  create() {
    this.racers = [];
    this.saltadas = 0;
    this.codazos = 0;
    this.cambios = 0;
    this.hurdles = [];
    this.clock = 0;
    this.setup(ZOOM, WORLD);
    this.makeTextures();
    // el arte de PixelForja trae el cielo, lo lejano con su paralaje y la pista; sin él, el fondo de código
    this.bg = undefined;
    this.escenario('cocora', () => { this.bg = this.fondo('bg_cocora'); this.add.image(0, TOP - 4, 'pista').setOrigin(0, 0).setDepth(-5); });
    for (const [i, y] of LANES.entries()) this.add.bitmapText(START - 30, TOP + y - 4, 'fuente_ui', `${i + 1}`).setOrigin(0.5).setDepth(-4).setTint(0xffffff);
    for (const x of HURDLES) for (const [lane, y] of LANES.entries()) {
      const img = this.add.image(x, TOP + y, 'valla').setOrigin(0.5, 1).setDepth(TOP + y - 0.5);
      this.hurdles.push({ x, lane, down: false, img });
    }
    this.gente.forEach((c, k) => {
      // entrenando vas solo por el carril 2: así puedes cambiar hacia arriba y hacia abajo
      // tú en el carril 2 con un rival a cada lado (así el codazo siempre tiene a quién); tu compañero en el 4
      const i = this.d.practica ? 1 : [1, 3, 0, 2][k];
      const fig = new Figura(this, START, TOP + LANES[i], c.id, 'idle');
      fig.anim.prefer = 'atletismo';
      fig.set('sprint_start', true);
      fig.anim.pos = 2;
      const shadow = this.add.ellipse(START, TOP + LANES[i], 20, 5, 0x000000, 0.3);
      const top = c.human ? 0 : c.id === 'kenji' || c.id === 'ryu' ? 152 : c.id === 'goro' ? 128 : 140;
      this.racers.push({ c, fig, shadow, x: START, y: LANES[i], lane: i, z: 0, vz: 0, v: 0, boost: 0, st: 'set', t: 0, time: 0, react: 0.08 + Math.random() * 0.22, last: '', cool: 0, top });
    });
    this.cameras.main.centerOn(START + 120, 360 - 180 / ZOOM);
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.timeTxt = this.uiAdd(txt(this, 626, 14, '0.00', 'fuente_ui', 2, 1).setDepth(8001));
    this.racers.forEach((r) => this.uiAdd(this.add.image(0, 22, 'cabecitas', r.c.id).setDepth(8002).setData('r', r)));
    this.tema('cafe_neblina');
    this.ambiente('cafetal');
    if (this.d.practica) void this.entrenar('VALLAS DEL CAFÉ', this.pasos());
    else void this.previa('VALLAS DEL CAFÉ', 'EJE CAFETERO, COLOMBIA', 'ALTERNA {PUÑO} Y {PATADA} PARA CORRER · {SALTO} SALTA · {MOVER} ARRIBA O ABAJO CAMBIA DE CARRIL · {ESPECIAL} CODAZO');
  }

  private pasos(): Paso[] {
    const me = () => this.racers[0];
    let base = 0;
    return [
      { texto: 'ALTERNA {PUÑO} Y {PATADA} RÁPIDO\nPARA CORRER', botones: ['punch', 'kick'], listo: () => me().boost > 45 },
      { texto: 'TOCA {SALTO} JUSTO ANTES\nDE LA VALLA PARA SALTARLA', botones: ['jump'], listo: () => this.saltadas >= 1 },
      { texto: '¡ESO! SALTA 3 VALLAS MÁS\nSIN TUMBARLAS', botones: ['punch', 'kick', 'jump'], antes: () => { base = this.saltadas; }, listo: () => this.saltadas - base >= 3 },
      { texto: 'USA {MOVER} ARRIBA O ABAJO\nPARA CAMBIAR DE CARRIL', botones: ['stick'], listo: () => this.cambios >= 1 },
      {
        texto: `${this.rivalEntrenoNombre} CORRE PEGADO A TI:\nTOCA {ESPECIAL} PARA EL CODAZO`, botones: ['special'],
        antes: () => this.sparring(), listo: () => this.codazos >= 1,
      },
      { texto: '¡TUMBADO! AHORA\nLLEGA A LA META', botones: ['punch', 'kick', 'jump'], listo: () => me().st === 'done' },
    ];
  }

  private makeTextures() {
    if (!this.textures.exists('pista')) {
      const p = new Painter(WORLD, 136);
      p.rect(0, 0, WORLD, 136, hex('#b8442e'));
      for (let i = 0; i < 2600; i++) p.px(Math.random() * WORLD, Math.random() * 136, Math.random() < 0.5 ? hex('#a83a26') : hex('#c85a3a'));
      p.rect(0, 0, WORLD, 4, hex('#3e6a2a'));
      for (const y of [4, 32, 60, 88, 116]) p.rect(0, y, WORLD, 2, hex('#f4f0e8'));
      p.rect(0, 120, WORLD, 16, hex('#3e6a2a'));
      p.rect(START, 4, 3, 114, hex('#f4f0e8'));
      for (let y = 4; y < 118; y += 4) for (let k = 0; k < 3; k++) p.rect(FINISH + k * 4, y, 4, 4, (Math.floor(y / 4) + k) % 2 ? hex('#101010') : hex('#f4f4f4'));
      for (let x = START + 100; x < FINISH; x += 100) for (let y = 4; y < 118; y += 6) p.px(x, y, hex('#f4f0e8'));
      this.textures.addCanvas('pista', p.done());
    }
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    const p = this.pad.read();
    if (this.endTick(p)) { this.animIdle(dt); this.filterUi(); return; }
    if (this.fase === 'juego') this.clock += dt;
    this.coach?.tick(dt);
    for (const r of this.racers) this.racer(r, dt, p);
    this.render();
    if (this.fase === 'juego') this.checkEnd();
    this.filterUi();
  }

  private animIdle(dt: number) { for (const r of this.racers) { r.fig.step(dt); } this.render(); }

  private racer(r: Racer, dt: number, p: ReturnType<typeof this.pad.read>) {
    r.t += dt;
    if (r.cool > 0) r.cool -= dt;
    if (r.st === 'set') {
      if (this.fase === 'juego' && this.clock >= (r.c.human ? 0 : r.react)) { r.st = 'start'; r.t = 0; r.fig.set('sprint_start', true); r.fig.anim.pos = 4; r.v = 40; }
      return;
    }
    if (r.st === 'done') {
      r.v = Math.max(0, r.v - 160 * dt);
      r.x += r.v * dt;
      if (r.v <= 0 && r.fig.anim.name !== 'celebrate' && r.fig.anim.name !== 'sad') { r.fig.row = 'down'; r.fig.set(this.placeOf(r) <= 1 ? 'celebrate' : this.placeOf(r) === 4 ? 'sad' : 'idle'); }
      else r.fig.step(dt, r.v * dt);
      return;
    }
    // velocidad: la persona alterna botones, la máquina sigue su ritmo
    let target: number;
    if (r.c.human) {
      if (p.pressed.punch || p.pressed.kick) {
        const b = p.pressed.punch ? 'p' : 'k';
        r.boost = Math.min(100, r.boost + (b !== r.last ? 15 : 5));
        r.last = b;
      }
      r.boost = Math.max(0, r.boost - 42 * dt);
      target = (p.x > 0 || r.boost > 0 ? 70 : 0) + r.boost;
      // el salto se guarda un ratico: si lo tocas tropezando, arrancando o aún en el aire, sale apenas se pueda
      if (p.pressed.jump) r.salto = 0.2;
      if ((r.salto ?? 0) > 0) { r.salto = (r.salto ?? 0) - dt; if (r.st === 'run') { r.salto = 0; this.jump(r); } }
      // cambio de carril: la palanca bien arriba o abajo un momentico (más si va en diagonal) y una pausa entre cambios
      r.palanca = Math.abs(p.y) > 0.6 ? (r.palanca ?? 0) + dt : 0;
      r.espera = Math.max(0, (r.espera ?? 0) - dt);
      if (r.palanca >= (p.x !== 0 ? 0.25 : 0.08) && r.espera <= 0) {
        const nl = Phaser.Math.Clamp(r.lane + Math.sign(p.y), 0, 3);
        if (nl !== r.lane && !this.racers.some((o) => o !== r && o.lane === nl && Math.abs(o.x - r.x) < 14)) { r.lane = nl; this.cambios++; r.espera = 0.3; r.palanca = 0; }
      }
      if (p.pressed.special) this.codazo(r);
    } else {
      const me = this.racers[0];
      target = r.sombra ? me.v + Phaser.Math.Clamp((me.x - 4 - r.x) * 3, -60, 60) : (r.top + Math.sin(r.t * 2 + r.react * 20) * 10) * ajustes().cpuVel * goma(r.x - me.x);
      const next = this.hurdles.find((h) => h.lane === this.carrilVisto(r) && !h.down && h.x > r.x);
      if (next && r.st !== 'air' && next.x - r.x < 26 + r.v * 0.05 && Math.random() < 0.92) this.jump(r);
      else if (next && r.st !== 'air' && next.x - r.x < 12) this.jump(r);
      const h = this.racers.find((o) => o !== r && o.c.team !== r.c.team && Math.abs(o.lane - r.lane) === 1 && Math.abs(o.x - r.x) < 22);
      if (h && !r.sombra && r.cool <= 0 && Math.random() < 0.6 * ajustes().cpuAgresion * dt) this.codazo(r);
    }
    if (r.st === 'stumble') { target *= 0.3; if (r.t > 0.4) { r.st = 'run'; r.fig.set('sprint'); } }
    r.v += Phaser.Math.Clamp(target - r.v, -260 * dt, 230 * dt);
    const dx = r.v * dt;
    // una valla de tu carril que quedó atrás sin caerse: saltada
    const visto = this.carrilVisto(r);
    if (r.c.human) for (const h of this.hurdles) if (h.lane === visto && !h.down && h.x > r.x && h.x <= r.x + dx) this.saltadas++;
    r.x += dx;
    // al carril nuevo en un quinto de segundo
    r.y += Phaser.Math.Clamp(LANES[r.lane] - r.y, -140 * dt, 140 * dt);
    if (r.st === 'air') {
      r.vz -= 900 * dt;
      r.z += r.vz * dt;
      if (r.z <= 0) { r.z = 0; r.vz = 0; r.st = 'run'; r.fig.set('sprint'); efecto(this, 'polvo_caer_medio', r.x, TOP + r.y); }
    } else if (r.st === 'start') {
      r.fig.step(dt);
      if (r.fig.anim.done) { r.st = 'run'; r.fig.set('sprint'); }
    } else if (r.st === 'run') {
      const ev = r.fig.step(dt, dx);
      if (ev.some((e) => e.tipo === 'paso')) {
        efecto(this, 'polvo_correr_medio', r.x, TOP + r.y);
        if (r.c.human) this.sound.play(`paso_piedra_${Math.floor(Math.random() * 3)}`, { volume: 0.2 });
      }
      if (r.v < 5) r.fig.set('idle');
      else if (r.fig.anim.name === 'idle') r.fig.set('sprint');
    } else r.fig.step(dt);
    // chocar con una valla: la del carril donde se le ve
    const carril = this.carrilVisto(r);
    if (r.z < 9) for (const h of this.hurdles) {
      if (h.down || h.lane !== carril || Math.abs(h.x - r.x) > 5) continue;
      h.down = true;
      h.img.setTexture('valla_caida').setOrigin(0.5, 1);
      efecto(this, 'polvo_caer_chico', h.x, TOP + LANES[h.lane]);
      this.tweens.add({ targets: h.img, x: h.img.x + 10, duration: 200 });
      this.stumble(r);
      this.sound.play('romper', { volume: r.c.human ? 0.45 : 0.15 });
    }
    if (r.x >= FINISH) { r.st = 'done'; r.time = this.clock; r.fig.set('sprint'); if (r.c.human) { flash(this, 120); chip.blip(1568, 0.3, 'sq25', 0.2, 2093); } }
  }

  /** El carril donde se le ve (mientras cambia, el más cercano). */
  private carrilVisto(r: Racer) {
    let k = 0;
    for (let i = 1; i < LANES.length; i++) if (Math.abs(LANES[i] - r.y) < Math.abs(LANES[k] - r.y)) k = i;
    return k;
  }

  private jump(r: Racer) {
    if (r.st === 'stumble' || r.st === 'start') return;
    r.st = 'air';
    r.vz = 215;
    r.fig.set('long_jump', true);
    r.fig.anim.pos = 5;
    r.fig.anim.speed = 0;
    if (r.c.human) chip.blip(520, 0.08, 'sq25', 0.12, 880);
  }

  private stumble(r: Racer) {
    r.st = 'stumble';
    r.t = 0;
    r.z = 0; r.vz = 0;
    // tumbar una valla frena; en los niveles fáciles, a la persona menos
    r.v *= r.c.human ? ajustes().tropiezo : 0.35;
    r.boost *= 0.4;
    r.fig.set('hit', true);
  }

  private codazo(r: Racer) {
    if (r.cool > 0) return;
    // el rival de al lado más cercano (al compañero nunca)
    const cerca = this.racers
      .filter((o) => o !== r && o.c.team !== r.c.team && o.st !== 'done' && Math.abs(o.lane - r.lane) === 1 && Math.abs(o.x - r.x) < 40)
      .sort((a, b) => Math.abs(a.x - r.x) - Math.abs(b.x - r.x));
    const v = cerca[0];
    if (!v) {
      // falló: se nota, y se puede volver a intentar enseguida
      r.cool = 0.4;
      if (r.c.human) {
        this.sound.play('esquiva', { volume: 0.4 });
        const t = txt(this, r.x, TOP + r.y - 54, '¡NINGÚN RIVAL AL LADO!', 'fuente_ui', 1).setDepth(6000).setTint(0xff9090);
        this.tweens.add({ targets: t, y: t.y - 10, alpha: 0, duration: 600, onComplete: () => t.destroy() });
      }
      return;
    }
    r.cool = 1.4;
    if (r.c.human) this.codazos++;
    // se lanza de lado hacia el otro y vuelve solo a su carril
    r.y += Math.sign(v.y - r.y) * 9;
    this.stumble(v);
    // lo saca de su carril, salvo que ahí venga alguien pegado
    const nl = Phaser.Math.Clamp(v.lane + Math.sign(v.lane - r.lane), 0, 3);
    if (!this.racers.some((o) => o !== v && o.lane === nl && Math.abs(o.x - v.x) < 16)) v.lane = nl;
    this.sound.play('golpe', { volume: 0.5 });
    efecto(this, 'chispa_golpe_medio', (r.x + v.x) / 2, TOP + (r.y + v.y) / 2 - 24, { depth: 6000 });
    this.cameras.main.shake(90, 0.005);
    const t = txt(this, (r.x + v.x) / 2, TOP + (r.y + v.y) / 2 - 50, '¡CODAZO!', 'fuente_ui', 1).setDepth(6000).setTint(0xffe040);
    this.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  /** Entrenamiento: Kenji sale a correr pegado a la persona, en el carril de al lado. */
  private sparring() {
    if (this.racers.some((r) => r.sombra)) return;
    const me = this.racers[0];
    const lane = me.lane < 3 ? me.lane + 1 : me.lane - 1;
    const fig = new Figura(this, me.x - 30, TOP + LANES[lane], this.rivalEntreno, 'idle');
    fig.anim.prefer = 'atletismo';
    fig.set('sprint', true);
    const shadow = this.add.ellipse(me.x - 30, TOP + LANES[lane], 20, 5, 0x000000, 0.3);
    this.racers.push({ c: { id: this.rivalEntreno, team: 1, human: false }, fig, shadow, x: me.x - 30, y: LANES[lane], lane, z: 0, vz: 0, v: me.v, boost: 0, st: 'run', t: 0, time: 0, react: 0.1, last: '', cool: 0, top: 0, sombra: true });
  }

  private placeOf(r: Racer) {
    return [...this.racers].sort((a, b) => (a.st === 'done' ? a.time : 999 - a.x / 1000) - (b.st === 'done' ? b.time : 999 - b.x / 1000)).indexOf(r) + 1;
  }

  private render() {
    for (const r of this.racers) {
      r.fig.setPosition(Math.round(r.x), Math.round(TOP + r.y - r.z)).setDepth(TOP + r.y);
      r.shadow.setPosition(Math.round(r.x), Math.round(TOP + r.y)).setScale(Math.max(0.5, 1 - r.z / 60)).setDepth(TOP + r.y - 1);
    }
    const me = this.racers[0];
    const cam = this.cameras.main;
    const cur = cam.midPoint.x || START;
    cam.centerOn(cur + (me.x + 70 - cur) * 0.12, 360 - 180 / ZOOM);
    if (this.bg) this.bg.tilePositionX = cam.scrollX * 0.25;
    // marcador
    const g = this.hud;
    g.clear();
    g.fillStyle(0x000000, 0.55).fillRect(110, 14, 420, 16);
    g.lineStyle(1, 0xffffff, 0.6).lineBetween(120, 22, 520, 22);
    g.fillStyle(0xffffff).fillRect(519, 16, 2, 12);
    for (const o of this.ui.list) {
      const r = (o as Phaser.GameObjects.Image).getData?.('r') as Racer | undefined;
      if (r) (o as Phaser.GameObjects.Image).setPosition(120 + 400 * Phaser.Math.Clamp((r.x - START) / (FINISH - START), 0, 1), 22);
    }
    this.timeTxt.setText(this.clock.toFixed(2));
    g.fillStyle(0x000000, 0.6).fillRect(14, 334, 104, 12);
    g.fillStyle(me.boost > 70 ? 0xff6040 : 0xf2c230).fillRect(16, 336, me.boost, 8);
    if (!this.data.get('lbl')) this.data.set('lbl', this.uiAdd(txt(this, 66, 326, 'TURBO', 'fuente_ui', 1).setDepth(8001)));
  }

  private checkEnd() {
    const me = this.racers[0];
    if (this.d.practica) {
      // si llegas antes de terminar los pasos, otra vuelta con las vallas paradas
      if (me.st === 'done' && this.coach && !this.coach.done && !this.coach.ultimo) {
        me.st = 'run'; me.x = START; me.fig.set('sprint');
        for (const h of this.hurdles) { h.down = false; h.img.setTexture('valla').setPosition(h.x, h.img.y); }
        const t = this.uiAdd(txt(this, 320, 200, '¡OTRA VUELTA!', 'fuente_titulo', 1).setDepth(8500));
        this.time.delayedCall(1000, () => t.destroy());
      }
      return;
    }
    if (this.porTiempo(this.racers.map((r) => r.st === 'done'), me.st === 'done', this.clock)) {
      for (const r of this.racers) if (r.st !== 'done') { r.st = 'done'; r.time = this.clock + (FINISH - r.x) / 120; }
      const orden = [...this.racers].sort((a, b) => a.time - b.time).map((r) => ({ c: r.c, valor: `${r.time.toFixed(2)} S` }));
      this.resultados(prueba('Vallas').nombre, orden);
    }
  }
}
