import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { ajustes } from '../core/nivel';
import { efecto } from '../core/fx';
import { chip } from '../core/music';
import { txt, flash } from '../core/ui';
import { Painter, hex } from '../gfx/paint';
import { EventScene, prueba, type Competidor } from './base';
import type { Paso } from '../core/coach';
import { rotular, type Pad } from '../core/input';

/** vista de lado: los pies van en PISO y la altura (z) sube */
const PISO = 316;
const ZOOM = 1.2;
const WORLD = 900;
const BAT_X = 100;
/** el punto donde el palo le pega a la chapa, delante del bateador */
const CONTACTO = BAT_X + 11;
const PIT_X = 330;
const FIELD_X = 480;
/** la casa del vecino: su pared, su techo y la ventana */
const CASA_X = 640, CASA_W = 170, CASA_H = 100;
const VENTANA = { x0: 646, x1: 682, z0: 40, z1: 64 };
const G = 260;
const INNINGS = 3;
/** a lo sumo cinco bateadores por mitad, para que no se haga eterno */
const TURNOS = 5;
/** las alturas del swing: qué tan alto llega el palo (con flecha arriba, sin flecha y con flecha abajo) */
const BANDA = { alta: [16, 40], media: [8, 30], baja: [-2, 16] } as const;
const ANGULO = { alta: 40, media: 22, baja: 7 } as const;
type Altura = keyof typeof BANDA;
type Lanz = 'recta' | 'sube' | 'baja';

interface Jug { c: Competidor; fig: Figura; carreras: number; ponches: number }
interface Chapa {
  x: number; z: number; vx: number; vz: number;
  st: 'mano' | 'lanzada' | 'bateada' | 'quieta';
  tipo: Lanz; x0: number; t: number; tt: number; botes: number; jonron: boolean; resuelta: boolean;
  spr: Phaser.GameObjects.Image; sombra: Phaser.GameObjects.Ellipse;
}

/**
 * Chapita, béisbol de calle venezolano: chapas de refresco y un palo de escoba, en la calle de un barrio de Caracas.
 * Bateas con puño justo antes de que llegue la chapa (con la flecha arriba la mandas alta, abajo rasante). Lanzas con
 * puño (recta) o patada (curva, que sube o baja con la flecha). Tres strikes es ponche, la que atrapa el del campo es
 * out, y según lo lejos que llegue es sencillo, doble o triple. Por encima de la casa del vecino es jonrón; si rompe
 * la ventana, sale la señora Carmen con la chancleta. Tres innings cortos.
 */
export class Chapita extends EventScene {
  private eq: [Jug[], Jug[]] = [[], []];
  private bat!: Jug;
  private pit!: Jug;
  private field: Jug | null = null;
  private chapa!: Chapa;
  private inning = 1;
  private abajo = false;
  private outs = 0;
  private strikes = 0;
  private turnos = 0;
  private orden: [number, number] = [0, 0];
  private carreras: [number, number] = [0, 0];
  private st: 'prepara' | 'lanza' | 'vuela' | 'resultado' | 'cambio' = 'cambio';
  private espera = 0;
  private swing: { altura: Altura; hecho: boolean } | null = null;
  private quiereLanz: Lanz | null = null;
  private fx = 0;
  private fieldVx = 0;
  private fieldZ = 0;
  private camX = 230;
  private bg!: Phaser.GameObjects.TileSprite;
  private palo!: Phaser.GameObjects.Image;
  private chapaMano!: Phaser.GameObjects.Image;
  private vidrio!: Phaser.GameObjects.Image;
  private carmen!: Phaser.GameObjects.Image;
  private hud!: Phaser.GameObjects.Graphics;
  private marcadorTxt!: Phaser.GameObjects.BitmapText;
  private inningTxt!: Phaser.GameObjects.BitmapText;
  private ayudaTxt!: Phaser.GameObjects.BitmapText;
  /** entrenamiento */
  private paso = 0;
  private contactos = 0;
  private contactosCurva = 0;
  private mejor = 0;
  private lanzadas = 0;
  private ponchesTuyos = 0;

  constructor() { super('Chapita'); }

  create() {
    this.inning = 1; this.abajo = false; this.outs = 0; this.strikes = 0; this.turnos = 0;
    this.orden = [0, 0]; this.carreras = [0, 0]; this.st = 'cambio'; this.espera = 0; this.swing = null; this.quiereLanz = null;
    this.paso = this.contactos = this.contactosCurva = this.mejor = this.lanzadas = this.ponchesTuyos = 0;
    this.camX = 230;
    this.setup(ZOOM, WORLD);
    this.texturas();
    this.bg = this.fondo('bg_barrio');
    // la calle: el home con tiza y la caja de cartón que hace de receptor
    const tiza = this.add.graphics().setDepth(PISO - 5);
    tiza.lineStyle(1, 0xf4f4ec, 0.8).strokeRect(BAT_X - 6, PISO - 2, 22, 6).lineBetween(PIT_X - 4, PISO + 2, PIT_X + 4, PISO + 2);
    this.add.image(BAT_X - 26, PISO, 'chap_caja').setOrigin(0.5, 1).setDepth(PISO - 2);
    this.add.image(CASA_X, PISO, 'chap_casa').setOrigin(0, 1).setDepth(PISO - 20);
    this.add.bitmapText(CASA_X + 110, PISO - 76, 'fuente_ui', 'HIELITOS').setOrigin(0.5).setDepth(PISO - 19).setTint(0x2a5ad0);
    this.vidrio = this.add.image(VENTANA.x0, PISO - VENTANA.z1, 'chap_vidrio_roto').setOrigin(0, 0).setDepth(PISO - 18).setVisible(false);
    this.carmen = this.add.image((VENTANA.x0 + VENTANA.x1) / 2, PISO - VENTANA.z0, 'chap_carmen').setOrigin(0.5, 1).setDepth(PISO - 17).setVisible(false);
    this.armar();
    this.palo = this.add.image(0, 0, 'armas', 'broomstick_mano_0').setDepth(PISO + 1);
    this.chapaMano = this.add.image(0, 0, 'armas', 'chapa_mano_0').setDepth(PISO + 1).setVisible(false);
    const spr = this.add.image(0, 0, 'armas', 'chapa_girando_0').setScale(1.4).setDepth(PISO + 2);
    const sombra = this.add.ellipse(0, PISO, 6, 2, 0x000000, 0.3).setDepth(PISO - 1);
    this.chapa = { x: 0, z: 0, vx: 0, vz: 0, st: 'mano', tipo: 'recta', x0: 0, t: 0, tt: 1, botes: 0, jonron: false, resuelta: false, spr, sombra };
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.marcadorTxt = this.uiAdd(txt(this, 320, 14, '', 'fuente_titulo', 1).setDepth(8001));
    this.inningTxt = this.uiAdd(txt(this, 320, 34, '', 'fuente_ui', 1).setDepth(8001).setTint(0xffe080));
    this.ayudaTxt = this.uiAdd(txt(this, 320, 340, '', 'fuente_ui', 1).setDepth(8001).setTint(0xffffff));
    if (this.d.practica) this.ayudaTxt.setY(326);
    this.mitad();
    this.tema('pana_dale');
    this.cameras.main.centerOn(this.camX, 360 - 180 / ZOOM);
    if (this.d.practica) void this.entrenar('CHAPITA', this.pasos(), 40);
    else void this.previa('CHAPITA', 'BARRIO DE CARACAS, VENEZUELA', '{PUÑO} BATEA · {MOVER} ARRIBA LA MANDA ALTA · LANZANDO: {PUÑO} RECTA, {PATADA} CURVA');
  }

  private pasos(): Paso[] {
    return [
      { texto: 'LA CHAPA VIENE: {PUÑO} BATEA\nUN PELITO ANTES DE QUE LLEGUE', botones: ['punch'], antes: () => { this.paso = 0; }, listo: () => this.contactos > 0 },
      { texto: 'MANTÉN {MOVER} ARRIBA PARA MANDARLA\nALTA. ¡PASA LOS 30 M!', botones: ['stick', 'punch'], antes: () => { this.paso = 1; }, listo: () => this.mejor >= 300 },
      { texto: 'AHORA CURVAS: SI LA CHAPA SUBE,\nARRIBA; SI BAJA, ABAJO', botones: ['stick', 'punch'], antes: () => { this.paso = 2; }, listo: () => this.contactosCurva > 0 },
      { texto: 'TE TOCA LANZAR: {PUÑO} RECTA,\n{PATADA} CURVA. ¡PONCHA A KENJI!', botones: ['punch', 'kick'], antes: () => { this.paso = 3; this.cambiarEntrenamiento(); }, listo: () => this.ponchesTuyos > 0 || this.lanzadas >= 8 },
    ];
  }

  private texturas() {
    if (this.textures.exists('chap_casa')) return;
    const C = (s: string) => hex(s);
    // la casa del vecino: dos pisos verde pastel, la ventana con reja, el tanque y el letrero de hielitos
    const c = new Painter(CASA_W, CASA_H + 14);
    c.rect(0, 14, CASA_W, CASA_H, C('#9ad0a0'));
    c.rect(CASA_W - 4, 14, 4, CASA_H, C('#7ab080'));
    for (let y = 30; y < CASA_H + 14; y += 6) c.rect(0, y, CASA_W, 1, C('#8ac090'));
    c.rect(0, 10, CASA_W, 4, C('#8a8a8a'));
    c.rect(120, 0, 22, 10, C('#2a6ad0')); c.rect(120, 0, 22, 2, C('#5a9af0'));
    const vy = CASA_H + 14 - VENTANA.z1, vh = VENTANA.z1 - VENTANA.z0, vx = VENTANA.x0 - CASA_X, vw = VENTANA.x1 - VENTANA.x0;
    c.rect(vx - 2, vy - 2, vw + 4, vh + 4, C('#f4f4ec'));
    c.rect(vx, vy, vw, vh, C('#8ac8f0'));
    c.rect(vx + 2, vy + 2, 8, 4, C('#d8f0ff'));
    for (let k = 0; k < vw; k += 6) c.rect(vx + k, vy, 1, vh, C('#2a2a2a'));
    c.rect(vx, vy + vh / 2, vw, 1, C('#2a2a2a'));
    c.rect(90, 30, 46, 14, C('#f4f0e2'));
    c.rect(100, CASA_H + 14 - 30, 18, 30, C('#6a3a1a'));
    c.rect(20, CASA_H + 14 - 28, 22, 18, C('#3a4a5a'));
    for (let k = 0; k < 22; k += 4) c.rect(20 + k, CASA_H + 14 - 28, 1, 18, C('#2a2a2a'));
    this.textures.addCanvas('chap_casa', c.done());
    // el vidrio roto
    const v = new Painter(VENTANA.x1 - VENTANA.x0, VENTANA.z1 - VENTANA.z0);
    v.rect(0, 0, v.w, v.h, C('#2a3a4a'));
    const cx = v.w / 2, cy = v.h / 2;
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; v.line(cx, cy, cx + Math.cos(a) * 20, cy + Math.sin(a) * 14, C('#d8f0ff')); }
    for (let k = 0; k < v.w; k += 6) v.rect(k, 0, 1, v.h, C('#2a2a2a'));
    this.textures.addCanvas('chap_vidrio_roto', v.done());
    // la señora Carmen asomada: rulos rosados, bata de flores y cara de brava
    const q = new Painter(22, 26);
    for (let k = 0; k < 5; k++) q.circle(4 + k * 3.5, 4, 2, C('#f070b0'));
    q.circle(11, 10, 6, C('#c08a5a'));
    q.rect(7, 9, 3, 1, C('#2a1a10')); q.rect(12, 9, 3, 1, C('#2a1a10'));
    q.rect(7, 7, 3, 1, C('#2a1a10')); q.rect(12, 7, 3, 1, C('#2a1a10'));
    q.rect(9, 13, 4, 1, C('#8a2a2a'));
    q.rect(3, 16, 16, 10, C('#f4d0e0'));
    for (let i = 0; i < 12; i++) q.px(4 + ((i * 7) % 14), 17 + ((i * 5) % 8), i % 2 ? C('#e83a5a') : C('#3ac06a'));
    this.textures.addCanvas('chap_carmen', q.done());
    // la caja de cartón que hace de receptor
    const k = new Painter(18, 14);
    k.rect(0, 0, 18, 14, C('#c8a070')); k.rect(0, 0, 18, 2, C('#e0bc8a')); k.rect(8, 0, 2, 14, C('#a88050'));
    this.textures.addCanvas('chap_caja', k.done());
  }

  /** Los dos equipos: tú y tu compañero, contra los dos del Instituto. Entrenando, tú y Kenji. */
  private armar() {
    const mk = (c: Competidor): Jug => {
      const fig = new Figura(this, 0, PISO, c.id, 'idle');
      return { c, fig, carreras: 0, ponches: 0 };
    };
    if (this.d.practica) {
      this.eq = [[mk(this.gente[0])], [mk({ id: 'kenji', team: 1, human: false })]];
    } else {
      this.eq = [this.gente.filter((c) => c.team === 0).map(mk), this.gente.filter((c) => c.team === 1).map(mk)];
    }
  }

  /** Empieza una mitad de inning: batea uno, lanza el otro, y el compañero del que lanza va al campo. */
  private mitad() {
    const b: 0 | 1 = this.d.practica ? 0 : this.abajo ? 1 : 0;
    this.outs = 0; this.turnos = 0;
    const f = this.eq[1 - b];
    this.pit = f[0];
    this.field = f[1] ?? null;
    this.siguienteBateador(b);
    this.st = 'prepara';
    this.espera = 1;
  }

  /** En el entrenamiento, para el último paso: Kenji batea y tú lanzas. */
  private cambiarEntrenamiento() {
    this.pit = this.eq[0][0];
    this.bat = this.eq[1][0];
    this.field = null;
    this.strikes = 0;
    this.colocar();
    this.st = 'prepara';
    this.espera = 0.6;
  }

  private siguienteBateador(team: 0 | 1) {
    const e = this.eq[team];
    this.bat = e[this.orden[team] % e.length];
    this.orden[team]++;
    this.strikes = 0;
    this.turnos++;
    this.colocar();
  }

  /** Cada uno a su puesto: bateador en el home, lanzador en su raya, el del campo atrás y el resto en la acera. */
  private colocar() {
    for (const j of [...this.eq[0], ...this.eq[1]]) {
      const f = j.fig;
      f.setVisible(true).setAlpha(1);
      if (j === this.bat) { f.left = false; f.setPosition(BAT_X, PISO).setDepth(PISO); f.set('weapon_swing', true, 0); }
      else if (j === this.pit) { f.left = true; f.setPosition(PIT_X, PISO).setDepth(PISO); f.set('idle', true); }
      else if (j === this.field) { f.left = true; f.setPosition(FIELD_X, PISO).setDepth(PISO); f.set('idle', true); }
      else { f.left = false; f.setPosition(30 + (j.c.team === 0 ? 0 : 14), PISO - 6).setDepth(PISO - 6).set('idle', true); }
      f.row = 'right';
      f.refresh();
    }
    this.fx = FIELD_X;
    this.fieldVx = 0;
    this.fieldZ = 0;
    this.chapa.st = 'mano';
    this.chapa.resuelta = false;
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    const p = this.pad.read();
    if (this.endTick(p)) { this.pasoFiguras(dt); this.pintar(); this.filterUi(); return; }
    if (this.fase === 'juego') this.tick(dt, p);
    this.pasoFiguras(dt);
    this.pintar();
    this.camara(dt);
    this.coach?.tick(dt);
    this.drawHud();
    this.filterUi();
  }

  /** Avanza las animaciones de los que no maneja el turno (el bateador y el lanzador se avanzan en su momento). */
  private pasoFiguras(dt: number) {
    for (const j of [...this.eq[0], ...this.eq[1]]) {
      // el swing del bateador y el lanzamiento los avanza su jugada
      if ((j === this.bat && j.fig.anim.name === 'weapon_swing') || (j === this.pit && this.st === 'lanza')) continue;
      j.fig.step(dt);
      if (j.fig.anim.done && j.fig.anim.name !== 'weapon_swing') j.fig.set('idle', true);
    }
  }

  private humanoBatea() { return this.bat.c.human; }
  private humanoLanza() { return this.pit.c.human; }

  private tick(dt: number, p: Pad) {
    this.espera -= dt;
    if (this.st === 'prepara') {
      this.ayudaTxt.setText(this.humanoLanza() ? rotular('{PUÑO} RECTA · {PATADA} CURVA · CON {MOVER} ARRIBA SUBE, ABAJO BAJA', this.pad.fuente) : this.humanoBatea() ? rotular('{PUÑO} BATEA · {MOVER} ARRIBA ALTA · ABAJO RASANTE', this.pad.fuente) : '');
      if (this.espera > 0) return;
      if (this.humanoLanza()) {
        if (p.pressed.punch) this.quiereLanz = 'recta';
        else if (p.pressed.kick) this.quiereLanz = p.y < 0 ? 'sube' : p.y > 0 ? 'baja' : Math.random() < 0.5 ? 'sube' : 'baja';
        // si se queda pensando, la lanza recta sola
        else if (this.espera < -6) this.quiereLanz = 'recta';
        if (!this.quiereLanz) return;
      } else {
        const curvas = this.d.practica ? this.paso === 2 : Math.random() < 0.4;
        this.quiereLanz = curvas ? (Math.random() < 0.5 ? 'sube' : 'baja') : 'recta';
      }
      this.st = 'lanza';
      // el lanzamiento de béisbol del kit (sin la pelota pintada: la chapa va en su punto) o el de la pelea
      this.pit.fig.set(this.pit.fig.anim.has('pitch') ? 'pitch' : 'weapon_throw', true);
      return;
    }
    if (this.st === 'lanza') {
      const ev = this.pit.fig.step(dt);
      if (ev.some((e) => e.tipo === 'suelta') || this.pit.fig.anim.done) this.soltar();
      return;
    }
    if (this.st === 'vuela') {
      // el swing: tú con puño (la altura con la flecha); la máquina, cuando le parece
      if (!this.swing) {
        if (this.humanoBatea() && p.pressed.punch) this.batear(p.y < 0 ? 'alta' : p.y > 0 ? 'baja' : 'media');
        else if (!this.humanoBatea()) this.cpuBatea();
      }
      this.moverChapa(dt);
      this.pasoSwing(dt);
      return;
    }
    if (this.st === 'resultado') {
      this.moverChapa(dt);
      this.pasoSwing(dt);
      this.fildeador(dt);
      if (this.espera <= 0 && this.chapa.resuelta) this.despues();
    }
  }

  /** La chapa sale de la mano: recta, o curva que sube o baja al final. */
  private soltar() {
    const c = this.chapa, tipo = this.quiereLanz ?? 'recta';
    this.quiereLanz = null;
    this.cpuPlan = null;
    const nivel = this.humanoLanza() ? 1 : this.d.practica ? 0.62 : ajustes().nombre === 'PASEO' ? 0.7 : ajustes().nombre === 'NORMAL' ? 0.85 : 1;
    const v = (tipo === 'recta' ? 230 : 200) * nivel;
    c.st = 'lanzada'; c.tipo = tipo; c.x0 = PIT_X - 10; c.x = c.x0; c.z = 22; c.t = 0;
    c.tt = (c.x0 - CONTACTO) / v;
    c.vx = -v; c.botes = 0; c.jonron = false; c.resuelta = false;
    this.swing = null;
    this.st = 'vuela';
    this.sound.play('esquiva', { volume: 0.25, rate: 1.4 });
    if (this.humanoLanza()) this.lanzadas++;
  }

  /** La altura de la chapa que viene: recta a media altura; la curva se va arriba o abajo en la segunda mitad. */
  private zLanzada(u: number) {
    const c = this.chapa;
    const s = Phaser.Math.Clamp((u - 0.45) / 0.55, 0, 1), k = s * s * (3 - 2 * s);
    const fin = c.tipo === 'sube' ? 32 : c.tipo === 'baja' ? 4 : 18;
    return 22 + (18 - 22) * Math.min(1, u * 2) + (fin - 18) * k;
  }

  /** Empieza el swing: el palo le pega (o no) en el cuadro del impacto. */
  private batear(altura: Altura) {
    this.swing = { altura, hecho: false };
    this.bat.fig.set('weapon_swing', true, 1);
  }

  /** La máquina batea: calcula cuándo y a qué altura, con su error según el nivel. */
  private cpuBatea() {
    const c = this.chapa;
    if (c.st !== 'lanzada') return;
    // la decisión se toma una vez por lanzamiento
    const plan = this.cpuPlan ?? (this.cpuPlan = this.planCpu());
    const llegaEn = (c.x - CONTACTO) / -c.vx;
    if (llegaEn <= plan.t) { this.batear(plan.altura); this.cpuPlan = null; }
  }

  private cpuPlan: { t: number; altura: Altura } | null = null;

  private planCpu(): { t: number; altura: Altura } {
    const ag = this.d.practica ? 0.1 : ajustes().cpuAgresion;
    // el swing tarda tres cuadros (a 14 fps) en llegar al impacto
    const ideal = 3 / 14;
    const error = (Math.random() + Math.random() + Math.random() - 1.5) * (0.22 - 0.1 * ag);
    const acierta = this.chapa.tipo === 'recta' || Math.random() < 0.3 + 0.4 * ag;
    const altura: Altura = this.chapa.tipo === 'recta' ? (Math.random() < 0.35 ? 'alta' : 'media') : acierta ? (this.chapa.tipo === 'sube' ? 'alta' : 'baja') : this.chapa.tipo === 'sube' ? 'baja' : 'alta';
    return { t: ideal + error, altura };
  }

  private pasoSwing(dt: number) {
    if (!this.swing) return;
    const f = this.bat.fig;
    const ev = f.step(dt);
    if (ev.some((e) => e.tipo === 'impacto') && !this.swing.hecho) { this.swing.hecho = true; this.contacto(); }
    if (f.anim.done) { f.set('weapon_swing', true, 0); this.swing = null; }
  }

  /** El momento del palo: ¿le pegó? Lo lejos y lo alto sale del tiempo y de la altura del swing. */
  private contacto() {
    const c = this.chapa, s = this.swing!;
    if (c.st !== 'lanzada') return;
    const ayuda = this.humanoBatea() ? ajustes().ayuda : 0.6;
    const ventana = 20 + 12 * ayuda;
    const dx = c.x - CONTACTO;
    const [a, b] = BANDA[s.altura];
    const alturaBien = (this.humanoBatea() && ajustes().nombre === 'PASEO') || this.d.practica && this.paso === 0 || (c.z >= a - 2 && c.z <= b + 2);
    if (Math.abs(dx) > ventana || !alturaBien) { this.sound.play('esquiva', { volume: 0.2, rate: 0.8 }); return; }
    const q = 1 - Math.abs(dx) / ventana;
    const ang = Phaser.Math.DegToRad(q < 0.2 ? 4 : ANGULO[s.altura] + (Math.random() - 0.5) * 6);
    const v = q < 0.2 ? 120 : 150 + 280 * q;
    c.st = 'bateada';
    c.vx = Math.cos(ang) * v;
    c.vz = Math.sin(ang) * v;
    c.t = 0;
    this.st = 'resultado';
    this.espera = 1.2;
    this.suena('chapa', 0.5 + 0.3 * q, () => this.sound.play('golpe', { volume: 0.4 + 0.3 * q, rate: 1.2 }));
    efecto(this, q > 0.85 ? 'chispa_golpe_pesado' : 'chispa_golpe_liviano', CONTACTO, PISO - c.z, { depth: PISO + 5 });
    if (q > 0.85) { this.cameras.main.shake(100, 0.006); chip.blip(1320, 0.08, 'sq25', 0.2, 1760); }
    if (this.humanoBatea()) { this.contactos++; if (c.tipo !== 'recta') this.contactosCurva++; }
    // el del campo sale corriendo hacia donde va a caer
    this.fieldVx = 0;
  }

  private moverChapa(dt: number) {
    const c = this.chapa;
    c.t += dt;
    if (c.st === 'lanzada') {
      c.x += c.vx * dt;
      const u = (c.x0 - c.x) / (c.x0 - CONTACTO);
      c.z = this.zLanzada(u);
      // se pasó: strike (y se queda en la caja)
      if (c.x < BAT_X - 22) { c.st = 'quieta'; c.x = BAT_X - 24; c.z = 6; this.strike(); }
      return;
    }
    if (c.st !== 'bateada') return;
    c.vz -= G * dt;
    const x0 = c.x;
    c.x += c.vx * dt;
    c.z += c.vz * dt;
    // la casa: por encima es jonrón; en la ventana, ¡crash!; en la pared, rebota
    if (x0 < CASA_X && c.x >= CASA_X && !c.resuelta) {
      if (c.z > CASA_H) { c.jonron = true; this.anota('¡JONRÓN!', 4, 0xffe040); }
      else if (c.z >= VENTANA.z0 && c.z <= VENTANA.z1) { this.ventana(); c.vx = 0; c.vz = -40; c.x = CASA_X + 2; }
      else { c.x = CASA_X - 2; c.vx = -c.vx * 0.25; this.anota('¡A LA PARED! TRIPLE', 3, 0xffe080); }
    }
    if (c.z <= 0) {
      c.z = 0;
      if (!c.resuelta) this.cae();
      if (Math.abs(c.vz) > 50) { c.vz = -c.vz * 0.35; c.vx *= 0.6; c.botes++; }
      else { c.vz = 0; c.vx *= Math.pow(0.1, dt); }
      if (Math.abs(c.vx) < 6 && c.vz === 0) c.st = 'quieta';
    }
    c.x = Phaser.Math.Clamp(c.x, 0, WORLD - 4);
    // el del campo la atrapa en el aire: out
    if (!c.resuelta && this.field && c.botes === 0 && Math.abs(c.x - this.fx) < 10 && c.z < 30 + this.fieldZ && c.z > 0) {
      c.resuelta = true;
      c.st = 'quieta'; c.vx = 0; c.vz = 0;
      this.field.fig.set('celebrate', true);
      this.sound.play('recoger', { volume: 0.4 });
      this.letrero('¡ATRAPADA! OUT', 0xff8080);
      this.out();
    }
  }

  /** Corre a donde va a caer la chapa, y salta si viene alta. */
  private fildeador(dt: number) {
    const f = this.field, c = this.chapa;
    if (!f) return;
    this.fieldZ = Math.max(0, this.fieldZ + this.fieldVx * dt);
    if (this.fieldZ > 0) this.fieldVx -= 600 * dt; else this.fieldVx = 0;
    if (c.st !== 'bateada' || c.resuelta) return;
    // dónde va a estar a la altura de la mano
    let x = c.x, z = c.z, vx = c.vx, vz = c.vz;
    for (let k = 0; k < 200 && z > 14; k++) { vz -= G * 0.02; x += vx * 0.02; z += vz * 0.02; }
    const meta = Phaser.Math.Clamp(x, PIT_X + 20, CASA_X - 10);
    const vel = (this.d.practica ? 60 : 85 + 40 * ajustes().cpuAgresion) * (f.c.team === 0 ? 1.1 : 1);
    const d = meta - this.fx;
    const mueve = Math.abs(d) > 3;
    if (mueve) this.fx += Math.sign(d) * Math.min(Math.abs(d), vel * dt);
    f.fig.left = d < 0 || !mueve;
    if (f.fig.anim.name !== 'celebrate') f.fig.set(mueve ? 'run' : 'idle');
    if (Math.abs(c.x - this.fx) < 30 && c.z > 30 && c.z < 56 && this.fieldZ === 0 && c.vz < 0) this.fieldVx = 170;
  }

  /** Cayó al piso: según dónde, rolling (out), sencillo, doble o triple. */
  private cae() {
    const c = this.chapa, d = c.x - BAT_X;
    if (c.jonron) return;
    if (d < 150) { this.letrero('¡ROLLING! OUT', 0xff8080); c.resuelta = true; this.out(); return; }
    if (d < 300) this.anota('¡SENCILLO!', 1, 0xffffff);
    else if (d < 450) this.anota('¡DOBLE!', 2, 0x8ae0ff);
    else this.anota('¡TRIPLE!', 3, 0xffe080);
  }

  private anota(s: string, n: number, tint: number) {
    const c = this.chapa;
    if (c.resuelta) return;
    c.resuelta = true;
    const team = this.bat.c.team;
    this.carreras[team] += n;
    this.bat.carreras += n;
    if (this.humanoBatea()) this.mejor = Math.max(this.mejor, c.x - BAT_X);
    this.letrero(`${s} +${n}`, tint);
    this.espera = Math.max(this.espera, 1.4);
    if (n >= 4) { flash(this, 120); efecto(this, 'confeti', CASA_X + 60, PISO - CASA_H - 30, { depth: 6000 }); chip.blip(880, 0.3, 'sq25', 0.2, 1760); }
    this.sound.play('elegir', { volume: 0.4 });
  }

  /** ¡Se rompió la ventana! Sale la señora Carmen y le tira la chancleta al bateador. */
  private ventana() {
    this.anota('¡LA VENTANA!', 3, 0xff8060);
    this.sound.play('romper', { volume: 0.6 });
    efecto(this, 'ventana_rota', (VENTANA.x0 + VENTANA.x1) / 2, PISO - (VENTANA.z0 + VENTANA.z1) / 2, { depth: PISO - 10 });
    this.vidrio.setVisible(true);
    this.espera = 3.2;
    this.time.delayedCall(500, () => {
      this.carmen.setVisible(true).setY(PISO - VENTANA.z0 + 10);
      this.tweens.add({ targets: this.carmen, y: PISO - VENTANA.z0, duration: 200 });
      const t = this.add.bitmapText(this.carmen.x - 10, PISO - VENTANA.z1 - 26, 'fuente_ui', '¡¿QUIÉN FUE?!').setOrigin(0.5).setDepth(6000).setTint(0xff6060);
      this.time.delayedCall(1600, () => t.destroy());
    });
    // la chancleta va girando hasta el bateador
    this.time.delayedCall(1000, () => {
      const ch = this.add.image(this.carmen.x, PISO - VENTANA.z1, 'armas', 'chancleta_rosada_girando_0').setDepth(6000).setScale(1.4);
      let t = 0;
      const desde = { x: ch.x, y: ch.y }, hasta = { x: BAT_X + 4, y: PISO - 34 };
      const ev = this.time.addEvent({
        delay: 16, loop: true, callback: () => {
          t += 0.016 / 1.1;
          const u = Math.min(1, t);
          ch.setPosition(desde.x + (hasta.x - desde.x) * u, desde.y + (hasta.y - desde.y) * u - Math.sin(u * Math.PI) * 60).setFrame(`chancleta_rosada_girando_${Math.floor(t * 30) % 8}`);
          if (u >= 1) {
            ev.remove();
            ch.destroy();
            this.suena('chancleta', 0.6, () => this.sound.play('golpe', { volume: 0.5 }));
            efecto(this, 'estrellas_mareo', BAT_X, PISO - 46, { depth: 6000 });
            this.bat.fig.set('hit', true);
            this.swing = null;
            const pl = this.add.bitmapText(BAT_X, PISO - 60, 'fuente_titulo', '¡PLAF!').setOrigin(0.5).setDepth(6000).setTint(0xffe040);
            this.tweens.add({ targets: pl, y: pl.y - 10, alpha: 0, delay: 500, duration: 400, onComplete: () => pl.destroy() });
          }
        },
      });
    });
    // al rato, la señora se mete y el vecino tapa la ventana
    this.time.delayedCall(3000, () => { this.carmen.setVisible(false); this.vidrio.setVisible(false); });
  }

  private strike() {
    this.strikes++;
    this.letrero(this.strikes >= 3 ? '¡PONCHADO!' : `STRIKE ${this.strikes}`, this.strikes >= 3 ? 0xff6060 : 0xffffff);
    this.chapa.resuelta = true;
    if (this.strikes >= 3) {
      this.bat.ponches++;
      if (this.humanoLanza()) this.ponchesTuyos++;
      this.out(true);
    } else { this.st = 'resultado'; this.espera = 0.9; }
  }

  private out(ponche = false) {
    if (!ponche) this.bat.fig.set('sad', true);
    this.outs++;
    this.strikes = 3;
    this.st = 'resultado';
    this.espera = 1.4;
  }

  /** Después de cada jugada: el mismo bateador sigue, pasa el siguiente o cambia la mitad. */
  private despues() {
    const c = this.chapa;
    c.st = 'mano';
    const team = this.bat.c.team;
    if (this.d.practica) {
      if (this.strikes >= 3) this.strikes = 0;
      this.colocar();
      this.st = 'prepara';
      this.espera = 0.6;
      return;
    }
    // si hubo hit o out, le toca al siguiente; si fue strike 1 o 2, sigue el mismo
    const termina = this.strikes >= 3 || (c.x > BAT_X + 10);
    if (!termina) { this.colocar(); this.st = 'prepara'; this.espera = 0.5; return; }
    if (this.outs >= 3 || this.turnos >= TURNOS) { this.cambio(); return; }
    this.siguienteBateador(team);
    this.st = 'prepara';
    this.espera = 0.8;
  }

  private cambio() {
    if (!this.abajo) this.abajo = true;
    else { this.abajo = false; this.inning++; }
    const fin = this.inning > INNINGS && this.carreras[0] !== this.carreras[1];
    if (fin || this.inning > INNINGS + 1) { this.final(); return; }
    this.st = 'cambio';
    const quien = this.abajo ? 'BATEA EL INSTITUTO' : 'BATEA LA FAMILIA';
    void this.banner(this.inning > INNINGS ? `¡EXTRA INNING! ${quien}` : `INNING ${this.inning} · ${quien}`, 'fuente_titulo_plata', 1, 1100).then(() => { if (this.fase === 'juego') this.mitad(); });
  }

  private final() {
    this.fase = 'fin';
    const ganador: 0 | 1 = this.carreras[0] >= this.carreras[1] ? 0 : 1;
    const todos = [...this.eq[0], ...this.eq[1]];
    const orden = [...todos].sort((a, b) => (a.c.team !== b.c.team ? (a.c.team === ganador ? -1 : 1) : b.carreras - a.carreras))
      .map((j) => ({ c: j.c, valor: `${j.carreras} CARRERA${j.carreras === 1 ? '' : 'S'}` }));
    for (const j of todos) j.fig.set(j.c.team === ganador ? 'celebrate' : 'sad', true);
    this.resultados(prueba('Chapita').nombre, orden);
  }

  private letrero(s: string, tint: number) {
    const t = this.uiAdd(txt(this, 320, 96, s, 'fuente_titulo', 1).setDepth(8500).setTint(tint));
    this.tweens.add({ targets: t, scale: { from: 2.4, to: 1.4 }, duration: 220, ease: 'Back.out' });
    this.time.delayedCall(1100, () => t.destroy());
  }

  /** El palo en la mano del bateador, la chapa en la del lanzador y la chapa volando con su sombra. */
  private pintar() {
    const b = this.bat?.fig;
    if (b) {
      const a = b.anim, arma = a.data.arma?.[b.rowIndex]?.[a.frame];
      const [ax, ay, ang] = arma ?? [9, -14, 300];
      const k = ((Math.round(ang / 22.5) % 16) + 16) % 16;
      this.palo.setFrame(`broomstick_mano_${k}`).setFlipX(b.left).setPosition(Math.round(b.x + (b.left ? -ax : ax)), Math.round(b.y + ay)).setVisible(a.name === 'weapon_swing');
    }
    const p = this.pit?.fig;
    const c = this.chapa;
    if (p) {
      const a = p.anim, arma = a.name === 'weapon_throw' ? a.data.arma?.[p.rowIndex]?.[a.frame] : null;
      const ob = a.name === 'pitch' ? p.pelota() : null;
      this.chapaMano.setVisible((!!arma || !!ob) && c.st !== 'lanzada');
      if (ob) this.chapaMano.setFrame('chapa_mano_0').setFlipX(p.left).setPosition(Math.round(ob.x), Math.round(ob.y));
      else if (arma) {
        const k = ((Math.round(arma[2] / 22.5) % 16) + 16) % 16;
        this.chapaMano.setFrame(`chapa_mano_${k}`).setFlipX(p.left).setPosition(Math.round(p.x + (p.left ? -arma[0] : arma[0])), Math.round(p.y + arma[1]));
      }
    }
    if (this.field) this.field.fig.setPosition(Math.round(this.fx), Math.round(PISO - this.fieldZ));
    const vuela = c.st === 'lanzada' || c.st === 'bateada' || c.st === 'quieta';
    c.spr.setVisible(vuela);
    c.sombra.setVisible(vuela);
    if (vuela) {
      c.spr.setFrame(c.st === 'quieta' && c.z === 0 ? 'chapa_quieto_0' : `chapa_girando_${Math.floor(c.t * 20) % 8}`).setPosition(Math.round(c.x), Math.round(PISO - c.z));
      c.sombra.setPosition(Math.round(c.x), PISO).setScale(Math.max(0.4, 1 - c.z / 120));
    }
  }

  private camara(dt: number) {
    const c = this.chapa;
    const want = c.st === 'bateada' || (c.st === 'quieta' && c.x > PIT_X) ? Math.max(230, c.x) : 230;
    this.camX += (want - this.camX) * Math.min(1, dt * 4);
    const cam = this.cameras.main;
    cam.centerOn(this.camX, 360 - 180 / ZOOM);
    this.bg.tilePositionX = cam.scrollX * 0.25;
  }

  private drawHud() {
    const g = this.hud;
    g.clear();
    if (this.d.practica) { this.marcadorTxt.setText(''); this.inningTxt.setText(''); return; }
    this.marcadorTxt.setText(`FAMILIA ${this.carreras[0]} - ${this.carreras[1]} INSTITUTO`);
    this.inningTxt.setText(`INNING ${Math.min(this.inning, INNINGS + 1)} ${this.abajo ? 'ABAJO' : 'ARRIBA'} · BATEA ${this.nombre(this.bat.c.id)}`);
    // los outs y los strikes en bolitas
    g.fillStyle(0x000000, 0.55).fillRect(8, 8, 112, 40);
    for (let k = 0; k < 3; k++) {
      g.fillStyle(k < this.outs ? 0xff5a5a : 0x3a3a4a).fillCircle(70 + k * 14, 18, 5);
      g.fillStyle(k < Math.min(3, this.strikes) ? 0xffe040 : 0x3a3a4a).fillCircle(70 + k * 14, 36, 5);
    }
    if (!this.outsTxt) {
      this.outsTxt = this.uiAdd(txt(this, 14, 18, 'OUTS', 'fuente_ui', 1, 0).setDepth(8001));
      this.uiAdd(txt(this, 14, 36, 'STRIKES', 'fuente_ui', 1, 0).setDepth(8001));
    }
  }

  private outsTxt: Phaser.GameObjects.BitmapText | null = null;
}
