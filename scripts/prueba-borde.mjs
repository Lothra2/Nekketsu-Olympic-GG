// Pegado al borde de arriba o de abajo de la franja, los obstáculos tienen que seguir valiendo:
// el muro frena, el hueco hace caer y el agua frena. (Sophie encontró que pegada abajo se pasaba todo.)
//   node scripts/prueba-borde.mjs [url]
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:5173/';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await page.goto(url);
await page.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Intro') || window.game?.scene.isActive('Title'), null, { timeout: 60000 });
await page.waitForTimeout(400);
await page.mouse.click(640, 360);
await page.waitForTimeout(300);
let fallas = 0;
const check = (ok, s, extra = '') => { if (!ok) fallas++; console.log(`${ok ? 'ok   ' : 'FALLA'} ${s}${extra ? ` (${extra})` : ''}`); };

await page.evaluate(() => { const g = window.game; g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key)); g.scene.start('Obstaculos', { jugador: 'sophie' }); });
await page.waitForFunction(() => window.game.scene.getScene('Obstaculos')?.fase === 'juego', null, { timeout: 20000 });
// los demás quietos lejos, para que nadie se meta
await page.evaluate(() => { const s = window.game.scene.getScene('Obstaculos'); s.gente2.slice(1).forEach((r) => { r.a.x = 20; r.done = true; }); });
const pon = (x, y) => page.evaluate(([x, y]) => { const s = window.game.scene.getScene('Obstaculos'); const a = s.gente2[0].a; a.x = x; a.y = y; a.z = Math.max(0, s.suelo(x, Math.min(y, 129), 999)); a.vx = a.vz = 0; a.setSt('idle', 'idle'); s.gente2[0].safe = [x, y]; }, [x, y]);
const yo = () => page.evaluate(() => { const a = window.game.scene.getScene('Obstaculos').gente2[0].a; return { x: a.x, y: a.y, z: a.z }; });
const correr = async (ms, abajo) => {
  await page.keyboard.down('ArrowRight');
  if (abajo !== undefined) await page.keyboard.down(abajo ? 'ArrowDown' : 'ArrowUp');
  await page.waitForTimeout(ms);
  await page.keyboard.up('ArrowRight');
  if (abajo !== undefined) await page.keyboard.up(abajo ? 'ArrowDown' : 'ArrowUp');
};

for (const [lado, y, abajo] of [['abajo', 130, true], ['arriba', 0, false]]) {
  // el muro pintado (x 1060, de 0 a 130 de fondo) frena sin saltar
  await pon(1000, y);
  await correr(1500, abajo);
  let p = await yo();
  check(p.x < 1060, `pegada ${lado}, el muro pintado frena`, `x ${Math.round(p.x)} y ${p.y.toFixed(1)}`);
  // el hueco entre las casas (x 2350 a 2400) hace caer: vuelve al último piso firme
  await pon(2290, y);
  await correr(1400, abajo);
  // la caída tarda: se espera a que vuelva al último piso firme
  await page.waitForTimeout(1000);
  p = await yo();
  check(p.x < 2350, `pegada ${lado}, el hueco entre casas hace caer`, `x ${Math.round(p.x)} y ${p.y.toFixed(1)} z ${Math.round(p.z)}`);
}

console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await browser.close();
process.exit(fallas || logs.length ? 1 : 0);
