// Lotes RAYO_PUNTA, H2_CORTO y G2 en el juego: las tarjetas de la selección, el ícono de la prueba en el menú, el VS
// de 4, el podio con las banderas, las medallas, las tres pantallas, y la jabalina con el rayo en la punta y su trueno.
//   node scripts/prueba-g2.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/g2';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const ctx = await b.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
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
// cada sonido que suena, para buscar el trueno, el furro y la corneta
await ev(() => { window.sonados = []; const sm = window.game.sound; const orig = sm.play.bind(sm); sm.play = (k, c) => { window.sonados.push(k); return orig(k, c); }; });
const sonados = () => ev(() => window.sonados.splice(0));

// 0) los audios y las piezas
const kit = await ev(() => {
  const m = window.game.cache.json.get('manifest');
  const ui = Object.keys(m.ui.interfaz);
  return {
    audio: ['trueno', 'furro', 'corneta_moto'].filter((k) => !window.game.cache.audio.exists(k)).concat(['mercado', 'rio', 'estadio'].filter((k) => !m.audio.ambientes?.[k])),
    ui: ['medallas_16', 'medallas_32', 'medallas_64', 'podio', 'iconos_prueba', 'marco_vs_4', 'pantalla_pausa', 'pantalla_se_acabo', 'pantalla_otra_partidita', 'tarjeta_familia_gg', 'tarjeta_maracuchos_del_lago'].filter((k) => !ui.includes(k) || !window.game.textures.exists(`ui_${k}`)),
  };
});
check(!kit.audio.length, 'los 6 audios nuevos', kit.audio.join(','));
check(!kit.ui.length, 'las piezas de G2 cargadas', kit.ui.join(','));

// 1) la selección con las tarjetas
await ir('Select', { modo: '4v4' });
await p.waitForTimeout(1500);
const sel = await ev(() => { const s = window.game.scene.getScene('Select'); return s.children.list.flatMap((o) => (o.list ?? [o])).filter((o) => o.texture?.key?.startsWith('ui_tarjeta_')).map((o) => o.texture.key); });
check(sel.length === 6, 'selección: las 6 tarjetas del kit', sel.join(','));
await p.screenshot({ path: `${out}/1_seleccion.png` });

// 2) el menú de pruebas con el ícono de la elegida
await ir('Title');
await p.waitForTimeout(1200);
const menu = await ev(() => {
  const s = window.game.scene.getScene('Title');
  s.openMenu(); s.nivel = 'pruebas'; s.sel = s.opciones.findIndex((o) => o.id === 'Jabalina'); s.buildMenu();
  const a = { vis: s.icono?.visible, f: s.icono?.frame.name, lugar: s.lugar?.text };
  s.sel = s.opciones.findIndex((o) => o.id === '<'); s.refresh();
  const b = s.icono?.visible;
  s.sel = s.opciones.findIndex((o) => o.id === 'Jabalina'); s.refresh();
  return { ...a, atras: b };
});
check(menu.vis && Number(menu.f) === 4 && !menu.atras, 'menú: el ícono de 32 de la jabalina junto al lugar, y nada en ATRÁS', JSON.stringify(menu));
await p.screenshot({ path: `${out}/2_menu_pruebas.png` });

// 3) el VS de 4
await ir('Fight', { modo: '4v4', jugador: 'sophie', rival: 'kenji' });
await p.waitForFunction(() => window.game.scene.getScene('Fight')?.ui?.list?.some((o) => o.texture?.key === 'ui_marco_vs_4'), null, { timeout: 40000 }).catch(() => {});
await p.waitForTimeout(900);
const vs = await ev(() => { const s = window.game.scene.getScene('Fight'); const l = s.ui.list; return { marco: l.some((o) => o.texture?.key === 'ui_marco_vs_4'), caras: l.filter((o) => o.texture?.key?.startsWith('retratos:')).map((o) => `${o.texture.key.slice(9)}@${Math.round(o.x)}`) }; });
check(vs.marco && vs.caras.length === 4, 'VS: el marco de 4 con cuatro retratos', vs.caras.join(' '));
await p.screenshot({ path: `${out}/3_vs_4v4.png` });

// 4) las tres pantallas, en la pelea suelta
await ir('Fight', { modo: '1v1', jugador: 'sophie', rival: 'kenji' });
await p.waitForFunction(() => window.game.scene.getScene('Fight')?.phase === 'play', null, { timeout: 40000 }).catch(() => {});
await ev(() => window.game.scene.getScene('Fight').togglePause());
await p.waitForTimeout(300);
check(await ev(() => window.game.scene.getScene('Fight').pauseObjs[0]?.texture?.key === 'ui_pantalla_pausa'), 'pausa: la pantalla tramada del kit');
await p.screenshot({ path: `${out}/4_pausa.png` });
await ev(() => { const s = window.game.scene.getScene('Fight'); s.togglePause(); s.player.hp = 0; s.player.alive = false; s.defeat(); });
await p.waitForTimeout(700);
check(await ev(() => window.game.scene.getScene('Fight').ui.list.some((o) => o.texture?.key === 'ui_pantalla_se_acabo')), 'derrota: SE ACABÓ LA VAINA bajo la lluvia');
await p.screenshot({ path: `${out}/5_se_acabo.png` });
await p.waitForTimeout(1800);
check(await ev(() => window.game.scene.getScene('Fight').ui.list.some((o) => o.texture?.key === 'ui_pantalla_otra_partidita')), '¿OTRA PARTIDITA? en su pantalla de arcade');
await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/6_otra_partidita.png` });

// 5) el medallero con medallas y el podio final con las banderas subiendo
const gira = (idx) => ({ jugador: 'sophie', idx, puntos: [52, 30], equipos: ['familia_gg', 'instituto_nekketsu'], resultados: [{ prueba: 'CROSS', podio: ['sophie', 'kenji', 'rick', 'ryu'] }, { prueba: 'OBST', podio: ['kenji', 'sophie', 'rick', 'ryu'] }] });
await ev((g) => window.game.registry.set('gira', g), gira(2));
await ir('Medallero');
await p.waitForTimeout(1200);
check(await ev(() => window.game.scene.getScene('Medallero').children.list.filter((o) => o.texture?.key === 'ui_medallas_16').length === 2), 'medallero: la medalla de 16 en cada prueba ganada');
await p.screenshot({ path: `${out}/7_medallero.png` });
await ev((g) => window.game.registry.set('gira', g), gira(6));
await ir('Medallero');
await p.waitForTimeout(600);
await p.screenshot({ path: `${out}/8_podio_subiendo.png` });
await p.waitForTimeout(3600);
const podio = await ev(() => { const l = window.game.scene.getScene('Medallero').children.list; return { podio: l.some((o) => o.texture?.key === 'ui_podio'), banderas: l.filter((o) => o.texture?.key?.startsWith('ui_bandera_')).map((o) => `${o.texture.key.slice(11)}@${Math.round(o.x)},${Math.round(o.y)}:${o.anims?.isPlaying ? 'ondea' : 'quieta'}`), m64: l.filter((o) => o.texture?.key === 'ui_medallas_64').length }; });
check(podio.podio && podio.banderas.length === 3 && podio.banderas.every((s) => s.startsWith('venezuela') && s.endsWith('ondea')), 'podio: las tres banderas de la Familia arriba, ondeando', podio.banderas.join(' '));
check(podio.m64 === 2, 'podio: las medallas de 64');
await p.screenshot({ path: `${out}/9_podio.png` });
await ev(() => window.game.registry.remove('gira'));

// 6) la jabalina del Catatumbo: el rayo sale de la punta y truena en el cuadro 2
await ir('Jabalina', { jugador: 'sophie' });
await p.waitForFunction(() => { const s = window.game.scene.getScene('Jabalina'); return s?.fase === 'juego' && s.st === 'carrera' && s.cur?.c.human; }, null, { timeout: 40000 }).catch(() => {});
await sonados();
await ev(() => { const s = window.game.scene.getScene('Jabalina'); s.catatumbo = true; s.x = 300; s.v = 260; s.ang = 40; s.lanza(); });
const rayo = [];
for (let i = 0; i < 12; i++) {
  rayo.push(await ev(() => { const s = window.game.scene.getScene('Jabalina'); const r = s.rayo; const pt = s.puntaJabalina?.(); return r ? { f: r.s.frame.name, x: Math.round(r.s.x), y: Math.round(r.s.y), px: pt ? Math.round(pt[0]) : null, py: pt ? Math.round(pt[1]) : null, trueno: !!r.trueno } : null; }));
  if (i === 5) await p.screenshot({ path: `${out}/10_jabalina_rayo.png` });
  await p.waitForTimeout(50);
}
const s1 = await sonados();
console.log('  rayo:', rayo.filter(Boolean).map((q) => `${q.f}@${q.x},${q.y}${q.trueno ? ' trueno' : ''}`).join(' | '));
check(rayo.some((q) => q?.trueno), 'jabalina: el trueno suena con el rayo', s1.join(','));
check(s1.includes('trueno'), 'jabalina: suena trueno');
await p.waitForTimeout(600);
await ev(() => window.game.scene.getScene('Jabalina').final());
await p.waitForTimeout(800);
check(await ev(() => window.game.scene.getScene('Jabalina').ui.list.filter((o) => o.texture?.key === 'ui_medallas_32').length === 3), 'resultados: oro, plata y bronce de 32');
await p.screenshot({ path: `${out}/11_resultados.png` });

console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien');
await b.close();
process.exit(fallas || logs.length ? 1 : 0);
