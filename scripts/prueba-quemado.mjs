// Quemado: el entrenamiento con un bot (agarrar, quemar a Kenji, atrapar, esquivar y pasar al cementerio) y un
// partido 4 contra 4 entero con el bot de humano, hasta que un equipo se queda sin nadie adentro.
//   node scripts/prueba-quemado.mjs [url] [carpeta] [partido] [nivel]   (con "partido" se salta el entrenamiento)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? 'capturas/quemado';
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
  const s = window.game.scene.getScene('Quemado');
  const c = s.ctrl, bo = s.bola;
  return {
    fase: s.fase, paso: s.paso, reloj: Math.round(s.clock),
    c: c ? { x: c.x, y: c.y, z: c.z, st: c.st, dentro: c.dentro, id: c.id } : null,
    b: { x: bo.x, y: bo.y, z: bo.z, st: bo.st, mia: bo.dueño === c && !!c, aMi: bo.st === 'tiro' && bo.objetivo === c && !!c, lanzadorTeam: bo.lanzador?.team },
    adentro: [0, 1].map((t) => s.js.filter((j) => j.team === t && j.dentro).map((j) => j.id).join(',')),
    n: { golpes: s.golpesKenji, atrapadas: s.atrapadas, esquivas: s.esquivas, pases: s.pasesFuera },
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
let espera = 0, decidio = null;
/** el bot: busca el balón suelto, lanza (o pasa), y al tiro que le viene lo atrapa o lo salta */
async function bot(s, { atrapa = 0.5, pasa = false, reacciona = 1 } = {}) {
  if (!s.c || s.fase !== 'juego') { await mover(0, 0); return; }
  const { c, b: bo } = s;
  const d = Math.hypot(bo.x - c.x, bo.y - c.y);
  if (bo.aMi && bo.lanzadorTeam === 1) {
    await mover(0, 0);
    // como juega un niño: a veces reacciona bien y a veces no
    if (decidio === null) decidio = Math.random() < reacciona ? (Math.random() < atrapa ? 'k' : 'l') : '';
    if (d < 30 && c.st === 'libre' && decidio) { await toque(decidio); decidio = ''; }
    return;
  }
  decidio = null;
  if (bo.mia) {
    await mover(0, 0);
    if (++espera > 3 && c.st === 'libre') { espera = 0; await toque(pasa ? 'k' : 'j'); }
    return;
  }
  if (bo.st === 'suelta') await mover(bo.x - c.x, bo.y - c.y);
  else await mover(0, 0);
}

// 1. el entrenamiento
let t0 = Date.now();
if (process.argv[4] !== 'partido') {
await ir('Quemado', { jugador: 'sophie', practica: true });
await p.waitForFunction(() => window.game.scene.getScene('Quemado')?.coach, null, { timeout: 20000 });
let visto = -1;
t0 = Date.now();
while (Date.now() - t0 < 150000) {
  const s = await st();
  if (s.paso !== visto) { visto = s.paso; console.log(`paso ${s.paso} ${JSON.stringify(s.n)}`); await p.screenshot({ path: `${out}/paso_${s.paso}.png` }); }
  if (s.fase === 'fin') break;
  await bot(s, { atrapa: s.paso === 2 ? 1 : 0, pasa: s.paso === 4 });
}
await mover(0, 0);
const e1 = await st();
check(e1.fase === 'fin', `el entrenamiento se termina (paso ${e1.paso}) ${JSON.stringify(e1.n)}`);
}

// 2. un partido entero (en el nivel que se pida)
if (process.argv[5]) await p.evaluate((n) => localStorage.setItem('ngg_nivel', n), process.argv[5]);
await ir('Quemado', { jugador: 'sophie' });
t0 = Date.now();
let foto = 0, ultimo = '';
while (Date.now() - t0 < 300000) {
  const s = await st();
  if (s.fase === 'fin') break;
  const ad = s.adentro.join(' | ');
  if (ad !== ultimo) { ultimo = ad; console.log(`${s.reloj}s adentro: ${ad}`); if (foto < 8) await p.screenshot({ path: `${out}/partido_${++foto}.png` }); }
  await bot(s, { reacciona: 0.5 });
}
await mover(0, 0);
const e2 = await st();
check(e2.fase === 'fin', `el partido termina a los ${e2.reloj}s: ${e2.adentro.join(' | ')}`);
console.log('números:', JSON.stringify(await p.evaluate(() => window.game.scene.getScene('Quemado').stats)));
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/tabla.png` });
console.log(logs.length ? logs.join('\n') : 'sin errores en consola');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
