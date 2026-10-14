import Phaser from 'phaser';
import { KIT, setKit, queueKit, cutPortraits, makeFxAnims, makeNpcAnims, makeAveAnims, type Manifest } from '../core/kit';
import { makeBackdrops } from '../gfx/backdrops';
import { makeMapa } from '../gfx/mapa';
import { makeUtileria } from '../gfx/utileria';
import { queueInterfaz, animarInterfaz } from '../core/interfaz';

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
    // un sonido que el navegador no pudo cargar (un formato que no sabe tocar) no suena, en vez de lanzar un error
    // que trancaría la escena: el sonido es de todo el juego, así que basta con cuidarlo aquí una vez
    const sonidos = this.sound, tocar = sonidos.play.bind(sonidos), cache = this.cache.audio;
    sonidos.play = ((key: string, extra?: Phaser.Types.Sound.SoundConfig | Phaser.Types.Sound.SoundMarker) => (cache.exists(key) ? tocar(key, extra) : false)) as typeof sonidos.play;
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
      makeAveAnims(this);
      animarInterfaz(this);
      makeBackdrops(this);
      makeMapa(this);
      makeUtileria(this);
      label.destroy();
      this.scene.start('Tap');
    });
    queueKit(this);
    queueInterfaz(this);
    this.load.start();
  }
}
