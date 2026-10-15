// Lotes VS2, CINTA, GIRA e INTRO en el juego: el VS de 1 contra 1 (judo y pelea), la cinta del cuarto puesto, la ruta
// del avión con los sellos del pasaporte, la azotea con Kenji de espaldas, el desayuno y los rivales en Bogotá y
// Maracaibo.
//   node scripts/prueba-intro2.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/intro2';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
p.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await p.goto(url);
await p.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Title'), null, { timeout: 90000 });
await p.mouse.click(640, 360);
await p.waitForTimeout(300);
let fallas = 0;
const check = (ok, s, extra = '') => { if (!ok) fallas++; console.log(`${ok ? 'ok   ' : 'FALLA'} ${s} ${extra}`); };
const ev = (f, a) => p.evaluate(f, a);
const ir = (e, d) => ev(([e, d]) => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start(e, d); }, [e, d]);

// 0) las piezas
const faltan = await ev(() => ['marco_vs_2', 'cinta_16', 'cinta_32', 'mapa_gira', 'mapa_gira_ruta', 'mapa_vietnam', 'mapa_colombia_venezuela', 'sellos_pasaporte', 'intro_azotea', 'intro_espaldas', 'intro_bogota', 'intro_bogota_lluvia', 'intro_maracaibo', 'intro_desayuno', 'intro_desayuno_mesa'].filter((k) => !window.game.textures.exists(`ui_${k}`)));
check(!faltan.length, 'las 15 piezas nuevas cargadas', faltan.join(','));
check(await ev(() => ['ui_intro_espaldas', 'ui_intro_bogota_lluvia', 'ui_intro_maracaibo', 'ui_intro_desayuno_mesa'].every((k) => window.game.anims.exists(k))), 'sus animaciones');

// 1) el VS de judo y el de la pelea suelta: marco de 2, sin compañeros
for (const [modo, n] of [['judo', 'vs_judo'], ['1v1', 'vs_1v1']]) {
  await ir('Fight', { modo, jugador: 'sophie', rival: 'kenji' });
  await p.waitForFunction(() => window.game.scene.getScene('Fight')?.ui?.list?.some((o) => o.texture?.key === 'ui_marco_vs_2'), null, { timeout: 40000 }).catch(() => {});
  await p.waitForTimeout(900);
  const vs = await ev(() => { const l = window.game.scene.getScene('Fight').ui.list; return { marco: l.some((o) => o.texture?.key === 'ui_marco_vs_2'), cuatro: l.some((o) => o.texture?.key === 'ui_marco_vs_4'), caras: l.filter((o) => o.texture?.key?.startsWith('retratos:') && String(o.frame.name).startsWith('grande')).map((o) => `${o.texture.key.slice(9)}@${Math.round(o.x)},${Math.round(o.y)}${o.flipX ? ' espejo' : ''}`) }; });
  check(vs.marco && !vs.cuatro && vs.caras.length === 2, `${modo}: marco de 1 contra 1 con los dos que pelean`, vs.caras.join(' '));
  check(vs.caras.includes('sophie@150,150') && vs.caras.includes('kenji@490,150 espejo'), `${modo}: en (150, 150) y (490, 150), el de la derecha volteado`);
  await p.screenshot({ path: `${out}/${n}.png` });
}
await ir('Fight', { modo: '4v4', jugador: 'sophie', rival: 'kenji' });
await p.waitForFunction(() => window.game.scene.getScene('Fight')?.ui?.list?.some((o) => o.texture?.key?.startsWith('ui_marco_vs')), null, { timeout: 40000 }).catch(() => {});
check(await ev(() => window.game.scene.getScene('Fight').ui.list.some((o) => o.texture?.key === 'ui_marco_vs_4')), '4v4: sigue con el marco de 4');

// 2) la tabla de resultados con la cinta del cuarto
await ir('Jabalina', { jugador: 'sophie' });
await p.waitForFunction(() => window.game.scene.getScene('Jabalina')?.fase === 'juego', null, { timeout: 40000 }).catch(() => {});
await ev(() => window.game.scene.getScene('Jabalina').final());
await p.waitForTimeout(800);
const tabla = await ev(() => { const l = window.game.scene.getScene('Jabalina').ui.list; return { cinta: l.filter((o) => o.texture?.key === 'ui_cinta_32').map((o) => `${Math.round(o.x)},${Math.round(o.y)}`), medallas: l.filter((o) => o.texture?.key === 'ui_medallas_32').length }; });
check(tabla.cinta.length === 1 && tabla.cinta[0] === '170,218' && tabla.medallas === 3, 'resultados: tres medallas y la cinta del cuarto en (170, 218)', JSON.stringify(tabla));
await p.screenshot({ path: `${out}/resultados_cinta.png` });

// 3) la intro, toma por toma: se para la intro entera y se corre cada toma sola
await ir('Intro');
await p.waitForTimeout(1500);
await ev(() => { window.game.scene.getScene('Intro').done = true; });
await p.waitForTimeout(7000);
const toma = (nombre, args = [], limpiar = false) => ev(([n, a, l]) => { const s = window.game.scene.getScene('Intro'); s.done = false; s.tweens.killAll(); s.time.removeAllEvents(); if (l) s.clear(); window.tomaFin = false; s[n](() => true, ...a).then(() => { window.tomaFin = true; }); }, [nombre, args, limpiar]);

// la ruta: el mapa del kit, el avión por los tramos y los sellos
await toma('ruta');
await p.waitForTimeout(2200);
const ruta = await ev(() => { const s = window.game.scene.getScene('Intro'); const todo = []; const v = (o) => { todo.push(o); (o.list ?? []).forEach(v); }; s.layer.list.forEach(v); return { mapa: todo.some((o) => o.texture?.key === 'ui_mapa_gira'), ruta: todo.some((o) => o.texture?.key === 'ui_mapa_gira_ruta'), viejo: todo.some((o) => o.texture?.key === 'mapa_mundo') }; });
check(ruta.mapa && ruta.ruta && !ruta.viejo, 'ruta: el mapa de la gira y su ruta, sin el mapa viejo');
await p.screenshot({ path: `${out}/ruta_vuelo.png` });
await p.waitForFunction(() => window.tomaFin, null, { timeout: 30000 }).catch(() => {});
const sellos = await ev(() => { const s = window.game.scene.getScene('Intro'); return s.layer.list.filter((o) => o.list?.some((x) => x.texture?.key === 'ui_sellos_pasaporte')).map((c) => { const i = c.list.find((x) => x.texture?.key === 'ui_sellos_pasaporte'); const t = c.list.filter((x) => x.type === 'BitmapText').map((x) => x.text); return `${i.frame.name}:${t.join('/')}@${Math.round(c.x)}`; }); });
check(sellos.length === 4 && sellos[0].startsWith('0:JAPÓN/GIRA NEKKETSU') && sellos[3].startsWith('3:VENEZUELA'), 'ruta: los 4 sellos del pasaporte con su país', sellos.join(' | '));
await p.waitForTimeout(200);
await p.screenshot({ path: `${out}/ruta_sellos.png` });

// los rivales: Bogotá y Maracaibo
await toma('rivales', ['intro_bogota', 'intro_bogota_lluvia', 'rolos_de_chapinero', 'BOGOTÁ · LOS ROLOS']);
await p.waitForTimeout(400);
await p.screenshot({ path: `${out}/bogota_silueta.png` });
await p.waitForTimeout(700);
const rival = () => ev(() => { const s = window.game.scene.getScene('Intro'); const l = s.layer.list; const i = (k) => l.findIndex((o) => o.texture?.key === k); const caras = l.filter((o) => o.texture?.key?.startsWith('retratos:')); return { pres: i('ui_intro_presentacion'), lluvia: i('ui_intro_bogota_lluvia'), caras: caras.map((o) => `${Math.round(o.x)},${Math.round(o.y)}:${o.isTinted ? 'silueta' : 'color'}`), primera: l.indexOf(caras[0]), nombres: l.filter((o) => o.type === 'BitmapText' && o.visible && Math.abs(o.y - 260) < 40).map((o) => `${o.text}@${o.scaleX}:${Math.round(o.width)}`) }; });
let rv = await rival();
console.log('  bogotá:', JSON.stringify(rv));
check(rv.pres >= 0 && rv.pres < rv.primera && rv.lluvia > rv.primera, 'bogotá: la escena, la presentación, los retratos y la lluvia encima');
check(rv.caras.length === 4 && rv.caras.every((c) => c.endsWith('color')) && rv.caras.every((c) => c.split(',')[1].startsWith('180')), 'bogotá: los 4 revelados en sus huecos de y 132');
check(rv.nombres.length === 4 && rv.nombres.every((n) => Number(n.split(':')[1]) <= 104), 'bogotá: los nombres caben en su placa de 104', rv.nombres.join(' '));
await p.screenshot({ path: `${out}/bogota.png` });
await p.waitForFunction(() => window.tomaFin, null, { timeout: 10000 }).catch(() => {});
await toma('rivales', ['intro_maracaibo', null, 'maracuchos_del_lago', 'MARACAIBO · LOS MARACUCHOS']);
await p.waitForTimeout(1100);
rv = await rival();
console.log('  maracaibo:', JSON.stringify(rv));
const hm = await ev(() => window.game.cache.json.get('manifest').ui.interfaz.intro_maracaibo.huecos?.map(([x, y, w, h]) => `${x - 80 + w / 2},${y + h / 2}`));
check(rv.pres >= 0 && rv.lluvia < 0 && hm && rv.caras.map((c) => c.split(':')[0]).join(' ') === hm.join(' '), 'maracaibo: sus propios huecos, con la presentación y sin lluvia', hm?.join(' '));
check(rv.nombres.length === 4 && rv.nombres.every((n) => Number(n.split(':')[1]) <= 104), 'maracaibo: los nombres caben (ABUELA NERVA a 1,5)', rv.nombres.join(' '));
await p.screenshot({ path: `${out}/maracaibo.png` });
await p.waitForFunction(() => window.tomaFin, null, { timeout: 10000 }).catch(() => {});

// la azotea: Kenji de espaldas en (380, 334), animado, y el diálogo arriba
await toma('azotea');
await p.waitForTimeout(2200);
const az = await ev(() => { const s = window.game.scene.getScene('Intro'); const e = s.layer.list.find((o) => o.texture?.key === 'ui_intro_espaldas'); const d = s.layer.list.find((o) => o.name === 'dialogo'); return { fondo: s.layer.list.some((o) => o.texture?.key === 'ui_intro_azotea'), e: e ? `${Math.round(e.x)},${Math.round(e.y)}:${e.anims.isPlaying}` : null, dialogoY: d?.y ?? null }; });
check(az.fondo && az.e === '380,334:true', 'azotea: Kenji de espaldas animado en (380, 334)', JSON.stringify(az));
check(az.dialogoY !== null && az.dialogoY < 0, 'azotea: el diálogo va arriba');
await p.screenshot({ path: `${out}/azotea.png` });
await p.waitForTimeout(1600);
await p.screenshot({ path: `${out}/azotea_volteado.png` });
await p.waitForFunction(() => window.tomaFin, null, { timeout: 20000 }).catch(() => {});

// el desayuno: fondo, los cuatro retratos y la mesa encima
await toma('desayuno', [], true);
await p.waitForTimeout(800);
const des = await ev(() => { const s = window.game.scene.getScene('Intro'); const l = s.layer.list; const i = (k) => l.findIndex((o) => o.texture?.key === k); return { fondo: i('ui_intro_desayuno'), mesa: i('ui_intro_desayuno_mesa'), caras: l.map((o, k) => (o.texture?.key?.startsWith('retratos:') ? k : -1)).filter((k) => k >= 0), anim: l[i('ui_intro_desayuno_mesa')]?.anims?.isPlaying }; });
check(des.fondo >= 0 && des.caras.length === 4 && des.caras.every((k) => k > des.fondo && k < des.mesa) && des.anim, 'desayuno: fondo, las 4 caras y la mesa animada encima', JSON.stringify(des));
await p.screenshot({ path: `${out}/desayuno.png` });
await p.waitForTimeout(1400);
await p.screenshot({ path: `${out}/desayuno_arepa.png` });

console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
