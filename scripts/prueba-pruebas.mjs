// Prueba de las pruebas olímpicas: entra a cada una y juega apretando botones.
//   node scripts/prueba-pruebas.mjs [url] [carpeta] [prueba...]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/pruebas';
const solo = process.argv.slice(4);
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
await page.waitForTimeout(400);
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const key = async (k, ms = 40) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
const start = (scene, d) => page.evaluate(([s, d]) => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start(s, d); }, [scene, d]);
const mash = async (secs, extra) => {
  const t0 = Date.now();
  let n = 0;
  while (Date.now() - t0 < secs * 1000) { await key(n % 2 ? 'k' : 'j', 30); await page.waitForTimeout(40); n++; if (extra) await extra(n); }
};

if (!solo.length || solo.includes('vallas')) {
  await start('Vallas', { jugador: 'sophie' });
  await page.waitForTimeout(1200); await shot('vallas_0_titulo');
  await page.waitForTimeout(2600); await shot('vallas_1_salida');
  const vallas = () => page.evaluate(() => { const s = window.game.scene.getScene('Vallas'); const me = s.racers[0]; return { x: me.x, hs: s.hurdles.filter((h) => h.lane === me.lane && !h.down && h.x > me.x).map((h) => h.x)[0] }; });
  await page.keyboard.down('ArrowRight');
  let k = 0;
  await mash(4, async (n) => { if (n % 6) return; const v = await vallas(); if (v.hs && v.hs - v.x < 34 && v.hs - v.x > 0) await key('l', 30); if (n === 30) await shot(`vallas_2_carrera_${k++}`); });
  await shot('vallas_3_carrera');
  await mash(6, async (n) => { if (n % 6) return; const v = await vallas(); if (v.hs && v.hs - v.x < 34 && v.hs - v.x > 0) await key('l', 30); });
  await page.keyboard.up('ArrowRight');
  await shot('vallas_4');
  await page.waitForTimeout(7000); await shot('vallas_5_resultados');
}
if (!solo.length || solo.includes('natacion')) {
  await start('Natacion', { jugador: 'alana' });
  await page.waitForTimeout(1500); await shot('natacion_0_titulo');
  await page.waitForTimeout(2300); await shot('natacion_1_poyete');
  await key('l');
  await page.waitForTimeout(250); await shot('natacion_2_salto');
  await page.waitForTimeout(350); await shot('natacion_3_agua');
  await mash(3, async (n) => { if (n === 20) await key('u'); });
  await shot('natacion_4_nado');
  await mash(9);
  await shot('natacion_5');
  await page.waitForTimeout(7000); await shot('natacion_6_resultados');
}
if (!solo.length || solo.includes('jabalina')) {
  await start('Jabalina', { jugador: 'rick' });
  await page.waitForTimeout(1500); await shot('jabalina_0_titulo');
  await page.waitForTimeout(2500); await shot('jabalina_1_cpu');
  await page.waitForTimeout(1200); await shot('jabalina_2_cpu_vuelo');
  // a la persona le toca de último en cada ronda
  const turno = () => page.evaluate(() => { const s = window.game.scene.getScene('Jabalina'); return { human: s.cur?.c.human, st: s.st, x: s.x, ronda: s.ronda, fase: s.fase }; });
  for (let r = 0; r < 2; r++) {
    let t = await turno();
    while (!(t.human && t.st === 'carrera') && t.fase !== 'fin') { await page.waitForTimeout(200); t = await turno(); }
    await mash(1.3);
    await page.keyboard.down('l');
    await mash(0.45);
    await shot(`jabalina_3_angulo_${r}`);
    await page.keyboard.up('l');
    await page.waitForTimeout(500); await shot(`jabalina_4_vuelo_${r}`);
    await page.waitForTimeout(1600); await shot(`jabalina_5_marca_${r}`);
    console.log('jabalina', JSON.stringify(await page.evaluate(() => window.game.scene.getScene('Jabalina').gente2.map((l) => `${l.c.id}:${l.marcas.join('/')}`))));
  }
  await page.waitForTimeout(3000); await shot('jabalina_6_resultados');
}
if (!solo.length || solo.includes('gira')) {
  await page.evaluate(() => { window.game.registry.set('gira', { jugador: 'steph', idx: 0, puntos: [0, 0], resultados: [] }); });
  await start('Medallero', {});
  await page.waitForTimeout(1200); await shot('gira_0_medallero');
  await page.evaluate(() => { window.game.registry.set('gira', { jugador: 'steph', idx: 2, puntos: [26, 18], resultados: [{ prueba: 'VALLAS', podio: ['steph', 'kenji', 'rick', 'goro'] }, { prueba: 'NATACION', podio: ['ryu', 'steph', 'sophie', 'tetsu'] }] }); });
  await start('Medallero', {});
  await page.waitForTimeout(1200); await shot('gira_1_medallero_medio');
  await page.evaluate(() => { window.game.registry.set('gira', { jugador: 'steph', idx: 5, puntos: [62, 38], resultados: [] }); });
  await start('Medallero', {});
  await page.waitForTimeout(1500); await shot('gira_2_final');
}
console.log(logs.length ? logs.join('\n') : 'sin errores');
await browser.close();
