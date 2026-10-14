// La intro de punta a punta, revisada cuadro a cuadro:
// - cada reacción de manga (vena, gota, ¡!, lágrima, sonrojo, estrellas) entera dentro de la pantalla
// - que no la tape una tarjeta, un cuadro de diálogo ni otra figura que vaya delante
// - las tarjetas, los carteles y las onomatopeyas enteros dentro de la pantalla
// Saca una captura la primera vez que ve cada problema.
//   node scripts/prueba-intro.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/intro';
// el tamaño de la ventana: 1280x720 por defecto; 844x390 es un celular alargado acostado
const [VW, VH] = (process.argv[4] ?? '1280x720').split('x').map(Number);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: VW, height: VH } });
const logs = [];
page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
await page.goto(url);
await page.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Intro') || window.game?.scene.isActive('Title'), null, { timeout: 60000 });
await page.waitForTimeout(300);
await page.mouse.click(640, 360);
await page.waitForTimeout(200);
await page.evaluate(() => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start('Intro'); });

const revisar = () => page.evaluate(() => {
  const s = window.game.scene.getScene('Intro');
  if (window.game.scene.isActive('Title')) return { fin: true, malos: [], reacs: 0 };
  if (!s?.layer) return { fin: false, malos: [], reacs: 0 };
  const lista = s.layer.list;
  const malos = [];
  const visible = (o) => o.visible !== false && (o.alpha ?? 1) > 0.5 && o.active;
  const caja = (o) => { const b = o.getBounds(); return { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height }; };
  // lo visible: el cuadro de 640 más lo que sobra a cada lado en pantallas anchas
  const lado = Math.max(0, Math.floor((window.game.scale.gameSize.width - 640) / 2));
  const fuera = (b, m = 2) => b.x0 < -lado - m || b.y0 < -m || b.x1 > 640 + lado + m || b.y1 > 360 + m;
  const cruce = (a, b) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  let reacs = 0;
  lista.forEach((o, i) => {
    if (!visible(o)) return;
    const nombre = o.name ?? '';
    if (nombre.startsWith('reac:')) {
      reacs++;
      const b = caja(o);
      const area = (b.x1 - b.x0) * (b.y1 - b.y0);
      if (fuera(b)) malos.push(`${nombre} se sale de la pantalla`);
      // lo que está más adelante en la lista se dibuja encima
      for (const p of lista.slice(i + 1)) {
        if (!visible(p) || p.name?.startsWith('reac:')) continue;
        const tapa = p.type === 'Container' || (p.who && p.anim);
        if (!tapa) continue;
        if (cruce(b, caja(p)) > area * 0.3) malos.push(`${nombre} tapada por ${p.who ?? p.name ?? 'un cuadro'}`);
      }
    } else if (o.type === 'Container' && (o.name === 'tarjeta' || o.name === 'dialogo')) {
      const b = caja(o);
      if (fuera(b, 4)) malos.push(`un${o.name === 'tarjeta' ? 'a tarjeta' : ' diálogo'} se sale de la pantalla`);
    } else if (o.type === 'BitmapText' && o.text) {
      const b = caja(o);
      // cortado por el borde (no el que espera afuera su entrada)
      const asoma = b.x1 > -lado && b.x0 < 640 + lado && b.y1 > 0 && b.y0 < 360;
      if (asoma && fuera(b, 4)) malos.push(`el texto "${o.text}" se sale de la pantalla`);
    }
  });
  return { fin: false, malos, reacs };
});

const vistos = new Set();
const racha = new Map();
let n = 0, reacs = 0;
const t0 = Date.now();
while (Date.now() - t0 < 120000) {
  const r = await revisar();
  if (r.fin) break;
  reacs = Math.max(reacs, r.reacs);
  for (const k of [...racha.keys()]) if (!r.malos.includes(k)) racha.delete(k);
  for (const m of r.malos) {
    // lo que entra o sale animado pasa por el borde un instante: cuenta solo si se queda
    racha.set(m, (racha.get(m) ?? 0) + 1);
    if (racha.get(m) < 4 || vistos.has(m)) continue;
    vistos.add(m);
    const seg = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`FALLA a los ${seg} s: ${m}`);
    await page.screenshot({ path: `${out}/falla_${String(++n).padStart(2, '0')}.png` });
  }
  await page.waitForTimeout(80);
}
console.log(`la intro duró ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(vistos.size ? `${vistos.size} PROBLEMAS` : 'todo bien: cada reacción, cuadro y texto se ve entero y sin tapar');
await browser.close();
process.exit(vistos.size || logs.length ? 1 : 0);
