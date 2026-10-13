// Las aves del kit (lote C7b): las palomas del hẻm despegan cuando pasan los corredores, se van y vuelven a aterrizar,
// y el gallo de la Comuna 13 canta al arrancar y se asusta en su techo. Sin el kit de aves no hay nada que ver.
//   node scripts/prueba-aves.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? 'capturas/aves';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto(url);
await page.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Intro') || window.game?.scene.isActive('Title'), null, { timeout: 60000 });
await page.waitForTimeout(400);
await page.mouse.click(640, 360);
await page.waitForTimeout(300);

const arrancar = (esc, datos) => page.evaluate(([e, d]) => {
  window.__esc = e;
  const g = window.game;
  g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key));
  g.scene.start(e, { jugador: 'sophie', ...d });
}, [esc, datos]);
const aves = () => page.evaluate(() => {
  const s = window.game.scene.getScene(window.__esc);
  if (!s?.gente2?.[0]) return null;
  s.gente2[0].a.human = false;
  return { fase: s.fase, lider: Math.round(Math.max(...s.gente2.map((r) => r.a.x))), p: s.pajaros.map((p) => `${p.id}:${p.estado}:${p.s.anims.currentAnim?.key.split('_').pop()}@${Math.round(p.x)},${Math.round(p.y)},${Math.round(p.alt)}`) };
});
let fallas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK ' : 'MAL'} ${m}`); if (!c) fallas++; };

// 1. el hẻm: seis palomas; pasan los corredores, despegan, vuelan y vuelven
await arrancar('CrossCountry', { tramo: 0 });
let e = null;
for (let i = 0; i < 60 && e?.fase !== 'juego'; i++) { await page.waitForTimeout(250); e = await aves(); }
ok(e?.p.filter((x) => x.startsWith('paloma')).length === 6, `seis palomas en el hẻm: ${e?.p.length}`);
const vistos = new Set();
for (let i = 0; i < 70; i++) {
  await page.waitForTimeout(200);
  e = await aves();
  e.p.slice(0, 3).forEach((x) => vistos.add(x.split(':')[1]));
  if (i % 5 === 0) { console.log(e.lider, e.p.slice(0, 3).join(' | ')); await page.screenshot({ path: `${out}/hem_${String(i).padStart(2, '0')}.png` }); }
}
ok(vistos.has('despega') || vistos.has('vuela'), `las palomas despegan al pasar: ${[...vistos].join(', ')}`);
ok(vistos.has('aterriza') || [...vistos].includes('suelo'), 'y vuelven al piso');
// la vuelta de las tres primeras
for (let i = 0; i < 40; i++) { await page.waitForTimeout(250); e = await aves(); if (e.p.slice(0, 3).every((x) => x.includes(':suelo:'))) break; }
ok(e.p.slice(0, 3).every((x) => x.includes(':suelo:')), `las tres del arranque aterrizaron: ${e.p.slice(0, 3).join(' | ')}`);

// 2. la Comuna 13: el gallo canta al arrancar y se asusta cuando pasan por el techo
await arrancar('Obstaculos', {});
e = null;
for (let i = 0; i < 60 && e?.fase !== 'juego'; i++) { await page.waitForTimeout(250); e = await aves(); }
await page.waitForTimeout(300);
e = await aves();
ok(e.p.some((x) => x.startsWith('gallo') && x.includes('cantar')), `el gallo canta al arrancar: ${e.p.join(' | ')}`);
const gallo = new Set();
let foto = 0;
for (let i = 0; i < 400; i++) {
  await page.waitForTimeout(200);
  e = await aves();
  if (!e) break;
  const g = e.p.find((x) => x.startsWith('gallo'));
  gallo.add(g.split(':')[2].split('@')[0]);
  if (e.lider > 2080 && e.lider < 2350 && foto < 12 && i % 2 === 0) { console.log(e.lider, g); await page.screenshot({ path: `${out}/gallo_${String(++foto).padStart(2, '0')}.png` }); }
  if (e.lider > 2500 || e.fase === 'fin') break;
}
ok(gallo.has('asustarse'), `el gallo se asusta: ${[...gallo].join(', ')}`);
console.log(logs.length ? logs.join('\n') : 'sin errores en consola');
await browser.close();
process.exit(fallas || logs.length ? 1 : 0);
