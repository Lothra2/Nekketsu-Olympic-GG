// Tejo: el entrenamiento con un bot que apunta (al bocín y a una mecha) y un partido entero de tres rondas.
//   node scripts/prueba-tejo.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/tejo';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
p.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await p.goto(url);
await p.waitForFunction(() => window.game?.scene.isActive('Tap'), null, { timeout: 60000 });
await p.mouse.click(400, 200);
let fallas = 0;
const check = (ok, s) => { if (!ok) fallas++; console.log(`${ok ? 'ok   ' : 'FALLA'} ${s}`); };
const ir = (e, d) => p.evaluate(([e, d]) => { const g = window.game; g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key)); g.scene.start(e, d); }, [e, d]);
const st = () => p.evaluate(() => { const s = window.game.scene.getScene('Tejo'); return { estado: s.estado, u: s.u, p: s.p, paso: s.coach?.i ?? -1, fase: s.fase, humano: s.actual?.c.human, m: s.marcador.join('-'), ronda: s.ronda, mechas: s.mechas.map((x) => (x ? 1 : 0)).join('') }; });
const toque = async () => { await p.keyboard.down('k'); await p.waitForTimeout(30); await p.keyboard.up('k'); };

// el entrenamiento: al bocín en los pasos 1, 2 y 4; a la mecha de adelante en el 3
await ir('Tejo', { jugador: 'sophie', practica: true });
await p.waitForFunction(() => window.game.scene.getScene('Tejo').coach, null, { timeout: 20000 });
let visto = -1;
const t0 = Date.now();
while (Date.now() - t0 < 90000) {
  const s = await st();
  if (s.paso !== visto) { visto = s.paso; console.log(`paso ${s.paso}`); await p.screenshot({ path: `${out}/paso_${s.paso}.png` }); }
  if (s.fase === 'fin') break;
  const metaP = s.paso === 2 ? 0.62 - 0.34 / 3.2 : 0.62;
  if (s.estado === 'apunta' && Math.abs(s.u) < 0.04) await toque();
  else if (s.estado === 'fuerza' && Math.abs(s.p - metaP) < 0.015) await toque();
  await p.waitForTimeout(10);
}
const e1 = await st();
check(e1.fase === 'fin', `el entrenamiento se termina (paso ${e1.paso})`);
await p.screenshot({ path: `${out}/entrenamiento_fin.png` });

// un partido: la persona tira con un poco de error
await ir('Tejo', { jugador: 'alana' });
await p.waitForFunction(() => window.game.scene.getScene('Tejo').fase === 'juego', null, { timeout: 20000 });
const t1 = Date.now();
let k = 0;
while (Date.now() - t1 < 180000) {
  const s = await st();
  if (s.fase === 'fin') break;
  if (s.humano && s.estado === 'apunta' && Math.abs(s.u) < 0.15) await toque();
  else if (s.humano && s.estado === 'fuerza' && Math.abs(s.p - 0.62) < 0.05) await toque();
  if (s.estado === 'vuela' && k < 6) { await p.waitForTimeout(700); await p.screenshot({ path: `${out}/tiro_${++k}.png` }); }
  await p.waitForTimeout(15);
}
const e2 = await st();
await p.waitForTimeout(2600);
await p.screenshot({ path: `${out}/partido_fin.png` });
check(e2.fase === 'fin', `el partido termina (${e2.m} en ${((Date.now() - t1) / 1000).toFixed(0)} s)`);
console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
