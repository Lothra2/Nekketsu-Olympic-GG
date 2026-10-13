// Tama-wari: el entrenamiento jugado con el teclado, paso a paso (llegar, agarrarse, trepar, pegarle a la bola,
// bajar a patear el poste donde trepa Kenji y romper la bola).
//   node scripts/prueba-tamawari.mjs [carpeta]
import { chromium } from '@playwright/test';
const out = process.argv[2] ?? 'capturas/tamawari';
import('node:fs').then((fs) => fs.mkdirSync(out, { recursive: true }));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = []; p.on('pageerror', (e) => logs.push(e.message));
await p.goto('http://localhost:4173/');
await p.waitForFunction(() => window.game?.scene.isActive('Tap'), null, { timeout: 60000 });
await p.mouse.click(400, 200);
await p.evaluate(() => { const g = window.game; g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key)); g.scene.start('Tamawari', { jugador: 'alana', practica: true }); });
await p.waitForFunction(() => window.game.scene.getScene('Tamawari').coach, null, { timeout: 20000 });
const st = () => p.evaluate(() => { const s = window.game.scene.getScene('Tamawari'); const a = s.jugadores[0].a; const t = s.trepa.get(a); return { x: Math.round(a.x), y: Math.round(a.y), st: a.st, h: t ? Math.round(t.h) : -1, paso: s.coach?.i ?? s.coach?.paso, bolas: s.postes.map((q) => Math.round(q.vida)).join('/'), fase: s.fase, otros: s.jugadores.slice(1).map((j) => `${j.c.id}:${s.trepa.has(j.a) ? 'T' + Math.round(s.trepa.get(j.a).h) : j.a.st}`).join(' ') }; });
const tecla = async (k, ms = 50) => { await p.keyboard.down(k); await p.waitForTimeout(ms); await p.keyboard.up(k); };
const ir = async (tx, ty) => {
  for (let i = 0; i < 80; i++) {
    const s = await st();
    if (Math.abs(s.x - tx) < 8 && Math.abs(s.y - ty) < 8) return;
    const kx = s.x < tx - 6 ? 'ArrowRight' : s.x > tx + 6 ? 'ArrowLeft' : null;
    const ky = s.y < ty - 6 ? 'ArrowDown' : s.y > ty + 6 ? 'ArrowUp' : null;
    if (kx) await p.keyboard.down(kx); if (ky) await p.keyboard.down(ky);
    await p.waitForTimeout(120);
    if (kx) await p.keyboard.up(kx); if (ky) await p.keyboard.up(ky);
  }
};
console.log('inicio', JSON.stringify(await st()));
await ir(520, 50);
console.log('al pie', JSON.stringify(await st()));
await p.screenshot({ path: `${out}/1_pie.png` });
await tecla('l');
await p.waitForTimeout(200);
console.log('agarrado', JSON.stringify(await st()));
for (let i = 0; i < 40; i++) { await tecla(i % 2 ? 'j' : 'k', 30); await p.waitForTimeout(40); }
console.log('trepó', JSON.stringify(await st()));
await p.screenshot({ path: `${out}/2_arriba.png` });
for (let i = 0; i < 16; i++) { await tecla('j', 30); await p.waitForTimeout(260); }
console.log('pegó', JSON.stringify(await st()));
await p.screenshot({ path: `${out}/3_bola.png` });
await p.waitForTimeout(1500);
console.log('kenji', JSON.stringify(await st()));
await tecla('l');
await p.waitForTimeout(900);
await ir(124, 52);
for (let i = 0; i < 6; i++) { await p.keyboard.down('ArrowLeft'); await p.waitForTimeout(30); await p.keyboard.up('ArrowLeft'); await tecla('k'); await p.waitForTimeout(1200); const s = await st(); console.log('patada', JSON.stringify(s)); if (!s.otros.includes('T')) break; }
await p.screenshot({ path: `${out}/4_patea.png` });
await p.waitForTimeout(1500);
await ir(520, 50);
await tecla('l');
for (let i = 0; i < 40; i++) { await tecla(i % 2 ? 'j' : 'k', 30); await p.waitForTimeout(40); }
for (let i = 0; i < 20; i++) { await tecla('j', 30); await p.waitForTimeout(260); const s = await st(); if (s.fase === 'fin') break; }
await p.waitForTimeout(1500);
console.log('fin', JSON.stringify(await st()));
await p.screenshot({ path: `${out}/5_fin.png` });
console.log(logs.length ? logs : 'sin errores');
await b.close();
