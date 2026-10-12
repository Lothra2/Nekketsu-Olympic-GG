// Cross Country: los cuatro con piloto automático, para ver que el tramo se puede pasar de punta a punta.
//   node scripts/prueba-cross.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/cross';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto(url);
await page.waitForTimeout(2500);
await page.mouse.click(640, 360);
await page.waitForTimeout(300);
await page.evaluate(() => { const g = window.game; g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key)); g.scene.start('CrossCountry', { jugador: 'sophie' }); });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/00_previa.png` });
// el jugador también con piloto automático
await page.evaluate(() => { const s = window.game.scene.getScene('CrossCountry'); s.gente2[0].a.human = false; });
const estado = () => page.evaluate(() => { const s = window.game.scene.getScene('CrossCountry'); return { t: s.clock.toFixed(1), fase: s.fase, r: s.gente2.map((r) => `${r.c.id}:${Math.round(r.a.x)},${Math.round(r.a.y)},${Math.round(r.a.z)}:${r.a.st}${r.done ? ' META' : ''}`).join(' | ') }; });
let k = 0, lastX = 0, quieto = 0;
for (let i = 0; i < 140; i++) {
  await page.waitForTimeout(700);
  const e = await estado();
  if (i % 5 === 0) { console.log(e.t, e.r); await page.screenshot({ path: `${out}/${String(++k).padStart(2, '0')}.png` }); }
  if (e.fase === 'fin') { console.log('fin a los', e.t, 's:', await page.evaluate(() => window.game.scene.getScene('CrossCountry').gente2.map((r) => `${r.c.id} ${r.time.toFixed(1)}s${r.a.x >= r.a.w.meta ? '' : ' (no llegó)'}`).join(' · '))); break; }
  const x = await page.evaluate(() => window.game.scene.getScene('CrossCountry').gente2[0].a.x);
  quieto = Math.abs(x - lastX) < 4 ? quieto + 1 : 0; lastX = x;
  if (quieto === 6) { console.log('ATASCADO en', e.r); await page.screenshot({ path: `${out}/atascado.png` }); }
}
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/zz_fin.png` });
console.log(logs.length ? logs.join('\n') : 'sin errores');
await browser.close();
