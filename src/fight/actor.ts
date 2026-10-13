import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { kit, type Box, type Objeto } from '../core/kit';
import { efecto } from '../core/fx';
import { ATTACKS, DEPTH, FLOOR_TOP, GRAVITY, HP, PESO_DMG, SPEED, XMAX, XMIN, type AttackDef } from './defs';

/** Lo que un atleta quiere hacer en este cuadro (de la palanca o de la máquina). */
export interface Intent { x: number; y: number; run: boolean; punch: boolean; kick: boolean; jump: boolean; special: boolean; guard?: boolean }
export const NOTHING: Intent = { x: 0, y: 0, run: false, punch: false, kick: false, jump: false, special: false };

/** Lo que el atleta necesita del mundo. */
export interface World {
  /** la escena de Phaser */
  sc: Phaser.Scene;
  actors: Actor[];
  items: Item[];
  hitstop(s: number): void;
  spark(x: number, y: number, z: number, big: boolean): void;
  dust(x: number, y: number): void;
  number(x: number, y: number, n: number): void;
  shake(ms: number, k: number): void;
  sfx(name: string, vol?: number): void;
  onKO(a: Actor): void;
  onHit(attacker: Actor | null, victim: Actor, dmg: number, kd: boolean): void;
  special(a: Actor): void;
  // Lo de abajo es para escenarios con relieve (cross country). La azotea no lo usa.
  /** fila de pantalla donde empieza el piso (si no, la de la azotea) */
  floorTop?: number;
  /** límites del mundo (si no, los de la azotea) */
  limites?: { xmin: number; xmax: number; depth: number };
  /** altura del piso bajo (x, y) para quien está a la altura z: 0 el suelo, el techo de una caja, o HUECO */
  suelo?(x: number, y: number, z: number): number;
  /** si un cuerpo a la altura z no cabe en (x, y): pared o caja más alta de lo que se sube de un paso */
  bloquea?(x: number, y: number, z: number): boolean;
  /** se cayó por un hueco */
  caida?(a: Actor): void;
  /** cada paso de la animación (para el polvo y el sonido según el piso); si no está, suena piedra para la persona */
  paso?(a: Actor): void;
  /** multiplicador del daño de un golpe (el nivel de dificultad) */
  multDaño?(from: Actor | null, victim: Actor): number;
  /** un cartelito de cómic sobre alguien (¡BLOQUEO!, ¡ÑAM!) */
  aviso?(a: Actor, s: string, color: number): void;
  /** la comida que hay en el piso (la máquina va por ella si está mal de vida) */
  comida?: { x: number; y: number }[];
  /**
   * La vista inclinada: cuántos pixeles se corre a la derecha cada pixel de profundidad (lo del fondo queda a la
   * izquierda, como las juntas del piso de la azotea). 0 o nada: todo derecho. Solo cambia el dibujo, no el mundo.
   */
  inclinacion?: number;
  /** el gesto fuerte de una burla de equipo (evento `frase` del kit): el globo con la frase */
  frase?(a: Actor): void;
}

/** Lo que devuelve `suelo` donde no hay piso. */
export const HUECO = -1000;

export type St =
  | 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'hurt' | 'fall' | 'down' | 'getup' | 'dizzy'
  | 'lifted' | 'thrown' | 'lift' | 'carry' | 'throw' | 'pick' | 'ko' | 'win' | 'lose' | 'special' | 'frozen'
  | 'guard' | 'grab' | 'grabbed' | 'taunt';

const ACTIVE: St[] = ['idle', 'walk', 'run'];

export class Actor {
  readonly fig: Figura;
  readonly shadow: Phaser.GameObjects.Ellipse;
  x: number; y: number; z = 0;
  vx = 0; vy = 0; vz = 0;
  st: St = 'idle';
  t = 0;
  hp: number;
  maxHp: number;
  /** velocidad propia (el nivel de dificultad la baja o la sube para la máquina) */
  vel = 1;
  meter = 0;
  combo = 0;
  comboT = 0;
  queued: 'punch' | 'kick' | null = null;
  hitTimes: number[] = [];
  invul = 0;
  bounces = 0;
  carrying: Actor | Item | null = null;
  carrier: Actor | null = null;
  weapon: Item | null = null;
  thrower: Actor | null = null;
  hitThisAttack = new Set<Actor>();
  attack: AttackDef | null = null;
  liftTarget: Actor | Item | null = null;
  /** técnica especial en curso (la maneja la escena) */
  specialData: Record<string, number> = {};
  stars: Phaser.GameObjects.Graphics;
  /** las estrellas de mareo del kit, mientras dura el mareo (undefined: el kit no las trae) */
  private estrellas: Phaser.GameObjects.Sprite | null | undefined = null;
  readonly nombre: string;
  /** a quién tengo agarrado, y quién me tiene agarrado */
  agarra: Actor | null = null;
  agarrador: Actor | null = null;
  private rodillazos = 0;
  /** un ratito después de un golpe (sin caer) se le puede agarrar */
  agarrable = 0;
  /** los golpes que paró la guardia hace poco: al tercero se rompe */
  private bloqueos: number[] = [];
  /** el rival tirado que voy a pisar */
  private pisado: Actor | null = null;
  /** cuánto dura la burla en curso */
  private burlaT = 0;

  constructor(readonly w: World, readonly id: string, readonly team: 0 | 1, x: number, y: number, readonly human = false) {
    this.x = x;
    this.y = y;
    this.nombre = kit().atletas[id]?.nombre ?? id;
    this.maxHp = this.hp = HP[id] ?? 100;
    const s = w.sc;
    this.fig = new Figura(s, x, FLOOR_TOP + y, id, 'idle');
    this.fig.left = team === 1;
    const big = this.fig.celda > 48;
    this.shadow = s.add.ellipse(x, FLOOR_TOP + y, big ? 30 : 22, big ? 8 : 6, 0x000000, 0.35);
    this.stars = s.add.graphics();
  }

  get left() { return this.fig.left; }
  set left(v: boolean) { this.fig.left = v; }
  get dir() { return this.left ? -1 : 1; }
  get alive() { return this.st !== 'ko'; }
  get controllable() { return ACTIVE.includes(this.st); }
  get grounded() { return this.z <= this.base + 0.01; }
  /** fila de pantalla del fondo de la franja */
  get ft() { return this.w.floorTop ?? FLOOR_TOP; }
  /** altura del piso bajo los pies */
  get base() { return this.w.suelo ? this.w.suelo(this.x, this.y, this.z) : 0; }

  play(name: string, restart = false, speed = 1) { this.fig.set(name, restart, speed); }
  setSt(st: St, anim?: string, restart = true) {
    this.st = st;
    this.t = 0;
    if (anim) this.play(anim, restart);
  }

  /** Caja del cuerpo en el cuadro actual, en coordenadas del mundo: [x0, x1, alto0, alto1]. */
  hurtbox(): [number, number, number, number] | null {
    const a = this.fig.anim;
    const b: Box | null | undefined = a.data.cuerpo?.[this.fig.rowIndex]?.[a.frame] ?? a.data.cajas?.[this.fig.rowIndex]?.[a.frame];
    if (!b) return null;
    const [bx, by, bw, bh] = b;
    const x0 = this.left ? this.x - (bx + bw) : this.x + bx;
    return [x0, x0 + bw, this.z - (by + bh), this.z - by];
  }

  /** Punto de la carga (lo levantado) en el mundo: x, y, z. */
  cargaPoint(): [number, number] | null {
    const a = this.fig.anim;
    const c = a.data.carga?.[this.fig.rowIndex]?.[a.frame];
    if (!c) return null;
    return [this.x + (this.left ? -c[0] : c[0]), this.z - c[1]];
  }

  // ------------------------------------------------------------------ cuadro a cuadro

  update(dt: number, it: Intent) {
    this.t += dt;
    if (this.invul > 0) this.invul -= dt;
    if (this.agarrable > 0) this.agarrable -= dt;
    if (this.comboT > 0) { this.comboT -= dt; if (this.comboT <= 0) this.combo = 0; }
    switch (this.st) {
      case 'idle': case 'walk': case 'run': this.move(dt, it); break;
      case 'jump': this.air(dt, it); break;
      case 'attack': this.attacking(dt, it); break;
      case 'hurt': this.hurtTick(dt); break;
      case 'fall': this.falling(dt); break;
      case 'down': this.downTick(dt); break;
      case 'getup': this.getupTick(dt); break;
      case 'dizzy': this.dizzyTick(dt, it); break;
      case 'lift': this.lifting(dt); break;
      case 'carry': this.carryTick(dt, it); break;
      case 'throw': this.throwing(dt); break;
      case 'pick': this.picking(dt); break;
      case 'lifted': this.liftedTick(dt); break;
      case 'thrown': this.thrownTick(dt); break;
      case 'ko': this.fig.step(dt); break;
      case 'win': case 'lose': this.fig.step(dt); if (this.st === 'win' && this.fig.anim.done) this.play('celebrate'); break;
      case 'special': case 'frozen': break;
      case 'guard': this.guardTick(dt, it); break;
      case 'grab': this.grabTick(dt, it); break;
      case 'grabbed': this.grabbedTick(dt, it); break;
      case 'taunt': {
        const ev = this.fig.step(dt);
        if (ev.some((e) => e.tipo === 'frase')) this.w.frase?.(this);
        if (this.t > this.burlaT) this.setSt('idle', 'idle');
        break;
      }
    }
    this.clamp();
  }

  private clamp() {
    if (this.st === 'lifted' || this.st === 'grabbed') return;
    const l = this.w.limites;
    this.x = Phaser.Math.Clamp(this.x, l?.xmin ?? XMIN, l?.xmax ?? XMAX);
    this.y = Phaser.Math.Clamp(this.y, 0, l?.depth ?? DEPTH);
  }

  /** Mueve en x y en y por separado, sin meterse en paredes ni cajas altas. */
  private desplazar(dx: number, dy: number) {
    const w = this.w;
    // en el aire no pierde el impulso: si sube lo suficiente, pasa por encima
    const quieto = this.grounded && this.vz <= 0;
    if (!w.bloquea || !w.bloquea(this.x + dx, this.y, this.z)) this.x += dx; else if (quieto) this.vx = 0;
    if (!w.bloquea || !w.bloquea(this.x, this.y + dy, this.z)) this.y += dy; else if (quieto) this.vy = 0;
  }

  private move(dt: number, it: Intent) {
    if (it.special && this.meter >= 100) { this.w.special(this); return; }
    if (it.jump) { this.jump(it); return; }
    if (it.guard && !this.weapon && !this.carrying) { this.setSt('guard', 'guard'); this.vx = 0; return; }
    if (it.punch) { if (this.weapon) this.swing(); else this.punchOrGrab(); return; }
    if (it.kick) { if (this.weapon) this.throwWeapon(); else this.kickAttack(); return; }
    if (it.x) this.left = it.x < 0;
    const running = it.run && it.x !== 0;
    const sx = (running ? SPEED.runX : SPEED.walkX) * this.vel, sy = (running ? SPEED.runY : SPEED.walkY) * this.vel;
    const dx = it.x * sx * dt, dy = it.y * sy * dt;
    // pegándose a un rival aturdido (recién golpeado o mareado), lo agarras, caminando o corriendo
    if (it.x && !this.weapon && this.intentaAgarrar(it.x)) return;
    this.desplazar(dx, dy);
    // un escalón chico se sube solo; si se acaba el piso, se cae
    const base = this.base;
    if (this.z < base) this.z = base;
    else if (this.z > base + 0.5) { this.st = 'jump'; this.t = 0; this.vz = 0; this.vx = (running ? it.x * SPEED.runX : it.x * SPEED.walkX) * Math.max(1, this.vel); this.vy = 0; this.play('jump_fall'); return; }
    const dist = Math.hypot(dx, dy * 1.4);
    if (it.x || it.y) {
      this.st = running ? 'run' : 'walk';
      this.play(running ? 'run' : 'walk');
      this.footsteps(this.fig.step(dt, dist));
    } else {
      this.st = 'idle';
      this.play('idle');
      this.fig.step(dt);
    }
    this.vx = running ? it.x * SPEED.runX * this.vel : 0;
  }

  private footsteps(ev: { tipo: string }[]) {
    if (!ev.some((e) => e.tipo === 'paso')) return;
    if (this.w.paso) this.w.paso(this);
    else if (this.human) this.w.sfx(`paso_piedra_${Math.floor(Math.random() * 3)}`, 0.25);
  }

  private jump(it: Intent) {
    this.st = 'jump';
    this.t = 0;
    this.vz = 255;
    // el salto siempre llega igual de lejos: el nivel solo frena en el piso
    this.vx = it.x * (it.run ? SPEED.runX : SPEED.walkX * 1.25) * Math.max(1, this.vel);
    this.vy = it.y * SPEED.walkY;
    this.play('jump_rise', true);
    this.w.sfx('esquiva', 0.25);
  }

  private air(dt: number, it: Intent) {
    this.physics(dt);
    // saltando corriendo, la patada voladora de verdad; parado, la de siempre
    if (it.kick || it.punch) { this.startAttack(Math.abs(this.vx) > 110 && this.tiene('flying_kick') ? 'flying_kick' : 'air_kick'); return; }
    if (this.grounded) { this.land(); return; }
    this.play(this.vz > 70 ? 'jump_rise' : this.vz > -70 ? 'jump_apex' : 'jump_fall');
    this.fig.step(dt);
  }

  private land() {
    this.z = this.base; this.vz = 0; this.vx = 0; this.vy = 0;
    this.w.dust(this.x, this.y);
    this.setSt('idle', 'land');
  }

  private physics(dt: number) {
    this.desplazar(this.vx * dt, this.vy * dt);
    this.vz -= GRAVITY * dt;
    this.z += this.vz * dt;
    const base = this.base;
    if (base <= HUECO / 2) { if (this.z < -60) this.w.caida?.(this); return; }
    if (this.z < base) this.z = base;
  }

  // ------------------------------------------------------------------ ataques

  private punchOrGrab() {
    // un rival tirado cerca: levantarlo
    const body = this.w.actors.find((a) => a !== this && a.team !== this.team && a.st === 'down' && Math.abs(a.x - this.x) < 30 && Math.abs(a.y - this.y) < 12);
    if (body) { this.startLift(body); return; }
    // un mareado al alcance: se agarra con el puño
    if (!this.weapon && this.intentaAgarrar(this.dir, true)) return;
    const item = this.w.items.find((i) => i.st === 'floor' && Math.abs(i.x - this.x) < 22 && Math.abs(i.y - this.y) < 12);
    if (item) {
      if (item.def.peso === 'pesado') this.startLift(item);
      else { this.liftTarget = item; this.setSt('pick', 'weapon_pick'); }
      return;
    }
    if (this.st === 'run') { this.startAttack('run_punch'); this.vx = this.dir * 150; return; }
    // jab, jab y el gancho que tumba
    const seq = ['jab', 'jab', this.tiene('hook') ? 'hook' : 'punch'];
    this.startAttack(seq[Math.min(this.combo, 2)]);
    this.combo = (this.combo + 1) % 3;
    this.comboT = 0.75;
  }

  private kickAttack() {
    // uno tirado al lado: pisotón
    const tirado = this.w.actors.find((a) => a !== this && a.team !== this.team && a.st === 'down' && a.hp > 0 && Math.abs(a.x - this.x) < 26 && Math.abs(a.y - this.y) < 10);
    if (tirado && this.st !== 'run') {
      this.left = tirado.x < this.x;
      this.pisado = tirado;
      this.startAttack('low_kick');
      this.attack = ATTACKS.pisoton;
      return;
    }
    this.pisado = null;
    if (this.st === 'run') { this.startAttack('run_kick'); this.vx = this.dir * 160; return; }
    const seq = ['low_kick', 'kick_martial'];
    this.startAttack(seq[Math.min(this.combo % 2, 1)]);
    this.combo = (this.combo + 1) % 2;
    this.comboT = 0.75;
  }

  private swing() {
    const heavy = this.weapon!.def.peso !== 'liviano';
    this.startAttack(heavy ? 'weapon_swing_heavy' : 'weapon_swing');
  }

  private throwWeapon() { this.setSt('attack', 'weapon_throw'); this.attack = null; }

  startAttack(name: string) {
    this.st = 'attack';
    this.t = 0;
    this.attack = ATTACKS[name] ?? null;
    this.hitThisAttack.clear();
    this.queued = null;
    this.play(name, true);
    if (name !== 'run_punch' && name !== 'run_kick' && name !== 'air_kick' && name !== 'flying_kick') this.vx = 0;
    if (name !== 'low_kick') this.pisado = null;
  }

  private attacking(dt: number, it: Intent) {
    const airborne = !this.grounded || this.fig.anim.name === 'air_kick' || this.fig.anim.name === 'flying_kick';
    if (airborne) this.physics(dt);
    else { this.desplazar(this.vx * dt, 0); this.vx *= Math.pow(0.02, dt); }
    if (it.punch && this.fig.anim.name !== 'weapon_throw') this.queued = 'punch';
    if (it.kick) this.queued = 'kick';
    const ev = this.fig.step(dt);
    for (const e of ev) {
      if (e.tipo === 'impacto' && this.attack && this.pisado) this.pisar();
      else if (e.tipo === 'impacto' && this.attack) this.resolveHit(e.punto);
      if (e.tipo === 'suelta' && this.weapon) this.releaseWeapon();
    }
    if (airborne && this.grounded && this.t > 0.05) { this.land(); return; }
    if (this.fig.anim.done) {
      if (!this.grounded) { this.st = 'jump'; return; }
      const q = this.queued;
      this.setSt('idle', 'idle');
      if (q === 'punch' && this.combo > 0) { if (this.weapon) this.swing(); else this.punchOrGrab(); }
      else if (q === 'kick' && this.combo > 0 && !this.weapon) this.kickAttack();
    }
  }

  /** El golpe en el cuadro exacto del impacto: busca rivales cuyo cuerpo contenga el punto. */
  resolveHit(punto?: [number, number][], def = this.attack!, radius = 6) {
    const p = punto?.[this.fig.rowIndex] ?? [14, -24];
    const reach = def.reach ?? 0;
    const hx = this.x + this.dir * (p[0] + reach), hz = this.z - p[1];
    let any = false;
    for (const v of this.w.actors) {
      if (v === this || v.team === this.team || this.hitThisAttack.has(v)) continue;
      if (!v.canBeHit()) continue;
      if (Math.abs(v.y - this.y) > 13) continue;
      const hb = v.hurtbox();
      if (!hb) continue;
      if (hx < hb[0] - radius || hx > hb[1] + radius || hz < hb[2] - radius || hz > hb[3] + radius) continue;
      this.hitThisAttack.add(v);
      any = true;
      v.takeHit(this, def, this.dir);
      this.w.spark(hx, v.y, hz, !!def.kd);
    }
    if (!any && def.dmg >= 9) this.w.sfx('esquiva', 0.2);
    return any;
  }

  canBeHit() {
    return this.invul <= 0 && !['down', 'ko', 'lifted', 'thrown', 'getup', 'fall', 'frozen'].includes(this.st);
  }

  takeHit(from: Actor | null, def: AttackDef, dir: number) {
    const now = this.w.sc.time.now;
    // la guardia para lo que viene de frente; lo muy pesado, o tres golpes seguidos, la rompen
    if (this.st === 'guard' && from && (from.x - this.x) * this.dir > 0) {
      this.bloqueos = this.bloqueos.filter((t) => now - t < 1500);
      this.bloqueos.push(now);
      if (def.dmg < 14 && this.bloqueos.length < 3) {
        const poco = Math.max(1, Math.round(def.dmg * 0.15));
        this.hp = Math.max(1, this.hp - poco);
        this.vx = dir * 30;
        this.desplazar(dir * 4, 0);
        this.play('fight_block', true);
        this.w.sfx('bloqueo', 0.5);
        this.w.aviso?.(this, '¡BLOQUEO!', 0x9ad8ff);
        from.meter = Math.min(100, from.meter + 2);
        return;
      }
      this.bloqueos = [];
      this.w.aviso?.(this, '¡SE ROMPIÓ LA GUARDIA!', 0xffa060);
      this.w.sfx('critico', 0.4);
      this.setSt('hurt', this.tiene('stagger') ? 'stagger' : 'fight_hit');
      this.vx = dir * 40;
      return;
    }
    this.hitTimes = this.hitTimes.filter((t) => now - t < 1400);
    this.hitTimes.push(now);
    const dmg = def.dmg * (this.team === 0 && !this.human ? 0.85 : 1) * (this.w.multDaño?.(from, this) ?? 1);
    this.hp = Math.max(0, this.hp - dmg);
    this.meter = Math.min(100, this.meter + 7);
    if (from) from.meter = Math.min(100, from.meter + 6);
    const kd = !!def.kd || this.hitTimes.length >= 3 || this.hp <= 0;
    this.soltar();
    this.dropAll();
    this.left = dir > 0;
    this.w.onHit(from, this, dmg, kd);
    this.w.number(this.x, this.y, Math.round(dmg));
    if (kd) this.knockdown(dir, def.push, def.launch ?? 150);
    else {
      this.setSt('hurt', 'fight_hit');
      this.vx = dir * def.push;
      this.agarrable = 0.6;
    }
  }

  knockdown(dir: number, push: number, launch = 150) {
    this.hitTimes = [];
    this.soltar();
    this.dropAll();
    this.setSt('fall', 'ko_bounce');
    this.vx = dir * push;
    this.vz = launch;
    this.vy = 0;
    this.bounces = 0;
  }

  private hurtTick(dt: number) {
    this.desplazar(this.vx * dt, 0);
    this.vx *= Math.pow(0.01, dt);
    this.fig.step(dt);
    // tambaleando (guardia rota) dura más
    if (this.t > (this.fig.anim.name === 'stagger' ? 0.85 : 0.32)) this.setSt('idle', 'idle');
  }

  /** ¿El kit trae esta animación para este atleta? */
  tiene(anim: string) { return !!kit().atletas[this.id] && Object.values(kit().atletas[this.id].packs).some((p) => anim in p.anims); }

  // ------------------------------------------------------------------ guardia, agarre, pisotón y burla

  private guardTick(dt: number, it: Intent) {
    this.desplazar(this.vx * dt, 0);
    this.vx *= Math.pow(0.02, dt);
    this.fig.step(dt);
    if (this.fig.anim.name === 'fight_block' && this.fig.anim.done) this.play('guard');
    if (!it.guard) this.setSt('idle', 'idle');
  }

  /** Agarra al rival que tenga justo delante si está aturdido (recién golpeado o mareado). */
  private intentaAgarrar(hacia: number, soloMareado = false): boolean {
    if (!this.tiene('grab')) return false;
    const v = this.w.actors.find((a) => a !== this && a.team !== this.team && a.agarrador === null && a.grounded && this.grounded
      && (a.st === 'dizzy' || (!soloMareado && a.agarrable > 0 && (a.st === 'hurt' || a.controllable) && a.fig.anim.name !== 'stagger'))
      && Math.sign(a.x - this.x) === Math.sign(hacia) && Math.abs(a.x - this.x) < (soloMareado ? 24 : 20) && Math.abs(a.y - this.y) < 7);
    if (!v) return false;
    v.dropAll();
    this.left = v.x < this.x;
    this.agarra = v;
    this.rodillazos = 0;
    this.setSt('grab', 'grab');
    v.agarrador = this;
    v.left = !this.left;
    v.setSt('grabbed', 'grabbed');
    v.agarrable = 0;
    v.vx = 0;
    this.w.sfx('recoger', 0.4);
    this.w.aviso?.(v, v.human ? '¡TE AGARRÓ!' : this.human ? '¡LO AGARRASTE!' : '¡AGARRADO!', 0xffe080);
    return true;
  }

  /** Agarrando: puño son rodillazos (el tercero tumba), patada lo bota al piso. */
  private grabTick(dt: number, it: Intent) {
    const v = this.agarra;
    if (!v || v.st !== 'grabbed' || v.agarrador !== this) { this.soltar(); this.setSt('idle', 'idle'); return; }
    const ev = this.fig.step(dt);
    const nombre = this.fig.anim.name;
    if (nombre === 'grab' && this.fig.anim.done) this.play('grab_hold');
    if (nombre === 'knee_grab') {
      if (ev.some((e) => e.tipo === 'impacto')) {
        this.rodillazos++;
        const ultimo = this.rodillazos >= 3;
        const dmg = (ultimo ? 8 : 5) * (this.w.multDaño?.(this, v) ?? 1);
        v.hp = Math.max(0, v.hp - dmg);
        this.meter = Math.min(100, this.meter + 5);
        this.w.onHit(this, v, dmg, ultimo);
        this.w.number(v.x, v.y, Math.round(dmg));
        this.w.spark(v.x - this.dir * 4, v.y, 18, ultimo);
        if (ultimo || v.hp <= 0) { this.soltar(); v.knockdown(this.dir, 110, 190); this.setSt('idle', 'idle'); return; }
      }
      if (this.fig.anim.done) this.play('grab_hold');
    } else if (it.punch) this.play(this.tiene('knee_grab') ? 'knee_grab' : 'jab', true);
    else if (it.kick) {
      // lo bota al piso con todo
      const dmg = 9 * (this.w.multDaño?.(this, v) ?? 1);
      v.hp = Math.max(0, v.hp - dmg);
      this.soltar();
      this.w.onHit(this, v, dmg, true);
      this.w.number(v.x, v.y, Math.round(dmg));
      v.knockdown(this.dir, 190, 230);
      this.startAttack('kick_martial');
      this.attack = null;
      return;
    }
    // lo lleva pegado a las manos
    v.x = this.x + this.dir * 13;
    v.y = this.y;
    v.z = this.z;
  }

  /** Agarrado: forcejea; machacando botones se suelta antes. La máquina se suelta sola al rato. */
  private grabbedTick(dt: number, it: Intent) {
    const g = this.agarrador;
    this.fig.step(dt);
    if (!g || g.agarra !== this || g.st !== 'grab') { this.agarrador = null; this.setSt('idle', 'idle'); return; }
    if (it.punch || it.kick || it.jump || (it.x && Math.random() < 0.2)) this.t += 0.22;
    if (this.t > 2.4) {
      // se zafa: empuja al otro y queda libre
      g.soltar();
      g.setSt('hurt', 'fight_hit');
      g.vx = -g.dir * 90;
      this.setSt('attack', this.tiene('break_free') ? 'break_free' : 'fight_block');
      this.attack = null;
      this.invul = 0.4;
      this.w.sfx('esquiva', 0.4);
      this.w.aviso?.(this, '¡ME SOLTÉ!', 0x8ae08a);
    }
  }

  /** Suelta a quien tenga agarrado (o se suelta de quien lo tenga). */
  soltar() {
    const v = this.agarra;
    if (v) { this.agarra = null; if (v.agarrador === this) { v.agarrador = null; if (v.st === 'grabbed') v.setSt('idle', 'idle'); } }
    const g = this.agarrador;
    if (g) { this.agarrador = null; if (g.agarra === this) { g.agarra = null; if (g.st === 'grab') g.setSt('idle', 'idle'); } }
  }

  /** El pisotón al que está tirado: poquito daño, pero lo deja más rato en el piso. */
  private pisar() {
    const v = this.pisado;
    this.pisado = null;
    if (!v || v.st !== 'down') return;
    const dmg = (this.attack?.dmg ?? 4) * (this.w.multDaño?.(this, v) ?? 1);
    v.hp = Math.max(0, v.hp - dmg);
    v.t = Math.min(v.t, 0.35);
    this.meter = Math.min(100, this.meter + 4);
    this.w.onHit(this, v, dmg, false);
    this.w.number(v.x, v.y, Math.round(dmg));
    this.w.dust(v.x, v.y);
    this.w.aviso?.(v, '¡PISOTÓN!', 0xffb040);
  }

  /** La burla de su equipo del kit (lote C5): `burla_<equipo>`, si la trae. */
  get burlaDeEquipo(): string | null {
    const eq = (kit().atletas[this.id] as { equipo?: string } | undefined)?.equipo;
    return eq && this.tiene(`burla_${eq}`) ? `burla_${eq}` : null;
  }

  /**
   * Burlarse un ratito: casi siempre con la burla de su equipo (entera, con su globo en el gesto fuerte), o riéndose o
   * señalando. Queda abierto a que le peguen. Devuelve la animación, o null si no pudo.
   */
  burla(seg = 1): string | null {
    if (!this.controllable) return null;
    const eq = this.burlaDeEquipo;
    const anim = eq && Math.random() < 0.7 ? eq : Math.random() < 0.5 && this.tiene('laugh') ? 'laugh' : this.tiene('point') ? 'point' : 'taunt';
    this.setSt('taunt', anim);
    // la del equipo dura lo que dura su animación
    this.burlaT = anim === eq ? Math.max(seg, this.fig.anim.data.cuadros / this.fig.anim.data.fps) : seg;
    this.vx = 0;
    return anim;
  }

  private falling(dt: number) {
    this.physics(dt);
    this.vx *= Math.pow(0.4, dt);
    this.fig.step(dt * 0.9);
    if (this.grounded && this.vz <= 0 && this.t > 0.05) {
      this.w.dust(this.x, this.y);
      if (this.bounces === 0) {
        this.bounces++;
        this.vz = 70;
        this.vx *= 0.5;
        this.w.sfx(this.fig.celda > 48 ? 'jefe_pisoton' : 'golpe', 0.35);
        if (this.fig.celda > 48) this.w.shake(180, 0.01);
      } else {
        this.z = this.base; this.vz = 0; this.vx = 0;
        this.st = 'down';
        this.t = 0;
        this.play('ko_bounce');
        this.fig.anim.pos = this.fig.anim.data.cuadros - 0.01;
        this.fig.refresh();
        if (this.hp <= 0) this.ko();
      }
    }
  }

  private ko() {
    this.st = 'ko';
    this.t = 0;
    this.w.onKO(this);
  }

  /** Fuera de combate sin pasar por el piso: se cayó de la azotea. */
  fuera() {
    this.hp = 0;
    this.soltar();
    this.dropAll();
    this.ko();
  }

  private downTick(_dt: number) {
    if (this.hp <= 0) { this.ko(); return; }
    if (this.t > 0.95) {
      this.st = 'getup';
      this.t = 0;
      this.play('fall_getup', true);
      this.fig.anim.pos = 6;
    }
  }

  private getupTick(dt: number) {
    this.fig.step(dt);
    if (this.fig.anim.done) {
      this.invul = 0.7;
      if (this.hp < this.maxHp * 0.3 && Math.random() < 0.45) this.setSt('dizzy', 'dizzy');
      else this.setSt('idle', 'idle');
    }
  }

  private dizzyTick(dt: number, it: Intent) {
    this.fig.step(dt);
    // machacar botones despierta más rápido
    if (it.punch || it.kick || it.jump) this.t += 0.15;
    if (this.t > 1.7) this.setSt('idle', 'idle');
  }

  // ------------------------------------------------------------------ levantar y lanzar

  private startLift(target: Actor | Item) {
    this.liftTarget = target;
    this.setSt('lift', 'lift');
    this.vx = 0;
  }

  private lifting(dt: number) {
    const ev = this.fig.step(dt);
    const tg = this.liftTarget;
    if (ev.some((e) => e.tipo === 'impacto') && tg) {
      if (tg instanceof Actor) {
        if (tg.st !== 'down') { this.liftTarget = null; this.setSt('idle', 'idle'); return; }
        tg.st = 'lifted';
        tg.t = 0;
        tg.carrier = this;
        tg.play('carried', true);
      } else {
        if (tg.st !== 'floor') { this.liftTarget = null; this.setSt('idle', 'idle'); return; }
        tg.st = 'carried';
        tg.owner = this;
      }
      this.carrying = tg;
      this.w.sfx('recoger', 0.4);
    }
    if (this.fig.anim.done) {
      if (this.carrying) this.setSt('carry', 'carry_idle');
      else this.setSt('idle', 'idle');
    }
  }

  private carryTick(dt: number, it: Intent) {
    if (!this.carrying) { this.setSt('idle', 'idle'); return; }
    if (it.punch || it.kick) { this.setSt('throw', 'throw_overhead'); return; }
    if (it.x) this.left = it.x < 0;
    const running = it.run && it.x !== 0;
    const k = SPEED.carry;
    const dx = it.x * (running ? SPEED.runX : SPEED.walkX) * k * dt, dy = it.y * SPEED.walkY * k * dt;
    this.desplazar(dx, dy);
    if (it.x || it.y) { this.play(running ? 'carry_run' : 'carry_walk'); this.footsteps(this.fig.step(dt, Math.hypot(dx, dy * 1.4))); }
    else { this.play('carry_idle'); this.fig.step(dt); }
  }

  private throwing(dt: number) {
    const ev = this.fig.step(dt);
    if (ev.some((e) => e.tipo === 'suelta')) this.releaseCarry();
    if (this.fig.anim.done) this.setSt('idle', 'idle');
  }

  private releaseCarry() {
    const c = this.carrying;
    if (!c) return;
    const [cx, cz] = this.cargaPoint() ?? [this.x, 40];
    this.carrying = null;
    if (c instanceof Actor) {
      c.carrier = null;
      c.st = 'thrown';
      c.t = 0;
      c.thrower = this;
      c.x = cx; c.y = this.y; c.z = Math.max(20, cz);
      c.vx = this.dir * 235; c.vz = 120; c.vy = 0;
      c.left = this.left;
      c.play('thrown_spin', true);
    } else {
      c.launch(this, cx, this.y, Math.max(20, cz), this.dir * 250, 110);
    }
    this.w.sfx('esquiva', 0.5);
  }

  private liftedTick(dt: number) {
    const c = this.carrier;
    this.fig.step(dt);
    if (!c || !['lift', 'carry', 'throw'].includes(c.st)) { this.carrier = null; this.knockdown(-1, 20, 60); return; }
    // se suelta solo si lo cargan mucho rato
    if (this.t > 3.2) { c.carrying = null; this.carrier = null; this.knockdown(c.dir, 60, 120); c.setSt('idle', 'idle'); return; }
    const p = c.cargaPoint();
    this.left = c.left;
    this.y = c.y;
    if (!p) { this.x = c.x + c.dir * 14; this.z = 0; return; }
    // la base del cuerpo de lo cargado va en la carga
    const b = this.fig.anim.data.cuerpo?.[this.fig.rowIndex]?.[this.fig.anim.frame];
    const baseY = b ? b[1] + b[3] : 0, midX = b ? b[0] + b[2] / 2 : 0;
    this.x = p[0] - (this.left ? -midX : midX);
    this.z = p[1] + baseY;
  }

  private thrownTick(dt: number) {
    this.physics(dt);
    this.fig.step(dt);
    if (this.x <= (this.w.limites?.xmin ?? XMIN) || this.x >= (this.w.limites?.xmax ?? XMAX)) this.vx = -this.vx * 0.5;
    for (const v of this.w.actors) {
      if (v === this || v === this.thrower || v.team === this.thrower?.team || !v.canBeHit()) continue;
      if (Math.abs(v.y - this.y) > 14 || Math.abs(v.x - this.x) > 20 || this.z > 46) continue;
      v.takeHit(this.thrower, { dmg: 13, kd: true, push: 140, launch: 170 }, Math.sign(this.vx) || 1);
      this.w.spark(v.x, v.y, 24, true);
      this.w.hitstop(0.08);
    }
    if (this.grounded && this.t > 0.08) {
      this.hp = Math.max(0, this.hp - 10);
      this.w.onHit(this.thrower, this, 10, true);
      this.w.number(this.x, this.y, 10);
      this.w.dust(this.x, this.y);
      this.w.shake(200, 0.012);
      this.w.sfx(this.fig.celda > 48 ? 'jefe_pisoton' : 'critico', 0.5);
      this.z = this.base; this.vz = 0; this.vx = 0;
      this.st = 'down';
      this.t = 0;
      this.play('land_flat', true);
      this.fig.anim.pos = this.fig.anim.data.cuadros - 0.01;
      this.fig.refresh();
    }
  }

  // ------------------------------------------------------------------ armas en la mano

  private picking(dt: number) {
    const ev = this.fig.step(dt);
    const it = this.liftTarget;
    if (ev.some((e) => e.tipo === 'impacto') && it instanceof Item && it.st === 'floor') {
      it.st = 'hand';
      it.owner = this;
      this.weapon = it;
      this.w.sfx('recoger', 0.4);
    }
    if (this.fig.anim.done) { this.liftTarget = null; this.setSt('idle', 'idle'); }
  }

  private releaseWeapon() {
    const it = this.weapon!;
    const a = this.fig.anim;
    const arma = a.data.arma?.[this.fig.rowIndex]?.[a.frame];
    const hx = arma ? this.x + this.dir * arma[0] : this.x + this.dir * 14;
    const hz = arma ? this.z - arma[1] : 22;
    this.weapon = null;
    it.launch(this, hx, this.y, hz, this.dir * 290, 50);
    this.w.sfx('esquiva', 0.45);
  }

  /** Suelta lo que tenga (al recibir un golpe). */
  dropAll() {
    if (this.weapon) { this.weapon.drop(this.x, this.y); this.weapon = null; }
    if (this.carrying) {
      const c = this.carrying;
      this.carrying = null;
      if (c instanceof Actor) { c.carrier = null; c.knockdown(this.dir, 30, 80); }
      else c.drop(this.x, this.y);
    }
  }

  // ------------------------------------------------------------------ dibujo

  /** La x de pantalla de un punto del mundo, con la vista inclinada. */
  sx(x: number, y: number) { return x + (this.w.inclinacion ?? 0) * y; }

  render() {
    const elev = this.fig.anim.data.elevacion?.[this.fig.anim.frame] ?? 0;
    const px = this.sx(this.x, this.y);
    this.fig.setPosition(Math.round(px), Math.round(this.ft + this.y - this.z - elev));
    const sortY = this.st === 'lifted' && this.carrier ? this.carrier.y + 0.5 : this.y;
    this.fig.setDepth(this.ft + sortY);
    const piso = this.base;
    this.shadow.setPosition(Math.round(px), Math.round(this.ft + this.y - Math.max(0, piso)));
    const s = Math.max(0.4, 1 - (this.z - Math.max(0, piso) + elev) / 140);
    this.shadow.setScale(s).setDepth(this.ft - 1);
    this.shadow.setVisible(this.st !== 'lifted' && piso > HUECO / 2);
    if (this.st === 'ko') this.fig.setAlpha(Math.floor(this.t * 6) % 2 === 0 || this.t > 2 ? 0.85 : 0.4);
    else this.fig.setAlpha(this.invul > 0 && Math.floor(this.t * 16) % 2 ? 0.55 : 1);
    this.drawStars();
  }

  private drawStars() {
    const g = this.stars;
    g.clear();
    const on = this.st === 'dizzy' || (this.st === 'ko' && this.t < 4) || (this.st === 'down' && this.hp < this.maxHp * 0.3);
    if (!on) { this.estrellas?.destroy(); this.estrellas = null; return; }
    const a = this.fig.anim;
    const head = a.data.cabeza?.[this.fig.rowIndex]?.[a.frame] ?? [0, -38];
    const hx = this.sx(this.x, this.y) + this.dir * head[0], hy = this.ft + this.y - this.z + head[1] - 8;
    g.setDepth(this.ft + this.y + 1);
    // las estrellas y pajaritos del kit (lote F); si no están, las de siempre
    if (this.estrellas === undefined || this.estrellas === null) this.estrellas = efecto(this.w.sc, 'estrellas_mareo', hx, hy + 6) ?? undefined;
    if (this.estrellas) { this.estrellas.setPosition(Math.round(hx), Math.round(hy + 6)).setDepth(this.ft + this.y + 1); return; }
    const tt = this.w.sc.time.now / 260;
    for (let i = 0; i < 3; i++) {
      const ang = tt + (i * Math.PI * 2) / 3;
      const sx = hx + Math.cos(ang) * 11, sy = hy + Math.sin(ang) * 3.5;
      g.fillStyle(i === 1 ? 0xffffff : 0xffe040);
      g.fillRect(Math.round(sx) - 1, Math.round(sy), 3, 1);
      g.fillRect(Math.round(sx), Math.round(sy) - 1, 1, 3);
    }
  }

  destroy() {
    this.fig.destroy();
    this.shadow.destroy();
    this.stars.destroy();
  }
}

/** Un arma o un objeto del piso: quieto, en la mano, cargado o volando. */
export class Item {
  readonly sprite: Phaser.GameObjects.Image;
  readonly shadow: Phaser.GameObjects.Ellipse;
  readonly def: Objeto;
  st: 'floor' | 'hand' | 'carried' | 'flying' | 'falling' = 'floor';
  x: number; y: number; z = 0;
  vx = 0; vy = 0; vz = 0;
  owner: Actor | null = null;
  thrower: Actor | null = null;
  t = 0;
  returned = false;
  hit = new Set<Actor>();

  get ft() { return this.w.floorTop ?? FLOOR_TOP; }

  constructor(readonly w: World, readonly kind: string, x: number, y: number, z = 0) {
    this.def = kit().objetos[kind];
    this.x = x; this.y = y; this.z = z;
    this.sprite = w.sc.add.image(x, this.ft + y, 'armas', `${kind}_quieto_0`);
    this.sprite.setOrigin(0.5, 22 / 24);
    this.shadow = w.sc.add.ellipse(x, this.ft + y, 14, 4, 0x000000, 0.3);
    if (z > 0) this.st = 'falling';
  }

  drop(x: number, y: number) {
    this.st = 'falling';
    this.owner = null;
    this.x = x; this.y = y;
    this.z = Math.max(this.z, 14);
    this.vx = (Math.random() - 0.5) * 60; this.vz = 90;
  }

  launch(by: Actor, x: number, y: number, z: number, vx: number, vz: number) {
    this.st = 'flying';
    this.owner = null;
    this.thrower = by;
    this.returned = false;
    this.hit.clear();
    this.t = 0;
    this.x = x; this.y = y; this.z = z;
    this.vx = vx; this.vz = vz; this.vy = 0;
  }

  update(dt: number) {
    this.t += dt;
    if (this.st === 'flying' || this.st === 'falling') {
      const g = this.st === 'flying' ? (this.def.peso === 'liviano' ? 260 : 520) : 900;
      this.x += this.vx * dt;
      this.vz -= g * dt;
      this.z += this.vz * dt;
      const xmin = this.w.limites?.xmin ?? XMIN, xmax = this.w.limites?.xmax ?? XMAX;
      if (this.x < xmin || this.x > xmax) { this.vx = -this.vx * 0.6; this.x = Phaser.Math.Clamp(this.x, xmin, xmax); }
      // la chancleta vuelve girando, como toda chancleta de mamá
      if (this.st === 'flying' && this.kind.startsWith('chancleta') && !this.returned && this.t > 0.42) { this.returned = true; this.vx = -this.vx * 0.9; this.vz = 70; }
      if (this.st === 'flying' && this.thrower) {
        if (this.returned && this.thrower.alive && !this.thrower.weapon && Math.abs(this.thrower.x - this.x) < 14 && Math.abs(this.thrower.y - this.y) < 12 && this.thrower.controllable) {
          this.st = 'hand'; this.owner = this.thrower; this.thrower.weapon = this; this.w.sfx('recoger', 0.4); return;
        }
        for (const v of this.w.actors) {
          if (v.team === this.thrower.team || this.hit.has(v) || !v.canBeHit()) continue;
          if (Math.abs(v.y - this.y) > 14 || Math.abs(v.x - this.x) > 16 || this.z > 50) continue;
          this.hit.add(v);
          const dmg = PESO_DMG[this.def.peso];
          v.takeHit(this.thrower, { dmg, kd: this.def.peso !== 'liviano', push: 120, launch: 140 }, Math.sign(this.vx) || 1);
          this.w.spark(v.x, v.y, Math.max(10, this.z), this.def.peso !== 'liviano');
          this.w.hitstop(0.06);
          if (!this.kind.startsWith('chancleta')) { this.vx = -this.vx * 0.3; this.vz = 80; }
        }
      }
      // en un hueco los objetos se pierden; si no, caen al piso o encima de una caja
      const piso = this.w.suelo ? this.w.suelo(this.x, this.y, this.z) : 0;
      if (piso <= HUECO / 2 && this.z < -30) { this.st = 'floor'; this.vz = 0; this.vx = 0; this.thrower = null; this.x = -9999; }
      else if (piso > HUECO / 2 && this.z <= piso && this.vz < 0) {
        this.z = piso;
        if (Math.abs(this.vz) > 140) { this.vz = -this.vz * 0.35; this.vx *= 0.5; this.w.sfx(this.def.peso === 'pesado' ? 'romper' : 'golpe', 0.25); }
        else { this.vz = 0; this.vx = 0; this.st = 'floor'; this.thrower = null; }
      }
    }
    this.y = Phaser.Math.Clamp(this.y, 0, this.w.limites?.depth ?? DEPTH);
  }

  render() {
    const s = this.sprite;
    s.setVisible(true);
    if (this.st === 'hand' && this.owner) {
      const o = this.owner, a = o.fig.anim;
      const arma = a.data.arma?.[o.fig.rowIndex]?.[a.frame];
      const hand = a.data.manos?.[o.fig.rowIndex]?.[a.frame]?.[0] ?? [6, -20];
      const elev = a.data.elevacion?.[a.frame] ?? 0;
      const [ax, ay, ang, behind] = arma ?? [hand[0], hand[1], 300, 0];
      const k = ((Math.round(ang / 22.5) % 16) + 16) % 16;
      s.setFrame(`${this.kind}_mano_${k}`).setOrigin(0.5, 0.5).setFlipX(o.left);
      s.setPosition(Math.round(o.sx(o.x, o.y) + o.dir * ax), Math.round(this.ft + o.y - o.z - elev + ay));
      s.setDepth(this.ft + o.y + (behind ? -0.2 : 0.2));
      this.shadow.setVisible(false);
      if (o.st === 'ko' || o.st === 'down') s.setVisible(false);
      return;
    }
    if (this.st === 'carried' && this.owner) {
      const p = this.owner.cargaPoint();
      const o = this.owner;
      s.setFrame(`${this.kind}_quieto_0`).setOrigin(0.5, 22 / 24).setFlipX(false);
      if (p) s.setPosition(Math.round(o.sx(p[0], o.y)), Math.round(this.ft + o.y - p[1]));
      else s.setPosition(Math.round(o.sx(o.x, o.y) + o.dir * 12), Math.round(this.ft + o.y));
      s.setDepth(this.ft + o.y + 0.4);
      this.shadow.setVisible(false);
      return;
    }
    const spinning = this.st === 'flying' || (this.st === 'falling' && this.z > 2);
    if (spinning) s.setFrame(`${this.kind}_girando_${Math.floor(this.t * 16) % 8}`).setOrigin(0.5, 0.5);
    else s.setFrame(`${this.kind}_quieto_0`).setOrigin(0.5, 22 / 24);
    s.setFlipX(false);
    const px = this.x + (this.w.inclinacion ?? 0) * this.y;
    s.setPosition(Math.round(px), Math.round(this.ft + this.y - this.z - (spinning ? 6 : 0)));
    s.setDepth(this.ft + this.y);
    this.shadow.setVisible(true).setPosition(Math.round(px), Math.round(this.ft + this.y)).setDepth(this.ft - 1).setScale(Math.max(0.4, 1 - this.z / 200));
  }

  destroy() { this.sprite.destroy(); this.shadow.destroy(); }
}
