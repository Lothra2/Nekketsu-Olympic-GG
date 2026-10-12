import Phaser from 'phaser';

/**
 * Pantalla completa en celulares alargados. El juego está diseñado en un cuadro de 640 x 360 (16:9); en una pantalla
 * más ancha (19.5:9, 20:9) el juego se estira hacia los costados hasta MAX_W en vez de dejar barras negras. Lo
 * importante (personajes, textos, menús) sigue en el cuadro de 640, centrado; los costados muestran más fondo, y en
 * las carreras y la pelea, más mundo. En pantallas más cuadradas (tablets) queda en 640 x 360 con barras arriba y abajo.
 */
export const BASE_W = 640;
export const BASE_H = 360;
/** lo más ancho que se estira: 20:9 */
export const MAX_W = 800;

/** El ancho del juego ahora mismo (de 640 a 800). */
export const ancho = (s: Phaser.Scene) => s.scale.gameSize.width;
/** Cuánto sobra a cada lado del cuadro de 640. */
export const margen = (s: Phaser.Scene) => Math.max(0, Math.floor((ancho(s) - BASE_W) / 2));

/** Las escenas sin cámara que se mueva: su cámara principal se corre para que el cuadro de 640 quede centrado. */
const FIJAS = new Set(['Boot', 'Tap', 'Intro', 'Title', 'Select', 'Medallero']);

/** Ajusta las cámaras de una escena al ancho actual: todas a lo ancho, y las fijas y las del marcador centradas. */
export function encuadrar(s: Phaser.Scene) {
  const W = ancho(s), m = margen(s);
  for (const c of s.cameras.cameras) {
    if (c.width !== W || c.height !== BASE_H) c.setSize(W, BASE_H);
    if (c.name === 'ui' || (c === s.cameras.main && FIJAS.has(s.scene.key))) c.setScroll(-m, c.scrollY);
  }
}

/**
 * El ancho justo para la pantalla: 360 de alto y el ancho que pida su proporción, entre 640 (16:9 o más cuadrada:
 * barras arriba y abajo) y MAX_W (20:9; más alargada que eso, barras finitas a los lados). Phaser escala ese lienzo
 * para llenar la pantalla (modo FIT), sin deformar.
 */
function anchoPara(game: Phaser.Game) {
  const r = (game.scale.parent as HTMLElement | undefined)?.getBoundingClientRect();
  const w = r?.width || window.innerWidth, h = r?.height || window.innerHeight;
  if (!w || !h) return BASE_W;
  return Phaser.Math.Clamp(Math.round((BASE_H * w) / h), BASE_W, MAX_W);
}

/** Engancha el encuadre a cada escena cuando arranca, y ajusta el ancho del juego cada vez que cambia la pantalla. */
export function instalarPantalla(game: Phaser.Game) {
  const ajustar = () => {
    // primero el tamaño nuevo de la pantalla (si no, Phaser escala con el de antes y quedan bordes)
    game.scale.getParentBounds();
    const W = anchoPara(game);
    if (W !== game.scale.gameSize.width) game.scale.setGameSize(W, BASE_H);
    else game.scale.refresh();
  };
  // las escenas existen recién cuando el juego está listo (READY), no cuando arranca
  const enganchar = () => {
    for (const s of game.scene.scenes) s.events.on(Phaser.Scenes.Events.CREATE, () => encuadrar(s));
    ajustar();
    for (const s of game.scene.getScenes(true)) encuadrar(s);
  };
  if (game.scene.scenes.length) enganchar(); else game.events.once(Phaser.Core.Events.READY, enganchar);
  // al girar el teléfono o cambiar la ventana (el navegador tarda un poco en dar el tamaño nuevo)
  const luego = () => { ajustar(); setTimeout(ajustar, 250); };
  window.addEventListener('resize', luego);
  window.addEventListener('orientationchange', luego);
  game.scale.on(Phaser.Scale.Events.RESIZE, () => { for (const s of game.scene.getScenes(true)) encuadrar(s); });
  // y cuando Phaser mismo nota que cambió la pantalla
  game.scale.on(Phaser.Scale.Events.RESIZE, () => { const W = anchoPara(game); if (W !== game.scale.gameSize.width) game.scale.setGameSize(W, BASE_H); });
}
