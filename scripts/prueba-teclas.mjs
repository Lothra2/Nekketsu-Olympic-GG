// Revisa que lo que dicen los carteles sea lo que de verdad funciona: lee la línea de controles del título
// ("J: PUÑO · K: PATADA ..."), aprieta cada tecla que nombra y confirma que el juego la lee como esa acción.
// También prueba las teclas alternas, y que espacio salte sin pausar.
//   node scripts/prueba-teclas.mjs [url]
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:5173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(url);
// espera a que Boot termine de cargar el kit (con varias pruebas a la vez tarda más)
await page.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Intro') || window.game?.scene.isActive('Title'), null, { timeout: 60000 });
await page.waitForTimeout(400);
await page.mouse.click(640, 360);
await page.waitForTimeout(300);
await page.evaluate(() => { const g = window.game; g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key)); g.scene.start('Title'); });
await page.waitForTimeout(800);
const linea = await page.evaluate(() => window.game.scene.getScene('Title').children.list.filter((o) => o.type === 'BitmapText').map((o) => o.text).find((t) => t.includes('PUÑO')));
console.log('título dice:', linea);
const ACCION = { PUÑO: 'punch', PATADA: 'kick', SALTO: 'jump', TÉCNICA: 'special' };
const KEY = { J: 'j', K: 'k', L: 'l', U: 'u', Z: 'z', X: 'x', C: 'c', V: 'v', ESPACIO: ' ', ENTER: 'Enter' };
const lee = (k) => page.evaluate(async () => window.game.scene.getScene('Title').pad.read().held);
let fallas = 0;
const revisa = async (tecla, accion, origen) => {
  await page.keyboard.down(KEY[tecla]);
  await page.waitForTimeout(40);
  const h = await lee();
  await page.keyboard.up(KEY[tecla]);
  const otros = Object.entries(h).filter(([n, v]) => v && n !== accion).map(([n]) => n);
  const ok = h[accion] && !otros.length;
  if (!ok) fallas++;
  console.log(`${ok ? 'ok   ' : 'FALLA'} ${origen}: ${tecla} -> ${accion}${otros.length ? ` (también: ${otros.join(', ')})` : ''}${h[accion] ? '' : ' (no la lee)'}`);
};
for (const par of linea.split('·').map((x) => x.trim())) {
  const [tecla, accion] = par.split(':').map((x) => x.trim());
  if (ACCION[accion]) await revisa(tecla, ACCION[accion], 'título');
}
// las alternas que nombra la línea chiquita del entrenamiento
for (const [t, a] of [['Z', 'punch'], ['X', 'kick'], ['C', 'jump'], ['ESPACIO', 'jump'], ['V', 'special'], ['ENTER', 'start']]) await revisa(t, a, 'alterna');
console.log(fallas ? `${fallas} teclas no cuadran` : 'todas las teclas cuadran');
await browser.close();
process.exit(fallas ? 1 : 0);
