// Đá cầu: el entrenamiento jugado con el teclado por un bot sencillo (ir al círculo, patear a media pierna,
// levantarla con puño y hacer la chilena cerca de la red), y después un partido completo con la máquina de los dos lados.
//   node scripts/prueba-dacau.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/dacau';
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
await ir('DaCau', { jugador: 'alana', practica: true });
await p.waitForFunction(() => window.game.scene.getScene('DaCau').coach, null, { timeout: 20000 });
const st = () => p.evaluate(() => {
  const s = window.game.scene.getScene('DaCau'); const me = s.pat[0]; const c = s.cau;
  return { paso: s.coach?.i ?? -1, fase: s.fase, x: me.x, z: me.z, aire: me.st === 'aire', c: { en: c.en, x: c.x, z: c.z, vz: c.vz }, xl: s.caida(), m: s.marcador.join('-'), pasadas: s.pasadas, chilenas: s.chilenas, ultimo: c.ultimoTiro };
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
  // en el paso de la chilena: primero la levanta con puño, después salta cerca de la red
  const chilena = s.paso === 3;
  if (s.c.en === 'aire' && s.xl < 320) {
    const meta = chilena && s.ultimo === 'pase' ? s.xl + 4 : s.xl - 6;
    await tecla('ArrowRight', s.x < meta - 4);
    await tecla('ArrowLeft', s.x > meta + 4);
    const dx = Math.abs(s.c.x - s.x), alto = s.c.z - s.z;
    if (chilena && s.ultimo === 'pase' && dx < 26 && s.c.vz < 0 && s.c.z < 75 && s.c.z > 40 && !s.aire) await toque('l');
    else if (s.aire && dx < 26 && alto < 48 && alto > -2) await toque('k');
    else if (dx < 22 && alto > 10 && alto < 32 && s.c.vz < 0) await toque(chilena && s.ultimo !== 'pase' && pase++ < 50 ? 'j' : 'k');
  } else { await tecla('ArrowRight', false); await tecla('ArrowLeft', false); }
  await p.waitForTimeout(25);
}
for (const k of [...abajo]) await tecla(k, false);
const fin = await st();
check(fin.fase === 'fin', `el entrenamiento se termina (paso ${fin.paso}, ${fin.pasadas} pasadas, ${fin.chilenas} chilenas, ${fin.m})`);
await p.screenshot({ path: `${out}/entrenamiento_fin.png` });

// un partido con la máquina de los dos lados, hasta el final
await ir('DaCau', { jugador: 'sophie' });
await p.waitForFunction(() => window.game.scene.getScene('DaCau').fase === 'juego', null, { timeout: 20000 });
await p.evaluate(() => { window.game.scene.getScene('DaCau').pat[0].c.human = false; });
const t1 = Date.now();
let e;
while (Date.now() - t1 < 240000) {
  await p.waitForTimeout(3000);
  e = await p.evaluate(() => { const s = window.game.scene.getScene('DaCau'); return { t: s.clock, fase: s.fase, m: s.marcador.join('-') }; });
  if (e.fase === 'fin') break;
}
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/partido_fin.png` });
check(e.fase === 'fin', `el partido termina (${e.m} en ${e.t.toFixed(0)} s)`);
console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
