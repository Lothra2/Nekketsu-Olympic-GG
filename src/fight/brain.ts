import { Actor, Item, NOTHING, type Intent } from './actor';
import { AGRESION } from './defs';

/** a quién va cada luchador de la máquina (para repartirse en el 4 contra 4) */
const objetivos = new WeakMap<Actor, Actor>();

/**
 * La máquina: elige un rival, se alinea en profundidad, se acerca y pega con combos.
 * También recoge armas, levanta a los caídos y los lanza contra los demás.
 */
export class Brain {
  private plan: Intent = { ...NOTHING };
  private think = 0;
  private cool = 0.6;
  private presses: ('punch' | 'kick')[] = [];
  private pressT = 0;
  private goal: 'fight' | 'item' | 'lift' | 'flee' = 'fight';
  private item: Item | null = null;
  private body: Actor | null = null;
  /** cuánto le queda cubriéndose */
  private guardT = 0;

  constructor(private me: Actor, private level = 1) {}

  update(dt: number): Intent {
    const me = this.me;
    this.think -= dt;
    this.cool -= dt;
    this.pressT -= dt;
    const out: Intent = { ...this.plan, punch: false, kick: false, jump: false, special: false };
    // botones en fila (combos)
    if (this.presses.length && this.pressT <= 0) {
      const b = this.presses.shift()!;
      out[b] = true;
      this.pressT = 0.17 + Math.random() * 0.08;
    }
    if (me.st === 'dizzy') { out.punch = Math.random() < 0.3; return out; }
    // agarrado: forcejea; agarrando: rodillazos y a veces lo bota
    // forcejea igual de rápido a cualquier velocidad de pantalla (~7 por segundo a nivel 1)
    if (me.st === 'grabbed') { out.punch = Math.random() < 7 * this.level * dt; return out; }
    if (me.st === 'grab') {
      if (this.cool <= 0) { this.cool = (0.38 + Math.random() * 0.2) / Math.max(0.4, this.level); if (Math.random() < 0.25) out.kick = true; else out.punch = true; }
      return out;
    }
    // cubriéndose mientras le tiran golpes
    this.guardT -= dt;
    if (this.guardT > 0 && (me.st === 'guard' || me.controllable)) return { ...NOTHING, guard: true };
    if (!me.controllable && me.st !== 'carry' && me.st !== 'attack') return out;
    if (this.think > 0) return out;
    this.think = 0.12 + Math.random() * 0.12 / this.level;

    const enemies = me.w.actors.filter((a) => a.team !== me.team && a.alive);
    if (!enemies.length) { this.plan = { ...NOTHING }; return out; }
    const near = (a: { x: number; y: number }) => Math.abs(a.x - me.x) + Math.abs(a.y - me.y) * 2;
    // a quién ir: el más cerca, pero repartidos. Tus compañeros van primero por los que te están pegando a ti; los
    // rivales no se amontonan todos sobre ti (en los niveles fáciles, de a uno)
    const encima = (e: Actor) => me.w.actors.filter((a) => a !== me && a.alive && a.team !== e.team && objetivos.get(a) === e).length;
    const tope = this.level < 0.5 ? 1 : this.level < 0.75 ? 2 : 4;
    const actual = objetivos.get(me);
    const puntaje = (e: Actor) => near(e) + 40 * encima(e) - (e === actual ? 30 : 0)
      - (me.team === 0 && objetivos.get(e)?.human ? 80 : 0)
      + (me.team === 1 && e.human && encima(e) >= tope ? 200 : 0);
    const target = enemies.filter((e) => e.st !== 'down' && e.st !== 'lifted').sort((a, b) => puntaje(a) - puntaje(b))[0] ?? enemies[0];
    objetivos.set(me, target);

    // le van a pegar de frente: a veces se cubre
    if (me.controllable && !me.weapon && target.st === 'attack' && Math.abs(target.x - me.x) < 40 && Math.abs(target.y - me.y) < 10
      && (me.x - target.x) * target.dir > 0 && Math.random() < 0.22 * this.level) {
      me.left = target.x < me.x;
      this.guardT = 0.45 + Math.random() * 0.3;
      return { ...NOTHING, guard: true };
    }
    // mal de vida y hay comida en el piso: va por ella
    const comida = (me.w.comida ?? []).sort((a, b) => near(a) - near(b))[0];
    if (comida && me.hp < me.maxHp * 0.5 && near(comida) < 260 && !me.carrying) return { ...out, ...this.walkTo(comida.x, comida.y, 4, out), punch: false };

    // técnica especial con la barra llena
    if (me.meter >= 100 && Math.abs(target.x - me.x) < 70 && Math.abs(target.y - me.y) < 10 && Math.random() < 0.5 * this.level) { out.special = true; return out; }

    // cargando algo: alinear y lanzar
    if (me.st === 'carry') {
      const dy = target.y - me.y;
      this.plan = { ...NOTHING, x: Math.sign(target.x - me.x), y: Math.abs(dy) > 5 ? Math.sign(dy) : 0 };
      if (Math.abs(dy) < 8 && Math.abs(target.x - me.x) < 170) { this.plan.x = 0; me.left = target.x < me.x; out.punch = true; }
      return { ...out, ...this.plan, punch: out.punch };
    }

    // decidir la meta
    if (this.goal === 'fight' && !me.weapon && Math.random() < 0.25 * this.level) {
      const it = me.w.items.filter((i) => i.st === 'floor').sort((a, b) => near(a) - near(b))[0];
      if (it && near(it) < 110) { this.goal = 'item'; this.item = it; }
    }
    if (this.goal === 'fight' && Math.random() < 0.3) {
      const b = enemies.filter((e) => e.st === 'down').sort((a, b2) => near(a) - near(b2))[0];
      if (b && near(b) < 70) { this.goal = 'lift'; this.body = b; }
    }
    if (me.hp < me.maxHp * 0.25 && Math.random() < 0.05) this.goal = 'flee';

    if (this.goal === 'item') {
      const it = this.item;
      if (!it || it.st !== 'floor' || me.weapon) { this.goal = 'fight'; this.item = null; }
      else return { ...out, ...this.walkTo(it.x, it.y, 6, out) };
    }
    if (this.goal === 'lift') {
      const b = this.body;
      if (!b || b.st !== 'down') { this.goal = 'fight'; this.body = null; }
      else return { ...out, ...this.walkTo(b.x + (me.x < b.x ? -14 : 14), b.y, 8, out) };
    }
    if (this.goal === 'flee') {
      this.plan = { ...NOTHING, x: Math.sign(me.x - target.x) || 1, y: Math.sign(Math.random() - 0.5) };
      if (Math.random() < 0.15) this.goal = 'fight';
      return { ...out, ...this.plan };
    }

    // pelear
    const dx = target.x - me.x, dy = target.y - me.y;
    const want = me.weapon ? 26 : 20;
    const plan: Intent = { ...NOTHING };
    if (Math.abs(dy) > 4) plan.y = Math.sign(dy);
    // el rival quedó aturdido al lado: a veces se le pega para agarrarlo
    const aturdido = (target.st === 'hurt' || target.st === 'dizzy') && Math.abs(dx) < 34 && Math.abs(dy) < 6 && !me.weapon;
    if (aturdido && Math.random() < 0.5 * this.level) plan.x = Math.sign(dx);
    else if (Math.abs(dx) > want + 6) plan.x = Math.sign(dx);
    else if (Math.abs(dx) < want - 8) plan.x = -Math.sign(dx);
    plan.run = Math.abs(dx) > 150 && Math.random() < 0.6;
    this.plan = plan;
    const aligned = Math.abs(dy) < 9;
    if (aligned && Math.abs(dx) < want + 12 && this.cool <= 0) {
      me.left = dx < 0;
      this.plan.x = 0;
      this.cool = (AGRESION[me.id] ?? 0.8) / this.level * (0.8 + Math.random() * 0.6);
      const r = Math.random();
      if (me.weapon) this.presses.push('punch');
      else if (r < 0.45) this.presses.push('punch', 'punch', 'punch');
      else if (r < 0.75) this.presses.push('kick', 'kick');
      else this.presses.push('punch', 'kick');
    } else if (me.weapon && aligned && Math.abs(dx) > 70 && Math.abs(dx) < 180 && Math.random() < 0.15) {
      me.left = dx < 0;
      out.kick = true;
    } else if (plan.run && aligned && Math.abs(dx) < 70 && Math.random() < 0.5) {
      out.punch = Math.random() < 0.5;
      out.kick = !out.punch;
    }
    return { ...out, ...this.plan, punch: out.punch, kick: out.kick };
  }

  /** Camina hasta un punto y aprieta puño al llegar (recoger o levantar). */
  private walkTo(x: number, y: number, tol: number, out: Intent): Intent {
    const me = this.me;
    const dx = x - me.x, dy = y - me.y;
    this.plan = { ...NOTHING, x: Math.abs(dx) > tol ? Math.sign(dx) : 0, y: Math.abs(dy) > 4 ? Math.sign(dy) : 0 };
    if (!this.plan.x && !this.plan.y) { this.goal = 'fight'; return { ...this.plan, punch: true, kick: false, jump: false, special: false, run: false }; }
    return { ...this.plan, punch: out.punch, kick: out.kick };
  }
}
