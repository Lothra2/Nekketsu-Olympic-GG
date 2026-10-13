import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { ajustes } from '../core/nivel';
import { efecto } from '../core/fx';
import { chip, PELEA } from '../core/music';
import { txt, flash } from '../core/ui';
import { Painter, hex } from '../gfx/paint';
import { EventScene, type Competidor } from './base';
import type { Paso } from '../core/coach';

/** el piso de la cancha (vista de lado) */
const PISO = 300;
/** de dónde se lanza y dónde está la caja de greda */
const LINEA = 104;
const CAJA = 556;
/** la cara de greda de la caja, inclinada hacia el que lanza: su centro (el bocín) y lo que mide */
const CARA = { x: 548, z: 20, largo: 22 };
const RONDAS = 3;
/** en el tablero de arriba (la cancha vista desde arriba), en unidades de la caja: el bocín y las mechas */
const BOCIN = 0.22;
const MECHAS: [number, number][] = [[0, -0.34], [0, 0.34], [-0.34, 0], [0.34, 0]];
const MECHA_R = 0.13;
/** el tablero en el marcador */
const TAB = { x: 548, y: 178, r: 54 };
/** la fuerza justa (cae en la mitad de la caja) */
const JUSTA = 0.62;

interface Disco { u: number; v: number; team: 0 | 1; quien: Lanzador }
interface Lanzador { c: Competidor; fig: Figura; puntos: number; x: number }
type Fase = 'espera' | 'apunta' | 'fuerza' | 'vuela' | 'resultado';

/**
 * Tejo en la cancha de La Candelaria, Bogotá: el deporte nacional de Colombia. Se lanza el tejo (un disco de metal)
 * a la caja de greda, que tiene el bocín (un aro de metal) en el centro y las mechas (triángulos de pólvora)
 * alrededor. Mecha que revienta: 3. Embocinada (adentro del bocín): 6. Moñona (las dos a la vez): 9. Si en una
 * ronda nadie suma, el tejo más cerca del bocín se lleva la mano: 1. Dos contra dos, tres rondas.
 */
export class Tejo extends EventScene {
  private lanz: Lanzador[] = [];
  private orden: number[] = [];
  private turno = 0;
  private ronda = 0;
  private estado: Fase = 'espera';
  private t = 0;
  private u = 0;
  private p = 0;
  private tejos: Disco[] = [];
  private mechas: boolean[] = [];
  private puntosRonda = 0;
  private marcador: [number, number] = [0, 0];
  private vuelo: { x0: number; z0: number; x1: number; z1: number; t: number; T: number; alto: number; spr: Phaser.GameObjects.Image; final: Disco | null } | null = null;
  private tab!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private cara!: Phaser.GameObjects.Graphics;
  private scoreTxt!: Phaser.GameObjects.BitmapText;
  private rondaTxt!: Phaser.GameObjects.BitmapText;
  private ayudaTxt!: Phaser.GameObjects.BitmapText;
  private cpu = { u: 0, p: JUSTA, listoU: 0, listoP: 0 };
  /** entrenamiento */
  private apunto = 0;
  private lanzo = 0;
  private revento = 0;
  private embocino = 0;

  constructor() { super('Tejo'); }

  create() {
    this.lanz = [];
    this.turno = 0;
    this.ronda = 0;
    this.estado = 'espera';
    this.tejos = [];
    this.marcador = [0, 0];
    this.vuelo = null;
    this.apunto = this.lanzo = this.revento = this.embocino = 0;
    this.setup(1, 640);
    this.texturas();
    this.add.image(320, 180, 'bg_candelaria').setDepth(-10);
    this.add.bitmapText(440, 205, 'fuente_ui', 'CANCHA DE TEJO').setOrigin(0.5).setTint(0x3a2418).setDepth(-9);
    this.armarCaja();
    // la fila de los que esperan su turno, y el que lanza en la raya
    const gente: Competidor[] = this.d.practica ? [this.gente[0]] : this.gente;
    gente.forEach((c, i) => {
      const fig = new Figura(this, 14 + i * 17, PISO - 4, c.id, 'idle');
      fig.setDepth(PISO - 4);
      this.lanz.push({ c, fig, puntos: 0, x: 14 + i * 17 });
    });
    // se alternan: Familia, Instituto, Familia, Instituto
    this.orden = this.d.practica ? [0] : [0, 2, 1, 3];
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.tab = this.uiAdd(this.add.graphics().setDepth(8001));
    this.scoreTxt = this.uiAdd(txt(this, 320, 16, '0 - 0', 'fuente_titulo', 1).setDepth(8002));
    this.uiAdd(txt(this, 250, 16, 'FAMILIA GG', 'fuente_ui', 1, 1).setDepth(8002).setTint(0x9ac8ff));
    this.uiAdd(txt(this, 390, 16, 'INSTITUTO', 'fuente_ui', 1, 0).setDepth(8002).setTint(0xffa0a0));
    this.rondaTxt = this.uiAdd(txt(this, 320, 34, '', 'fuente_ui', 1).setDepth(8002).setTint(0xffe080));
    this.ayudaTxt = this.uiAdd(txt(this, TAB.x, TAB.y + TAB.r + 14, '', 'fuente_ui', 1).setDepth(8002));
    this.nuevaRonda();
    chip.play(PELEA);
    if (this.d.practica) void this.entrenar('TEJO', this.pasos(), 40).then(() => this.siguienteTurno());
    else void this.previa('TEJO', 'LA CANDELARIA, BOGOTÁ', 'TOCA UN BOTÓN PARA LA PUNTERÍA Y OTRO PARA LA FUERZA · MECHA 3 · BOCÍN 6 · MOÑONA 9').then(() => this.siguienteTurno());
  }

  private texturas() {
    if (this.textures.exists('tejo')) return;
    const p = new Painter(9, 6);
    p.rect(1, 1, 7, 4, hex('#6a6a74'));
    p.rect(0, 2, 9, 2, hex('#7a7a84'));
    p.rect(2, 1, 4, 1, hex('#c8c8d0'));
    p.rect(1, 4, 7, 1, hex('#3a3a44'));
    this.textures.addCanvas('tejo', p.done());
  }

  /** La caja de madera con su cara de greda inclinada, el bocín y las mechas (vista de lado). */
  private armarCaja() {
    const g = this.add.graphics().setDepth(PISO - 2);
    // la caja: el marco de madera y el relleno de greda
    g.fillStyle(0x5a3a24).fillTriangle(CAJA - 22, PISO, CAJA + 26, PISO, CAJA + 26, PISO - 50);
    g.fillStyle(0x7a5232).fillRect(CAJA + 22, PISO - 52, 6, 52);
    g.fillStyle(0x8a8478).fillTriangle(CAJA - 18, PISO - 2, CAJA + 22, PISO - 2, CAJA + 22, PISO - 46);
    g.fillStyle(0x6e6a60).fillTriangle(CAJA - 12, PISO - 2, CAJA + 22, PISO - 2, CAJA + 22, PISO - 38);
    g.lineStyle(2, 0x3a2414).lineBetween(CAJA - 22, PISO, CAJA + 26, PISO - 50);
    this.cara = this.add.graphics().setDepth(PISO - 1);
  }

  /** La cara de la caja con lo que tiene ahora: el bocín y las mechas que quedan. */
  private pintarCara() {
    const g = this.cara;
    g.clear();
    const pt = (v: number) => ({ x: CARA.x + v * CARA.largo * 0.7, y: PISO - CARA.z - v * CARA.largo * 0.7 });
    const b = pt(0);
    g.lineStyle(2, 0x2a2a30).strokeEllipse(b.x, b.y, 10, 5);
    MECHAS.forEach(([u, v], i) => {
      if (!this.mechas[i] || u !== 0) return;
      const m = pt(v);
      g.fillStyle(0xf4f4ec).fillTriangle(m.x - 3, m.y + 2, m.x + 3, m.y + 2, m.x, m.y - 3);
    });
    for (const t of this.tejos) { const q = pt(t.v); g.fillStyle(t.team === 0 ? 0x4a8aff : 0xff5a5a).fillRect(q.x - 2, q.y - 1, 4, 2); }
  }

  // ------------------------------------------------------------------ turnos

  private nuevaRonda() {
    this.ronda++;
    this.tejos = [];
    this.mechas = MECHAS.map(() => true);
    this.puntosRonda = 0;
    this.pintarCara();
  }

  private get actual() { return this.lanz[this.orden[this.turno % this.orden.length]]; }

  /** Le toca al siguiente: camina a la raya y apunta. */
  private siguienteTurno() {
    const l = this.actual;
    for (const o of this.lanz) if (o !== l) { o.fig.setPosition(o.x, PISO - 4).setDepth(PISO - 4); o.fig.left = false; o.fig.set('idle'); }
    l.fig.setPosition(LINEA - 14, PISO).setDepth(PISO).set('idle');
    l.fig.left = false;
    this.estado = 'apunta';
    this.t = Math.random() * 3;
    // la máquina ya sabe a dónde quiere tirar (con su puntería, según el nivel)
    if (!l.c.human) {
      const err = 0.04 + (1 - ajustes().cpuAgresion) * 0.22;
      const vivas = MECHAS.map((m, i) => (this.mechas[i] ? m : null)).filter(Boolean) as [number, number][];
      const blanco = Math.random() < 0.5 || !vivas.length ? [0, 0] : vivas[Math.floor(Math.random() * vivas.length)];
      this.cpu = { u: Phaser.Math.Clamp(blanco[0] + (Math.random() - 0.5) * err * 2, -1, 1), p: JUSTA + blanco[1] / 3.2 + (Math.random() - 0.5) * err * 0.7, listoU: 0.6 + Math.random() * 0.6, listoP: 0.5 + Math.random() * 0.6 };
    }
  }

  /** Suelta el tejo con la puntería y la fuerza que quedaron. */
  private lanzar() {
    const l = this.actual;
    const ruido = l.c.human ? 0.03 : 0;
    const u = this.u + (Math.random() - 0.5) * ruido * 2;
    const v = (this.p - JUSTA) * 3.2 + (Math.random() - 0.5) * ruido * 2;
    l.fig.set('weapon_throw', true, 1.3);
    this.sfx('esquiva', 0.4);
    this.estado = 'vuela';
    if (l.c.human) this.lanzo++;
    const dentro = Math.abs(u) <= 1.25 && Math.abs(v) <= 1.25;
    // a dónde llega: a la cara de greda, o corto (al piso) o largo (por encima de la caja)
    const vv = Phaser.Math.Clamp(v, -2, 2);
    const x1 = dentro ? CARA.x + vv * CARA.largo * 0.7 : vv < 0 ? CAJA - 40 + vv * 20 : CAJA + 46;
    const z1 = dentro ? CARA.z + vv * CARA.largo * 0.7 : 0;
    const spr = this.add.image(LINEA, PISO - 30, 'tejo').setDepth(PISO + 1).setScale(1.4);
    this.vuelo = { x0: LINEA + 4, z0: 30, x1, z1, t: 0, T: 0.85, alto: 70 + this.p * 50, spr, final: dentro ? { u, v, team: l.c.team as 0 | 1, quien: l } : null };
  }

  /** El tejo cayó: mecha, bocín, moñona o nada. */
  private cae(v: NonNullable<Tejo['vuelo']>) {
    const l = this.actual;
    const x = v.x1, y = PISO - v.z1;
    if (!v.final) {
      v.spr.setPosition(x, PISO - 1);
      efecto(this, 'polvo_caer_chico', x, PISO);
      this.sfx('paso_tierra_0', 0.5);
      this.resultado(l, 0, v.x1 < CAJA ? '¡CORTO!' : '¡SE PASÓ!', 0xc0c0d0);
      v.spr.destroy();
      return;
    }
    const t = v.final;
    this.tejos.push(t);
    v.spr.destroy();
    this.sfx('golpe', 0.5);
    efecto(this, 'polvo_caer_chico', x, y);
    const bocin = BOCIN * (this.d.practica ? 1.4 : 1);
    const dentro = Math.hypot(t.u, t.v) < bocin;
    const reventadas = MECHAS.map((m, i) => this.mechas[i] && Math.hypot(t.u - m[0], t.v - m[1]) < MECHA_R).map((b, i) => (b ? i : -1)).filter((i) => i >= 0);
    for (const i of reventadas) this.mechas[i] = false;
    if (reventadas.length) {
      // ¡BUM! la mecha revienta
      const s = efecto(this, 'mecha_tejo', x, y + 2, { depth: 5003, scale: 1.6 });
      if (!s) this.add.circle(x, y, 18, 0xffe040, 0.8).setDepth(5003);
      chip.boom(1);
      this.sfx('critico', 0.6);
      flash(this, 120);
      this.cameras.main.shake(260, 0.012);
      if (l.c.human) this.revento++;
    }
    let pts = 0, s = '¡AHÍ QUEDÓ!', col = 0xe0e0e0;
    if (dentro && reventadas.length) { pts = 9; s = '¡MOÑONA! +9'; col = 0xffe040; this.fuegos(); }
    else if (dentro) { pts = 6; s = '¡EMBOCINADA! +6'; col = 0x8ae08a; this.sfx('oro_mucho', 0.5); }
    else if (reventadas.length) { pts = 3 * reventadas.length; s = `¡MECHA! +${pts}`; col = 0xffa040; }
    if (dentro && l.c.human) this.embocino++;
    this.pintarCara();
    this.resultado(l, pts, s, col);
  }

  private resultado(l: Lanzador, pts: number, s: string, col: number) {
    l.puntos += pts;
    this.marcador[l.c.team] += pts;
    this.puntosRonda += pts;
    if (pts > 0) for (const o of this.lanz) if (o.c.team === l.c.team) o.fig.set('celebrate', true);
    const t = this.uiAdd(txt(this, 320, 92, s, 'fuente_titulo', 1).setDepth(8500).setTint(col));
    t.setScale(1.6);
    this.tweens.add({ targets: t, scale: 1, duration: 200, ease: 'Back.out' });
    this.tweens.add({ targets: t, alpha: 0, y: 78, delay: 1100, duration: 400, onComplete: () => t.destroy() });
    this.estado = 'resultado';
    this.time.delayedCall(1600, () => this.pasar());
  }

  /** Al siguiente turno; al final de la ronda, la mano; al final de las rondas, el resultado. */
  private pasar() {
    if (this.estado !== 'resultado') return;
    this.turno++;
    if (this.d.practica) { if (this.tejos.length >= 4 || !this.mechas.some(Boolean)) this.nuevaRonda(); this.siguienteTurno(); return; }
    if (this.turno % this.orden.length === 0) {
      // la mano: nadie sumó, el tejo más cerca del bocín se lleva 1
      if (this.puntosRonda === 0 && this.tejos.length) {
        const cerca = [...this.tejos].sort((a, b) => Math.hypot(a.u, a.v) - Math.hypot(b.u, b.v))[0];
        cerca.quien.puntos += 1;
        this.marcador[cerca.team] += 1;
        const t = this.uiAdd(txt(this, 320, 92, `¡MANO PARA ${cerca.team === 0 ? 'LA FAMILIA' : 'EL INSTITUTO'}! +1`, 'fuente_titulo', 1).setDepth(8500).setTint(0xffe080));
        this.tweens.add({ targets: t, alpha: 0, delay: 1300, duration: 400, onComplete: () => t.destroy() });
        this.estado = 'espera';
        this.time.delayedCall(1700, () => this.finRonda());
        return;
      }
      this.finRonda();
      return;
    }
    this.siguienteTurno();
  }

  private finRonda() {
    if (this.ronda >= RONDAS && this.marcador[0] !== this.marcador[1]) { this.terminar(); return; }
    // empatados al final: otra ronda, hasta que alguien saque ventaja
    if (this.ronda >= RONDAS) void this.banner('¡DESEMPATE!', 'fuente_titulo', 2, 900, 110);
    this.nuevaRonda();
    this.siguienteTurno();
  }

  private fuegos() {
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 220, () => efecto(this, `fuegos_artificiales_${['rojo', 'dorado', 'azul', 'verde'][i % 4]}`, 200 + Math.random() * 300, 60 + Math.random() * 60, { depth: 5000, scale: 2 }));
    this.sfx('subir_nivel', 0.5);
  }

  // ------------------------------------------------------------------ cuadro a cuadro

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    const pad = this.pad.read();
    if (this.endTick(pad)) { this.animar(dt); this.filterUi(); return; }
    this.coach?.tick(dt);
    const l = this.actual;
    const lento = ajustes().nombre === 'PASEO' || this.d.practica ? 0.65 : ajustes().nombre === 'NORMAL' ? 0.85 : 1;
    const toca = pad.pressed.punch || pad.pressed.kick || pad.pressed.jump;
    if (this.estado === 'apunta') {
      this.t += dt;
      this.u = Math.sin(this.t * 2.4 * lento);
      if (l.c.human ? toca : this.t > this.cpu.listoU && Math.abs(this.u - this.cpu.u) < 0.06) {
        if (!l.c.human) this.u = this.cpu.u;
        this.estado = 'fuerza';
        this.t = 0;
        chip.blip(880, 0.06, 'sq25', 0.14);
        if (l.c.human) this.apunto++;
      }
    } else if (this.estado === 'fuerza') {
      this.t += dt;
      this.p = 0.5 - 0.5 * Math.cos(this.t * 2.8 * lento);
      if (l.c.human ? toca : this.t > this.cpu.listoP && Math.abs(this.p - this.cpu.p) < 0.03) {
        if (!l.c.human) this.p = this.cpu.p;
        chip.blip(1320, 0.06, 'sq25', 0.14);
        this.lanzar();
      }
    } else if (this.estado === 'vuela' && this.vuelo) {
      const v = this.vuelo;
      v.t += dt / v.T;
      const k = Math.min(1, v.t);
      const x = v.x0 + (v.x1 - v.x0) * k, z = v.z0 + (v.z1 - v.z0) * k + 4 * v.alto * k * (1 - k);
      v.spr.setPosition(x, PISO - z).setRotation(k * 12);
      if (k >= 1) { this.vuelo = null; this.cae(v); }
    }
    for (const o of this.lanz) { o.fig.step(dt); if (o.fig.anim.done) o.fig.set('idle'); }
    this.render();
    this.filterUi();
  }

  private animar(dt: number) { for (const o of this.lanz) o.fig.step(dt); this.render(); }

  private render() {
    const g = this.tab, h = this.hud;
    g.clear(); h.clear();
    this.scoreTxt.setText(`${this.marcador[0]} - ${this.marcador[1]}`);
    this.rondaTxt.setText(this.d.practica ? '' : this.ronda > RONDAS ? 'DESEMPATE' : `RONDA ${this.ronda} DE ${RONDAS}`);
    h.fillStyle(0x000000, 0.45).fillRect(170, 6, 300, 20);
    // el tablero: la caja vista desde arriba, con el bocín, las mechas y los tejos
    const { x, y, r } = TAB;
    g.fillStyle(0x08081a, 0.8).fillRect(x - r - 6, y - r - 6, 2 * r + 12, 2 * r + 12);
    g.fillStyle(0x5a3a24).fillRect(x - r - 2, y - r - 2, 2 * r + 4, 2 * r + 4);
    g.fillStyle(0x8a8478).fillRect(x - r, y - r, 2 * r, 2 * r);
    const bocin = BOCIN * (this.d.practica ? 1.4 : 1);
    g.lineStyle(3, 0x2a2a30).strokeCircle(x, y, bocin * r);
    g.lineStyle(1, 0xc8c8d0, 0.6).strokeCircle(x, y, bocin * r - 2);
    MECHAS.forEach(([u, v], i) => {
      if (!this.mechas[i]) { g.fillStyle(0x2a2a2a, 0.6).fillCircle(x + u * r, y + v * r, 4); return; }
      const mx = x + u * r, my = y + v * r;
      g.fillStyle(0xf4f4ec).fillTriangle(mx - 6, my + 5, mx + 6, my + 5, mx, my - 6);
      g.fillStyle(0xd03a2a).fillRect(mx - 1, my - 1, 2, 3);
    });
    for (const t of this.tejos) g.fillStyle(t.team === 0 ? 0x4a8aff : 0xff5a5a).fillCircle(x + t.u * r, y + t.v * r, 4).lineStyle(1, 0x101018).strokeCircle(x + t.u * r, y + t.v * r, 4);
    const l = this.actual;
    // la puntería: una línea que recorre la caja de lado a lado
    if (this.estado === 'apunta' || this.estado === 'fuerza') {
      g.lineStyle(2, 0xffffff, this.estado === 'apunta' ? 1 : 0.5).lineBetween(x + this.u * r, y - r, x + this.u * r, y + r);
    }
    // la fuerza: una barra al lado, con la marca de la justa (la mitad de la caja)
    if (this.estado === 'fuerza') {
      const bx = x - r - 20, h0 = y + r, alto = 2 * r;
      g.fillStyle(0x000000, 0.6).fillRect(bx - 5, y - r, 10, alto);
      g.fillStyle(this.p > JUSTA + 0.12 ? 0xff6040 : this.p > JUSTA - 0.12 ? 0x8ae08a : 0xf2c230).fillRect(bx - 4, h0 - this.p * alto, 8, this.p * alto);
      g.fillStyle(0xffffff).fillRect(bx - 7, h0 - JUSTA * alto - 1, 14, 2);
    }
    const quien = l?.c.human ? 'TÚ' : l ? this.nombre(l.c.id) : '';
    this.ayudaTxt.setText(this.estado === 'apunta' ? `${quien}: LA PUNTERÍA` : this.estado === 'fuerza' ? `${quien}: LA FUERZA` : '').setTint(l?.c.team === 0 ? 0x9ac8ff : 0xffa0a0);
  }

  // ------------------------------------------------------------------ entrenamiento

  private pasos(): Paso[] {
    return [
      { texto: 'LA LÍNEA BLANCA RECORRE LA CAJA:\nTOCA {PATADA} CUANDO PASE POR EL BOCÍN', botones: ['kick'], listo: () => this.apunto >= 1 },
      { texto: 'AHORA LA FUERZA: TOCA {PATADA} CUANDO\nLA BARRA LLEGUE A LA RAYA BLANCA', botones: ['kick'], listo: () => this.lanzo >= 1 },
      { texto: 'REVIENTA UNA MECHA\n(LOS TRIÁNGULOS BLANCOS): +3', botones: ['kick'], listo: () => this.revento >= 1 },
      { texto: '¡BUM! AHORA MÉTELO EN EL BOCÍN:\n¡EMBOCINADA! +6', botones: ['kick'], listo: () => this.embocino >= 1 },
    ];
  }

  // ------------------------------------------------------------------ final

  private sfx(name: string, vol = 0.5) { if (this.cache.audio.exists(name)) this.sound.play(name, { volume: vol }); }

  private terminar() {
    this.estado = 'espera';
    const ganador: 0 | 1 = this.marcador[0] >= this.marcador[1] ? 0 : 1;
    void this.banner(ganador === 0 ? '¡GANA LA FAMILIA GG!' : '¡GANA EL INSTITUTO!', 'fuente_titulo', 2, 1600, 110);
    this.time.delayedCall(2200, () => {
      for (const o of this.lanz) o.fig.set(o.c.team === ganador ? 'victory' : 'sad', true);
      const orden = [...this.lanz]
        .sort((a, b) => Number(b.c.team === ganador) - Number(a.c.team === ganador) || b.puntos - a.puntos)
        .map((o) => ({ c: o.c, valor: `${o.puntos} PTS` }));
      this.resultados('TEJO LA CANDELARIA', orden);
    });
  }
}
