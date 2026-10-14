// Vóley Playa: el entrenamiento jugado con el teclado por un bot sencillo (ir al círculo, pasarla con puño a la
// altura de los brazos, levantarla con patada y rematar saltando cerca de la red), y un partido completo con la
// máquina de los dos lados.
//   node scripts/prueba-voley.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/voley';
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
await ir('Voley', { jugador: 'alana', practica: true });
await p.waitForFunction(() => window.game.scene.getScene('Voley').coach, null, { timeout: 20000 });
const st = () => p.evaluate(() => {
  const s = window.game.scene.getScene('Voley'); const me = s.pat[0]; const c = s.bola;
  return { paso: s.coach?.i ?? -1, fase: s.fase, x: me.x, z: me.z, aire: me.st === 'aire', c: { en: c.en, x: c.x, z: c.z, vz: c.vz }, xl: s.caida(), m: s.marcador.join('-'), pasadas: s.pasadas, chilenas: s.remates, ultimo: c.ultimoTiro };
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
  // en el paso del remate: primero la levanta con patada, después salta cerca de la red y le da con puño
  const chilena = s.paso === 3;
  if (s.c.en === 'aire' && s.xl < 320) {
    const meta = chilena && s.ultimo === 'pase' ? s.xl + 4 : s.xl - 6;
    await tecla('ArrowRight', s.x < meta - 4);
    await tecla('ArrowLeft', s.x > meta + 4);
    const dx = Math.abs(s.c.x - s.x), alto = s.c.z - s.z;
    if (chilena && s.ultimo === 'pase' && dx < 26 && s.c.vz < 0 && s.c.z < 112 && s.c.z > 76 && !s.aire) await toque('l');
    else if (s.aire && dx < 26 && alto < 80 && alto > 4) await toque('j');
    else if (dx < 22 && alto > 22 && alto < 54 && s.c.vz < 0) await toque(chilena && s.ultimo !== 'pase' && pase++ < 50 ? 'k' : 'j');
  } else { await tecla('ArrowRight', false); await tecla('ArrowLeft', false); }
  await p.waitForTimeout(25);
}
for (const k of [...abajo]) await tecla(k, false);
const fin = await st();
check(fin.fase === 'fin', `el entrenamiento se termina (paso ${fin.paso}, ${fin.pasadas} pasadas, ${fin.chilenas} remates, ${fin.m})`);
await p.screenshot({ path: `${out}/entrenamiento_fin.png` });

// la jugada de 3 toques en un partido: recibes con patada (al compañero), él te la arma junto a la red y rematas
await ir('Voley', { jugador: 'rick' });
await p.waitForFunction(() => window.game.scene.getScene('Voley').fase === 'juego', null, { timeout: 20000 });
const st2 = () => p.evaluate(() => {
  const s = window.game.scene.getScene('Voley'); const me = s.pat[0]; const c = s.bola;
  return { x: me.x, z: me.z, aire: me.st === 'aire', c: { en: c.en, x: c.x, z: c.z, vz: c.vz, lado: c.lado, toques: c.toques }, xl: s.caida(), m: s.marcador.join('-'), quien: c.ultimo ? (c.ultimo === me ? 'yo' : c.ultimo.c.team === 0 ? 'compa' : 'rival') : '', tiro: c.ultimoTiro, n: c.n, mano: c.en === 'mano' && c.dueño === me };
});
const jugadas = [];
let previo = '';
const t2 = Date.now();
while (Date.now() - t2 < 90000) {
  const s = await st2();
  const marca = `${s.n}:${s.quien}:${s.tiro}`;
  if (marca !== previo && s.quien) { jugadas.push(`${s.quien}-${s.tiro}`); previo = marca; }
  if (s.mano) { await toque('j'); await p.waitForTimeout(300); continue; }
  if (s.c.en === 'aire' && s.xl < 320) {
    const armada = s.quien === 'compa' && s.tiro === 'pase';
    const meta = armada ? s.xl + 4 : s.xl - 6;
    await tecla('ArrowRight', s.x < meta - 4);
    await tecla('ArrowLeft', s.x > meta + 4);
    const dx = Math.abs(s.c.x - s.x), alto = s.c.z - s.z;
    if (armada && dx < 30 && s.c.vz < 0 && s.c.z < 112 && s.c.z > 70 && !s.aire) await toque('l');
    else if (s.aire && dx < 30 && alto < 80 && alto > 4) await toque('j');
    else if (s.quien !== 'yo' && !armada && dx < 22 && alto > 22 && alto < 54 && s.c.vz < 0) await toque('k');
  } else { await tecla('ArrowRight', false); await tecla('ArrowLeft', false); }
  if (jugadas.join(',').includes('yo-pase,compa-pase,yo-remate')) break;
  await p.waitForTimeout(25);
}
for (const k of [...abajo]) await tecla(k, false);
const seq = jugadas.join(',');
console.log('toques:', seq.slice(-300));
check(seq.includes('yo-pase,compa-pase'), 'el compañero recibe tu pase y te la arma');
check(seq.includes('yo-pase,compa-pase,yo-remate'), 'la jugada de 3 toques termina en tu remate');
await p.screenshot({ path: `${out}/tres_toques.png` });

// el remate de fuego: con la barra llena, especial
await p.evaluate(() => { const s = window.game.scene.getScene('Voley'); s.nek[0] = 100; });
const t3 = Date.now();
let fuego = false;
while (Date.now() - t3 < 40000 && !fuego) {
  const s = await st2();
  if (s.tiro === 'fuego' && s.quien === 'yo') { fuego = true; break; }
  if (s.mano) { await toque('j'); await p.waitForTimeout(300); continue; }
  if (s.c.en === 'aire' && s.xl < 320) {
    await tecla('ArrowRight', s.x < s.xl - 10); await tecla('ArrowLeft', s.x > s.xl - 2);
    const dx = Math.abs(s.c.x - s.x), alto = s.c.z - s.z;
    if (s.quien !== 'yo' && dx < 22 && alto > 22 && alto < 54 && s.c.vz < 0) await toque('u');
  } else { await tecla('ArrowRight', false); await tecla('ArrowLeft', false); }
  await p.waitForTimeout(25);
}
for (const k of [...abajo]) await tecla(k, false);
await p.waitForTimeout(400);
await p.screenshot({ path: `${out}/fuego.png` });
check(fuego, 'el remate de fuego sale con especial');

// un partido con la máquina de los dos lados, hasta el final
await ir('Voley', { jugador: 'sophie' });
await p.waitForFunction(() => window.game.scene.getScene('Voley').fase === 'juego', null, { timeout: 20000 });
await p.evaluate(() => { window.game.scene.getScene('Voley').pat[0].c.human = false; });
const t1 = Date.now();
let e;
while (Date.now() - t1 < 240000) {
  await p.waitForTimeout(3000);
  e = await p.evaluate(() => { const s = window.game.scene.getScene('Voley'); return { t: s.clock, fase: s.fase, m: s.marcador.join('-') }; });
  if (e.fase === 'fin') break;
}
await p.waitForTimeout(2500);
await p.screenshot({ path: `${out}/partido_fin.png` });
check(e.fase === 'fin', `el partido termina (${e.m} en ${e.t.toFixed(0)} s)`);
console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
