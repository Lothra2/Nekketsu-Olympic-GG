// Prueba de los seis equipos: la selección (equipo, atleta, equipo rival, rival) y cada prueba con equipos nuevos.
//   node scripts/prueba-equipos.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/equipos';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('crash', () => console.log('CRASH de la página'));
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`${m.type()}: ${m.text()}`); });
await page.goto(url);
await page.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Intro') || window.game?.scene.isActive('Title'), null, { timeout: 60000 });
await page.waitForTimeout(400);
await page.mouse.click(640, 360);
// la intro corre su guion aunque la paren: se salta y se espera al título
for (let i = 0; i < 20 && !(await page.evaluate(() => window.game.scene.isActive('Title'))); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(500); }
await page.waitForTimeout(1500);
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const key = async (k, ms = 40) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); await page.waitForTimeout(160); };
const start = (scene, d) => page.evaluate(([s, d]) => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start(s, d); }, [scene, d]);
// sprites que se pintan con la textura que falta: un pack sin cargar o soltado a destiempo
const faltan = () => page.evaluate(() => {
  const r = [];
  for (const s of window.game.scene.getScenes(true)) s.children.list.forEach(function rec(o) {
    if (o.list) o.list.forEach(rec);
    if (o.texture && (o.texture.key === '__MISSING' || !window.game.textures.exists(o.texture.key))) r.push(`${s.scene.key}:${o.texture.key}`);
  });
  return [...new Set(r)];
});
const activa = () => page.evaluate(() => window.game.scene.getScenes(true).map((s) => s.scene.key).join(','));
const malos = [];
const revisa = async (n) => { const f = await faltan(); if (f.length) malos.push(`${n}: ${f.join(' ')}`); };

// 1) la selección de verdad, con teclas: Rolos (4º) → Pipe (2º) → Rong Sài Gòn → su 3º → Fight
await start('Select', { modo: '1v1' });
await page.waitForTimeout(900); await shot('sel_0_equipos');
await key('ArrowRight'); await key('ArrowRight'); await key('ArrowRight'); await key('ArrowLeft'); await key('ArrowLeft'); await key('ArrowDown');
await page.waitForTimeout(200); await shot('sel_1_marcado');
await key('j'); await page.waitForTimeout(900); await shot('sel_2_atletas'); await revisa('sel atletas');
await key('ArrowRight'); await page.waitForTimeout(700); await shot('sel_3_pipe'); await revisa('sel pipe');
await key('j'); await page.waitForTimeout(700); await shot('sel_4_rival_equipo');
await key('ArrowLeft'); await page.waitForTimeout(200); await shot('sel_5_rival_marcado');
await key('j'); await page.waitForTimeout(900); await shot('sel_6_rival'); await revisa('sel rival');
await key('ArrowRight'); await key('ArrowRight'); await page.waitForTimeout(600);
await key('j');
for (let i = 0; i < 7; i++) { await page.waitForTimeout(500); console.log('  ', i, await activa()); }
console.log('tras la selección:', await activa());
const partido = await page.evaluate(() => { const s = window.game.scene.getScene('Fight'); return s?.sys.settings.data; });
console.log('datos de la pelea:', JSON.stringify(partido));
await shot('sel_7_pelea'); await revisa('pelea');
await page.waitForTimeout(3000); await shot('sel_8_pelea'); await revisa('pelea 2');

if (process.env.SOLO_SEL) { console.log('LOGS', logs.join('\n')); await browser.close(); process.exit(0); }
// 2) cada prueba con equipos que no son los de siempre
const casos = [
  ['Vallas', 'minh', ['rong_sai_gon', 'panas_de_caracas']],
  ['Natacion', 'yuli', ['rolos_de_chapinero', 'maracuchos_del_lago']],
  ['Jabalina', 'gabo', ['panas_de_caracas', 'instituto_nekketsu']],
  ['Azoteas', 'ender', ['maracuchos_del_lago', 'familia_gg']],
  ['CrossCountry', 'camila', ['rolos_de_chapinero', 'rong_sai_gon']],
  ['Obstaculos', 'tuan', ['rong_sai_gon', 'rolos_de_chapinero']],
  ['Tamawari', 'jhonder', ['panas_de_caracas', 'rong_sai_gon']],
  ['DaCau', 'lan', ['rong_sai_gon', 'familia_gg']],
  ['Tejo', 'andres', ['rolos_de_chapinero', 'panas_de_caracas']],
  ['Quemado', 'yusmary', ['panas_de_caracas', 'maracuchos_del_lago']],
  ['Chapita', 'toto', ['maracuchos_del_lago', 'rolos_de_chapinero']],
  ['Voley', 'ba_hoa', ['rong_sai_gon', 'instituto_nekketsu']],
  ['Tenis', 'carmen', ['maracuchos_del_lago', 'rong_sai_gon']],
  ['Futbol', 'pipe', ['rolos_de_chapinero', 'familia_gg']],
  ['Basket', 'don_hernando', ['rolos_de_chapinero', 'maracuchos_del_lago']],
];
const desde = process.env.DESDE;
const mem = () => page.evaluate(() => { const g = window.game; const t = Object.values(g.textures.list); let px = 0; for (const x of t) for (const src of x.source) px += (src.width || 0) * (src.height || 0); return `${t.length} texturas, ${Math.round(px * 4 / 1e6)} MB de imagen, heap ${Math.round((performance.memory?.usedJSHeapSize ?? 0) / 1e6)} MB, atletas ${Object.keys(g.textures.list).filter((k) => /:(ngg|atle|nat|fut|voley|bas|ten|bei|kee)/.test(k)).length}`; });
for (const [sc, jug, eq] of casos.slice(desde ? casos.findIndex((c) => c[0] === desde) : 0)) {
  // el partido se pone pasando por el medallero de una gira con esos equipos
  await page.evaluate((eq) => { window.game.registry.set('gira', { jugador: 'rick', idx: 0, puntos: [0, 0], resultados: [], pruebas: ['Vallas'], equipos: eq }); }, eq);
  await start('Medallero'); await page.waitForTimeout(700);
  await page.evaluate(() => { window.game.registry.set('gira', null); });
  await start(sc, { jugador: jug, practica: false });
  const hp = () => page.evaluate(() => Math.round(performance.memory.usedJSHeapSize / 1e6));
  const picos = [];
  for (let i = 0; i < 10; i++) { await page.waitForTimeout(250); picos.push(await hp()); }
  await revisa(`${sc} 0`);
  for (let i = 0; i < 30; i++) { await key(i % 2 ? 'k' : 'j', 30); if (i % 5 === 0) picos.push(await hp()); }
  console.log('  heap', picos.join(' '));
  await page.waitForTimeout(1500); await shot(`ev_${sc}`); await revisa(`${sc} 1`);
  console.log(sc, await activa(), '·', await mem());
}
// 3) práctica de pelea y 4v4 con equipos nuevos
await start('Fight', { modo: '4v4', jugador: 'abuela_nerva', rival: 'minh' });
await page.waitForTimeout(3000); await shot('fight_4v4'); await revisa('4v4');
for (let i = 0; i < 40; i++) await key(i % 3 ? 'j' : 'k', 30);
await shot('fight_4v4_b'); await revisa('4v4 b');
// medallero con gira de equipos nuevos
await page.evaluate(() => { window.game.registry.set('gira', { jugador: 'lan', idx: 2, puntos: [5, 3], resultados: [], pruebas: ['Vallas', 'Tejo', 'Futbol', 'Basket'], equipos: ['rong_sai_gon', 'panas_de_caracas'] }); });
await start('Medallero');
await page.waitForTimeout(2500); await shot('medallero'); await revisa('medallero');
await start('Title');
await page.waitForTimeout(2500); await shot('title'); await revisa('title');
console.log('al final:', await mem());
console.log('FALTAN:', malos.length ? '\n' + malos.join('\n') : 'ninguna');
console.log('LOGS:', logs.length ? '\n' + [...new Set(logs)].slice(0, 40).join('\n') : 'limpio');
await browser.close();
