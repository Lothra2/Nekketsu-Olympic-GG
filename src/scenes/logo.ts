import Phaser from 'phaser';
import { chip } from '../core/music';
import { txt, flash, wait } from '../core/ui';

/**
 * El logo "NEKKETSU OLYMPIC GG": rayos de sol detrás, NEKKETSU que cae, OLYMPIC que entra de lado y el GG gigante
 * que golpea la pantalla. Con `animate` en falso aparece quieto (para el título).
 */
export async function buildLogo(scene: Phaser.Scene, layer: Phaser.GameObjects.Container, animate: boolean, y0 = 0) {
  const rays = scene.add.graphics().setPosition(320, 196 + y0);
  const drawRays = (rot: number) => {
    rays.clear();
    for (let i = 0; i < 16; i++) {
      const a = rot + (i / 16) * Math.PI * 2, b = a + Math.PI / 22;
      rays.fillStyle(i % 2 ? 0xd0303a : 0xf2a03a, 0.32);
      rays.fillTriangle(0, 0, Math.cos(a) * 420, Math.sin(a) * 420, Math.cos(b) * 420, Math.sin(b) * 420);
    }
  };
  drawRays(0);
  layer.add(rays);
  const ev = scene.time.addEvent({ delay: 50, loop: true, callback: () => drawRays(scene.time.now / 4000) });
  rays.once('destroy', () => ev.remove());

  const nek = txt(scene, 320, 92 + y0, 'NEKKETSU', 'fuente_titulo', 3);
  const oly = txt(scene, 320, 140 + y0, 'OLYMPIC', 'fuente_titulo_plata', 2);
  const gg = txt(scene, 320, 212 + y0, 'GG', 'fuente_titulo', 7);
  layer.add([nek, oly, gg]);

  const shine = scene.add.rectangle(-60, 150 + y0, 18, 260, 0xffffff, 0.35).setAngle(18).setBlendMode(Phaser.BlendModes.ADD);
  layer.add(shine);
  const sweep = () => scene.tweens.add({ targets: shine, x: 700, duration: 900, ease: 'Sine.inOut', onComplete: () => { shine.x = -60; } });
  const sweepEv = scene.time.addEvent({ delay: 3200, loop: true, callback: sweep });
  shine.once('destroy', () => sweepEv.remove());

  if (!animate) { rays.setAlpha(1); sweep(); return; }

  rays.setAlpha(0);
  nek.y = -60; oly.x = 900; gg.setScale(20).setAlpha(0);
  await new Promise<void>((r) => scene.tweens.add({ targets: nek, y: 92 + y0, duration: 380, ease: 'Bounce.out', onComplete: () => r() }));
  chip.boom(0.45);
  scene.cameras.main.shake(140, 0.008);
  await new Promise<void>((r) => scene.tweens.add({ targets: oly, x: 320, duration: 300, ease: 'Back.out', onComplete: () => r() }));
  chip.blip(1320, 0.12, 'sq25', 0.18, 1760);
  await wait(scene, 150);
  await new Promise<void>((r) => scene.tweens.add({ targets: gg, scale: 7, alpha: 1, duration: 260, ease: 'Quad.in', onComplete: () => r() }));
  chip.boom(0.9);
  flash(scene, 260);
  scene.cameras.main.shake(320, 0.02);
  scene.tweens.add({ targets: rays, alpha: 1, duration: 500 });
  sweep();
}

/** Fuegos artificiales de colores que revientan solos de vez en cuando. */
export function fireworks(scene: Phaser.Scene): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const colors = [0xff4040, 0xffd040, 0x40ff80, 0x40c0ff, 0xff60ff, 0xffffff];
  const em = scene.add.particles(0, 0, 'px', {
    speed: { min: 40, max: 140 }, lifespan: { min: 700, max: 1300 }, gravityY: 90, scale: { start: 0.75, end: 0 },
    alpha: { start: 1, end: 0.2 }, emitting: false, tint: colors,
  });
  c.add(em);
  const pop = () => {
    const x = 60 + Math.random() * 520, y = 30 + Math.random() * 110;
    em.setParticleTint(colors[Math.floor(Math.random() * colors.length)]);
    em.explode(40, x, y);
    chip.blip(140 + Math.random() * 60, 0.18, 'tri', 0.1, 50);
  };
  const ev = scene.time.addEvent({ delay: 650, loop: true, callback: pop });
  c.once('destroy', () => ev.remove());
  pop();
  return c;
}
