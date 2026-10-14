// La palanca táctil con un dedo de verdad (eventos táctiles del navegador): arrastrar mucho hacia abajo hasta el
// borde de la franja y, sin levantar el dedo, subirlo un poco tiene que subir al atleta (antes se quedaba pegado
// abajo hasta volver a donde se había puesto el dedo). Y si el dedo se pierde, la palanca se suelta sola.
//   node scripts/prueba-palanca.mjs [url]
import { chromium } from '@playwright/test';

const url = process.argv[2] ?? 'http://localhost:5173/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const logs = [];
p.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await p.goto(url);
await p.waitForFunction(() => window.game?.scene.isActive('Tap'), null, { timeout: 60000 });
await p.touchscreen.tap(400, 200);
await p.evaluate(() => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start('CrossCountry', { jugador: 'sophie', tramo: 1 }); });
await p.waitForFunction(() => window.game.scene.getScene('CrossCountry')?.fase === 'juego', null, { timeout: 30000 });
const cdp = await p.context().newCDPSession(p);
const toque = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
const yo = () => p.evaluate(() => { const a = window.game.scene.getScene('CrossCountry').gente2[0].a; return { x: a.x, y: a.y }; });
let fallas = 0;
const check = (ok, s) => { if (!ok) fallas++; console.log(`${ok ? 'ok   ' : 'FALLA'} ${s}`); };
// el dedo abajo a la izquierda, y lo arrastra mucho hacia abajo (y un poco a la derecha)
await toque('touchStart', 110, 300);
for (let k = 1; k <= 8; k++) { await toque('touchMove', 110 + k * 4, 300 + k * 10); await p.waitForTimeout(40); }
await p.waitForTimeout(3000);
const abajo = await yo();
check(abajo.y > 120, `arrastrando hacia abajo llega al borde de abajo (y ${abajo.y.toFixed(1)})`);
// sin soltar, sube el dedo un poquito (sigue más abajo de donde lo puso al principio)
for (let k = 1; k <= 4; k++) { await toque('touchMove', 142, 380 - k * 9); await p.waitForTimeout(40); }
await p.waitForTimeout(900);
const sube = await yo();
check(sube.y < abajo.y - 8, `subiendo el dedo un poco, sube (y ${abajo.y.toFixed(1)} → ${sube.y.toFixed(1)})`);
// el dedo se pierde sin "levantar" (como en el borde del iPhone): la palanca no se queda apretada
await toque('touchMove', 142, 300);
await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
await p.waitForTimeout(300);
const a1 = await yo();
await p.waitForTimeout(700);
const a2 = await yo();
check(Math.abs(a2.y - a1.y) < 2 && Math.abs(a2.x - a1.x) < 2, `si el dedo se pierde, se queda quieta (y ${a1.y.toFixed(1)} → ${a2.y.toFixed(1)})`);
console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
