/** Medidas de la azotea y números del combate. */

/** fila de la pantalla donde empieza el piso (fondo de la franja jugable) */
export const FLOOR_TOP = 246;
/** profundidad de la franja (y del mundo va de 0 a DEPTH) */
export const DEPTH = 98;
export const XMIN = 22;
export const XMAX = 618;
export const GRAVITY = 900;

export const SPEED = { walkX: 72, walkY: 46, runX: 150, runY: 40, carry: 0.7 };

/** `lunge`: cuánto se lanza hacia adelante el que pega al tirar el golpe (el pasito del Kunio) */
/** `speed`: a qué velocidad corre la animación (los golpes del kit, a 1, salen lentos para una pelea) */
export interface AttackDef { dmg: number; kd?: boolean; push: number; launch?: number; reach?: number; sfx?: string; lunge?: number; speed?: number }

/** Golpes: daño, si derriba, empuje y cuánto lanza hacia arriba (alto y lejos, que el que cae salga volando). */
export const ATTACKS: Record<string, AttackDef> = {
  jab: { dmg: 5, push: 10, lunge: 45, speed: 1.5 },
  punch: { dmg: 9, kd: true, push: 120, launch: 210, lunge: 70, speed: 1.3 },
  low_kick: { dmg: 6, push: 14, lunge: 40, speed: 1.4 },
  kick_martial: { dmg: 11, kd: true, push: 140, launch: 220, lunge: 80, speed: 1.25 },
  uppercut: { dmg: 13, kd: true, push: 70, launch: 310, lunge: 50, speed: 1.2 },
  run_punch: { dmg: 11, kd: true, push: 180, launch: 230, speed: 1.2 },
  run_kick: { dmg: 14, kd: true, push: 200, launch: 250, speed: 1.2 },
  air_kick: { dmg: 10, kd: true, push: 160, launch: 200, speed: 1.1 },
  hook: { dmg: 10, kd: true, push: 135, launch: 240, lunge: 75, speed: 1.3 },
  flying_kick: { dmg: 14, kd: true, push: 210, launch: 260, speed: 1.15 },
  pisoton: { dmg: 4, push: 0, speed: 1.3 },
  weapon_swing: { dmg: 12, kd: true, push: 150, launch: 210, reach: 10, lunge: 40, speed: 1.15 },
  weapon_swing_heavy: { dmg: 17, kd: true, push: 180, launch: 240, reach: 12, lunge: 30 },
};

/** Vida por atleta: los grandes aguantan más. */
export const HP: Record<string, number> = { rick: 120, steph: 100, sophie: 95, alana: 90, kenji: 120, ryu: 105, goro: 160, tetsu: 95 };

/** Qué tan seguido ataca la máquina (segundos entre ataques). */
export const AGRESION: Record<string, number> = { kenji: 0.55, ryu: 0.7, goro: 0.95, tetsu: 0.8, rick: 0.7, steph: 0.7, sophie: 0.75, alana: 0.8 };

export const PESO_DMG = { liviano: 8, medio: 12, pesado: 16 };
