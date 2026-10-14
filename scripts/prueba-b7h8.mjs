// Los súper golpes del lote B7H8 en el juego: la clavada grande que rompe el tablero en el impacto, la tacleada en
// plancha, el remate de fuego con la pelota colgada hasta el impacto, el dominio y las chilenas del đá cầu, el
// batazo Nekketsu girado y el lanzamiento de lado de la Chapita, la lanza del Catatumbo, el tiro y el balonazo del
// Quemado, la tijera del vovinam en el judo y los tres ambientes nuevos.
//   node scripts/prueba-b7h8.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/b7h8';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
p.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await p.goto(url);
await p.waitForFunction(() => window.game?.scene.isActive('Tap'), null, { timeout: 90000 });
await p.mouse.click(400, 200);
for (let i = 0; i < 20 && !(await p.evaluate(() => window.game.scene.isActive('Title'))); i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(500); }
let fallas = 0;
const check = (ok, s, extra = '') => { if (!ok) fallas++; console.log(`${ok ? 'ok   ' : 'FALLA'} ${s} ${extra}`); };
const ir = (e, d) => p.evaluate(([e, d]) => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start(e, d); }, [e, d]);
const ev = (f, a) => p.evaluate(f, a);
const shot = (n) => p.screenshot({ path: `${out}/${n}.png` });
const juego = (e) => p.waitForFunction((e) => window.game.scene.getScene(e)?.fase === 'juego', e, { timeout: 40000 }).then(() => true, () => false);
/** Muestras cada 50 ms de lo que devuelve f. */
const muestras = async (f, n, a) => { const r = []; for (let i = 0; i < n; i++) { r.push(await ev(f, a)); await p.waitForTimeout(50); } return r; };
const ambiente = (e) => ev((e) => (window.game.scene.getScene(e)?.ambienteSonando?.key ?? '').replace(/^amb_/, ''), e);

// 1) básquet: la clavada grande y la tacleada en plancha
await ir('Basket', { jugador: 'sophie' });
check(await juego('Basket'), 'básquet: arranca');
await ev(() => { const s = window.game.scene.getScene('Basket'); const j = s.js[0]; s.pausa = 0; s.bola.dueño = j; s.bola.tiro = null; j.st = 'libre'; j.z = 0; j.x = 530; j.y = 52; s.nek[0] = 100; s.clavar(j, true); });
let m = await muestras(() => { const s = window.game.scene.getScene('Basket'); return { a: s.js[0].fig.anim.name, f: s.js[0].fig.anim.frame, roto: s.roto > 0, tiro: !!s.bola.tiro }; }, 14);
console.log('  clavada:', m.map((q) => `${q.a}:${q.f}${q.roto ? ' ROTO' : ''}${q.tiro ? '' : ' (resuelto)'}`).join(' | '));
check(m.some((q) => q.a === 'dunk_big'), 'básquet: la clavada Nekketsu es dunk_big');
check(m.some((q) => q.roto && q.tiro), 'básquet: el tablero se rompe en el impacto, antes de que caiga el balón');
await shot('basket_clavada');
await p.waitForTimeout(1800);
await ev(() => { const s = window.game.scene.getScene('Basket'); s.pausa = 0; const j = s.js[0]; const o = s.js.find((x) => x.team === 1); j.st = o.st = 'libre'; j.z = o.z = 0; j.x = 300; j.y = o.y = 60; o.x = 350; s.bola.dueño = o; s.bola.tiro = null; s.nek[0] = 100; s.tacleada(j, o); });
m = await muestras(() => { const s = window.game.scene.getScene('Basket'); const o = s.js.find((x) => x.team === 1); return { a: s.js[0].fig.anim.name, f: s.js[0].fig.anim.frame, o: o.st, mia: s.bola.dueño === s.js[0] }; }, 12);
console.log('  tacleada:', m.map((q) => `${q.a}:${q.f} rival ${q.o}${q.mia ? ' MÍA' : ''}`).join(' | '));
check(m.filter((q) => q.a === 'tackle_nekketsu').length >= 3, 'básquet: la tacleada en plancha se ve varios cuadros (antes la pisaba el puño)');
check(m.some((q) => q.o === 'caido' && q.mia), 'básquet: el rival cae y te quedas el balón');
await shot('basket_tacleada');

// 2) vóley: el remate de fuego con la pelota colgada hasta el impacto
await ir('Voley', { jugador: 'sophie' });
check(await juego('Voley'), 'vóley: arranca');
await ev(() => { const s = window.game.scene.getScene('Voley'); const q = s.pat.find((x) => x.c.human); const c = s.bola; s.pausaT = 0; c.en = 'aire'; c.dueño = null; c.lado = 0; c.toques = 0; c.x = q.x + 6; c.z = 46; c.vx = 0; c.vz = 0; q.golpeT = 0; q.st = 'piso'; q.z = 0; s.nek[0] = 100; s.tocar(q, 'fuego'); });
m = await muestras(() => { const s = window.game.scene.getScene('Voley'); const q = s.pat.find((x) => x.c.human); return { a: q.fig.anim.name, f: q.fig.anim.frame, colgada: !!s.fuegoPend, vx: Math.round(s.bola.vx), z: Math.round(q.z) }; }, 16);
console.log('  remate:', m.map((q) => `${q.a}:${q.f}${q.colgada ? ' colgada' : ` vx${q.vx}`} z${q.z}`).join(' | '));
check(m.some((q) => q.a === 'spike_fuego' && q.colgada), 'vóley: spike_fuego con la pelota colgada en el aire');
check(m.some((q, i) => i > 0 && m[i - 1].colgada && !q.colgada && q.vx !== 0), 'vóley: la pelota sale disparada en el impacto');
await shot('voley_fuego');

// 3) đá cầu: el dominio antes del saque, el ambiente del parque, y la chilena Nekketsu
await ir('DaCau', { jugador: 'sophie' });
check(await juego('DaCau'), 'đá cầu: arranca');
await p.waitForTimeout(600);
m = await muestras(() => { const s = window.game.scene.getScene('DaCau'); const q = s.cau.dueño; return { a: q?.fig.anim.name, z: Math.round(s.cau.z), h: !!q?.c.human }; }, 10);
console.log('  dominio:', m.map((q) => `${q.a} z${q.z}`).join(' | '));
check(m.some((q) => q.a === 'shuttle_juggle') && new Set(m.map((q) => q.z)).size > 3, 'đá cầu: domina el cầu antes de sacar y el cầu sube y baja');
await shot('dacau_dominio');
check((await ambiente('DaCau')) === 'parque_tao_dan', 'đá cầu: suena el parque Tao Đàn', await ambiente('DaCau'));
await ev(() => { const s = window.game.scene.getScene('DaCau'); const q = s.pat.find((x) => x.c.human); const c = s.cau; s.pausaT = 0; c.en = 'aire'; c.dueño = null; c.lado = 0; c.toques = 0; c.x = q.x + 8; c.z = 40; c.vx = 0; c.vz = 0; q.golpeT = 0; s.nek[0] = 100; s.tocar(q, 'fuego'); });
m = await muestras(() => { const s = window.game.scene.getScene('DaCau'); const q = s.pat.find((x) => x.c.human); return q.fig.anim.name; }, 4);
check(m.includes('shuttle_kick_back_nekketsu'), 'đá cầu: la chilena Nekketsu de lado', m.join(','));
await shot('dacau_chilena');

// 4) Chapita: el lanzamiento de lado, el batazo Nekketsu con su vuelta espejada y el ambiente del barrio
await ir('Chapita', { jugador: 'sophie' });
check(await juego('Chapita'), 'chapita: arranca');
check((await ambiente('Chapita')) === 'barrio_caracas', 'chapita: suena el barrio de Caracas', await ambiente('Chapita'));
let lanz = [];
for (let i = 0; i < 40 && !lanz.includes('cap_pitch'); i++) { await p.keyboard.press('j'); await p.waitForTimeout(150); lanz.push(await ev(() => window.game.scene.getScene('Chapita').pit?.fig.anim.name)); }
check(lanz.includes('cap_pitch'), 'chapita: el lanzador tira la chapa de lado (cap_pitch)');
await ev(() => { const s = window.game.scene.getScene('Chapita'); s.batear('alta', true); });
m = await muestras(() => { const s = window.game.scene.getScene('Chapita'); const f = s.bat.fig; if (f.anim.name === 'bat_nekketsu') { f.step(0.05); s.pintar(); } return { a: f.anim.name, f: f.anim.frame, g: f.girado, e: f.espejo, palo: s.palo.flipX, ve: s.palo.visible }; }, 16);
console.log('  batazo:', m.map((q) => `${q.a}:${q.f}${q.g ? ' girado' : ''}${q.e ? ' espejo' : ''}${q.palo ? ' palo-espejo' : ''}`).join(' | '));
check(m.some((q) => q.a === 'bat_nekketsu'), 'chapita: el batazo Nekketsu es bat_nekketsu');
check(m.some((q) => q.a === 'bat_nekketsu' && q.g && q.e && q.palo && q.ve), 'chapita: en los cuadros girados se espejan el sprite y el palo');
await shot('chapita_batazo');

// 5) jabalina: la lanza del Catatumbo con el relámpago arriba y la jabalina en la suelta
await ir('Jabalina', { jugador: 'sophie' });
await p.waitForFunction(() => { const s = window.game.scene.getScene('Jabalina'); return s?.fase === 'juego' && s.st === 'carrera' && s.cur?.c.human; }, null, { timeout: 40000 }).catch(() => {});
await ev(() => { const s = window.game.scene.getScene('Jabalina'); s.catatumbo = true; s.x = 300; s.v = 260; s.ang = 40; s.lanza(); });
m = await muestras(() => { const s = window.game.scene.getScene('Jabalina'); const rayo = s.children.list.some((o) => o.texture?.key === 'fx_rayo_catatumbo' && o.active); return { a: s.cur.fig.anim.name, f: s.cur.fig.anim.frame, rayo, vuela: !!s.vuelo }; }, 16);
console.log('  lanza:', m.map((q) => `${q.a}:${q.f}${q.rayo ? ' RAYO' : ''}${q.vuela ? ' vuela' : ''}`).join(' | '));
check(m.some((q) => q.a === 'javelin_rayo'), 'jabalina: la lanza del Catatumbo es javelin_rayo');
check(m.some((q) => q.rayo && !q.vuela), 'jabalina: el relámpago cae con la jabalina en alto, antes de soltarla');
check(m.some((q) => q.vuela), 'jabalina: la jabalina sale en la suelta');
await shot('jabalina_rayo');

// 6) quemado: el tiro y el balonazo
await ir('Quemado', { jugador: 'sophie' });
check(await juego('Quemado'), 'quemado: arranca');
await ev(() => { const s = window.game.scene.getScene('Quemado'); const j = s.js.find((x) => x.team === 0 && x.dentro); s.bola.dueño = j; s.bola.st = 'mano'; j.st = 'libre'; s.lanzar(j, 'normal'); });
m = await muestras(() => window.game.scene.getScene('Quemado').js.find((x) => x.team === 0 && x.dentro).fig.anim.name, 3);
check(m.includes('dodge_throw'), 'quemado: el tiro es dodge_throw', m.join(','));
await ev(() => { const s = window.game.scene.getScene('Quemado'); const j = s.js.find((x) => x.team === 0 && x.dentro); const o = s.js.find((x) => x.team === 1 && x.dentro); s.bola.lanzador = j; s.bola.vx = -200; s.golpe(o); });
m = await muestras(() => window.game.scene.getScene('Quemado').js.find((x) => x.team === 1 && x.st === 'golpe')?.fig.anim.name ?? null, 3);
check(m.includes('dodge_hit'), 'quemado: el balonazo es dodge_hit', m.join(','));
await shot('quemado_balonazo');

// 7) judo: la tijera del vovinam con la barra llena, ippon, y el dojo de Hà Nội
await ir('Fight', { modo: 'judo', jugador: 'rick', rival: 'kenji' });
await p.waitForFunction(() => window.game.scene.getScene('Fight')?.phase === 'play', null, { timeout: 40000 });
check((await ambiente('Fight')) === 'dojo_hanoi', 'judo: suena el dojo de Hà Nội', await ambiente('Fight'));
await ev(() => { const f = window.game.scene.getScene('Fight'); f.brains.clear(); const [a, r] = f.actors; a.x = 280; r.x = 340; a.y = r.y = 50; a.left = false; r.left = true; a.setSt('idle', 'idle'); r.setSt('idle', 'idle'); a.meter = 100; f.special(a); });
await p.waitForFunction(() => window.game.scene.getScene('Fight').cut <= 0, null, { timeout: 5000 }).catch(() => {});
m = await muestras(() => { const f = window.game.scene.getScene('Fight'); const [a, r] = f.actors; return { a: a.fig.anim.name, af: a.fig.anim.frame, r: r.fig.anim.name, rf: r.fig.anim.frame, dx: Math.round(r.x - a.x), pts: f.puntos.join('-') }; }, 18);
console.log('  tijera:', m.map((q) => `${q.a}:${q.af}/${q.r}:${q.rf} dx${q.dx} ${q.pts}`).join(' | '));
check(m.some((q) => q.a === 'vovinam_scissor' && q.r === 'vovinam_scissored' && q.af === q.rf), 'judo: la tijera y su rival en el mismo cuadro');
check(m.some((q) => q.pts === '2-0'), 'judo: la tijera es ippon');
await shot('judo_tijera');

console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
