// Tenis de dobles: el entrenamiento jugado con el teclado por un bot sencillo (ir al círculo, dejarla picar y pegarle
// a la cintura, el smash saltando cerca de la red y ganarle un punto a Kenji), y un partido completo con la máquina
// de los dos lados.
//   node scripts/prueba-tenis.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/tenis';
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
const ir = (escena, d) => p.evaluate(([e, d]) => { const g = window.game; g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key)); g.scene.start(e, d); }, [escena, d]);

// el entrenamiento
await ir('Tenis', { jugador: 'alana', practica: true });
await p.waitForFunction(() => window.game.scene.getScene('Tenis').coach, null, { timeout: 20000 });
const st = () => p.evaluate(() => {
  const s = window.game.scene.getScene('Tenis'); const me = s.pat[0]; const c = s.bola;
  return { paso: s.coach?.i ?? -1, fase: s.fase, x: me.x, z: me.z, aire: me.st === 'aire', c: { en: c.en, x: c.x, z: c.z, vz: c.vz, botes: c.botes }, xl: s.caida(), m: s.marcador.join('-'), pasadas: s.pasadas, chilenas: s.remates, ultimo: c.ultimoTiro };
});
const abajo = new Set();
const tecla = async (k, on) => { if (on && !abajo.has(k)) { await p.keyboard.down(k); abajo.add(k); } if (!on && abajo.has(k)) { await p.keyboard.up(k); abajo.delete(k); } };
const toque = async (k) => { await p.keyboard.down(k); await p.waitForTimeout(40); await p.keyboard.up(k); };
let pasoVisto = -1;
const t0 = Date.now();
let pase = 0;
while (Date.now() - t0 < 120000) {
  const s = await st();
  if (s.paso !== pasoVisto) { console.log(`paso ${s.paso} (${((Date.now() - t0) / 1000).toFixed(0)} s) pasadas ${s.pasadas} chilenas ${s.chilenas} ${s.m}`); pasoVisto = s.paso; await p.screenshot({ path: `${out}/paso_${s.paso}.png` }); }
  if (s.fase === 'fin') break;
  // en el paso del smash: va cerca de la red y salta cuando viene alta
  const chilena = s.paso === 3;
  if (s.c.en === 'aire' && s.xl < 320) {
    const meta = chilena && s.c.botes === 0 && s.c.z > 40 ? 268 : s.xl - 6;
    await tecla('ArrowRight', s.x < meta - 4);
    await tecla('ArrowLeft', s.x > meta + 4);
    const dx = Math.abs(s.c.x - s.x), alto = s.c.z - s.z;
    if (chilena && s.c.botes === 0 && dx < 34 && s.c.vz < 0 && s.c.z < 100 && s.c.z > 60 && !s.aire) await toque('l');
    else if (s.aire && dx < 26 && alto < 76 && alto > 2) await toque('j');
    else if (dx < 22 && alto > 12 && alto < 36 && s.c.vz < 0 && s.c.botes > 0) await toque('j');
  } else { await tecla('ArrowRight', false); await tecla('ArrowLeft', false); }
  await p.waitForTimeout(25);
}
for (const k of [...abajo]) await tecla(k, false);
const fin = await st();
check(fin.fase === 'fin', `el entrenamiento se termina (paso ${fin.paso}, ${fin.pasadas} pasadas, ${fin.chilenas} smash, ${fin.m})`);
await p.screenshot({ path: `${out}/entrenamiento_fin.png` });

// un partido con la máquina de los dos lados, hasta el final
await ir('Tenis', { jugador: 'sophie' });
await p.waitForFunction(() => window.game.scene.getScene('Tenis').fase === 'juego', null, { timeout: 20000 });
await p.evaluate(() => { window.game.scene.getScene('Tenis').pat[0].c.human = false; });
const t1 = Date.now();
let e;
while (Date.now() - t1 < 240000) {
  await p.waitForTimeout(3000);
  e = await p.evaluate(() => { const s = window.game.scene.getScene('Tenis'); return { t: s.clock, fase: s.fase, m: s.marcador.join('-') }; });
  if (e.fase === 'fin') break;
}
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/partido_fin.png` });
check(e.fase === 'fin', `el partido termina (${e.m} en ${e.t.toFixed(0)} s)`);
console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
