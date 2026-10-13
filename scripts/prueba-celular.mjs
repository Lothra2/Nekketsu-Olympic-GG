// Cómo se ve en un celular alargado acostado (844 x 390, 19.5:9, con táctil): el juego tiene que llenar la pantalla
// de lado a lado, sin barras, con lo importante centrado y los botones en los bordes. Saca una captura por escena y
// revisa que el lienzo ocupe toda la pantalla.
//   node scripts/prueba-celular.mjs [url] [carpeta] [ancho] [alto]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/celular';
const W = Number(process.argv[4] ?? 844), H = Number(process.argv[5] ?? 390);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto(url);
await page.waitForFunction(() => window.game?.scene.isActive('Tap'), null, { timeout: 60000 });
await page.waitForTimeout(300);
let fallas = 0;
const lienzo = async (que) => {
  const r = await page.evaluate(() => { const c = document.querySelector('canvas').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height, game: window.game.scale.gameSize.width }; });
  // alargada: llena de arriba a abajo y de lado a lado (más allá de 20:9, franjas finas a los lados);
  // 16:9 o más cuadrada (tablet): llena de lado a lado, con franjas arriba y abajo a propósito
  const lleno = W / H > 16 / 9 ? r.h >= H - 1 && (r.w >= W - 1 || r.game >= 800) : r.w >= W - 1;
  if (!lleno) fallas++;
  console.log(`${lleno ? 'ok   ' : 'FALLA'} ${que}: lienzo ${Math.round(r.w)}x${Math.round(r.h)} en (${Math.round(r.x)},${Math.round(r.y)}), juego de ${r.game} de ancho`);
};
await page.screenshot({ path: `${out}/00_toca.png` });
await lienzo('pantalla de inicio');
await page.touchscreen.tap(W / 2, H / 2);
await page.waitForTimeout(2500);
for (const [i, ms] of [[1, 4000], [2, 9000], [3, 12000], [4, 9000], [5, 12000], [6, 12000], [7, 10000]]) {
  await page.waitForTimeout(ms);
  if (await page.evaluate(() => window.game.scene.isActive('Title'))) break;
  await page.screenshot({ path: `${out}/0${i}_intro.png` });
}
const ir = async (escena, datos, ms, nombre) => {
  await page.evaluate(([e, d]) => { const g = window.game; g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key)); g.scene.start(e, d); }, [escena, datos]);
  await page.waitForTimeout(ms);
  await page.screenshot({ path: `${out}/${nombre}.png` });
  await lienzo(nombre);
};
await ir('Title', {}, 3500, '10_titulo');
await ir('Select', { modo: '1v1' }, 2000, '11_seleccion');
await ir('Fight', { modo: '1v1', jugador: 'sophie', rival: 'kenji' }, 6500, '12_pelea');
await ir('Fight', { modo: '4v4', jugador: 'rick', rival: 'kenji' }, 6500, '13_pelea4');
await ir('CrossCountry', { jugador: 'sophie', tramo: 1 }, 7000, '14_cross');
await ir('Obstaculos', { jugador: 'sophie' }, 7000, '15_comuna');
await ir('Vallas', { jugador: 'sophie' }, 6000, '16_vallas');
await ir('Natacion', { jugador: 'sophie' }, 6000, '17_natacion');
await ir('Jabalina', { jugador: 'rick' }, 6000, '18_jabalina');
await ir('Tamawari', { jugador: 'alana' }, 7000, '18b_tamawari');
await ir('DaCau', { jugador: 'sophie' }, 7000, '18c_dacau');
// el medallero necesita una olimpiada en curso
await page.evaluate(() => window.game.registry.set('gira', { idx: 2, puntos: [34, 21], resultados: [{ prueba: 'VALLAS DEL CAFÉ', podio: ['sophie', 'kenji', 'steph', 'ryu'] }, { prueba: 'NATACIÓN HẠ LONG', podio: ['alana', 'tetsu', 'rick', 'goro'] }], jugador: 'sophie', modo: 'gira' }));
await ir('Medallero', {}, 3000, '19_medallero');
console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien: llena la pantalla');
await browser.close();
process.exit(fallas || logs.length ? 1 : 0);
