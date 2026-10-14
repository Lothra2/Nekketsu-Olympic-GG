// Entrenamiento de vallas en tablet: el cartel tiene que nombrar los botones de la pantalla (A, B, C)
// y tocando esos botones tiene que avanzar.
//   node scripts/prueba-tactil.mjs [url] [carpeta]
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const logs = [];
page.on('pageerror', (e) => logs.push(e.message));
await page.goto(url);
// espera a que Boot termine de cargar el kit (con varias pruebas a la vez tarda más)
await page.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Intro') || window.game?.scene.isActive('Title'), null, { timeout: 60000 });
await page.waitForTimeout(400);
await page.touchscreen.tap(590, 410);
await page.waitForTimeout(500);
const cdp = await ctx.newCDPSession(page);
const k = 1180 / 640, oy = (820 - 360 * k) / 2;
const P = (x, y) => ({ x: x * k, y: oy + y * k, id: 1 });
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts });
const BTN = { A: [528, 302], B: [586, 270], C: [586, 326] };
const tap = async (b) => { await touch('touchStart', [P(...BTN[b])]); await page.waitForTimeout(35); await touch('touchEnd', []); await page.waitForTimeout(30); };
await page.evaluate(() => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start('Vallas', { jugador: 'alana', practica: true }); });
await page.waitForFunction(() => !!window.game.scene.getScene('Vallas').coach, null, { timeout: 15000 });
const estado = () => page.evaluate(() => { const s = window.game.scene.getScene('Vallas'); const c = s.coach; const me = s.racers[0]; const h = s.hurdles.filter((h) => h.lane === me.lane && !h.down && h.x > me.x).map((h) => h.x)[0]; return { i: c.i, texto: c.main.text.replace(/\n/g, ' '), teclas: c.keys.text, gap: h ? h - me.x : 999, v: me.v }; });
let e = await estado();
console.log('paso 1 dice:', e.texto, e.teclas ? `| ${e.teclas}` : '');
await page.screenshot({ path: `${out}/tactil_vallas_1.png` });
// los botones que nombra el cartel, en orden
const nombrados = (t) => [...t.matchAll(/\b([ABC])\b/g)].map((m) => m[1]);
let n = 0;
for (let r = 0; r < 60 && e.i === 0; r++) { const b = nombrados(e.texto); await tap(b[n++ % b.length]); e = await estado(); }
console.log(e.i >= 1 ? 'ok: tocando lo que dice el cartel, pasa al paso 2' : 'FALLA: no pasó del paso 1');
await page.waitForTimeout(1000);
e = await estado();
console.log('paso 2 dice:', e.texto);
for (let r = 0; r < 300 && e.i === 1; r++) {
  if (e.gap < 22 + e.v * 0.06 && e.gap > 0) await tap(nombrados(e.texto)[0]); else await tap(n++ % 2 ? 'A' : 'B');
  e = await estado();
}
console.log(e.i >= 2 ? 'ok: saltó una valla con el botón que dice el cartel' : 'FALLA: no saltó');
await page.screenshot({ path: `${out}/tactil_vallas_2.png` });
console.log(logs.join('\n') || 'sin errores');
await browser.close();
