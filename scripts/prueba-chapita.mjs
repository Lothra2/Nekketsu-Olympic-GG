// Chapita: el entrenamiento con un bot (batear, mandarla alta, batear curvas y lanzar) y un juego entero de tres
// innings, con el bot bateando con un poco de error y leyendo la curva casi siempre.
//   node scripts/prueba-chapita.mjs [url] [carpeta] [juego] [nivel]   (con "juego" se salta el entrenamiento)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? 'capturas/chapita';
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
  const s = window.game.scene.getScene('Chapita'), c = s.chapa;
  return {
    fase: s.fase, st: s.st, paso: s.paso, bateo: s.bat?.c.human, lanzo: s.pit?.c.human,
    c: { st: c.st, llega: c.st === 'lanzada' ? (c.x - 111) / -c.vx : 99, tipo: c.tipo, x: Math.round(c.x) },
    marcador: s.carreras.join('-'), inning: s.inning, abajo: s.abajo, outs: s.outs, strikes: s.strikes,
    n: { contactos: s.contactos, curvas: s.contactosCurva, mejor: Math.round(s.mejor), lanzadas: s.lanzadas, ponches: s.ponchesTuyos },
  };
});
const toque = async (k) => { await p.keyboard.down(k); await p.waitForTimeout(25); await p.keyboard.up(k); };
let flecha = null, ultimoTiro = -1, decidido = null;
async function sostener(k) {
  if (flecha === k) return;
  if (flecha) await p.keyboard.up(flecha);
  if (k) await p.keyboard.down(k);
  flecha = k;
}
/** el bot: batea un pelito antes (con `error` en segundos) y con la flecha según la curva; lanzando, alterna */
async function bot(s, { error = 0, lee = 1, alta = false } = {}) {
  if (s.fase !== 'juego') return;
  if (s.lanzo && s.st === 'prepara') { await toque(Math.random() < 0.5 ? 'j' : 'k'); return; }
  if (!s.bateo || s.st !== 'vuela' || s.c.st !== 'lanzada') { decidido = null; await sostener(null); return; }
  if (!decidido) {
    const correcta = s.c.tipo === 'sube' ? 'ArrowUp' : s.c.tipo === 'baja' ? 'ArrowDown' : alta ? 'ArrowUp' : null;
    decidido = { flecha: Math.random() < lee ? correcta : (s.c.tipo === 'recta' ? 'ArrowDown' : null), t: 0.235 + (Math.random() * 2 - 1) * error };
  }
  // la curva se ve en la segunda mitad: la flecha se pone al final
  if (s.c.llega < 0.45) await sostener(decidido.flecha);
  if (s.c.llega <= decidido.t && !decidido.hecho) { decidido.hecho = true; await toque('j'); }
}

let t0 = Date.now();
if (process.argv[4] !== 'juego') {
  await ir('Chapita', { jugador: 'sophie', practica: true });
  await p.waitForFunction(() => window.game.scene.getScene('Chapita')?.coach, null, { timeout: 20000 });
  let visto = -1;
  while (Date.now() - t0 < 150000) {
    const s = await st();
    if (s.paso !== visto) { visto = s.paso; console.log(`paso ${s.paso} ${JSON.stringify(s.n)}`); await p.screenshot({ path: `${out}/paso_${s.paso}.png` }); }
    if (s.fase === 'fin') break;
    await bot(s, { alta: s.paso === 1 });
  }
  await sostener(null);
  const e1 = await st();
  check(e1.fase === 'fin', `el entrenamiento se termina (paso ${e1.paso}) ${JSON.stringify(e1.n)}`);
}

if (process.argv[5]) await p.evaluate((n) => localStorage.setItem('ngg_nivel', n), process.argv[5]);
await ir('Chapita', { jugador: 'sophie' });
t0 = Date.now();
let foto = 0, ultimo = '';
while (Date.now() - t0 < 400000) {
  const s = await st();
  if (s.fase === 'fin') break;
  const k = `${s.inning}${s.abajo ? 'b' : 'a'} ${s.marcador} outs ${s.outs}`;
  if (k !== ultimo) { ultimo = k; console.log(k); }
  if (s.st === 'resultado' && s.c.x > 500 && foto < 8 && Math.random() < 0.3) await p.screenshot({ path: `${out}/juego_${++foto}.png` });
  await bot(s, { error: 0.06, lee: 0.75, alta: Math.random() < 0.5 });
}
await sostener(null);
const e2 = await st();
check(e2.fase === 'fin', `el juego termina: ${e2.marcador} en el inning ${e2.inning}`);
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/tabla.png` });
console.log(logs.length ? logs.join('\n') : 'sin errores en consola');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
