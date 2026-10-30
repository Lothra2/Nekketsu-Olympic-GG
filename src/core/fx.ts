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

/**
 * Un destello: el sprite se pinta entero de un color (blanco: el golpe que entra; amarillo: el perfecto) y vuelve
 * solo a sus colores a los `ms`. Lo clásico de los 16 bits, que hace que el golpe se sienta.
 */
export function destellar(s: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image, ms = 70, color = 0xffffff) {
  s.setTintFill(color);
  s.scene.time.delayedCall(ms, () => { if (s.active) s.clearTint(); });
}

/** memoria por pelota del súper tiro: la escala de siempre, dónde estaba y cuántos cuadros lleva encendida */
const SUPER = new WeakMap<Phaser.GameObjects.Image, { base: number; x: number; y: number; n: number }>();

/**
 * El balón del súper tiro, como en Súper Campeones: achatado en la dirección en la que vuela, titilando entre blanco
 * y fuego, y dejando fantasmas que se apagan detrás. Se llama cada cuadro desde el dibujo de la pelota, ya puesta en
 * su lugar; con `activo` falso la deja como siempre. `achatar` falso solo enciende el fuego (el volante del đá cầu).
 */
export function tiroSuper(scene: Phaser.Scene, spr: Phaser.GameObjects.Image, activo: boolean, achatar = true, color = 0xff7020) {
  let m = SUPER.get(spr);
  if (!m) { m = { base: spr.scaleX, x: spr.x, y: spr.y, n: 0 }; SUPER.set(spr, m); }
  const dx = spr.x - m.x, dy = spr.y - m.y;
  m.x = spr.x; m.y = spr.y;
  if (!activo) {
    if (m.n) { spr.setScale(m.base).clearTint(); m.n = 0; } else m.base = spr.scaleX;
    return;
  }
  m.n++;
  const d = Math.hypot(dx, dy);
  if (achatar && d > 1.5) spr.setRotation(Math.atan2(dy, dx)).setScale(m.base * 1.6, m.base * 0.62);
  if (m.n % 2) spr.setTintFill(0xffffff); else { spr.clearTint(); spr.setTint(0xffc060); }
  // el fantasma de fuego cada dos cuadros, que se encoge y se apaga donde pasó la pelota
  if (m.n % 2 === 0 && d > 1.5) {
    const g = scene.add.image(spr.x, spr.y, spr.texture.key, spr.frame.name).setOrigin(spr.originX, spr.originY)
      .setScale(spr.scaleX, spr.scaleY).setRotation(spr.rotation).setFlipX(spr.flipX).setDepth(spr.depth - 0.1).setAlpha(0.75)
      .setTintFill(m.n % 4 ? color : 0xffe060);
    scene.tweens.add({ targets: g, alpha: 0, scaleX: spr.scaleX * 0.4, scaleY: spr.scaleY * 0.4, duration: 240, onComplete: () => g.destroy() });
  }
}

/** El tamaño de polvo que va con la celda del personaje: chico 32, medio 48, grande 64 (Goro). */
export const talla = (celda: number) => (celda >= 64 ? 'grande' : celda <= 32 ? 'chico' : 'medio');

/** La chispa según qué tan fuerte fue el golpe. */
export const chispa = (dmg: number, kd: boolean) => (kd && dmg >= 11 ? 'chispa_golpe_pesado' : kd || dmg >= 8 ? 'chispa_golpe_medio' : 'chispa_golpe_liviano');
