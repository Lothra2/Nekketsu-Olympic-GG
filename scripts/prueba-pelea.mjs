// Prueba dirigida de la pelea: entra directo a 1 contra 1 y revisa técnica, levantar y lanzar.
//   node scripts/prueba-pelea.mjs [url] [carpeta] [jugador] [rival]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas';
const jugador = process.argv[4] ?? 'rick';
const rival = process.argv[5] ?? 'kenji';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto(url);
// espera a que Boot termine de cargar el kit (con varias pruebas a la vez tarda más)
await page.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Intro') || window.game?.scene.isActive('Title'), null, { timeout: 60000 });
await page.waitForTimeout(400);
await page.mouse.click(640, 360);
await page.waitForTimeout(400);
await page.evaluate(([j, r]) => { const g = window.game; g.scene.getScenes(true).forEach((s) => g.scene.stop(s.scene.key)); g.scene.start('Fight', { modo: '1v1', jugador: j, rival: r }); }, [jugador, rival]);
await page.waitForTimeout(2600);
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const key = async (k, ms = 70) => { await page.keyboard.down(k); await page.waitForTimeout(ms); await page.keyboard.up(k); };
const estado = () => page.evaluate(() => { const f = window.game.scene.getScene('Fight'); return f.actors.map((a) => `${a.id}:${a.st}:${Math.round(a.hp)}:${a.fig.anim.name}`).join(' | '); });
// el rival quieto al frente
await page.evaluate(() => { const f = window.game.scene.getScene('Fight'); const [p, r] = f.actors; f.brains.clear(); r.x = p.x + 26; r.y = p.y; p.left = false; });
await shot('a_frente');
await key('j'); await page.waitForTimeout(200); await key('j'); await page.waitForTimeout(200); await key('j');
await page.waitForTimeout(250); await shot('b_combo');
console.log('tras combo:', await estado());
await page.waitForTimeout(1800);
await page.evaluate(() => { const f = window.game.scene.getScene('Fight'); const [p, r] = f.actors; if (p.st !== 'idle') p.setSt('idle', 'idle'); r.x = p.x + 22; r.y = p.y; if (r.st !== 'down') { r.st = 'down'; r.t = 0; r.play('ko_bounce'); r.fig.anim.pos = 7.9; } });
await key('j'); await page.waitForTimeout(250); await shot('c_levanta'); await page.waitForTimeout(250); await shot('c2_arriba');
console.log('levantando:', await estado());
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await shot('d_carga_camina'); await page.keyboard.up('ArrowRight');
await key('j'); await page.waitForTimeout(160); await shot('e_lanza'); await page.waitForTimeout(220); await shot('f_vuela');
await page.waitForTimeout(900); await shot('g_cae');
console.log('tras lanzar:', await estado());
await page.waitForTimeout(1600);
await page.evaluate(() => { const f = window.game.scene.getScene('Fight'); const [p, r] = f.actors; p.meter = 100; r.x = p.x + 40; r.y = p.y; p.left = false; if (p.st !== 'idle') p.setSt('idle', 'idle'); });
await key('u', 120); await page.waitForTimeout(350); await shot('h_corte');
console.log('especial:', await estado());
for (let i = 0; i < 5; i++) { await page.waitForTimeout(300); await shot(`i_especial_${i}`); }
console.log('después:', await estado());
// arma: chancleta al lado
await page.waitForTimeout(1500);
await page.evaluate(() => { const f = window.game.scene.getScene('Fight'); const p = f.actors[0]; const c = f.items.find((i) => i.kind === 'chancleta'); if (p.st !== 'idle') p.setSt('idle', 'idle'); c.st = 'floor'; c.x = p.x + 8; c.y = p.y; c.z = 0; });
await key('j'); await page.waitForTimeout(450); await shot('j_recoge');
await key('k'); await page.waitForTimeout(180); await shot('k_tira'); await page.waitForTimeout(300); await shot('l_vuela'); await page.waitForTimeout(400); await shot('m_vuelve');
console.log('final:', await estado());
console.log(logs.join('\n') || 'sin errores');
await browser.close();
