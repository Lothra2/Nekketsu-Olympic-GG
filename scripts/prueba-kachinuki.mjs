// Kachinuki: el borde sin baranda, lo pesado que cae del cielo, la azotea que se achica y el rescate de Thor.
//   node scripts/prueba-kachinuki.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/kachinuki';
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
let fallas = 0;
const ok = (c, s) => { console.log(`${c ? 'ok   ' : 'FALLA'} ${s}`); if (!c) fallas++; };
const empezar = async (modo, nivel) => {
  await page.evaluate(([modo, nivel]) => { localStorage.setItem('ngg_nivel', nivel); const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start('Fight', { modo, jugador: 'sophie', rival: 'kenji' }); }, [modo, nivel]);
  await page.waitForFunction(() => window.game.scene.getScene('Fight').phase === 'play', null, { timeout: 15000 });
};
const F = (fn, arg) => page.evaluate(fn, arg);

// 1. caminando no se sale
await empezar('1v1', 'normal');
await F(() => { const s = window.game.scene.getScene('Fight'); const p = s.player; p.x = 600; p.y = 50; s.brains.clear(); });
await page.keyboard.down('ArrowRight'); await page.waitForTimeout(1200); await page.keyboard.up('ArrowRight');
const x1 = await F(() => window.game.scene.getScene('Fight').player.x);
ok(x1 < 618 && x1 > 590, `caminando se queda en la azotea (x ${Math.round(x1)})`);

// 2. un rival tumbado hacia el borde queda fuera
await F(() => { const s = window.game.scene.getScene('Fight'); const k = s.actors.find((a) => a.team === 1); k.x = 596; k.y = 50; k.knockdown(1, 170, 180); });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/1_fuera.png` });
const fuera = await F(() => { const s = window.game.scene.getScene('Fight'); const k = s.actors.find((a) => a.team === 1); return { st: k.st, caido: s.caidos.has(k), fase: s.phase }; });
ok(fuera.caido && fuera.st === 'ko', `el rival que sale volando por el borde queda fuera (${JSON.stringify(fuera)})`);

// 3. a la persona la salva Thor (normal: una vez)
await empezar('1v1', 'normal');
await F(() => { const s = window.game.scene.getScene('Fight'); s.brains.clear(); const p = s.player; p.x = 600; p.y = 40; p.knockdown(1, 170, 180); });
await page.waitForTimeout(1600);
const salvo = await F(() => { const s = window.game.scene.getScene('Fight'); return { vivo: s.player.alive, x: Math.round(s.player.x), quedan: s.rescates }; });
ok(salvo.vivo && salvo.quedan === 0, `Thor salva a la persona la primera vez (${JSON.stringify(salvo)})`);
await F(() => { const s = window.game.scene.getScene('Fight'); const p = s.player; p.invul = 0; p.x = 600; p.y = 40; p.setSt('idle', 'idle'); p.knockdown(1, 170, 180); });
await page.waitForTimeout(2600);
const perdio = await F(() => { const s = window.game.scene.getScene('Fight'); return { vivo: s.player.alive, fase: s.phase }; });
ok(!perdio.vivo && perdio.fase === 'end', `la segunda vez queda fuera y se pierde la pelea (${JSON.stringify(perdio)})`);

// 4. lo pesado que cae del cielo, con su sombra, y la azotea que se achica
await empezar('4v4', 'paseo');
await F(() => { const s = window.game.scene.getScene('Fight'); s.grandeT = 0.1; });
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/2_sombra.png` });
await page.waitForTimeout(1800);
await page.screenshot({ path: `${out}/3_pesado.png` });
const pesado = await F(() => window.game.scene.getScene('Fight').pesado);
ok(pesado === null, 'lo pesado cayó y se resolvió');
await F(() => { const s = window.game.scene.getScene('Fight'); s.reloj = 89.5; });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/4_achica.png` });
await page.waitForTimeout(3000);
const borde = await F(() => window.game.scene.getScene('Fight').borde);
ok(borde < 610, `la azotea se achica (borde en ${Math.round(borde)})`);
await page.screenshot({ path: `${out}/5_achicada.png` });
console.log(logs.length ? logs.join('\n') : 'sin errores');
await browser.close();
process.exit(fallas ? 1 : 0);
