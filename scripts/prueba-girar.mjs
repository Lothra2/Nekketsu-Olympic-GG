// Abrir el juego con el teléfono parado y girarlo: tiene que pedir que lo gires, y al girarlo llenar la pantalla
// con todo centrado (las cámaras, el marcador y los botones se acomodan solos al ancho nuevo).
//   node scripts/prueba-girar.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/girar';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(url);
await page.waitForFunction(() => window.game?.scene.isActive('Tap'), null, { timeout: 60000 });
await page.waitForTimeout(300);
let fallas = 0;
const check = (ok, s) => { if (!ok) fallas++; console.log(`${ok ? 'ok   ' : 'FALLA'} ${s}`); };
const gira = await page.evaluate(() => getComputedStyle(document.getElementById('girar')).display);
check(gira === 'flex', `parado pide girar el teléfono (${gira})`);
await page.screenshot({ path: `${out}/1_parado.png` });
// se gira
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(800);
const estado = () => page.evaluate(() => {
  const g = window.game, c = document.querySelector('canvas').getBoundingClientRect();
  const s = g.scene.getScenes(true)[0];
  return { w: c.width, h: c.height, ancho: g.scale.gameSize.width, escena: s.scene.key, camaras: s.cameras.cameras.map((k) => `${k.name || 'main'}:${k.width}/${Math.round(k.scrollX)}`).join(' ') };
});
let e = await estado();
check(e.w >= 843 && e.h >= 389 && e.ancho === 779, `acostado llena la pantalla (${Math.round(e.w)}x${Math.round(e.h)}, juego ${e.ancho})`);
check(/main:779\/-69/.test(e.camaras), `la pantalla de inicio queda centrada (${e.camaras})`);
await page.screenshot({ path: `${out}/2_acostado.png` });
// a una pelea, y se vuelve a girar a un tamaño distinto (otro teléfono)
await page.evaluate(() => { const g = window.game; g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key)); g.scene.start('Fight', { modo: '1v1', jugador: 'sophie', rival: 'kenji' }); });
await page.waitForTimeout(3500);
await page.setViewportSize({ width: 915, height: 412 });
await page.waitForTimeout(800);
e = await estado();
check(e.ancho === 800 && /ui:800\/-80/.test(e.camaras), `en la pelea, al cambiar de pantalla se acomoda (${e.ancho}: ${e.camaras})`);
check(e.w >= 914 && e.h >= 411, `y el lienzo llena la pantalla nueva (${Math.round(e.w)}x${Math.round(e.h)})`);
const botones = await page.evaluate(() => { const s = window.game.scene.getScene('Fight'); return s.pad.touch?.buttons?.map((b) => `${b.btn}:${Math.round(b.x)}`).join(' '); });
check(/punch:688/.test(botones ?? '') && /start:784/.test(botones ?? ''), `los botones se corren al borde derecho (${botones})`);
await page.screenshot({ path: `${out}/3_pelea.png` });
console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await browser.close();
process.exit(fallas || logs.length ? 1 : 0);
