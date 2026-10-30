import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { ajustes } from '../core/nivel';
import { efecto, destellar } from '../core/fx';
import { chip } from '../core/music';
import { txt, flash } from '../core/ui';
import { rotular } from '../core/input';
import { Painter, hex } from '../gfx/paint';
import { lado } from '../core/equipos';
import { EventScene, type Competidor } from './base';
import { queueEscenario } from './escenario';
import type { Paso } from '../core/coach';

/** el piso de la cancha (vista de lado): los de atrás un poco más arriba que los de adelante */
const PISO = 310;
const FILA = [-6, 6];
const RED_X = 320;
/** lo alto de la red sobre el piso */
const RED_H = 30;
const BORDE = [34, 606];
const G = 240;
const ZOOM = 1.15;
/** a cuántos puntos se gana */
const META = 5;
/** el armado cae a esta distancia de la red: ahí se salta a la chilena */
const ATAQUE = 40;
/** la altura del volante a la que se le pega la chilena (con el salto arriba) */
const ALTO_CHILENA = 60;

/** 'pase' es el armado junto a la red para la chilena; 'recibo', el volante alto al compañero para que él arme */
type Tiro = 'patada' | 'pase' | 'recibo' | 'chilena' | 'saque';
interface Pateador {
  c: Competidor; fig: Figura; sombra: Phaser.GameObjects.Ellipse;
  x: number; fila: 0 | 1; z: number; vz: number; st: 'piso' | 'aire'; golpeT: number; cool: number;
  puntos: number; toques: number; casa: number; pensar: number; quiereX: number; salta: boolean;
  /** le pegó al aire: puede seguir moviéndose mientras recupera */
  fallo: boolean;
  /** la máquina decide una vez por volante que viene: le pega bien, la toca mal o no llega; y tarda un poquito en reaccionar.
   * `arma`: si le toca y se puede, se lo levanta al compañero junto a la red */
  plan: { n: number; tipo: 'bien' | 'mala' | 'falla'; reaccion: number; ruido: number; arma: boolean };
}
interface Cau {
  x: number; z: number; vx: number; vz: number;
  en: 'mano' | 'aire' | 'piso'; dueño: Pateador | null; ultimo: Pateador | null; ultimoTiro: Tiro | null;
  lado: 0 | 1; toques: number; spr: Phaser.GameObjects.Image; sombra: Phaser.GameObjects.Ellipse; marca: Phaser.GameObjects.Ellipse;
  red: boolean;
  /** cuántos tiros van: cada tiro nuevo, la máquina vuelve a decidir */
  n: number;
  /** la chilena Nekketsu: va con fuego y atraviesa la red */
  fuego: boolean;
  rastro: Phaser.GameObjects.Particles.ParticleEmitter;
  llamas: Phaser.GameObjects.Particles.ParticleEmitter;
}

/**
 * Đá cầu en el parque Tao Đàn de Saigón: el volante de plumas que se juega con los pies, 2 contra 2 con red baja.
 * Patada la manda al otro lado, puño se lo levanta a tu compañero (y él te lo deja alto junto a la red), y saltando
 * cerca de la red con patada sale la chilena, que vale doble si es punto. Cada lado puede tocarla hasta 3 veces y
 * la máquina nunca la toca dos seguidas. La barra Nekketsu se llena con los buenos toques, los pases y los puntos que
 * pierdes; llena, especial con el volante cerca es la CHILENA NEKKETSU, de fuego y al hueco. Gana el primero a 5.
 */
export class DaCau extends EventScene {
  private pat: Pateador[] = [];
  private cau!: Cau;
  private marcador: [number, number] = [0, 0];
  /** las barras Nekketsu de los dos lados */
  private nek: [number, number] = [0, 0];
  /** para no repetir los avisos del especial */
  private avisoT = 0;
  private saca: 0 | 1 = 0;
  private pausaT = 0;
  private clock = 0;
  private hud!: Phaser.GameObjects.Graphics;
  private scoreTxt!: { setText(s: string): unknown };
  private toqueTxt!: Phaser.GameObjects.BitmapText;
  private terminado = false;
  /** entrenamiento */
  private pasadas = 0;
  private chilenas = 0;
  /** el tiempo desde el último toque del dominio antes del saque */
  private dominioT = 0;
  private llego = false;

  constructor() { super('DaCau'); }

  preload() { super.preload(); queueEscenario(this, 'tao_dan'); }

  create() {
    this.pat = [];
    this.marcador = [0, 0];
    this.nek = [0, 0];
    this.avisoT = 0;
    this.saca = 0;
    this.pausaT = 0;
    this.clock = 0;
    this.terminado = false;
    this.pasadas = 0;
    this.chilenas = 0;
    this.llego = false;
    this.setup(ZOOM, 640);
    this.texturas();
    this.escenario('tao_dan', 'bg_taodan');
    this.cancha();
    // entrenando: tú solo de este lado y Kenji del otro, que te la devuelve suave
    const gente: Competidor[] = this.d.practica ? [this.gente[0], { id: this.rivalEntreno, team: 1, human: false }] : this.gente;
    gente.forEach((c) => {
      const nuestro = c.team === 0;
      const companeros = gente.filter((o) => o.team === c.team);
      const fila = (companeros.length === 1 ? 1 : companeros.indexOf(c) === 0 ? 1 : 0) as 0 | 1;
      // el de adelante cerca de la red, el de atrás al fondo
      const casa = nuestro ? (fila === 1 ? 230 : 110) : fila === 1 ? 410 : 530;
      const fig = new Figura(this, casa, PISO + FILA[fila], c.id, 'idle');
      fig.left = !nuestro;
      const sombra = this.add.ellipse(casa, PISO + FILA[fila], 20, 5, 0x000000, 0.3);
      this.pat.push({ c, fig, sombra, x: casa, fila, z: 0, vz: 0, st: 'piso', golpeT: 0, cool: 0, puntos: 0, toques: 0, casa, pensar: Math.random() * 0.2, quiereX: casa, salta: false, fallo: false, plan: { n: -1, tipo: 'bien', reaccion: 0, ruido: 0, arma: false } });
    });
    const spr = this.add.image(0, 0, 'cau').setDepth(5000).setScale(1.6);
    // un rastro suave detrás del volante, para seguirlo con la vista
    const rastro = this.add.particles(0, 0, 'px', { lifespan: 260, scale: { start: 0.6, end: 0 }, alpha: { start: 0.5, end: 0 }, tint: 0xffffff, frequency: 30 }).setDepth(4999);
    rastro.startFollow(spr);
    // la chilena Nekketsu deja fuego detrás
    const llamas = this.add.particles(0, 0, 'px', { lifespan: 320, scale: { start: 1.5, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffe040, 0xff6020, 0xffffff], frequency: 12, emitting: false }).setDepth(4998);
    llamas.startFollow(spr);
    const sombra = this.add.ellipse(0, PISO, 8, 3, 0x000000, 0.3).setDepth(PISO - 20);
    const marca = this.add.ellipse(0, PISO, 22, 7).setStrokeStyle(2, 0xffe040, 0.9).setDepth(PISO - 19).setVisible(false);
    this.cau = { x: 0, z: 0, vx: 0, vz: 0, en: 'mano', dueño: null, ultimo: null, ultimoTiro: null, lado: 0, toques: 0, spr, sombra, marca, red: false, n: 0, fuego: false, rastro, llamas };
    // entrenando, siempre saca Kenji (suave, hacia ti)
    this.alSaque(this.d.practica ? 1 : 0);
    this.cameras.main.centerOn(260, this.camY);
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.scoreTxt = this.marcadorTV(320, 16, 8001);
    this.uiAdd(txt(this, 250, 16, lado(0).corto, 'fuente_ui', 1, 1).setDepth(8001).setTint(0x9ac8ff));
    this.uiAdd(txt(this, 390, 16, lado(1).corto, 'fuente_ui', 1, 0).setDepth(8001).setTint(0xffa0a0));
    this.toqueTxt = this.uiAdd(txt(this, 320, 34, '', 'fuente_ui', 1).setDepth(8001).setTint(0xffe080));
    this.tema('saigon_chay');
    this.ambiente('parque_tao_dan');
    if (this.d.practica) void this.entrenar('ĐÁ CẦU', this.pasos());
    else void this.previa('ĐÁ CẦU', 'PARQUE TAO ĐÀN, SAIGÓN', '{MOVER} AL CÍRCULO · {PATADA} AL OTRO LADO · {PUÑO} A TU COMPAÑERO · {SALTO} Y {PATADA}: CHILENA · {ESPECIAL}: CHILENA NEKKETSU');
  }

  private get camY() { return 360 - 180 / this.cameras.main.zoom; }

  private texturas() {
    if (this.textures.exists('cau')) return;
    // el volante: plumas de colores arriba y la base de goma con arandelas abajo
    const p = new Painter(9, 15);
    const plumas = ['#ffffff', '#f2c230', '#e83a3a', '#3ac06a', '#ffffff'].map(hex);
    for (let k = 0; k < 5; k++) for (let y = 0; y < 9; y++) p.px(k * 2 - Math.round((y - 8) * (k - 2) * 0.12), y, plumas[k]);
    p.rect(2, 8, 5, 2, hex('#d8d8d8'));
    p.rect(1, 10, 7, 3, hex('#b02a2a'));
    p.rect(2, 13, 5, 2, hex('#7a1a1a'));
    this.textures.addCanvas('cau', p.done());
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

  // ------------------------------------------------------------------ el volante

  /** Lanza el volante para que caiga en `tx` pasando por la altura `alto` (o derecho y rápido si `t` va dado). */
  private lanzar(tx: number, alto: number, t?: number) {
    const c = this.cau;
    c.en = 'aire';
    c.dueño = null;
    c.red = false;
    c.fuego = false;
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

  /** Dónde va a caer (sin la red). */
  private caida(): number {
    const c = this.cau;
    if (c.en !== 'aire') return c.x;
    const T = (c.vz + Math.sqrt(c.vz * c.vz + 2 * G * Math.max(0, c.z))) / G;
    return c.x + c.vx * T;
  }

  /** El que saca tiene el volante en la mano. */
  private alSaque(team: 0 | 1) {
    this.saca = team;
    const c = this.cau;
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

  /** ¿Alcanza el volante? En el piso, de los pies a la cintura; saltando, a la altura de los pies en el aire. */
  private alcance(p: Pateador): number | null {
    const c = this.cau;
    if (c.en !== 'aire') return null;
    const paseo = ajustes().nombre === 'PASEO' && p.c.human;
    // el que te dejó tu compañero junto a la red para la chilena: más fácil de alcanzar
    const armada = p.c.human && this.paraRematar(p);
    const dx = Math.abs(c.x - p.x), alto = c.z - p.z;
    if (dx > (paseo || armada ? 36 : 26) || alto < -4 || alto > (paseo ? 66 : 60)) return null;
    return alto;
  }

  /** En cuánto tiempo el volante, bajando, pasa por la altura `z` (null si no llega tan alto). */
  private cuandoA(z: number): number | null {
    const c = this.cau;
    if (c.en !== 'aire') return null;
    const d = c.vz * c.vz + 2 * G * (c.z - z);
    return d < 0 ? null : (c.vz + Math.sqrt(d)) / G;
  }

  /** El punto de chilena de un lado: junto a la red. */
  private ataque(team: 0 | 1) { return RED_X + (team === 0 ? -ATAQUE : ATAQUE); }

  /** ¿El volante en el aire es un armado de su compañero para que `q` haga la chilena? */
  private armadaPara(q: Pateador): boolean {
    const c = this.cau;
    return c.en === 'aire' && c.ultimoTiro === 'pase' && !!c.ultimo && c.ultimo !== q && c.ultimo.c.team === q.c.team && c.lado === q.c.team && c.toques <= 2;
  }

  /** ¿Es para que `q` remate? El armado del compañero, o entrenando solo, el que se levantó él mismo. */
  private paraRematar(q: Pateador): boolean {
    const c = this.cau;
    return this.armadaPara(q) || (!!this.d.practica && c.en === 'aire' && c.ultimoTiro === 'pase' && c.ultimo === q);
  }

  /** Dónde va a estar el volante cuando baje a la altura de la chilena (para saltar ahí). */
  private puntoRemate(): { x: number; t: number } | null {
    const t = this.cuandoA(ALTO_CHILENA);
    return t === null ? null : { x: this.cau.x + this.cau.vx * t, t };
  }

  /** Los toques que ya van de este lado (el que viene será el siguiente). */
  private van(team: 0 | 1): number { return this.cau.lado === team ? this.cau.toques : 0; }

  /** ¿Puede tirar la chilena Nekketsu? El volante cerca, de su lado, con toques para hacerlo y sin que su lado ya lo haya mandado. */
  private alcanceFuego(p: Pateador): boolean {
    const c = this.cau, team = p.c.team;
    if (c.en !== 'aire' || Math.abs(c.x - p.x) > 60 || c.z > 110) return false;
    const deMiLado = team === 0 ? c.x < RED_X : c.x >= RED_X;
    const yaVa = c.ultimo?.c.team === team && c.ultimoTiro !== 'pase';
    return deMiLado && !yaVa && this.van(team) < 3;
  }

  /** Un toque: patada al otro lado, puño la levanta, saltando cerca de la red chilena. */
  /** El mejor lugar del otro lado: el más lejos de los que lo cuidan (con un poco de azar entre los mejores). */
  private hueco(team: 0 | 1): number {
    const rivales = this.pat.filter((o) => o.c.team !== team).map((o) => o.x);
    const xs: number[] = [];
    for (let x = team === 0 ? 372 : 56; x <= (team === 0 ? 584 : 268); x += 16) xs.push(x);
    const puntaje = xs.map((x) => ({ x, d: Math.min(...rivales.map((r) => Math.abs(r - x))) })).sort((a, b) => b.d - a.d);
    return puntaje[Math.floor(Math.random() * Math.min(3, puntaje.length))].x;
  }

  private tocar(p: Pateador, quiere: 'patada' | 'pase' | 'fuego', forzarMalo = false) {
    if (p.golpeT > 0) return;
    const c = this.cau;
    const team = p.c.team, dir = team === 0 ? 1 : -1;
    // el saque
    if (c.en === 'mano' && c.dueño === p) {
      c.x = p.x + dir * 8; c.z = 22;
      this.lanzar(team === 0 ? Phaser.Math.Between(400, 560) : this.d.practica ? Phaser.Math.Clamp(this.pat[0].x + Phaser.Math.Between(-50, 50), 70, 280) : Phaser.Math.Between(80, 240), 96);
      // el saque es el dominio del kit (lote B7H8) que lo manda por arriba; sin él, la volea
      if (p.fig.anim.has('shuttle_juggle')) this.golpeAnim(p, 'shuttle_juggle', 'volley');
      else this.golpeAnim(p, 'volley', 'low_kick');
      c.ultimo = p; c.ultimoTiro = 'saque'; c.lado = team; c.toques = 1;
      this.sfx('esquiva', 0.3);
      return;
    }
    // la chilena Nekketsu sin el volante cerca no gasta la barra: sale una patada normal
    if (quiere === 'fuego' && !this.alcanceFuego(p)) quiere = 'patada';
    const alto = quiere === 'fuego' ? Math.max(0, c.z - p.z) : this.alcance(p);
    // las del pack de fútbol del kit (sin la pelota pintada: el cầu lo pone el juego), o las patadas de la pelea
    // la chilena de lado del kit (lote B7H8): la Nekketsu, desde más alto y con la vuelta atrás
    const chilena = (n: string) => (p.fig.anim.has(n) ? n : 'chilena');
    if (quiere === 'fuego') this.golpeAnim(p, chilena('shuttle_kick_back_nekketsu'), 'air_kick');
    else if (p.st === 'aire') this.golpeAnim(p, chilena('shuttle_kick_back'), 'air_kick');
    else if (quiere === 'pase') this.golpeAnim(p, 'trap', 'low_kick');
    else this.golpeAnim(p, 'volley', 'kick_martial');
    // le pegó al aire: recupera rápido y se puede seguir moviendo
    if (alto === null) { p.golpeT = 0.12; p.fallo = true; return; }
    // los toques de este lado: al cuarto, punto para el otro
    if (c.lado !== team) { c.lado = team; c.toques = 0; }
    c.toques++;
    if (c.toques > 3) { this.letrero(p, '¡CUATRO TOQUES!', 0xff8080); this.punto(team === 0 ? 1 : 0, null); return; }
    // la calidad del toque: lo ideal es a media pierna
    const paseo = ajustes().nombre === 'PASEO' && p.c.human;
    const perfecto = alto >= 10 && alto <= 36;
    // tu compañero no lo toca mal por llegar justo: sus errores ya los decidió su plan
    const conmigo = !p.c.human && this.pat.some((o) => o.c.human && o.c.team === team);
    const malo = quiere !== 'fuego' && (forzarMalo || (!paseo && !conmigo && (alto < 2 || alto > 56) && p.st !== 'aire'));
    const cercaRed = Math.abs(p.x - RED_X) < 110;
    let tiro: Tiro;
    if (quiere === 'fuego') {
      // la chilena Nekketsu: salta sí o sí, de fuego y derecha al hueco; atraviesa la red y vale doble
      tiro = 'chilena';
      this.nek[team] = 0;
      if (p.st === 'piso') { p.st = 'aire'; p.vz = 230; p.z = 1; }
      this.lanzar(this.hueco(team), 0, 0.4);
      c.fuego = true;
      this.letrero(p, '¡CHILENA NEKKETSU!', 0xff8020);
      destellar(c.spr, 140, 0xffa040);
      efecto(this, 'aura_nekketsu', p.x, PISO + FILA[p.fila], { depth: PISO + FILA[p.fila] - 0.1 });
      if (team === 0) void this.banner('¡NEKKETSU!', 'fuente_titulo', 2, 500, 110);
      this.shake(240, 0.012);
      flash(this, 120);
      for (const o of this.pat) if (o.c.team !== team && (team === 0 || Math.random() < 0.5 + 0.35 * ajustes().cpuAgresion)) o.plan = { n: c.n, tipo: 'falla', reaccion: 1, ruido: 0, arma: false };
      if (p.c.human) this.chilenas++;
    } else if (p.st === 'aire' && cercaRed && quiere === 'patada') {
      // la chilena: rápida y para abajo
      tiro = 'chilena';
      const tx = team === 0 ? Phaser.Math.Between(380, 540) : Phaser.Math.Between(100, 260);
      this.lanzar(tx, 0, 0.5);
      if (c.z < RED_H + 8) c.vz += 40;
      this.letrero(p, '¡CHILENA!', 0xffe040);
      this.shake(120, 0.006);
      destellar(c.spr, 90);
      p.fig.destello(60, 0xffe040);
      if (p.c.human) this.chilenas++;
    } else if (quiere === 'pase') {
      const comp = this.pat.find((o) => o !== p && o.c.team === team);
      const red = (o: Pateador) => Math.abs(o.x - RED_X);
      if (!comp) {
        // solo (entrenando): la levanta para sí mismo, un poco más cerca de la red
        tiro = 'pase';
        const tx = p.x + dir * 40;
        this.lanzar(team === 0 ? Phaser.Math.Clamp(tx, BORDE[0] + 10, RED_X - 26) : Phaser.Math.Clamp(tx, RED_X + 26, BORDE[1] - 10), 104);
      } else if (c.toques <= 2 && (comp.c.human || red(comp) <= red(p) + 30 || !p.c.human)) {
        // el armado: alto y junto a la red, para que el compañero salte a la chilena
        tiro = 'pase';
        this.lanzar(this.ataque(team), comp.c.human ? 114 : 108);
        this.letrero(comp, comp.c.human ? '¡SALTA Y CHILENA!' : '¡ARRIBA!', 0xffe040);
      } else {
        // la persona está más cerca de la red que su compañero: se lo pasa alto para que él se lo arme de vuelta
        tiro = 'recibo';
        const tx = Phaser.Math.Clamp(comp.x, team === 0 ? BORDE[0] + 30 : RED_X + 70, team === 0 ? RED_X - 70 : BORDE[1] - 30);
        this.lanzar(tx, 100);
      }
    } else {
      tiro = 'patada';
      const lejos = team === 0 ? [380, 580] : [60, 260];
      // el toque perfecto va al hueco; el normal, a cualquier lado
      let tx = perfecto ? this.hueco(team) : Phaser.Math.Between(lejos[0], lejos[1]);
      let top = perfecto ? 62 + Math.random() * 24 : 84 + Math.random() * 20;
      // entrenando, Kenji te la devuelve alta y cerquita de donde estás
      if (this.d.practica && team === 1) { tx = Phaser.Math.Clamp(this.pat[0].x + Phaser.Math.Between(-40, 40), 70, 280); top = 100; }
      // mal tocada: corta y baja, a la red o afuera
      if (malo) { if (Math.random() < 0.6) { tx = RED_X + dir * 20; top = 26 + Math.random() * 10; } else tx = team === 0 ? 640 : 0; }
      this.lanzar(tx, top);
      if (perfecto && p.c.human) { this.letrero(p, '¡PERFECTO!', 0x8ae08a); p.fig.destello(60, 0xffe040); }
      if (p.c.human && !malo) this.pasadas++;
    }
    c.ultimo = p;
    c.ultimoTiro = tiro;
    p.toques++;
    // la barra: cada buen toque, y más cada pase
    if (quiere !== 'fuego' && !malo) this.carga(team, tiro === 'pase' ? 20 : 10);
    this.suena('toque_cau', p.c.human ? 0.5 : 0.3, () => this.sfx('golpe', p.c.human ? 0.35 : 0.2));
    efecto(this, 'chispa_golpe_liviano', c.x, PISO + FILA[p.fila] - c.z, { depth: 5001 });
  }

  /** Llena la barra de un lado; cuando se llena la tuya, avisa. */
  private carga(team: 0 | 1, n: number) {
    // la barra de los rivales se llena más lento en los niveles fáciles
    if (team === 1 && !this.d.practica) n *= Math.max(0.4, ajustes().cpuAgresion);
    const antes = this.nek[team];
    this.nek[team] = Math.min(100, antes + n);
    const me = this.pat.find((q) => q.c.human);
    if (team === 0 && antes < 100 && this.nek[0] >= 100 && me) { this.letrero(me, '¡BARRA LLENA!', 0xffe040); this.sfx('elegir', 0.4); }
  }

  /** El especial apretado sin poder usarlo: un aviso cortito (sin repetirlo a cada rato). */
  private aviso(p: Pateador) {
    if (this.avisoT > 0) return;
    this.avisoT = 1;
    this.letrero(p, this.nek[0] >= 100 ? '¡CON EL VOLANTE CERCA!' : 'LLENA LA BARRA', 0xffe080);
  }

  /** El toque con la animación del kit desde el contacto, o la patada de antes. */
  private golpeAnim(p: Pateador, anim: string, respaldo: string) {
    p.golpeT = 0.32;
    p.fallo = false;
    p.fig.contacto(anim, respaldo, 1.4);
  }

  // ------------------------------------------------------------------ puntos

  private punto(team: 0 | 1, motivo: string | null) {
    if (this.pausaT > 0 || this.terminado) return;
    const c = this.cau;
    // la chilena que termina en punto vale doble
    const doble = c.ultimoTiro === 'chilena' && c.ultimo?.c.team === team;
    const vale = doble ? 2 : 1;
    this.marcador[team] += vale;
    // el que pierde el punto se enciende
    this.carga(team === 0 ? 1 : 0, 15);
    if (c.ultimo && c.ultimo.c.team === team) c.ultimo.puntos += vale;
    c.en = 'piso';
    this.pausaT = 1.6;
    const s = motivo ?? (doble ? (c.fuego ? '¡NEKKETSU! +2' : '¡CHILENA! +2') : `¡PUNTO ${lado(team).corto}!`);
    const t = this.uiAdd(txt(this, 320, 90, s, 'fuente_titulo', 1).setDepth(8500).setTint(team === 0 ? 0x9ac8ff : 0xffa0a0));
    this.tweens.add({ targets: t, y: 74, alpha: 0, delay: 900, duration: 500, onComplete: () => t.destroy() });
    chip.blip(team === 0 ? 988 : 330, 0.25, 'sq25', 0.16, team === 0 ? 1318 : 220);
    if (team === 0) flash(this, 80);
    for (const p of this.pat) if (p.st === 'piso' && p.golpeT <= 0) p.fig.set(p.c.team === team ? 'celebrate' : 'sad', true);
    this.saca = this.d.practica ? 1 : team;
    if (!this.d.practica && this.marcador[team] >= META) this.terminar(team);
  }

  /** El volante tocó el piso (o se fue): de qué lado cayó, o afuera. */
  private aterriza() {
    const c = this.cau;
    efecto(this, 'polvo_caer_chico', c.x, PISO);
    this.sfx('paso_piedra_0', 0.3);
    const afuera = c.x < BORDE[0] - 8 || c.x > BORDE[1] + 8;
    if (afuera && c.ultimo && !c.red) { this.punto(c.ultimo.c.team === 0 ? 1 : 0, '¡AFUERA!'); return; }
    const lado: 0 | 1 = c.x < RED_X ? 0 : 1;
    this.punto(lado === 0 ? 1 : 0, c.red ? '¡A LA RED!' : null);
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
    const c = this.cau;
    this.avisoT = Math.max(0, this.avisoT - dt);
    for (const q of this.pat) {
      q.golpeT = Math.max(0, q.golpeT - dt);
      q.cool = Math.max(0, q.cool - dt);
      let mx = 0, salta = false, patada = false, pase = false, corre = false, fuego = false;
      if (jugando && this.pausaT <= 0) {
        if (q.c.human) {
          mx = p.x; corre = p.run; salta = p.pressed.jump; patada = p.pressed.kick; pase = p.pressed.punch;
          // el especial: con la barra llena y el volante cerca; si no, un aviso
          if (p.pressed.special) { if (this.nek[0] >= 100 && this.alcanceFuego(q)) fuego = true; else this.aviso(q); }
        } else ({ mx, salta, patada, pase, fuego, corre } = this.cpu(q, dt));
      }
      // el que saca no camina con el volante en la mano: lo suelta con patada
      if (c.en === 'mano' && c.dueño === q) { if ((patada || pase) && q.cool <= 0) this.tocar(q, 'patada'); mx = 0; }
      else {
        if (fuego) this.tocar(q, 'fuego');
        else if (patada) this.tocar(q, 'patada');
        else if (pase) this.tocar(q, 'pase');
      }
      // moverse, sin pasar la red ni salirse (tras un toque al aire, también)
      // tu compañero corre a tu par en todos los niveles; los rivales, según el nivel
      const vel = (corre ? 170 : 115) * (q.c.human || this.pat.some((o) => o.c.human && o.c.team === q.c.team) ? 1 : ajustes().cpuVel);
      if (q.golpeT <= 0 || q.st === 'aire' || q.fallo) q.x += mx * vel * dt;
      const lim = q.c.team === 0 ? [BORDE[0] - 14, RED_X - 10] : [RED_X + 12, BORDE[1] + 14];
      q.x = Phaser.Math.Clamp(q.x, lim[0], lim[1]);
      if (mx) q.fig.left = mx < 0;
      else if (q.golpeT <= 0) q.fig.left = q.c.team === 1;
      if (salta && q.st === 'piso' && q.golpeT <= 0) { q.st = 'aire'; q.vz = 250; q.fig.set('jump_rise', true).estirar(); }
      if (q.st === 'aire') {
        q.vz -= 700 * dt;
        q.z += q.vz * dt;
        if (q.z <= 0) { q.z = 0; q.vz = 0; q.st = 'piso'; q.fig.set('land', true).aplastar(); }
        else if (q.golpeT <= 0 && q.vz < 0 && q.fig.anim.name !== 'jump_fall') q.fig.set('jump_fall');
      }
      // la animación: caminar, correr o quieto, cuando no está pegando ni celebrando (moverse corta la celebración)
      // el que va a sacar domina el cầu con un pie y el otro (lote B7H8), hasta que lo manda
      const domina = c.en === 'mano' && c.dueño === q && q.fig.anim.has('shuttle_juggle');
      if (q.st === 'piso' && q.golpeT <= 0) {
        const quiere = domina ? 'shuttle_juggle' : mx ? (corre ? 'run' : 'walk') : 'idle';
        const libre = ['idle', 'walk', 'run', 'shuttle_juggle'].includes(q.fig.anim.name) || q.fig.anim.done || mx !== 0;
        if (libre && q.fig.anim.name !== quiere) q.fig.set(quiere);
      }
      const ev = q.fig.step(dt, Math.abs(mx) * vel * dt);
      // cada toque del dominio suena, y el cầu sube otra vez desde ese pie
      if (domina && q.fig.anim.name === 'shuttle_juggle' && ev.some((e) => e.tipo === 'impacto')) {
        this.dominioT = 0;
        this.suena('toque_cau', q.c.human ? 0.25 : 0.12, () => this.sfx('golpe', 0.1));
      }
    }
    // el volante
    if (c.en === 'mano' && c.dueño) {
      const d = c.dueño;
      if (d.fig.anim.name === 'shuttle_juggle') {
        // el dominio: sube y baja entre toque y toque, sobre el pie que le pega
        this.dominioT += dt;
        const u = Phaser.Math.Clamp(this.dominioT / 0.33, 0, 1);
        c.x = d.x + (d.c.team === 0 ? 6 : -6);
        c.z = 12 + 30 * 4 * u * (1 - u);
      } else {
        c.x = d.x + (d.c.team === 0 ? 9 : -9);
        c.z = 20 + Math.sin(this.time.now / 160) * 2;
      }
    } else if (c.en === 'aire') {
      const x0 = c.x;
      c.vz -= G * dt;
      c.x += c.vx * dt;
      c.z += c.vz * dt;
      // la red: si cruza por debajo, rebota y cae de este lado (la chilena Nekketsu la atraviesa)
      if ((x0 < RED_X) !== (c.x < RED_X) && c.z < RED_H && !c.fuego) {
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

  private cpu(q: Pateador, dt: number) {
    const r = { mx: 0, salta: false, patada: false, pase: false, fuego: false, corre: false };
    const c = this.cau, team = q.c.team;
    q.pensar -= dt;
    // los errores: más en los niveles fáciles; y si la persona va perdiendo por mucho, un poco más.
    // tu compañero se equivoca la mitad que los de enfrente
    const dif = this.marcador[1] - this.marcador[0];
    const base = Phaser.Math.Clamp(0.5 - 0.36 * ajustes().cpuAgresion + (dif >= 3 ? 0.12 * ajustes().ayuda : 0), 0.04, 0.6);
    // tu compañero es confiable en todos los niveles: los errores fáciles son de los rivales
    const conmigo = this.pat.some((o) => o.c.human && o.c.team === team);
    const error = this.d.practica ? 0 : conmigo ? 0.05 : base;
    if (c.en === 'mano' && c.dueño === q) { if (q.cool <= 0) r.patada = true; return r; }
    const compa = this.pat.find((o) => o !== q && o.c.team === team);
    // un volante nuevo: decide de una vez si le va a pegar bien, mal o si no llega, y cuánto tarda en reaccionar;
    // con la persona de compañero casi siempre se lo arma, entre máquinas a veces (el de atrás al de adelante)
    if (c.en === 'aire' && q.plan.n !== c.n) {
      const dado = Math.random();
      const torpe = conmigo ? 0 : 1 - ajustes().cpuAgresion;
      // la jugada de tres toques: con la persona de compañero casi siempre; entre máquinas, más mientras más difícil
      const arma = !!compa && Math.random() < (compa.c.human ? 0.9 : 0.15 + 0.5 * ajustes().cpuAgresion);
      q.plan = { n: c.n, tipo: dado < error * 0.45 ? 'falla' : dado < error ? 'mala' : 'bien', reaccion: 0.08 + torpe * 0.3 + Math.random() * 0.12, ruido: (Math.random() - 0.5) * (8 + torpe * 30), arma };
      // entrenando, en el último paso (ganarle un punto), a Kenji se le escapan los tiros buenos
      if (this.d.practica && this.coach?.ultimo && c.ultimo?.c.human && (c.ultimoTiro === 'chilena' || Math.random() < 0.5)) q.plan.tipo = 'falla';
    }
    q.plan.reaccion = Math.max(0, q.plan.reaccion - dt);
    // los toques que van de este lado (el que viene será el siguiente); se lo arma si quedan toques
    const van = this.van(team);
    const dir = team === 0 ? 1 : -1;
    const remata = this.armadaPara(q);
    // si ya es el segundo toque y el compañero es la persona, siempre se lo arma
    const armar = !remata && !!compa && van <= 1 && (q.plan.arma || (compa.c.human && van === 1));
    // a dónde va a caer, y si es de mi lado y me toca a mí (el de adelante cerca de la red, el de atrás al fondo)
    let meta = q.casa, yo = false;
    if (remata) {
      // el armado es para mí: corre a donde el volante baja a la altura de la chilena y salta justo a tiempo
      yo = true;
      const pr = this.puntoRemate();
      if (pr) {
        meta = pr.x - dir * 4;
        r.corre = Math.abs(meta - q.x) > 24;
        if (q.st === 'piso' && pr.t < 0.34 && Math.abs(pr.x - q.x) < 22 && q.plan.tipo !== 'falla') r.salta = true;
      }
    } else if (c.en === 'aire') {
      const xl = this.caida();
      const mio = team === 0 ? xl < RED_X : xl >= RED_X;
      if (mio) {
        const compas = this.pat.filter((o) => o.c.team === team);
        // va el más cerca de donde cae; pero si la tocó uno de este lado, le toca al otro (nadie la toca dos seguidas)
        const tocoUnCompa = c.ultimo?.c.team === team && c.lado === team && compas.length > 1;
        yo = compas.length === 1 || (tocoUnCompa ? c.ultimo !== q : [...compas].sort((a, b) => Math.abs(a.x - xl) - Math.abs(b.x - xl))[0] === q);
        if (yo) { meta = xl - dir * 6 + q.plan.ruido; r.corre = Math.abs(meta - q.x) > 60; }
        // lo recibe el compañero: este sube a la red a esperar el armado (o a armarle); si lo acaba de tocar él, cubre atrás
        else if (c.ultimo !== q) meta = RED_X - dir * (ATAQUE + 16);
      }
    }
    if (q.pensar <= 0 && q.plan.reaccion <= 0) { q.pensar = 0.08 + Math.random() * 0.08; q.quiereX = meta + (Math.random() - 0.5) * 6; }
    const dx = q.quiereX - q.x;
    r.mx = Math.abs(dx) > 5 ? Math.sign(dx) : 0;
    // pegarle, solo si le toca: cuando la tiene a media pierna (o saltando, a los pies)
    const alto = this.alcance(q);
    // con el armado para la chilena no le pega desde el piso: espera el salto (salvo que ya se le caiga)
    const esperaSalto = remata && q.st === 'piso' && alto !== null && alto > 12;
    if (yo && alto !== null && q.golpeT <= 0 && q.plan.tipo !== 'falla' && !esperaSalto) {
      const bueno = q.st === 'aire' ? alto < 44 : alto >= 8 && alto <= 36;
      const bajando = c.vz < 0;
      if ((bueno && bajando) || alto < 6) {
        if (q.plan.tipo === 'mala') {
          // se equivoca: la toca mal y se va a la red o afuera
          this.tocar(q, 'patada', true);
        } else if (this.nek[team] >= 100 && !this.d.practica && !compa?.c.human && this.alcanceFuego(q) && (van >= 1 || q.st === 'aire') && Math.random() < 0.6) {
          // la barra llena: la chilena Nekketsu (la barra de tu lado es tuya: tu compañero no la gasta)
          r.fuego = true;
        } else if (armar && q.st === 'piso') r.pase = true;
        else r.patada = true;
      }
    }
    return r;
  }

  // ------------------------------------------------------------------ entrenamiento

  private pasos(): Paso[] {
    return [
      { texto: 'EL CÍRCULO AMARILLO DICE DÓNDE CAE:\nPÁRATE AHÍ CON {MOVER}', botones: ['stick'], listo: () => this.llego },
      { texto: 'CUANDO BAJE A TUS PIES,\nTOCA {PATADA} Y PÁSALA AL OTRO LADO', botones: ['kick'], listo: () => this.pasadas >= 1 },
      { texto: '¡ESO! PÁSALA 3 VECES MÁS', botones: ['stick', 'kick'], listo: () => this.pasadas >= 4 },
      { texto: '{PUÑO} LA LEVANTA ALTA. LUEGO, CERCA DE\nLA RED, {SALTO} Y {PATADA}: ¡LA CHILENA!', botones: ['punch', 'jump', 'kick'], listo: () => this.chilenas >= 1 },
      { texto: `¡CHILENA! SI ES PUNTO VALE DOBLE.\nGÁNALE UN PUNTO A ${this.rivalEntrenoNombre}`, botones: ['stick', 'kick', 'jump'], listo: () => this.marcador[0] >= 1 },
    ];
  }

  /** Entrenando: Kenji la devuelve siempre suave hacia donde estás, y en el primer paso el volante te busca. */
  private entrenador() {
    const me = this.pat[0];
    const c = this.cau;
    if (c.en === 'aire' && this.caida() < RED_X && Math.abs(me.x - this.caida()) < 14 && c.z > 10) this.llego = true;
  }

  // ------------------------------------------------------------------ dibujo y final

  private render() {
    const c = this.cau;
    for (const q of this.pat) {
      const y = PISO + FILA[q.fila];
      q.fig.setPosition(Math.round(q.x), Math.round(y - q.z)).setDepth(y);
      q.sombra.setPosition(Math.round(q.x), y).setScale(Math.max(0.5, 1 - q.z / 80)).setDepth(y - 1);
    }
    // el volante: con la base para adelante, según para dónde va
    const fila = c.dueño ? FILA[c.dueño.fila] : 0;
    c.spr.setPosition(Math.round(c.x), Math.round(PISO + fila - c.z)).setVisible(c.en !== 'piso' || this.pausaT > 0);
    if (c.en === 'aire') c.spr.setRotation(Math.atan2(c.vz * -1, c.vx) + Math.PI / 2 + Math.PI);
    else c.spr.setRotation(0);
    c.rastro.emitting = c.en === 'aire';
    c.llamas.emitting = c.en === 'aire' && c.fuego;
    c.sombra.setPosition(Math.round(c.x), PISO).setScale(Math.max(0.4, 1 - c.z / 140)).setVisible(c.en !== 'piso');
    // el círculo: dónde va a caer, cuando viene a tu lado (en Nekketsu no hay ayuda)
    const xl = this.caida();
    const ayuda = ajustes().nombre !== 'NEKKETSU' || !!this.d.practica;
    // con el armado para ti, el círculo naranja dice dónde saltar a la chilena
    const me0 = this.pat.find((q) => q.c.human);
    const pr = me0 && this.paraRematar(me0) ? this.puntoRemate() : null;
    if (pr) c.marca.setVisible(ayuda).setPosition(Math.round(pr.x), PISO).setStrokeStyle(2, 0xff8020, 1);
    else c.marca.setVisible(ayuda && c.en === 'aire' && xl < RED_X && xl > BORDE[0] - 10).setPosition(Math.round(xl), PISO).setStrokeStyle(2, 0xffe040, 0.9);
    // la cámara sigue el volante, sin perder a la persona
    const me = this.pat.find((q) => q.c.human) ?? this.pat[0];
    const cam = this.cameras.main;
    const cur = cam.midPoint.x || 320;
    const tx = c.en === 'aire' ? (c.x * 0.6 + me.x * 0.4) : me.x;
    cam.centerOn(cur + (tx - cur) * 0.07, this.camY);
    // marcador
    this.scoreTxt.setText(`${this.marcador[0]} - ${this.marcador[1]}`);
    const llena = this.nek[0] >= 100 ? ' · {ESPECIAL}: ¡CHILENA NEKKETSU!' : '';
    this.toqueTxt.setY(42).setText(rotular(c.en === 'aire' && c.lado === 0 && c.toques > 0 && c.ultimo?.c.team === 0 ? `TOQUE ${c.toques} DE 3${llena}` : c.en === 'mano' && c.dueño?.c.human ? '{PATADA}: SACAR' : llena.slice(3), this.pad.fuente));
    const g = this.hud;
    g.clear();
    g.fillStyle(0x000000, 0.45).fillRect(170, 6, 300, 20);
    // las barras Nekketsu, debajo de cada nombre
    for (const t of [0, 1] as const) {
      const x = t === 0 ? 176 : 360, lleno = this.nek[t] >= 100;
      g.fillStyle(0x000000, 0.6).fillRect(x, 28, 104, 6);
      g.fillStyle(lleno ? (Math.floor(this.time.now / 150) % 2 ? 0xffe040 : 0xff6020) : t === 0 ? 0x5a9af0 : 0xf05a5a).fillRect(x + 2, 29, this.nek[t], 4);
    }
  }

  private sfx(name: string, vol = 0.5) { if (this.cache.audio.exists(name)) this.sound.play(name, { volume: vol }); }
  private shake(ms: number, k: number) { this.cameras.main.shake(ms, k); }
  private letrero(p: Pateador, s: string, color: number) {
    const t = txt(this, p.x, PISO + FILA[p.fila] - p.z - 56, s, 'fuente_ui', 1).setTint(color).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 12, alpha: 0, delay: 400, duration: 450, onComplete: () => t.destroy() });
  }

  private terminar(ganador: 0 | 1) {
    if (this.terminado) return;
    this.terminado = true;
    void this.banner(`¡${lado(ganador).gana}!`, 'fuente_titulo', 2, 1600, 110);
    this.time.delayedCall(2400, () => {
      for (const q of this.pat) q.fig.set(q.c.team === ganador ? 'victory' : 'sad', true);
      const orden = [...this.pat]
        .sort((a, b) => Number(b.c.team === ganador) - Number(a.c.team === ganador) || b.toques - a.toques || b.puntos - a.puntos)
        .map((q) => ({ c: q.c, valor: `${q.toques} TOQUES` }));
      this.resultados('ĐÁ CẦU TAO ĐÀN', orden);
    });
  }
}
