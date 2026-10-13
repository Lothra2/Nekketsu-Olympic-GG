// Azoteas de Cartagena: el entrenamiento con un bot que corre, clava en la cajita y empuja arriba, y una competencia
// entera de tres rondas (el techo de enfrente se aleja) con el bot de humano. Fotos del vuelo y de las caídas.
//   node scripts/prueba-azoteas.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:4173/';
const out = process.argv[3] ?? 'capturas/azoteas';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
p.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await p.goto(url);
await p.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Title') || window.game?.scene.isActive('Intro'), null, { timeout: 60000 });
await p.mouse.click(640, 360);
await p.waitForTimeout(300);
let fallas = 0;
const check = (ok, s) => { if (!ok) fallas++; console.log(`${ok ? 'ok   ' : 'FALLA'} ${s}`); };
const ir = (e, d) => p.evaluate(([e, d]) => { const g = window.game; g.scene.getScenes(true).forEach((x) => g.scene.stop(x.scene.key)); g.scene.start(e, d); }, [e, d]);
const st = () => p.evaluate(() => {
  const s = window.game.scene.getScene('Azoteas');
  return { st: s.st, x: Math.round(s.x), y: Math.round(s.y), f: s.cur?.fig.anim.frame, humano: s.cur?.c.human, fase: s.fase, paso: s.coach?.i ?? -1, ronda: s.ronda, hueco: s.hueco, caida: s.caida?.tipo, empuje: s.empuje, marcas: s.gente2.map((g) => `${g.c.id}:${g.marcas.map((m) => m.toFixed(1)).join('/')}`).join(' ') };
});
const toque = async (k) => { await p.keyboard.down(k); await p.waitForTimeout(25); await p.keyboard.up(k); };
const CAJA = 428;

/** Juega como humano: corre alternando, clava cerca de la cajita (con `error` px) y empuja arriba. */
let alterna = 0, clavo = false, empujo = false;
async function bot(s, error = 0) {
  if (!s.humano || s.fase !== 'juego') return;
  if (s.st === 'carrera') {
    empujo = false;
    if (s.x >= CAJA - 4 + error && s.x > 100) { await toque('l'); clavo = true; return; }
    await toque(alterna++ % 2 ? 'j' : 'k');
  } else if (s.st === 'salto' && !empujo && s.f >= 6) { empujo = true; await toque('l'); }
}

// 1. el entrenamiento
await ir('Azoteas', { jugador: 'sophie', practica: true });
await p.waitForFunction(() => window.game.scene.getScene('Azoteas').coach, null, { timeout: 20000 });
let visto = -1, foto = 0;
let t0 = Date.now();
while (Date.now() - t0 < 120000) {
  const s = await st();
  if (s.paso !== visto) { visto = s.paso; console.log(`paso ${s.paso} · ${s.marcas}`); await p.screenshot({ path: `${out}/paso_${s.paso}.png` }); }
  if (s.fase === 'fin') break;
  if (s.st === 'salto' && s.f === 7 && foto < 2) { foto++; await p.screenshot({ path: `${out}/vuelo_${foto}.png` }); }
  await bot(s);
}
const e1 = await st();
check(e1.fase === 'fin', `el entrenamiento se termina (paso ${e1.paso}) · ${e1.marcas}`);
await p.screenshot({ path: `${out}/entrenamiento_fin.png` });

// 2. la competencia: el bot se equivoca a propósito en la ronda 3 para ver una caída de cerca
await ir('Azoteas', { jugador: 'sophie' });
t0 = Date.now();
const huecos = new Set(), caidas = new Set();
let fotoCae = 0;
while (Date.now() - t0 < 240000) {
  const s = await st();
  if (s.fase === 'fin') break;
  huecos.add(s.hueco);
  if (s.caida) {
    if (!caidas.has(s.caida)) console.log(`cae: ${s.caida} (${s.humano ? 'humano' : 'máquina'}, ronda ${s.ronda + 1})`);
    caidas.add(s.caida);
    if (fotoCae < 6) { fotoCae++; await p.waitForTimeout(250); await p.screenshot({ path: `${out}/cae_${fotoCae}.png` }); }
  }
  await bot(s, s.ronda === 2 ? -45 : 0);
}
const e2 = await st();
console.log(e2.marcas);
check(e2.fase === 'fin', 'la competencia termina con la tabla');
check(huecos.size === 3, `el techo de enfrente se aleja: ${[...huecos].join(', ')} m`);
check(e2.marcas.split(' ').every((m) => m.split(':')[1].split('/').length === 3), 'tres saltos cada uno');
check(caidas.size > 0, `alguien cae: ${[...caidas].join(', ')}`);
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/tabla.png` });
console.log(logs.length ? logs.join('\n') : 'sin errores en consola');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
