// Los lotes B7, E4, D3 y rayo_cielo en el juego: las 8 canchas a 800 (a 640 y a 780, sin acercamiento y centradas),
// la moto a escala de atleta, la jabalina del Catatumbo con rayo_cielo, la técnica de cada equipo, la atrapada del
// Quemado, la arena del Vóley y el salto que esquiva la moto.
//   node scripts/prueba-b7e4d3.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/b7e4d3';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
let fallas = 0;
const logs = [];
const check = (ok, s, extra = '') => { if (!ok) fallas++; console.log(`${ok ? 'ok   ' : 'FALLA'} ${s} ${extra}`); };

async function abrir(w, h, tactil = false) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: tactil, isMobile: tactil, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
  await p.goto(url);
  await p.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Title'), null, { timeout: 90000 });
  await p.mouse.click(w / 2, h / 2);
  await p.waitForTimeout(300);
  return { p, ctx };
}
const ir = (p, e, d) => p.evaluate(([e, d]) => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start(e, d); }, [e, d]);
const muestras = async (p, f, n, a) => { const r = []; for (let i = 0; i < n; i++) { r.push(await p.evaluate(f, a)); await p.waitForTimeout(50); } return r; };

// 1) las 8 canchas, a 640 y a 780
const CANCHAS = [['Voley', 1.15], ['Tenis', 1.15], ['DaCau', 1.15], ['Basket', 1], ['Futbol', 1], ['Quemado', 1], ['Tejo', 1], ['Tamawari', 1.3]];
for (const [w, h, n] of [[1280, 720, '640'], [844, 390, '780']]) {
  const { p, ctx } = await abrir(w, h);
  for (const [e, zoom] of CANCHAS) {
    await ir(p, e, { jugador: 'sophie' });
    await p.waitForTimeout(4500);
    const c = await p.evaluate((e) => { const s = window.game.scene.getScene(e); const c = s.cameras.main; return { W: window.game.scale.gameSize.width, zoom: c.zoom, x0: Math.round(c.worldView.x), x1: Math.round(c.worldView.right), margen: s.arteFondo?.margen ?? null }; }, e);
    console.log(`  ${e} a ${n}: zoom ${c.zoom.toFixed(3)} ve de ${c.x0} a ${c.x1} (margen ${c.margen})`);
    check(Math.abs(c.zoom - zoom) < 0.01, `${e} a ${n}: sin acercamiento`);
    check(c.margen === 80 && c.x0 >= -81 && c.x1 <= 721, `${e} a ${n}: dentro del arte de 800`);
    // las que no siguen la pelota quedan centradas en la cancha de 640
    if (!['Voley', 'Tenis', 'DaCau', 'Tamawari'].includes(e)) check(Math.abs((c.x0 + c.x1) / 2 - 320) <= 2, `${e} a ${n}: centrada`);
    await p.screenshot({ path: `${out}/cancha_${e}_${n}.png` });
  }
  await ctx.close();
}

const { p } = await abrir(1280, 720);

// 2) la moto a escala de atleta, el atropello por la huella y el salto que la esquiva
await ir(p, 'CrossCountry', { jugador: 'sophie', tramo: 0 });
await p.waitForFunction(() => window.game.scene.getScene('CrossCountry')?.fase === 'juego', null, { timeout: 40000 }).catch(() => {});
let moto = null;
for (let i = 0; i < 40 && !moto; i++) { await p.waitForTimeout(400); moto = await p.evaluate(() => { const s = window.game.scene.getScene('CrossCountry'); const m = s.vehiculos.find((v) => v.spr); return m ? { id: m.id, esc: m.spr.scaleX, huella: m.huella, alto: m.spr.displayHeight } : null; }); }
check(moto && moto.esc === 1 && moto.huella.w === 52, 'cross: la moto va a escala 1 con la huella de 52', JSON.stringify(moto));
// alguien en el carril de al lado: pasa rozando y salta
await p.evaluate(() => { const s = window.game.scene.getScene('CrossCountry'); const m = s.vehiculos.find((v) => v.spr); const r = s.gente2[0]; r.a.human = false; r.a.x = m.x - 30; r.a.y = m.y + m.huella.d / 2 + 10; r.a.setSt('idle', 'idle'); });
const salto = await muestras(p, () => { const s = window.game.scene.getScene('CrossCountry'); const a = s.gente2[0].a; return { an: a.fig.anim.name, y: Math.round(a.y), st: a.st }; }, 16);
console.log('  esquiva:', salto.map((q) => `${q.an} y${q.y}`).join(' | '));
check(salto.some((q) => q.an === 'traffic_dodge'), 'cross: la moto pasa rozando y salta de lado (traffic_dodge)');
await p.screenshot({ path: `${out}/moto_y_atleta.png` });

// 3) la jabalina del Catatumbo con rayo_cielo en la punta
await ir(p, 'Jabalina', { jugador: 'sophie' });
await p.waitForFunction(() => { const s = window.game.scene.getScene('Jabalina'); return s?.fase === 'juego' && s.st === 'carrera' && s.cur?.c.human; }, null, { timeout: 40000 }).catch(() => {});
await p.evaluate(() => { const s = window.game.scene.getScene('Jabalina'); s.catatumbo = true; s.x = 300; s.v = 260; s.ang = 40; s.lanza(); });
const verRayo = () => { const s = window.game.scene.getScene('Jabalina'); const r = s.rayo; return { f: s.cur.fig.anim.frame, rayo: r ? r.s.frame.name : null, tex: r?.s.texture.key, ang: r?.s.angle ?? 0, vuela: !!s.vuelo }; };
const lanza = await muestras(p, verRayo, 6);
await p.screenshot({ path: `${out}/jabalina_rayo_carga.png` });
lanza.push(...(await muestras(p, verRayo, 8)));
console.log('  rayo:', lanza.map((q) => `${q.f}:${q.rayo ?? '-'}${q.vuela ? ' vuela' : ''}`).join(' | '));
check(lanza.some((q) => q.tex === 'fx_rayo_cielo' && q.ang === 0), 'jabalina: rayo_cielo derecho, sin girar');
check(lanza.some((q) => q.rayo !== null && Number(q.rayo) >= 3 && Number(q.rayo) <= 6 && !q.vuela), 'jabalina: carga repitiendo del 3 al 6');
await p.waitForTimeout(100);
await p.screenshot({ path: `${out}/jabalina_rayo.png` });

// 4) la técnica de cada equipo
const equipos = await p.evaluate(() => { const m = window.game.cache.json.get('manifest'); const r = {}; for (const [id, a] of Object.entries(m.atletas)) if (a.equipo && !r[a.equipo]) r[a.equipo] = id; return r; });
for (const [eq, id] of Object.entries(equipos)) {
  const rival = eq === 'instituto_nekketsu' ? 'rick' : 'kenji';
  await ir(p, 'Fight', { modo: '1v1', jugador: id, rival });
  await p.waitForFunction(() => window.game.scene.getScene('Fight')?.phase === 'play', null, { timeout: 40000 }).catch(() => {});
  await p.evaluate(() => { const f = window.game.scene.getScene('Fight'); f.brains.clear(); const [a, r] = f.actors; a.x = 260; r.x = 330; a.y = r.y = 50; a.left = false; r.left = true; a.setSt('idle', 'idle'); r.setSt('idle', 'idle'); a.meter = 100; f.special(a); });
  await p.waitForFunction(() => window.game.scene.getScene('Fight').cut <= 0, null, { timeout: 5000 }).catch(() => {});
  const hp0 = await p.evaluate(() => window.game.scene.getScene('Fight').actors[1].hp);
  const verTec = () => { const f = window.game.scene.getScene('Fight'); const [a, r] = f.actors; return { an: a.fig.anim.name, f: a.fig.anim.frame, r: r.fig.anim.name, st: r.st, arma: !!f.tecArma?.visible, hp: r.hp, items: f.items.filter((i) => i.st === 'flying').length }; };
  const m = await muestras(p, verTec, 7);
  await p.screenshot({ path: `${out}/tecnica_${eq}_golpe.png` });
  m.push(...(await muestras(p, verTec, 15)));
  console.log(`  ${eq} (${id}):`, m.filter((_, i) => i % 3 === 0).map((q) => `${q.an}:${q.f}${q.arma ? ' arma' : ''}${q.items ? ` vuela${q.items}` : ''}/${q.r}`).join(' | '));
  check(m.some((q) => q.an === `tecnica_${eq}`), `${eq}: usa tecnica_${eq}`);
  check(m.some((q) => q.hp < hp0) || m.some((q) => q.items > 0), `${eq}: pega o lanza`, `vida ${hp0} → ${m.at(-1).hp}`);
  if (eq === 'rolos_de_chapinero') check(m.some((q) => q.r === 'bike_charged'), 'rolos: el rival con bike_charged');
  if (['maracuchos_del_lago', 'panas_de_caracas', 'rong_sai_gon', 'familia_gg'].includes(eq)) check(m.some((q) => q.arma), `${eq}: el arma en la mano`);
  await p.evaluate(() => {});
  await p.screenshot({ path: `${out}/tecnica_${eq}.png` });
}

// 5) la atrapada del Quemado y la arena del Vóley
await ir(p, 'Quemado', { jugador: 'sophie' });
await p.waitForFunction(() => window.game.scene.getScene('Quemado')?.fase === 'juego', null, { timeout: 40000 }).catch(() => {});
await p.evaluate(() => { const s = window.game.scene.getScene('Quemado'); const j = s.js.find((x) => x.team === 0 && x.dentro); s.atrapar(j); });
let q = await muestras(p, () => window.game.scene.getScene('Quemado').js.find((x) => x.team === 0 && x.dentro).fig.anim.name, 3);
check(q.includes('dodge_catch'), 'quemado: la atrapada es dodge_catch', q.join(','));
await ir(p, 'Voley', { jugador: 'sophie' });
await p.waitForFunction(() => window.game.scene.getScene('Voley')?.fase === 'juego', null, { timeout: 40000 }).catch(() => {});
// que saque el rival: con el balón en la mano no se camina
await p.evaluate(() => { const s = window.game.scene.getScene('Voley'); s.alSaque(1); });
await p.waitForTimeout(200);
await p.keyboard.down('Shift'); await p.keyboard.down('ArrowLeft');
q = await muestras(p, () => window.game.scene.getScene('Voley').pat.find((x) => x.c.human).fig.anim.name, 10);
await p.keyboard.up('ArrowLeft'); await p.keyboard.up('Shift');
check(q.includes('beach_run'), 'vóley: corre en la arena con beach_run', [...new Set(q)].join(','));

console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
