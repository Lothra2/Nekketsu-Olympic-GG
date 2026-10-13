import Phaser from 'phaser';
import { KIT, setKit, queueKit, cutPortraits, makeFxAnims, makeNpcAnims, type Manifest } from '../core/kit';
import { makeBackdrops } from '../gfx/backdrops';
import { makeMapa } from '../gfx/mapa';
import { makeUtileria } from '../gfx/utileria';

/** Carga el manifiesto, después todo el kit, y pinta los fondos. */
export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    this.load.json('manifest', KIT + 'manifest.json');
    // qué escenarios de PixelForja hay (si una prueba no tiene el suyo, se ve en gris)
    this.load.json('escenarios', 'assets/escenarios/index.json');
  }

  create() {
    setKit(this.cache.json.get('manifest') as Manifest);
    const bar = this.add.graphics();
    const label = this.add.text(320, 200, 'CALENTANDO LOS MÚSCULOS...', { fontFamily: 'monospace', fontSize: '12px', color: '#f2c230' }).setOrigin(0.5);
    this.load.on('progress', (v: number) => {
      bar.clear();
      bar.lineStyle(2, 0xf2c230).strokeRect(220, 172, 200, 12);
      bar.fillStyle(0xf2c230).fillRect(223, 175, 194 * v, 6);
    });
    this.load.once('complete', () => {
      cutPortraits(this);
      makeFxAnims(this);
      makeNpcAnims(this);
      makeBackdrops(this);
      makeMapa(this);
      makeUtileria(this);
      label.destroy();
      this.scene.start('Tap');
    });
    queueKit(this);
    this.load.start();
  }
}
