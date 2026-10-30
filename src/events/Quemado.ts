import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { ajustes } from '../core/nivel';
import { efecto, tiroSuper } from '../core/fx';
import { chip } from '../core/music';
import { txt, flash, rafaga } from '../core/ui';
import { EventScene, prueba, type Competidor } from './base';
import { queueEscenario } from './escenario';
import { nuestros, ellos, lado } from '../core/equipos';
import type { Paso } from '../core/coach';
import type { Pad } from '../core/input';

/** la cancha, vista inclinada como la pelea: px = x + K * y, py = FT + y - z */
const FT = 214;
const K = 0.35;
const PROF = 100;
const X0 = 40, X1 = 560, MID = 300;
const G = 600;
/** la velocidad del salto para esquivar */
const SALTO_V = 190;
const TIEMPO = 120;
/** lo rápido de cada tiro */
const VEL = { normal: 240, corriendo: 310, salto: 290, especial: 410 } as const;
type Tiro = keyof typeof VEL;

interface Jug {
  id: string; team: 0 | 1; fig: Figura; sombra: Phaser.GameObjects.Ellipse;
  x: number; y: number; z: number; vz: number; dir: 1 | -1;
  /** en la cancha (true) o en el cementerio, detrás del rival */
  dentro: boolean; quemado: boolean;
  st: 'libre' | 'lanza' | 'pasa' | 'atrapa' | 'golpe';
  catchT: number; catchCool: number; empuje: number;
  /** saltando con dodge_jump (lote B4B6): la pose de bolita sigue el vuelo del salto */
  salto?: boolean;
  pend: Tiro | 'pase' | null; quemo: number;
  /** los golpes que aguanta antes de quedar quemado */
  vidas: number;
  /** la máquina: cuándo decide, adónde va y qué hace con el tiro que le viene */
  ia: { t: number; tx: number; ty: number; corre: boolean; plan: 'atrapa' | 'salta' | 'golpe' | null };
}
interface Bola {
  x: number; y: number; z: number; vx: number; vy: number; vz: number;
  st: 'mano' | 'tiro' | 'pase' | 'suelta';
  dueño: Jug | null; lanzador: Jug | null; objetivo: Jug | null; especial: boolean; t: number; tt: number; quieta: number;
  spr: Phaser.GameObjects.Image; sombra: Phaser.GameObjects.Ellipse; aura: Phaser.GameObjects.Particles.ParticleEmitter;
}

/**
 * Quemado Nekketsu en el patio techado del liceo (homenaje al primer juego, el de quemado). 4 contra 4: tres en la
 * cancha y uno en el cementerio, detrás del rival. Si te pega el balón sin atraparlo, quedas quemado y pasas al
 * cementerio, desde donde también puedes quemar; si quemas desde ahí, vuelves a la cancha. Pierde el equipo que se
 * queda sin nadie adentro.
 * Puño lanza (corriendo o saltando sale más fuerte), patada pasa o atrapa (justo antes de que llegue), salto esquiva,
 * y con la barra llena el ESPECIAL lanza el tiro Nekketsu (cuando lo lanza la máquina, avisa a quién va). El tiro de
 * tu equipo pasa por encima de tus compañeros; la barra se llena lanzando, quemando y atrapando.
 */
export class Quemado extends EventScene {
  private js: Jug[] = [];
  private bola!: Bola;
  private ctrl: Jug | null = null;
  private nek: [number, number] = [0, 0];
  private clock = 0;
  private subita = false;
  private hud!: Phaser.GameObjects.Graphics;
  private relojTxt!: Phaser.GameObjects.BitmapText;
  private flecha!: Phaser.GameObjects.Triangle;
  private caras: { j: Jug; img: Phaser.GameObjects.Image }[] = [];
  /** entrenamiento */
  private golpesKenji = 0;
  private atrapadas = 0;
  private esquivas = 0;
  private pasesFuera = 0;
  private paso = 0;
  /** para no repetir la pista del especial a cada toque */
  private pistaT = 0;
  /** para medir: tiros, golpes, atrapadas y esquivas de cada equipo */
  stats = { tiros: [0, 0], golpes: [0, 0], atrapadas: [0, 0], esquivas: [0, 0] };

  constructor() { super('Quemado'); }

  preload() { super.preload(); queueEscenario(this, 'liceo_patio'); }

  create() {
    this.js = [];
    this.ctrl = null;
    this.nek = [0, 0];
    this.clock = 0;
    this.subita = false;
    this.caras = [];
    this.golpesKenji = this.atrapadas = this.esquivas = this.pasesFuera = this.paso = 0;
    this.pistaT = 0;
    this.stats = { tiros: [0, 0], golpes: [0, 0], atrapadas: [0, 0], esquivas: [0, 0] };
    this.setup(1, 640);
    // el arte de PixelForja trae el patio, los letreros y la cancha con sus rayas; sin él, los de código
    if (!this.escenario('liceo_patio', 'bg_liceo')) {
      this.add.bitmapText(270, 75, 'fuente_ui', 'U.E. LICEO EL ÁVILA').setOrigin(0.5).setDepth(-9).setTint(0x2a5aa8).setScale(2);
      this.add.bitmapText(595, 113, 'fuente_ui', 'CANTINA').setOrigin(0.5).setDepth(-9).setTint(0xfff4d8);
      this.cancha();
    }
    this.armarEquipos();
    const spr = this.add.image(0, 0, 'armas', 'balon_goma_quieto_0').setScale(1.3);
    const sombra = this.add.ellipse(0, 0, 10, 3, 0x000000, 0.3);
    const aura = this.add.particles(0, 0, 'px', { lifespan: 320, scale: { start: 1.4, end: 0 }, alpha: { start: 0.8, end: 0 }, tint: [0xffe040, 0xff6020, 0xffffff], frequency: 16, emitting: false }).setDepth(4999);
    aura.startFollow(spr);
    this.bola = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, st: 'suelta', dueño: null, lanzador: null, objetivo: null, especial: false, t: 0, tt: 0, quieta: 0, spr, sombra, aura };
    // arranca con el balón en el medio, del lado de la Familia (entrenando, a tus pies)
    this.soltarEn(this.d.practica ? 180 : MID - 30, PROF / 2);
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.relojTxt = this.uiAdd(txt(this, 320, 14, '', 'fuente_titulo', 1).setDepth(8001));
    this.flecha = this.add.triangle(0, 0, 0, 0, 8, 0, 4, 6, 0xffe040).setDepth(6000);
    if (!this.d.practica) {
      this.js.forEach((j) => {
        const i = this.js.filter((o) => o.team === j.team).indexOf(j);
        const img = this.uiAdd(this.add.image(j.team === 0 ? 24 + i * 16 : 616 - i * 16, 16, 'cabecitas', j.id).setDepth(8001));
        this.caras.push({ j, img });
      });
    }
    this.tema('pana_dale');
    this.ambiente('liceo');
    this.cameras.main.centerOn(320, 180);
    if (this.d.practica) void this.entrenar('QUEMADO', this.pasos(), 40);
    else void this.previa('QUEMADO NEKKETSU', 'PATIO DEL LICEO, CARACAS', '{PUÑO} LANZA · {PATADA} PASA O ATRAPA · {SALTO} ESQUIVA · {ESPECIAL} CON LA BARRA LLENA');
  }

  private pasos(): Paso[] {
    const yo = () => this.js[0];
    return [
      { texto: 'CAMINA HASTA EL BALÓN CON\n{MOVER} PARA AGARRARLO', botones: ['stick'], antes: () => { this.paso = 0; }, listo: () => this.bola.dueño === yo() },
      { texto: `{PUÑO} LANZA. ¡QUÉMALO A ${this.rivalEntrenoNombre}!`, botones: ['punch'], antes: () => { this.paso = 1; }, listo: () => this.golpesKenji > 0 },
      { texto: `${this.rivalEntrenoNombre} TE LANZA: {PATADA} JUSTO\nANTES DE QUE TE LLEGUE ATRAPA`, botones: ['kick'], antes: () => { this.paso = 2; }, listo: () => this.atrapadas > 0 },
      { texto: 'SI VIENE MUY FUERTE, {SALTO}\nY PASA POR DEBAJO', botones: ['jump'], antes: () => { this.paso = 3; }, listo: () => this.esquivas > 0 },
      { texto: 'CON EL BALÓN, {PATADA} SE LO PASA A\nTU COMPAÑERO DEL CEMENTERIO', botones: ['kick'], antes: () => { this.paso = 4; }, listo: () => this.pasesFuera > 0 },
    ];
  }

  /** Las rayas de la cancha en el piso, con la línea del medio y las zonas del cementerio. */
  private cancha() {
    const g = this.add.graphics().setDepth(FT - 20);
    const P = (x: number, y: number) => new Phaser.Math.Vector2(x + K * y, FT + y);
    const linea = (a: Phaser.Math.Vector2, b: Phaser.Math.Vector2) => g.lineBetween(a.x, a.y, b.x, b.y);
    g.fillStyle(0x6a9a86, 0.5).fillPoints([P(X0, 0), P(X1, 0), P(X1, PROF), P(X0, PROF)], true);
    g.lineStyle(2, 0xf4ecd8, 0.9);
    linea(P(X0, 0), P(X1, 0)); linea(P(X0, PROF), P(X1, PROF)); linea(P(X0, 0), P(X0, PROF)); linea(P(X1, 0), P(X1, PROF));
    g.lineStyle(2, 0xf2c230, 0.95);
    linea(P(MID, 0), P(MID, PROF));
    // el círculo del centro
    for (let a = 0; a < Math.PI * 2; a += 0.2) { const b = a + 0.2; linea(P(MID + Math.cos(a) * 16, PROF / 2 + Math.sin(a) * 10), P(MID + Math.cos(b) * 16, PROF / 2 + Math.sin(b) * 10)); }
    // los cementerios, rayados
    g.lineStyle(1, 0xf4ecd8, 0.45);
    for (const [a, b] of [[X0 - 36, X0 - 6], [X1 + 6, X1 + 36]]) {
      linea(P(a, 0), P(b, 0)); linea(P(a, PROF), P(b, PROF)); linea(P(a, 0), P(a, PROF));
      for (let y = 10; y < PROF; y += 14) linea(P(a, y), P(b, y - 8));
    }
  }

  private armarEquipos() {
    const yo = this.d.jugador;
    const comp = this.gente[1]?.id;
    let fam: string[], inst: string[], fueraFam: string | null, fueraInst: string | null;
    if (this.d.practica) {
      // entrenando: tú en la cancha con un compañero en el cementerio, y Kenji solo del otro lado
      const otro = nuestros().find((f) => f !== yo)!;
      fam = [yo, otro]; inst = [ellos()[0]]; fueraFam = otro; fueraInst = null;
    } else {
      fam = [yo, ...nuestros().filter((f) => f !== yo)];
      fueraFam = fam.find((f) => f !== yo && f !== comp) ?? fam[3];
      const elegidos = [this.gente[2].id, this.gente[3].id];
      inst = [...elegidos, ...ellos().filter((i) => !elegidos.includes(i))];
      fueraInst = inst[3];
    }
    const poner = (ids: string[], team: 0 | 1, fuera: string | null) => {
      const adentro = ids.filter((i) => i !== fuera);
      ids.forEach((id) => {
        const dentro = id !== fuera;
        const k = adentro.indexOf(id);
        const x = dentro ? (team === 0 ? 120 + (k % 2) * 60 + k * 20 : 480 - (k % 2) * 60 - k * 20) : this.xFuera(team);
        const y = dentro ? 20 + k * 30 : PROF / 2;
        const fig = new Figura(this, 0, 0, id, 'idle');
        const sombra = this.add.ellipse(0, 0, 18, 5, 0x000000, 0.3);
        this.js.push({
          id, team, fig, sombra, x, y, z: 0, vz: 0, dir: team === 0 ? 1 : -1, dentro, quemado: false, st: 'libre',
          catchT: 0, catchCool: 0, empuje: 0, pend: null, quemo: 0, vidas: this.vidasDe(team), ia: { t: Math.random(), tx: x, ty: y, corre: false, plan: null },
        });
      });
    };
    poner(fam, 0, fueraFam);
    poner(inst, 1, fueraInst);
  }

  /** Tres golpes para quedar quemado; la Familia aguanta uno más en PASEO. */
  private vidasDe(team: 0 | 1) { return team === 0 && ajustes().nombre === 'PASEO' ? 4 : 3; }

  /** El centro del cementerio de un equipo: detrás de la cancha del otro. */
  private xFuera(team: 0 | 1) { return team === 0 ? X1 + 21 : X0 - 21; }

  /** Por dónde se puede mover cada uno: su mitad, o su cementerio. */
  private zona(j: Jug): [number, number] {
    if (j.dentro) return j.team === 0 ? [X0 + 6, MID - 8] : [MID + 8, X1 - 6];
    return j.team === 0 ? [X1 + 10, X1 + 32] : [X0 - 32, X0 - 10];
  }

  private enZona(j: Jug, x: number, m = 6) { const [a, b] = this.zona(j); return x >= a - m && x <= b + m; }
  private vivos(team: 0 | 1) { return this.js.filter((j) => j.team === team && j.dentro); }
  private fuera(team: 0 | 1) { return this.js.filter((j) => j.team === team && !j.dentro); }

  private soltarEn(x: number, y: number) {
    const b = this.bola;
    Object.assign(b, { x, y, z: 0, vx: 0, vy: 0, vz: 0, st: 'suelta', dueño: null, lanzador: null, objetivo: null, especial: false, quieta: 0 });
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
    if (!this.d.practica) {
      this.clock += dt;
      if (this.clock >= TIEMPO && !this.subita) {
        const a = this.vivos(0).length, b = this.vivos(1).length;
        if (a !== b) { this.fin(a > b ? 0 : 1); return; }
        this.subita = true;
        void this.banner('¡MUERTE SÚBITA!', 'fuente_titulo', 2, 1000);
      }
    }
    this.pistaT = Math.max(0, this.pistaT - dt);
    this.ctrl = this.control();
    for (const j of this.js) this.jugador(j, dt, p);
    this.moverBola(dt);
  }

  /** A quién manejas: al que tiene el balón, al que le van a lanzar, al que lo recibe o al más cerca del suelto. */
  private control(): Jug | null {
    const b = this.bola, prev = this.ctrl;
    if (b.dueño?.team === 0) return b.dueño;
    if ((b.st === 'tiro' || b.st === 'pase') && b.objetivo?.team === 0 && (b.st === 'pase' || b.lanzador?.team === 1)) return b.objetivo;
    const mios = this.js.filter((j) => j.team === 0 && j.st !== 'golpe');
    if (b.st === 'suelta') {
      const pueden = mios.filter((j) => this.enZona(j, b.x, 10));
      const dist = (j: Jug) => Math.hypot(j.x - b.x, j.y - b.y);
      const mejor = pueden.sort((a, c) => dist(a) - dist(c))[0];
      // el que ya manejas sigue siendo tuyo mientras no quede muy lejos: el stick no salta de un niño a otro
      if (mejor && prev && prev.team === 0 && pueden.includes(prev) && dist(prev) < dist(mejor) + 20) return prev;
      if (mejor) return mejor;
    }
    if (prev && prev.team === 0 && prev.dentro && prev.st !== 'golpe') return prev;
    return mios.filter((j) => j.dentro).sort((a, c) => Math.abs(a.x - b.x) - Math.abs(c.x - b.x))[0] ?? null;
  }

  private jugador(j: Jug, dt: number, p: Pad) {
    j.catchCool = Math.max(0, j.catchCool - dt);
    // el salto
    if (j.z > 0 || j.vz) { j.vz -= G * dt; j.z += j.vz * dt; if (j.z <= 0) { j.z = 0; j.vz = 0; j.fig.aplastar(); } }
    if (j.salto) {
      // el salto de bolita: la altura es la del salto de siempre (generosa para esquivar) y la pose va con el vuelo,
      // del despegue al aterriza de la animación
      const a = j.fig.anim;
      if (a.name !== 'dodge_jump' || (j.z === 0 && j.vz === 0)) j.salto = false;
      else {
        const vuelo = Phaser.Math.Clamp(0.5 - j.vz / (2 * SALTO_V), 0, 1);
        const d = Math.max(0, j.fig.cuadroDe('despegue')), t = j.fig.cuadroDe('aterriza');
        a.pos = d + ((t > d ? t : a.data.cuadros - 1) - d) * vuelo;
        j.fig.refresh();
      }
    }
    // el empujón del golpe
    if (j.empuje) { j.x += j.empuje * dt; j.empuje *= Math.pow(0.05, dt); if (Math.abs(j.empuje) < 4) j.empuje = 0; }
    if (j.st === 'golpe') {
      j.fig.step(dt);
      if (j.fig.anim.done) {
        j.st = 'libre';
        if (j.quemado) this.alCementerio(j);
      }
      this.limitar(j);
      return;
    }
    if (j.st === 'lanza' || j.st === 'pasa') {
      const ev = j.fig.step(dt);
      if (ev.some((e) => e.tipo === 'suelta') && this.bola.dueño === j) this.soltar(j);
      if (j.fig.anim.done) { j.st = 'libre'; if (this.bola.dueño === j) this.soltar(j); }
      return;
    }
    if (j.st === 'atrapa') {
      j.catchT -= dt;
      j.fig.step(dt);
      // con los brazos adelante esperando el balón: no abraza (el cuadro 2) hasta que le llega
      if (j.fig.anim.name === 'dodge_catch' && this.bola.dueño !== j && j.fig.anim.pos > 1.9) { j.fig.anim.pos = 1.9; j.fig.refresh(); }
      if (j.catchT <= 0) { j.st = 'libre'; j.catchCool = j.team === 0 ? 0.25 : 0.35; }
      return;
    }
    let vx = 0, vy = 0;
    if (j === this.ctrl) [vx, vy] = this.humano(j, p);
    else [vx, vy] = this.maquina(j, dt);
    if (j.st !== 'libre') return;
    j.x += vx * dt;
    j.y += vy * dt;
    this.limitar(j);
    // mira al rival; si va a buscar el balón suelto, para donde corre
    const haciaRival: 1 | -1 = (j.team === 0) === j.dentro ? 1 : -1;
    j.dir = this.bola.st === 'suelta' && Math.abs(vx) > 20 ? (vx > 0 ? 1 : -1) : haciaRival;
    const mueve = Math.hypot(vx, vy) > 8;
    if (j.salto) { /* la animación del salto sigue sola */ }
    else if (j.z > 0) j.fig.set(j.vz > 0 ? 'jump_rise' : 'jump_fall');
    else j.fig.set(mueve ? (Math.hypot(vx, vy) > 95 ? 'run' : 'walk') : 'idle');
    j.fig.step(dt, mueve ? Math.hypot(vx, vy) * dt : undefined);
  }

  private limitar(j: Jug) {
    const [a, b] = this.zona(j);
    j.x = Phaser.Math.Clamp(j.x, a, b);
    j.y = Phaser.Math.Clamp(j.y, 4, PROF - 4);
  }

  /** El salto para esquivar: el de bolita del kit (lote B4B6) o el salto de antes. */
  private saltar(j: Jug) {
    j.vz = SALTO_V;
    if (j.fig.anim.has('dodge_jump')) { j.salto = true; j.fig.set('dodge_jump', true, 0); }
  }

  /** Lo que haces tú con el que manejas. */
  private humano(j: Jug, p: Pad): [number, number] {
    const b = this.bola;
    const vel = p.run ? 125 : 78;
    if (p.pressed.jump && j.z === 0 && !j.salto) { this.saltar(j); chip.blip(520, 0.05, 'sq25', 0.12, 780); }
    if (b.dueño === j) {
      if (p.pressed.special && this.nek[j.team] >= 100) this.lanzar(j, 'especial');
      else if (p.pressed.punch) this.lanzar(j, j.z > 0 ? 'salto' : p.run && Math.abs(p.x) > 0 ? 'corriendo' : 'normal');
      else if (p.pressed.kick) this.pasar(j);
      else if (p.pressed.special) this.pista(j, '¡LLENA LA BARRA!');
    } else {
      if (p.pressed.kick && j.catchCool <= 0 && j.dentro) this.atrapar(j);
      else if (p.pressed.special) this.pista(j, this.nek[0] >= 100 ? '¡PRIMERO EL BALÓN!' : '¡LLENA LA BARRA!');
    }
    return [p.x * vel, p.y * vel * 0.7];
  }

  /** La máquina: lanza, pasa, busca el balón suelto, se aleja del que lo tiene y reacciona al tiro que le viene. */
  private maquina(j: Jug, dt: number): [number, number] {
    const b = this.bola;
    j.ia.t -= dt;
    const ir = (tx: number, ty: number, v: number): [number, number] => {
      const dx = tx - j.x, dy = ty - j.y, d = Math.hypot(dx, dy);
      return d < 3 ? [0, 0] : [(dx / d) * v, (dy / d) * v];
    };
    if (b.dueño === j) {
      if (this.d.practica) return this.kenjiEntrena(j);
      if (j.ia.corre) {
        if (j.ia.t <= 0 || Math.abs(j.x - (j.team === 1 ? MID + 12 : MID - 12)) < 6) { j.ia.corre = false; this.lanzar(j, 'corriendo'); return [0, 0]; }
        return ir(j.team === 1 ? MID + 12 : MID - 12, j.y, 125);
      }
      if (j.ia.t > 0) return [0, 0];
      const r = Math.random();
      const amigo = this.fuera(j.team)[0];
      if (j.dentro && amigo && r < 0.22) this.pasar(j);
      // el especial del rival: más seguido mientras más difícil el nivel
      else if (this.nek[j.team] >= 100 && Math.random() < (j.team === 1 ? 0.25 + 0.45 * ajustes().cpuAgresion : 0.7)) this.lanzar(j, 'especial');
      else if (j.dentro && r < 0.55) { j.ia.corre = true; j.ia.t = 0.7; }
      else this.lanzar(j, 'normal');
      return [0, 0];
    }
    // el tiro del rival que le viene (a él o de paso): atrapa, salta o se lo come, según lo que decidió al salir
    if (b.st === 'tiro' && b.lanzador && b.lanzador.team !== j.team && j.dentro && j.ia.plan) {
      const d = Math.hypot(b.x - j.x, b.y - j.y);
      // ¿le pasa cerca? por dónde va a cruzar el balón cuando llegue a donde está
      const viene = (j.x - b.x) * b.vx > 0;
      const cruza = b.y + b.vy * ((j.x - b.x) / (b.vx || 1));
      if (viene && (b.objetivo === j || Math.abs(cruza - j.y) < 12)) {
        if (j.ia.plan === 'atrapa' && d < 30 && j.catchCool <= 0) { this.atrapar(j); return [0, 0]; }
        if (j.ia.plan === 'salta' && d < 40 && j.z === 0 && !j.salto) this.saltar(j);
      }
      if (b.objetivo === j) return [0, 0];
    }
    // el balón suelto en su zona: va el que esté más cerca
    if (b.st === 'suelta' && this.enZona(j, b.x, 4)) {
      const otros = this.js.filter((o) => o.team === j.team && o !== this.ctrl && o.st === 'libre' && this.enZona(o, b.x, 4));
      const cerca = otros.sort((a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y))[0];
      if (cerca === j) return ir(b.x, b.y, 110);
    }
    // acomodarse: lejos del que tiene el balón si es del otro, cerca del medio si es nuestro
    if (j.ia.t <= 0) {
      j.ia.t = 1.1 + Math.random() * 1.2;
      const [a, c] = this.zona(j);
      const rival = b.dueño && b.dueño.team !== j.team ? b.dueño : null;
      if (!j.dentro) { j.ia.tx = (a + c) / 2; j.ia.ty = Phaser.Math.Clamp(b.y + (Math.random() - 0.5) * 30, 8, PROF - 8); }
      else if (rival) {
        j.ia.tx = j.team === 1 ? Phaser.Math.Between(MID + 60, c) : Phaser.Math.Between(a, MID - 60);
        j.ia.ty = rival.y > PROF / 2 ? Phaser.Math.Between(8, 40) : Phaser.Math.Between(60, PROF - 8);
      } else {
        j.ia.tx = j.team === 1 ? Phaser.Math.Between(MID + 30, MID + 140) : Phaser.Math.Between(MID - 140, MID - 30);
        j.ia.ty = Phaser.Math.Between(10, PROF - 10);
      }
    }
    return ir(j.ia.tx, j.ia.ty, 62);
  }

  /** Kenji entrenando: te devuelve el balón suave, y en los pasos de atrapar y esquivar te lo lanza. */
  private kenjiEntrena(j: Jug): [number, number] {
    if (j.ia.t > 0) return [0, 0];
    const paso = this.paso;
    if (paso === 2) this.lanzar(j, 'normal');
    else if (paso === 3) this.lanzar(j, 'corriendo');
    else this.pasar(j, this.js[0]);
    return [0, 0];
  }

  /** Arranca el lanzamiento: el balón sale en el cuadro de `suelta`. */
  private lanzar(j: Jug, tipo: Tiro) {
    if (this.bola.dueño !== j) return;
    j.st = 'lanza';
    j.pend = tipo;
    // el tiro del quemado (lote B7H8): rodilla arriba, el balón atrás y por arriba; si no, el de la pelea
    j.fig.set(j.fig.anim.has('dodge_throw') ? 'dodge_throw' : 'weapon_throw', true, tipo === 'especial' ? 0.7 : 1);
    if (tipo === 'especial') {
      this.nek[j.team] = 0;
      // la máquina avisa a quién se lo va a lanzar, para que alcances a atrapar o saltar
      const o = j.team === 1 ? this.apunta(j) : null;
      if (o) { this.letrero(o, '¡CUIDADO!', 0xff6060); chip.blip(880, 0.12, 'sq25', 0.15, 440); }
      efecto(this, 'aura_nekketsu', this.sx(j.x, j.y), FT + j.y - j.z, { depth: FT + j.y - 0.1 });
      chip.blip(220, 0.3, 'saw', 0.2, 880);
      if (j.team === 0) void this.banner('¡TIRO NEKKETSU!', 'fuente_titulo', 2, 700);
      this.uiAdd(rafaga(this));
    }
  }

  /** Le pasa el balón a un compañero: desde la cancha al del cementerio; desde el cementerio, al de la cancha. */
  private pasar(j: Jug, a?: Jug) {
    if (this.bola.dueño !== j) return;
    const para = a ?? (j.dentro ? this.fuera(j.team)[0] : null) ?? this.vivos(j.team).filter((o) => o !== j).sort((x, y) => Math.abs(x.y - j.y) - Math.abs(y.y - j.y))[0];
    if (!para) { this.lanzar(j, 'normal'); return; }
    j.st = 'pasa';
    j.pend = 'pase';
    j.ia.plan = null;
    this.bola.objetivo = para;
    j.fig.set(j.fig.anim.has('dodge_throw') ? 'dodge_throw' : 'weapon_throw', true, 0.9);
  }

  /** A quién le apunta: al rival de adentro más alineado contigo. */
  private apunta(j: Jug): Jug | null {
    const r = this.vivos(j.team === 0 ? 1 : 0).filter((o) => o.st !== 'golpe' && !o.quemado);
    return r.sort((a, b) => Math.abs(a.y - j.y) * 2 + Math.abs(a.x - j.x) * 0.3 - (Math.abs(b.y - j.y) * 2 + Math.abs(b.x - j.x) * 0.3))[0] ?? null;
  }

  /** El balón sale de la mano: un tiro recto al pecho del rival, o un pase bombeado. */
  private soltar(j: Jug) {
    const b = this.bola;
    const tipo = j.pend ?? 'normal';
    j.pend = null;
    b.dueño = null;
    b.lanzador = j;
    b.t = 0;
    b.x = j.x + j.dir * 8; b.y = j.y; b.z = j.z + 24;
    if (tipo === 'pase') {
      const o = b.objetivo!;
      const d = Math.hypot(o.x - b.x, o.y - b.y);
      b.tt = d / 220 + 0.15;
      b.vx = (o.x - b.x) / b.tt; b.vy = (o.y - b.y) / b.tt;
      b.vz = (20 - b.z) / b.tt + 0.5 * 500 * b.tt;
      b.st = 'pase';
      b.especial = false;
      this.sound.play('esquiva', { volume: 0.2, rate: 1.3 });
      return;
    }
    const o = this.apunta(j);
    const lento = j.team === 1 && (this.d.practica ? 0.75 : ajustes().nombre === 'PASEO' ? 0.8 : ajustes().nombre === 'NORMAL' ? 0.9 : 1);
    const v = VEL[tipo as Tiro] * (lento || 1);
    const tx = o ? o.x : j.team === 0 ? 640 : 0, ty = o ? o.y : j.y;
    const d = Math.max(20, Math.hypot(tx - b.x, ty - b.y));
    b.tt = d / v;
    b.vx = (tx - b.x) / b.tt; b.vy = (ty - b.y) / b.tt; b.vz = (16 - b.z) / b.tt;
    b.st = 'tiro';
    b.objetivo = o;
    b.especial = tipo === 'especial';
    this.carga(j.team, 8);
    this.stats.tiros[j.team]++;
    // la máquina decide qué hace con el tiro que le viene: el blanco y los que están de paso, de los dos equipos (tus
    // compañeros, parejos pero no perfectos). Al blanco de tu equipo lo manejas tú
    const fuerte = tipo === 'corriendo' || tipo === 'salto' ? 0.6 : 1;
    for (const r of this.js) {
      r.ia.plan = null;
      if (r.team === j.team || !r.dentro || (o === r && r.team === 0)) continue;
      const ag = ajustes().cpuAgresion;
      const pc = this.d.practica ? 0 : b.especial ? 0.08 : r.team === 1 ? (0.18 + 0.3 * ag) * fuerte : 0.35 * fuerte;
      const pd = this.d.practica ? 0 : r.team === 1 ? 0.2 : 0.3;
      const x = Math.random();
      // tus compañeros siempre hacen algo: atrapan o saltan (los que se lo comen son los rivales)
      r.ia.plan = r.team === 0 && !this.d.practica ? (x < pc ? 'atrapa' : 'salta') : x < pc ? 'atrapa' : x < pc + pd ? 'salta' : 'golpe';
    }
    this.sound.play('esquiva', { volume: b.especial ? 0.6 : 0.35, rate: b.especial ? 0.7 : 1 });
    if (b.especial) this.cameras.main.shake(120, 0.006);
  }

  /** Con patada, sin balón: la guardia de atrapar, que dura un ratico. */
  private atrapar(j: Jug) {
    j.st = 'atrapa';
    // la ventana para atrapar: la tuya más ancha en PASEO y NORMAL; la máquina, cortica
    const n = ajustes().nombre;
    j.catchT = j.team === 1 ? 0.28 : n === 'PASEO' ? 0.45 : n === 'NORMAL' ? 0.38 : 0.34;
    // la atrapada del quemado (lote B7: agachado, los brazos adelante), la de béisbol o la guardia de la pelea
    j.fig.set(j.fig.anim.has('dodge_catch') ? 'dodge_catch' : j.fig.anim.has('catch') ? 'catch' : 'fight_block', true);
  }

  private moverBola(dt: number) {
    const b = this.bola;
    b.t += dt;
    if (b.st === 'mano') return;
    if (b.st === 'tiro') {
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
      // pasado el blanco, se cae
      if (b.t > b.tt * 1.05) b.vz -= 500 * dt;
      const L = b.lanzador!;
      for (const o of this.js) {
        if (o === L || o.st === 'golpe' || o.quemado || b.st !== 'tiro') continue;
        if (Math.abs(o.x - b.x) > 9 || Math.abs(o.y - b.y) > 8) continue;
        // en el salto de bolita, con la elevación por encima de 8 px, el balón pasa por debajo
        const bolita = o.z > 8 && o.team !== L.team && o.dentro;
        if (!bolita && (b.z < o.z - 2 || b.z > o.z + 40)) continue;
        // el tiro pasa por encima de tus compañeros en la cancha (no lo tapan); el del cementerio, detrás del rival,
        // sí recibe el que pasó de largo
        if (o.team === L.team) { if (!o.dentro && b.t > 0.2) this.agarra(o); continue; }
        if (!o.dentro) continue;
        // el especial casi no se atrapa; el tuyo, más en los niveles fáciles
        if (o.st === 'atrapa' && (!b.especial || Math.random() < (o.team === 0 ? 0.15 + 0.45 * ajustes().ayuda : 0.15))) this.agarra(o, true);
        else if (bolita || o.z > 12) { this.stats.esquivas[o.team]++; if (o.team === 0 && o === b.objetivo) { this.esquivas++; this.letrero(o, '¡ESQUIVÓ!', 0x8ae0ff); } }
        else this.golpe(o);
      }
      if (b.st === 'tiro') this.bordes(b);
      if (b.st === 'tiro' && b.z <= 0) { b.z = 0; b.vz = 70; b.vx *= 0.5; b.vy *= 0.5; b.st = 'suelta'; }
    } else if (b.st === 'pase') {
      b.x += b.vx * dt; b.y += b.vy * dt; b.vz -= 500 * dt; b.z += b.vz * dt;
      for (const o of this.js) {
        if (o.team !== b.lanzador!.team || o === b.lanzador || o.st === 'golpe') continue;
        if (Math.abs(o.x - b.x) < 12 && Math.abs(o.y - b.y) < 12 && b.z < o.z + 44 && b.t > 0.15) {
          if (this.d.practica && o.team === 0 && !o.dentro) this.pasesFuera++;
          this.agarra(o);
          break;
        }
      }
      if (b.st === 'pase') this.bordes(b);
      if (b.st === 'pase' && b.z <= 0) { b.z = 0; b.vz = 60; b.st = 'suelta'; }
    } else {
      // suelto: rebota, rueda y frena
      b.vz -= G * dt; b.z += b.vz * dt;
      if (b.z <= 0) { b.z = 0; b.vz = Math.abs(b.vz) > 50 ? -b.vz * 0.4 : 0; }
      const f = Math.pow(b.z === 0 ? 0.25 : 0.8, dt);
      b.vx *= f; b.vy *= f;
      b.x += b.vx * dt; b.y += b.vy * dt;
      this.bordes(b);
      const quieto = Math.hypot(b.vx, b.vy) < 6 && b.z === 0;
      b.quieta = quieto ? b.quieta + dt : 0;
      for (const o of this.js) {
        if (o.st !== 'libre' || !this.enZona(o, b.x, 6)) continue;
        if (Math.abs(o.x - b.x) < 10 && Math.abs(o.y - b.y) < 8 && b.z < o.z + 16) { this.agarra(o); break; }
      }
      // si quedó donde nadie puede ir, se lo dan al equipo de ese lado
      if (b.st === 'suelta' && b.quieta > 0.8 && !this.js.some((o) => o.st !== 'golpe' && this.enZona(o, b.x, 6))) {
        const team: 0 | 1 = b.x < MID ? 0 : 1;
        const a = this.vivos(team)[0] ?? this.js.find((o) => o.team === team);
        if (a) { this.agarra(a); this.letrero(a, '¡SAQUE!', 0xffe080); }
      }
    }
  }

  private bordes(b: Bola) {
    if (b.x < -6 || b.x > 646) { b.x = Phaser.Math.Clamp(b.x, -6, 646); b.vx = -b.vx * 0.35; b.st = 'suelta'; }
    if (b.y < 0 || b.y > PROF) { b.y = Phaser.Math.Clamp(b.y, 0, PROF); b.vy = -b.vy * 0.35; if (b.st === 'tiro') { b.st = 'suelta'; b.vx *= 0.5; } }
  }

  /** Se queda con el balón. `atrapo`: lo atrapó de un tiro del rival. */
  private agarra(o: Jug, atrapo = false) {
    const b = this.bola;
    b.st = 'mano'; b.dueño = o; b.objetivo = null; b.especial = false; b.lanzador = null; b.quieta = 0;
    o.ia.plan = null;
    // el rival se la piensa más en los niveles fáciles antes de lanzar
    o.ia.t = (0.9 + Math.random() * 0.9) / (o.team === 1 && !this.d.practica ? Math.max(0.5, ajustes().cpuAgresion) : 1);
    o.ia.corre = false;
    if (o.st === 'atrapa') { o.st = 'libre'; o.catchT = 0; }
    this.sound.play('recoger', { volume: 0.3 });
    if (atrapo) {
      this.stats.atrapadas[o.team]++;
      this.carga(o.team, 25);
      o.empuje = -o.dir * 50;
      this.sound.play('bloqueo', { volume: 0.5 });
      this.letrero(o, '¡ATRAPADO!', 0x8aff8a);
      // lo abraza contra el pecho desde el atrapa y se endereza; mientras, no se mueve
      if (o.fig.anim.has('dodge_catch')) {
        o.fig.contacto('dodge_catch', 'catch');
        o.st = 'atrapa';
        o.catchT = Math.max(0.1, (o.fig.anim.data.cuadros - o.fig.anim.pos) / o.fig.anim.data.fps);
      }
      if (o.team === 0 && this.d.practica) this.atrapadas++;
      if (o.team === 0) chip.blip(1320, 0.08, 'sq25', 0.2, 1760);
    }
  }

  /** ¡Quemado! Si fue desde el cementerio, el que lanzó vuelve a la cancha. */
  private golpe(o: Jug) {
    const b = this.bola, L = b.lanzador!;
    o.st = 'golpe';
    // el balonazo (lote B7H8): sale disparado de espaldas y cae sentado, empujado hacia atrás mientras vuela
    if (o.fig.anim.has('dodge_hit')) o.fig.set('dodge_hit', true, 0.8);
    else o.fig.set('knockout', true, 1.4);
    o.empuje = Math.sign(b.vx || 1) * 80;
    o.dir = b.vx > 0 ? -1 : 1;
    efecto(this, b.especial ? 'chispa_golpe_pesado' : 'chispa_golpe_medio', this.sx(o.x, o.y), FT + o.y - o.z - 18, { depth: 6000 });
    this.sound.play('golpe', { volume: 0.5 });
    this.cameras.main.shake(b.especial ? 220 : 100, b.especial ? 0.012 : 0.005);
    if (b.especial) flash(this, 120);
    b.vx *= -0.25; b.vy = (Math.random() - 0.5) * 40; b.vz = 120; b.st = 'suelta';
    L.quemo++;
    this.stats.golpes[L.team]++;
    this.carga(L.team, 20);
    if (this.d.practica) { if (o.team === 1) this.golpesKenji++; this.letrero(o, '¡PAF!', 0xffe080); return; }
    o.vidas--;
    if (o.vidas > 0) { this.letrero(o, o.vidas === 1 ? '¡UNA MÁS Y SE QUEMA!' : '¡PAF!', 0xffe080); return; }
    o.quemado = true;
    this.letrero(o, '¡QUEMADO!', 0xff6060);
    if (!L.dentro) {
      L.dentro = true;
      L.vidas = this.vidasDe(L.team);
      L.x = L.team === 0 ? X0 + 30 : X1 - 30;
      efecto(this, 'polvo_caer_medio', this.sx(L.x, L.y), FT + L.y);
      this.letrero(L, `¡${this.nombre(L.id)} VUELVE!`, 0x8ae0ff);
    }
    // la muerte súbita (o el último de adentro) se decide aquí
    if (this.subita || this.vivos(o.team).filter((j) => !j.quemado).length === 0) this.time.delayedCall(900, () => this.fin(o.team === 0 ? 1 : 0));
  }

  private alCementerio(j: Jug) {
    j.dentro = false;
    j.quemado = false;
    j.x = this.xFuera(j.team);
    j.y = Phaser.Math.Between(20, PROF - 20);
    j.z = 0;
    efecto(this, 'polvo_caer_medio', this.sx(j.x, j.y), FT + j.y);
  }

  /** Llena la barra Nekketsu de un equipo; al llenarse la tuya, avisa. */
  private carga(team: 0 | 1, n: number) {
    const antes = this.nek[team];
    this.nek[team] = Math.min(100, antes + n);
    if (team === 0 && antes < 100 && this.nek[0] >= 100) {
      const j = this.ctrl ?? this.js[0];
      this.letrero(j, '¡BARRA LLENA!', 0xffe040);
      this.sound.play('elegir', { volume: 0.4, rate: 1.4 });
    }
  }

  /** La pista cortica cuando aprietas especial y todavía no se puede. */
  private pista(j: Jug, s: string) {
    if (this.pistaT > 0) return;
    this.pistaT = 1.2;
    this.letrero(j, s, 0xffe080);
  }

  private letrero(j: Jug, s: string, tint: number) {
    const t = this.add.bitmapText(this.sx(j.x, j.y), FT + j.y - 58, 'fuente_ui', s).setOrigin(0.5).setDepth(6500).setTint(tint);
    this.tweens.add({ targets: t, y: t.y - 12, alpha: 0, delay: 600, duration: 400, onComplete: () => t.destroy() });
  }

  private sx(x: number, y: number) { return x + K * y; }

  /** Pone cada figura, su sombra y el balón en pantalla. */
  private pintar() {
    for (const j of this.js) {
      j.fig.left = j.dir < 0;
      j.fig.row = 'right';
      j.fig.refresh();
      const x = Math.round(this.sx(j.x, j.y)), y = FT + j.y;
      j.fig.setPosition(x, Math.round(y - j.z)).setDepth(y).setAlpha(j.dentro || j.st === 'golpe' ? 1 : 0.85);
      j.sombra.setPosition(x, y).setDepth(y - 0.5).setScale(Math.max(0.5, 1 - j.z / 120));
    }
    const b = this.bola, s = b.spr;
    if (b.st === 'mano' && b.dueño) {
      const o = b.dueño, a = o.fig.anim;
      const mano = a.data.manos?.[o.fig.rowIndex]?.[a.frame]?.[0] ?? [8, -22];
      const [hx, hy] = o.fig.mirror(mano);
      b.x = o.x; b.y = o.y; b.z = o.z;
      s.setFrame('balon_goma_quieto_0').setOrigin(0.5, 0.5).setPosition(Math.round(this.sx(o.x, o.y) + hx), Math.round(FT + o.y - o.z + hy)).setDepth(FT + o.y + 0.3);
      // recién atrapado, contra el pecho donde lo pone la atrapada del kit
      // y en el tiro del kit, donde lo lleva la mano (detrás de la cabeza en el impulso)
      const pe = a.name === 'catch' || a.name === 'dodge_catch' || a.name === 'dodge_throw' ? o.fig.pelota() : null;
      if (pe) s.setPosition(Math.round(pe.x), Math.round(pe.y)).setDepth(FT + o.y + (pe.detras ? -0.3 : 0.3));
      b.sombra.setVisible(false);
    } else {
      const vuela = b.z > 1;
      s.setFrame(vuela ? `balon_goma_girando_${Math.floor(b.t * 16) % 8}` : 'balon_goma_quieto_0').setOrigin(0.5, 0.5);
      s.setPosition(Math.round(this.sx(b.x, b.y)), Math.round(FT + b.y - b.z - 4)).setDepth(FT + b.y + 0.3);
      b.sombra.setVisible(true).setPosition(Math.round(this.sx(b.x, b.y)), FT + b.y).setDepth(FT + b.y - 0.6).setScale(Math.max(0.4, 1 - b.z / 80));
    }
    // el tiro Nekketsu: el balón achatado y en llamas
    tiroSuper(this, s, b.especial && b.st === 'tiro');
    b.aura.emitting = b.especial && b.st === 'tiro';
    const c = this.ctrl;
    this.flecha.setVisible(!!c && this.fase === 'juego');
    if (c) this.flecha.setPosition(Math.round(this.sx(c.x, c.y)) - 4, Math.round(FT + c.y - c.z - 54 + Math.sin(this.time.now / 120) * 2));
  }

  private drawHud() {
    const g = this.hud;
    g.clear();
    if (this.d.practica) return;
    const quedan = Math.max(0, TIEMPO - this.clock);
    this.relojTxt.setText(this.subita ? '¡SÚBITA!' : `${Math.floor(quedan / 60)}:${String(Math.floor(quedan % 60)).padStart(2, '0')}`);
    // las caras: brillantes adentro, grises en el cementerio
    for (const { j, img } of this.caras) {
      img.setTint(j.dentro ? 0xffffff : 0x505060).setAlpha(j.dentro ? 1 : 0.7);
      // las vidas: puntitos debajo de la cara
      if (j.dentro) for (let k = 0; k < j.vidas; k++) g.fillStyle(0xff5a7a).fillRect(img.x - 5 + k * 4, 25, 3, 3);
    }
    // la barra Nekketsu de cada equipo
    for (const t of [0, 1] as const) {
      const x = t === 0 ? 16 : 520, lleno = this.nek[t] >= 100;
      g.fillStyle(0x000000, 0.6).fillRect(x, 32, 104, 8);
      g.fillStyle(lleno ? (Math.floor(this.time.now / 150) % 2 ? 0xffe040 : 0xff6020) : t === 0 ? 0x5a9af0 : 0xf05a5a).fillRect(x + 2, 34, this.nek[t], 4);
    }
  }

  private fin(ganador: 0 | 1) {
    if (this.fase !== 'juego') return;
    this.fase = 'fin';
    const de = (c: Competidor) => this.js.find((j) => j.id === c.id)!;
    const orden = [...this.gente].sort((a, b) => {
      const ja = de(a), jb = de(b);
      if (a.team !== b.team) return a.team === ganador ? -1 : 1;
      return Number(jb.dentro) - Number(ja.dentro) || jb.quemo - ja.quemo;
    }).map((c) => ({ c, valor: `QUEMÓ ${de(c).quemo}` }));
    for (const j of this.js) if (j.st !== 'golpe') { j.fig.set(j.team === ganador ? 'celebrate' : 'sad', true); j.st = 'libre'; }
    void this.banner(`¡${lado(ganador).gana}!`, 'fuente_titulo', 2, 1300).then(() => this.resultados(prueba('Quemado').nombre, orden));
  }
}
