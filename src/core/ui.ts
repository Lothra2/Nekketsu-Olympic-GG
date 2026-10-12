import Phaser from 'phaser';
import { chip } from './music';

export type Font = 'fuente_ui' | 'fuente_titulo' | 'fuente_titulo_plata';

/** Texto con las fuentes bitmap del kit. Escala siempre entera. */
export function txt(scene: Phaser.Scene, x: number, y: number, s: string, font: Font = 'fuente_ui', scale = 1, origin = 0.5) {
  return scene.add.bitmapText(x, y, font, s.toUpperCase()).setScale(scale).setOrigin(origin, 0.5);
}

/** Escribe un texto letra por letra con un blip por letra. Devuelve una promesa que termina al escribirlo todo. */
export function typewrite(scene: Phaser.Scene, t: Phaser.GameObjects.BitmapText, full: string, cps = 28, pitch = 660): Promise<void> {
  full = full.toUpperCase();
  return new Promise((res) => {
    let i = 0;
    t.setText('');
    const ev = scene.time.addEvent({
      delay: 1000 / cps,
      loop: true,
      callback: () => {
        i++;
        t.setText(full.slice(0, i));
        const ch = full[i - 1];
        if (ch && ch !== ' ' && i % 2) chip.blip(pitch + (i % 3) * 40, 0.03, 'sq25', 0.07);
        if (i >= full.length) { ev.remove(); res(); }
      },
    });
  });
}

export const wait = (scene: Phaser.Scene, ms: number) => new Promise<void>((r) => scene.time.delayedCall(ms, r));

/** Panel retro: caja oscura con borde doble. */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, border = 0xf2c230) {
  const g = scene.add.graphics();
  g.fillStyle(0x08081a, 0.92).fillRect(x, y, w, h);
  g.lineStyle(2, border, 1).strokeRect(x + 1, y + 1, w - 2, h - 2);
  g.lineStyle(1, 0xffffff, 0.35).strokeRect(x + 4, y + 4, w - 8, h - 8);
  return g;
}

/** Destello de pantalla completa. */
export function flash(scene: Phaser.Scene, ms = 120, color = 0xffffff, alpha = 1) {
  const r = scene.add.rectangle(320, 180, 640, 360, color, alpha).setDepth(9000).setScrollFactor(0);
  scene.tweens.add({ targets: r, alpha: 0, duration: ms, onComplete: () => r.destroy() });
}

/** Líneas de velocidad de anime alrededor del centro. */
export function speedLines(scene: Phaser.Scene, depth = 8000, color = 0xffffff): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth).setScrollFactor(0);
  const draw = () => {
    g.clear();
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2, r0 = 120 + Math.random() * 60, r1 = 420;
      g.lineStyle(1 + Math.floor(Math.random() * 3), color, 0.5 + Math.random() * 0.4);
      g.lineBetween(320 + Math.cos(a) * r0, 180 + Math.sin(a) * r0, 320 + Math.cos(a) * r1, 180 + Math.sin(a) * r1);
    }
  };
  draw();
  const ev = scene.time.addEvent({ delay: 60, loop: true, callback: draw });
  g.once('destroy', () => ev.remove());
  return g;
}
