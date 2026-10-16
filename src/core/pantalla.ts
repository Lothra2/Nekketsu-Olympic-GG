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

/**
 * En el iPhone (Safari y la app) la página se medía más alta que lo que se ve, o quedaba corrida hacia abajo después
 * de girar: el juego se centraba en esa caja y salía una barra negra arriba. El contenedor se pega justo a la parte
 * visible de la pantalla (visualViewport) y la página vuelve arriba del todo.
 */
function pegarAlVisible(game: Phaser.Game) {
  const el = game.scale.parent as HTMLElement | undefined;
  const v = window.visualViewport;
  if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
  if (!el || !v) return;
  const px = (n: number) => `${Math.round(n)}px`;
  el.style.left = px(v.offsetLeft);
  el.style.top = px(v.offsetTop);
  el.style.width = px(v.width);
  el.style.height = px(v.height);
  // abierto desde el ícono de la pantalla de inicio, acostado: iOS mide la pantalla como si siguiera arriba la barra
  // de estado de cuando estaba parado (59 puntos en los iPhone con isla) y deja la página corrida hacia abajo. La
  // franja de arriba es nuestra (sale del color del fondo): el contenedor sube hasta el borde de la pantalla
  const nav = navigator as Navigator & { standalone?: boolean };
  const instalada = nav.standalone === true || window.matchMedia?.('(display-mode: standalone), (display-mode: fullscreen)').matches;
  const sMin = Math.min(screen.width, screen.height), sMax = Math.max(screen.width, screen.height);
  const falta = sMin - v.height;
  if (instalada && v.width > v.height && Math.abs(v.width - sMax) < 4 && falta > 8 && falta < 80) {
    el.style.top = px(v.offsetTop - falta);
    el.style.height = px(sMin);
  }
}

/** Engancha el encuadre a cada escena cuando arranca, y ajusta el ancho del juego cada vez que cambia la pantalla. */
export function instalarPantalla(game: Phaser.Game) {
  const ajustar = () => {
    pegarAlVisible(game);
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
  // al girar el teléfono, entrar a pantalla completa o esconderse la barra del navegador: el tamaño nuevo llega
  // tarde (y a veces sin otro aviso), así que se vuelve a medir un par de veces más
  let reintentos: number[] = [];
  const luego = () => {
    ajustar();
    reintentos.forEach((t) => clearTimeout(t));
    reintentos = [250, 600, 1200].map((ms) => window.setTimeout(ajustar, ms));
  };
  window.addEventListener('resize', luego);
  window.addEventListener('orientationchange', luego);
  document.addEventListener('fullscreenchange', luego);
  document.addEventListener('webkitfullscreenchange', luego);
  window.visualViewport?.addEventListener('resize', luego);
  window.visualViewport?.addEventListener('scroll', luego);
  if (new URLSearchParams(location.search).has('diag')) diagnostico(game);
  // y en el teléfono, cinco toques seguidos en la esquina de arriba a la izquierda prenden las medidas
  let toques: number[] = [];
  document.addEventListener('touchstart', (e) => {
    const t = e.touches[0];
    if (!t || t.clientX > 60 || t.clientY > 60) return;
    const ahora = performance.now();
    toques = [...toques.filter((x) => ahora - x < 2500), ahora];
    if (toques.length >= 5) { toques = []; diagnostico(game); }
  }, { passive: true });
  game.scale.on(Phaser.Scale.Events.RESIZE, () => { for (const s of game.scene.getScenes(true)) encuadrar(s); });
  // y cuando Phaser mismo nota que cambió la pantalla
  game.scale.on(Phaser.Scale.Events.RESIZE, () => { const W = anchoPara(game); if (W !== game.scale.gameSize.width) game.scale.setGameSize(W, BASE_H); });
}

/**
 * Con ?diag en la dirección: un recuadro con las medidas reales (ventana, pantalla, lienzo y juego) y la versión,
 * para ver en el teléfono de verdad por qué no llena la pantalla.
 */
function diagnostico(game: Phaser.Game) {
  if (document.getElementById('diag')) return;
  const d = document.createElement('div');
  d.id = 'diag';
  d.style.cssText = 'position:fixed;left:4px;top:4px;z-index:20;background:rgba(0,0,0,.75);color:#7f7;font:11px monospace;padding:4px 6px;pointer-events:none;white-space:pre';
  document.body.appendChild(d);
  setInterval(() => {
    const c = game.canvas?.getBoundingClientRect(), p = (game.scale.parent as HTMLElement | undefined)?.getBoundingClientRect();
    const v = window.visualViewport, r = (n?: number) => Math.round(n ?? 0);
    d.textContent = [
      `versión ${__VERSION__}`,
      `ventana ${innerWidth}x${innerHeight}  visible ${r(v?.width)}x${r(v?.height)} en ${r(v?.offsetLeft)},${r(v?.offsetTop)}  pantalla ${screen.width}x${screen.height}`,
      `instalada ${(navigator as Navigator & { standalone?: boolean }).standalone ? 'sí' : 'no'}`,
      `contenedor ${r(p?.width)}x${r(p?.height)}  lienzo ${r(c?.width)}x${r(c?.height)} en ${r(c?.x)},${r(c?.y)}`,
      `juego ${game.scale.gameSize.width}x${game.scale.gameSize.height}  completa ${game.scale.isFullscreen ? 'sí' : 'no'}  ${screen.orientation?.type ?? ''}`,
    ].join('\n');
  }, 500);
}
