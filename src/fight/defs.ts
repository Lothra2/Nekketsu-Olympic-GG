/** Medidas de la azotea y números del combate. */

/** fila de la pantalla donde empieza el piso (fondo de la franja jugable) */
export const FLOOR_TOP = 246;
/** profundidad de la franja (y del mundo va de 0 a DEPTH) */
export const DEPTH = 98;
export const XMIN = 22;
export const XMAX = 618;
export const GRAVITY = 900;

export const SPEED = { walkX: 72, walkY: 46, runX: 150, runY: 40, carry: 0.7 };

export interface AttackDef { dmg: number; kd?: boolean; push: number; launch?: number; reach?: number; sfx?: string }

/** Golpes: daño, si derriba, empuje y cuánto lanza hacia arriba. */
export const ATTACKS: Record<string, AttackDef> = {
  jab: { dmg: 5, push: 10 },
  punch: { dmg: 9, kd: true, push: 95 },
  low_kick: { dmg: 6, push: 14 },
  kick_martial: { dmg: 11, kd: true, push: 115 },
  uppercut: { dmg: 13, kd: true, push: 70, launch: 260 },
  run_punch: { dmg: 11, kd: true, push: 150 },
  run_kick: { dmg: 14, kd: true, push: 170 },
  air_kick: { dmg: 10, kd: true, push: 130 },
  weapon_swing: { dmg: 12, kd: true, push: 125, reach: 10 },
  weapon_swing_heavy: { dmg: 17, kd: true, push: 150, reach: 12 },
};

/** Vida por atleta: los grandes aguantan más. */
export const HP: Record<string, number> = { rick: 120, steph: 100, sophie: 95, alana: 90, kenji: 120, ryu: 105, goro: 160, tetsu: 95 };

/** Qué tan seguido ataca la máquina (segundos entre ataques). */
export const AGRESION: Record<string, number> = { kenji: 0.55, ryu: 0.7, goro: 0.95, tetsu: 0.8, rick: 0.7, steph: 0.7, sophie: 0.75, alana: 0.8 };

export const PESO_DMG = { liviano: 8, medio: 12, pesado: 16 };
