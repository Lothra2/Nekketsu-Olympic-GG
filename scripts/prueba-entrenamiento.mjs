// Completa los cuatro entrenamientos como lo haría una persona y saca capturas de cada paso.
//   node scripts/prueba-entrenamiento.mjs [url] [carpeta] [prueba...]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/entrenamiento';
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
const key = async (k, ms = 40) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
const start = (scene, d) => page.evaluate(([s, d]) => { const g = window.game; g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key)); g.scene.start(s, d); }, [scene, d]);
const paso = (scene) => page.evaluate((s) => { const c = window.game.scene.getScene(s).coach; return c ? (c.done ? 99 : c.i) : -1; }, scene);

/** Juega hasta terminar o hasta el tiempo límite; `jugar(i)` hace un poquito según el paso actual. */
async function entrenar(scene, d, jugar, limite = 60) {
  await start(scene, d);
  await page.waitForTimeout(2200);
  const t0 = Date.now();
  let visto = -1;
  while (Date.now() - t0 < limite * 1000) {
    const i = await paso(scene);
    if (i === 99) break;
    if (i !== visto) {
      visto = i;
      await page.waitForTimeout(150);
      await page.screenshot({ path: `${out}/${scene}_${i}.png` });
      if (i >= 0) console.log(`  ${scene} ${i + 1}:`, await page.evaluate((s) => { const c = window.game.scene.getScene(s).coach; return `${c.main.text.replace(/\n/g, ' ')} | ${c.keys.text}`; }, scene));
    }
    if (i >= 0) await jugar(i);
    else await page.waitForTimeout(100);
  }
  const fin = await paso(scene);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/${scene}_fin.png` });
  console.log(scene, fin === 99 ? 'completo' : `se quedó en el paso ${fin + 1}`);
}

if (!solo.length || solo.includes('cross')) {
  // en el cross country la persona va con el piloto automático del juego: sabe saltar canales y rodear muros
  await entrenar('CrossCountry', { jugador: 'alana', practica: true }, async (i) => {
    await page.evaluate(() => { const s = window.game.scene.getScene('CrossCountry'); s.gente2[0].a.human = false; });
    await page.waitForTimeout(200);
  }, 90);
}
if (!solo.length || solo.includes('obstaculos')) {
  await entrenar('Obstaculos', { jugador: 'sophie', practica: true }, async () => {
    await page.evaluate(() => { const s = window.game.scene.getScene('Obstaculos'); s.gente2[0].a.human = false; });
    await page.waitForTimeout(200);
  }, 90);
}
if (!solo.length || solo.includes('vallas')) {
  await page.keyboard.down('ArrowRight');
  await entrenar('Vallas', { jugador: 'sophie', practica: true }, async (i) => {
    const v = await page.evaluate(() => { const s = window.game.scene.getScene('Vallas'); const me = s.racers[0]; const h = s.hurdles.filter((h) => h.lane === me.lane && !h.down && h.x > me.x).map((h) => h.x)[0]; return { gap: h ? h - me.x : 999, v: me.v }; });
    if (i === 3) { await key('ArrowUp', 60); return; }
    if (i === 4) { await key(Math.random() < 0.5 ? 'j' : 'k', 25); await key('u', 30); return; }
    if (v.gap < 22 + v.v * 0.06 && v.gap > 0) await key('l', 30);
    else await key(Math.random() < 0.5 ? 'j' : 'k', 25);
  });
  await page.keyboard.up('ArrowRight');
}
if (!solo.length || solo.includes('natacion')) {
  let n = 0;
  await entrenar('Natacion', { jugador: 'alana', practica: true }, async (i) => {
    if (i === 0) { await key('l'); await page.waitForTimeout(300); return; }
    if (i === 2) { await key('u'); return; }
    await key(n++ % 2 ? 'j' : 'k', 25);
  });
}
if (!solo.length || solo.includes('jabalina')) {
  await entrenar('Jabalina', { jugador: 'rick', practica: true }, async () => {
    const s = await page.evaluate(() => { const j = window.game.scene.getScene('Jabalina'); return { st: j.st, x: j.x }; });
    if (s.st !== 'carrera') { await page.waitForTimeout(150); return; }
    for (let k = 0; k < 16; k++) await key(k % 2 ? 'j' : 'k', 25);
    await page.keyboard.down('l');
    // sube la flecha hasta cerca de 45 grados
    for (let k = 0; k < 40; k++) { const a = await page.evaluate(() => window.game.scene.getScene('Jabalina').ang); if (a > 40) break; await key(k % 2 ? 'j' : 'k', 20); }
    await page.keyboard.up('l');
    await page.waitForTimeout(2500);
  }, 90);
}
if (!solo.length || solo.includes('pelea')) {
  await entrenar('Fight', { modo: '1v1', jugador: 'sophie', rival: 'goro', practica: true }, async (i) => {
    const s = await page.evaluate(() => { const f = window.game.scene.getScene('Fight'); const [p, r] = f.actors; const c = f.items.find((x) => x.kind === 'chancleta'); return { dx: r.x - p.x, dy: r.y - p.y, st: p.st, rst: r.st, cx: c ? c.x - p.x : 0, cy: c ? c.y - p.y : 0 }; });
    const acercar = async (dx, dy, cerca = 22) => {
      if (Math.abs(dy) > 4) await key(dy > 0 ? 'ArrowDown' : 'ArrowUp', 60);
      if (Math.abs(dx) > cerca) await key(dx > 0 ? 'ArrowRight' : 'ArrowLeft', 90);
      else if (Math.abs(dx) < 12) { await key(dx > 0 ? 'ArrowLeft' : 'ArrowRight', 60); await key(dx > 0 ? 'ArrowRight' : 'ArrowLeft', 12); }
      return Math.abs(dx) <= cerca && Math.abs(dx) >= 12 && Math.abs(dy) <= 4;
    };
    if (i === 0) { await key('ArrowRight', 500); return; }
    if (i === 1) { if (await acercar(s.dx, s.dy)) { await key('j'); await page.waitForTimeout(160); } return; }
    if (i === 2) { if (await acercar(s.dx, s.dy)) { await key('k'); await page.waitForTimeout(400); } return; }
    if (i === 3) { if (await acercar(s.dx, s.dy, 34)) { await key('l'); await page.waitForTimeout(120); await key('k'); await page.waitForTimeout(700); } return; }
    if (i === 4) { await key('ArrowLeft', 40); await page.waitForTimeout(40); await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(300); await page.keyboard.up('ArrowLeft'); return; }
    if (i === 5) { if (s.rst === 'down' && (await acercar(s.dx, s.dy, 20))) await key('j'); else await page.waitForTimeout(80); return; }
    if (i === 6) { await key('ArrowRight', 200); await key('j'); await page.waitForTimeout(300); return; }
    if (i === 7) {
      if (Math.abs(s.cy) > 4) await key(s.cy > 0 ? 'ArrowDown' : 'ArrowUp', 60);
      else if (Math.abs(s.cx) > 10) await key(s.cx > 0 ? 'ArrowRight' : 'ArrowLeft', 60);
      else { await key('j'); await page.waitForTimeout(400); }
      return;
    }
    if (i === 8) { await key('k'); await page.waitForTimeout(300); return; }
    if (i === 9) { await key('u'); await page.waitForTimeout(500); return; }
  }, 90);
}
console.log(logs.length ? logs.join('\n') : 'sin errores');
await browser.close();
