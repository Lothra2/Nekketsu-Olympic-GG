import Phaser from 'phaser';
import { Actor, NOTHING, type Intent, type Item, type World } from '../fight/actor';
import { DEPTH, FLOOR_TOP } from '../fight/defs';
import { ajustes } from '../core/nivel';
import { efecto } from '../core/fx';
import { chip } from '../core/music';
import { txt, flash } from '../core/ui';
import { kit } from '../core/kit';
import { lado } from '../core/equipos';
import { EventScene, prueba, type Competidor } from './base';
import type { Paso } from '../core/coach';
import { hayArte, pintarEscenario, queueEscenario } from './escenario';
import hoian from '../../data/stages/hoian.layout.json';

const FT = FLOOR_TOP;
/** los dos postes del layout: el de la Familia GG a la izquierda y el del Instituto a la derecha */
const POSTES = hoian.postes.filter((p) => p.tipo === 'poste_tamawari');
const ZOOM = 1.3;
/** lo que dura como mucho: si nadie rompe la bola, gana el que le hizo más daño a la del otro */
const TIEMPO = 120;
/** la bola de papel: tamaño en pantalla y vida */
const BOLA = 48;
const VIDA_BOLA = 100;

interface Poste {
  x: number; y: number; alto: number; team: 0 | 1; vida: number; rota: boolean;
  palo: Phaser.GameObjects.Graphics; bola: Phaser.GameObjects.Sprite | Phaser.GameObjects.Graphics; sacudida: number;
  /** recién sacudido: hasta que se calme, otra patada no lo sacude (si no, nadie llegaría arriba) */
  calma: number;
}
interface Trepa { poste: Poste; h: number; boost: number; last: string; cool: number; golpeT: number; quieto: number }
interface Jugador { a: Actor; c: Competidor; rol: 'ataque' | 'defensa'; golpes: number; pensar: number; quiere: Intent; cercaDeCasa: number; sparring?: boolean }

/**
 * Tama-wari Hội An (fiel a 1990): cada equipo tiene un poste de bambú con una bola de papel arriba. Gana el primero
 * que rompe la bola del otro. Se trepa machacando (o manteniendo arriba), arriba se le pega a la bola, y desde abajo
 * se patea el poste para sacudir al que trepa o se le jala el pie. En el piso, a los golpes como en la pelea.
 */
export class Tamawari extends EventScene implements World {
  actors: Actor[] = [];
  items: Item[] = [];
  floorTop = FT;
  limites = { xmin: 20, xmax: 620, depth: DEPTH };
  inclinacion = 0;
  private jugadores: Jugador[] = [];
  private postes: Poste[] = [];
  private trepa = new Map<Actor, Trepa>();
  private clock = 0;
  private stop = 0;
  private hud!: Phaser.GameObjects.Graphics;
  private relojTxt!: Phaser.GameObjects.BitmapText;
  private arte: ReturnType<typeof pintarEscenario> | null = null;
  private terminado = false;
  /** entrenamiento: lo que va haciendo la persona */
  private bajados = 0;

  constructor() { super('Tamawari'); }

  get sc(): Phaser.Scene { return this; }

  preload() { super.preload(); queueEscenario(this, 'hoian'); }

  /** La x de pantalla de un punto del piso, con la vista inclinada del arte (sin arte, derecho). */
  px(x: number, y: number) { return x + this.inclinacion * y; }

  create() {
    this.actors = [];
    this.items = [];
    this.jugadores = [];
    this.postes = [];
    this.trepa = new Map();
    this.clock = 0;
    this.stop = 0;
    this.terminado = false;
    this.bajados = 0;
    // entrenando, la cámara más lejos: el cartel del entrenador va arriba y la bola se ve debajo
    this.zoom = this.d.practica ? 1 : ZOOM;
    this.setup(this.zoom, 640);
    this.arte = hayArte(this, 'hoian') ? pintarEscenario(this, 'hoian', 5000) : null;
    this.inclinacion = this.arte?.inclinacion ?? 0;
    if (!this.arte) {
      this.add.image(320, 100, 'bg_hoian_lejos').setScrollFactor(0.5, 1).setDepth(-12);
      this.add.image(320, 180, 'bg_hoian').setDepth(-10);
    }
    for (const [i, p] of POSTES.entries()) this.postes.push(this.armarPoste(p.x, p.y, p.alto, i as 0 | 1));
    // la Familia junto a su poste (izquierda) y el Instituto junto al suyo
    this.gente.forEach((c, i) => {
      const nuestro = c.team === 0;
      const x = nuestro ? 170 + (i % 2) * 34 : 470 - (i % 2) * 34;
      const a = new Actor(this, c.id, c.team, x, 30 + (i % 2) * 36, c.human);
      a.left = !nuestro;
      a.maxHp = a.hp = Math.round(a.maxHp * (c.team === 0 ? ajustes().vida : 1));
      this.actors.push(a);
      // en cada equipo uno ataca y otro defiende; la persona hace lo que quiera
      const rol = c.human ? 'ataque' : nuestro ? 'defensa' : this.jugadores.some((j) => j.c.team === 1) ? 'defensa' : 'ataque';
      this.jugadores.push({ a, c, rol, golpes: 0, pensar: Math.random() * 0.3, quiere: NOTHING, cercaDeCasa: 0 });
    });
    this.cameras.main.centerOn(this.px(220, 50), this.camY);
    this.hud = this.uiAdd(this.add.graphics().setDepth(8000));
    this.relojTxt = this.uiAdd(txt(this, 320, 14, '2:00', 'fuente_ui', 2).setDepth(8001));
    this.uiAdd(txt(this, 18, 12, `BOLA ${lado(0).corto}`, 'fuente_ui', 1, 0).setDepth(8001).setTint(0x9ac8ff));
    this.uiAdd(txt(this, 622, 12, `BOLA ${lado(1).corto}`, 'fuente_ui', 1, 1).setDepth(8001).setTint(0xffa0a0));
    this.tema('hoian_noche');
    this.ambiente('hoian_noche');
    if (this.d.practica) void this.entrenar('TAMA-WARI', this.pasos());
    else void this.previa('TAMA-WARI HỘI AN', 'HỘI AN, VIETNAM', 'ROMPE LA BOLA DEL OTRO POSTE · {SALTO} AGARRA EL POSTE · {PUÑO} Y {PATADA} TREPAN Y PEGAN');
  }

  private zoom = ZOOM;
  private get camY() { return 360 - 180 / this.zoom; }

  // ------------------------------------------------------------------ los postes y las bolas

  private armarPoste(x: number, y: number, alto: number, team: 0 | 1): Poste {
    const palo = this.add.graphics().setDepth(FT + y);
    // el bambú: verde amarillento, con sus nudos, y la base de piedra
    const bx = this.px(x, y);
    // con el arte de Hội An, el poste, su base y el collar del equipo vienen pintados: la bola cuelga de su gancho
    if (!this.arte) {
      palo.fillStyle(0x3a3440).fillRect(bx - 9, FT + y - 10, 18, 12);
      palo.fillStyle(0x5a5260).fillRect(bx - 9, FT + y - 10, 18, 2);
      palo.fillStyle(0x8a9a3a).fillRect(bx - 3, FT + y - alto, 6, alto - 8);
      palo.fillStyle(0xb8c45a).fillRect(bx - 3, FT + y - alto, 2, alto - 8);
      palo.fillStyle(0x5a6a2a).fillRect(bx + 2, FT + y - alto, 1, alto - 8);
      for (let k = FT + y - 20; k > FT + y - alto; k -= 16) palo.fillStyle(0x4a5a22).fillRect(bx - 4, k, 8, 2);
      // la cuerdita de la bola y el farol del equipo
      palo.fillStyle(team === 0 ? 0x4a9aff : 0xff5a5a).fillRect(bx - 5, FT + y - alto - 2, 10, 3);
    }
    const top = FT + y - alto;
    let bola: Poste['bola'];
    if (this.textures.exists('fx_bola_tama')) {
      const e = kit().fx?.bola_tama;
      bola = this.add.sprite(bx, top, team === 0 ? this.bolaAzul() : 'fx_bola_tama', 0).setOrigin(((e?.ancla?.[0] ?? 16) + 0.5) / 32, 0).setScale(BOLA / 32).setDepth(FT + y + 0.5);
    } else {
      bola = this.add.graphics().setPosition(bx, top).setDepth(FT + y + 0.5);
    }
    const p: Poste = { x, y, alto, team, vida: VIDA_BOLA, rota: false, palo, bola, sacudida: 0, calma: 0 };
    this.pintarBola(p);
    return p;
  }

  /** La bola de la Familia: la del kit es roja; esta es la misma con el rojo y el azul cambiados. */
  private bolaAzul() { return this.azul('fx_bola_tama', 32); }

  /** Una copia de una tira del kit con el rojo y el azul cambiados (lo de la Familia va en azul). */
  private azul(key: string, celda: number) {
    const k = `${key}_azul`;
    if (this.textures.exists(k)) return k;
    const src = this.textures.get(key).getSourceImage() as HTMLImageElement;
    const c = document.createElement('canvas');
    c.width = src.width; c.height = src.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, c.width, c.height);
    for (let i = 0; i < img.data.length; i += 4) { const r = img.data[i]; img.data[i] = img.data[i + 2]; img.data[i + 2] = r; }
    ctx.putImageData(img, 0, 0);
    const t = this.textures.addCanvas(k, c)!;
    for (let fy = 0; fy < Math.floor(c.height / celda); fy++) for (let fx = 0; fx < Math.floor(c.width / celda); fx++) t.add(fy * Math.floor(c.width / celda) + fx, 0, fx * celda, fy * celda, celda, celda);
    return k;
  }

  /** La bola según su daño: entera, golpeada, agrietada y por abrir (el cuadro del kit, o pintada si no llegó). */
  private pintarBola(p: Poste) {
    const estado = p.vida > 75 ? 0 : p.vida > 50 ? 1 : p.vida > 25 ? 2 : 3;
    if (p.bola instanceof Phaser.GameObjects.Sprite) { p.bola.setFrame(estado); return; }
    const g = p.bola;
    const r = BOLA / 2, cy = r + 2;
    const col = p.team === 0 ? 0x4a8aff : 0xff4a5a, luz = p.team === 0 ? 0x9ac8ff : 0xffa0a8;
    g.clear();
    g.fillStyle(col, 0.18).fillCircle(0, cy, r + 6);
    g.fillStyle(0x3a2418).fillRect(-1, 0, 2, 3);
    g.fillStyle(col).fillCircle(0, cy, r);
    g.fillStyle(luz).fillCircle(-r * 0.35, cy - r * 0.35, r * 0.35);
    // las costillas del farol de papel
    g.lineStyle(1, 0x3a2418, 0.6);
    for (const k of [-0.55, 0, 0.55]) g.strokeEllipse(k * r * 0.5, cy, r * 2 * (1 - Math.abs(k) * 0.6), r * 2);
    g.fillStyle(0xf2c230).fillRect(-r * 0.5, cy - r - 1, r, 3).fillRect(-r * 0.5, cy + r - 2, r, 3);
    // las grietas, más mientras más daño
    g.lineStyle(2, 0x1a1010);
    const grietas = [[[-8, 4], [-2, 12], [-6, 20]], [[10, 8], [4, 16], [12, 26]], [[-14, 22], [-4, 28], [-10, 36]], [[6, 26], [14, 34], [4, 40]]];
    for (let i = 0; i < estado; i++) g.strokePoints(grietas[i].map(([x, y]) => ({ x, y: y + cy - r })));
    if (estado === 3) g.fillStyle(0x1a1010).fillRect(-3, cy - 2, 6, 8);
  }

  /** El techo de la trepada: el que llega ahí tiene la bola encima de la cabeza. */
  private cima(p: Poste) { return p.alto - BOLA - 38; }

  /** Desde abajo: patear el poste lo sacude y los que trepan bajan de golpe (o se caen si van abajo). */
  private sacudir(p: Poste, quien: Actor) {
    if (p.calma > 0) return;
    p.calma = 1.1;
    p.sacudida = 0.35;
    this.sfx('golpe', 0.5);
    this.shake(90, 0.004);
    let alguien = false;
    for (const [a, t] of this.trepa) {
      if (t.poste !== p || a.team === quien.team) continue;
      alguien = true;
      t.h -= 24;
      t.cool = 0.5;
      t.boost = 0;
      if (t.h < 20) { this.soltar(a, true); if (quien.human) this.bajados++; }
    }
    if (alguien) this.aviso(quien, '¡SACUDIDA!', 0xffe080);
  }

  /** Jalarle el pie al que va empezando a trepar: abajo de un tirón. */
  private jalar(p: Poste, quien: Actor) {
    for (const [a, t] of this.trepa) {
      if (t.poste !== p || a.team === quien.team || t.h > 32) continue;
      this.soltar(a, true);
      this.aviso(quien, '¡ABAJO!', 0xffe080);
      this.sfx('critico', 0.4);
      if (quien.human) this.bajados++;
      return true;
    }
    return false;
  }

  /** Se suelta del poste: cae solo (saltando) o lo tumban. */
  private soltar(a: Actor, tumbado: boolean) {
    const t = this.trepa.get(a);
    if (!t) return;
    this.trepa.delete(a);
    a.x = t.poste.x + (a.team === 0 ? -12 : 12);
    a.y = Phaser.Math.Clamp(t.poste.y + 6, 0, DEPTH);
    a.z = Math.max(0, t.h);
    a.fig.row = 'right';
    a.left = a.team === 1;
    if (tumbado) { a.st = 'idle'; a.knockdown(a.team === 0 ? -1 : 1, 40, 60); if (a.human) this.letrero(a, '¡TE TUMBARON!', 0xff8080); }
    else { a.setSt('jump', 'jump_fall'); a.vz = 0; a.vx = 0; a.vy = 0; }
  }

  private agarrar(j: Jugador, p: Poste) {
    const a = j.a;
    this.trepa.set(a, { poste: p, h: 6, boost: 0, last: '', cool: 0, golpeT: 0, quieto: 0 });
    a.setSt('frozen', 'walk');
    a.vx = a.vy = a.vz = 0;
    a.fig.row = 'up';
    if (a.human) chip.blip(660, 0.06, 'sq25', 0.12, 880);
  }

  /** Un puñete a la bola desde arriba. */
  private pegarBola(j: Jugador, t: Trepa) {
    if (t.golpeT > 0 || t.poste.rota) return;
    t.golpeT = 0.26;
    const a = j.a;
    a.fig.row = 'up';
    a.fig.set('uppercut', true, 1.6);
    const daño = 6 * (a.team === 0 ? ajustes().daño : 1);
    const p = t.poste;
    // entrenando, la bola aguanta hasta el último paso: primero hay que aprender a defender
    p.vida = Math.max(this.d.practica && !this.coach?.ultimo ? 25 : 0, p.vida - daño);
    j.golpes++;
    this.pintarBola(p);
    const bx = this.px(p.x, p.y), by = FT + p.y - p.alto + BOLA * 0.75;
    efecto(this, 'chispa_golpe_medio', bx, by, { depth: 5002 });
    this.tweens.add({ targets: p.bola, scaleX: p.bola.scaleX * 1.08, scaleY: p.bola.scaleY * 0.94, yoyo: true, duration: 70 });
    this.sfx('golpe', a.human ? 0.5 : 0.25);
    if (a.human) chip.blip(880 + (VIDA_BOLA - p.vida) * 4, 0.05, 'sq25', 0.1);
    if (p.vida <= 0) this.romper(p, j);
  }

  /** ¡La bola se rompe! Confeti, el cartel del equipo y todos los faroles. */
  private romper(p: Poste, j: Jugador) {
    p.rota = true;
    p.bola.setVisible(false);
    const bx = this.px(p.x, p.y), by = FT + p.y - p.alto + BOLA / 2;
    // la bola del kit se abre en dos y cae el confeti (la de la Familia, en azul)
    if (this.textures.exists('fx_bola_tama_explota')) {
      const key = p.team === 0 ? this.azul('fx_bola_tama_explota', 64) : 'fx_bola_tama_explota';
      const s = this.add.sprite(bx, FT + p.y - p.alto, key, 0).setOrigin(32.5 / 64, 0).setScale(BOLA / 32).setDepth(FT + p.y + 0.5);
      const frames = this.anims.generateFrameNumbers(key, { start: 0, end: 9 });
      if (!this.anims.exists(`${key}_abre`)) this.anims.create({ key: `${key}_abre`, frames, frameRate: 14, repeat: 0 });
      s.play(`${key}_abre`);
    }
    flash(this, 200);
    this.shake(400, 0.012);
    chip.boom(0.9);
    // el papel y el confeti
    const confeti = this.add.particles(bx, by, 'px', {
      speed: { min: 60, max: 200 }, angle: { min: 200, max: 340 }, gravityY: 220, lifespan: 2200, quantity: 60, emitting: false,
      scale: { start: 1, end: 0.6 }, tint: [0xff4a5a, 0xf2c230, 0x4ac0a0, 0x9ac8ff, 0xe85aa0, 0xffffff], rotate: { min: 0, max: 360 },
    }).setDepth(5003);
    confeti.explode(90);
    // el cartel que cuelga de la bola rota, con el nombre del equipo que la rompió
    const equipo = lado(j.c.team).nombre.toUpperCase();
    const cartel = this.add.container(bx, by - 10).setDepth(5004);
    const g = this.add.graphics();
    g.fillStyle(0xf4ecd8).fillRect(-58, 0, 116, 26);
    g.lineStyle(2, j.c.team === 0 ? 0x2a6ad0 : 0xc0303a).strokeRect(-58, 0, 116, 26);
    g.fillStyle(0x3a2418).fillRect(-1, -12, 2, 12);
    cartel.add(g);
    cartel.add(txt(this, 0, 8, '¡GANA!', 'fuente_ui', 1).setTint(0x3a2418));
    cartel.add(txt(this, 0, 18, equipo, 'fuente_ui', 1).setTint(j.c.team === 0 ? 0x2a6ad0 : 0xc0303a));
    cartel.setScale(0.2).setAngle(-8);
    this.tweens.add({ targets: cartel, scale: 1, duration: 420, ease: 'Back.out' });
    this.tweens.add({ targets: cartel, angle: 8, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.inOut' });
    // los faroles de la calle se encienden de golpe
    const brillo = this.add.rectangle(320, 180, 900, 400, 0xffb050, 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(-5);
    this.tweens.add({ targets: brillo, alpha: 0.06, duration: 1400 });
    if (j.a.human) this.letrero(j.a, '¡LA ROMPISTE!', 0xffe040);
    // entrenando no hay final de partido: el entrenador cierra
    if (!this.d.practica) this.terminar(j.c.team);
  }

  // ------------------------------------------------------------------ World

  hitstop(s: number) { this.stop = Math.max(this.stop, s); }
  shake(ms: number, k: number) { this.cameras.main.shake(ms, k); }
  sfx(name: string, vol = 0.5) { if (this.cache.audio.exists(name)) this.sound.play(name, { volume: vol }); }
  spark(x: number, y: number, z: number, big: boolean) { efecto(this, big ? 'chispa_golpe_pesado' : 'chispa_golpe_medio', this.px(x, y), FT + y - z, { depth: 5002 }); }
  dust(x: number, y: number) { efecto(this, 'polvo_caer_medio', this.px(x, y), FT + y); }
  number(x: number, y: number, n: number) {
    const t = txt(this, this.px(x, y), FT + y - 52, `${n}`, 'fuente_ui', 1).setTint(0xff6060).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, duration: 650, onComplete: () => t.destroy() });
  }
  onHit(_from: Actor | null, v: Actor, _dmg: number, kd: boolean) {
    this.sfx(kd ? 'critico' : 'golpe', kd ? 0.45 : 0.35);
    this.hitstop(kd ? 0.06 : 0.035);
    if (kd && v.human) this.shake(100, 0.005);
  }
  onKO() { /* aquí nadie queda fuera: la vida no baja de un tercio */ }
  special(a: Actor) { a.meter = 0; }
  multDaño(from: Actor | null) { return from?.team === 0 ? ajustes().daño : 1; }
  aviso(a: Actor, s: string, color: number) {
    const t = txt(this, this.px(a.x, a.y), FT + a.y - a.z - 58, s, 'fuente_ui', 1).setTint(color).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 12, alpha: 0, delay: 350, duration: 450, onComplete: () => t.destroy() });
  }
  private letrero(a: Actor, s: string, color: number) {
    const t = txt(this, this.px(a.x, a.y), FT + a.y - a.z - 70, s, 'fuente_titulo', 1).setTint(color).setDepth(6000);
    this.tweens.add({ targets: t, y: t.y - 16, alpha: 0, delay: 600, duration: 600, onComplete: () => t.destroy() });
  }

  // ------------------------------------------------------------------ cuadro a cuadro

  update(_t: number, dms: number) {
    let dt = Math.min(0.05, dms / 1000);
    const p = this.pad.read();
    if (this.endTick(p)) { this.animar(dt); this.filterUi(); return; }
    if (this.stop > 0) { this.stop -= dt; this.render(); this.filterUi(); return; }
    const jugando = this.fase === 'juego' && !this.terminado;
    if (jugando) this.clock += dt;
    this.coach?.tick(dt);
    if (this.terminado) dt *= 0.5;
    for (const j of this.jugadores) {
      const it = !jugando ? NOTHING : j.c.human ? { x: p.x, y: p.y, run: p.run, punch: p.pressed.punch, kick: p.pressed.kick, jump: p.pressed.jump, special: false } : this.cpu(j, dt);
      if (this.trepa.has(j.a)) { this.trepar(j, it, dt, j.c.human ? p.held.punch || p.held.kick : false, j.c.human && p.y < 0); continue; }
      // al pie del poste del otro: saltar o empujar hacia arriba lo agarra
      const objetivo = this.postes.find((q) => q.team !== j.c.team);
      if (objetivo && !objetivo.rota && ['idle', 'walk', 'run'].includes(j.a.st) && this.alPie(j.a, objetivo, 17) && (it.jump || it.y < 0)) { this.agarrar(j, objetivo); continue; }
      const antes = j.a.st;
      j.a.update(dt, it);
      // un golpe que empieza al pie de un poste donde trepa el otro equipo: patada sacude, puño jala el pie
      if (j.a.st === 'attack' && antes !== 'attack') {
        const q = this.postes.find((pp) => this.alPie(j.a, pp, 24));
        if (q && [...this.trepa].some(([o, t]) => t.poste === q && o.team !== j.c.team)) {
          if (/kick/.test(j.a.fig.anim.name)) this.sacudir(q, j.a);
          else this.jalar(q, j.a);
        }
      }
      // aquí nadie queda fuera
      j.a.hp = Math.max(j.a.hp, j.a.maxHp * 0.34);
    }
    for (const q of this.postes) { q.sacudida = Math.max(0, q.sacudida - dt); q.calma = Math.max(0, q.calma - dt); }
    if (jugando) this.checkEnd();
    this.render();
    this.filterUi();
  }

  private alPie(a: Actor, p: Poste, r: number) { return Math.abs(a.x - p.x) < r && Math.abs(a.y - p.y) < 16; }

  /** Trepando: machacar sube rápido, mantener arriba sube despacio, abajo se desliza, salto se suelta. Arriba, puño a la bola. */
  private trepar(j: Jugador, it: Intent, dt: number, _mantiene: boolean, arriba: boolean) {
    const a = j.a, t = this.trepa.get(a)!;
    t.cool = Math.max(0, t.cool - dt);
    t.golpeT = Math.max(0, t.golpeT - dt);
    const cima = this.cima(t.poste);
    if (it.jump) { this.soltar(a, false); return; }
    if (t.poste.rota) { this.soltar(a, false); return; }
    let sube = 0;
    if (t.h >= cima - 0.5) {
      if (it.punch || it.kick) this.pegarBola(j, t);
    } else if (t.cool <= 0) {
      if (it.punch || it.kick) {
        const b = it.punch ? 'p' : 'k';
        t.boost = Math.min(100, t.boost + (b !== t.last ? 22 : 8));
        t.last = b;
      }
      // mantener arriba también sube (en Paseo, bastante)
      const lento = arriba || (!j.c.human && it.y < 0) ? (ajustes().nombre === 'PASEO' ? 34 : 20) : 0;
      // la máquina trepa a su ritmo (el de la carrera, según el nivel)
      sube = j.c.human ? t.boost * 0.75 + lento : j.sparring ? 4 : 34 * ajustes().cpuVel;
    }
    t.boost = Math.max(0, t.boost - 70 * dt);
    if (it.y > 0 && j.c.human) sube = -70;
    const dh = sube * dt;
    t.h = Phaser.Math.Clamp(t.h + dh, 0, cima);
    if (t.h <= 0 && it.y > 0) { this.soltar(a, false); return; }
    // el dibujo: de espaldas abrazado al bambú, las piernas y los brazos al ritmo de lo que sube
    if (a.fig.anim.name === 'uppercut' && !a.fig.anim.done) a.fig.step(dt);
    else {
      if (a.fig.anim.name !== 'walk') a.fig.set('walk');
      a.fig.step(0, Math.abs(dh) * 1.6);
    }
    a.fig.row = 'up';
  }

  // ------------------------------------------------------------------ la máquina

  private cpu(j: Jugador, dt: number): Intent {
    // el Kenji del entrenamiento: trepa despacito y, si lo tumban, se queda tranquilo
    if (j.sparring) return this.trepa.has(j.a) ? { ...NOTHING, y: -1 } : NOTHING;
    j.pensar -= dt;
    if (j.pensar > 0) return { ...j.quiere, punch: false, kick: false, jump: false };
    j.pensar = 0.12 + Math.random() * 0.1;
    const a = j.a, ag = ajustes().cpuAgresion;
    const mio = this.postes.find((q) => q.team === j.c.team)!, suyo = this.postes.find((q) => q.team !== j.c.team)!;
    const it: Intent = { ...NOTHING };
    const ir = (x: number, y: number) => {
      const dx = x - a.x, dy = y - a.y;
      it.x = Math.abs(dx) > 4 ? Math.sign(dx) : 0;
      it.y = Math.abs(dy) > 3 ? Math.sign(dy) : 0;
      it.run = Math.abs(dx) > 90;
      return Math.abs(dx) < 10 && Math.abs(dy) < 8;
    };
    // el compañero de la persona: si ella se queda cuidando la casa, él sale a atacar (y al revés)
    const persona = this.jugadores.find((o) => o.c.human);
    if (persona && j.c.team === persona.c.team && !j.c.human) {
      const enCasa = Math.abs(persona.a.x - mio.x) < 90 && !this.trepa.has(persona.a);
      persona.cercaDeCasa = enCasa ? persona.cercaDeCasa + 0.17 : 0;
      j.rol = persona.cercaDeCasa > 2 ? 'ataque' : 'defensa';
    }
    // trepando
    const t = this.trepa.get(a);
    if (t) {
      if (t.h >= this.cima(t.poste) - 0.5) { if (Math.random() < 0.55 * (0.5 + ag / 2)) it.punch = true; }
      else { it.y = -1; if (Math.random() < 0.5 * ajustes().cpuVel) it[Math.random() < 0.5 ? 'punch' : 'kick'] = true; }
      j.quiere = it;
      return it;
    }
    // si alguien del otro equipo trepa mi poste, abajo a sacudirlo (lo hace el defensor, o cualquiera que esté cerca)
    const invasor = [...this.trepa].find(([o, tt]) => tt.poste === mio && o.team !== j.c.team);
    if (invasor && (j.rol === 'defensa' || Math.abs(a.x - mio.x) < 120)) {
      if (ir(mio.x + (j.c.team === 0 ? 14 : -14), mio.y + 4) || this.alPie(a, mio, 22)) {
        a.left = a.x > mio.x;
        if (Math.random() < 0.7 * ag) { if (invasor[1].h < 40 && Math.random() < 0.5) it.punch = true; else it.kick = true; }
      }
      j.quiere = it;
      return it;
    }
    const rival = this.actors.filter((o) => o.team !== j.c.team && !this.trepa.has(o) && ['idle', 'walk', 'run', 'attack', 'guard'].includes(o.st))
      .sort((p, q) => Math.abs(p.x - a.x) - Math.abs(q.x - a.x))[0];
    const pegado = rival && Math.abs(rival.x - a.x) < 28 && Math.abs(rival.y - a.y) < 10 ? rival : null;
    if (j.rol === 'ataque') {
      // si le pegan, devuelve; si no, sigue derecho al poste del otro y arriba
      if (pegado && pegado.st === 'attack' && Math.random() < 0.5 * ag) { a.left = pegado.x < a.x; it[Math.random() < 0.6 ? 'punch' : 'kick'] = true; }
      else if (ir(suyo.x + (j.c.team === 0 ? -8 : 8), suyo.y + 2) || this.alPie(a, suyo, 12)) it.jump = true;
    } else {
      // cuidando la casa: sale solo contra el que ya llegó al pie del poste
      const viene = rival && Math.abs(rival.x - mio.x) < 50 ? rival : null;
      if (viene && pegado === viene) { a.left = viene.x < a.x; if (Math.random() < 0.45 * ag) it[Math.random() < 0.6 ? 'punch' : 'kick'] = true; }
      else if (viene) ir(viene.x + (viene.x < a.x ? 18 : -18), viene.y);
      else ir(mio.x + (j.c.team === 0 ? 40 : -40), mio.y + 10);
    }
    j.quiere = it;
    return it;
  }

  // ------------------------------------------------------------------ entrenamiento

  private pasos(): Paso[] {
    const me = () => this.jugadores[0];
    const suyo = () => this.postes[1];
    return [
      { texto: 'CAMINA HASTA EL POSTE RIVAL\n(EL DE LA BOLA ROJA)', botones: ['stick'], listo: () => this.alPie(me().a, suyo(), 30) || this.trepa.has(me().a) },
      { texto: 'AL PIE DEL POSTE, TOCA {SALTO}\nPARA AGARRARTE', botones: ['jump'], listo: () => this.trepa.has(me().a) },
      { texto: 'ALTERNA {PUÑO} Y {PATADA} RÁPIDO\nPARA TREPAR', botones: ['punch', 'kick'], listo: () => (this.trepa.get(me().a)?.h ?? 0) >= this.cima(suyo()) - 1 },
      { texto: '¡ARRIBA! DALE {PUÑO} A LA BOLA\nHASTA AGRIETARLA', botones: ['punch'], listo: () => suyo().vida <= 50 },
      {
        texto: `¡${this.rivalEntrenoNombre} TREPA TU POSTE! BÁJATE CON {SALTO},\nCORRE Y PATÉALO CON {PATADA}`, botones: ['jump', 'kick'],
        antes: () => this.sparring(), listo: () => this.bajados >= 1 || ![...this.trepa.keys()].some((o) => o.team === 1),
      },
      { texto: '¡ESO! AHORA VUELVE Y\nROMPE LA BOLA', botones: ['punch', 'kick', 'jump'], listo: () => suyo().rota },
    ];
  }

  /** Entrenamiento: Kenji aparece trepando el poste de la Familia, despacito. */
  private sparring() {
    if (this.jugadores.some((j) => j.c.id === this.rivalEntreno)) return;
    const c: Competidor = { id: this.rivalEntreno, team: 1, human: false };
    const a = new Actor(this, this.rivalEntreno, 1, this.postes[0].x + 12, this.postes[0].y + 6);
    a.left = true;
    this.actors.push(a);
    const j: Jugador = { a, c, rol: 'ataque', golpes: 0, pensar: 0, quiere: NOTHING, cercaDeCasa: 0, sparring: true };
    this.jugadores.push(j);
    this.agarrar(j, this.postes[0]);
    this.trepa.get(a)!.h = 30;
  }

  // ------------------------------------------------------------------ dibujo y final

  private render() {
    for (const a of this.actors) {
      const t = this.trepa.get(a);
      if (t) {
        // pegado al bambú, un poco delante para que se vea encima del palo
        a.x = t.poste.x;
        a.y = t.poste.y + 1;
        a.z = t.h;
      }
      a.render();
    }
    // los postes tiemblan cuando los patean
    for (const q of this.postes) {
      const dx = q.sacudida > 0 ? Math.sin(q.sacudida * 70) * 3 : 0;
      q.palo.x = dx;
      q.bola.setX(this.px(q.x, q.y) + dx * 1.6);
    }
    for (const [a, t] of this.trepa) { const dx = t.poste.sacudida > 0 ? Math.sin(t.poste.sacudida * 70) * 3 : 0; a.fig.x += dx; }
    // la cámara sigue a la persona (y a su pelea)
    const me = this.jugadores.find((j) => j.c.human)?.a ?? this.actors[0];
    const cam = this.cameras.main;
    const cur = cam.midPoint.x || 320;
    cam.centerOn(cur + (this.px(me.x, me.y) - cur) * 0.08, this.camY);
    this.drawHud();
  }

  private animar(dt: number) {
    for (const a of this.actors) { if (!this.trepa.has(a)) a.update(dt, NOTHING); }
    this.render();
  }

  private drawHud() {
    const g = this.hud;
    g.clear();
    const restante = Math.max(0, TIEMPO - this.clock);
    this.relojTxt.setText(`${Math.floor(restante / 60)}:${String(Math.floor(restante % 60)).padStart(2, '0')}`).setTint(restante < 15 && Math.floor(restante * 3) % 2 ? 0xff6060 : 0xffffff);
    for (const q of this.postes) {
      const x0 = q.team === 0 ? 18 : 622 - 160;
      g.fillStyle(0x000000, 0.6).fillRect(x0 - 2, 22, 164, 12);
      g.fillStyle(q.team === 0 ? 0x4a8aff : 0xff4a5a).fillRect(x0, 24, (160 * q.vida) / VIDA_BOLA, 8);
      for (const k of [0.25, 0.5, 0.75]) g.fillStyle(0x000000, 0.5).fillRect(x0 + 160 * k, 24, 1, 8);
    }
    if (this.d.practica) this.relojTxt.setText('');
  }

  private checkEnd() {
    if (this.d.practica || this.terminado) return;
    if (this.clock >= TIEMPO) {
      // nadie la rompió: gana quien le hizo más daño a la bola del otro
      const [fam, inst] = this.postes;
      this.terminar(inst.vida < fam.vida ? 0 : 1);
    }
  }

  private terminar(ganador: 0 | 1) {
    if (this.terminado) return;
    this.terminado = true;
    for (const [a] of this.trepa) if (!this.postes.some((q) => q.rota)) this.soltar(a, false);
    void this.banner(`¡${lado(ganador).gana}!`, 'fuente_titulo', 2, 1600, 110);
    this.time.delayedCall(2600, () => {
      for (const [a] of this.trepa) this.soltar(a, false);
      for (const j of this.jugadores) if (j.a.grounded) j.a.setSt(j.c.team === ganador ? 'win' : 'lose', j.c.team === ganador ? 'victory' : 'sad');
      const orden = [...this.jugadores]
        .sort((p, q) => Number(q.c.team === ganador) - Number(p.c.team === ganador) || q.golpes - p.golpes)
        .map((j) => ({ c: j.c, valor: `${j.golpes} GOLPES` }));
      this.resultados(prueba('Tamawari')?.nombre ?? 'TAMA-WARI HỘI AN', orden);
    });
  }
}
