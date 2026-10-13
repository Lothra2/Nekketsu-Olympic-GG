// Básquet 3x3: el entrenamiento con un bot (agarrar el balón, encestar soltando en lo verde, clavar y quitarle el
// balón a Kenji con un empujón) y un partido con el bot de humano.
//   node scripts/prueba-basket.mjs [url] [carpeta] [partido] [nivel]   (con "partido" se salta el entrenamiento)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? 'capturas/basket';
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
  const s = window.game.scene.getScene('Basket'), c = s.ctrl, bo = s.bola;
  return {
    fase: s.fase, paso: s.paso, reloj: Math.round(s.clock), puntos: s.puntos.join('-'), pausa: s.pausa > 0, limpia: s.limpia,
    c: c ? { x: c.x, y: c.y, st: c.st, carga: c.carga, cargando: c.cargando, d: s.dAro(c) } : null,
    b: { mia: !!c && bo.dueño === c, rival: bo.dueño ? bo.dueño.team === 1 : false, x: bo.dueño ? bo.dueño.x : bo.x, y: bo.dueño ? bo.dueño.y : bo.y, tiro: !!bo.tiro },
    n: { canastas: s.canastas, clavadas: s.clavadas, robos: s.robos },
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
let cargandoK = false, soltarEn = 0.82;
/** el bot: con el balón la saca si hace falta, clava cerca del aro o tira soltando cerca de lo verde; sin el balón va al balón y empuja */
async function bot(s, { modo = 'juego', error = 0.14 } = {}) {
  if (!s.c || s.fase !== 'juego' || s.pausa) { await mover(0, 0); if (cargandoK) { await p.keyboard.up('k'); cargandoK = false; } return; }
  const { c, b: bo } = s;
  if (bo.mia) {
    if (!s.limpia) { await mover(360 - c.x, 52 - c.y); return; }
    if (modo !== 'tiro' && c.d < 46) { await mover(0, 0); await toque('l'); return; }
    if (modo === 'clavada' || (modo === 'juego' && c.d > 130)) { await mover(560 - c.x, 52 - c.y); return; }
    await mover(0, 0);
    if (!cargandoK) { soltarEn = 0.83 + (Math.random() * 2 - 1) * error; await p.keyboard.down('k'); cargandoK = true; return; }
    const v = c.carga > 1 ? 2 - c.carga : c.carga;
    if (v >= soltarEn && c.carga < 1) { await p.keyboard.up('k'); cargandoK = false; }
    return;
  }
  if (cargandoK) { await p.keyboard.up('k'); cargandoK = false; }
  await mover(bo.x - c.x, bo.y - c.y);
  if (bo.rival && Math.hypot(bo.x - c.x, bo.y - c.y) < 16) await toque('j');
}

let t0 = Date.now();
if (process.argv[4] !== 'partido') {
  await ir('Basket', { jugador: 'sophie', practica: true });
  await p.waitForFunction(() => window.game.scene.getScene('Basket')?.coach, null, { timeout: 20000 });
  let visto = -1;
  while (Date.now() - t0 < 150000) {
    const s = await st();
    if (s.paso !== visto) { visto = s.paso; console.log(`paso ${s.paso} ${JSON.stringify(s.n)}`); await p.screenshot({ path: `${out}/paso_${s.paso}.png` }); }
    if (s.fase === 'fin') break;
    await bot(s, { modo: s.paso === 1 ? 'tiro' : s.paso === 2 ? 'clavada' : 'juego', error: 0 });
  }
  await mover(0, 0);
  const e1 = await st();
  check(e1.fase === 'fin', `el entrenamiento se termina (paso ${e1.paso}) ${JSON.stringify(e1.n)}`);
}

if (process.argv[5]) await p.evaluate((n) => localStorage.setItem('ngg_nivel', n), process.argv[5]);
await ir('Basket', { jugador: 'sophie' });
t0 = Date.now();
let foto = 0, ultimo = '';
while (Date.now() - t0 < 300000) {
  const s = await st();
  if (s.fase === 'fin') break;
  if (s.puntos !== ultimo) { ultimo = s.puntos; console.log(`${s.reloj}s ${s.puntos}`); if (foto < 6) await p.screenshot({ path: `${out}/partido_${++foto}.png` }); }
  await bot(s);
}
await mover(0, 0);
const e2 = await st();
check(e2.fase === 'fin', `el partido termina a los ${e2.reloj}s: ${e2.puntos}`);
console.log('números:', JSON.stringify(await p.evaluate(() => window.game.scene.getScene('Basket').stats)));
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/tabla.png` });
console.log(logs.length ? logs.join('\n') : 'sin errores en consola');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
