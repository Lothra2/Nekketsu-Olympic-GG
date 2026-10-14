// Interfaz G1 y vehículos D2: que las piezas carguen (también desde el paquete del artifact), los botones táctiles
// del kit, el marcador de la pelea, los letreros con fondo, y el ferry, las motos, el xích lô, los jacintos y la
// fruta regada del Cross Country.
//   node scripts/prueba-g1d2.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/g1d2';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
const p = await ctx.newPage();
const logs = [];
p.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
p.on('console', (m) => { if (m.type() === 'error' && !/GPU stall|Texture key already/.test(m.text())) logs.push(m.text()); });
await p.goto(url);
await p.waitForFunction(() => window.game?.scene.isActive('Tap') || window.game?.scene.isActive('Intro') || window.game?.scene.isActive('Title'), null, { timeout: 90000 });
await p.waitForTimeout(400);
await p.touchscreen.tap(640, 360);
await p.waitForTimeout(300);
const ev = (f, a) => p.evaluate(f, a);
const ir = (e, d) => ev(([e, d]) => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start(e, d); }, [e, d]);
let fallas = 0;
const ok = (c, s) => { console.log(`${c ? 'ok' : 'FALLA'}: ${s}`); if (!c) fallas++; };

// 1. las piezas cargadas
const tex = await ev(() => {
  const t = window.game.textures, a = window.game.anims;
  const ui = ['control_a', 'control_b', 'control_c', 'control_especial', 'control_pausa', 'control_palanca', 'control_palanca_bola', 'barra_marco', 'barra_aguante', 'barra_nekketsu', 'barra_nekketsu_llena', 'marco_retrato_40', 'banner_ya', 'banner_gol', 'banner_meta', 'numeros', 'numeros_placa', 'logo'];
  const veh = ['ferry', 'xich_lo', 'moto_rojo', 'moto_azul', 'moto_amarillo', 'moto_verde', 'jacintos', 'frutas_regadas'];
  return {
    faltanUi: ui.filter((k) => !t.exists(`ui_${k}`)),
    faltanVeh: veh.filter((k) => !t.exists(`veh_${k}`)),
    anims: ['veh_ferry_andando', 'veh_ferry_atracado', 'veh_moto_rojo_corneta', 'veh_moto_verde_frenando', 'veh_xich_lo_andando', 'ui_logo'].filter((k) => !a.exists(k)),
    numeros: t.get('ui_numeros').frameTotal,
  };
});
ok(!tex.faltanUi.length, `piezas de interfaz cargadas ${tex.faltanUi.join(',')}`);
ok(!tex.faltanVeh.length, `vehículos cargados ${tex.faltanVeh.join(',')}`);
ok(!tex.anims.length, `animaciones de vehículos y logo ${tex.anims.join(',')}`);
ok(tex.numeros >= 15, `los números de TV en cuadros (${tex.numeros})`);

// 2. la pelea: marcador del kit, reloj de TV y botones táctiles
await ir('Fight', { modo: '1v1', jugador: 'sophie', rival: 'kenji' });
await p.waitForFunction(() => window.game.scene.getScene('Fight')?.phase === 'play', null, { timeout: 30000 }).catch(() => {});
await p.waitForTimeout(600);
const pelea = await ev(() => {
  const s = window.game.scene.getScene('Fight');
  const hud = s.hudKit ?? [];
  const tp = s.pad?.touch;
  return {
    hud: hud.length, vida: hud.map((h) => !!h.vida), tv: s.relojTxt?.constructor?.name ?? null,
    tactil: !!tp, botones: tp ? tp.buttons.map((x) => x.g.list[0]?.texture?.key ?? x.g.list[0]?.type) : [],
  };
});
ok(pelea.hud === 2 && pelea.vida.every(Boolean), `marcador con piezas del kit en los dos lados (${pelea.hud})`);
ok(pelea.tactil && pelea.botones.every((k) => String(k).startsWith('ui_control_')), `botones táctiles del kit: ${pelea.botones.join(',')}`);
await ev(() => { const s = window.game.scene.getScene('Fight'); s.player.meter = 100; s.actors.find((a) => a !== s.player).hp *= 0.2; });
await p.waitForTimeout(400);
await p.screenshot({ path: `${out}/01_pelea_marcador.png` });
// el botón A apretado cambia de cuadro
await p.touchscreen.tap(1056, 604);
const llena = await ev(() => window.game.scene.getScene('Fight').hudKit[0].llena.visible);
ok(llena, 'la barra Nekketsu llena brilla');
// letreros con fondo
await ev(() => { const s = window.game.scene.getScene('Fight'); void s.banner('¡YA!', 'fuente_titulo', 5, 1500); });
await p.waitForTimeout(350);
await p.screenshot({ path: `${out}/02_letrero_ya.png` });
await p.waitForTimeout(1600);
await ev(() => { const s = window.game.scene.getScene('Fight'); void s.banner('¡GANA LA FAMILIA GG!', 'fuente_titulo', 2, 1500); });
await p.waitForTimeout(350);
await p.screenshot({ path: `${out}/03_letrero_gana.png` });
await p.waitForTimeout(1600);

// 3. la pelea del judo con reloj de TV
await ir('Fight', { modo: '1v1', jugador: 'sophie', rival: 'kenji', judo: true });
await p.waitForTimeout(5000);
const judo = await ev(() => { const s = window.game.scene.getScene('Fight'); return { judo: !!s.judo, tv: s.relojTxt?.constructor?.name, hud: s.hudKit?.length }; });
console.log('judo', JSON.stringify(judo));
await p.screenshot({ path: `${out}/04_judo_marcador.png` });

// 4. el Cross: las motos en el hẻm
await ir('CrossCountry', { jugador: 'sophie', tramo: 0 });
await p.waitForFunction(() => window.game.scene.getScene('CrossCountry')?.fase === 'juego', null, { timeout: 30000 }).catch(() => {});
let moto = null;
for (let i = 0; i < 40 && !moto; i++) {
  await p.waitForTimeout(500);
  moto = await ev(() => { const s = window.game.scene.getScene('CrossCountry'); const m = s.vehiculos.find((v) => v.spr); return m ? { id: m.id, anim: m.spr.anims.currentAnim?.key } : null; });
}
ok(!!moto && /^moto_/.test(moto.id), `una moto del kit en el hẻm: ${JSON.stringify(moto)}`);
// que llegue cerca de la persona para pitar
await ev(() => { const s = window.game.scene.getScene('CrossCountry'); const m = s.vehiculos.find((v) => v.spr); const a = s.gente2[0].a; if (m) { m.y = a.y; m.x = a.x + 80; } });
await p.waitForTimeout(120);
const pita = await ev(() => { const s = window.game.scene.getScene('CrossCountry'); const m = s.vehiculos.find((v) => v.spr); return m?.anim; });
ok(pita === 'corneta' || pita === 'frenando', `la moto pita al acercarse (${pita})`);
await p.screenshot({ path: `${out}/05_moto.png` });
await p.waitForTimeout(250);
await p.screenshot({ path: `${out}/06_moto_atropella.png` });

// 5. el mercado: la fruta regada
await ir('CrossCountry', { jugador: 'sophie', tramo: 1 });
await p.waitForFunction(() => window.game.scene.getScene('CrossCountry')?.fase === 'juego', null, { timeout: 30000 }).catch(() => {});
const fruta = await ev(() => {
  const s = window.game.scene.getScene('CrossCountry');
  const c = s.cajas.find((b) => b.tipo === 'puesto_frutas');
  if (!c) return null;
  const a = s.gente2[0].a;
  a.x = c.x + c.w + 40; a.y = c.y + c.d / 2;
  s.derramar(c, s.gente2[1].a);
  const f = s.frutas[s.frutas.length - 1];
  return { tipo: f.g.type, n: f.g.list?.length ?? 0 };
});
ok(fruta?.tipo === 'Container' && fruta.n > 0, `la fruta regada del kit (${JSON.stringify(fruta)})`);
await p.waitForTimeout(300);
await p.screenshot({ path: `${out}/07_fruta.png` });

// 6. el río: ferry, jacintos y xích lô
await ir('CrossCountry', { jugador: 'sophie', tramo: 2 });
await p.waitForFunction(() => window.game.scene.getScene('CrossCountry')?.fase === 'juego', null, { timeout: 30000 }).catch(() => {});
await ev(() => { const s = window.game.scene.getScene('CrossCountry'); const a = s.gente2[0].a; a.x = s.ferry.x0 - 60; a.y = s.ferry.y + 20; });
await p.waitForTimeout(800);
const ferry = await ev(() => { const s = window.game.scene.getScene('CrossCountry'); return { spr: !!s.ferry?.spr, anim: s.ferry?.spr?.anims.currentAnim?.key }; });
ok(ferry.spr, `el ferry del kit (${ferry.anim})`);
await p.screenshot({ path: `${out}/08_ferry.png` });
await ev(() => { const s = window.game.scene.getScene('CrossCountry'); s.ferry.quieto = 0; });
await p.waitForTimeout(900);
const anda = await ev(() => window.game.scene.getScene('CrossCountry').ferry.spr.anims.currentAnim?.key);
ok(anda === 'veh_ferry_andando', `el ferry anda al cruzar (${anda})`);
await p.screenshot({ path: `${out}/09_ferry_andando.png` });
// jacintos en el río hondo
await ev(() => { const s = window.game.scene.getScene('CrossCountry'); const w = s.L.agua.find((x) => x.nivel >= 2); const a = s.gente2[0].a; if (w) { a.x = w.x0 + 30; a.y = (w.y0 ?? 0) + 40; } s.jacT = 0; });
let jac = null;
for (let i = 0; i < 12 && !jac; i++) { await p.waitForTimeout(400); jac = await ev(() => { const s = window.game.scene.getScene('CrossCountry'); return s.jacintos.length ? s.jacintos[0].g.type : null; }); }
ok(jac === 'Sprite', `jacintos del kit (${jac})`);
await p.screenshot({ path: `${out}/10_jacintos.png` });
// el xích lô más adelante
await ev(() => { const s = window.game.scene.getScene('CrossCountry'); const a = s.gente2[0].a; a.x = 2700; a.y = 60; s.vehT = s.vehT.map(() => 0); });
let xl = null;
for (let i = 0; i < 20 && !xl; i++) { await p.waitForTimeout(400); xl = await ev(() => { const s = window.game.scene.getScene('CrossCountry'); return s.vehiculos.find((v) => v.id === 'xich_lo') ? 'xich_lo' : null; }); }
ok(xl === 'xich_lo', 'el xích lô del kit');
await p.waitForTimeout(600);
await p.screenshot({ path: `${out}/11_xich_lo.png` });

// 7. un letrero de evento con fondo (¡GOL!) en el fútbol
await ir('Futbol', { jugador: 'sophie' });
await p.waitForTimeout(4000);
await ev(() => { const s = window.game.scene.getScene('Futbol'); void s.banner('¡GOL!', 'fuente_titulo', 3, 1500); });
await p.waitForTimeout(350);
await p.screenshot({ path: `${out}/12_gol.png` });

console.log(logs.length ? logs.join('\n') : 'sin errores en la consola');
console.log(fallas || logs.some((l) => l.startsWith('pageerror')) ? `FALLAS: ${fallas}` : 'todo bien');
await b.close();
