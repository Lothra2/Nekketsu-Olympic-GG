// Tenis de dobles en vertical: el entrenamiento jugado con el teclado por un bot sencillo (ir a donde pica, pegarle a
// la cintura, el smash cerca de la red y ganarle un punto a Kenji), y un partido completo con la máquina de los dos
// lados, en el que nadie le pega dos veces seguidas del mismo lado.
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
const ir = (escena, d) => p.evaluate(([e, d]) => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start(e, d); }, [escena, d]);

// el entrenamiento
await ir('Tenis', { jugador: 'alana', practica: true });
await p.waitForFunction(() => window.game.scene.getScene('Tenis').coach, null, { timeout: 20000 });
const st = () => p.evaluate(() => {
  const s = window.game.scene.getScene('Tenis'); const me = s.pat[0]; const c = s.bola;
  const g = s.caida(true), g0 = s.caida(false);
  return { g0, paso: s.coach?.i ?? -1, fase: s.fase, x: me.x, d: me.d, z: me.z, aire: me.st === 'aire', c: { en: c.en, x: c.x, d: c.d, z: c.z, vz: c.vz, botes: c.botes, lado: c.lado }, g, m: s.marcador.join('-'), pasadas: s.pasadas, smash: s.remates, ultimo: c.ultimoTiro };
});
const abajo = new Set();
const tecla = async (k, on) => { if (on && !abajo.has(k)) { await p.keyboard.down(k); abajo.add(k); } if (!on && abajo.has(k)) { await p.keyboard.up(k); abajo.delete(k); } };
const toque = async (k) => { await p.keyboard.down(k); await p.waitForTimeout(40); await p.keyboard.up(k); };
let pasoVisto = -1;
const t0 = Date.now();
while (Date.now() - t0 < 150000) {
  const s = await st();
  if (s.paso !== pasoVisto) { console.log(`paso ${s.paso} (${((Date.now() - t0) / 1000).toFixed(0)} s) pasadas ${s.pasadas} smash ${s.smash} ${s.m}`); pasoVisto = s.paso; await p.screenshot({ path: `${out}/paso_${s.paso}.png` }); }
  if (s.fase === 'fin') break;
  const smash = s.paso === 3;
  const viene = s.c.en === 'aire' && s.c.lado !== 0 && s.g.d < 200;
  if (viene) {
    // en el paso del smash espera cerca de la red; si no, a donde conviene pegarle (un pelito atrás de donde pica)
    const meta = smash ? { x: s.g0.x, d: Math.min(s.g0.d, 150) + 12 } : { x: s.g.x - 8, d: s.g.d - 16 };
    await tecla('ArrowRight', s.x < meta.x - 4);
    await tecla('ArrowLeft', s.x > meta.x + 4);
    await tecla('ArrowUp', s.d < meta.d - 5);
    await tecla('ArrowDown', s.d > meta.d + 5);
    const dx = Math.abs(s.c.x - s.x), dd = Math.abs(s.c.d - s.d), alto = s.c.z - s.z;
    if (smash && dx < 24 && dd < 34 && alto > 38 && alto < 80 && s.c.vz < 0) await toque('j');
    else if (!smash && dx < 24 && dd < 30 && alto > 10 && alto < 48 && (s.c.vz < 0 || s.c.botes > 0)) await toque('j');
  } else for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']) await tecla(k, false);
  await p.waitForTimeout(25);
}
for (const k of [...abajo]) await tecla(k, false);
const fin = await st();
check(fin.fase === 'fin', `el entrenamiento se termina (paso ${fin.paso}, ${fin.pasadas} pasadas, ${fin.smash} smash, ${fin.m})`);
await p.screenshot({ path: `${out}/entrenamiento_fin.png` });

// un partido con la máquina de los dos lados, hasta el final: un solo golpe por lado
await ir('Tenis', { jugador: 'sophie' });
await p.waitForFunction(() => window.game.scene.getScene('Tenis').fase === 'juego', null, { timeout: 20000 });
await p.evaluate(() => {
  const s = window.game.scene.getScene('Tenis');
  s.pat[0].c.human = false;
  window.__golpes = []; window.__dobles = 0; window.__afuera = 0; window.__puntos = 0;
  const orig = s.tocar.bind(s);
  s.tocar = (q, quiere, malo) => { const n = s.bola.n; orig(q, quiere, malo); if (s.bola.n !== n) { const g = window.__golpes; if (g.length && g[g.length - 1] === q.c.team && s.bola.ultimoTiro !== 'saque') window.__dobles++; g.push(q.c.team); } };
  const pu = s.punto.bind(s);
  s.punto = (t, m) => { window.__puntos++; if (m === '¡AFUERA!') window.__afuera++; window.__golpes = []; pu(t, m); };
});
const t1 = Date.now();
let e;
while (Date.now() - t1 < 240000) {
  await p.waitForTimeout(3000);
  e = await p.evaluate(() => { const s = window.game.scene.getScene('Tenis'); return { t: s.clock, fase: s.fase, m: s.marcador.join('-'), dobles: window.__dobles, afuera: window.__afuera, puntos: window.__puntos }; });
  if (e.fase === 'fin') break;
}
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/partido_fin.png` });
check(e.fase === 'fin', `el partido termina (${e.m} en ${e.t.toFixed(0)} s)`);
check(e.dobles === 0, `nadie le pega dos veces seguidas del mismo lado (${e.dobles})`);
check(e.afuera <= e.puntos * 0.6, `la máquina no tira casi todo afuera (${e.afuera} de ${e.puntos} puntos)`);
console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
