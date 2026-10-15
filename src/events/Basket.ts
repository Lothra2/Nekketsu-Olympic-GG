import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { pelotaKit } from '../core/kit';
import { ajustes } from '../core/nivel';
import { hayFx, efecto } from '../core/fx';
import { txt, flash } from '../core/ui';
import { MarcadorPartido } from '../core/interfaz';
import { rotular } from '../core/input';
import { Painter, hex } from '../gfx/paint';
import { EventScene, prueba, type Competidor } from './base';
import { queueEscenario } from './escenario';
import { nuestros, ellos, lado } from '../core/equipos';
import type { Paso } from '../core/coach';
import type { Pad } from '../core/input';

/** la media cancha, vista inclinada como la pelea: px = x + K * y, py = FT + y - z */
const FT = 212;
const K = 0.35;
const PROF = 104;
const X0 = 40, X1 = 596;
/** el aro: dónde está y a qué altura; el tablero va detrás */
const ARO = { x: 566, y: 52, z: 58 };
/** el arco de los 2 puntos (en x, con la profundidad achatada) */
const ARCO = 150;
/** desde dónde sale la clavada (con el balón, saltando); corriendo, de más lejos */
const ALCANCE_CLAVADA = 84;
const ALCANCE_VUELO = 124;
/** pasando esta x hacia atrás, el equipo que recuperó el balón ya lo "sacó" */
const LIMPIA_X = 400;
const G = 420;
const META = 11;
const TIEMPO = 180;

interface Jug {
  id: string; team: 0 | 1; fig: Figura; sombra: Phaser.GameObjects.Ellipse;
  x: number; y: number; z: number; vz: number; dir: 1 | -1;
  st: 'libre' | 'tira' | 'caido';
  t: number; puntos: number; carga: number; cargando: boolean; empuja: number;
  /** después de aguantar un empujón, un ratico en que no lo tumban */
  aguanta: number;
  /** la máquina: cuándo decide y adónde va */
  ia: { t: number; tx: number; ty: number };
}
interface Tiro { entra: boolean; valor: number; x0: number; y0: number; z0: number; t: number; tt: number; tirador: Jug; clavada: boolean; nekketsu: boolean; taponIntentado: boolean; tapa?: Jug | null }
interface Balon {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  dueño: Jug | null; tiro: Tiro | null; libre: number; ultimo: Jug | null;
  fuego: Phaser.GameObjects.Particles.ParticleEmitter;
  /** a quién va el pase: los demás solo lo cortan si están justo en el camino */
  para: Jug | null;
  spr: Phaser.GameObjects.Image; sombra: Phaser.GameObjects.Ellipse;
}

/**
 * Básquet 3x3 en Maracaibo, de noche, con el puente iluminado y los relámpagos del Catatumbo que alumbran la cancha.
 * 3 contra 3 a media cancha. Mantén patada para cargar el tiro y suéltala en lo verde. Salto con el balón cerca del
 * aro es la clavada (corriendo, de más lejos: vuela). Puño pasa. Sin el balón, puño le roba al que lo tiene (aquí los
 * golpes valen) y salto tapa. La barra Nekketsu se llena tirando, encestando, robando y tapando; llena, especial es
 * el súper golpe: con el balón cerca del aro, la clavada que rompe el tablero; de lejos, el tiro de fuego que no
 * falla; sin el balón, la tacleada que lo arranca. Adentro del arco vale 1 y afuera 2. Gana el primero a 11 (o el
 * que va arriba a los 3 minutos).
 */
export class Basket extends EventScene {
  private js: Jug[] = [];
  private bola!: Balon;
  private ctrl: Jug | null = null;
  private puntos: [number, number] = [0, 0];
  private nek: [number, number] = [0, 0];
  /** el equipo que tiene la posesión y si ya la sacó detrás del arco */
  private ataca: 0 | 1 = 0;
  private limpia = true;
  private clock = 0;
  private oro = false;
  private pausa = 0;
  private rayoT = 10;
  private tablero!: Phaser.GameObjects.Graphics;
  private roto = 0;
  private hud!: Phaser.GameObjects.Graphics;
  private marcadorTxt!: MarcadorPartido;
  private relojTxt!: Phaser.GameObjects.BitmapText;
  private avisoTxt!: Phaser.GameObjects.BitmapText;
  private flecha!: Phaser.GameObjects.Triangle;
  private barra!: Phaser.GameObjects.Graphics;
  /** entrenamiento */
  private paso = 0;
  private canastas = 0;
  private clavadas = 0;
  private robos = 0;
  /** para medir: posesiones, tiros, canastas, empujones que tumban y tapones de cada equipo */
  stats = { posesiones: [0, 0], tiros: [0, 0], canastas: [0, 0], tumbadas: [0, 0], tapones: [0, 0] };

  constructor() { super('Basket'); }

  preload() { super.preload(); queueEscenario(this, 'cancha_maracaibo'); }

  create() {
    this.js = [];
    this.ctrl = null;
    this.puntos = [0, 0];
    this.nek = [0, 0];
    this.clock = 0;
    this.oro = false;
    this.pausa = 0;
    this.rayoT = 10;
    this.roto = 0;
    this.paso = this.canastas = this.clavadas = this.robos = 0;
    this.stats = { posesiones: [0, 0], tiros: [0, 0], canastas: [0, 0], tumbadas: [0, 0], tapones: [0, 0] };
    this.setup(1, 640);
    this.texturas();
    this.escenario('cancha_maracaibo', 'bg_cancha_maracaibo');
    this.cancha();
    this.armarEquipos();
    // la pelota del kit (lote SP2), del tamaño de los atletas; si no llegó, la pintada por código
    const pk = pelotaKit(this, 'balon_basket');
    const spr = (pk ? this.add.image(0, 0, 'pelotas', pk) : this.add.image(0, 0, 'balon_basket').setScale(1.2));
    const sombra = this.add.ellipse(0, 0, 9, 3, 0x000000, 0.3);
    // el fuego del tiro Nekketsu
    const fuego = this.add.particles(0, 0, 'px', { lifespan: 300, scale: { start: 1.4, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [0xffe040, 0xff6020, 0xffffff], frequency: 14, emitting: false }).setDepth(6499);
    fuego.startFollow(spr);
    this.bola = { x: 300, y: PROF / 2, z: 0, vx: 0, vy: 0, vz: 0, dueño: null, tiro: null, libre: 0, ultimo: null, para: null, spr, sombra, fuego };
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    // el marcador de TV del kit, con el nombre de cada equipo a su lado
    this.marcadorTxt = new MarcadorPartido(this, (o) => this.uiAdd(o), 320, 16, [lado(0).corto, lado(1).corto]);
    this.relojTxt = this.uiAdd(txt(this, 320, 32, '', 'fuente_ui', 1).setDepth(8001).setTint(0xffe080));
    this.avisoTxt = this.uiAdd(txt(this, 320, 330, '', 'fuente_ui', 1).setDepth(8001).setTint(0xffe080));
    this.flecha = this.add.triangle(0, 0, 0, 0, 8, 0, 4, 6, 0xffe040).setDepth(6000);
    this.barra = this.add.graphics().setDepth(6001);
    this.posesion(0, true);
    this.tema('gaita_lago');
    this.ambiente('lago_noche');
    this.cameras.main.centerOn(320, 180);
    if (this.d.practica) void this.entrenar('BÁSQUET', this.pasos(), 40);
    else void this.previa('BÁSQUET 3X3', 'MARACAIBO, VENEZUELA', 'MANTÉN {PATADA} Y SUELTA EN LO VERDE · {SALTO} CERCA DEL ARO: CLAVADA · {PUÑO} PASA O ROBA · BARRA LLENA: {ESPECIAL}');
  }

  private pasos(): Paso[] {
    return [
      { texto: 'CORRE AL BALÓN CON {MOVER}', botones: ['stick'], antes: () => { this.paso = 0; }, listo: () => this.bola.dueño === this.js[0] },
      { texto: 'MANTÉN {PATADA}: SE LLENA LA BARRA.\nSUÉLTALA EN LO VERDE. ¡ENCESTA!', botones: ['kick'], antes: () => { this.paso = 1; }, listo: () => this.canastas > 0 },
      { texto: 'CERCA DEL ARO, CON EL BALÓN,\n{SALTO}: ¡LA CLAVADA!', botones: ['stick', 'jump'], antes: () => { this.paso = 2; }, listo: () => this.clavadas > 0 },
      { texto: `AQUÍ LOS GOLPES VALEN: SIN BALÓN, PEGADO\nAL QUE LO TIENE, {PUÑO} ROBA. ¡QUÍTASELO A ${this.rivalEntrenoNombre}!`, botones: ['punch'], antes: () => { this.paso = 3; this.balonAKenji(); }, listo: () => this.robos > 0 },
    ];
  }

  private texturas() {
    if (this.textures.exists('balon_basket')) return;
    const b = new Painter(8, 8);
    b.circle(3.5, 3.5, 3.8, hex('#5a2a10'));
    b.circle(3.5, 3.5, 3.1, hex('#e8782a'));
    b.rect(0, 3, 8, 1, hex('#5a2a10')); b.rect(3, 0, 1, 8, hex('#5a2a10'));
    b.px(2, 2, hex('#f8a860'));
    this.textures.addCanvas('balon_basket', b.done());
  }

  /** Las rayas de la media cancha, el arco de los 2 puntos y el aro con su tablero. */
  private cancha() {
    const g = this.add.graphics().setDepth(FT - 20);
    const P = (x: number, y: number) => new Phaser.Math.Vector2(x + K * y, FT + y);
    const linea = (a: Phaser.Math.Vector2, b: Phaser.Math.Vector2) => g.lineBetween(a.x, a.y, b.x, b.y);
    // con el arte, el piso azul y el área naranja vienen pintados: el juego deja solo las rayas
    if (!this.arteFondo) g.fillStyle(0x2a6ab0, 0.35).fillPoints([P(X0, 0), P(X1, 0), P(X1, PROF), P(X0, PROF)], true);
    // la pintura del área
    if (!this.arteFondo) g.fillStyle(0xe8782a, 0.35).fillPoints([P(ARO.x - 70, ARO.y - 20), P(X1, ARO.y - 20), P(X1, ARO.y + 20), P(ARO.x - 70, ARO.y + 20)], true);
    g.lineStyle(2, 0xf4f4ec, 0.85);
    linea(P(X0, 0), P(X1, 0)); linea(P(X0, PROF), P(X1, PROF)); linea(P(X0, 0), P(X0, PROF)); linea(P(X1, 0), P(X1, PROF));
    // el arco de los 2 puntos
    let prev: Phaser.Math.Vector2 | null = null;
    for (let a = -Math.PI / 2; a <= Math.PI / 2 + 0.01; a += 0.1) {
      const x = ARO.x - Math.cos(a) * ARCO, y = ARO.y + Math.sin(a) * ARCO / 1.6;
      const q = P(x, Phaser.Math.Clamp(y, 0, PROF));
      if (prev) linea(prev, q);
      prev = q;
    }
    // el aro, el tablero y el poste
    this.tablero = this.add.graphics().setDepth(FT + ARO.y - 1);
    this.dibujarTablero();
  }

  private dibujarTablero() {
    const t = this.tablero;
    t.clear();
    const px = ARO.x + 12 + K * ARO.y, py = FT + ARO.y;
    t.fillStyle(0x3a3a44).fillRect(px + 4, py - 90, 4, 90);
    if (this.roto > 0) {
      // el tablero roto: el marco y los vidrios en el piso
      t.lineStyle(1, 0xc8d8e8).strokeRect(px - 4, py - 84, 6, 30);
    } else {
      t.fillStyle(0xf4f8ff, 0.85).fillRect(px - 4, py - 84, 6, 30);
      t.lineStyle(1, 0xd02a2a).strokeRect(px - 3, py - 74, 4, 10);
    }
    t.lineStyle(2, 0xff6020).strokeEllipse(ARO.x + K * ARO.y, FT + ARO.y - ARO.z, 14, 4);
    t.lineStyle(1, 0xf4f4f4, 0.7);
    for (let k = -2; k <= 2; k++) t.lineBetween(ARO.x + K * ARO.y + k * 3, FT + ARO.y - ARO.z + 1, ARO.x + K * ARO.y + k * 2, FT + ARO.y - ARO.z + 9);
  }

  private armarEquipos() {
    const yo = this.d.jugador;
    let fam: string[], inst: string[];
    if (this.d.practica) { fam = [yo, nuestros().find((f) => f !== yo)!]; inst = [ellos()[0]]; }
    else {
      const comp = this.gente[1].id;
      fam = [yo, comp, nuestros().find((f) => f !== yo && f !== comp)!];
      const elegidos = [this.gente[2].id, this.gente[3].id];
      inst = [...elegidos, ellos().find((i) => !elegidos.includes(i))!];
    }
    const poner = (ids: string[], team: 0 | 1) => ids.forEach((id) => {
      const fig = new Figura(this, 0, 0, id, 'idle');
      const sombra = this.add.ellipse(0, 0, 18, 5, 0x000000, 0.3);
      const casa = team === 0 ? 360 : 470;
      this.js.push({ id, team, fig, sombra, x: casa, y: PROF / 2, z: 0, vz: 0, dir: 1, st: 'libre', t: 0, puntos: 0, carga: 0, cargando: false, empuja: 0, aguanta: 0, ia: { t: Math.random(), tx: casa, ty: PROF / 2 } });
    });
    poner(fam, 0);
    poner(inst, 1);
  }

  /** Cambia la posesión. `arriba`: el balón empieza arriba, detrás del arco, con todos en su sitio. */
  private posesion(team: 0 | 1, arriba: boolean) {
    this.ataca = team;
    this.stats.posesiones[team]++;
    this.limpia = true;
    if (!arriba) return;
    const at = this.js.filter((j) => j.team === team), de = this.js.filter((j) => j.team !== team);
    at.forEach((j, k) => { j.x = [380, 430, 430][k] ?? 400; j.y = [PROF / 2, 20, PROF - 20][k] ?? 50; j.st = 'libre'; j.z = 0; });
    de.forEach((j, k) => { j.x = [470, 500, 500][k] ?? 480; j.y = [PROF / 2, 26, PROF - 26][k] ?? 50; j.st = 'libre'; j.z = 0; });
    const b = this.bola;
    b.tiro = null; b.vx = b.vy = b.vz = 0;
    if (this.d.practica) { b.dueño = null; b.x = 330; b.y = PROF / 2; b.z = 0; if (this.paso === 3) this.balonAKenji(); return; }
    b.dueño = at[0];
  }

  /** Entrenando, para practicar el empujón: Kenji tiene el balón y se queda quieto, botándolo. */
  private balonAKenji() {
    const k = this.js.find((j) => j.team === 1);
    if (!k) return;
    k.x = 420; k.y = PROF / 2; k.ia.tx = 420; k.ia.ty = PROF / 2;
    const b = this.bola;
    b.dueño = k; b.tiro = null;
    this.ataca = 1;
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    const p = this.pad.read();
    if (this.endTick(p)) { for (const j of this.js) j.fig.step(dt); this.pintar(); this.filterUi(); return; }
    if (this.fase === 'juego') this.tick(dt, p);
    else for (const j of this.js) j.fig.step(dt);
    this.pintar();
    this.coach?.tick(dt);
    this.drawHud();
    this.filterUi();
  }

  private tick(dt: number, p: Pad) {
    this.relampago(dt);
    if (this.roto > 0) { this.roto -= dt; if (this.roto <= 0) this.dibujarTablero(); }
    if (this.pausa > 0) {
      this.pausa -= dt;
      for (const j of this.js) j.fig.step(dt);
      this.moverBola(dt);
      if (this.pausa <= 0) this.posesion(this.ataca, true);
      return;
    }
    if (!this.d.practica) {
      this.clock += dt;
      if (this.clock >= TIEMPO && !this.oro) {
        if (this.puntos[0] !== this.puntos[1]) { this.fin(this.puntos[0] > this.puntos[1] ? 0 : 1); return; }
        this.oro = true;
        void this.banner('¡CANASTA DE ORO!', 'fuente_titulo', 2, 1000);
      }
    }
    this.avisoT = Math.max(0, this.avisoT - dt);
    this.ctrl = this.control();
    for (const j of this.js) this.jugador(j, dt, p);
    this.moverBola(dt);
    // el que recuperó el balón lo tiene que sacar detrás del arco
    const d = this.bola.dueño;
    if (d && d.team === this.ataca && !this.limpia && d.x < LIMPIA_X) this.limpia = true;
    this.consejo();
  }

  /** Los relámpagos del Catatumbo: cada tanto alumbran la cancha. */
  private relampago(dt: number) {
    this.rayoT -= dt;
    if (this.rayoT > 0) return;
    this.rayoT = 9 + Math.random() * 9;
    // el relámpago del cielo (rayo_cielo) le cae al aro o al tablero, unos pixeles corrido cada vez; el destello de
    // la cámara, en el golpe (cuadro 2). Sin él, el de lado del Catatumbo en el cielo, como antes
    if (hayFx('rayo_cielo')) {
      const px = ARO.x + K * ARO.y, py = FT + ARO.y;
      const tablero = Math.random() < 0.5;
      const x = (tablero ? px + 12 : px) + Phaser.Math.Between(-5, 5), y = tablero ? py - 84 : py - ARO.z;
      efecto(this, 'rayo_cielo', x, y, { depth: FT + ARO.y + 0.5 });
      this.time.delayedCall(125, () => { this.cameras.main.flash(120, 200, 180, 255); this.suena('critico', 0.25); });
      this.time.delayedCall(265, () => this.cameras.main.flash(80, 160, 140, 230));
      return;
    }
    const x = Phaser.Math.Between(60, 580);
    efecto(this, 'rayo_catatumbo', x, 70, { depth: -9 });
    this.cameras.main.flash(120, 200, 180, 255);
    this.time.delayedCall(140, () => this.cameras.main.flash(80, 160, 140, 230));
  }

  private control(): Jug | null {
    const b = this.bola;
    if (b.dueño?.team === 0) return b.dueño;
    const mios = this.js.filter((j) => j.team === 0 && j.st !== 'caido');
    const cerca = mios.sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))[0] ?? null;
    const prev = this.ctrl;
    if (prev && cerca && prev !== cerca && prev.st !== 'caido' && Math.hypot(prev.x - b.x, prev.y - b.y) < Math.hypot(cerca.x - b.x, cerca.y - b.y) + 24) return prev;
    return cerca;
  }

  private dAro(j: { x: number; y: number }) { return Math.hypot(ARO.x - j.x, (ARO.y - j.y) * 1.6); }

  private jugador(j: Jug, dt: number, p: Pad) {
    j.t -= dt;
    j.empuja = Math.max(0, j.empuja - dt);
    j.aguanta = Math.max(0, j.aguanta - dt);
    if (j.z > 0 || j.vz) { j.vz -= 640 * dt; j.z += j.vz * dt; if (j.z <= 0) { j.z = 0; j.vz = 0; if (j.st === 'tira') j.st = 'libre'; } }
    if (j.st === 'caido') { j.fig.step(dt); if (j.t <= 0) j.st = 'libre'; return; }
    let vx = 0, vy = 0;
    if (j === this.ctrl) [vx, vy] = this.humano(j, p, dt);
    else [vx, vy] = this.maquina(j, dt);
    // el que empuja se queda plantado un momento
    if (j.z === 0 && j.st === 'libre' && j.empuja <= 0.45) {
      j.x = Phaser.Math.Clamp(j.x + vx * dt, X0 + 4, X1 - 8);
      j.y = Phaser.Math.Clamp(j.y + vy * dt, 2, PROF - 2);
    }
    if (Math.abs(vx) > 10) j.dir = vx > 0 ? 1 : -1;
    const v = Math.hypot(vx, vy);
    // la tacleada en plancha (lote B7H8) sigue hasta el final: antes el puño del empujón la pisaba al cuadro siguiente
    const plancha = j.fig.anim.name === 'tackle_nekketsu' && !j.fig.anim.done;
    if (plancha) { /* sigue */ }
    else if (j.z > 0) {
      // el tiro y la clavada del kit siguen hasta el final; sin ellos, el lanzamiento de la pelea
      if (j.st !== 'tira') j.fig.set(j.vz > 0 ? 'jump_rise' : 'jump_fall');
      else if (!['shoot', 'dunk', 'dunk_big'].includes(j.fig.anim.name)) j.fig.set('throw_overhead');
    } else if (j.empuja > 0.5) j.fig.set('punch');
    // parado con el balón, botándolo (el dribble del kit); corriendo, el balón bota a la par
    else if (v <= 8 && this.bola.dueño === j && j.fig.anim.has('dribble')) j.fig.set('dribble');
    else j.fig.set(v > 8 ? (v > 100 ? 'run' : 'walk') : 'idle');
    const ev = j.fig.step(dt, v > 8 && !plancha ? v * dt : undefined);
    if (this.bola.dueño === j && ev.some((e) => e.tipo === 'bote')) this.suena('rebote_balon', 0.2);
    // la clavada Nekketsu rompe el tablero justo en el impacto, cuando la mano llega al aro
    if (j.fig.anim.name === 'dunk_big' && ev.some((e) => e.tipo === 'impacto') && this.roto <= 0) this.romperTablero(j);
  }

  /** Lo que haces tú con el que manejas: cargar el tiro, clavar, pasar o empujar. */
  private humano(j: Jug, p: Pad, dt: number): [number, number] {
    const b = this.bola;
    const vel = p.run ? 130 : 95;
    if (b.dueño === j) {
      // el súper golpe: cerca del aro, la clavada que rompe el tablero; de lejos, el tiro de fuego
      if (p.pressed.special && this.nek[0] >= 100) { if (this.dAro(j) < ALCANCE_CLAVADA) this.clavar(j, true); else this.tiroFuego(j); return [0, 0]; }
      if (p.pressed.special) this.aviso('¡LLENA LA BARRA: TIRA, ENCESTA, ROBA!', 1.2);
      // corriendo, la clavada sale de más lejos: vuela
      if (p.pressed.jump && this.dAro(j) < (p.run ? ALCANCE_VUELO : ALCANCE_CLAVADA)) { this.clavar(j, false); return [0, 0]; }
      if (p.pressed.punch) { this.pasar(j); return [0, 0]; }
      // el tiro: mientras mantienes patada la barra se llena y vuelve a bajar; al soltar, tira
      if (p.held.kick) { j.cargando = true; j.carga = (j.carga + dt * 1.25) % 2; return [0, 0]; }
      if (j.cargando) { j.cargando = false; const c = j.carga > 1 ? 2 - j.carga : j.carga; j.carga = 0; this.tirar(j, c); return [0, 0]; }
    } else {
      j.cargando = false;
      if (p.pressed.special && this.nek[0] >= 100 && b.dueño && b.dueño.team !== j.team) this.tacleada(j, b.dueño);
      else if (p.pressed.punch) this.robar(j, p.run);
      if (p.pressed.jump && j.z === 0) { j.vz = 230; this.tapon(j); }
    }
    return [p.x * vel, p.y * vel * 0.75];
  }

  /** La máquina: el que tiene el balón lo saca, avanza, tira, clava o pasa; los demás se abren o marcan a su hombre. */
  private maquina(j: Jug, dt: number): [number, number] {
    const b = this.bola;
    j.ia.t -= dt;
    const ag = this.d.practica ? 0.1 : ajustes().cpuAgresion;
    const vel = 100 * (j.team === 1 ? Math.max(ajustes().cpuVel, 0.82) : 1) * (this.d.practica ? 0.6 : 1);
    const ir = (tx: number, ty: number, v: number): [number, number] => {
      const dx = tx - j.x, dy = ty - j.y, d = Math.hypot(dx, dy);
      return d < 4 ? [0, 0] : [(dx / d) * v, (dy / d) * v];
    };
    if (b.dueño === j) {
      if (this.d.practica) return [0, 0];
      if (!this.limpia) return ir(LIMPIA_X - 20, PROF / 2, vel);
      const d = this.dAro(j);
      const marca = this.js.filter((o) => o.team !== j.team && o.st !== 'caido').sort((a, c) => Math.hypot(a.x - j.x, a.y - j.y) - Math.hypot(c.x - j.x, c.y - j.y))[0];
      const dMarca = marca ? Math.hypot(marca.x - j.x, marca.y - j.y) : 999;
      const marcado = dMarca < 20;
      // apretado, decide más rápido (pasar o tirar antes de que se la roben)
      if (dMarca < 30 && j.ia.t > 0.3 && j.empuja <= 0) j.ia.t = 0.15 + Math.random() * 0.2;
      if (j.ia.t <= 0) {
        j.ia.t = 0.5 + Math.random() * 0.6;
        if (d < 70 && this.nek[j.team] >= 100) { this.clavar(j, true); return [0, 0]; }
        if (d >= 70 && d < 200 && this.nek[j.team] >= 100 && Math.random() < 0.5) { this.tiroFuego(j); return [0, 0]; }
        if (d < 50 && Math.random() < 0.7) { this.clavar(j, false); return [0, 0]; }
        // tira cerca del aro aunque lo marquen (casi siempre), o de lejos si está solo (a veces);
        // la máquina suelta en lo verde más o menos seguido según el nivel
        const tira = d < 110 ? Math.random() < 0.75 : d < 170 && !marcado && Math.random() < 0.3;
        if (!tira && dMarca < 30 && Math.random() < 0.55) { this.pasar(j); return [0, 0]; }
        if (tira) { this.tirar(j, Math.random() < 0.35 + 0.4 * ag ? 0.83 : 0.4 + Math.random() * 0.3); return [0, 0]; }
      }
      // con alguien encima, se le abre de lado (bota protegiendo el balón)
      if (marca && dMarca < 30) {
        const lado = j.y < marca.y ? -1 : 1;
        return ir(Math.min(ARO.x - 30, j.x + 20), Phaser.Math.Clamp(j.y + lado * 40, 4, PROF - 4), vel);
      }
      return ir(ARO.x - 30, ARO.y + Math.sin(this.clock + j.x) * 20, vel * 0.9);
    }
    // entrenando, Kenji no persigue el balón
    if (this.d.practica && j.team === 1) return ir(j.ia.tx, j.ia.ty, 30);
    // el balón suelto: va el más cerca de cada equipo
    if (!b.dueño && !b.tiro) {
      const mios = this.js.filter((o) => o.team === j.team && o !== this.ctrl && o.st === 'libre');
      const cerca = mios.sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))[0];
      if (cerca === j) return ir(b.x, b.y, vel);
    }
    const atacamos = b.dueño ? b.dueño.team === j.team : this.ataca === j.team;
    if (this.d.practica) return ir(j.ia.tx, j.ia.ty, 30);
    if (atacamos) {
      // se abren: uno en cada esquina cerca del aro, otro afuera del arco
      if (j.ia.t <= 0) {
        j.ia.t = 1 + Math.random();
        const sitios: [number, number][] = [[ARO.x - 60, 14], [ARO.x - 60, PROF - 14], [ARO.x - 150, PROF / 2 + Phaser.Math.Between(-30, 30)]];
        [j.ia.tx, j.ia.ty] = sitios[Phaser.Math.Between(0, 2)];
      }
      return ir(j.ia.tx, j.ia.ty, vel * 0.8);
    }
    // defendemos: cada uno con su hombre, entre él y el aro; al que tiene el balón, se le empuja
    const rivales = this.js.filter((o) => o.team !== j.team);
    const mi = this.js.filter((o) => o.team === j.team).indexOf(j);
    const hombre = b.dueño && b.dueño.team !== j.team && this.js.filter((o) => o.team === j.team).sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))[0] === j ? b.dueño : rivales[mi % rivales.length];
    if (hombre === b.dueño && this.nek[j.team] >= 100 && Math.hypot(hombre.x - j.x, hombre.y - j.y) < 60 && Math.random() < dt * 0.8) this.tacleada(j, hombre);
    else if (hombre === b.dueño && Math.hypot(hombre.x - j.x, hombre.y - j.y) < 18 && j.empuja <= 0 && Math.random() < dt * (0.6 + 1.2 * ag)) this.empujar(j);
    // el tapón: se intenta una sola vez por tiro
    if (b.tiro && !b.tiro.taponIntentado && b.tiro.tirador === hombre && Math.hypot(hombre.x - j.x, hombre.y - j.y) < 26 && j.z === 0) {
      b.tiro.taponIntentado = true;
      if (Math.random() < 0.15 + 0.2 * ag) { j.vz = 230; this.tapon(j); }
    }
    const tx = hombre.x + (ARO.x - hombre.x) * 0.18, ty = hombre.y + (ARO.y - hombre.y) * 0.18;
    return ir(tx, ty, vel);
  }

  /** El tiro: se decide al soltar, con la distancia, la barra (`calidad` 0 a 1) y si te están marcando. */
  private tirar(j: Jug, calidad: number) {
    if (!this.limpia && j.team === 1) return;
    const d = this.dAro(j);
    const base = d < 60 ? 0.78 : d < ARCO ? 0.58 : 0.4;
    const marcado = this.js.some((o) => o.team !== j.team && Math.hypot(o.x - j.x, o.y - j.y) < 20);
    const verde = calidad > 0.72 && calidad < 0.94;
    let prob = base * (0.35 + 0.65 * (verde ? 1 : calidad * 0.8)) * (marcado ? 0.65 : 1);
    if (j.team === 0 && ajustes().nombre === 'PASEO') prob += 0.15;
    if (this.d.practica) prob = verde ? 1 : prob + 0.2;
    j.st = 'tira'; j.vz = 170;
    j.fig.contacto('shoot', 'throw_overhead');
    this.lanzarTiro(j, Math.random() < prob, d >= ARCO ? 2 : 1, false);
    if (j.team === 0 && verde) this.letrero(j, '¡VERDE!', 0x8aff8a);
  }

  /** La clavada: salta al aro. La Nekketsu rompe el tablero y vale 2. */
  private clavar(j: Jug, nekketsu: boolean) {
    if (!this.limpia && j.team === 1) return;
    j.st = 'tira'; j.vz = 300;
    // la clavada del kit desde el despegue: se ve el salto y el golpe al aro mientras vuela hasta él
    // con la barra llena, la clavada grande (lote B7H8), que rompe el tablero en su impacto
    if (j.fig.anim.play(nekketsu && j.fig.anim.has('dunk_big') ? 'dunk_big' : 'dunk', true)) { j.fig.anim.pos = Math.max(0, j.fig.cuadroDe('despegue')); j.fig.refresh(); }
    else j.fig.set('throw_overhead', true);
    if (nekketsu) {
      this.nek[j.team] = 0;
      efecto(this, 'aura_nekketsu', this.sx(j.x, j.y), FT + j.y, { depth: FT + j.y - 0.1 });
      if (j.team === 0) void this.banner('¡CLAVADA NEKKETSU!', 'fuente_titulo', 2, 700);
    }
    // camina en el aire hasta el aro
    const lejos = this.dAro(j) > ALCANCE_CLAVADA;
    if (lejos) { j.vz = 360; this.letrero(j, '¡VUELA!', 0x8ae0ff); }
    this.tweens.add({ targets: j, x: ARO.x - 10, y: ARO.y, duration: lejos ? 460 : 380, ease: 'Quad.out' });
    // ¿entra? La Nekketsu siempre. La normal depende del nivel, de si vuela de lejos y de si lo marcan: el que lo
    // marca salta a taparla
    const marca = nekketsu ? undefined : this.marcaClavada(j);
    let prob = j.team === 0 ? ({ PASEO: 0.9, NORMAL: 0.74, NEKKETSU: 0.6 } as Record<string, number>)[ajustes().nombre] ?? 0.74 : 0.55 + 0.25 * ajustes().cpuAgresion;
    if (lejos) prob -= 0.15;
    if (marca) {
      prob -= j.team === 0 && ajustes().nombre === 'PASEO' ? 0.15 : 0.32;
      if (marca.z === 0) { marca.vz = 250; marca.fig.set('jump_rise', true); }
    }
    if (this.d.practica) prob = 1;
    const entra = nekketsu || Math.random() < prob;
    this.lanzarTiro(j, entra, nekketsu ? 2 : 1, true, nekketsu);
    if (!entra && this.bola.tiro) this.bola.tiro.tapa = marca ?? null;
    this.cameras.main.shake(nekketsu ? 260 : 120, nekketsu ? 0.01 : 0.004);
  }

  /** El tablero se rompe en mil pedazos (la clavada Nekketsu). */
  private romperTablero(j: Jug) {
    this.roto = 4;
    this.dibujarTablero();
    efecto(this, 'ventana_rota', ARO.x + 12 + K * ARO.y, FT + ARO.y - 70, { depth: 6000 });
    this.sound.play('romper', { volume: 0.7 });
    flash(this, 200);
    this.cameras.main.shake(300, 0.012);
    this.letrero(j, '¡ROMPIÓ EL TABLERO!', 0xffe040);
  }

  /** El rival que marca una clavada: pegado al que clava o parado en la pintura, de pie y libre. */
  private marcaClavada(j: Jug): Jug | undefined {
    return this.js.find((o) => o.team !== j.team && o.st === 'libre' && (Math.hypot(o.x - j.x, o.y - j.y) < 34 || Math.hypot(o.x - (ARO.x - 10), o.y - ARO.y) < 30));
  }

  private lanzarTiro(j: Jug, entra: boolean, valor: number, clavada: boolean, nekketsu = false) {
    const b = this.bola;
    b.dueño = null;
    b.ultimo = j;
    b.tiro = { entra, valor, x0: j.x, y0: j.y, z0: 30, t: 0, tt: clavada ? 0.4 : 0.55 + this.dAro(j) / 500, tirador: j, clavada, nekketsu, taponIntentado: false };
    if (!nekketsu) this.carga(j.team, 8);
    this.stats.tiros[j.team]++;
    this.sound.play('esquiva', { volume: 0.3, rate: 1.2 });
  }

  /** El pase al compañero más despejado. */
  private pasar(j: Jug) {
    const b = this.bola;
    const compas = this.js.filter((o) => o.team === j.team && o !== j && o.st !== 'caido');
    const despejado = (o: Jug) => Math.min(...this.js.filter((r) => r.team !== j.team).map((r) => Math.hypot(r.x - o.x, r.y - o.y)));
    const para = compas.sort((a, c) => despejado(c) - despejado(a))[0];
    if (!para) return;
    const d = Math.hypot(para.x - b.x, para.y - b.y), t = Math.max(0.25, d / 260);
    b.dueño = null; b.tiro = null; b.ultimo = j; b.para = para;
    b.x = j.x; b.y = j.y; b.z = 20;
    b.vx = (para.x - b.x) / t; b.vy = (para.y - b.y) / t; b.vz = (G * t) / 2 - 10;
    b.libre = 0.15;
    j.fig.set('throw_overhead', true, 1.6);
  }

  /** Llena la barra Nekketsu de un equipo; al llenarse la tuya, avisa. */
  private carga(team: 0 | 1, n: number) {
    const antes = this.nek[team];
    this.nek[team] = Math.min(100, antes + n);
    if (team === 0 && antes < 100 && this.nek[0] >= 100) {
      this.letrero(this.js[0], '¡BARRA LLENA!', 0xffe040);
      this.sound.play('elegir', { volume: 0.4, rate: 1.4 });
    }
  }

  /** Lo que dice abajo: qué puedes hacer ahora mismo. */
  private consejo() {
    if (this.avisoT > 0) return;
    const c = this.ctrl, b = this.bola;
    let s = '';
    if (c && b.dueño === c) {
      if (this.nek[0] >= 100) s = this.dAro(c) < ALCANCE_CLAVADA ? '{ESPECIAL}: ¡CLAVADA NEKKETSU!' : '{ESPECIAL}: ¡TIRO DE FUEGO!';
      else if (this.dAro(c) < ALCANCE_CLAVADA) s = this.marcaClavada(c) ? '¡TE MARCAN! {PUÑO} PASA O {PATADA} TIRA' : '{SALTO}: ¡CLAVADA!';
    } else if (c && b.dueño && b.dueño.team === 1) s = this.nek[0] >= 100 ? '{ESPECIAL}: ¡TACLEADA!' : Math.hypot(b.dueño.x - c.x, b.dueño.y - c.y) < 40 ? '{PUÑO}: ¡RÓBALA!' : '';
    this.avisoTxt.setText(rotular(s, this.pad.fuente));
  }

  /** El robo: pegado al que bota el balón, puño se lo saca de las manos (corriendo, de un poco más lejos). */
  private robar(j: Jug, corriendo: boolean) {
    if (j.empuja > 0) return;
    j.empuja = 0.7;
    const b = this.bola, o = b.dueño;
    if (!o || o.team === j.team || o.z > 0 || Math.hypot(o.x - j.x, o.y - j.y) > (corriendo ? 32 : 26)) return;
    const prob = this.d.practica ? 1 : o.aguanta > 0 ? 0.1 : ajustes().nombre === 'PASEO' ? 0.65 : ajustes().nombre === 'NEKKETSU' ? 0.35 : 0.45;
    if (Math.random() > prob) { o.aguanta = 0.8; this.letrero(o, '¡AGUANTÓ!', 0xffffff); this.sound.play('bloqueo', { volume: 0.3 }); return; }
    o.st = 'caido'; o.t = 0.45; o.fig.set('stagger', true, 1.4);
    o.cargando = false;
    b.dueño = j; b.tiro = null; b.para = null; b.vx = b.vy = b.vz = 0;
    if (j.team !== this.ataca) this.cambio(j.team);
    this.stats.tumbadas[j.team]++;
    this.carga(j.team, 14);
    this.sound.play('golpe', { volume: 0.35, rate: 1.3 });
    efecto(this, 'chispa_golpe_liviano', this.sx(o.x, o.y), FT + o.y - 20, { depth: 6000 });
    this.letrero(j, '¡ROBO!', 0x8aff8a);
    if (this.d.practica) this.robos++;
  }

  /** La tacleada Nekketsu: vuela hasta el que tiene el balón, lo tumba y se lo queda. */
  private tacleada(j: Jug, o: Jug) {
    if (this.nek[j.team] < 100) return;
    this.nek[j.team] = 0;
    j.empuja = 0.9;
    efecto(this, 'aura_nekketsu', this.sx(j.x, j.y), FT + j.y, { depth: FT + j.y - 0.1 });
    // la plancha del kit (lote B7H8): vuela hasta él y el rival cae en el impacto; sin ella, la patada voladora
    const plancha = j.fig.anim.play('tackle_nekketsu', true);
    if (plancha) j.fig.refresh(); else j.fig.set('flying_kick', true, 1.3);
    const imp = plancha ? j.fig.cuadroDe('impacto') : -1;
    const llega = imp > 0 ? Math.round((imp / j.fig.anim.data.fps) * 1000) : 220;
    if (j.team === 0) void this.banner('¡TACLEADA NEKKETSU!', 'fuente_titulo', 2, 600);
    this.sound.play('esquiva', { volume: 0.5, rate: 0.8 });
    // el que tiene el balón se queda plantado mientras le llega la tacleada: ni pasa ni tira
    o.empuja = 0.6; o.ia.t = 0.5; o.cargando = false;
    j.dir = o.x >= j.x ? 1 : -1;
    this.tweens.add({
      targets: j, x: o.x - j.dir * 10, y: o.y, duration: llega, ease: 'Quad.in',
      onComplete: () => {
        if (this.fase !== 'juego' || this.bola.dueño !== o) return;
        const b = this.bola;
        o.st = 'caido'; o.t = 1.1; o.fig.set('knockout', true, 1.6); o.cargando = false;
        b.dueño = j; b.tiro = null; b.para = null; b.vx = b.vy = b.vz = 0;
        if (j.team !== this.ataca) this.cambio(j.team);
        this.stats.tumbadas[j.team]++;
        this.sound.play('golpe', { volume: 0.6 });
        efecto(this, 'chispa_golpe_pesado', this.sx(o.x, o.y), FT + o.y - 20, { depth: 6000 });
        this.cameras.main.shake(200, 0.01);
        this.letrero(o, '¡PUM!', 0xffe040);
        if (this.d.practica) this.robos++;
      },
    });
  }

  /** El tiro de fuego: de donde sea, no falla. Afuera del arco vale 2; adentro, también (es Nekketsu). */
  private tiroFuego(j: Jug) {
    if (!this.limpia && j.team === 1) return;
    this.nek[j.team] = 0;
    j.st = 'tira'; j.vz = 220;
    j.fig.contacto('shoot', 'throw_overhead');
    efecto(this, 'aura_nekketsu', this.sx(j.x, j.y), FT + j.y, { depth: FT + j.y - 0.1 });
    if (j.team === 0) void this.banner('¡TIRO DE FUEGO!', 'fuente_titulo', 2, 600);
    this.lanzarTiro(j, true, 2, false, true);
    this.cameras.main.shake(160, 0.006);
  }

  /** El empujón de la máquina: si alcanza al que tiene el balón, a veces lo tumba y se le cae. */
  private empujar(j: Jug) {
    if (j.empuja > 0) return;
    j.empuja = 0.8;
    const b = this.bola, o = b.dueño;
    if (!o || o.team === j.team || Math.hypot(o.x - j.x, o.y - j.y) > 18) return;
    const ag = ajustes().cpuAgresion;
    const tumba = this.d.practica ? 1 : o.aguanta > 0 ? 0 : j.team === 0 ? 0.35 : 0.25 + 0.2 * ag;
    if (Math.random() > tumba) { o.aguanta = 1; this.letrero(o, '¡AGUANTÓ!', 0xffffff); return; }
    o.st = 'caido'; o.t = 0.8; o.fig.set('knockout', true, 1.8);
    this.stats.tumbadas[j.team]++;
    b.dueño = null; b.x = o.x; b.y = o.y; b.z = 10; b.vx = (o.x - j.x) * 4; b.vy = (Math.random() - 0.5) * 60; b.vz = 120; b.libre = 0.25;
    this.sound.play('golpe', { volume: 0.4 });
    efecto(this, 'chispa_golpe_liviano', this.sx(o.x, o.y), FT + o.y - 20, { depth: 6000 });
    this.letrero(j, '¡EMPUJÓN!', 0xffe080);
    this.carga(j.team, 10);
    if (j.team === 0 && this.d.practica) this.robos++;
  }

  /** El tapón: saltando cerca del tirador justo cuando suelta, el tiro se va al piso. */
  private tapon(j: Jug) {
    const b = this.bola, t = b.tiro;
    if (!t || t.tirador.team === j.team || t.t > 0.15 || Math.hypot(t.tirador.x - j.x, t.tirador.y - j.y) > 26) return;
    b.tiro = null;
    b.vx = (j.x - t.tirador.x) * -3; b.vy = (Math.random() - 0.5) * 80; b.vz = 60; b.libre = 0.2;
    this.letrero(j, '¡TAPÓN!', 0x8ae0ff);
    this.stats.tapones[j.team]++;
    this.carga(j.team, 14);
    this.sound.play('bloqueo', { volume: 0.5 });
    this.cambio(j.team);
  }

  private moverBola(dt: number) {
    const b = this.bola;
    b.libre = Math.max(0, b.libre - dt);
    if (b.dueño) {
      // botando a la par del que lo lleva
      const o = b.dueño;
      b.x = o.x + o.dir * 7; b.y = o.y + 1; b.z = o.z > 0 ? o.z + 30 : Math.abs(Math.sin(this.time.now / 140)) * 14;
      return;
    }
    const t = b.tiro;
    if (t) {
      t.t += dt;
      const u = Math.min(1, t.t / t.tt);
      // de las manos al aro, en parábola (la clavada va derecha)
      const ax = ARO.x + K * 0, ay = ARO.y;
      b.x = t.x0 + (ax - t.x0) * u; b.y = t.y0 + (ay - t.y0) * u;
      b.z = t.z0 + (ARO.z + 4 - t.z0) * u + (t.clavada ? 0 : 60 * 4 * u * (1 - u));
      if (u >= 1) this.llegaAlAro(t);
      return;
    }
    b.vz -= G * dt; b.z += b.vz * dt;
    if (b.z <= 0) { b.z = 0; if (Math.abs(b.vz) > 50) this.suena('rebote_balon', Math.min(0.5, Math.abs(b.vz) / 400)); b.vz = Math.abs(b.vz) > 50 ? -b.vz * 0.6 : 0; }
    const roce = Math.pow(b.z === 0 ? 0.4 : 0.9, dt);
    b.vx *= roce; b.vy *= roce;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < X0 || b.x > X1) { b.x = Phaser.Math.Clamp(b.x, X0, X1); b.vx = -b.vx * 0.5; }
    if (b.y < 0 || b.y > PROF) { b.y = Phaser.Math.Clamp(b.y, 0, PROF); b.vy = -b.vy * 0.5; }
    if (b.libre > 0 || this.pausa > 0) return;
    // el rebote: lo agarra el que llegue (saltando, más alto)
    for (const j of this.js) {
      if (j.st === 'caido') continue;
      const alcance = b.para && j !== b.para ? 6 : 12;
      if (Math.hypot(j.x - b.x, j.y - b.y) < alcance && b.z < j.z + 30) {
        b.dueño = j; b.vx = b.vy = b.vz = 0; b.para = null;
        if (j.team !== this.ataca) this.cambio(j.team);
        j.ia.t = 0.4;
        break;
      }
    }
  }

  /** El balón llega al aro: adentro (puntos y cambio de posesión) o rebota al rebote. */
  private llegaAlAro(t: Tiro) {
    const b = this.bola;
    b.tiro = null;
    const j = t.tirador;
    if (!t.entra) {
      b.vx = -Phaser.Math.Between(40, 100); b.vy = (Math.random() - 0.5) * 110; b.vz = 140; b.libre = 0.2;
      this.suena('aro_fallo', 0.5, () => this.sound.play('golpe', { volume: 0.25, rate: 1.6 }));
      if (t.tapa) { this.letrero(t.tapa, '¡TAPÓN!', 0x8ae0ff); this.stats.tapones[t.tapa.team]++; this.carga(t.tapa.team, 14); this.sound.play('bloqueo', { volume: 0.5 }); }
      else this.letrero(null, t.clavada ? '¡SE SALIÓ!' : '¡AL ARO!', 0xffffff);
      return;
    }
    this.puntos[j.team] += t.valor;
    this.stats.canastas[j.team]++;
    j.puntos += t.valor;
    b.vx = 0; b.vy = 0; b.vz = -40;
    this.suena('aro_basket', 0.6);
    this.sound.play('elegir', { volume: 0.3 });
    this.carga(j.team, 10);
    if (t.nekketsu && !t.clavada) {
      this.letrero(j, '¡TIRO DE FUEGO!', 0xff8020);
      flash(this, 120);
      this.cameras.main.shake(200, 0.008);
    } else if (t.nekketsu) {
      // sin la clavada grande del kit el tablero se rompe al entrar
      if (this.roto <= 0) this.romperTablero(j);
    } else this.letrero(j, t.clavada ? '¡CLAVADA!' : t.valor === 2 ? '¡DE DOS!' : '¡ADENTRO!', t.valor === 2 ? 0xffe040 : 0x8aff8a);
    if (j.team === 0 && this.d.practica) { if (t.clavada) this.clavadas++; else this.canastas++; }
    for (const o of this.js) if (o.st !== 'caido') o.fig.set(o.team === j.team ? 'celebrate' : 'sad', true);
    // ¿se acabó?
    if (!this.d.practica && (this.puntos[j.team] >= META || this.oro)) { this.time.delayedCall(900, () => this.fin(j.team)); this.pausa = 99; return; }
    this.pausa = 1.4;
    this.ataca = j.team === 0 ? 1 : 0;
  }

  private cambio(team: 0 | 1) {
    if (this.ataca === team) return;
    this.ataca = team;
    this.stats.posesiones[team]++;
    // sin sacarla detrás del arco: con niños, la regla solo frenaba el juego
    this.limpia = true;
  }

  private avisoT = 0;
  private aviso(s: string, seg = 1.5) { this.avisoTxt.setText(s); this.avisoT = seg; }

  private letrero(j: Jug | null, s: string, tint: number) {
    const x = j ? this.sx(j.x, j.y) : this.sx(ARO.x, ARO.y), y = j ? FT + j.y - j.z - 58 : FT + ARO.y - ARO.z - 20;
    const t = this.add.bitmapText(x, y, 'fuente_ui', s).setOrigin(0.5).setDepth(6500).setTint(tint);
    this.tweens.add({ targets: t, y: t.y - 12, alpha: 0, delay: 600, duration: 400, onComplete: () => t.destroy() });
  }

  private sx(x: number, y: number) { return x + K * y; }

  private pintar() {
    for (const j of this.js) {
      j.fig.left = j.dir < 0;
      j.fig.row = 'right';
      j.fig.refresh();
      const x = Math.round(this.sx(j.x, j.y)), y = FT + j.y;
      j.fig.setPosition(x, Math.round(y - j.z)).setDepth(y);
      j.sombra.setPosition(x, y).setDepth(y - 0.5).setScale(Math.max(0.5, 1 - j.z / 120));
    }
    const b = this.bola;
    const sx = Math.round(this.sx(b.x, b.y));
    // el balón va delante del aro mientras baja por la red
    // botándolo parado, el balón va donde lo pone el dribble del kit
    const mano = b.dueño?.fig.anim.name === 'dribble' ? b.dueño.fig.pelota() : null;
    if (mano) b.spr.setPosition(Math.round(mano.x), Math.round(mano.y)).setDepth(b.dueño!.fig.depth + (mano.detras ? -0.1 : 0.1));
    else b.spr.setPosition(sx, Math.round(FT + b.y - b.z - 3)).setDepth(FT + b.y + 0.3);
    b.fuego.emitting = !!b.tiro?.nekketsu;
    b.sombra.setPosition(sx, FT + b.y).setDepth(FT + b.y - 0.6).setScale(Math.max(0.4, 1 - b.z / 100));
    const c = this.ctrl;
    this.flecha.setVisible(!!c && this.fase === 'juego');
    if (c) this.flecha.setPosition(Math.round(this.sx(c.x, c.y)) - 4, Math.round(FT + c.y - c.z - 54 + Math.sin(this.time.now / 120) * 2));
    // la barra del tiro: se llena mientras mantienes patada; lo verde es el tiro perfecto
    const g = this.barra;
    g.clear();
    if (c && c.cargando) {
      const v = c.carga > 1 ? 2 - c.carga : c.carga;
      const x = Math.round(this.sx(c.x, c.y)) - 14, y = Math.round(FT + c.y - c.z - 66);
      g.fillStyle(0x000000, 0.7).fillRect(x - 1, y - 1, 30, 6);
      g.fillStyle(0x3ac06a).fillRect(x + Math.round(28 * 0.72), y, Math.round(28 * 0.22), 4);
      g.fillStyle(0xffe040).fillRect(x, y + 1, Math.round(28 * v), 2);
    }
  }

  private drawHud() {
    const g = this.hud;
    g.clear();
    if (this.d.practica) { this.marcadorTxt.setVisible(false); this.relojTxt.setText(''); return; }
    this.marcadorTxt.set(this.puntos[0], this.puntos[1]);
    const q = Math.max(0, TIEMPO - this.clock);
    this.relojTxt.setText(this.oro ? '¡CANASTA DE ORO!' : `${Math.floor(q / 60)}:${String(Math.floor(q % 60)).padStart(2, '0')} · A ${META}`);
    for (const t of [0, 1] as const) {
      const x = t === 0 ? 16 : 520, lleno = this.nek[t] >= 100;
      g.fillStyle(0x000000, 0.6).fillRect(x, 10, 104, 8);
      g.fillStyle(lleno ? (Math.floor(this.time.now / 150) % 2 ? 0xffe040 : 0xff6020) : t === 0 ? 0x5a9af0 : 0xf05a5a).fillRect(x + 2, 12, this.nek[t], 4);
    }
  }

  private fin(ganador: 0 | 1) {
    if (this.fase !== 'juego') return;
    this.fase = 'fin';
    for (const j of this.js) { j.st = 'libre'; j.fig.set(j.team === ganador ? 'victory' : 'sad', true); }
    const de = (c: Competidor) => this.js.find((j) => j.id === c.id)!;
    const orden = [...this.gente].sort((a, b) => (a.team !== b.team ? (a.team === ganador ? -1 : 1) : de(b).puntos - de(a).puntos))
      .map((c) => ({ c, valor: `${de(c).puntos} PUNTOS` }));
    void this.banner(`¡${lado(ganador).gana}!`, 'fuente_titulo', 2, 1300).then(() => this.resultados(prueba('Basket').nombre, orden));
  }
}
