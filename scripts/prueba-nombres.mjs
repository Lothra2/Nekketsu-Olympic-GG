// Que ningún nombre se salga de su sitio, con los 24 atletas: la tarjeta de la selección, el panel de la pelea, la
// técnica (a 640 y a 780 de ancho), los platos del VS de 4, la tabla de resultados y el medallero.
//   node scripts/prueba-nombres.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/nombres';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let fallas = 0;
const logs = [];
const check = (ok, s, extra = '') => { if (!ok) fallas++; if (!ok || process.env.TODO) console.log(`${ok ? 'ok   ' : 'FALLA'} ${s} ${extra}`); };

async function abrir(w, h) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  p.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
  await p.goto(url);
  await p.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Title'), null, { timeout: 90000 });
  await p.mouse.click(w / 2, h / 2);
  await p.waitForTimeout(300);
  return p;
}
const ir = (p, e, d) => p.evaluate(([e, d]) => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start(e, d); }, [e, d]);

const p = await abrir(1280, 720);
const equipos = await p.evaluate(() => { const m = window.game.cache.json.get('manifest'); const r = {}; for (const [id, a] of Object.entries(m.atletas)) if (a.equipo) (r[a.equipo] ??= []).push(id); return r; });
const todos = Object.values(equipos).flat();
console.log(`${todos.length} atletas en ${Object.keys(equipos).length} equipos`);

// 1) la selección: cada nombre dentro de su tarjeta (108 de ancho)
await ir(p, 'Select', { modo: '1v1' });
await p.waitForTimeout(1500);
for (const eq of Object.keys(equipos)) {
  const m = await p.evaluate((eq) => {
    const s = window.game.scene.getScene('Select');
    s.miEquipo = eq; s.paso = 'jugador'; s.sel = 0; s.build();
    return s.cards.flatMap((c) => c.list.filter((o) => o.type === 'BitmapText' && o.y > 40).map((o) => ({ t: o.text, w: Math.round(o.width) })));
  }, eq);
  for (const x of m) check(x.w <= 104, `selección: ${x.t} cabe en su tarjeta`, `(${x.w} de 104)`);
  await p.screenshot({ path: `${out}/seleccion_${eq}.png` });
}
// y el nombre corto de cada equipo en su tarjeta del kit
await p.evaluate(() => { const s = window.game.scene.getScene('Select'); s.paso = 'equipo'; s.sel = 0; s.build(); });
await p.waitForTimeout(300);
const tarjetas = await p.evaluate(() => window.game.scene.getScene('Select').cards.flatMap((c) => c.list.filter((o) => o.type === 'BitmapText').map((o) => ({ t: o.text, w: Math.round(o.width) }))));
for (const x of tarjetas) check(x.w <= 104, `tarjeta de equipo: ${x.t} cabe`, `(${x.w} de 104)`);

// 2) la pelea: el nombre en el panel y la técnica dentro de lo que se ve, a 640 y a 780
for (const [w, h, n] of [[1280, 720, '640'], [844, 390, '780']]) {
  const q = n === '640' ? p : await abrir(w, h);
  for (const id of todos) {
    const rival = id === 'kenji' ? 'rick' : 'kenji';
    await ir(q, 'Fight', { modo: '1v1', jugador: id, rival });
    await q.waitForFunction(() => window.game.scene.getScene('Fight')?.phase === 'play', null, { timeout: 40000 }).catch(() => {});
    const r = await q.evaluate(() => {
      const f = window.game.scene.getScene('Fight');
      const W = Math.min(800, window.game.scale.gameSize.width), x0 = 320 - W / 2, x1 = 320 + W / 2;
      const panel = f.ui.list.filter((o) => o.type === 'BitmapText' && o.y === 9).map((o) => { const bb = o.getBounds(); return { t: o.text, x: Math.round(bb.x), r: Math.round(bb.right) }; });
      const a = f.player;
      f.brains.clear();
      f.cutIn(a);
      return { panel, x0, x1 };
    });
    await q.waitForTimeout(450);
    // con la técnica el tiempo va lento: espera a que la letra termine de achicarse
    await q.waitForFunction(() => { const f = window.game.scene.getScene('Fight'); return !f.tweens.getTweensOf(f.cutObjs).length; }, null, { timeout: 5000 }).catch(() => {});
    const c = await q.evaluate(() => { const f = window.game.scene.getScene('Fight'); return f.cutObjs.filter((o) => o.type === 'BitmapText').map((o) => { const bb = o.getBounds(); return { t: o.text, x: Math.round(bb.x), r: Math.round(bb.right) }; }); });
    // el panel del kit va de x 1 a 209 (en espejo a la derecha)
    for (const t of r.panel) check(t.r - t.x <= 150, `pelea a ${n}: ${t.t} cabe en su panel`, `(${t.r - t.x} de 150)`);
    for (const t of c) check(t.x >= r.x0 && t.r <= r.x1, `técnica a ${n}: ${t.t} se ve entera`, `(${t.x} a ${t.r}, se ve de ${r.x0} a ${r.x1})`);
    if (id === 'sophie' || id === 'carmen' || id === 'kenji') await q.screenshot({ path: `${out}/tecnica_${id}_${n}.png` });
    await q.evaluate(() => { const f = window.game.scene.getScene('Fight'); f.cutObjs.forEach((o) => o.destroy()); f.cutObjs = []; f.cut = 0; });
  }
  if (q !== p) await q.close();
}

// 3) el VS de 4 de cada equipo: los nombres en sus platos de 106
const eqs = Object.keys(equipos);
for (const [i, eq] of eqs.entries()) {
  const contra = eqs[(i + 1) % eqs.length];
  // el partido lo pone la selección al salir
  await ir(p, 'Select', { modo: '4v4' });
  await p.waitForTimeout(800);
  await p.evaluate(([a, b, j]) => { const s = window.game.scene.getScene('Select'); s.miEquipo = a; s.suEquipo = b; s.jugador = j; s.salir(); }, [eq, contra, equipos[eq][0]]);
  await p.waitForFunction(() => window.game.scene.getScene('Fight')?.ui?.list?.some((o) => o.texture?.key === 'ui_marco_vs_4'), null, { timeout: 40000 }).catch(() => {});
  await p.waitForTimeout(700);
  const n = await p.evaluate(() => window.game.scene.getScene('Fight').ui.list.filter((o) => o.type === 'BitmapText' && Math.abs(o.y - 246) < 2).map((o) => ({ t: o.text, w: Math.round(o.width) })));
  for (const x of n) check(x.w <= 104, `VS: ${x.t} cabe en su plato`, `(${x.w} de 104)`);
}

// 4) la tabla de resultados y el medallero, con el nombre corto de cada uno
const medidas = await p.evaluate((ids) => {
  const s = window.game.scene.getScene('Fight');
  return ids.map((id) => {
    const corto = s.nombreDe(id);
    const t2 = s.add.bitmapText(0, 0, 'fuente_ui', corto).setScale(2), t1 = s.add.bitmapText(0, 0, 'fuente_ui', corto);
    const r = { id, corto, w2: Math.round(t2.width), w1: Math.round(t1.width) };
    t2.destroy(); t1.destroy();
    return r;
  });
}, todos);
for (const m of medidas) {
  // resultados: el nombre va de 232 y el valor más largo (88.88 M) empieza en 392
  check(232 + m.w2 <= 388, `resultados: ${m.corto} no choca con el valor`, `(${m.w2})`);
  // medallero: de 468 al borde del panel en 578
  check(468 + m.w1 <= 576, `medallero: ${m.corto} cabe`, `(${m.w1})`);
}

console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien: ningún nombre se sale');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
