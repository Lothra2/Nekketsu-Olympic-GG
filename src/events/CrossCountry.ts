import Phaser from 'phaser';
import { Actor, HUECO, Item, NOTHING, type Intent, type World } from '../fight/actor';
import { chip, PELEA } from '../core/music';
import { txt, flash } from '../core/ui';
import { EventScene, prueba, type Competidor } from './base';
import layoutJson from '../../data/stages/saigon_hem.layout.json';
import type { Paso } from '../core/coach';

/** El formato de layout de PixelForja (PEDIDO 10.2), la parte que este tramo usa. */
interface Caja { x: number; y: number; w: number; d: number; z: number; tipo?: string }
interface Layout {
  id: string; nombre: string; largo: number; franja: { atras: number; adelante: number };
  huecos: { x0: number; x1: number; y0: number; y1: number }[];
  plataformas: Caja[]; muros: Caja[]; solidos: Caja[];
  agua: { x0: number; x1: number; nivel: number; corriente: number }[];
  bajo: { x0: number; x1: number; y0: number; y1: number; z: number }[];
  postes: { x: number; y: number; alto: number }[];
  carriles: { y: number }[];
  entidades: { tipo: string; x?: number; y?: number; objeto?: string; carril?: number; cada?: number }[];
}
const L = layoutJson as unknown as Layout;
const FT = L.franja.atras;
const DEPTH = L.franja.adelante - L.franja.atras;
const ZOOM = 1.35;
/** lo que se sube de un paso, sin saltar */
const PASO = 6;
const ALTO = 44;

interface Corredor { c: Competidor; a: Actor; done: boolean; time: number; safe: [number, number]; koT: number; carril: number; duda: number; cool: number; rodeo: number; rodeoY: number }
interface Moto { x: number; y: number; v: number; g: Phaser.GameObjects.Container }

/**
 * Cross Country, tramo 1: el hẻm de Saigón. Corre, salta canales, trepa cajas para pasar el muro,
 * cruza la calle inundada y esquiva las motos; y en el camino, a los golpes, como en el original.
 * Escenario en gris mientras llega el arte de PixelForja (lote E1): esto es lo que se le entrega jugado.
 */
export class CrossCountry extends EventScene implements World {
  actors: Actor[] = [];
  items: Item[] = [];
  floorTop = FT;
  limites = { xmin: 12, xmax: L.largo - 12, depth: DEPTH };
  private gente2: Corredor[] = [];
  private cajas: Caja[] = [];
  private motos: Moto[] = [];
  private motoT: number[] = [];
  private meta = 3790;
  private clock = 0;
  private holdRun = 0;
  private stop = 0;
  private hud!: Phaser.GameObjects.Graphics;
  private timeTxt!: Phaser.GameObjects.BitmapText;
  private heads: { img: Phaser.GameObjects.Image; r: Corredor }[] = [];
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private dusts!: Phaser.GameObjects.Particles.ParticleEmitter;
  private splash!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() { super('CrossCountry'); }

  get sc(): Phaser.Scene { return this; }

  create() {
    this.actors = [];
    this.items = [];
    this.gente2 = [];
    this.motos = [];
    this.heads = [];
    this.clock = 0;
    this.holdRun = 0;
    this.stop = 0;
    this.cajas = [...L.plataformas, ...L.muros, ...L.solidos];
    this.meta = L.entidades.find((e) => e.tipo === 'meta')?.x ?? L.largo - 50;
    const salida = L.entidades.find((e) => e.tipo === 'salida')?.x ?? 40;
    this.motoT = L.entidades.filter((e) => e.tipo === 'vehiculo').map((e) => (e.cada ?? 5) * 0.6);
    this.setup(ZOOM, L.largo);
    this.dibujar();
    this.sparks = this.add.particles(0, 0, 'px', { speed: { min: 60, max: 180 }, lifespan: 260, scale: { start: 0.9, end: 0 }, tint: [0xffffff, 0xffe040, 0xffa020], emitting: false }).setDepth(5000);
    this.dusts = this.add.particles(0, 0, 'px', { speedX: { min: -40, max: 40 }, speedY: { min: -30, max: -6 }, lifespan: 380, scale: { start: 0.8, end: 0 }, tint: 0xb0a8b8, alpha: { start: 0.7, end: 0 }, emitting: false }).setDepth(4999);
    this.splash = this.add.particles(0, 0, 'px', { speed: { min: 30, max: 90 }, angle: { min: 200, max: 340 }, gravityY: 300, lifespan: 420, scale: { start: 1, end: 0.3 }, tint: [0xffffff, 0x9ad8f0], emitting: false }).setDepth(5000);
    for (const e of L.entidades) if (e.tipo === 'objeto' && e.objeto) this.items.push(new Item(this, e.objeto, e.x ?? 0, e.y ?? 60));

    this.gente.forEach((c, i) => {
      const y = L.carriles[i % L.carriles.length].y;
      const a = new Actor(this, c.id, c.team, salida, y, c.human);
      a.left = false;
      this.actors.push(a);
      this.gente2.push({ c, a, done: false, time: 0, safe: [salida, y], koT: 0, carril: y, duda: 0, cool: 1, rodeo: -1, rodeoY: 0 });
    });
    this.cameras.main.centerOn(salida + 200, 360 - 180 / ZOOM);
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.timeTxt = this.uiAdd(txt(this, 626, 14, '0.00', 'fuente_ui', 2, 1).setDepth(8001));
    for (const r of this.gente2) this.heads.push({ img: this.uiAdd(this.add.image(0, 22, 'cabecitas', r.c.id).setDepth(8002)), r });
    this.uiAdd(txt(this, 14, 326, 'TRAMO 1 · ESCENARIO EN GRIS', 'fuente_ui', 1, 0).setDepth(8001).setTint(0x8a8ab0));
    chip.play(PELEA);
    const p = prueba('CrossCountry');
    if (this.d.practica) { void this.entrenar(p.nombre, this.pasos(), 40); return; }
    void this.previa(p.nombre, p.lugar, 'MANTÉN {MOVER} ADELANTE PARA CORRER · {SALTO} SALTA CANALES Y MUROS · A LOS GOLPES SI HACE FALTA');
  }

  /** Entrenamiento: te lleva a cada obstáculo y espera a que lo pases. */
  private pasos(): Paso[] {
    const r = () => this.gente2[0];
    const ir = (x: number, y: number) => () => { const a = r().a; a.x = x; a.y = y; a.z = 0; a.setSt('idle', 'idle'); r().safe = [x, y]; this.cameras.main.centerOn(x + 80, 360 - 180 / ZOOM); flash(this, 120); };
    return [
      { texto: 'MANTÉN {MOVER} ADELANTE\nY ARRANCAS A CORRER', botones: ['stick'], listo: () => r().a.st === 'run' },
      { texto: 'UN CANAL: CORRE Y TOCA {SALTO}\nJUSTO ANTES DEL BORDE', botones: ['stick', 'jump'], antes: ir(1080, 40), listo: () => r().a.x > 1266 && r().a.grounded },
      { texto: 'MURO BAJO:\nSÁLTALO CON {SALTO}', botones: ['jump'], antes: ir(1320, 60), listo: () => r().a.x > 1424 && r().a.grounded },
      { texto: 'MURO ALTO: RODÉALO POR EL PORTÓN\nDE ABAJO, O TREPA LAS CAJAS', botones: ['stick', 'jump'], antes: ir(1480, 30), listo: () => r().a.x > 1730 },
      { texto: 'CALLE INUNDADA: TE FRENA Y\nTE EMPUJA. ¡SIGUE PA\' LANTE!', botones: ['stick'], antes: ir(2340, 64), listo: () => r().a.x > 2905 },
      { texto: 'CANAL ANCHO: TOMA IMPULSO\nY SALTA CON {SALTO}', botones: ['stick', 'jump'], antes: ir(2900, 64), listo: () => r().a.x > 3084 && r().a.grounded },
      { texto: '¡ESO! AHORA\nLLEGA A LA META', botones: ['stick'], listo: () => r().done },
    ];
  }

  // ------------------------------------------------------------------ el terreno

  private enHueco(x: number, y: number) { return L.huecos.some((h) => x >= h.x0 && x < h.x1 && y >= h.y0 && y < h.y1); }

  /** El techo más alto bajo (x, y) que quede a la altura de los pies (o un escalón más arriba). */
  suelo(x: number, y: number, z: number): number {
    let top = this.enHueco(x, y) ? HUECO : 0;
    for (const c of this.cajas) if (x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.d && c.z <= z + PASO && c.z > top) top = c.z;
    return top;
  }

  bloquea(x: number, y: number, z: number): boolean {
    return this.cajas.some((c) => x >= c.x && x < c.x + c.w && y >= c.y && y < c.y + c.d && c.z > z + PASO);
  }

  caida(a: Actor) {
    const r = this.gente2.find((g) => g.a === a);
    if (!r) return;
    this.splash.explode(16, a.x, FT + a.y);
    this.sfx('esquiva', 0.4);
    if (a.human) this.letrero(a, '¡AL AGUA!', 0x9ad8ff);
    a.x = r.safe[0]; a.y = r.safe[1]; a.z = 0; a.vx = 0; a.vy = 0; a.vz = 0;
    a.dropAll();
    a.setSt('idle', 'idle');
    a.invul = 1.2;
  }

  // ------------------------------------------------------------------ World

  hitstop(s: number) { this.stop = Math.max(this.stop, s); }
  shake(ms: number, k: number) { this.cameras.main.shake(ms, k); }
  sfx(name: string, vol = 0.5) { if (this.cache.audio.exists(name)) this.sound.play(name, { volume: vol }); }
  spark(x: number, y: number, z: number, big: boolean) { this.sparks.explode(big ? 16 : 8, x, FT + y - z); }
  dust(x: number, y: number) { this.dusts.explode(7, x, FT + y); }
  number(x: number, y: number, n: number) {
    const t = txt(this, x, FT + y - 52, `${n}`, 'fuente_ui', 1).setTint(0xff6060).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 650, onComplete: () => t.destroy() });
  }
  onHit(_from: Actor | null, v: Actor, _dmg: number, kd: boolean) {
    this.sfx(kd ? 'critico' : 'golpe', kd ? 0.5 : 0.4);
    this.hitstop(kd ? 0.07 : 0.04);
    if (kd && v.human) this.shake(100, 0.005);
  }
  onKO(a: Actor) {
    this.sfx('enemigo_muere', 0.4);
    const r = this.gente2.find((g) => g.a === a);
    if (r) r.koT = 2.4;
    if (a.human) this.letrero(a, '¡K.O.! YA TE PARAS...', 0xffa0a0);
  }
  special(a: Actor) { a.meter = 0; }

  // ------------------------------------------------------------------ cuadro a cuadro

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    const p = this.pad.read();
    if (this.endTick(p)) { for (const r of this.gente2) r.a.update(dt, NOTHING); this.render(); this.filterUi(); return; }
    if (this.stop > 0) { this.stop -= dt; this.render(); this.filterUi(); return; }
    const juego = this.fase === 'juego';
    if (juego) this.clock += dt;
    // correr sin doble toque: mantener adelante un ratito
    this.holdRun = p.x > 0 ? this.holdRun + dt : 0;
    for (const r of this.gente2) {
      const a = r.a;
      const prevX = a.x;
      let it: Intent = NOTHING;
      if (juego && !r.done) it = a.human
        ? { x: p.x, y: p.y, run: p.run || this.holdRun > 0.22, punch: p.pressed.punch, kick: p.pressed.kick, jump: p.pressed.jump, special: false }
        : this.cerebro(r, dt);
      a.update(dt, it);
      this.terreno(r, prevX, dt);
    }
    for (const i of this.items) i.update(dt);
    if (juego && !this.d.practica) this.trafico(dt);
    this.coach?.tick(dt);
    this.render();
    if (juego) this.checkEnd();
    this.filterUi();
  }

  /** Agua, toldos, punto seguro para volver, KO y llegada. */
  private terreno(r: Corredor, prevX: number, dt: number) {
    const a = r.a;
    // si algo lo dejó metido en una caja (cargado, empujado), sale por arriba
    if (a.st !== 'lifted') {
      const dentro = this.cajas.filter((c) => a.x >= c.x && a.x < c.x + c.w && a.y >= c.y && a.y < c.y + c.d && c.z > a.z + PASO);
      if (dentro.length) a.z = Math.max(...dentro.map((c) => c.z));
    }
    // calle inundada: frena y la corriente empuja para atrás
    const ag = L.agua.find((w) => a.x >= w.x0 && a.x < w.x1);
    if (ag && a.z < 6) {
      a.x = prevX + (a.x - prevX) * 0.62 + ag.corriente * dt;
      if (Math.abs(a.x - prevX) > 0.5 && Math.random() < dt * 10) this.splash.explode(2, a.x, FT + a.y);
    }
    // toldo bajo: quien salta debajo se da en la cabeza
    if (a.vz > 0 && L.bajo.some((b) => a.x >= b.x0 && a.x < b.x1 && a.y >= b.y0 && a.y < b.y1 && a.z + ALTO > b.z)) {
      a.vz = -40;
      this.sfx('bloqueo', a.human ? 0.4 : 0.1);
      if (a.human) this.letrero(a, '¡AY, EL TOLDO!', 0xffe080);
    }
    // el último piso firme, lejos de los huecos, para volver si se cae
    if (a.grounded && a.base >= 0 && !L.huecos.some((h) => a.x > h.x0 - 50 && a.x < h.x1 + 10)) r.safe = [a.x, a.y];
    // KO: en una carrera nadie queda fuera, se para un rato después
    if (r.koT > 0) {
      r.koT -= dt;
      if (r.koT <= 0 && !a.alive) { a.hp = Math.round(a.maxHp * 0.5); a.setSt('idle', 'idle'); a.invul = 1.5; }
    }
    if (!r.done && a.x >= this.meta) {
      r.done = true;
      r.time = this.clock;
      a.fig.row = 'down';
      a.setSt('win', 'victory');
      const lugar = this.gente2.filter((g) => g.done).length;
      this.letrero(a, `¡${lugar}° LUGAR!`, lugar === 1 ? 0xffd040 : 0xffffff);
      if (a.human) { flash(this, 120); chip.blip(1568, 0.3, 'sq25', 0.2, 2093); }
    }
  }

  /**
   * La máquina corre hacia la meta: salta huecos y muros bajos, rodea lo que es muy alto,
   * y pelea con quien se le cruce del otro equipo.
   */
  private cerebro(r: Corredor, dt: number): Intent {
    const a = r.a;
    r.cool -= dt;
    if (!a.controllable) return NOTHING;
    if (r.duda > 0) { r.duda -= dt; return { ...NOTHING, x: 1 }; }
    // rodeando: retrocede hasta pasar la caja que le tapaba el paso
    if (r.rodeo >= 0) {
      if (a.x > r.rodeo && a.controllable) return { ...NOTHING, x: -1, y: r.rodeoY };
      r.rodeo = -1;
    }
    // se pasó del escalón: vuelve atrás hasta antes de la caja y toma impulso
    const it: Intent = { x: 1, y: 0, run: true, punch: false, kick: false, jump: false, special: false };
    const ahead = a.x + 22;
    const base = a.base;
    // un hueco adelante: salta corriendo (a veces duda y se cae, como cualquiera)
    if (a.grounded && this.suelo(ahead, a.y, a.z) <= HUECO / 2) {
      if (Math.random() < 0.04) { r.duda = 0.25; return { ...NOTHING, x: 1 }; }
      it.jump = true;
    }
    // una caja adelante: si se sube de un salto, salta; si es muy alta, la rodea por donde quede más cerca
    let destinoY = r.carril;
    const delante = (lejos: number) => this.cajas
      .filter((c) => c.x + c.w > a.x && c.x - a.x < lejos && a.y >= c.y - 4 && a.y < c.y + c.d + 4 && c.z > base + PASO)
      .sort((p, q) => p.x - q.x)[0];
    // lo que no se salta de un brinco se rodea: busca la fila libre más cercana en los próximos metros
    const libre = (y: number) => !this.cajas.some((c) => c.z > base + 32 && c.x + c.w > a.x && c.x - a.x < 160 && y >= c.y - 6 && y < c.y + c.d + 6);
    let acomodando = false;
    if (!libre(a.y)) {
      let best = -1;
      for (let y = 4; y <= DEPTH - 4; y += 4) if (libre(y) && (best < 0 || Math.abs(y - a.y) < Math.abs(best - a.y))) best = y;
      if (best >= 0) {
        destinoY = best;
        acomodando = Math.abs(a.y - best) > 4;
        const sy = Math.sign(best - a.y);
        const lo = Math.min(a.y, best), hi = Math.max(a.y, best);
        // cajas que tapan el camino en diagonal: si ya está encima, retrocede; si está cerca, se para y se corre de lado
        const tapa = this.cajas
          .filter((c) => c.z > base + PASO && c.x + c.w > a.x - 2 && c.x - a.x < 60 && c.y < hi && c.y + c.d > lo)
          .sort((p, q) => p.x - q.x)[0];
        if (acomodando && tapa && a.x >= tapa.x - 2) { r.rodeo = tapa.x - 10; r.rodeoY = sy; return { ...NOTHING, x: -1, y: sy }; }
        if (acomodando && tapa && tapa.x - a.x < 34) return { ...NOTHING, y: sy };
        const pared = this.cajas.find((c) => c.z > base + 32 && c.x + c.w > a.x && c.x - a.x < 24 && a.y >= c.y - 4 && a.y < c.y + c.d + 4);
        if (acomodando && pared) return { ...NOTHING, y: sy };
      }
    }
    // lo que se salta de un brinco, solo si no está acomodándose hacia un paso libre
    const pegada = delante(22);
    if (pegada && pegada.z <= base + 32 && a.y >= pegada.y && a.y < pegada.y + pegada.d && !acomodando) { if (a.grounded) it.jump = true; }
    if (Math.abs(a.y - destinoY) > 3) it.y = Math.sign(destinoY - a.y);
    // a los golpes con el rival que tenga al lado
    const rival = this.gente2.find((o) => o !== r && o.c.team !== r.c.team && o.a.canBeHit() && Math.abs(o.a.x - a.x) < 26 && Math.abs(o.a.y - a.y) < 10);
    if (rival && r.cool <= 0 && a.grounded) {
      r.cool = 0.5 + Math.random() * 0.9;
      a.left = rival.a.x < a.x;
      if (Math.random() < 0.6) return { ...NOTHING, x: Math.sign(rival.a.x - a.x), punch: Math.random() < 0.55, kick: Math.random() >= 0.55 };
    }
    return it;
  }

  /** Motos que vienen en contra por su carril; avisan con la corneta. */
  private trafico(dt: number) {
    const me = this.gente2[0].a;
    const vs = L.entidades.filter((e) => e.tipo === 'vehiculo');
    vs.forEach((v, i) => {
      this.motoT[i] -= dt;
      if (this.motoT[i] > 0) return;
      this.motoT[i] = (v.cada ?? 5) * (0.8 + Math.random() * 0.4);
      const y = L.carriles[Math.max(0, (v.carril ?? 1) - 1)].y;
      const x = Math.min(L.largo + 40, me.x + 420);
      const g = this.add.container(x, FT + y);
      const body = this.add.graphics();
      body.fillStyle(0x000000, 0.3).fillEllipse(0, 0, 40, 8);
      body.fillStyle(0xc03030).fillRect(-18, -20, 36, 12);
      body.fillStyle(0x303038).fillCircle(-12, -6, 6).fillCircle(12, -6, 6);
      body.fillStyle(0xe8e8f0).fillRect(-6, -34, 10, 14);
      g.add([body, txt(this, 0, -14, 'MOTO', 'fuente_ui', 1)]);
      this.motos.push({ x, y, v: -230, g });
      chip.blip(523, 0.12, 'sq50', 0.12, 494);
      this.time.delayedCall(140, () => chip.blip(523, 0.12, 'sq50', 0.12, 494));
      const aviso = this.uiAdd(txt(this, 600, 180 + (y - 60) * 0.8, '¡MOTO! «', 'fuente_ui', 2, 1).setDepth(8100).setTint(0xff6060));
      this.tweens.add({ targets: aviso, alpha: 0.2, duration: 160, yoyo: true, repeat: 3, onComplete: () => aviso.destroy() });
    });
    for (const m of this.motos) {
      m.x += m.v * dt;
      m.g.setPosition(Math.round(m.x), FT + m.y).setDepth(FT + m.y);
      for (const r of this.gente2) {
        const a = r.a;
        if (Math.abs(a.x - m.x) < 20 && Math.abs(a.y - m.y) < 10 && a.z < 14 && a.canBeHit()) {
          a.hp = Math.max(1, a.hp - 8);
          a.knockdown(-1, 160, 200);
          this.onHit(null, a, 8, true);
          this.sfx('critico', a.human ? 0.5 : 0.2);
          if (a.human) this.letrero(a, '¡PI PI! ¡TE ATROPELLÓ LA MOTO!', 0xff8080);
        }
      }
    }
    this.motos = this.motos.filter((m) => { if (m.x < me.x - 500 || m.x < -60) { m.g.destroy(); return false; } return true; });
  }

  private letrero(a: Actor, s: string, color: number) {
    const t = txt(this, a.x, FT + a.y - a.z - 62, s, 'fuente_ui', 1).setDepth(6000).setTint(color);
    this.tweens.add({ targets: t, y: t.y - 14, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  // ------------------------------------------------------------------ dibujo

  /** El escenario en gris: piso, acera, canales, agua, cajas con su nombre, postes, toldo, salida y meta. */
  private dibujar() {
    const W = L.largo;
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-20);
    sky.fillGradientStyle(0x8ab0d0, 0x8ab0d0, 0xd8e4ec, 0xd8e4ec).fillRect(0, 0, 640, 360);
    // fachadas en bloques grises (lo que va a ser el hẻm)
    const fondo = this.add.graphics().setDepth(-10);
    for (let x = 0, k = 0; x < W; k++) {
      const w = 60 + ((k * 37) % 50), h = 70 + ((k * 53) % 60);
      fondo.fillStyle(k % 2 ? 0x9a9aa4 : 0xa8a8b2).fillRect(x, FT - h, w, h);
      for (let wy = FT - h + 8; wy < FT - 10; wy += 16) for (let wx = x + 6; wx < x + w - 8; wx += 14) fondo.fillStyle(0x7a7a86).fillRect(wx, wy, 7, 8);
      x += w;
    }
    const g = this.add.graphics().setDepth(-5);
    g.fillStyle(0x5a5a64).fillRect(0, FT, W, DEPTH);
    g.fillStyle(0x8a8a94).fillRect(0, FT, W, 24);
    g.fillStyle(0x6e6e78).fillRect(0, FT + 24, W, 2);
    for (let x = 0; x < W; x += 80) g.fillStyle(0x66666f).fillRect(x, FT + 64, 40, 2);
    // calle inundada
    for (const w of L.agua) {
      g.fillStyle(0x3a7ab0, 0.75).fillRect(w.x0, FT, w.x1 - w.x0, DEPTH);
      for (let x = w.x0 + 6; x < w.x1; x += 22) for (let y = 10; y < DEPTH; y += 18) g.fillStyle(0x9ad8f0, 0.7).fillRect(x + (y % 11), FT + y, 8, 1);
      this.rotulo(w.x0 + 4, FT + DEPTH + 10, 'CALLE INUNDADA · TE FRENA Y TE EMPUJA');
    }
    // canales: hueco con agua al fondo
    for (const h of L.huecos) {
      g.fillStyle(0x1a2a40).fillRect(h.x0, FT + h.y0, h.x1 - h.x0, h.y1 - h.y0);
      g.fillStyle(0x2a5a90).fillRect(h.x0, FT + h.y0 + 18, h.x1 - h.x0, h.y1 - h.y0 - 18);
      g.fillStyle(0x9ad8f0).fillRect(h.x0, FT + h.y0 + 18, h.x1 - h.x0, 1);
      this.rotulo(h.x0, FT + DEPTH + 10, h.y1 < DEPTH ? 'CANAL · PUENTECITO ADELANTE' : 'CANAL · ¡SALTA CORRIENDO!');
    }
    // marcas cada 320 px
    for (let x = 320; x < W; x += 320) { g.fillStyle(0xffffff, 0.35).fillRect(x, FT, 1, DEPTH); this.rotulo(x + 2, FT + 6, `${x}`); }
    // salida y meta
    const sal = L.entidades.find((e) => e.tipo === 'salida')?.x ?? 40;
    for (const [x, s] of [[sal, 'SALIDA'], [this.meta, 'META']] as [number, string][]) {
      for (let y = 0; y < DEPTH; y += 6) for (let k = 0; k < 2; k++) g.fillStyle((y / 6 + k) % 2 ? 0x101010 : 0xf4f4f4).fillRect(x + k * 4, FT + y, 4, 6);
      this.add.bitmapText(x + 4, FT - 30, 'fuente_titulo', s).setOrigin(0.5).setDepth(-4);
    }
    // postes
    for (const p of L.postes) { g.fillStyle(0x4a4a54).fillRect(p.x, FT + p.y - p.alto, 4, p.alto); g.fillStyle(0xf2e090).fillRect(p.x - 6, FT + p.y - p.alto, 12, 4); }
    // toldo
    for (const b of L.bajo) {
      const t = this.add.graphics().setDepth(FT + b.y1);
      t.fillStyle(0xc85a3a, 0.85).fillRect(b.x0, FT + b.y0 - b.z, b.x1 - b.x0, b.y1 - b.y0);
      for (let x = b.x0; x < b.x1; x += 12) t.fillStyle(0xf4e8d0, 0.85).fillRect(x, FT + b.y0 - b.z, 6, b.y1 - b.y0);
      this.rotulo(b.x0, FT + b.y0 - b.z - 8, 'TOLDO · NO SALTES ABAJO');
    }
    // cajas: techo claro, frente oscuro, con su nombre
    for (const c of this.cajas) {
      const box = this.add.graphics().setDepth(FT + c.y + c.d - 0.5);
      const muro = L.muros.includes(c);
      box.fillStyle(muro ? 0xb0a090 : 0xc8c8d0).fillRect(c.x, FT + c.y - c.z, c.w, c.d);
      box.fillStyle(muro ? 0x807060 : 0x8a8a96).fillRect(c.x, FT + c.y + c.d - c.z, c.w, c.z);
      box.lineStyle(1, 0x303038, 0.8).strokeRect(c.x + 0.5, FT + c.y - c.z + 0.5, c.w - 1, c.d + c.z - 1);
      // el nombre encima de la caja, chiquito, para leer el gris
      this.add.bitmapText(c.x + c.w / 2, FT + c.y - c.z - 6, 'fuente_ui', (c.tipo ?? '').toUpperCase().replace(/_/g, ' ')).setOrigin(0.5).setDepth(FT + c.y + c.d - 0.4).setTint(0xf0f0f8).setAlpha(0.8);
    }
  }

  private rotulo(x: number, y: number, s: string) {
    this.add.bitmapText(x, y, 'fuente_ui', s).setOrigin(0, 0.5).setDepth(-3).setTint(0xf0f0f8);
  }

  private render() {
    for (const a of this.actors) a.render();
    for (const i of this.items) i.render();
    const me = this.gente2[0].a;
    const cam = this.cameras.main;
    const cur = cam.midPoint.x || me.x;
    cam.centerOn(cur + (me.x + 80 - cur) * 0.1, 360 - 180 / ZOOM);
    // marcador: barra de avance con cabecitas, tiempo y vida
    const g = this.hud;
    g.clear();
    g.fillStyle(0x000000, 0.55).fillRect(110, 14, 420, 16);
    g.lineStyle(1, 0xffffff, 0.6).lineBetween(120, 22, 520, 22);
    g.fillStyle(0xffffff).fillRect(519, 16, 2, 12);
    for (const h of this.heads) h.img.setPosition(120 + 400 * Phaser.Math.Clamp(h.r.a.x / this.meta, 0, 1), 22);
    this.timeTxt.setText(this.clock.toFixed(2));
    g.fillStyle(0x000000, 0.6).fillRect(14, 12, 84, 10);
    g.fillStyle(me.hp > me.maxHp * 0.3 ? 0x40e080 : 0xff5040).fillRect(16, 14, 80 * (me.hp / me.maxHp), 6);
  }

  private checkEnd() {
    const me = this.gente2[0];
    if (this.d.practica) return;
    if (this.porTiempo(this.gente2.map((r) => r.done), me.done, this.clock)) {
      for (const r of this.gente2) if (!r.done) { r.done = true; r.time = this.clock + (this.meta - r.a.x) / 120; }
      const orden = [...this.gente2].sort((p, q) => p.time - q.time).map((r) => ({ c: r.c, valor: `${r.time.toFixed(2)} S` }));
      this.resultados(prueba('CrossCountry').nombre, orden);
    }
  }
}

