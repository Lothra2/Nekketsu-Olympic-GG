// Cross Country (u Obstáculos): los cuatro con piloto automático, para ver que cada tramo se puede pasar de punta a punta.
//   node scripts/prueba-cross.mjs [url] [carpeta] [tramo] [escena]
// Sin tramo (o con "todos") corre los cinco seguidos, como en el juego. Con tramo (1 a 5) corre solo ese.
// La escena es CrossCountry si no se dice; Obstaculos corre la Comuna 13.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/cross';
const solo = process.argv[4] && process.argv[4] !== 'todos' ? Number(process.argv[4]) - 1 : null;
const escena = process.argv[5] ?? 'CrossCountry';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto(url);
// espera a que Boot termine de cargar el kit (con varias pruebas a la vez tarda más)
await page.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Intro') || window.game?.scene.isActive('Title'), null, { timeout: 60000 });
await page.waitForTimeout(400);
await page.mouse.click(640, 360);
await page.waitForTimeout(300);
await page.evaluate((e) => { window.__esc = e; }, escena);
await page.evaluate((t) => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start(window.__esc, { jugador: 'sophie', ...(t !== null ? { tramo: t } : {}) }); }, solo);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/00_previa.png` });
// el estado, con el jugador también en piloto automático (cada tramo arma atletas nuevos)
const estado = () => page.evaluate(() => {
  const s = window.game.scene.getScene(window.__esc);
  if (!s?.gente2?.length) return null;
  s.gente2[0].a.human = false;
  return {
    tramo: s.tramo + 1, id: s.L.id, t: s.clock.toFixed(1), fase: s.fase, entre: !!s.entre, final: s.fase === 'fin' && !s.entre && (s.tramo === s.tramos.length - 1 || s.endChoice !== null),
    r: s.gente2.map((r) => `${r.c.id}:${Math.round(r.a.x)},${Math.round(r.a.y)},${Math.round(r.a.z)}:${r.a.st}${r.done ? ' META' : ''}`).join(' | '),
    x: s.gente2.map((r) => r.a.x),
  };
});
let k = 0, prev = null, quieto = 0, tramo = 0, fallas = 0;
for (let i = 0; i < 900; i++) {
  await page.waitForTimeout(700);
  const e = await estado();
  if (!e) continue;
  if (e.tramo !== tramo) { tramo = e.tramo; quieto = 0; prev = null; console.log(`-- tramo ${e.tramo}: ${e.id}`); }
  if (i % 6 === 0 && !e.entre) { console.log(e.t, e.r); await page.screenshot({ path: `${out}/${String(++k).padStart(3, '0')}_t${e.tramo}.png` }); }
  if (e.entre) {
    const txt = await page.evaluate(() => window.game.scene.getScene(window.__esc).gente2.map((r) => `${r.c.id} ${r.time.toFixed(1)}s${r.a.x >= r.a.w.meta ? '' : ' (no llegó)'}`).join(' · '));
    if (prev !== 'entre') { console.log(`fin del tramo ${e.tramo} a los ${e.t} s: ${txt}`); await page.screenshot({ path: `${out}/${String(++k).padStart(3, '0')}_t${e.tramo}_tabla.png` }); }
    prev = 'entre';
    if (solo !== null) break;
    continue;
  }
  if (e.final) {
    console.log(`fin del tramo ${e.tramo} a los ${e.t} s: ${await page.evaluate(() => window.game.scene.getScene(window.__esc).gente2.map((r) => `${r.c.id} ${r.time.toFixed(1)}s${r.a.x >= r.a.w.meta ? '' : ' (no llegó)'}`).join(' · '))}`);
    console.log('total:', await page.evaluate(() => { const s = window.game.scene.getScene(window.__esc); return Object.entries(s.acum).sort((a, b) => a[1] - b[1]).map(([id, t]) => `${id} ${t.toFixed(1)}s`).join(' · '); }));
    break;
  }
  // alguien parado mucho rato en el mismo lugar, en pleno juego: atascado
  if (e.fase === 'juego' && prev && typeof prev === 'object') {
    const parado = e.x.map((x, j) => Math.abs(x - prev.x[j]) < 3);
    quieto = parado.some(Boolean) ? quieto + 1 : 0;
    if (quieto === 10) { fallas++; console.log('ATASCADO en', e.r); await page.screenshot({ path: `${out}/atascado_t${e.tramo}_${fallas}.png` }); }
  }
  prev = e;
}
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/zz_fin.png` });
console.log(logs.length ? logs.join('\n') : 'sin errores');
await browser.close();
