// Básquet: lo que se juega en un partido de verdad. Robarle al que bota, clavar desde cerca (y volando, corriendo),
// y los tres súper golpes con la barra llena: tacleada, tiro de fuego y clavada Nekketsu.
//   node scripts/prueba-basket-super.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/basket-super';
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
const check = (ok, s) => { if (!ok) fallas++; console.log(`${ok ? 'ok   ' : 'FALLA'} ${s}`); };
const toque = async (k) => { await p.keyboard.down(k); await p.waitForTimeout(40); await p.keyboard.up(k); await p.waitForTimeout(80); };
await p.evaluate(() => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start('Basket', { jugador: 'rick' }); });
await p.waitForFunction(() => window.game.scene.getScene('Basket')?.fase === 'juego', null, { timeout: 30000 });
// congela a la máquina para poner cada jugada a mano
const pon = (f, a) => p.evaluate(f, a);

// 1) el robo: un rival bota el balón pegado a ti; puño hasta quitárselo
let robos = 0;
for (let k = 0; k < 6 && !robos; k++) {
  await pon(() => {
    const s = window.game.scene.getScene('Basket'); const yo = s.js[0], r = s.js.find((j) => j.team === 1);
    s.pausa = 0; s.limpia = true; s.ataca = 1;
    for (const o of s.js) if (o.team === 0 && o !== yo) { o.x = 100; o.y = 20; }
    yo.x = 420; yo.y = 52; yo.st = 'libre'; yo.empuja = 0; r.x = 432; r.y = 52; r.st = 'libre'; r.aguanta = 0; r.z = 0; r.ia.t = 3; r.empuja = 1;
    s.bola.dueño = r; s.bola.tiro = null; s.ctrl = yo;
  });
  await toque('j');
  robos = await pon(() => { const s = window.game.scene.getScene('Basket'); return s.bola.dueño?.team === 0 ? 1 : 0; });
  await p.waitForTimeout(600);
}
check(robos > 0, 'con puño le robas el balón al que lo bota pegado a ti');

// 2) la clavada: con el balón cerca del aro, salto
const clava = async (x, corre) => {
  const antes = await pon(() => window.game.scene.getScene('Basket').puntos[0]);
  await pon((x) => {
    const s = window.game.scene.getScene('Basket'); const yo = s.js[0];
    s.pausa = 0; s.limpia = true; s.ataca = 0;
    for (const o of s.js) if (o.team === 0 && o !== yo) { o.x = 100; o.y = 20; }
    for (const o of s.js) if (o.team === 1) { o.x = 380; o.y = 10; o.z = 0; o.vz = 0; o.st = 'caido'; o.t = 3; }
    yo.x = x; yo.y = 52; yo.z = 0; yo.vz = 0; yo.st = 'libre'; s.bola.dueño = yo; s.bola.tiro = null;
  }, x);
  if (corre) await p.keyboard.down('Shift');
  await toque('l');
  if (corre) await p.keyboard.up('Shift');
  for (let i = 0; i < 4; i++) { await p.waitForTimeout(150); if (process.env.TRAZA) console.log(await pon(() => { const s = window.game.scene.getScene('Basket'); const yo = s.js[0]; return `ctrl ${s.ctrl?.id} yo ${yo.id} ${Math.round(yo.x)} z${Math.round(yo.z)} ${yo.st} dueño ${s.bola.dueño?.id} tiro ${!!s.bola.tiro} pausa ${s.pausa.toFixed(2)} pts ${s.puntos}`; })); }
  await p.waitForTimeout(600);
  return (await pon(() => window.game.scene.getScene('Basket').puntos[0])) - antes;
};
let clavo = 0;
for (let k = 0; k < 5 && !clavo; k++) clavo = await clava(500, false);
check(clavo > 0, 'salto con el balón cerca del aro: clavada y canasta');
await p.screenshot({ path: `${out}/clavada.png` });

// 3) los súper golpes con la barra llena
await pon(() => { window.game.scene.getScene('Basket').nek[0] = 100; });
const antesFuego = await pon(() => window.game.scene.getScene('Basket').puntos[0]);
await pon(() => {
  const s = window.game.scene.getScene('Basket'); const yo = s.js[0];
  s.pausa = 0; s.limpia = true; s.ataca = 0; for (const o of s.js) if (o.team === 0 && o !== yo) { o.x = 100; o.y = 20; } yo.x = 360; yo.y = 52; yo.z = 0; yo.st = 'libre'; s.bola.dueño = yo; s.bola.tiro = null;
});
await toque('u');
await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/tiro_fuego.png` });
await p.waitForTimeout(1500);
check((await pon(() => window.game.scene.getScene('Basket').puntos[0])) - antesFuego === 2, 'el tiro de fuego de lejos entra y vale 2');

await pon(() => { const s = window.game.scene.getScene('Basket'); s.nek[0] = 100; });
await pon(() => {
  const s = window.game.scene.getScene('Basket'); const yo = s.js[0], r = s.js.find((j) => j.team === 1);
  s.pausa = 0; s.limpia = true; s.ataca = 1; for (const o of s.js) if (o.team === 0 && o !== yo) { o.x = 100; o.y = 20; } yo.x = 400; yo.y = 52; yo.st = 'libre'; yo.empuja = 0; r.x = 450; r.y = 52; r.st = 'libre'; r.z = 0;
  s.bola.dueño = r; s.bola.tiro = null;
});
await toque('u');
await p.waitForTimeout(700);
check(await pon(() => window.game.scene.getScene('Basket').bola.dueño?.team === 0), 'la tacleada Nekketsu le arranca el balón al rival');
await p.screenshot({ path: `${out}/tacleada.png` });
console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
