// Las animaciones del lote B4B6 y el audio del H7 en el juego: la proyección del judo, el tejo en la mano, la guardia
// y el batazo de la Chapita, la garrocha que no llega, el salto de bolita del Quemado, un ambiente y un acorde.
//   node scripts/prueba-b4b6.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/b4b6';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
p.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await p.goto(url);
await p.waitForFunction(() => window.game?.scene.isActive('Tap'), null, { timeout: 60000 });
await p.mouse.click(400, 200);
for (let i = 0; i < 20 && !(await p.evaluate(() => window.game.scene.isActive('Title'))); i++) { await p.keyboard.press('Enter'); await p.waitForTimeout(500); }
let fallas = 0;
const check = (ok, s, extra = '') => { if (!ok) fallas++; console.log(`${ok ? 'ok   ' : 'FALLA'} ${s} ${extra}`); };
const ir = (e, d) => p.evaluate(([e, d]) => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start(e, d); }, [e, d]);
const ev = (f, a) => p.evaluate(f, a);
const shot = (n) => p.screenshot({ path: `${out}/${n}.png` });

// 1) judo: agarre de solapa y la proyección sincronizada
await ir('Fight', { modo: 'judo', jugador: 'rick', rival: 'kenji' });
await p.waitForFunction(() => window.game.scene.getScene('Fight')?.phase === 'play', null, { timeout: 30000 });
await ev(() => { const f = window.game.scene.getScene('Fight'); f.brains.clear(); const [a, r] = f.actors; a.x = 300; r.x = 318; a.y = r.y = 50; r.setSt('dizzy', 'dizzy'); a.left = false; a.intentaAgarrar(1, true); });
await p.waitForTimeout(500);
let s = await ev(() => { const f = window.game.scene.getScene('Fight'); const [a, r] = f.actors; return { a: a.st, an: a.fig.anim.name, r: r.st, rn: r.fig.anim.name }; });
check(s.an === 'judo_grip' && s.rn === 'judo_grip', 'judo: los dos agarrados de solapa', JSON.stringify(s));
await shot('judo_0_agarre');
await p.keyboard.down('k'); await p.waitForTimeout(40); await p.keyboard.up('k');
const vuelo = [];
for (let i = 0; i < 10; i++) {
  await p.waitForTimeout(70);
  const q = await ev(() => { const f = window.game.scene.getScene('Fight'); const [a, r] = f.actors; return { af: a.fig.anim.frame, an: a.fig.anim.name, rf: r.fig.anim.frame, rn: r.fig.anim.name, rz: Math.round(r.z), detras: r.detras, rd: r.fig.depth < a.fig.depth, pts: f.puntos?.join('-') }; });
  vuelo.push(q);
  if (i === 3 || i === 5) await shot(`judo_${i}_proyeccion`);
}
console.log('  judo:', vuelo.map((q) => `${q.an}:${q.af}/${q.rn}:${q.rf} z${q.rz}${q.detras ? ' detrás' : ''}`).join(' | '));
check(vuelo.some((q) => q.an === 'judo_throw' && q.rn === 'judo_thrown' && q.af === q.rf), 'judo: proyección y proyectado en el mismo cuadro');
check(vuelo.some((q) => q.detras && q.rd && q.rz > 10), 'judo: del 3 al 5 vuela en la carga, detrás');
check(vuelo.some((q) => q.pts && q.pts !== '0-0'), 'judo: la proyección cuenta', vuelo.at(-1).pts);

// 2) tejo: en la mano hasta la suelta
await ir('Tejo', { jugador: 'andres' });
await p.waitForFunction(() => window.game.scene.getScene('Tejo')?.fase === 'juego', null, { timeout: 30000 });
await p.waitForFunction(() => { const s = window.game.scene.getScene('Tejo'); return s.estado === 'apunta' && s.tuyo(s.actual); }, null, { timeout: 60000 });
await ev(() => { const s = window.game.scene.getScene('Tejo'); s.u = 0; s.p = 0.5; s.lanzar(); });
const tj = [];
for (let i = 0; i < 8; i++) { await p.waitForTimeout(60); tj.push(await ev(() => { const s = window.game.scene.getScene('Tejo'); return { an: s.actual.fig.anim.name, f: s.actual.fig.anim.frame, mano: !!s.enMano?.visible, vuela: !!s.vuelo?.spr.visible }; })); if (i === 2) await shot('tejo_mano'); }
console.log('  tejo:', tj.map((q) => `${q.an}:${q.f}${q.mano ? ' mano' : ''}${q.vuela ? ' vuela' : ''}`).join(' | '));
check(tj.some((q) => q.an === 'tejo_throw' && q.mano), 'tejo: tejo_throw con el tejo en la mano');
check(tj.some((q) => q.vuela && !q.mano), 'tejo: sale de la mano en la suelta');

// 3) chapita: guardia y batazo con el palo
await ir('Chapita', { jugador: 'rick' });
await p.waitForFunction(() => window.game.scene.getScene('Chapita')?.fase === 'juego', null, { timeout: 30000 });
await p.waitForTimeout(800);
s = await ev(() => { const c = window.game.scene.getScene('Chapita'); return { an: c.bat.fig.anim.name, palo: c.palo.visible }; });
check(s.an === 'bat_stance' && s.palo, 'chapita: guardia de bateo con el palo', JSON.stringify(s));
await shot('chapita_guardia');
await ev(() => { const c = window.game.scene.getScene('Chapita'); c.batear('media'); });
await p.waitForTimeout(150);
s = await ev(() => { const c = window.game.scene.getScene('Chapita'); return { an: c.bat.fig.anim.name, palo: c.palo.visible }; });
check(s.an === 'bat_swing' && s.palo, 'chapita: batazo con el palo', JSON.stringify(s));
await shot('chapita_batazo');

// 4) azoteas: la garrocha que no llega
await ir('Azoteas', { jugador: 'rick' });
await p.waitForFunction(() => { const s = window.game.scene.getScene('Azoteas'); return s?.fase === 'juego' && s.cur?.c.human && s.st === 'carrera'; }, null, { timeout: 90000 });
await ev(() => { const s = window.game.scene.getScene('Azoteas'); s.v = 20; s.x = 400; s.cur.nek = 0; s.clava(); });
const vf = [];
for (let i = 0; i < 14; i++) { await p.waitForTimeout(90); vf.push(await ev(() => { const s = window.game.scene.getScene('Azoteas'); return `${s.cur.fig.anim.name}:${s.cur.fig.anim.frame} ${s.st}`; })); if (i === 6) await shot('azoteas_no_llega'); }
console.log('  azoteas:', vf.join(' | '));
check(vf.some((q) => q.startsWith('vault_fail')), 'azoteas: sin alcance, vault_fail');
check(vf.at(-1).includes('marca') || vf.at(-1).includes('espera') || vf.at(-1).includes('carrera'), 'azoteas: termina y anota');

// 5) quemado: el salto de bolita y el ambiente del liceo
await ir('Quemado', { jugador: 'rick' });
await p.waitForFunction(() => window.game.scene.getScene('Quemado')?.fase === 'juego', null, { timeout: 30000 });
await ev(() => { const s = window.game.scene.getScene('Quemado'); s.saltar(s.js[0]); });
const qj = [];
for (let i = 0; i < 8; i++) { await p.waitForTimeout(60); qj.push(await ev(() => { const s = window.game.scene.getScene('Quemado'); const j = s.js[0]; return { an: j.fig.anim.name, f: j.fig.anim.frame, z: Math.round(j.z) }; })); if (i === 3) await shot('quemado_bolita'); }
console.log('  quemado:', qj.map((q) => `${q.an}:${q.f} z${q.z}`).join(' | '));
check(qj.some((q) => q.an === 'dodge_jump' && q.z > 8), 'quemado: salto de bolita por encima de 8');
await p.waitForTimeout(2500);
const amb = await ev(() => window.game.cache.audio.exists('amb_liceo'));
check(amb, 'quemado: el ambiente del liceo cargó');

// 6) el acorde del ganador
await ev(() => { window.game.registry.set('gira', { jugador: 'rick', idx: 5, puntos: [30, 10], resultados: [], pruebas: ['Vallas'], equipos: ['familia_gg', 'instituto_nekketsu'] }); });
await ir('Medallero');
await p.waitForTimeout(3500);
check(await ev(() => window.game.cache.audio.exists('mus_acorde_familia')), 'medallero: el acorde de la Familia cargó');
await shot('medallero_final');
console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
