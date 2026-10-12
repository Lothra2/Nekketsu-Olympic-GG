// La pelea nueva, mecánica por mecánica: VS, guardia, agarre con rodillazos, pisotón, arepa, burla y patada voladora.
//   node scripts/prueba-pelea-nueva.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/pelea_nueva';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto(url);
await page.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Intro') || window.game?.scene.isActive('Title'), null, { timeout: 60000 });
await page.waitForTimeout(400);
await page.mouse.click(640, 360);
await page.waitForTimeout(300);
const key = async (k, ms = 40) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
let fallas = 0;
const check = (ok, s, extra = '') => { if (!ok) fallas++; console.log(`${ok ? 'ok   ' : 'FALLA'} ${s}${extra ? ` (${extra})` : ''}`); };
const ev = (f, a) => page.evaluate(f, a);

await ev(() => { const g = window.game; g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key)); g.scene.start('Fight', { modo: '1v1', jugador: 'sophie', rival: 'kenji' }); });
await page.waitForTimeout(1300);
await page.screenshot({ path: `${out}/01_vs.png` });
await page.waitForFunction(() => window.game.scene.getScene('Fight').phase === 'play', null, { timeout: 15000 });
// la máquina quieta para probar cada cosa sin que se meta
await ev(() => { const f = window.game.scene.getScene('Fight'); f.brains.clear(); f.dropT = 1e9; f.grandeT = 1e9; f.arepaT = 1e9; });
const pon = (px, rx, rst) => ev(([px, rx, rst]) => {
  const f = window.game.scene.getScene('Fight'); const [p, r] = f.actors;
  for (const a of [p, r]) { a.soltar(); a.z = 0; a.vx = 0; a.vz = 0; a.y = 50; a.invul = 0; a.hp = a.maxHp; a.setSt('idle', 'idle'); }
  p.x = px; r.x = rx; p.left = rx < px; r.left = px < rx;
  if (rst) r.setSt(rst, rst === 'dizzy' ? 'dizzy' : 'idle');
}, [px, rx, rst]);
const estado = () => ev(() => { const f = window.game.scene.getScene('Fight'); const [p, r] = f.actors; return { p: p.st, r: r.st, php: p.hp, rhp: r.hp, pmax: p.maxHp, anim: p.fig.anim.name, ranim: r.fig.anim.name }; });

// guardia: mantener la estrella sin barra
await pon(300, 320);
await page.keyboard.down('u');
await page.waitForTimeout(300);
let s = await estado();
check(s.p === 'guard', 'mantener la estrella sin barra cubre', s.p);
await ev(() => { const f = window.game.scene.getScene('Fight'); const [p, r] = f.actors; r.left = true; p.takeHit(r, { dmg: 9, push: 95, kd: true }, -1); });
await page.waitForTimeout(150);
const g1 = await estado();
await page.screenshot({ path: `${out}/02_guardia.png` });
check(g1.p === 'guard' && g1.pmax - g1.php <= 2, 'la guardia para un golpe de frente', `${g1.p}, perdió ${g1.pmax - g1.php}`);
await ev(() => { const f = window.game.scene.getScene('Fight'); const [p, r] = f.actors; p.takeHit(r, { dmg: 9, push: 95 }, -1); p.takeHit(r, { dmg: 9, push: 95 }, -1); });
s = await estado();
check(s.p === 'hurt' && s.anim === 'stagger', 'tres golpes seguidos rompen la guardia', `${s.p} ${s.anim}`);
await page.keyboard.up('u');
await page.waitForTimeout(900);

// agarre: un mareado al alcance se agarra con el puño; tres rodillazos lo tumban
await pon(300, 318, 'dizzy');
await key('j');
await page.waitForTimeout(250);
s = await estado();
check(s.p === 'grab' && s.r === 'grabbed', 'el puño agarra al mareado', `${s.p}/${s.r}`);
await page.screenshot({ path: `${out}/03_agarre.png` });
for (let i = 0; i < 3; i++) { await key('j'); await page.waitForTimeout(420); }
s = await estado();
await page.screenshot({ path: `${out}/04_rodillazos.png` });
check(['fall', 'down'].includes(s.r) && s.rhp < 120, 'tres rodillazos lo tumban', `${s.r} vida ${Math.round(s.rhp)}`);
await page.waitForTimeout(300);

// caminar contra uno recién golpeado también lo agarra
await pon(300, 322, 'idle');
await ev(() => { const f = window.game.scene.getScene('Fight'); const [, r] = f.actors; r.setSt('hurt', 'fight_hit'); r.agarrable = 0.6; });
await key('ArrowRight', 150);
s = await estado();
check(s.p === 'grab', 'caminar contra un aturdido lo agarra', `${s.p}/${s.r}`);
// patada: lo bota
await key('k');
await page.waitForTimeout(300);
s = await estado();
check(['fall', 'down'].includes(s.r), 'la patada lo bota al piso', s.r);
await page.waitForTimeout(900);

// forcejeo: el agarrado se suelta solo al rato
await pon(300, 318, 'dizzy');
await key('j');
await page.waitForTimeout(2900);
s = await estado();
check(s.p !== 'grab' && s.r !== 'grabbed', 'el agarrado se suelta al rato', `${s.p}/${s.r}`);
await page.waitForTimeout(600);

// pisotón: patada al que está tirado
await pon(300, 316);
await ev(() => { const f = window.game.scene.getScene('Fight'); const [, r] = f.actors; r.knockdown(1, 0, 40); });
await page.waitForTimeout(700);
const antes = (await estado()).rhp;
await key('k');
await page.waitForTimeout(500);
s = await estado();
await page.screenshot({ path: `${out}/05_pisoton.png` });
check(s.rhp < antes, 'el pisotón le quita vida al que está en el piso', `${Math.round(antes)} → ${Math.round(s.rhp)}`);
await page.waitForTimeout(1200);

// patada voladora: corriendo, salto y patada
await pon(200, 330);
await ev(() => { const f = window.game.scene.getScene('Fight'); const [p] = f.actors; p.st = 'jump'; p.vz = 255; p.vx = 150; p.z = 1; });
await key('k');
await page.waitForTimeout(100);
s = await estado();
check(s.anim === 'flying_kick', 'saltando corriendo sale la patada voladora', s.anim);
await page.screenshot({ path: `${out}/06_voladora.png` });
await page.waitForTimeout(900);

// arepa: cae, y quien la pisa recupera vida
await pon(300, 500);
await ev(() => { const f = window.game.scene.getScene('Fight'); f.actors[0].hp = 30; f.arepaT = 0; });
await page.waitForTimeout(700);
const ar = await ev(() => { const f = window.game.scene.getScene('Fight'); return f.arepas[0] ? { x: f.arepas[0].x, y: f.arepas[0].y } : null; });
check(!!ar, 'cae una arepa');
await page.screenshot({ path: `${out}/07_arepa.png` });
if (ar) {
  await ev(([x, y]) => { const f = window.game.scene.getScene('Fight'); const [p] = f.actors; p.x = x - 30; p.y = y; }, [ar.x, ar.y]);
  await key('ArrowRight', 600);
  s = await estado();
  check(s.php > 30, 'pisar la arepa cura', `vida ${Math.round(s.php)}`);
}

// burla: la máquina se ríe y queda abierta
await pon(300, 340);
await ev(() => { const f = window.game.scene.getScene('Fight'); f.actors[1].burla(1); });
await page.waitForTimeout(200);
s = await estado();
await page.screenshot({ path: `${out}/08_burla.png` });
check(s.r === 'taunt' && ['laugh', 'point', 'taunt'].includes(s.ranim), 'la máquina se burla', `${s.r} ${s.ranim}`);

// golpes seguidos: contador y onomatopeyas
await pon(300, 318);
for (let i = 0; i < 3; i++) { await key('j'); await page.waitForTimeout(200); }
await page.waitForTimeout(100);
await page.screenshot({ path: `${out}/09_racha.png` });
const racha = await ev(() => window.game.scene.getScene('Fight').racha.n);
check(racha >= 2, 'el contador de golpes cuenta la racha', `${racha}`);

console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await browser.close();
process.exit(fallas || logs.length ? 1 : 0);
