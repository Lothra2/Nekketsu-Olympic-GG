import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { ajustes } from '../core/nivel';
import { efecto, tiroSuper } from '../core/fx';
import { txt, flash, rafaga } from '../core/ui';
import { MarcadorPartido } from '../core/interfaz';
import { Painter, hex } from '../gfx/paint';
import { EventScene, prueba, type Competidor } from './base';
import { queueEscenario } from './escenario';
import { npcs, pelotaKit } from '../core/kit';
import { nuestros, ellos, lado } from '../core/equipos';
import type { Paso } from '../core/coach';
import type { Pad } from '../core/input';

/** la calle, vista inclinada como la pelea: px = x + K * y, py = FT + y - z */
const FT = 212;
const K = 0.35;
const PROF = 104;
/** las líneas de gol: la Familia ataca a la derecha, el Instituto a la izquierda */
const GOL = [26, 600] as const;
/** el arco: de dónde a dónde en profundidad y qué tan alto */
const ARCO = { y0: 34, y1: 70, alto: 26 };
const G = 520;
const TIEMPO = 150;

interface Jug {
  id: string; team: 0 | 1; arquero: boolean; fig: Figura; sombra: Phaser.GameObjects.Ellipse;
  x: number; y: number; z: number; vz: number; dir: 1 | -1;
  st: 'libre' | 'patea' | 'barre' | 'caido' | 'vuela' | 'tambalea';
  t: number; vx: number; vy: number; goles: number;
  /** el hombro: cuánto falta para poder volver a empujar; y el ratico en que aguanta otro empujón */
  empuja: number; aguanta: number;
  /** la máquina: cuándo decide y adónde va */
  ia: { t: number; tx: number; ty: number };
  /** la estirada del arquero con la del kit: hacia la cámara (down) o hacia el fondo (up) */
  filaVuelo?: 'down' | 'up';
}
interface Balon {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  dueño: Jug | null; ultimo: Jug | null; especial: boolean; t: number; libre: number;
  /** el arquero al que ya se le escapó este tiro: no lo puede volver a intentar */
  seEscapo: Jug | null;
  /** el pase: para quién va y si va alto (el centro para cabecear) */
  para: Jug | null; centro: boolean;
  /** el tiro al arco que va en camino: qué tan colocado (0 al medio, 1 a la esquina) y si fue de cabeza */
  tiro: { apunta: number; cabeza: boolean } | null;
  spr: Phaser.GameObjects.Image; sombra: Phaser.GameObjects.Ellipse; fuego: Phaser.GameObjects.Particles.ParticleEmitter;
}

/**
 * Fútbol Callejero en Barranquilla, en pleno Carnaval. 4 contra 4: tres en la cancha y un arquero que maneja la
 * máquina. Sin faltas: sin el balón, patada es la barrida y puño el hombro que lo roba (saltando pasas por encima de
 * la barrida). Con el balón, patada tira al arco (la flecha apunta arriba o abajo) y puño lo pasa; cerca del área, el
 * pase sale alto, de centro. En el aire, el balón que pasa cerca se cabecea. La barra se llena tirando, robando,
 * pasando, atajando y con los goles (más al que lo recibe). Con la barra llena, especial es el tiro Nekketsu.
 * Los arcos son de piedra y cada tanto una Marimonda se mete a la cancha. Dos minutos y medio, y gol de oro si hay
 * empate.
 * Con los packs de fútbol y de arquero del kit (sin el balón pintado), los tiros, los pases, la barrida, el cabezazo y
 * el arquero usan sus animaciones; sin ellos, las patadas de la pelea.
 */
export class Futbol extends EventScene {
  private js: Jug[] = [];
  private bola!: Balon;
  private ctrl: Jug | null = null;
  private goles: [number, number] = [0, 0];
  private nek: [number, number] = [0, 0];
  private clock = 0;
  private oro = false;
  private pausa = 0;
  private saque: 0 | 1 = 0;
  /** al sacar del medio, un ratico sin barridas para que el que saca pueda arrancar */
  private protegido = 0;
  private marimonda!: Phaser.GameObjects.Sprite;
  /** la Marimonda es la del kit (camina y baila); si no llegó, la pintada por código, que rebota */
  private mariKit = false;
  private mari = { x: -60, y: 50, vx: 0, t: 12 };
  private hud!: Phaser.GameObjects.Graphics;
  private marcadorTxt!: MarcadorPartido;
  private relojTxt!: Phaser.GameObjects.BitmapText;
  private flecha!: Phaser.GameObjects.Triangle;
  /** entrenamiento */
  private paso = 0;
  private pases = 0;
  private tiros = 0;
  private robos = 0;
  private golesTuyos = 0;
  /** el que recibe un pase: un ratico sin hacerle caso al stick para que no se vaya del balón */
  private recibe = 0;
  /** el arquero que acaba de quitarle el balón a uno en el área espera antes de volver a hacerlo */
  private quitaT = 0;
  /** para no repetir la pista del especial a cada toque */
  private pistaT = 0;
  /** para medir: tiros, atajadas y contactos del arquero de cada equipo */
  stats = { tiros: [0, 0], atajadas: [0, 0], arquero: [0, 0] };

  constructor() { super('Futbol'); }

  preload() { super.preload(); queueEscenario(this, 'barranquilla'); }

  create() {
    this.js = [];
    this.ctrl = null;
    this.goles = [0, 0];
    this.nek = [0, 0];
    this.clock = 0;
    this.oro = false;
    this.pausa = 0;
    this.paso = this.pases = this.tiros = this.robos = this.golesTuyos = 0;
    this.recibe = this.pistaT = this.quitaT = 0;
    this.stats = { tiros: [0, 0], atajadas: [0, 0], arquero: [0, 0] };
    this.mari = { x: -60, y: 50, vx: 0, t: 14 };
    this.setup(1, 640);
    this.texturas();
    this.escenario('barranquilla', 'bg_barranquilla');
    this.cancha();
    this.armarEquipos();
    // la pelota del kit (lote SP2), del tamaño de los atletas; si no llegó, la pintada por código
    // la talla grande del kit: con la de 48 el balón se perdía entre los pies en el celular
    const pk = pelotaKit(this, 'balon_futbol', '64');
    const spr = (pk ? this.add.image(0, 0, 'pelotas', pk) : this.add.image(0, 0, 'balon_futbol').setScale(1.2));
    const sombra = this.add.ellipse(0, 0, 9, 3, 0x000000, 0.3);
    const fuego = this.add.particles(0, 0, 'px', { lifespan: 300, scale: { start: 1.4, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [0xffe040, 0xff6020, 0xffffff], frequency: 14, emitting: false }).setDepth(4999);
    fuego.startFollow(spr);
    this.bola = { x: 300, y: PROF / 2, z: 0, vx: 0, vy: 0, vz: 0, dueño: null, ultimo: null, especial: false, t: 0, libre: 0, seEscapo: null, para: null, centro: false, tiro: null, spr, sombra, fuego };
    const mk = npcs().marimonda;
    this.mariKit = !!mk && this.anims.exists('npc_marimonda_caminar');
    this.marimonda = (this.mariKit ? this.add.sprite(-80, 0, 'npc_marimonda', 0).setOrigin((mk.ancla[0] + 0.5) / mk.w, (mk.ancla[1] + 0.5) / mk.h) : this.add.sprite(-80, 0, 'marimonda').setOrigin(0.5, 1)).setVisible(false);
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    // el marcador de TV del kit, con el nombre de cada equipo a su lado
    this.marcadorTxt = new MarcadorPartido(this, (o) => this.uiAdd(o), 320, 16, [lado(0).corto, lado(1).corto]);
    this.relojTxt = this.uiAdd(txt(this, 320, 32, '', 'fuente_ui', 1).setDepth(8001).setTint(0xffe080));
    this.flecha = this.add.triangle(0, 0, 0, 0, 8, 0, 4, 6, 0xffe040).setDepth(6000);
    this.saqueDe(0);
    this.tema('carnaval_quilla');
    this.ambiente('carnaval');
    this.cameras.main.centerOn(320, 180);
    if (this.d.practica) void this.entrenar('FÚTBOL', this.pasos(), 40);
    else void this.previa('FÚTBOL CALLEJERO', 'CARNAVAL DE BARRANQUILLA, COLOMBIA', '{PUÑO} PASE (O HOMBRO SIN BALÓN) · {PATADA} TIRO (O BARRIDA) · {SALTO} CABEZAZO · {ESPECIAL} CON LA BARRA LLENA');
  }

  private pasos(): Paso[] {
    return [
      { texto: 'CORRE CON {MOVER} HASTA EL BALÓN:\nPASAS POR ENCIMA Y ES TUYO', botones: ['stick'], antes: () => { this.paso = 0; }, listo: () => this.bola.dueño === this.js[0] },
      { texto: '{PUÑO} SE LO PASA A TU COMPAÑERA', botones: ['punch'], antes: () => { this.paso = 1; }, listo: () => this.pases > 0 },
      { texto: 'CERCA DEL ARCO, {PATADA} TIRA.\nCON LA FLECHA APUNTAS ARRIBA O ABAJO', botones: ['kick', 'stick'], antes: () => { this.paso = 2; }, listo: () => this.golesTuyos > 0 },
      { texto: `SIN EL BALÓN, {PATADA} ES LA BARRIDA:\n¡QUÍTASELO A ${this.rivalEntrenoNombre}!`, botones: ['kick'], antes: () => { this.paso = 3; this.balonAKenji(); }, listo: () => this.robos > 0 },
    ];
  }

  /** Entrenando, para practicar la barrida: Kenji tiene el balón y se pasea despacio. */
  private balonAKenji() {
    const k = this.js.find((j) => j.team === 1);
    if (!k) return;
    k.x = 330; k.y = PROF / 2; k.ia.tx = 330; k.ia.ty = PROF / 2;
    const b = this.bola;
    b.dueño = k; b.vx = b.vy = b.vz = 0; b.especial = false; b.para = null; b.tiro = null;
  }

  private texturas() {
    if (this.textures.exists('balon_futbol')) return;
    const C = (s: string) => hex(s);
    const b = new Painter(8, 8);
    b.circle(3.5, 3.5, 3.8, C('#2a2a2a'));
    b.circle(3.5, 3.5, 3.1, C('#f8f8f8'));
    b.rect(3, 2, 2, 2, C('#2a2a2a')); b.px(1, 4, C('#2a2a2a')); b.px(6, 4, C('#2a2a2a')); b.px(3, 6, C('#2a2a2a'));
    this.textures.addCanvas('balon_futbol', b.done());
    // la Marimonda: el disfraz del Carnaval, con la trompa larga, las orejotas y el traje de colores
    const m = new Painter(24, 36);
    m.rect(8, 16, 10, 14, C('#e83a3a'));
    for (let y = 16; y < 30; y += 3) m.rect(8, y, 10, 1, C('#f2c230'));
    m.rect(9, 30, 3, 6, C('#2a5ad0')); m.rect(14, 30, 3, 6, C('#3ac06a'));
    m.rect(5, 17, 3, 9, C('#2a5ad0')); m.rect(18, 17, 3, 9, C('#3ac06a'));
    m.circle(13, 9, 6, C('#f4f0e2'));
    m.circle(5, 6, 4, C('#e870b0')); m.circle(21, 6, 4, C('#e870b0'));
    m.rect(11, 8, 1, 2, C('#2a2a2a')); m.rect(15, 8, 1, 2, C('#2a2a2a'));
    for (let k = 0; k < 9; k++) m.rect(13 + Math.round(Math.sin(k / 2) * 2), 12 + k, 2, 1, C('#f4f0e2'));
    m.rect(9, 1, 8, 3, C('#2a2a2a'));
    this.textures.addCanvas('marimonda', m.done());
  }

  /** Las rayas en la calle, los arcos de piedra y el círculo del medio. */
  private cancha() {
    const g = this.add.graphics().setDepth(FT - 20);
    const P = (x: number, y: number) => new Phaser.Math.Vector2(x + K * y, FT + y);
    const linea = (a: Phaser.Math.Vector2, b: Phaser.Math.Vector2) => g.lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(2, 0xf4f4ec, 0.85);
    linea(P(GOL[0], 0), P(GOL[1], 0)); linea(P(GOL[0], PROF), P(GOL[1], PROF));
    linea(P(GOL[0], 0), P(GOL[0], PROF)); linea(P(GOL[1], 0), P(GOL[1], PROF));
    linea(P(313, 0), P(313, PROF));
    for (let a = 0; a < Math.PI * 2; a += 0.25) linea(P(313 + Math.cos(a) * 18, PROF / 2 + Math.sin(a) * 12), P(313 + Math.cos(a + 0.25) * 18, PROF / 2 + Math.sin(a + 0.25) * 12));
    // las áreas chiquitas
    for (const [x0, x1] of [[GOL[0], GOL[0] + 40], [GOL[1] - 40, GOL[1]]]) { linea(P(x0, ARCO.y0 - 10), P(x1, ARCO.y0 - 10)); linea(P(x0, ARCO.y1 + 10), P(x1, ARCO.y1 + 10)); linea(P(x0 === GOL[0] ? x1 : x0, ARCO.y0 - 10), P(x0 === GOL[0] ? x1 : x0, ARCO.y1 + 10)); }
    // los arcos de piedra: dos columnas y el arco de arriba, en la línea de gol (con el arte vienen pintados, cada uno
    // en dos piezas: la columna de atrás en FT + 35 y la de adelante en FT + 71, y el arquero queda entre las dos)
    if (!this.arteFondo) for (const x of GOL) {
      const a = this.add.graphics().setDepth(FT + ARCO.y1 + 1);
      const [p0, p1] = [P(x, ARCO.y0), P(x, ARCO.y1)];
      a.fillStyle(0xc8b490).fillRect(p0.x - 3, p0.y - ARCO.alto - 4, 5, ARCO.alto + 4).fillRect(p1.x - 3, p1.y - ARCO.alto - 4, 5, ARCO.alto + 4);
      a.lineStyle(5, 0xb8a480).lineBetween(p0.x, p0.y - ARCO.alto - 2, p1.x, p1.y - ARCO.alto - 2);
      a.lineStyle(1, 0xffffff, 0.4);
      for (let k = 1; k < 6; k++) { const t = k / 6; a.lineBetween(p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t - ARCO.alto, p0.x + (p1.x - p0.x) * t, p0.y + (p1.y - p0.y) * t); }
    }
  }

  private armarEquipos() {
    const yo = this.d.jugador;
    const comp = this.gente[1]?.id;
    let fam: string[], inst: string[];
    if (this.d.practica) { fam = [yo, nuestros().find((f) => f !== yo)!]; inst = [ellos()[0]]; }
    else {
      // el arquero de la Familia es el que no juega en la tabla; el del Instituto, el que sobra
      const resto = nuestros().filter((f) => f !== yo && f !== comp);
      fam = [yo, comp, ...resto];
      const elegidos = [this.gente[2].id, this.gente[3].id];
      inst = [...elegidos, ...ellos().filter((i) => !elegidos.includes(i))];
    }
    const poner = (ids: string[], team: 0 | 1) => ids.forEach((id, k) => {
      const arquero = !this.d.practica && k === ids.length - 1;
      const fig = new Figura(this, 0, 0, id, 'idle');
      const sombra = this.add.ellipse(0, 0, 18, 5, 0x000000, 0.3);
      const [x, y] = this.casa(team, k, arquero);
      this.js.push({ id, team, arquero, fig, sombra, x, y, z: 0, vz: 0, dir: team === 0 ? 1 : -1, st: 'libre', t: 0, vx: 0, vy: 0, goles: 0, empuja: 0, aguanta: 0, ia: { t: Math.random(), tx: x, ty: y } });
    });
    poner(fam, 0);
    poner(inst, 1);
  }

  /** Dónde se para cada uno al saque: el arquero en su arco, los demás en su mitad. */
  private casa(team: 0 | 1, k: number, arquero: boolean): [number, number] {
    if (arquero) return [team === 0 ? GOL[0] + 6 : GOL[1] - 6, PROF / 2];
    const x = team === 0 ? [250, 180, 180][k] ?? 200 : [376, 446, 446][k] ?? 420;
    const y = [PROF / 2, 24, PROF - 24][k] ?? PROF / 2;
    return [x, y];
  }

  /** Todos a su sitio y el balón en el medio, para el equipo que saca. */
  private saqueDe(team: 0 | 1) {
    this.saque = team;
    const porTeam: [number, number] = [0, 0];
    for (const j of this.js) {
      const k = porTeam[j.team]++;
      [j.x, j.y] = this.casa(j.team, k, j.arquero);
      j.z = 0; j.vz = 0; j.st = 'libre'; j.vx = j.vy = 0; j.empuja = j.aguanta = 0; j.fig.setAngle(0);
    }
    const b = this.bola;
    Object.assign(b, { x: 313, y: PROF / 2, z: 0, vx: 0, vy: 0, vz: 0, dueño: null, especial: false, libre: 0, para: null, centro: false, tiro: null });
    this.recibe = 0;
    this.protegido = 1.5;
    // entrenando: el balón aparece cerca de ti (en el paso de la barrida, lo tiene Kenji)
    if (this.d.practica) { b.x = 220; b.y = PROF / 2; if (this.paso === 3) this.balonAKenji(); }
    else {
      const sacador = this.js.find((j) => j.team === team && !j.arquero)!;
      sacador.x = team === 0 ? 305 : 321; sacador.y = PROF / 2;
      b.dueño = sacador;
    }
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
    if (this.pausa > 0) {
      this.pausa -= dt;
      for (const j of this.js) j.fig.step(dt);
      if (this.pausa <= 0) this.saqueDe(this.saque);
      return;
    }
    if (!this.d.practica) {
      this.clock += dt;
      if (this.clock >= TIEMPO && !this.oro) {
        if (this.goles[0] !== this.goles[1]) { this.fin(this.goles[0] > this.goles[1] ? 0 : 1); return; }
        this.oro = true;
        void this.banner('¡GOL DE ORO!', 'fuente_titulo', 2, 1000);
      }
    }
    this.protegido = Math.max(0, this.protegido - dt);
    this.pistaT = Math.max(0, this.pistaT - dt);
    this.recibe = Math.max(0, this.recibe - dt);
    this.quitaT = Math.max(0, this.quitaT - dt);
    const antes = this.ctrl;
    this.ctrl = this.control();
    // te cambió al que recibe el pase: un ratico quieto para que no salga corriendo lejos del balón
    if (this.ctrl && this.ctrl !== antes && this.ctrl === this.bola.para && !this.bola.dueño) this.recibe = 0.25;
    for (const j of this.js) this.jugador(j, dt, p);
    this.moverBola(dt);
    this.moverMarimonda(dt);
  }

  /** A quién manejas: al que tiene el balón; si no, al de tu equipo más cerca del balón (nunca al arquero). */
  private control(): Jug | null {
    const b = this.bola;
    if (b.dueño?.team === 0 && !b.dueño.arquero) return b.dueño;
    // el pase que va para una de las nuestras: la manejas desde que sale, para recibirlo (o cabecearlo)
    if (!b.dueño && b.para && b.para.team === 0 && !b.para.arquero && b.para.st !== 'caido') return b.para;
    const mios = this.js.filter((j) => j.team === 0 && !j.arquero && j.st !== 'caido');
    const cerca = mios.sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))[0] ?? null;
    // no cambia por un pelito: se queda con el que tenías si está casi igual de cerca
    const prev = this.ctrl;
    if (prev && cerca && prev !== cerca && prev.st !== 'caido' && Math.hypot(prev.x - b.x, prev.y - b.y) < Math.hypot(cerca.x - b.x, cerca.y - b.y) + 24) return prev;
    return cerca;
  }

  private jugador(j: Jug, dt: number, p: Pad) {
    j.t -= dt;
    j.empuja = Math.max(0, j.empuja - dt);
    j.aguanta = Math.max(0, j.aguanta - dt);
    if (j.z > 0 || j.vz) { j.vz -= 700 * dt; j.z += j.vz * dt; if (j.z <= 0) { j.z = 0; j.vz = 0; j.fig.aplastar(); } }
    if (j.st === 'caido' || j.st === 'tambalea') { j.fig.step(dt); if (j.t <= 0) { j.st = 'libre'; j.fig.setAngle(0); } return; }
    if (j.st === 'vuela') {
      // la estirada: va derecho a donde va a cruzar el balón, y ahí se queda
      const d = j.ia.ty - j.y;
      j.y += Math.sign(d) * Math.min(Math.abs(d), 240 * dt);
      j.fig.step(dt);
      if (j.t <= 0) { j.st = 'libre'; j.fig.setAngle(0); j.filaVuelo = undefined; }
      this.limitar(j);
      return;
    }
    if (j.st === 'barre') {
      j.x += j.vx * dt; j.y += j.vy * dt;
      const frena = Math.pow(0.08, dt);
      j.vx *= frena; j.vy *= frena;
      this.barrida(j);
      j.fig.step(dt);
      if (j.t <= 0) { j.st = 'libre'; j.fig.setAngle(0); }
      this.limitar(j);
      return;
    }
    if (j.st === 'patea') { j.fig.step(dt); if (j.t <= 0 || j.fig.anim.done) j.st = 'libre'; return; }
    let vx = 0, vy = 0;
    if (j === this.ctrl) [vx, vy] = this.humano(j, p);
    else if (j.arquero) [vx, vy] = this.arquero(j);
    else [vx, vy] = this.maquina(j, dt);
    if (j.st !== 'libre') return;
    j.x += vx * dt; j.y += vy * dt;
    this.limitar(j);
    // en el aire, cada cuadro: si el balón pasa cerca, cabezazo
    if (j.z > 0 && !j.arquero && this.cabezazo(j)) return;
    if (Math.abs(vx) > 10) j.dir = vx > 0 ? 1 : -1;
    else if (j.arquero) j.dir = j.team === 0 ? 1 : -1;
    const v = Math.hypot(vx, vy);
    if (j.z > 0) j.fig.set(j.vz > 0 ? 'jump_rise' : 'jump_fall');
    else if (v > 8) j.fig.set(v > 100 ? 'run' : 'walk');
    // el arquero: con el balón en las manos, abrazado; si no, en guardia (las del kit si llegaron)
    else if (j.arquero) j.fig.set(this.bola.dueño === j && j.fig.anim.has('keeper_catch') ? 'keeper_catch' : j.fig.anim.has('keeper_ready') ? 'keeper_ready' : 'guard');
    else j.fig.set('idle');
    j.fig.step(dt, v > 8 ? v * dt : undefined);
    // con el balón en los pies: lo lleva adelante
    const b = this.bola;
    if (b.dueño === j) { b.x = j.x + j.dir * 8; b.y = j.y + 1; b.z = 0; }
  }

  private limitar(j: Jug) {
    const [a, c] = j.arquero ? (j.team === 0 ? [GOL[0] - 4, GOL[0] + 40] : [GOL[1] - 40, GOL[1] + 4]) : [GOL[0] - 6, GOL[1] + 6];
    j.x = Phaser.Math.Clamp(j.x, a, c);
    j.y = Phaser.Math.Clamp(j.y, j.arquero ? ARCO.y0 - 14 : 2, j.arquero ? ARCO.y1 + 14 : PROF - 2);
  }

  /** Lo que haces tú con el que manejas. */
  private humano(j: Jug, p: Pad): [number, number] {
    const b = this.bola;
    const vel = (p.run ? 130 : 95) * (b.dueño === j ? 0.92 : 1);
    // el salto: en el aire cabecea el balón que pasa cerca, y pasa por encima de la barrida
    if (p.pressed.jump && j.z === 0) j.vz = 210;
    if (b.dueño === j) {
      if (p.pressed.special && this.nek[0] >= 100) this.tirar(j, p.y, true);
      else if (p.pressed.kick) this.tirar(j, p.y, false);
      else if (p.pressed.punch) this.pasar(j, p.x, p.y);
      else if (p.pressed.special) this.pista(j, '¡LLENA LA BARRA!');
    } else {
      if (p.pressed.kick && j.z === 0) this.barrer(j, p.x || j.dir, p.y);
      else if (p.pressed.punch && j.z === 0) this.hombro(j);
      else if (p.pressed.special) this.pista(j, this.nek[0] >= 100 ? '¡PRIMERO EL BALÓN!' : '¡LLENA LA BARRA!');
    }
    // recibiendo el pase: el stick no te saca de donde va a llegar el balón
    if (this.recibe > 0 && b.para === j && !b.dueño) return [0, 0];
    return [p.x * vel, p.y * vel * 0.75];
  }

  /** La máquina: el que tiene el balón avanza, pasa o tira; los otros presionan, marcan o se abren. */
  private maquina(j: Jug, dt: number): [number, number] {
    const b = this.bola;
    j.ia.t -= dt;
    // tus compañeros juegan a fondo en todos los niveles: lo fácil es que los rivales aflojen
    const ag = this.d.practica ? 0.1 : j.team === 0 ? 1 : ajustes().cpuAgresion;
    const ir = (tx: number, ty: number, v: number): [number, number] => {
      const dx = tx - j.x, dy = ty - j.y, d = Math.hypot(dx, dy);
      return d < 4 ? [0, 0] : [(dx / d) * v, (dy / d) * v];
    };
    // la Familia de la máquina y el Instituto van parejos; en PASEO el Instituto va un poco más lento
    const vel = 100 * (j.team === 1 ? Math.max(ajustes().cpuVel, 0.82) : 1) * (this.d.practica ? 0.7 : 1);
    const arcoRival = j.team === 0 ? GOL[1] : GOL[0];
    if (b.dueño === j) {
      // entrenando, Kenji solo se pasea con el balón para que se lo quites
      if (this.d.practica) return ir(j.ia.tx, j.ia.ty, 45);
      const dGol = Math.abs(arcoRival - j.x);
      const presion = this.js.some((o) => o.team !== j.team && !o.arquero && Math.hypot(o.x - j.x, o.y - j.y) < 26);
      if (j.ia.t <= 0) {
        j.ia.t = 0.5 + Math.random() * 0.5;
        // el especial, no apenas se llena: cerca del arco y de vez en cuando
        // la barra de tu equipo es tuya: solo la máquina rival gasta la suya
        if (j.team === 1 && this.nek[j.team] >= 100 && dGol < 210 && Math.random() < 0.35) { this.tirar(j, (Math.random() - 0.5) * 2, true); return [0, 0]; }
        if (dGol < 200 && Math.random() < 0.55 + 0.3 * ag) { this.tirar(j, (Math.random() - 0.5) * 2, false); return [0, 0]; }
        if (presion && Math.random() < 0.4) { this.pasar(j); return [0, 0]; }
      }
      return ir(arcoRival, PROF / 2 + Math.sin(this.clock * 1.3 + j.y) * 20, vel * 0.92);
    }
    // entrenando, Kenji no persigue ni barre: se queda en su sitio
    if (this.d.practica) return ir(j.ia.tx, j.ia.ty, 40);
    // el centro que viene para él: va al balón y salta a cabecearlo cuando baja
    if (!b.dueño && b.para === j && b.centro) {
      if (j.z === 0 && b.vz < 0 && b.z > 10 && b.z < 46 && Math.hypot(b.x - j.x, b.y - j.y) < 30) j.vz = 210;
      return ir(b.x, b.y, vel);
    }
    // el pase de un compañero que va en el aire es nuestro: nadie se lo quita al que lo recibe
    const nuestro = b.dueño?.team === j.team || (!b.dueño && b.para?.team === j.team);
    // el balón suelto o del otro equipo: va el que esté más cerca de los suyos
    const libreOrival = !nuestro;
    if (libreOrival) {
      const mios = this.js.filter((o) => o.team === j.team && !o.arquero && o !== this.ctrl && o.st === 'libre');
      const cerca = mios.sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))[0];
      if (cerca === j) {
        // y si lo tiene un rival y está al alcance, la barrida
        if (b.dueño && !b.dueño.arquero && Math.hypot(b.dueño.x - j.x, b.dueño.y - j.y) < 22 && j.ia.t <= 0 && this.protegido <= 0) {
          j.ia.t = 0.9 - 0.4 * ag;
          if (Math.random() < 0.3 + 0.4 * ag) { this.barrer(j, Math.sign(b.x - j.x) || 1, Math.sign(b.y - j.y) * 0.5); return [0, 0]; }
        }
        // el que presiona corre un poco más que el que lleva el balón
        return ir(b.x, b.y, vel * 1.08);
      }
    }
    // los demás: se abren adelante si atacamos, o se ponen entre el balón y su arco si defendemos
    if (j.ia.t <= 0) {
      j.ia.t = 0.8 + Math.random() * 0.8;
      const atacamos = nuestro;
      const propio = j.team === 0 ? GOL[0] : GOL[1];
      if (atacamos) { j.ia.tx = Phaser.Math.Clamp(b.x + (j.team === 0 ? 1 : -1) * Phaser.Math.Between(40, 110), GOL[0] + 30, GOL[1] - 30); j.ia.ty = Phaser.Math.Between(10, PROF - 10); }
      else { j.ia.tx = (b.x + propio) / 2 + Phaser.Math.Between(-20, 20); j.ia.ty = Phaser.Math.Clamp(b.y + Phaser.Math.Between(-30, 30), 8, PROF - 8); }
    }
    return ir(j.ia.tx, j.ia.ty, vel * 0.75);
  }

  /** El arquero: sigue el balón por la línea; si viene un tiro, se lanza a donde va a pasar. */
  private arquero(j: Jug): [number, number] {
    const b = this.bola;
    const linea = j.team === 0 ? GOL[0] + 6 : GOL[1] - 6;
    const viene = (j.team === 0 ? b.vx < -60 : b.vx > 60) && !b.dueño;
    // el rival se le mete al área chiquita con el balón: sale a quitárselo
    const o = b.dueño;
    if (o && o.team !== j.team && j.st === 'libre' && this.enArea(o, j.team)) {
      const dx = o.x - j.x, dy = o.y - j.y, d = Math.hypot(dx, dy) || 1;
      return [(dx / d) * 100, (dy / d) * 110];
    }
    let ty = Phaser.Math.Clamp(b.y, ARCO.y0 - 4, ARCO.y1 + 4);
    if (viene) {
      const tLlega = (linea - b.x) / b.vx;
      if (tLlega > 0 && tLlega < 0.6) {
        ty = b.y + b.vy * tLlega;
        // se lanza si no llega caminando
        if (Math.abs(ty - j.y) > 8 && j.st === 'libre' && tLlega < 0.35) {
          j.st = 'vuela'; j.t = 0.5; j.ia.ty = Phaser.Math.Clamp(ty, ARCO.y0 - 6, ARCO.y1 + 6); j.vy = 0; j.vx = 0;
          // la estirada del kit va hacia donde se tira (de frente o de espalda); sin ella, la caída girada de antes
          if (j.fig.anim.has('keeper_dive')) { j.fig.set('keeper_dive', true); j.filaVuelo = j.ia.ty > j.y ? 'down' : 'up'; }
          else j.fig.set('jump_fall', true).setAngle(j.team === 0 ? -70 : 70);
        }
      }
    }
    const dx = linea - j.x, dy = ty - j.y;
    return [Math.abs(dx) > 2 ? Math.sign(dx) * 60 : 0, Math.abs(dy) > 2 ? Math.sign(dy) * 110 : 0];
  }

  /** El tiro al arco: rasante y fuerte. `apunta` (-1 a 1) lo manda arriba o abajo del arco, siempre adentro de los palos. */
  private tirar(j: Jug, apunta: number, especial: boolean) {
    const b = this.bola;
    const s = j.team === 0 ? 1 : -1;
    const linea = j.team === 0 ? GOL[1] : GOL[0];
    // apunta a la línea de gol: el más colocado queda a 4 del palo, y el error no lo saca
    const a = Phaser.Math.Clamp(apunta, -1, 1);
    const ty = PROF / 2 + a * 10 + (Math.random() - 0.5) * (especial ? 2 : 7);
    const v = especial ? 420 : 300 + Math.random() * 40;
    const dx = Math.max(12, (linea - b.x) * s) * s;
    const t = Math.hypot(dx, ty - b.y) / v;
    b.vx = dx / t; b.vy = (ty - b.y) / t;
    b.vz = especial ? 40 : 60 + Math.random() * 60;
    b.dueño = null; b.ultimo = j; b.especial = especial; b.t = 0; b.libre = 0.25; b.seEscapo = null;
    b.para = null; b.centro = false; b.tiro = { apunta: Math.abs(a), cabeza: false };
    this.stats.tiros[j.team]++;
    j.st = 'patea'; j.t = 0.35;
    if (especial) j.fig.set('flying_kick', true, 1.4);
    else j.fig.contacto('shot', 'kick_martial', 1.4);
    if (especial) {
      this.nek[j.team] = 0;
      efecto(this, 'aura_nekketsu', this.sx(j.x, j.y), FT + j.y, { depth: FT + j.y - 0.1 });
      if (j.team === 0) void this.banner('¡TIRO NEKKETSU!', 'fuente_titulo', 2, 700);
      this.uiAdd(rafaga(this));
      this.cameras.main.shake(120, 0.006);
    } else this.carga(j.team, 6);
    this.sound.play('golpe', { volume: 0.4, rate: 0.8 });
    if (j.team === 0 && this.d.practica) this.tiros++;
  }

  /**
   * El pase: al compañero más adelantado y más despejado; la persona elige con el stick hacia dónde (si apunta a
   * alguien). Rasante, o alto (de centro) si el compañero está cerca del área rival. Va un poco adelante del que
   * recibe y hacia el medio, para que llegue con el arco de frente.
   */
  private pasar(j: Jug, sx = 0, sy = 0) {
    const b = this.bola;
    const compas = this.js.filter((o) => o.team === j.team && o !== j && !o.arquero && o.st !== 'caido');
    const adelante = (o: Jug) => (o.x - j.x) * (j.team === 0 ? 1 : -1);
    const despejado = (o: Jug) => Math.min(80, ...this.js.filter((r) => r.team !== j.team && !r.arquero).map((r) => Math.hypot(r.x - o.x, r.y - o.y)));
    const hacia = (o: Jug) => { const d = Math.hypot(o.x - j.x, o.y - j.y) || 1, n = Math.hypot(sx, sy); return n ? ((o.x - j.x) * sx + (o.y - j.y) * sy) / (d * n) : 0; };
    const puntaje = (o: Jug) => hacia(o) * 2 + despejado(o) / 40 + adelante(o) / 100;
    const para = compas.sort((a, c) => puntaje(c) - puntaje(a))[0];
    if (!para) { this.tirar(j, 0, false); return; }
    const tx = para.x + (j.team === 0 ? 14 : -14), ty = Phaser.Math.Linear(para.y, PROF / 2, 0.3);
    const d = Math.hypot(tx - b.x, ty - b.y);
    const cerca = Math.abs((j.team === 0 ? GOL[1] : GOL[0]) - para.x) < 130;
    const centro = !j.arquero && !this.d.practica && cerca && d > 30 && Math.random() < 0.5;
    // el arquero la saca alta con la mano, por encima de los que esperan en el área; el centro sube unos 40
    const t = j.arquero ? Math.max(0.6, d / 260) : centro ? Phaser.Math.Clamp(d / 200, 0.7, 0.82) : Math.max(0.25, d / 240);
    b.vx = (tx - b.x) / t; b.vy = (ty - b.y) / t; b.vz = j.arquero || centro ? (G * t) / 2 : 30;
    b.dueño = null; b.ultimo = j; b.especial = false; b.t = 0; b.libre = j.arquero ? 0.45 : 0.2; b.seEscapo = null;
    b.para = para; b.centro = centro; b.tiro = null;
    j.st = 'patea'; j.t = 0.25;
    if (j.arquero) j.fig.set('throw_overhead', true, 1.4);
    else j.fig.contacto('pass', 'low_kick', 1.4);
    this.sound.play('esquiva', { volume: 0.25, rate: 1.3 });
    if (centro && para.team === 0) this.letrero(para, '¡CENTRO! ¡SALTA!', 0x8ae0ff);
    if (j.team === 0 && this.d.practica) this.pases++;
  }

  /** La barrida: se tira al piso hacia adelante; si alcanza al que lleva el balón, lo tumba y se lo roba. */
  private barrer(j: Jug, dx: number, dy: number) {
    j.st = 'barre'; j.t = 0.42;
    j.vx = Math.sign(dx || j.dir) * 190; j.vy = dy * 60;
    j.dir = j.vx > 0 ? 1 : -1;
    j.fig.set(j.fig.anim.has('slide') ? 'slide' : 'slip_wet', true, 1.6);
    efecto(this, 'polvo_frenar_medio', this.sx(j.x, j.y), FT + j.y);
  }

  private barrida(j: Jug) {
    const b = this.bola, o = b.dueño;
    if (j.st !== 'barre') return;
    // al arquero con el balón en las manos no se le barre, y al que salta, la barrida le pasa por debajo
    if (o && o.team !== j.team && !o.arquero && o.z < 4 && Math.hypot(o.x - j.x, o.y - j.y) < 14 && this.protegido <= 0) {
      o.st = 'caido'; o.t = 0.9; o.fig.set('knockout', true, 1.6);
      b.dueño = null; b.vx = j.vx * 0.7; b.vy = (Math.random() - 0.5) * 60; b.vz = 80; b.libre = 0.3; b.ultimo = j;
      b.para = null; b.tiro = null;
      this.carga(j.team, 15);
      this.sound.play('golpe', { volume: 0.4 });
      efecto(this, 'chispa_golpe_liviano', this.sx(o.x, o.y), FT + o.y - 14, { depth: 6000 });
      this.letrero(j, '¡BARRIDA!', 0xffe080);
      if (j.team === 0 && this.d.practica) this.robos++;
    } else if (!o && Math.hypot(b.x - j.x, b.y - j.y) < 12 && b.z < 10) {
      // barrió el balón suelto: es suyo
      this.tomar(j);
    }
  }

  /** El hombro: pegado al que lleva el balón, puño se lo saca (o aguanta, y por un ratico no se deja). */
  private hombro(j: Jug) {
    if (j.empuja > 0) return;
    j.empuja = 0.5;
    j.st = 'patea'; j.t = 0.2;
    j.fig.set('punch', true, 1.4);
    const b = this.bola, o = b.dueño;
    if (!o || o.team === j.team || o.arquero || Math.hypot(o.x - j.x, o.y - j.y) > 22 || this.protegido > 0) return;
    const prob = this.d.practica ? 1 : o.aguanta > 0 ? 0 : j.team === 0 && ajustes().nombre === 'PASEO' ? 0.75 : 0.55;
    if (Math.random() >= prob) {
      // aguantó: el que empujó rebota y se tambalea
      o.aguanta = 0.5;
      j.st = 'tambalea'; j.t = 0.35; j.fig.set(j.fig.anim.has('stagger') ? 'stagger' : 'fight_hit', true, 1.6);
      this.letrero(o, '¡AGUANTÓ!', 0xffffff);
      this.sound.play('bloqueo', { volume: 0.3 });
      return;
    }
    o.st = 'tambalea'; o.t = 0.45; o.fig.set(o.fig.anim.has('stagger') ? 'stagger' : 'fight_hit', true, 1.6);
    this.tomar(j);
    b.ultimo = j;
    this.carga(j.team, 15);
    this.sound.play('golpe', { volume: 0.35, rate: 1.3 });
    efecto(this, 'chispa_golpe_liviano', this.sx(o.x, o.y), FT + o.y - 20, { depth: 6000 });
    this.letrero(j, '¡ROBO!', 0x8aff8a);
    if (j.team === 0 && this.d.practica) this.robos++;
  }

  /**
   * En el aire, cada cuadro: si el balón suelto pasa cerca y a la altura de la cabeza, lo cabecea hacia el arco.
   * El que viene de centro o de pase, cerca del arco, es medio gol.
   */
  private cabezazo(j: Jug): boolean {
    const b = this.bola;
    if (b.dueño || j.st !== 'libre' || (j === b.ultimo && b.libre > 0)) return false;
    if (Math.hypot(b.x - j.x, b.y - j.y) > 16 || b.z < 4 || b.z > j.z + 40) return false;
    const dePase = !!b.para && b.para.team === j.team;
    this.tirar(j, (Math.random() - 0.5) * 2, false);
    b.vz = -40;
    if (b.tiro) b.tiro.cabeza = dePase;
    this.letrero(j, '¡CABEZAZO!', 0x8ae0ff);
    j.fig.contacto('header', 'jump_rise');
    return true;
  }

  /** Se queda con el balón a los pies (o en las manos, el arquero). */
  private tomar(j: Jug) {
    const b = this.bola;
    b.dueño = j; b.especial = false; b.vx = b.vy = b.vz = 0;
    b.para = null; b.centro = false; b.tiro = null;
  }

  /** El arquero con el balón: espera un momento y lo saca. */
  private sacaArquero(j: Jug) {
    const b = this.bola;
    j.ia.t = 0.8;
    this.time.delayedCall(800, () => { if (b.dueño === j) this.pasar(j); });
  }

  /** ¿Está adentro del área chiquita del arco de `team`? */
  private enArea(j: Jug, team: 0 | 1) {
    const x = team === 0 ? j.x - GOL[0] : GOL[1] - j.x;
    return x < 42 && j.y > ARCO.y0 - 10 && j.y < ARCO.y1 + 10;
  }

  /**
   * Lo que ataja un arquero: el rival según el nivel; el nuestro, siempre confiable.
   * El tiro lento de lejos es más fácil; el colocado y el cabezazo de pase, más difíciles. El Nekketsu casi siempre
   * entra (el de la máquina, un poco menos).
   */
  private ataja(j: Jug, tiro: { apunta: number; cabeza: boolean }, v: number): number {
    const a = ajustes();
    if (this.bola.especial) return j.team === 0 ? 0.45 : 0.2;
    // nuestro arquero es confiable en todos los niveles (antes atajaba menos justo en el fácil)
    let p = j.team === 0 ? 0.82 : 0.5 + 0.3 * a.cpuAgresion;
    p += 0.35 * Phaser.Math.Clamp((260 - v) / 200, 0, 1);
    p -= 0.18 * tiro.apunta;
    if (tiro.cabeza) p -= 0.15;
    return Phaser.Math.Clamp(p, 0.15, 0.92);
  }

  /** Llena la barra Nekketsu de un equipo; al llenarse la tuya, avisa. */
  private carga(team: 0 | 1, n: number) {
    const antes = this.nek[team];
    this.nek[team] = Math.min(100, antes + n);
    if (team === 0 && antes < 100 && this.nek[0] >= 100) {
      this.letrero(this.ctrl ?? this.js[0], '¡BARRA LLENA!', 0xffe040);
      this.sound.play('elegir', { volume: 0.4, rate: 1.4 });
    }
  }

  /** La pista cortica cuando aprietas especial y todavía no se puede. */
  private pista(j: Jug, s: string) {
    if (this.pistaT > 0) return;
    this.pistaT = 1.2;
    this.letrero(j, s, 0xffe080);
  }

  private moverBola(dt: number) {
    const b = this.bola;
    b.t += dt;
    b.libre = Math.max(0, b.libre - dt);
    b.fuego.emitting = b.especial && !b.dueño;
    if (b.dueño) {
      // el arquero que toca al que se mete con el balón en su área chiquita, se lo quita
      const o = b.dueño;
      const arq = o.arquero || this.quitaT > 0 ? null : this.js.find((k) => k.arquero && k.team !== o.team && k.st !== 'caido' && Math.hypot(k.x - o.x, k.y - o.y) < 16 && this.enArea(o, k.team));
      // en los niveles fáciles a veces le ganas al arquero rival con un amague
      if (arq && o.team === 0 && Math.random() < 0.5 * ajustes().ayuda) {
        this.quitaT = 1;
        this.letrero(o, '¡LO DRIBLÓ!', 0x8aff8a);
      } else if (arq) {
        o.st = 'tambalea'; o.t = 0.4; o.fig.set(o.fig.anim.has('stagger') ? 'stagger' : 'fight_hit', true, 1.6);
        if (arq.st === 'vuela') { arq.st = 'libre'; arq.fig.setAngle(0); arq.filaVuelo = undefined; }
        this.tomar(arq);
        this.quitaT = 1.6;
        this.stats.atajadas[arq.team]++;
        this.carga(arq.team, 10);
        this.letrero(arq, '¡ATAJADA!', 0x8aff8a);
        this.sound.play('recoger', { volume: 0.3 });
        this.sacaArquero(arq);
        return;
      }
      // entrar caminando al arco con el balón también es gol
      if (b.y > ARCO.y0 && b.y < ARCO.y1 && (b.x <= GOL[0] || b.x >= GOL[1])) { b.ultimo = b.dueño; b.dueño = null; this.gol(b.x >= GOL[1] ? 0 : 1); }
      return;
    }
    const x0 = b.x;
    // el pase que no recibió nadie ya no es de nadie
    if (b.para && b.t > 1.6) { b.para = null; b.centro = false; }
    b.vz -= G * dt; b.z += b.vz * dt;
    if (b.z <= 0) { b.z = 0; if (Math.abs(b.vz) > 60) { b.vz = -b.vz * 0.4; } else b.vz = 0; }
    const roce = Math.pow(b.z === 0 ? 0.45 : 0.9, dt);
    b.vx *= roce; b.vy *= roce;
    b.x += b.vx * dt; b.y += b.vy * dt;
    // ¿gol? cruza la línea entre los palos y por debajo del arco
    for (const [k, x] of GOL.entries()) {
      if ((x0 - x) * (b.x - x) > 0) continue;
      if (b.y > ARCO.y0 && b.y < ARCO.y1 && b.z < ARCO.alto) { this.gol(k === 0 ? 1 : 0); return; }
      // al palo o afuera: saque del arquero
      if (Math.abs(b.y - ARCO.y0) < 3 || Math.abs(b.y - ARCO.y1) < 3) { b.vx = -b.vx * 0.5; this.letrero(null, '¡AL PALO!', 0xffffff); this.sound.play('golpe', { volume: 0.3, rate: 1.4 }); continue; }
      this.afuera(k === 0 ? 0 : 1);
      return;
    }
    if (b.y < 0 || b.y > PROF) { b.y = Phaser.Math.Clamp(b.y, 0, PROF); b.vy = -b.vy * 0.5; }
    // los que lo pueden agarrar: cualquiera a los pies (el arquero también en el aire, con las manos); el que acaba
    // de patear espera un ratico, y el arquero al que ya se le escapó este tiro no lo vuelve a intentar
    for (const j of this.js) {
      // el saque del arquero: en el primer instante solo lo toca el compañero al que va (que no se lo robe el que
      // estaba pegado al arquero)
      const saque = b.libre > 0 && !!b.ultimo?.arquero && j !== b.para;
      if (j.st === 'caido' || j.st === 'tambalea' || j.st === 'patea' || (j === b.ultimo && b.libre > 0) || saque || j === b.seEscapo) continue;
      // el pase que va para alguien tiene un imán suave: lo recibe un poco más lejos
      const alcance = j.arquero ? 14 : j === b.para ? 14 : 9;
      const alto = j.arquero ? 34 : 12;
      if (Math.hypot(j.x - b.x, j.y - b.y) < alcance && b.z < j.z + alto) {
        // el arquero puede no alcanzarla: depende de lo fuerte, lo colocado y el nivel
        if (j.arquero) this.stats.arquero[j.team]++;
        const v = Math.hypot(b.vx, b.vy);
        if (j.arquero && b.tiro && b.ultimo && b.ultimo.team !== j.team && v > 50) {
          if (Math.random() > this.ataja(j, b.tiro, v)) { b.seEscapo = j; continue; }
          this.letrero(j, '¡ATAJADA!', 0x8aff8a);
          this.stats.atajadas[j.team]++;
          this.carga(j.team, 10);
        } else if (j === b.para && b.ultimo && b.ultimo.team === j.team) this.carga(j.team, 5);
        this.tomar(j);
        if (j.arquero) this.sacaArquero(j);
        if (j.team === 0 && j === this.js[0] && this.d.practica && this.paso === 0) this.sound.play('recoger', { volume: 0.3 });
        break;
      }
    }
  }

  private gol(team: 0 | 1) {
    const b = this.bola;
    this.goles[team]++;
    // la barra: algo para el que lo metió y más para el que lo recibió, para que se pueda devolver
    this.carga(team, 10);
    this.carga(team === 0 ? 1 : 0, 15);
    if (b.ultimo && b.ultimo.team === team) b.ultimo.goles++;
    if (team === 0 && this.d.practica) this.golesTuyos++;
    b.vx *= 0.2; b.vy = 0; b.vz = 0;
    this.pausa = 2.2;
    this.saque = team === 0 ? 1 : 0;
    flash(this, 150);
    this.sound.play('elegir', { volume: 0.5 });
    efecto(this, 'confeti', this.sx(team === 0 ? GOL[1] : GOL[0], PROF / 2), FT + PROF / 2 - 30, { depth: 6000 });
    for (const j of this.js) j.fig.set(j.team === team ? 'celebrate' : 'sad', true);
    const t = this.uiAdd(txt(this, 320, 110, '¡GOOOL!', 'fuente_titulo', 3).setDepth(8500).setTint(team === 0 ? 0x9ac8ff : 0xffa0a0));
    this.tweens.add({ targets: t, scale: { from: 5, to: 3 }, duration: 260, ease: 'Back.out' });
    this.time.delayedCall(1800, () => t.destroy());
    if (this.oro && !this.d.practica) this.time.delayedCall(1200, () => this.fin(team));
  }

  /** Se fue por la línea de fondo: saque del arquero de ese lado. */
  private afuera(lado: 0 | 1) {
    const arq = this.js.find((j) => j.team === lado && j.arquero);
    const b = this.bola;
    if (!arq) { b.vx = -b.vx * 0.4; b.x = Phaser.Math.Clamp(b.x, GOL[0] + 2, GOL[1] - 2); return; }
    this.tomar(arq);
    this.time.delayedCall(700, () => { if (b.dueño === arq) this.pasar(arq); });
  }

  /** La Marimonda cruza la cancha cada tanto; el balón que le pega, rebota. */
  private moverMarimonda(dt: number) {
    const m = this.mari;
    if (this.d.practica) return;
    // en el festejo del gol, la que está cruzando se para a bailar
    if (m.vx !== 0 && this.pausa > 0) return;
    if (m.vx === 0) {
      m.t -= dt;
      if (m.t > 0) return;
      m.vx = Math.random() < 0.5 ? 40 : -40; m.x = m.vx > 0 ? GOL[0] - 10 : GOL[1] + 10; m.y = Phaser.Math.Between(20, PROF - 20);
      this.letrero(null, '¡LA MARIMONDA!', 0xf070b0);
    }
    m.x += m.vx * dt;
    const b = this.bola;
    if (!b.dueño && Math.abs(b.x - m.x) < 9 && Math.abs(b.y - m.y) < 7 && b.z < 30) { b.vx = -b.vx * 0.6 + Math.sign(b.x - m.x) * 40; b.vy *= -0.5; this.sound.play('golpe', { volume: 0.2, rate: 1.6 }); }
    if (m.x < GOL[0] - 20 || m.x > GOL[1] + 20) { m.vx = 0; m.t = 14 + Math.random() * 10; }
  }

  private letrero(j: Jug | null, s: string, tint: number) {
    const x = j ? this.sx(j.x, j.y) : 320, y = j ? FT + j.y - 58 : 96;
    const t = this.add.bitmapText(x, y, 'fuente_ui', s).setOrigin(0.5).setDepth(6500).setTint(tint);
    this.tweens.add({ targets: t, y: t.y - 12, alpha: 0, delay: 600, duration: 400, onComplete: () => t.destroy() });
  }

  private sx(x: number, y: number) { return x + K * y; }

  private pintar() {
    for (const j of this.js) {
      j.fig.left = j.dir < 0;
      j.fig.row = j.st === 'vuela' && j.filaVuelo ? j.filaVuelo : 'right';
      j.fig.refresh();
      const x = Math.round(this.sx(j.x, j.y)), y = FT + j.y;
      j.fig.setPosition(x, Math.round(y - j.z)).setDepth(y);
      j.sombra.setPosition(x, y).setDepth(y - 0.5).setScale(Math.max(0.5, 1 - j.z / 120));
    }
    const b = this.bola;
    const sx = Math.round(this.sx(b.x, b.y));
    // en las manos del arquero, donde la pone la animación del kit
    const mano = b.dueño?.arquero ? b.dueño.fig.pelota() : null;
    // el balón por encima de los que están justo delante: en el montón no se perdía de vista (en las manos, con el que lo lleva)
    if (mano) b.spr.setPosition(Math.round(mano.x), Math.round(mano.y)).setDepth(b.dueño!.fig.depth + (mano.detras ? -0.1 : 0.1));
    else b.spr.setPosition(sx, Math.round(FT + b.y - b.z - 3)).setDepth(FT + b.y + 12).setRotation(b.spr.rotation + (b.dueño ? 0 : b.vx * 0.002));
    // el tiro Nekketsu: el balón achatado y en llamas, como el del tigre en Súper Campeones
    tiroSuper(this, b.spr, b.especial && !b.dueño);
    b.sombra.setPosition(sx, FT + b.y).setDepth(FT + b.y - 0.6).setScale(Math.max(0.4, 1 - b.z / 80));
    const m = this.mari;
    this.marimonda.setVisible(m.vx !== 0).setPosition(Math.round(this.sx(m.x, m.y)), FT + m.y).setDepth(FT + m.y).setFlipX(m.vx < 0);
    if (!this.mariKit) this.marimonda.setY(FT + m.y - Math.abs(Math.sin(this.time.now / 120)) * 3);
    else if (m.vx !== 0 && this.pausa <= 0) this.marimonda.play('npc_marimonda_caminar', true);
    else if (m.vx !== 0) this.marimonda.play('npc_marimonda_bailar', true);
    const c = this.ctrl;
    this.flecha.setVisible(!!c && this.fase === 'juego');
    if (c) this.flecha.setPosition(Math.round(this.sx(c.x, c.y)) - 4, Math.round(FT + c.y - c.z - 54 + Math.sin(this.time.now / 120) * 2));
  }

  private drawHud() {
    const g = this.hud;
    g.clear();
    if (this.d.practica) { this.marcadorTxt.setVisible(false); this.relojTxt.setText(''); return; }
    this.marcadorTxt.set(this.goles[0], this.goles[1]);
    const q = Math.max(0, TIEMPO - this.clock);
    this.relojTxt.setText(this.oro ? '¡GOL DE ORO!' : `${Math.floor(q / 60)}:${String(Math.floor(q % 60)).padStart(2, '0')}`);
    for (const t of [0, 1] as const) {
      const x = t === 0 ? 16 : 520, lleno = this.nek[t] >= 100;
      g.fillStyle(0x000000, 0.6).fillRect(x, 10, 104, 8);
      g.fillStyle(lleno ? (Math.floor(this.time.now / 150) % 2 ? 0xffe040 : 0xff6020) : t === 0 ? 0x5a9af0 : 0xf05a5a).fillRect(x + 2, 12, this.nek[t], 4);
    }
  }

  private fin(ganador: 0 | 1) {
    if (this.fase !== 'juego') return;
    this.fase = 'fin';
    for (const j of this.js) { j.st = 'libre'; j.fig.setAngle(0).set(j.team === ganador ? 'victory' : 'sad', true); }
    const de = (c: Competidor) => this.js.find((j) => j.id === c.id)!;
    const orden = [...this.gente].sort((a, b) => (a.team !== b.team ? (a.team === ganador ? -1 : 1) : de(b).goles - de(a).goles))
      .map((c) => ({ c, valor: `${de(c).goles} GOL${de(c).goles === 1 ? '' : 'ES'}` }));
    void this.banner(`¡${lado(ganador).gana}!`, 'fuente_titulo', 2, 1300).then(() => this.resultados(prueba('Futbol').nombre, orden));
  }
}
