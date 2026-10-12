import Phaser from 'phaser';
import { Painter, hex } from './paint';

/**
 * La utilería que se usa en más de una escena (las pruebas y la intro): la valla, la valla tumbada y la jabalina.
 * Se pinta una vez en Boot.
 */
export function makeUtileria(scene: Phaser.Scene) {
  const add = (k: string, c: HTMLCanvasElement) => { if (!scene.textures.exists(k)) scene.textures.addCanvas(k, c); };
  const v = new Painter(14, 16);
  v.rect(1, 3, 2, 13, hex('#c8c8d0')); v.rect(11, 3, 2, 13, hex('#c8c8d0'));
  for (let x = 0; x < 14; x++) v.rect(x, 1, 1, 3, Math.floor(x / 3) % 2 ? hex('#d02a2a') : hex('#f4f4f4'));
  v.rect(0, 14, 4, 2, hex('#6a6a70')); v.rect(10, 14, 4, 2, hex('#6a6a70'));
  add('valla', v.done());
  const q = new Painter(18, 6);
  for (let x = 0; x < 16; x++) q.rect(x + 1, 1, 1, 3, Math.floor(x / 3) % 2 ? hex('#d02a2a') : hex('#f4f4f4'));
  q.rect(0, 4, 18, 2, hex('#8a8a90'));
  add('valla_caida', q.done());
  const j = new Painter(30, 3);
  j.rect(0, 1, 30, 1, hex('#e8e8f0'));
  j.rect(12, 0, 6, 3, hex('#d02a2a'));
  j.rect(27, 1, 3, 1, hex('#606070'));
  add('jabalina', j.done());
}
