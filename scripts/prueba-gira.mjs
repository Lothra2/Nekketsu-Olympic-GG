// La Olimpiada Express con las pruebas nuevas: el medallero arma la lista de la gira, cada prueba arranca en modo
// gira, reparte sus puntos y vuelve al medallero. Las pruebas se cierran a mano (no se juegan enteras).
//   node scripts/prueba-gira.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? 'capturas/gira';
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
let fallas = 0;
const ok = (c, m) => { console.log(`${c ? 'OK ' : 'MAL'} ${m}`); if (!c) fallas++; };
const activa = () => page.evaluate(() => window.game.scene.getScenes(true).map((s) => s.scene.key).filter((k) => k !== 'Tap'));
const gira = () => page.evaluate(() => window.game.registry.get('gira'));
const esperar = async (fn, ms = 20000) => { for (let t = 0; t < ms; t += 200) { if (await fn()) return true; await page.waitForTimeout(200); } return false; };
const enter = async () => { await page.keyboard.down('Enter'); await page.waitForTimeout(80); await page.keyboard.up('Enter'); };

const lista = ['Tamawari', 'DaCau', 'Tejo', 'Judo', 'Jabalina', 'Fight'];
await page.evaluate((pruebas) => {
  const g = window.game;
  g.registry.set('gira', { jugador: 'sophie', idx: 0, puntos: [0, 0], resultados: [], pruebas });
  g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key));
  g.scene.start('Medallero');
}, lista);
let suma = 0;
for (const [i, id] of lista.slice(0, 4).entries()) {
  await page.waitForTimeout(1300);
  await page.screenshot({ path: `${out}/medallero_${i}.png` });
  await enter();
  const esc = id === 'Judo' ? 'Fight' : id;
  ok(await esperar(async () => (await activa()).includes(esc)), `${id}: arranca la escena ${esc}`);
  const d = await page.evaluate((esc) => { const s = window.game.scene.getScene(esc); return { gira: !!(s.d?.gira ?? s.data0?.gira), modo: s.data0?.modo, rival: s.data0?.rival }; }, esc);
  ok(d.gira, `${id}: en modo gira ${JSON.stringify(d)}`);
  if (id === 'Judo') {
    ok(d.modo === 'judo', 'el judo arranca como judo');
    await esperar(() => page.evaluate(() => window.game.scene.getScene('Fight').phase === 'play'));
    await page.evaluate(() => window.game.scene.getScene('Fight').finJudo(0));
    suma += 16;
  } else {
    await esperar(() => page.evaluate((esc) => window.game.scene.getScene(esc).fase === 'juego', esc));
    await page.evaluate((esc) => { const s = window.game.scene.getScene(esc); s.resultados('PRUEBA', s.gente.map((c) => ({ c, valor: '1' }))); }, esc);
    suma += 22;
  }
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/fin_${id}.png` });
  const g = await gira();
  ok(g.puntos[0] + g.puntos[1] === suma, `${id}: puntos ${g.puntos.join(' a ')} (suman ${suma})`);
  await enter();
  ok(await esperar(async () => (await activa()).includes('Medallero')), `${id}: vuelve al medallero`);
  ok((await gira()).idx === i + 1, `${id}: la gira avanza a ${i + 1}`);
}
await page.waitForTimeout(1300);
await page.screenshot({ path: `${out}/medallero_4.png` });
console.log(logs.length ? logs.join('\n') : 'sin errores en consola');
await browser.close();
process.exit(fallas || logs.length ? 1 : 0);
