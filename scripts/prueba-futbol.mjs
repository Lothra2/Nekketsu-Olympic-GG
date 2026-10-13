// Fútbol Callejero: el entrenamiento con un bot (agarrar el balón, pasar, meter un gol y robar con barrida) y un
// partido 4 contra 4 con el bot de humano: corre al balón, avanza, tira cerca del arco y barre al que lo lleva.
//   node scripts/prueba-futbol.mjs [url] [carpeta] [partido] [nivel]   (con "partido" se salta el entrenamiento)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? 'capturas/futbol';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
p.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await p.goto(url);
await p.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Title') || window.game?.scene.isActive('Intro'), null, { timeout: 60000 });
await p.mouse.click(640, 360);
await p.waitForTimeout(300);
let fallas = 0;
const check = (ok, s) => { if (!ok) fallas++; console.log(`${ok ? 'ok   ' : 'FALLA'} ${s}`); };
const ir = (e, d) => p.evaluate(([e, d]) => { const g = window.game; g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key)); g.scene.start(e, d); }, [e, d]);
const st = () => p.evaluate(() => {
  const s = window.game.scene.getScene('Futbol'), c = s.ctrl, bo = s.bola;
  return {
    fase: s.fase, paso: s.paso, reloj: Math.round(s.clock), goles: s.goles.join('-'), pausa: s.pausa > 0,
    c: c ? { x: c.x, y: c.y, st: c.st } : null,
    b: { x: bo.x, y: bo.y, mia: !!c && bo.dueño === c, rival: bo.dueño ? bo.dueño.team === 1 : false, dx: bo.dueño ? bo.dueño.x : bo.x, dy: bo.dueño ? bo.dueño.y : bo.y },
    n: { pases: s.pases, goles: s.golesTuyos, robos: s.robos },
  };
});
const teclas = { left: 'ArrowLeft', right: 'ArrowRight', up: 'ArrowUp', down: 'ArrowDown' };
const abajo = new Set();
async function mover(dx, dy) {
  const quiero = new Set();
  if (dx < -4) quiero.add('left'); if (dx > 4) quiero.add('right');
  if (dy < -4) quiero.add('up'); if (dy > 4) quiero.add('down');
  for (const k of Object.keys(teclas)) {
    if (quiero.has(k) && !abajo.has(k)) { await p.keyboard.down(teclas[k]); abajo.add(k); }
    if (!quiero.has(k) && abajo.has(k)) { await p.keyboard.up(teclas[k]); abajo.delete(k); }
  }
}
const toque = async (k) => { await p.keyboard.down(k); await p.waitForTimeout(30); await p.keyboard.up(k); };
/** el bot: con el balón avanza y tira cerca del arco (o pasa); sin el balón corre a él y barre al rival que lo lleva */
async function bot(s, { pasa = false } = {}) {
  if (!s.c || s.fase !== 'juego' || s.pausa) { await mover(0, 0); return; }
  const { c, b: bo } = s;
  if (bo.mia) {
    if (pasa) { await mover(0, 0); await toque('j'); return; }
    if (c.x > 470) { await mover(0, 0); await toque('k'); return; }
    await mover(600 - c.x, 52 - c.y);
    return;
  }
  await mover(bo.dx - c.x, bo.dy - c.y);
  if (bo.rival && Math.hypot(bo.dx - c.x, bo.dy - c.y) < 20 && c.st === 'libre') await toque('k');
}

let t0 = Date.now();
if (process.argv[4] !== 'partido') {
  await ir('Futbol', { jugador: 'sophie', practica: true });
  await p.waitForFunction(() => window.game.scene.getScene('Futbol')?.coach, null, { timeout: 20000 });
  let visto = -1;
  while (Date.now() - t0 < 150000) {
    const s = await st();
    if (s.paso !== visto) { visto = s.paso; console.log(`paso ${s.paso} ${JSON.stringify(s.n)}`); await p.screenshot({ path: `${out}/paso_${s.paso}.png` }); }
    if (s.fase === 'fin') break;
    await bot(s, { pasa: s.paso === 1 });
  }
  await mover(0, 0);
  const e1 = await st();
  check(e1.fase === 'fin', `el entrenamiento se termina (paso ${e1.paso}) ${JSON.stringify(e1.n)}`);
}

if (process.argv[5]) await p.evaluate((n) => localStorage.setItem('ngg_nivel', n), process.argv[5]);
await ir('Futbol', { jugador: 'sophie' });
t0 = Date.now();
let foto = 0, ultimo = '';
while (Date.now() - t0 < 300000) {
  const s = await st();
  if (s.fase === 'fin') break;
  if (s.goles !== ultimo) { ultimo = s.goles; console.log(`${s.reloj}s ${s.goles}`); if (foto < 6) await p.screenshot({ path: `${out}/partido_${++foto}.png` }); }
  await bot(s);
}
await mover(0, 0);
const e2 = await st();
check(e2.fase === 'fin', `el partido termina a los ${e2.reloj}s: ${e2.goles}`);
console.log('números:', JSON.stringify(await p.evaluate(() => window.game.scene.getScene('Futbol').stats)));
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/tabla.png` });
console.log(logs.length ? logs.join('\n') : 'sin errores en consola');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
