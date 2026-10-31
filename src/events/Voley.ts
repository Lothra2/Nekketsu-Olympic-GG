import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { pelotaKit } from '../core/kit';
import { ajustes } from '../core/nivel';
import { efecto, talla, destellar, tiroSuper } from '../core/fx';
import { chip } from '../core/music';
import { txt, flash, rafaga } from '../core/ui';
import { rotular } from '../core/input';
import { Painter, hex } from '../gfx/paint';
import { lado } from '../core/equipos';
import { EventScene, prueba, type Competidor } from './base';
import { queueEscenario } from './escenario';
import type { Paso } from '../core/coach';

/** el piso de la cancha (vista de lado): los de atrás un poco más arriba que los de adelante */
const PISO = 310;
const FILA = [-6, 6];
const RED_X = 320;
/** lo alto de la red sobre el piso */
const RED_H = 46;
const BORDE = [34, 606];
const G = 230;
const ZOOM = 1.15;
/** a cuántos puntos se gana */
const META = 7;
/** el armado cae a esta distancia de la red: ahí se salta a rematar */
const ATAQUE = 40;
/** la altura de la pelota a la que se le pega el remate (con el salto arriba) */
const ALTO_REMATE = 82;

/** 'pase' es el armado junto a la red para el remate; 'recibo', la pelota alta al compañero para que él arme */
type Tiro = 'patada' | 'pase' | 'recibo' | 'remate' | 'saque' | 'fuego';
interface Voleador {
  c: Competidor; fig: Figura; sombra: Phaser.GameObjects.Ellipse;
  x: number; fila: 0 | 1; z: number; vz: number; st: 'piso' | 'aire'; golpeT: number; cool: number;
  puntos: number; toques: number; casa: number; pensar: number; quiereX: number; salta: boolean;
  /** la máquina decide una vez por pelota que viene: le pega bien, la toca mal o no llega; y tarda un poquito en reaccionar */
  plan: { n: number; tipo: 'bien' | 'mala' | 'falla'; reaccion: number; ruido: number; cubre?: boolean };
}
interface Bola {
  x: number; z: number; vx: number; vz: number;
  en: 'mano' | 'aire' | 'piso'; dueño: Voleador | null; ultimo: Voleador | null; ultimoTiro: Tiro | null;
  lado: 0 | 1; toques: number; spr: Phaser.GameObjects.Image; sombra: Phaser.GameObjects.Ellipse; marca: Phaser.GameObjects.Ellipse;
  red: boolean;
  /** cuántos tiros van: cada tiro nuevo, la máquina vuelve a decidir */
  n: number;
  rastro: Phaser.GameObjects.Particles.ParticleEmitter;
  fuego: Phaser.GameObjects.Particles.ParticleEmitter;
}

/**
 * Vóley Playa en Margarita: 2 contra 2 en la arena (que frena al correr), con la red alta. Puño la pasa al otro
 * lado, patada se la levanta al compañero (y él te la arma junto a la red), y saltando cerca de la red con puño sale
 * el remate. Saltar pegado a la red cuando el otro remata es el bloqueo. Cada lado puede tocarla hasta 3 veces y
 * nadie dos seguidas. La barra Nekketsu se llena con los buenos toques y los puntos; llena, especial con la pelota a
 * tu alcance es el remate de fuego, que no se bloquea ni se saca. Gana el primero a 7.
 * Mientras llegan los packs de vóley sin la pelota pintada, usa los golpes de la pelea para los toques.
 */
export class Voley extends EventScene {
  private pat: Voleador[] = [];
  private bola!: Bola;
  private marcador: [number, number] = [0, 0];
  /** las barras Nekketsu de los dos lados */
  private nek: [number, number] = [0, 0];
  private saca: 0 | 1 = 0;
  private pausaT = 0;
  private clock = 0;
  private hud!: Phaser.GameObjects.Graphics;
  private scoreTxt!: { setText(s: string): unknown };
  private toqueTxt!: Phaser.GameObjects.BitmapText;
  private terminado = false;
  /** entrenamiento */
  private pasadas = 0;
  private remates = 0;
  /**
   * El remate de fuego del kit (lote B7H8) que está dando la vuelta en el aire: la pelota se queda colgada sobre él
   * hasta el impacto de `spike_fuego`, y ahí sale disparada.
   */
  private fuegoPend: { p: Voleador; team: 0 | 1; t: number } | null = null;
  /** hacia dónde se mueve la persona este cuadro, y hace cuánto fue lo último que hizo (para que su compañera sepa si está jugando) */
  private mxHumano = 0;
  private quietaHumano = 0;
  private llego = false;
  private bloqueos = 0;
  /** el halo oscuro detrás de la pelota: contra la arena clara, la pelota blanca se perdía */
  private halo!: Phaser.GameObjects.Arc;

  constructor() { super('Voley'); }

  preload() { super.preload(); queueEscenario(this, 'margarita'); }

  create() {
    this.pat = [];
    this.marcador = [0, 0];
    this.nek = [0, 0];
    this.saca = 0;
    this.pausaT = 0;
    this.clock = 0;
    this.terminado = false;
    this.pasadas = 0;
    this.remates = 0;
    this.llego = false;
    this.setup(ZOOM, 640);
    this.texturas();
    this.escenario('margarita', 'bg_margarita');
    this.bordeCancha('margarita');
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
      this.pat.push({ c, fig, sombra, x: casa, fila, z: 0, vz: 0, st: 'piso', golpeT: 0, cool: 0, puntos: 0, toques: 0, casa, pensar: Math.random() * 0.2, quiereX: casa, salta: false, plan: { n: -1, tipo: 'bien', reaccion: 0, ruido: 0 } });
    });
    // la pelota del kit (lote SP2), del tamaño de los atletas; si no llegó, la pintada por código
    // la talla grande del kit: con la de 48 el balón se perdía entre los pies en el celular
    const pk = pelotaKit(this, 'balon_voley', '64');
    const spr = (pk ? this.add.image(0, 0, 'pelotas', pk) : this.add.image(0, 0, 'balon_voley').setScale(1.3)).setDepth(5000);
    // un rastro suave detrás dla pelota, para seguirlo con la vista
    // la estela amarilla (la blanca se perdía contra la arena) y un halo oscuro detrás, para ver la pelota en la playa
    const rastro = this.add.particles(0, 0, 'px', { lifespan: 320, scale: { start: 1.3, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [0xffe040, 0xffa030], frequency: 18 }).setDepth(4999);
    rastro.startFollow(spr);
    this.halo = this.add.circle(0, 0, 8, 0x142030, 0.5).setDepth(4998.5);
    const fuego = this.add.particles(0, 0, 'px', { lifespan: 320, scale: { start: 1.5, end: 0 }, alpha: { start: 0.9, end: 0 }, tint: [0xffe040, 0xff6020, 0xffffff], frequency: 12, emitting: false }).setDepth(4998);
    fuego.startFollow(spr);
    const sombra = this.add.ellipse(0, PISO, 8, 3, 0x000000, 0.3).setDepth(PISO - 20);
    const marca = this.add.ellipse(0, PISO, 22, 7).setStrokeStyle(2, 0xffe040, 0.9).setDepth(PISO - 19).setVisible(false);
    this.bola = { x: 0, z: 0, vx: 0, vz: 0, en: 'mano', dueño: null, ultimo: null, ultimoTiro: null, lado: 0, toques: 0, spr, sombra, marca, red: false, n: 0, rastro, fuego };
    // entrenando, siempre saca Kenji (suave, hacia ti)
    this.alSaque(this.d.practica ? 1 : 0);
    this.cameras.main.centerOn(260, this.camY);
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.scoreTxt = this.marcadorTV(320, 16, 8001);
    this.uiAdd(txt(this, 250, 16, lado(0).corto, 'fuente_ui', 1, 1).setDepth(8001).setTint(0x9ac8ff));
    this.uiAdd(txt(this, 390, 16, lado(1).corto, 'fuente_ui', 1, 0).setDepth(8001).setTint(0xffa0a0));
    this.toqueTxt = this.uiAdd(txt(this, 320, 34, '', 'fuente_ui', 1).setDepth(8001).setTint(0xffe080));
    this.tema('playa_margarita');
    this.ambiente('mar');
    if (this.d.practica) void this.entrenar('VÓLEY PLAYA', this.pasos());
    else void this.previa('VÓLEY PLAYA', 'PLAYA EL AGUA, MARGARITA', '{MOVER} AL CÍRCULO · {PUÑO} AL OTRO LADO · {PATADA} A TU COMPAÑERO · {SALTO} Y {PUÑO}: REMATE · {ESPECIAL}: FUEGO');
  }

  private get camY() { return 360 - 180 / this.cameras.main.zoom; }

  private texturas() {
    if (this.textures.exists('balon_voley')) return;
    // la pelota de vóley: blanca con paneles amarillos y azules
    const p = new Painter(10, 10);
    p.circle(4.5, 4.5, 4.6, hex('#2a2a3a'));
    p.circle(4.5, 4.5, 3.8, hex('#f8f8f0'));
    p.rect(1, 3, 8, 2, hex('#f2c230'));
    p.rect(3, 6, 5, 1, hex('#2a5ad0'));
    p.rect(2, 1, 2, 2, hex('#2a5ad0'));
    this.textures.addCanvas('balon_voley', p.done());
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
    const c = this.bola;
    if (c.en !== 'aire') return c.x;
    const T = (c.vz + Math.sqrt(c.vz * c.vz + 2 * G * Math.max(0, c.z))) / G;
    return c.x + c.vx * T;
  }

  /** En cuánto tiempo la pelota, bajando, pasa por la altura `z` (null si no llega tan alto). */
  private cuandoA(z: number): number | null {
    const c = this.bola;
    if (c.en !== 'aire') return null;
    const d = c.vz * c.vz + 2 * G * (c.z - z);
    return d < 0 ? null : (c.vz + Math.sqrt(d)) / G;
  }

  /** El punto de remate de un lado: junto a la red. */
  private ataque(team: 0 | 1) { return RED_X + (team === 0 ? -ATAQUE : ATAQUE); }

  /** ¿La pelota en el aire es un armado de su compañero para que `q` remate? */
  private armadaPara(q: Voleador): boolean {
    const c = this.bola;
    return c.en === 'aire' && c.ultimoTiro === 'pase' && !!c.ultimo && c.ultimo !== q && c.ultimo.c.team === q.c.team && c.lado === q.c.team && c.toques <= 2;
  }

  /** ¿Es para que `q` remate? El armado del compañero, o entrenando solo, el que se levantó él mismo. */
  private paraRematar(q: Voleador): boolean {
    const c = this.bola;
    return this.armadaPara(q) || (!!this.d.practica && c.en === 'aire' && c.ultimoTiro === 'pase' && c.ultimo === q);
  }

  /** Dónde va a estar la pelota cuando baje a la altura del remate (para saltar ahí). */
  private puntoRemate(): { x: number; t: number } | null {
    const t = this.cuandoA(ALTO_REMATE);
    return t === null ? null : { x: this.bola.x + this.bola.vx * t, t };
  }

  /** El que saca tiene la pelota en la mano. */
  private alSaque(team: 0 | 1) {
    this.saca = team;
    const c = this.bola;
    const del = this.pat.filter((p) => p.c.team === team);
    const quien = del.find((p) => p.c.human) ?? del.find((p) => p.fila === 0) ?? del[0];
    this.fuegoPend = null;
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

  /** ¿Alcanza la pelota? A la altura de los brazos: de la cintura para arriba; saltando, más arriba de la cabeza. */
  private alcance(p: Voleador): number | null {
    const c = this.bola;
    if (c.en !== 'aire') return null;
    const paseo = ajustes().nombre === 'PASEO' && p.c.human;
    // la que te armó tu compañero para el remate: más fácil de alcanzar
    const armada = p.c.human && this.paraRematar(p);
    const dx = Math.abs(c.x - p.x), alto = c.z - p.z;
    if (dx > (paseo || armada ? 36 : 26) || alto < 4 || alto > (p.st === 'aire' ? 84 : paseo ? 78 : 68)) return null;
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

  private tocar(p: Voleador, quiere: 'patada' | 'pase' | 'fuego', forzarMalo = false) {
    if (p.golpeT > 0 || this.fuegoPend) return;
    const c = this.bola;
    const team = p.c.team, dir = team === 0 ? 1 : -1;
    // el saque
    if (c.en === 'mano' && c.dueño === p) {
      c.x = p.x + dir * 8; c.z = 22;
      this.lanzar(team === 0 ? Phaser.Math.Between(400, 560) : this.d.practica ? Phaser.Math.Clamp(this.pat[0].x + Phaser.Math.Between(-50, 50), 70, 280) : Phaser.Math.Between(80, 240), 124);
      this.golpeAnim(p, 'serve', 'uppercut');
      c.ultimo = p; c.ultimoTiro = 'saque'; c.lado = team; c.toques = 1;
      this.sfx('esquiva', 0.3);
      return;
    }
    const alto = this.alcance(p);
    // el fuego sin la pelota a mano no gasta la barra
    if (quiere === 'fuego' && alto === null) quiere = 'patada';
    if (p.st === 'aire' || quiere === 'fuego') this.golpeAnim(p, 'spike', 'jab');
    else if (quiere === 'pase') this.golpeAnim(p, 'vb_set', 'uppercut');
    else this.golpeAnim(p, 'vb_bump', 'fight_block');
    if (alto === null) { p.golpeT = 0.25; return; }
    // los toques de este lado: al cuarto, punto para el otro
    if (c.lado !== team) { c.lado = team; c.toques = 0; }
    c.toques++;
    const paseoDoble = ajustes().nombre === 'PASEO';
    if (c.toques > 3) { this.letrero(p, '¡CUATRO TOQUES!', 0xff8080); this.punto(team === 0 ? 1 : 0, null); return; }
    // nadie la toca dos veces seguidas (en Paseo, a la persona se le perdona)
    if (c.ultimo === p && c.toques > 1 && !(paseoDoble && p.c.human) && this.pat.filter((o) => o.c.team === team).length > 1) { this.letrero(p, '¡DOBLE TOQUE!', 0xff8080); this.punto(team === 0 ? 1 : 0, null); return; }
    // la calidad del toque: lo ideal es a media pierna
    const paseo = ajustes().nombre === 'PASEO' && p.c.human;
    const perfecto = alto >= 22 && alto <= 56;
    const malo = forzarMalo || (!paseo && (alto < 10 || alto > 64) && p.st !== 'aire');
    const cercaRed = Math.abs(p.x - RED_X) < 110;
    let tiro: Tiro;
    if (quiere === 'fuego') {
      // el remate de fuego: derecho al hueco, no hay bloqueo ni quien la saque
      tiro = 'fuego';
      this.nek[team] = 0;
      c.z = Math.max(c.z, RED_H + 24);
      if (p.fig.anim.has('spike_fuego')) {
        // salta, da la vuelta entera sobre la pelota, que lo espera colgada en el aire, y la mata en el impacto
        this.fuegoPend = { p, team, t: 0 };
        c.vx = 0; c.vz = 0;
        p.fig.anim.play('spike_fuego', true);
        p.fig.anim.pos = Math.max(0, p.fig.cuadroDe('despegue'));
        p.fig.refresh();
        p.golpeT = 1.2;
        if (p.st === 'piso') { p.st = 'aire'; p.vz = 330; } else p.vz = Math.max(p.vz, 200);
      } else this.lanzar(this.hueco(team), 0, 0.42);
      this.letrero(p, '¡REMATE DE FUEGO!', 0xff8020);
      destellar(c.spr, 140, 0xffa040);
      this.uiAdd(rafaga(this));
      efecto(this, 'aura_nekketsu', p.x, PISO + FILA[p.fila], { depth: PISO + FILA[p.fila] - 0.1 });
      this.corte(p.c.id, '¡REMATE DE FUEGO!', team);
      this.shake(240, 0.012);
      flash(this, 120);
      for (const o of this.pat) if (o.c.team !== team && (team === 0 || Math.random() < 0.5 + 0.35 * ajustes().cpuAgresion)) o.plan = { n: c.n, tipo: 'falla', reaccion: 1, ruido: 0 };
    } else if (p.st === 'aire' && cercaRed && quiere === 'patada') {
      // el remate: rápido y para abajo
      tiro = 'remate';
      const tx = team === 0 ? Phaser.Math.Between(380, 540) : Phaser.Math.Between(100, 260);
      this.lanzar(tx, 0, 0.5);
      if (c.z < RED_H + 8) c.vz += 40;
      this.letrero(p, '¡REMATE!', 0xffe040);
      destellar(c.spr, 90);
      p.fig.destello(60, 0xffe040);
      this.golpeFuerte(c.x, PISO + FILA[p.fila] - c.z);
      if (p.c.human) this.remates++;
    } else if (quiere === 'pase') {
      const comp = this.pat.find((o) => o !== p && o.c.team === team);
      const red = (o: Voleador) => Math.abs(o.x - RED_X);
      if (!comp) {
        // solo (entrenando): la levanta para sí mismo, un poco más cerca de la red
        tiro = 'pase';
        const tx = p.x + dir * 40;
        this.lanzar(team === 0 ? Phaser.Math.Clamp(tx, BORDE[0] + 10, RED_X - 26) : Phaser.Math.Clamp(tx, RED_X + 26, BORDE[1] - 10), 128);
      } else if (c.toques <= 2 && (comp.c.human || red(comp) <= red(p) + 30 || !p.c.human)) {
        // el armado: alta y junto a la red, para que el compañero salte y remate. A la persona se la arma donde está
        // (dentro de la zona de remate, y un poco adelante si viene corriendo), para que solo tenga que saltar
        tiro = 'pase';
        let tx = this.ataque(team);
        if (comp.c.human) {
          // se adelanta solo si viene hacia la red
          const lleva = Math.sign(this.mxHumano) === dir ? 16 : 0;
          tx = team === 0 ? Phaser.Math.Clamp(comp.x + lleva * dir, RED_X - 100, RED_X - 30) : Phaser.Math.Clamp(comp.x + lleva * dir, RED_X + 30, RED_X + 100);
        }
        this.lanzar(tx, comp.c.human ? 136 : 130);
        this.letrero(comp, comp.c.human ? '¡SALTA Y REMATA!' : '¡ARRIBA!', 0xffe040);
      } else {
        // la persona está más cerca de la red que su compañero: se la pasa alta para que él se la arme de vuelta
        tiro = 'recibo';
        const tx = Phaser.Math.Clamp(comp.x, team === 0 ? BORDE[0] + 30 : RED_X + 70, team === 0 ? RED_X - 70 : BORDE[1] - 30);
        this.lanzar(tx, 118);
      }
    } else {
      tiro = 'patada';
      const lejos = team === 0 ? [380, 580] : [60, 260];
      // el toque perfecto va al hueco; el normal, a cualquier lado
      let tx = perfecto ? this.hueco(team) : Phaser.Math.Between(lejos[0], lejos[1]);
      let top = perfecto ? 84 + Math.random() * 22 : 104 + Math.random() * 22;
      // entrenando, Kenji te la devuelve alta y cerquita de donde estás
      if (this.d.practica && team === 1) { tx = Phaser.Math.Clamp(this.pat[0].x + Phaser.Math.Between(-40, 40), 70, 280); top = 124; }
      // mal tocada: corta y baja, a la red o afuera
      if (malo) { if (Math.random() < 0.6) { tx = RED_X + dir * 20; top = 38 + Math.random() * 8; } else tx = team === 0 ? 640 : 0; }
      this.lanzar(tx, top);
      if (perfecto && p.c.human) { this.letrero(p, '¡PERFECTO!', 0x8ae08a); p.fig.destello(60, 0xffe040); }
      if (p.c.human && !malo) this.pasadas++;
    }
    c.ultimo = p;
    c.ultimoTiro = tiro;
    p.toques++;
    if (tiro !== 'fuego' && !malo) this.carga(team, tiro === 'remate' ? 14 : perfecto ? 10 : 6);
    this.sfx('golpe', p.c.human ? 0.35 : 0.2);
    efecto(this, 'chispa_golpe_liviano', c.x, PISO + FILA[p.fila] - c.z, { depth: 5001 });
  }

  /** El impacto del remate de fuego: la pelota sale disparada al hueco, sin bloqueo posible. */
  private soltarFuego() {
    const f = this.fuegoPend;
    if (!f) return;
    this.fuegoPend = null;
    const c = this.bola;
    c.x = Phaser.Math.Clamp(f.p.x + (f.team === 0 ? 6 : -6), BORDE[0], BORDE[1]);
    c.z = Math.max(c.z, RED_H + 24);
    this.lanzar(this.hueco(f.team), 0, 0.42);
    f.p.golpeT = 0.3;
    this.sfx('golpe', 0.6);
    efecto(this, 'chispa_golpe_pesado', c.x, PISO + FILA[f.p.fila] - c.z, { depth: 5001 });
    this.shake(200, 0.012);
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

  /** El golpe con la animación de vóley del kit (lote SP, sin la pelota pintada) desde el contacto, o la de antes. */
  private golpeAnim(p: Voleador, anim: string, respaldo: string) {
    p.golpeT = 0.32;
    p.fig.contacto(anim, respaldo, 1.4);
  }

  // ------------------------------------------------------------------ puntos

  private punto(team: 0 | 1, motivo: string | null) {
    if (this.pausaT > 0 || this.terminado) return;
    const c = this.bola;
    const remate = c.ultimoTiro === 'remate' && c.ultimo?.c.team === team;
    const vale = 1;
    this.marcador[team] += vale;
    this.carga(team, 12);
    if (c.ultimo && c.ultimo.c.team === team) c.ultimo.puntos += vale;
    c.en = 'piso';
    this.pausaT = 1.6;
    const s = motivo ?? (c.ultimoTiro === 'fuego' ? '¡FUEGO!' : remate ? '¡REMATE!' : `¡PUNTO ${lado(team).corto}!`);
    const t = this.uiAdd(txt(this, 320, 90, s, 'fuente_titulo', 1).setDepth(8500).setTint(team === 0 ? 0x9ac8ff : 0xffa0a0));
    this.tweens.add({ targets: t, y: 74, alpha: 0, delay: 900, duration: 500, onComplete: () => t.destroy() });
    chip.blip(team === 0 ? 988 : 330, 0.25, 'sq25', 0.16, team === 0 ? 1318 : 220);
    if (team === 0) flash(this, 80);
    for (const p of this.pat) if (p.st === 'piso' && p.golpeT <= 0) p.fig.set(p.c.team === team ? 'celebrate' : 'sad', true);
    this.saca = this.d.practica ? 1 : team;
    if (!this.d.practica && this.marcador[team] >= META) this.terminar(team);
  }

  /** La pelota tocó la arena (o se fue): de qué lado cayó, o afuera. */
  private aterriza() {
    const c = this.bola;
    efecto(this, 'polvo_caer_chico', c.x, PISO);
    this.sfx('paso_piedra_0', 0.3);
    const afuera = c.x < BORDE[0] - 8 || c.x > BORDE[1] + 8;
    if (afuera && c.ultimo && !c.red) { this.punto(c.ultimo.c.team === 0 ? 1 : 0, '¡AFUERA!'); return; }
    const lado: 0 | 1 = c.x < RED_X ? 0 : 1;
    this.punto(lado === 0 ? 1 : 0, c.red ? '¡A LA RED!' : null);
  }

  // ------------------------------------------------------------------ cuadro a cuadro

  update(_t: number, dms: number) {
    const dt = this.dtJuego(dms);
    const p = this.pad.read();
    if (this.endTick(p)) { this.animar(dt); this.filterUi(); return; }
    const jugando = this.fase === 'juego' && !this.terminado;
    if (jugando) this.clock += dt;
    this.mxHumano = p.x;
    this.quietaHumano = p.x || p.pressed.jump || p.pressed.punch || p.pressed.kick || p.pressed.special ? 0 : this.quietaHumano + dt;
    this.coach?.tick(dt);
    if (this.pausaT > 0) {
      this.pausaT -= dt;
      if (this.pausaT <= 0 && !this.terminado) this.alSaque(this.saca);
    }
    const c = this.bola;
    for (const q of this.pat) {
      q.golpeT = Math.max(0, q.golpeT - dt);
      q.cool = Math.max(0, q.cool - dt);
      let mx = 0, salta = false, patada = false, pase = false, corre = false, fuego = false;
      if (jugando && this.pausaT <= 0) {
        if (q.c.human) { mx = p.x; corre = p.run; salta = p.pressed.jump; patada = p.pressed.punch; pase = p.pressed.kick; fuego = p.pressed.special && this.nek[0] >= 100; }
        else ({ mx, salta, patada, pase, fuego, corre } = this.cpu(q, dt));
      }
      // el que saca no camina con la pelota en la mano: la suelta con un golpe
      if (c.en === 'mano' && c.dueño === q) { if ((patada || pase) && q.cool <= 0) this.tocar(q, 'patada'); mx = 0; }
      else {
        if (fuego) this.tocar(q, 'fuego');
        else if (patada) this.tocar(q, 'patada');
        else if (pase) this.tocar(q, 'pase');
      }
      // moverse, sin pasar la red ni salirse
      // la arena frena
      // tu compañera corre a tu par en todos los niveles; los rivales, según el nivel
      const vel = (corre ? 150 : 100) * (q.c.human || this.pat.some((o) => o.c.human && o.c.team === q.c.team) ? 1 : ajustes().cpuVel);
      if (q.golpeT <= 0 || q.st === 'aire') q.x += mx * vel * dt;
      const lim = q.c.team === 0 ? [BORDE[0] - 14, RED_X - 10] : [RED_X + 12, BORDE[1] + 14];
      q.x = Phaser.Math.Clamp(q.x, lim[0], lim[1]);
      if (mx) q.fig.left = mx < 0;
      else if (q.golpeT <= 0) q.fig.left = q.c.team === 1;
      // pegado a la red, el salto es el bloqueo con las manos arriba (si el kit lo trae)
      if (salta && q.st === 'piso' && q.golpeT <= 0) { q.st = 'aire'; q.vz = 270; q.fig.set(Math.abs(q.x - RED_X) < 22 && q.fig.anim.has('block') ? 'block' : 'jump_rise', true).estirar(); }
      if (q.st === 'aire') {
        q.vz -= 700 * dt;
        q.z += q.vz * dt;
        if (q.z <= 0) { q.z = 0; q.vz = 0; q.st = 'piso'; q.fig.set('land', true).aplastar(); }
        else if (q.golpeT <= 0 && q.vz < 0 && q.fig.anim.name !== 'jump_fall' && q.fig.anim.name !== 'block') q.fig.set('jump_fall');
      }
      // la animación: caminar, correr o quieto, cuando no está pegando ni celebrando (moverse corta la celebración)
      if (q.st === 'piso' && q.golpeT <= 0) {
        // quieto, en guardia de vóley si el kit la trae
        // corriendo en la arena, el paso pesado de la playa (lote B7) si el kit lo trae
        const correr = q.fig.anim.has('beach_run') ? 'beach_run' : 'run';
        const quiere = mx ? (corre ? correr : 'walk') : q.fig.anim.has('vb_ready') ? 'vb_ready' : 'idle';
        const libre = ['idle', 'vb_ready', 'walk', 'run', 'beach_run'].includes(q.fig.anim.name) || q.fig.anim.done || mx !== 0;
        if (libre && q.fig.anim.name !== quiere) q.fig.set(quiere);
      }
      const ev = q.fig.step(dt, Math.abs(mx) * vel * dt);
      // en cada paso de la arena se levanta un poquito
      if (q.fig.anim.name === 'beach_run' && q.st === 'piso' && ev.some((e) => e.tipo === 'paso')) efecto(this, `polvo_correr_${talla(q.fig.celda)}`, q.x, PISO + FILA[q.fila], { flip: q.fig.left, depth: PISO + FILA[q.fila] - 0.2 })?.setTint(0xf2dcaa);
      if (this.fuegoPend?.p === q && ev.some((e) => e.tipo === 'impacto')) this.soltarFuego();
    }
    // la pelota
    if (this.fuegoPend) {
      // colgada en el aire mientras el que remata da la vuelta (si algo lo corta, sale igual al rato)
      this.fuegoPend.t += dt;
      c.z += Math.sin(this.fuegoPend.t * 20) * 0.3;
      if (this.fuegoPend.t > 1.1 || this.fuegoPend.p.fig.anim.name !== 'spike_fuego') this.soltarFuego();
    } else if (c.en === 'mano' && c.dueño) {
      const d = c.dueño;
      c.x = d.x + (d.c.team === 0 ? 9 : -9);
      c.z = 20 + Math.sin(this.time.now / 160) * 2;
    } else if (c.en === 'aire') {
      const x0 = c.x;
      c.vz -= G * dt;
      c.x += c.vx * dt;
      c.z += c.vz * dt;
      // el bloqueo: el que está saltando pegado a la red con las manos arriba la devuelve para abajo
      const cruza = (x0 < RED_X) !== (c.x < RED_X);
      const bloquea = cruza && c.z >= RED_H && c.ultimoTiro !== 'fuego' ? this.pat.find((o) => o.c.team !== (c.ultimo?.c.team ?? -1) && o.st === 'aire' && Math.abs(o.x - RED_X) < 22 && c.z < o.z + 84) : undefined;
      if (bloquea) {
        c.x = x0;
        c.vx = -c.vx * 0.6;
        c.vz = -60;
        c.ultimo = bloquea;
        c.ultimoTiro = 'patada';
        c.lado = bloquea.c.team;
        // el bloqueo no cuenta como toque: el lado que bloqueó tiene sus tres
        c.toques = 0;
        this.letrero(bloquea, '¡BLOQUEO!', 0x8ae0ff);
        this.sfx('bloqueo', 0.5);
        if (bloquea.c.human) this.bloqueos++;
      }
      // la red: si cruza por debajo, rebota y cae de este lado
      else if (cruza && c.z < RED_H && c.ultimoTiro !== 'fuego') {
        c.x = x0;
        c.vx *= -0.15;
        c.vz = Math.min(c.vz, 0);
        c.red = true;
        this.suena('red_voley', 0.5, () => this.sfx('esquiva', 0.3));
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
    const r = { mx: 0, salta: false, patada: false, pase: false, fuego: false, corre: false };
    const c = this.bola, team = q.c.team;
    q.pensar -= dt;
    // los errores: más en los niveles fáciles; y si la persona va perdiendo por mucho, un poco más
    const dif = this.marcador[1] - this.marcador[0];
    // tu compañera es confiable en todos los niveles: los errores fáciles son de los rivales
    const conmigo = this.pat.some((o) => o.c.human && o.c.team === team);
    const error = this.d.practica ? 0 : conmigo ? 0.02 : Phaser.Math.Clamp(0.5 - 0.36 * ajustes().cpuAgresion + (dif >= 3 ? 0.12 * ajustes().ayuda : 0), 0.04, 0.6);
    if (c.en === 'mano' && c.dueño === q) { if (q.cool <= 0) r.patada = true; return r; }
    // una pelota nueva: decide de una vez si le va a pegar bien, mal o si no llega, y cuánto tarda en reaccionar
    if (c.en === 'aire' && q.plan.n !== c.n) {
      const dado = Math.random();
      const torpe = conmigo ? 0 : 1 - ajustes().cpuAgresion;
      q.plan = { n: c.n, tipo: dado < error * 0.45 ? 'falla' : dado < error ? 'mala' : 'bien', reaccion: 0.08 + torpe * 0.3 + Math.random() * 0.12, ruido: (Math.random() - 0.5) * (8 + torpe * 30) };
      // entrenando, en el último paso (ganarle un punto), a Kenji se le escapan los tiros buenos
      if (this.d.practica && this.coach?.ultimo && c.ultimo?.c.human && (c.ultimoTiro === 'remate' || Math.random() < 0.5)) q.plan.tipo = 'falla';
    }
    q.plan.reaccion = Math.max(0, q.plan.reaccion - dt);
    // a dónde va a caer, y si es de mi lado y me toca a mí (el de adelante cerca de la red, el de atrás al fondo)
    let meta = q.casa;
    const dir = team === 0 ? 1 : -1;
    const remata = this.armadaPara(q);
    if (remata) {
      // el armado es para mí: corre a donde la pelota baja a la altura del remate y salta justo a tiempo para pegarle
      // arriba (el salto tarda ~0,35 s en llegar arriba), sea de adelante o de atrás
      const pr = this.puntoRemate();
      if (pr) {
        meta = pr.x - dir * 4;
        r.corre = Math.abs(meta - q.x) > 24;
        if (q.st === 'piso' && pr.t < 0.36 && Math.abs(pr.x - q.x) < 22 && q.plan.tipo !== 'falla') r.salta = true;
      }
    } else if (c.en === 'aire') {
      const xl = this.caida();
      const mio = team === 0 ? xl < RED_X : xl >= RED_X;
      if (!mio && conmigo) {
        // la pelota está del otro lado: la compañera se para a defender la mitad de la cancha que la persona deja sola,
        // donde suelen caer los remates (no en su casa del fondo)
        const h = this.pat.find((o) => o.c.human && o.c.team === team)!;
        const medio = team === 0 ? 176 : 464;
        meta = team === 0 ? (h.x > medio ? 140 : 208) : h.x < medio ? 500 : 432;
      }
      if (mio) {
        const compas = this.pat.filter((o) => o.c.team === team);
        // va el más cerca de donde cae; pero si la tocó uno de este lado, le toca al otro (nadie la toca dos seguidas)
        const tocoUnCompa = c.ultimo?.c.team === team && c.lado === team && compas.length > 1;
        let yo = compas.length === 1 || (tocoUnCompa ? c.ultimo !== q : [...compas].sort((a, b) => Math.abs(a.x - xl) - Math.abs(b.x - xl))[0] === q);
        // cubrir a la persona: si le toca a ella pero no llega (muy lejos para el tiempo que queda, en el aire, o
        // quieta sin ir a buscarla), va la compañera. Una vez que decide cubrir esa pelota, no se arrepiente
        const h = compas.find((o) => o.c.human);
        if (!yo && h && c.ultimo !== q) {
          if (q.plan.cubre) yo = true;
          else {
            const T = this.cuandoA(30) ?? 0, falta = Math.abs(h.x - xl);
            const llega = falta <= 22 + 150 * Math.max(0, T - 0.15);
            const vaHaciaElla = this.mxHumano !== 0 && Math.sign(this.mxHumano) === Math.sign(xl - h.x);
            const pasiva = falta > 30 && !vaHaciaElla && (this.quietaHumano > 0.35 || T < 0.5);
            if (!llega || (h.st === 'aire' && falta > 30) || pasiva) { yo = true; q.plan.cubre = true; }
          }
        }
        if (yo) {
          // a dónde ir: a donde cae, salvo que venga rápida y baja (un remate): ahí se para donde la pelota pasa a la
          // altura de los brazos, que con esa velocidad queda bastante antes de donde cae
          const tb = Math.abs(c.vx) > 160 ? this.cuandoA(30) : null;
          const xb = tb !== null && tb > 0 ? c.x + c.vx * tb : xl;
          meta = xb - dir * 6 + q.plan.ruido;
          r.corre = q.plan.cubre || Math.abs(c.vx) > 160 || Math.abs(meta - q.x) > 60;
        }
        // la recibe el compañero: este sube a la red a esperar el armado (o a armarle); si la acaba de tocar él, cubre atrás
        else if (c.ultimo !== q) meta = RED_X - dir * (ATAQUE + 16);
      }
    }
    // el remate del otro: el de adelante salta a bloquear (a veces)
    if (c.en === 'aire' && c.ultimoTiro === 'remate' && c.ultimo && c.ultimo.c.team !== team && q.fila === 1 && q.st === 'piso' && Math.abs(q.x - RED_X) < 50 && Math.abs(c.x - RED_X) < 60 && q.plan.tipo === 'bien' && Math.random() < 0.04 + 0.05 * ajustes().cpuAgresion) { r.salta = true; q.quiereX = RED_X + (team === 0 ? -14 : 14); }
    if (q.pensar <= 0 && q.plan.reaccion <= 0) { q.pensar = 0.08 + Math.random() * 0.08; q.quiereX = meta + (Math.random() - 0.5) * 6; }
    const dx = q.quiereX - q.x;
    r.mx = Math.abs(dx) > 5 ? Math.sign(dx) : 0;
    // pegarle: cuando la tiene a la altura de los brazos (o saltando, arriba)
    const alto = this.alcance(q);
    // con el armado para rematar no le pega desde el piso: espera el salto (salvo que ya se le caiga)
    const esperaSalto = remata && q.st === 'piso' && alto !== null && alto > 26;
    if (alto !== null && q.golpeT <= 0 && q.plan.tipo !== 'falla' && !esperaSalto) {
      const bueno = q.st === 'aire' ? alto < 80 : alto >= 20 && alto <= 56;
      const bajando = c.vz < 0;
      if ((bueno && bajando) || alto < 14) {
        if (q.plan.tipo === 'mala') {
          // se equivoca: la toca mal y se va a la red o afuera
          this.tocar(q, 'patada', true);
        } else {
          const compa = this.pat.find((o) => o !== q && o.c.team === team);
          // los toques que van de este lado (el que viene será el siguiente)
          const van = c.lado === team ? c.toques : 0;
          // la jugada de tres toques: el que recibe se la arma al compañero junto a la red para que remate. A la
          // persona, siempre que esté lista (ella es la estrella); entre máquinas, más mientras más difícil el nivel
          // a la persona solo se le arma si está en la zona de remate y no se va de la red (quieta vale: el armado le cae encima y solo tiene que saltar)
          const humanaLista = !compa?.c.human || (Math.abs(compa.x - RED_X) <= 112 && compa.st === 'piso' && Math.sign(this.mxHumano) !== -dir);
          const armar = !!compa && van <= 1 && !remata && humanaLista && (compa.c.human || Math.random() < 0.3 + 0.5 * ajustes().cpuAgresion);
          // la barra de tu lado es tuya: tu compañera no gasta el fuego
          if (this.nek[team] >= 100 && !this.d.practica && !conmigo && (q.st === 'aire' || van >= 1) && Math.random() < 0.6) r.fuego = true;
          else if (armar && q.st === 'piso') r.pase = true; else r.patada = true;
        }
      }
    }
    return r;
  }

  // ------------------------------------------------------------------ entrenamiento

  private pasos(): Paso[] {
    return [
      { texto: 'EL CÍRCULO AMARILLO DICE DÓNDE CAE:\nPÁRATE AHÍ CON {MOVER}', botones: ['stick'], listo: () => this.llego },
      { texto: 'CUANDO BAJE A TUS MANOS,\n{PUÑO} LA PASA AL OTRO LADO', botones: ['punch'], listo: () => this.pasadas >= 1 },
      { texto: '¡ESO! PÁSALA 3 VECES MÁS', botones: ['stick', 'punch'], listo: () => this.pasadas >= 4 },
      { texto: '{PATADA} LA LEVANTA ALTA. LUEGO, CERCA DE\nLA RED, {SALTO} Y {PUÑO}: ¡EL REMATE!', botones: ['kick', 'jump', 'punch'], listo: () => this.remates >= 1 },
      { texto: `AHORA GÁNALE UN PUNTO A ${this.rivalEntrenoNombre}`, botones: ['stick', 'punch', 'jump'], listo: () => this.marcador[0] >= 1 },
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
    for (const q of this.pat) {
      const y = PISO + FILA[q.fila];
      q.fig.setPosition(Math.round(q.x), Math.round(y - q.z)).setDepth(y);
      q.sombra.setPosition(Math.round(q.x), y).setScale(Math.max(0.5, 1 - q.z / 80)).setDepth(y - 1);
    }
    // la pelota, girando
    const fila = c.dueño ? FILA[c.dueño.fila] : 0;
    c.spr.setPosition(Math.round(c.x), Math.round(PISO + fila - c.z)).setVisible(c.en !== 'piso' || this.pausaT > 0);
    if (c.en === 'aire') c.spr.setRotation(c.spr.rotation + (c.vx > 0 ? 0.25 : -0.25));
    // el remate de fuego: la pelota achatada y en llamas, como en Súper Campeones
    tiroSuper(this, c.spr, c.en === 'aire' && c.ultimoTiro === 'fuego');
    c.rastro.emitting = c.en === 'aire';
    c.fuego.emitting = c.en === 'aire' && c.ultimoTiro === 'fuego';
    this.halo.setPosition(c.spr.x, c.spr.y).setVisible(c.spr.visible).setScale(c.spr.scaleX / 1.2);
    c.sombra.setPosition(Math.round(c.x), PISO).setScale(Math.max(0.4, 1 - c.z / 140)).setVisible(c.en !== 'piso');
    // el círculo: dónde va a caer, cuando viene a tu lado (en Nekketsu no hay ayuda)
    const xl = this.caida();
    const ayuda = ajustes().nombre !== 'NEKKETSU' || !!this.d.practica;
    // con el armado para ti, el círculo naranja dice dónde saltar a rematar
    const me0 = this.pat.find((q) => q.c.human);
    const pr = me0 && this.paraRematar(me0) ? this.puntoRemate() : null;
    if (pr) c.marca.setVisible(ayuda).setPosition(Math.round(pr.x), PISO).setStrokeStyle(2, 0xff8020, 1);
    else c.marca.setVisible(ayuda && c.en === 'aire' && xl < RED_X && xl > BORDE[0] - 10).setPosition(Math.round(xl), PISO).setStrokeStyle(2, 0xffe040, 0.9);
    // la cámara sigue la pelota, sin perder a la persona
    const me = this.pat.find((q) => q.c.human) ?? this.pat[0];
    const cam = this.cameras.main;
    const cur = cam.midPoint.x || 320;
    const tx = c.en === 'aire' ? (c.x * 0.6 + me.x * 0.4) : me.x;
    cam.centerOn(cur + (tx - cur) * 0.07, this.camY);
    // marcador
    this.scoreTxt.setText(`${this.marcador[0]} - ${this.marcador[1]}`);
    const llena = this.nek[0] >= 100 ? ' · {ESPECIAL}: ¡FUEGO!' : '';
    this.toqueTxt.setY(42).setText(rotular(c.en === 'aire' && c.lado === 0 && c.toques > 0 && c.ultimo?.c.team === 0 ? `TOQUE ${c.toques} DE 3${llena}` : c.en === 'mano' && c.dueño?.c.human ? '{PUÑO}: SACAR' : llena.slice(3), this.pad.fuente));
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
  private letrero(p: Voleador, s: string, color: number) {
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
        .map((q) => ({ c: q.c, valor: `${q.puntos} PUNTOS` }));
      this.resultados(prueba('Voley').nombre, orden);
    });
  }
}
