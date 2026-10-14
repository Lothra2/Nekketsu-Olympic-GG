import Phaser from 'phaser';
import { kit } from './kit';

/**
 * Los efectos del kit (lote F de PixelForja) puestos en el mundo con su ancla: el pixel del ancla cae justo
 * sobre el punto que se pide (los pies, la mano, la cabeza). Miran a la derecha; con `flip` se espejan.
 */
export interface OpcionesFx {
  flip?: boolean; depth?: number; alpha?: number; scale?: number;
  /**
   * Se queda hasta que el que llama lo borra: los que no se repiten, en su último cuadro (el "¡!" que salta y se
   * queda); los que se repiten, repitiéndose (las estrellas del mareo mientras dura).
   */
  queda?: boolean;
  /** los que se repiten y no `queda`: cuánto duran antes de apagarse solos (ms) */
  dura?: number;
}

export const hayFx = (id: string) => !!kit().fx?.[id];

/**
 * Pone un efecto y lo borra solo al terminar. Los que se repiten (el aura de fuego, el confeti) se apagan solos a
 * los `dura` ms: antes se quedaban para siempre en la pantalla y tapaban el juego. Con `queda`, los borra el que llama.
 */
export function efecto(scene: Phaser.Scene, id: string, x: number, y: number, o: OpcionesFx = {}): Phaser.GameObjects.Sprite | null {
  const e = kit().fx?.[id];
  if (!e || !scene.textures.exists(`fx_${id}`)) return null;
  const ax = o.flip ? e.w - 1 - e.ancla[0] : e.ancla[0];
  const s = scene.add.sprite(Math.round(x), Math.round(y), `fx_${id}`, 0)
    .setOrigin((ax + 0.5) / e.w, (e.ancla[1] + 0.5) / e.h)
    .setFlipX(!!o.flip)
    .setDepth(o.depth ?? y + (e.capa === 'detras' ? -0.5 : 0.5))
    .setAlpha(o.alpha ?? 1)
    .setScale(o.scale ?? 1);
  if (scene.anims.exists(`fx_${id}`)) {
    s.play(`fx_${id}`);
    if (!e.loop && !o.queda) s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
  }
  if (e.loop && !o.queda) {
    scene.time.delayedCall(o.dura ?? 1500, () => {
      if (s.active) scene.tweens.add({ targets: s, alpha: 0, duration: 250, onComplete: () => s.destroy() });
    });
  }
  return s;
}

/** El tamaño de polvo que va con la celda del personaje: chico 32, medio 48, grande 64 (Goro). */
export const talla = (celda: number) => (celda >= 64 ? 'grande' : celda <= 32 ? 'chico' : 'medio');

/** La chispa según qué tan fuerte fue el golpe. */
export const chispa = (dmg: number, kd: boolean) => (kd && dmg >= 11 ? 'chispa_golpe_pesado' : kd || dmg >= 8 ? 'chispa_golpe_medio' : 'chispa_golpe_liviano');
