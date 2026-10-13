import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { ajustes } from '../core/nivel';
import { efecto } from '../core/fx';
import { chip, PELEA } from '../core/music';
import { txt, flash } from '../core/ui';
import { rotular } from '../core/input';
import { Painter, hex } from '../gfx/paint';
import { EventScene, prueba, type Competidor } from './base';
import type { Paso } from '../core/coach';

/** el piso de la cancha (vista de lado): los de atrás un poco más arriba que los de adelante */
const PISO = 310;
const FILA = [-6, 6];
const RED_X = 320;
/** lo alto de la red sobre el piso */
const RED_H = 20;
const BORDE = [34, 606];
const G = 280;
const ZOOM = 1.15;
/** a cuántos puntos se gana */
const META = 7;

type Tiro = 'patada' | 'pase' | 'remate' | 'saque';
/** las alturas de la raqueta: dónde le pega bien (sobre el piso, y saltando) */
const ALCANCE = { piso: [2, 50], aire: 78 } as const;
/** la arcilla frena la pelota al picar */
const PIQUE = 0.6;
interface Voleador {
  c: Competidor; fig: Figura; sombra: Phaser.GameObjects.Ellipse;
  x: number; fila: 0 | 1; z: number; vz: number; st: 'piso' | 'aire'; golpeT: number; cool: number;
  puntos: number; toques: number; casa: number; pensar: number; quiereX: number; salta: boolean;
  /** la máquina decide una vez por pelota que viene: le pega bien, la toca mal o no llega; y tarda un poquito en reaccionar */
  plan: { n: number; tipo: 'bien' | 'mala' | 'falla'; reaccion: number; ruido: number };
}
interface Bola {
  x: number; z: number; vx: number; vz: number;
  en: 'mano' | 'aire' | 'piso'; dueño: Voleador | null; ultimo: Voleador | null; ultimoTiro: Tiro | null;
  lado: 0 | 1; toques: number; spr: Phaser.GameObjects.Image; sombra: Phaser.GameObjects.Ellipse; marca: Phaser.GameObjects.Ellipse;
  red: boolean;
  /** cuántos tiros van: cada tiro nuevo, la máquina vuelve a decidir */
  n: number;
  /** los piques de este lado: el segundo es punto para el que le pegó */
  botes: number;
  rastro: Phaser.GameObjects.Particles.ParticleEmitter;
}

/**
 * Tenis de dobles en Đà Lạt: la cancha de arcilla roja entre pinos, junto al lago Xuân Hương. 2 contra 2.
 * La pelota puede picar una vez de tu lado (o se la devuelves en el aire); un solo golpe por lado. Puño es el drive,
 * patada el globo (alto y al fondo), y saltando cerca de la red con puño, el smash. Si pica afuera o se queda en la
 * red, punto para el otro. Gana el primero a 7.
 * La raqueta va dibujada en la mano con los datos de `arma` del swing, hasta que llegue el pack de tenis sin raqueta.
 */
export class Tenis extends EventScene {
  private pat: Voleador[] = [];
  private bola!: Bola;
  private marcador: [number, number] = [0, 0];
  private saca: 0 | 1 = 0;
  private pausaT = 0;
  private clock = 0;
  private hud!: Phaser.GameObjects.Graphics;
  private scoreTxt!: Phaser.GameObjects.BitmapText;
  private toqueTxt!: Phaser.GameObjects.BitmapText;
  private terminado = false;
  /** entrenamiento */
  private pasadas = 0;
  private remates = 0;
  private llego = false;
  private globos = 0;
  private pasoSmash = false;
  private raquetas: Phaser.GameObjects.Image[] = [];

  constructor() { super('Tenis'); }

  create() {
    this.pat = [];
    this.raquetas = [];
    this.pasoSmash = false;
    this.marcador = [0, 0];
    this.saca = 0;
    this.pausaT = 0;
    this.clock = 0;
    this.terminado = false;
    this.pasadas = 0;
    this.remates = 0;
    this.llego = false;
    this.setup(ZOOM, 640);
    this.texturas();
    this.add.image(320, 180, 'bg_dalat').setDepth(-10);
    this.cancha();
    // entrenando: tú solo de este lado y Kenji del otro, que te la devuelve suave
    const gente: Competidor[] = this.d.practica ? [this.gente[0], { id: 'kenji', team: 1, human: false }] : this.gente;
    gente.forEach((c) => {
      const nuestro = c.team === 0;
      const companeros = gente.filter((o) => o.team === c.team);
      const fila = (companeros.length === 1 ? 1 : companeros.indexOf(c) === 0 ? 1 : 0) as 0 | 1;
      // el de adelante cerca de la red, el de atrás al fondo
      const casa = nuestro ? (fila === 1 ? 230 : 110) : fila === 1 ? 410 : 530;
      const fig = new Figura(this, casa, PISO + FILA[fila], c.id, 'idle');
      fig.left = !nuestro;
      const sombra = this.add.ellipse(casa, PISO + FILA[fila], 20, 5, 0x000000, 0.3);
      this.raquetas.push(this.add.image(0, 0, 'raqueta').setOrigin(0.15, 0.5));
      this.pat.push({ c, fig, sombra, x: casa, fila, z: 0, vz: 0, st: 'piso', golpeT: 0, cool: 0, puntos: 0, toques: 0, casa, pensar: Math.random() * 0.2, quiereX: casa, salta: false, plan: { n: -1, tipo: 'bien', reaccion: 0, ruido: 0 } });
    });
    const spr = this.add.image(0, 0, 'pelota_tenis').setDepth(5000).setScale(1.2);
    // un rastro suave detrás dla pelota, para seguirlo con la vista
    const rastro = this.add.particles(0, 0, 'px', { lifespan: 260, scale: { start: 0.6, end: 0 }, alpha: { start: 0.5, end: 0 }, tint: 0xffffff, frequency: 30 }).setDepth(4999);
    rastro.startFollow(spr);
    const sombra = this.add.ellipse(0, PISO, 8, 3, 0x000000, 0.3).setDepth(PISO - 20);
    const marca = this.add.ellipse(0, PISO, 22, 7).setStrokeStyle(2, 0xffe040, 0.9).setDepth(PISO - 19).setVisible(false);
    this.bola = { x: 0, z: 0, vx: 0, vz: 0, en: 'mano', dueño: null, ultimo: null, ultimoTiro: null, lado: 0, toques: 0, spr, sombra, marca, red: false, n: 0, botes: 0, rastro };
    // entrenando, siempre saca Kenji (suave, hacia ti)
    this.alSaque(this.d.practica ? 1 : 0);
    this.cameras.main.centerOn(260, this.camY);
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.scoreTxt = this.uiAdd(txt(this, 320, 16, '0 - 0', 'fuente_titulo', 1).setDepth(8001));
    this.uiAdd(txt(this, 250, 16, 'FAMILIA GG', 'fuente_ui', 1, 1).setDepth(8001).setTint(0x9ac8ff));
    this.uiAdd(txt(this, 390, 16, 'INSTITUTO', 'fuente_ui', 1, 0).setDepth(8001).setTint(0xffa0a0));
    this.toqueTxt = this.uiAdd(txt(this, 320, 34, '', 'fuente_ui', 1).setDepth(8001).setTint(0xffe080));
    chip.play(PELEA);
    if (this.d.practica) void this.entrenar('TENIS', this.pasos());
    else void this.previa('TENIS DE DOBLES', 'ĐÀ LẠT, VIETNAM', '{MOVER} AL CÍRCULO · DEJA QUE PIQUE · {PUÑO} DRIVE · {PATADA} GLOBO · {SALTO} Y {PUÑO}: SMASH');
  }

  private get camY() { return 360 - 180 / ZOOM; }

  private texturas() {
    if (this.textures.exists('pelota_tenis')) return;
    // la pelota amarilla con su costura
    const p = new Painter(6, 6);
    p.circle(2.5, 2.5, 2.8, hex('#5a6a1a'));
    p.circle(2.5, 2.5, 2.2, hex('#d8f040'));
    p.px(1, 2, hex('#f8fff0')); p.px(2, 3, hex('#f8fff0')); p.px(3, 3, hex('#f8fff0'));
    this.textures.addCanvas('pelota_tenis', p.done());
    // la raqueta: el aro ovalado con su encordado y el mango, apuntando a la derecha
    const q = new Painter(20, 9);
    q.rect(0, 3, 8, 3, hex('#2a2a3a'));
    q.rect(1, 4, 6, 1, hex('#d02a2a'));
    for (let y = 0; y < 9; y++) for (let x = 8; x < 20; x++) {
      const dx = (x - 14) / 6, dy = (y - 4) / 4.5, d = dx * dx + dy * dy;
      if (d <= 1 && d > 0.55) q.px(x, y, hex('#2a5ad0'));
      else if (d <= 0.55 && (x + y) % 2 === 0) q.px(x, y, hex('#f4f4f4'));
    }
    this.textures.addCanvas('raqueta', q.done());
  }

  /** La red con sus palos, las rayas de la cancha y la línea del medio. */
  private cancha() {
    const g = this.add.graphics().setDepth(PISO - 30);
    g.lineStyle(2, 0xf4ecd8, 0.85);
    g.lineBetween(BORDE[0], PISO - 12, BORDE[1], PISO - 12).lineBetween(BORDE[0] - 6, PISO + 12, BORDE[1] + 6, PISO + 12);
    g.lineBetween(BORDE[0], PISO - 12, BORDE[0] - 6, PISO + 12).lineBetween(BORDE[1], PISO - 12, BORDE[1] + 6, PISO + 12);
    const red = this.add.graphics().setDepth(PISO + 1);
    // los palos
    red.fillStyle(0x3a3a44).fillRect(RED_X - 2, PISO - 12 - RED_H - 4, 3, RED_H + 4).fillRect(RED_X + 2, PISO + 12 - RED_H - 4, 3, RED_H + 4);
    // la malla, de un palo al otro (en profundidad)
    for (let k = 0; k <= 8; k++) {
      const y0 = PISO - 12 - RED_H + k * 2.6, y1 = PISO + 12 - RED_H + k * 2.6;
      red.lineStyle(1, 0x2a2a32, 0.55).lineBetween(RED_X, y0, RED_X + 3, y1);
    }
    for (let k = 0; k <= 6; k++) { const t = k / 6; red.lineStyle(1, 0x2a2a32, 0.4).lineBetween(RED_X + t * 3, PISO - 12 + t * 24 - RED_H, RED_X + t * 3, PISO - 12 + t * 24 - RED_H + 21); }
    red.lineStyle(2, 0xf4f4f4).lineBetween(RED_X, PISO - 12 - RED_H, RED_X + 3, PISO + 12 - RED_H);
  }

  // ------------------------------------------------------------------ la pelota

  /** Lanza la pelota para que caiga en `tx` pasando por la altura `alto` (o derecho y rápido si `t` va dado). */
  private lanzar(tx: number, alto: number, t?: number) {
    const c = this.bola;
    c.en = 'aire';
    c.dueño = null;
    c.red = false;
    c.botes = 0;
    c.n++;
    if (t) {
      c.vx = (tx - c.x) / t;
      c.vz = (G * t * t / 2 - c.z) / t;
      return;
    }
    const top = Math.max(alto, c.z + 4);
    const vz = Math.sqrt(2 * G * (top - c.z));
    const T = vz / G + Math.sqrt((2 * top) / G);
    c.vz = vz;
    c.vx = (tx - c.x) / T;
  }

  /**
   * Dónde conviene pegarle: después del primer pique, cuando la pelota vuelve a bajar a la cintura. Si ya picó dos
   * veces en la cuenta, donde pica la segunda. Es lo que marca el círculo amarillo y a donde va la máquina.
   */
  private caida(): number {
    const c = this.bola;
    if (c.en !== 'aire') return c.x;
    let x = c.x, z = c.z, vx = c.vx, vz = c.vz, botes = c.botes;
    const dt = 1 / 60;
    for (let k = 0; k < 600; k++) {
      vz -= G * dt; x += vx * dt; z += vz * dt;
      if (z <= 0) {
        if (botes > 0) return x;
        botes = 1; vz = Math.max(150, Math.abs(vz) * 0.8); vx *= PIQUE; z = 0.1;
      }
      if (botes > 0 && vz < 0 && z <= 24) return x;
    }
    return x;
  }

  /** El que saca tiene la pelota en la mano. */
  private alSaque(team: 0 | 1) {
    this.saca = team;
    const c = this.bola;
    const del = this.pat.filter((p) => p.c.team === team);
    const quien = del.find((p) => p.c.human) ?? del.find((p) => p.fila === 0) ?? del[0];
    for (const p of this.pat) { p.x = p.casa; p.z = 0; p.vz = 0; p.st = 'piso'; p.fig.set('idle'); }
    // el que saca, al fondo de su lado
    quien.x = team === 0 ? 122 : 518;
    c.en = 'mano';
    c.dueño = quien;
    c.lado = team;
    c.toques = 0;
    c.ultimo = null;
    c.ultimoTiro = null;
    c.vx = c.vz = 0;
    quien.cool = quien.c.human ? 0 : 0.9;
  }

  /** ¿Alcanza la pelota? Con la raqueta: de la rodilla al hombro; saltando, por encima de la cabeza. */
  private alcance(p: Voleador): number | null {
    const c = this.bola;
    if (c.en !== 'aire') return null;
    const paseo = ajustes().nombre === 'PASEO' && p.c.human;
    const dx = Math.abs(c.x - p.x), alto = c.z - p.z;
    if (dx > (paseo ? 34 : 26) || alto < ALCANCE.piso[0] || alto > (p.st === 'aire' ? ALCANCE.aire : paseo ? 62 : ALCANCE.piso[1])) return null;
    return alto;
  }

  /** Un toque: "patada" la pasa al otro lado (es el puño de la persona), "pase" la levanta, y saltando cerca de la red, el remate. */
  /** El mejor lugar del otro lado: el más lejos de los que lo cuidan (con un poco de azar entre los mejores). */
  private hueco(team: 0 | 1): number {
    const rivales = this.pat.filter((o) => o.c.team !== team).map((o) => o.x);
    const xs: number[] = [];
    for (let x = team === 0 ? 372 : 56; x <= (team === 0 ? 584 : 268); x += 16) xs.push(x);
    const puntaje = xs.map((x) => ({ x, d: Math.min(...rivales.map((r) => Math.abs(r - x))) })).sort((a, b) => b.d - a.d);
    return puntaje[Math.floor(Math.random() * Math.min(3, puntaje.length))].x;
  }

  private tocar(p: Voleador, quiere: 'patada' | 'pase', forzarMalo = false) {
    if (p.golpeT > 0) return;
    const c = this.bola;
    const team = p.c.team, dir = team === 0 ? 1 : -1;
    // el saque
    if (c.en === 'mano' && c.dueño === p) {
      c.x = p.x + dir * 8; c.z = 22;
      this.lanzar(team === 0 ? Phaser.Math.Between(360, 470) : this.d.practica ? Phaser.Math.Clamp(this.pat[0].x + Phaser.Math.Between(-30, 30), 170, 280) : Phaser.Math.Between(170, 280), 58);
      this.golpeAnim(p, 'weapon_swing_heavy');
      c.ultimo = p; c.ultimoTiro = 'saque'; c.lado = team; c.toques = 1;
      this.sfx('esquiva', 0.3);
      return;
    }
    const alto = this.alcance(p);
    this.golpeAnim(p, p.st === 'aire' ? 'weapon_swing_heavy' : 'weapon_swing');
    if (alto === null) { p.golpeT = 0.25; return; }
    // un solo golpe por lado: si tu compañero ya le pegó, punto para el otro
    if (c.lado !== team) { c.lado = team; c.toques = 0; }
    c.toques++;
    if (c.toques > 1) { this.letrero(p, '¡DOBLE GOLPE!', 0xff8080); this.punto(team === 0 ? 1 : 0, null); return; }
    // la calidad del golpe: lo ideal es a la altura de la cintura
    const paseo = ajustes().nombre === 'PASEO' && p.c.human;
    const perfecto = alto >= 12 && alto <= 36;
    const malo = forzarMalo || (!paseo && (alto < 4 || alto > 46) && p.st !== 'aire');
    const cercaRed = Math.abs(p.x - RED_X) < 110;
    let tiro: Tiro;
    if (p.st === 'aire' && cercaRed && quiere === 'patada') {
      // el smash: rápido y para abajo, pica y se va lejos
      tiro = 'remate';
      const tx = team === 0 ? Phaser.Math.Between(380, 500) : Phaser.Math.Between(140, 260);
      this.lanzar(tx, 0, 0.42);
      if (c.z < RED_H + 8) c.vz += 40;
      this.letrero(p, '¡SMASH!', 0xffe040);
      this.shake(120, 0.006);
      if (p.c.human) this.remates++;
    } else if (quiere === 'pase') {
      // el globo: alto por encima de los de la red y al fondo
      tiro = 'pase';
      const tx = team === 0 ? Phaser.Math.Between(500, 580) : Phaser.Math.Between(60, 140);
      this.lanzar(malo ? (team === 0 ? 640 : 0) : tx, 120 + Math.random() * 16);
      if (p.c.human) this.globos++;
    } else {
      tiro = 'patada';
      const lejos = team === 0 ? [380, 580] : [60, 260];
      // el toque perfecto va al hueco; el normal, a cualquier lado
      let tx = perfecto ? this.hueco(team) : Phaser.Math.Between(lejos[0], lejos[1]);
      let top = perfecto ? 36 + Math.random() * 10 : 46 + Math.random() * 16;
      // entrenando, Kenji te la devuelve suave cerca de donde estás (y en el paso del smash, alta para rematar)
      if (this.d.practica && team === 1) { tx = this.pasoSmash ? 240 : Phaser.Math.Clamp(this.pat[0].x + Phaser.Math.Between(-40, 30), 170, 290); top = this.pasoSmash ? 112 : 64; }
      // mal pegada: a la red o afuera
      if (malo) { if (Math.random() < 0.6) { tx = RED_X + dir * 20; top = 14 + Math.random() * 6; } else tx = team === 0 ? 650 : -10; }
      this.lanzar(tx, top);
      if (perfecto && p.c.human) this.letrero(p, '¡QUÉ DRIVE!', 0x8ae08a);
      if (p.c.human && !malo) this.pasadas++;
    }
    c.ultimo = p;
    c.ultimoTiro = tiro;
    p.toques++;
    this.sfx('golpe', p.c.human ? 0.35 : 0.2);
    efecto(this, 'chispa_golpe_liviano', c.x, PISO + FILA[p.fila] - c.z, { depth: 5001 });
  }

  private golpeAnim(p: Voleador, anim: string) {
    p.golpeT = 0.32;
    p.fig.set(anim, true, 1.4);
  }

  // ------------------------------------------------------------------ puntos

  private punto(team: 0 | 1, motivo: string | null) {
    if (this.pausaT > 0 || this.terminado) return;
    const c = this.bola;
    const remate = c.ultimoTiro === 'remate' && c.ultimo?.c.team === team;
    const vale = 1;
    this.marcador[team] += vale;
    if (c.ultimo && c.ultimo.c.team === team) c.ultimo.puntos += vale;
    c.en = 'piso';
    this.pausaT = 1.6;
    const s = motivo ?? (remate ? '¡SMASH!' : team === 0 ? '¡PUNTO FAMILIA!' : '¡PUNTO INSTITUTO!');
    const t = this.uiAdd(txt(this, 320, 90, s, 'fuente_titulo', 1).setDepth(8500).setTint(team === 0 ? 0x9ac8ff : 0xffa0a0));
    this.tweens.add({ targets: t, y: 74, alpha: 0, delay: 900, duration: 500, onComplete: () => t.destroy() });
    chip.blip(team === 0 ? 988 : 330, 0.25, 'sq25', 0.16, team === 0 ? 1318 : 220);
    if (team === 0) flash(this, 80);
    for (const p of this.pat) if (p.st === 'piso' && p.golpeT <= 0) p.fig.set(p.c.team === team ? 'celebrate' : 'sad', true);
    this.saca = this.d.practica ? 1 : team;
    if (!this.d.practica && this.marcador[team] >= META) this.terminar(team);
  }

  /**
   * La pelota picó en la arcilla. El primer pique del otro lado vale (rebota y sigue); si pica afuera, en tu propio
   * lado o se quedó en la red, punto para el otro; el segundo pique es punto para el que le pegó.
   */
  private aterriza() {
    const c = this.bola;
    efecto(this, 'polvo_caer_chico', c.x, PISO);
    this.sfx('paso_tierra_0', 0.3);
    const quien = c.ultimo?.c.team ?? this.saca;
    const otro: 0 | 1 = quien === 0 ? 1 : 0;
    const lado: 0 | 1 = c.x < RED_X ? 0 : 1;
    const afuera = c.x < BORDE[0] - 6 || c.x > BORDE[1] + 6;
    if (c.red) { this.punto(otro, '¡A LA RED!'); return; }
    if (c.botes === 0) {
      if (afuera) { this.punto(otro, '¡AFUERA!'); return; }
      if (lado === quien) { this.punto(otro, null); return; }
      // el pique bueno: rebota y sigue
      c.botes = 1;
      c.vz = Math.max(150, Math.abs(c.vz) * 0.8);
      c.vx *= PIQUE;
      c.z = 0.1;
      c.n++;
      return;
    }
    this.punto(quien, null);
  }

  // ------------------------------------------------------------------ cuadro a cuadro

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    const p = this.pad.read();
    if (this.endTick(p)) { this.animar(dt); this.filterUi(); return; }
    const jugando = this.fase === 'juego' && !this.terminado;
    if (jugando) this.clock += dt;
    this.coach?.tick(dt);
    if (this.pausaT > 0) {
      this.pausaT -= dt;
      if (this.pausaT <= 0 && !this.terminado) this.alSaque(this.saca);
    }
    const c = this.bola;
    for (const q of this.pat) {
      q.golpeT = Math.max(0, q.golpeT - dt);
      q.cool = Math.max(0, q.cool - dt);
      let mx = 0, salta = false, patada = false, pase = false, corre = false;
      if (jugando && this.pausaT <= 0) {
        if (q.c.human) { mx = p.x; corre = p.run; salta = p.pressed.jump; patada = p.pressed.punch; pase = p.pressed.kick; }
        else ({ mx, salta, patada, pase } = this.cpu(q, dt));
      }
      // el que saca no camina con la pelota en la mano: la suelta con un golpe
      if (c.en === 'mano' && c.dueño === q) { if ((patada || pase) && q.cool <= 0) this.tocar(q, 'patada'); mx = 0; }
      else {
        if (patada) this.tocar(q, 'patada');
        else if (pase) this.tocar(q, 'pase');
      }
      // moverse, sin pasar la red ni salirse
      // la arena frena
      const vel = (corre ? 150 : 100) * (q.c.human ? 1 : ajustes().cpuVel);
      if (q.golpeT <= 0 || q.st === 'aire') q.x += mx * vel * dt;
      const lim = q.c.team === 0 ? [BORDE[0] - 14, RED_X - 10] : [RED_X + 12, BORDE[1] + 14];
      q.x = Phaser.Math.Clamp(q.x, lim[0], lim[1]);
      if (mx) q.fig.left = mx < 0;
      else if (q.golpeT <= 0) q.fig.left = q.c.team === 1;
      if (salta && q.st === 'piso' && q.golpeT <= 0) { q.st = 'aire'; q.vz = 270; q.fig.set('jump_rise', true); }
      if (q.st === 'aire') {
        q.vz -= 700 * dt;
        q.z += q.vz * dt;
        if (q.z <= 0) { q.z = 0; q.vz = 0; q.st = 'piso'; q.fig.set('land', true); }
        else if (q.golpeT <= 0 && q.vz < 0 && q.fig.anim.name !== 'jump_fall') q.fig.set('jump_fall');
      }
      // la animación: caminar, correr o quieto, cuando no está pegando ni celebrando (moverse corta la celebración)
      if (q.st === 'piso' && q.golpeT <= 0) {
        const quiere = mx ? (corre ? 'run' : 'walk') : 'idle';
        const libre = ['idle', 'walk', 'run'].includes(q.fig.anim.name) || q.fig.anim.done || mx !== 0;
        if (libre && q.fig.anim.name !== quiere) q.fig.set(quiere);
      }
      q.fig.step(dt, Math.abs(mx) * vel * dt);
    }
    // la pelota
    if (c.en === 'mano' && c.dueño) {
      const d = c.dueño;
      c.x = d.x + (d.c.team === 0 ? 9 : -9);
      c.z = 20 + Math.sin(this.time.now / 160) * 2;
    } else if (c.en === 'aire') {
      const x0 = c.x;
      c.vz -= G * dt;
      c.x += c.vx * dt;
      c.z += c.vz * dt;
      // la red: si cruza por debajo, rebota y cae de este lado
      const cruza = (x0 < RED_X) !== (c.x < RED_X);
      if (cruza && c.z < RED_H) {
        c.x = x0;
        c.vx *= -0.15;
        c.vz = Math.min(c.vz, 0);
        c.red = true;
        this.sfx('esquiva', 0.3);
      }
      if (c.z <= 0) { c.z = 0; this.aterriza(); }
    }
    if (jugando && this.d.practica) this.entrenador();
    this.render();
    this.filterUi();
  }

  private animar(dt: number) { for (const q of this.pat) q.fig.step(dt); this.render(); }

  // ------------------------------------------------------------------ la máquina

  private cpu(q: Voleador, dt: number) {
    const r = { mx: 0, salta: false, patada: false, pase: false };
    const c = this.bola, team = q.c.team;
    q.pensar -= dt;
    // los errores: más en los niveles fáciles; y si la persona va perdiendo por mucho, un poco más
    const dif = this.marcador[1] - this.marcador[0];
    const error = this.d.practica ? 0 : Phaser.Math.Clamp(0.5 - 0.36 * ajustes().cpuAgresion + (team === 1 && dif >= 3 ? 0.12 * ajustes().ayuda : 0), 0.04, 0.6);
    if (c.en === 'mano' && c.dueño === q) { if (q.cool <= 0) r.patada = true; return r; }
    // una pelota nueva: decide de una vez si le va a pegar bien, mal o si no llega, y cuánto tarda en reaccionar
    if (c.en === 'aire' && q.plan.n !== c.n) {
      const dado = Math.random();
      const torpe = 1 - ajustes().cpuAgresion;
      q.plan = { n: c.n, tipo: dado < error * 0.45 ? 'falla' : dado < error ? 'mala' : 'bien', reaccion: 0.08 + torpe * 0.3 + Math.random() * 0.12, ruido: (Math.random() - 0.5) * (8 + torpe * 30) };
      // entrenando, en el último paso (ganarle un punto), a Kenji se le escapan los tiros buenos
      if (this.d.practica && this.coach?.ultimo && c.ultimo?.c.human && (c.ultimoTiro === 'remate' || Math.random() < 0.5)) q.plan.tipo = 'falla';
    }
    q.plan.reaccion = Math.max(0, q.plan.reaccion - dt);
    // a dónde va a caer, y si es de mi lado y me toca a mí (el de adelante cerca de la red, el de atrás al fondo)
    let meta = q.casa;
    if (c.en === 'aire') {
      const xl = this.caida();
      const mio = team === 0 ? xl < RED_X : xl >= RED_X;
      if (mio) {
        const compas = this.pat.filter((o) => o.c.team === team);
        const yo = compas.length === 1 || compas.sort((a, b) => Math.abs(a.x - xl) - Math.abs(b.x - xl))[0] === q;
        if (yo) meta = xl - (team === 0 ? 6 : -6) + q.plan.ruido;
        // la pelota alta cerca de la red: salta al smash (a veces)
        if (yo && q.fila === 1 && Math.abs(c.x - q.x) < 30 && Math.abs(q.x - RED_X) < 120 && c.z > 56 && c.z < 84 && c.vz < 0 && q.st === 'piso' && q.plan.tipo === 'bien' && Math.random() < 0.08 + ajustes().cpuAgresion * 0.1) r.salta = true;
      }
    }
    if (q.pensar <= 0 && q.plan.reaccion <= 0) { q.pensar = 0.08 + Math.random() * 0.08; q.quiereX = meta + (Math.random() - 0.5) * 6; }
    const dx = q.quiereX - q.x;
    r.mx = Math.abs(dx) > 5 ? Math.sign(dx) : 0;
    // pegarle: cuando la tiene a la altura de los brazos (o saltando, arriba)
    const alto = this.alcance(q);
    if (alto !== null && q.golpeT <= 0 && q.plan.tipo !== 'falla') {
      const bueno = q.st === 'aire' ? alto < ALCANCE.aire - 4 : alto >= 12 && alto <= 36;
      const bajando = c.vz < 0;
      if ((bueno && bajando) || alto < 6) {
        if (q.plan.tipo === 'mala') {
          // se equivoca: la toca mal y se va a la red o afuera
          this.tocar(q, 'patada', true);
        } else {
          // casi siempre drive; a veces, desde el fondo, un globo
          if (q.st === 'piso' && q.fila === 0 && Math.random() < 0.15) r.pase = true; else r.patada = true;
        }
      }
    }
    return r;
  }

  // ------------------------------------------------------------------ entrenamiento

  private pasos(): Paso[] {
    return [
      { texto: 'EL CÍRCULO AMARILLO DICE DÓNDE PICA:\nPÁRATE AHÍ CON {MOVER}', botones: ['stick'], listo: () => this.llego },
      { texto: 'DEJA QUE PIQUE Y, CUANDO BAJE A LA\nCINTURA, {PUÑO} LE PEGA CON LA RAQUETA', botones: ['punch'], listo: () => this.pasadas >= 1 },
      { texto: '¡ESO! PÁSALA 3 VECES MÁS', botones: ['stick', 'punch'], listo: () => this.pasadas >= 4 },
      { texto: 'SI VIENE ALTA CERCA DE LA RED,\n{SALTO} Y {PUÑO}: ¡EL SMASH!', botones: ['jump', 'punch'], antes: () => { this.pasoSmash = true; }, listo: () => this.remates >= 1 },
      { texto: '{PATADA} ES EL GLOBO, ALTO Y AL FONDO.\nGÁNALE UN PUNTO A KENJI', botones: ['stick', 'punch', 'kick'], antes: () => { this.pasoSmash = false; }, listo: () => this.marcador[0] >= 1 },
    ];
  }

  /** Entrenando: Kenji la devuelve siempre suave hacia donde estás, y en el primer paso la pelota te busca. */
  private entrenador() {
    const me = this.pat[0];
    const c = this.bola;
    if (c.en === 'aire' && this.caida() < RED_X && Math.abs(me.x - this.caida()) < 14 && c.z > 10) this.llego = true;
  }

  // ------------------------------------------------------------------ dibujo y final

  private render() {
    const c = this.bola;
    this.pat.forEach((q, i) => {
      const y = PISO + FILA[q.fila];
      q.fig.setPosition(Math.round(q.x), Math.round(y - q.z)).setDepth(y);
      // la raqueta: en la mano del swing con su ángulo; si no está pegando, en la mano y apuntando adelante
      const a = q.fig.anim, arma = a.data.arma?.[q.fig.rowIndex]?.[a.frame];
      const mano = a.data.manos?.[q.fig.rowIndex]?.[a.frame]?.[0] ?? [6, -20];
      const [ax, ay, ang] = arma ?? [mano[0], mano[1], 330];
      const izq = q.fig.left;
      this.raquetas[i].setPosition(Math.round(q.x + (izq ? -ax : ax)), Math.round(y - q.z + ay)).setDepth(y + 0.5)
        .setFlipX(izq).setRotation(Phaser.Math.DegToRad(izq ? -ang : ang)).setOrigin(izq ? 0.85 : 0.15, 0.5);
      q.sombra.setPosition(Math.round(q.x), y).setScale(Math.max(0.5, 1 - q.z / 80)).setDepth(y - 1);
    });
    // la pelota, girando
    const fila = c.dueño ? FILA[c.dueño.fila] : 0;
    c.spr.setPosition(Math.round(c.x), Math.round(PISO + fila - c.z)).setVisible(c.en !== 'piso' || this.pausaT > 0);
    if (c.en === 'aire') c.spr.setRotation(c.spr.rotation + (c.vx > 0 ? 0.25 : -0.25));
    c.rastro.emitting = c.en === 'aire';
    c.sombra.setPosition(Math.round(c.x), PISO).setScale(Math.max(0.4, 1 - c.z / 140)).setVisible(c.en !== 'piso');
    // el círculo: dónde va a caer, cuando viene a tu lado (en Nekketsu no hay ayuda)
    const xl = this.caida();
    const ayuda = ajustes().nombre !== 'NEKKETSU' || !!this.d.practica;
    c.marca.setVisible(ayuda && c.en === 'aire' && xl < RED_X && xl > BORDE[0] - 10).setPosition(Math.round(xl), PISO);
    // la cámara sigue la pelota, sin perder a la persona
    const me = this.pat.find((q) => q.c.human) ?? this.pat[0];
    const cam = this.cameras.main;
    const cur = cam.midPoint.x || 320;
    const tx = c.en === 'aire' ? (c.x * 0.6 + me.x * 0.4) : me.x;
    cam.centerOn(cur + (tx - cur) * 0.07, this.camY);
    // marcador
    this.scoreTxt.setText(`${this.marcador[0]} - ${this.marcador[1]}`);
    this.toqueTxt.setText(c.en === 'mano' && c.dueño?.c.human ? rotular('{PUÑO}: SACAR', this.pad.fuente) : '');
    const g = this.hud;
    g.clear();
    g.fillStyle(0x000000, 0.45).fillRect(170, 6, 300, 20);
  }

  private sfx(name: string, vol = 0.5) { if (this.cache.audio.exists(name)) this.sound.play(name, { volume: vol }); }
  private shake(ms: number, k: number) { this.cameras.main.shake(ms, k); }
  private letrero(p: Voleador, s: string, color: number) {
    const t = txt(this, p.x, PISO + FILA[p.fila] - p.z - 56, s, 'fuente_ui', 1).setTint(color).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 12, alpha: 0, delay: 400, duration: 450, onComplete: () => t.destroy() });
  }

  private terminar(ganador: 0 | 1) {
    if (this.terminado) return;
    this.terminado = true;
    void this.banner(ganador === 0 ? '¡GANA LA FAMILIA GG!' : '¡GANA EL INSTITUTO!', 'fuente_titulo', 2, 1600, 110);
    this.time.delayedCall(2400, () => {
      for (const q of this.pat) q.fig.set(q.c.team === ganador ? 'victory' : 'sad', true);
      const orden = [...this.pat]
        .sort((a, b) => Number(b.c.team === ganador) - Number(a.c.team === ganador) || b.toques - a.toques || b.puntos - a.puntos)
        .map((q) => ({ c: q.c, valor: `${q.puntos} PUNTOS` }));
      this.resultados(prueba('Tenis').nombre, orden);
    });
  }
}
