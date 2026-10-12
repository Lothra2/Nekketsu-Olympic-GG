import Phaser from 'phaser';
import { chip } from './music';
import { txt } from './ui';
import { rotular, teclasDe, type Control, type Fuente, type Input } from './input';

/** Un paso del entrenamiento: qué hacer, con qué teclas, qué botón táctil señalar y cuándo está logrado. */
export interface Paso {
  /**
   * Lo que se lee en grande (hasta dos líneas cortas, separadas con \n). Los botones van como {PUÑO}, {PATADA},
   * {SALTO}, {ESPECIAL}, {MOVER} y {CORRER}: el cartel pone la tecla o el botón de lo que se esté usando.
   */
  texto: string;
  /** los controles del paso: laten en la pantalla táctil y salen en la línea de teclas */
  botones: (Control | 'correr')[];
  /** se revisa cada cuadro: true cuando la persona lo hizo */
  listo: () => boolean;
  /** se llama al empezar el paso (por ejemplo, poner al rival en el piso) */
  antes?: () => void;
  /** se llama cada cuadro mientras dura el paso */
  cada?: () => void;
}

/**
 * Entrenador paso a paso: un cartel arriba con la instrucción, espera a que la hagas,
 * dice ¡BIEN! y pasa al siguiente. Al final llama a `fin`.
 */
export class Coach {
  private i = -1;
  private ok = 0;
  private box: Phaser.GameObjects.Graphics;
  private paso: Phaser.GameObjects.BitmapText;
  private main: Phaser.GameObjects.BitmapText;
  private keys: Phaser.GameObjects.BitmapText;
  private bien: Phaser.GameObjects.BitmapText;
  done = false;
  private fuente: Fuente;

  constructor(
    private scene: Phaser.Scene,
    layer: Phaser.GameObjects.Layer,
    private pad: Input,
    private pasos: Paso[],
    private fin: () => void,
    private y = 40,
  ) {
    this.fuente = pad.fuente;
    const d = 8300;
    this.box = scene.add.graphics().setDepth(d);
    this.paso = txt(scene, 320, y + 10, '', 'fuente_ui', 1).setDepth(d + 1).setTint(0xf2c230);
    this.main = txt(scene, 320, y + 30, '', 'fuente_ui', 2).setDepth(d + 1).setCenterAlign();
    this.keys = txt(scene, 320, y + 54, '', 'fuente_ui', 1).setDepth(d + 1).setTint(0x9ac8ff);
    this.bien = txt(scene, 320, y + 30, '¡BIEN!', 'fuente_titulo', 2).setDepth(d + 2).setVisible(false);
    layer.add([this.box, this.paso, this.main, this.keys, this.bien]);
    this.next();
  }

  private next() {
    this.i++;
    if (this.i >= this.pasos.length) {
      this.done = true;
      this.pad.highlight([]);
      for (const o of [this.box, this.paso, this.main, this.keys]) o.setVisible(false);
      this.fin();
      return;
    }
    const p = this.pasos[this.i];
    p.antes?.();
    this.dibujar();
    this.main.setScale(2.4);
    this.scene.tweens.add({ targets: this.main, scale: 2, duration: 200, ease: 'Back.out' });
    this.ok = 0;
  }

  /** Arma el cartel del paso con los nombres de los botones de lo que se está usando. */
  private dibujar() {
    const p = this.pasos[this.i];
    const f = this.pad.fuente;
    this.fuente = f;
    const lines = p.texto.split('\n').length;
    const h = 26 + lines * 18 + (f === 'teclado' ? 16 : 4);
    this.box.clear();
    this.box.fillStyle(0x08081a, 0.85).fillRect(60, this.y, 520, h);
    this.box.lineStyle(2, 0xf2c230).strokeRect(61, this.y + 1, 518, h - 2);
    this.paso.setText(`ENTRENAMIENTO · PASO ${this.i + 1} DE ${this.pasos.length}`);
    this.main.setText(rotular(p.texto, f)).setY(this.y + 22 + lines * 9);
    this.keys.setText(f === 'teclado' ? teclasDe(p.botones) : '').setY(this.y + h - 8);
    this.pad.highlight(p.botones.map((b) => (b === 'correr' ? 'stick' : b)));
  }

  /** Va en el último paso. */
  get ultimo() { return this.i >= this.pasos.length - 1; }

  /** Llamar cada cuadro. */
  tick(dt: number) {
    if (this.done) return;
    if (this.ok > 0) {
      this.ok -= dt;
      if (this.ok <= 0) { this.bien.setVisible(false); this.main.setVisible(true); this.next(); }
      return;
    }
    const p = this.pasos[this.i];
    if (this.pad.fuente !== this.fuente) this.dibujar();
    p.cada?.();
    if (!p.listo()) return;
    this.ok = 0.9;
    this.main.setVisible(false);
    this.bien.setVisible(true).setY(this.main.y).setScale(3);
    this.scene.tweens.add({ targets: this.bien, scale: 2, duration: 220, ease: 'Back.out' });
    chip.blip(1320, 0.12, 'sq25', 0.2, 1760);
    this.scene.time.delayedCall(110, () => chip.blip(1760, 0.14, 'sq25', 0.2, 2093));
  }

  destroy() { this.pad.highlight([]); for (const o of [this.box, this.paso, this.main, this.keys, this.bien]) o.destroy(); }
}
