import Phaser from 'phaser';
import { MAX_W, ancho } from './pantalla';
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
  // fijo a la pantalla, de lado a lado (también en las pantallas anchas)
  const r = scene.add.rectangle(0, 0, MAX_W, 360, color, alpha).setOrigin(0).setDepth(9000).setScrollFactor(0);
  scene.tweens.add({ targets: r, alpha: 0, duration: ms, onComplete: () => r.destroy() });
}

/** Líneas de velocidad de anime alrededor del centro. */
export function speedLines(scene: Phaser.Scene, depth = 8000, color = 0xffffff): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics().setDepth(depth).setScrollFactor(0);
  const draw = () => {
    g.clear();
    for (let i = 0; i < 46; i++) {
      // centradas en la pantalla, que puede ser más ancha que 640
      const cx = ancho(scene) / 2;
      const a = Math.random() * Math.PI * 2, r0 = 120 + Math.random() * 60, r1 = 480;
      g.lineStyle(1 + Math.floor(Math.random() * 3), color, 0.5 + Math.random() * 0.4);
      g.lineBetween(cx + Math.cos(a) * r0, 180 + Math.sin(a) * r0, cx + Math.cos(a) * r1, 180 + Math.sin(a) * r1);
    }
  };
  draw();
  const ev = scene.time.addEvent({ delay: 60, loop: true, callback: draw });
  g.once('destroy', () => ev.remove());
  return g;
}

/** Las líneas de velocidad un instante (`ms`) y se van solas: el manga del súper tiro. Ponerla en la capa de la interfaz. */
export function rafaga(scene: Phaser.Scene, ms = 450, depth = 8990): Phaser.GameObjects.Graphics {
  const g = speedLines(scene, depth);
  scene.time.delayedCall(ms, () => { if (g.active) scene.tweens.add({ targets: g, alpha: 0, duration: 120, onComplete: () => g.destroy() }); });
  return g;
}

/** Los consejos de la pantalla de carga: para que la espera enseñe algo. */
const CONSEJOS = [
  'CON LA BARRA LLENA, LA ESTRELLA ES TU SÚPER GOLPE',
  'EN EL VÓLEY, PATADA SE LA PASA A TU COMPAÑERO',
  'EN EL BÁSQUET, SI TE MARCAN, PÁSALA',
  'PEGADO AL QUE BOTA, PUÑO LE ROBA EL BALÓN',
  'EN LA JABALINA, UN TOQUE CORTO LANZA A 40°',
  'EN EL QUEMADO, SALTA Y EL BALÓN PASA POR DEBAJO',
  'EN EL FÚTBOL, CERCA DEL ARCO EL PASE SALE DE CENTRO',
  'EN LA GARROCHA, CLAVA JUSTO EN LA CAJITA',
  'EN EL TEJO, LA MOÑONA VALE 9',
  'EN LA PELEA, MANTÉN LA ESTRELLA Y TE CUBRES',
  'SI TE ANOTAN, TU BARRA SE LLENA MÁS RÁPIDO',
];

/**
 * La pantalla de carga de una prueba: el nombre, la barra y un consejo. Va en el preload; se quita sola al terminar
 * de cargar (o al crear la escena, si no había nada que bajar).
 */
export function pantallaCarga(scene: Phaser.Scene, titulo: string) {
  // durante la carga la cámara todavía no se centró (eso pasa al crear la escena): en las pantallas anchas el cuadro
  // de 640 quedaba pegado a la izquierda. Se centra a mano en el ancho de ahora
  const cx = ancho(scene) / 2, dx = cx - 320;
  const fondo = scene.add.rectangle(cx, 180, 2000, 2000, 0x0b0b14).setDepth(9990).setScrollFactor(0);
  const t = txt(scene, cx, 150, titulo, 'fuente_titulo', 2).setDepth(9991).setScrollFactor(0);
  const consejo = txt(scene, cx, 222, CONSEJOS[Math.floor(Math.random() * CONSEJOS.length)], 'fuente_ui', 1).setDepth(9991).setTint(0x9ac8ff).setScrollFactor(0);
  const bar = scene.add.graphics().setDepth(9991).setScrollFactor(0);
  const pintar = (v: number) => {
    bar.clear();
    bar.lineStyle(2, 0xf2c230).strokeRect(220 + dx, 182, 200, 12);
    bar.fillStyle(0xf2c230).fillRect(223 + dx, 185, 194 * v, 6);
  };
  pintar(0);
  const alProgreso = (v: number) => pintar(v);
  scene.load.on(Phaser.Loader.Events.PROGRESS, alProgreso);
  const quitar = () => {
    scene.load.off(Phaser.Loader.Events.PROGRESS, alProgreso);
    for (const o of [fondo, t, consejo, bar]) o.destroy();
  };
  scene.events.once(Phaser.Scenes.Events.CREATE, quitar);
}
