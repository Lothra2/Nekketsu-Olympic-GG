import Phaser from 'phaser';
import { chip } from '../core/music';
import { txt } from '../core/ui';

/** "Toca para empezar": en tablets el audio solo arranca después de un toque. */
export class Tap extends Phaser.Scene {
  constructor() { super('Tap'); }

  create() {
    this.cameras.main.setBackgroundColor('#000000');
    const t = txt(this, 320, 180, 'TOCA PARA EMPEZAR', 'fuente_ui', 2);
    this.tweens.add({ targets: t, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    txt(this, 320, 330, 'NEKKETSU OLYMPIC GG · HECHO CON PIXELFORJA', 'fuente_ui', 1).setTint(0x6a6a8a);
    const go = () => {
      const sm = this.sound as Phaser.Sound.WebAudioSoundManager;
      if (sm.context) {
        void sm.context.resume();
        chip.attach(sm.context);
      }
      chip.blip(988, 0.08, 'sq25', 0.2);
      // en el celular, pantalla completa de verdad (sin las barras del navegador) y acostado; si no se puede, sigue igual
      if (this.sys.game.device.input.touch && !this.scale.isFullscreen) {
        try { this.scale.startFullscreen(); } catch { /* el navegador no deja */ }
        const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
        o?.lock?.('landscape').catch(() => undefined);
      }
      this.scene.start('Intro');
    };
    // al levantar el dedo: ahí el navegador acepta pedir pantalla completa
    this.input.once('pointerup', go);
    this.input.keyboard?.once('keydown', go);
    this.input.gamepad?.once('down', go);
  }
}
