// Judo y Vovinam Hà Nội: un combate con la máquina de los dos lados hasta que alguien llega a 3 puntos
// (lanzamiento desde el agarre = ippon, 2; tumbar de un golpe = waza-ari, 1). Revisa que se marquen puntos,
// que después de cada punto vuelvan a empezar y que termine.
//   node scripts/prueba-judo.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/judo';
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
await p.evaluate(() => { const g = window.game; g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key)); g.scene.start('Fight', { modo: 'judo', jugador: 'sophie', rival: 'kenji' }); });
await p.waitForFunction(() => window.game.scene.getScene('Fight').phase === 'play', null, { timeout: 30000 });
await p.screenshot({ path: `${out}/1_hajime.png` });
// la persona también la pelea la máquina
await p.evaluate(() => { const f = window.game.scene.getScene('Fight'); const B = [...f.brains.values()][0].constructor; f.brains.set(f.player, new B(f.player, 0.9)); f.player.human = false; });
const t0 = Date.now();
let antes = '0-0', vistos = 0, fin = null, k = 0;
while (Date.now() - t0 < 150000) {
  await p.waitForTimeout(400);
  const e = await p.evaluate(() => { const f = window.game.scene.getScene('Fight'); return { pts: f.puntos.join('-'), phase: f.phase, reloj: Math.round(f.relojJudo), oro: f.oro, st: f.actors.map((a) => a.st).join(',') }; });
  if (e.pts !== antes) { vistos++; console.log(`punto: ${antes} → ${e.pts} (reloj ${e.reloj})`); antes = e.pts; await p.waitForTimeout(250); if (k < 3) await p.screenshot({ path: `${out}/${2 + k++}_punto.png` }); }
  if (e.phase === 'end') { fin = e; break; }
}
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/9_fin.png` });
check(vistos >= 1, `se marcan puntos (${vistos})`);
check(!!fin, `el combate termina (${fin?.pts ?? antes}${fin?.oro ? ', con punto de oro' : ''})`);
console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
