// Capturas del juego con Playwright: intro, título, selección y pelea.
//   node scripts/capturas.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas';
const soloPelea = process.argv.includes('--pelea');
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(url);
// espera a que Boot termine de cargar el kit (con varias pruebas a la vez tarda más)
await page.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Intro') || window.game?.scene.isActive('Title'), null, { timeout: 60000 });
await page.waitForTimeout(400);
const shot = async (n) => page.screenshot({ path: `${out}/${n}.png` });
await shot('00_tap');
await page.mouse.click(640, 360);
const key = async (k, ms = 80) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
if (!soloPelea) {
  for (let i = 1; i <= 21; i++) { await page.waitForTimeout(2500); await shot(`intro_${String(i).padStart(2, '0')}`); }
} else {
  await page.waitForTimeout(1500);
  await key('Enter');
}
await page.waitForTimeout(2000);
await shot('titulo');
await key('Enter');
await page.waitForTimeout(500);
await shot('menu');
// PELEA CALLEJERA > 4 CONTRA 4
await key('ArrowDown'); await page.waitForTimeout(250); await key('ArrowDown'); await page.waitForTimeout(250);
await key('Enter'); await page.waitForTimeout(300);
await key('ArrowDown'); await page.waitForTimeout(250);
await shot('menu_peleas');
await key('Enter');
await page.waitForTimeout(800);
await key('ArrowRight'); await page.waitForTimeout(150); await key('ArrowRight'); await page.waitForTimeout(150); await key('ArrowRight');
await page.waitForTimeout(500);
await shot('seleccion');
await key('j');
await page.waitForTimeout(1500);
await shot('pelea_inicio');
await page.waitForTimeout(1500);
// moverse y pelear
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(900); await page.keyboard.up('ArrowRight');
await shot('pelea_camina');
for (let r = 0; r < 14; r++) {
  await key('j', 60); await page.waitForTimeout(180); await key('j', 60); await page.waitForTimeout(180); await key('k', 60);
  await page.waitForTimeout(350);
  if (r % 3 === 0) await shot(`pelea_${String(r).padStart(2, '0')}`);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(200); await page.keyboard.up('ArrowRight');
}
const llenar = () => page.evaluate(() => { const f = window.game.scene.getScene('Fight'); f.player.meter = 100; });
await llenar(); await page.waitForTimeout(200);
await key('u'); await page.waitForTimeout(450); await shot('pelea_especial');
for (let i = 0; i < 4; i++) { await page.waitForTimeout(350); await shot(`pelea_especial_${i}`); }
// levantar y lanzar: tumbar a alguien y agarrarlo
for (let r = 0; r < 6; r++) { await key('k', 60); await page.waitForTimeout(160); await key('k', 60); await page.waitForTimeout(400); }
await key('j'); await page.waitForTimeout(700); await shot('pelea_levanta');
await key('j'); await page.waitForTimeout(400); await shot('pelea_lanza');
await page.waitForTimeout(3000); await shot('pelea_final');
console.log(logs.join('\n') || 'sin errores en consola');
await browser.close();
