// Đá cầu: las jugadas de tres toques (como en el vóley, con la chilena) con tu compañera. Un bot hace de ti dentro de la página.
//  1. Le armas tú (patada) cuando ella está más cerca de la red: ella corre al armado, salta y remata.
//  2. Ella recibe y te arma a ti junto a la red: el círculo naranja dice dónde saltar y rematas.
//  3. Si estás más cerca de la red, tu patada es un pase alto a ella, que te la arma de vuelta (o, si ella ya
//     subió, el armado para ella).
//  4. Un partido de máquina contra máquina: los dos lados juegan a tres toques y rematan.
//   node scripts/prueba-voley-jugadas.mjs [url] [carpeta]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const url = process.argv[2] ?? 'http://localhost:5173/';
const out = process.argv[3] ?? 'capturas/dacau-jugadas';
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
const logs = [];
p.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));
await p.goto(url);
await p.waitForFunction(() => window.game?.scene.isActive('Tap'), null, { timeout: 60000 });
await p.mouse.click(400, 200);
let fallas = 0;
const check = (ok, s, extra = '') => { if (!ok) fallas++; console.log(`${ok ? 'ok   ' : 'FALLA'} ${s} ${extra}`); };

await p.evaluate(() => { const g = window.game; g.scene.getScenes(false).forEach((x) => { const st = x.sys.settings.status; if (st >= 3 && st <= 7) g.scene.stop(x.scene.key); }); g.scene.start('DaCau', { jugador: 'sophie' }); });
await p.waitForFunction(() => window.game.scene.getScene('DaCau')?.fase === 'juego', null, { timeout: 30000 });

// el bot: tú. Persigue el armado que es para ti, salta cuando toca y le pega arriba; si no, quieto
await p.evaluate(() => {
  const s = window.game.scene.getScene('DaCau');
  window.__log = [];
  const orig = s.tocar.bind(s);
  s.tocar = (q, quiere, malo) => { const c = s.cau; const n = c.n; orig(q, quiere, malo); if (c.n !== n || c.en === 'piso') window.__log.push(`${q.c.human ? 'yo' : q.c.team === 0 ? 'compa' : 'rival'}:${c.ultimoTiro}`); };
  window.__orden = null;
  s.pad.read = () => {
    const me = s.pat[0], c = s.cau;
    let x = 0, jump = false, punch = false, kick = false;
    if (window.__orden) { punch = window.__orden === 'patada'; kick = window.__orden === 'puño'; if (s.alcance(me) !== null) window.__orden = null; else { kick = punch = false; } }
    if (s.armadaPara(me)) {
      const pr = s.puntoRemate();
      if (pr) { const d = pr.x - 4 - me.x; x = Math.abs(d) > 4 ? Math.sign(d) : 0; if (me.st === 'piso' && pr.t < 0.36 && Math.abs(pr.x - me.x) < 22) jump = true; }
      if (me.st === 'aire' && s.alcance(me) !== null && c.vz < 0) kick = true;
    }
    return { x, y: 0, run: true, pressed: { punch, kick, jump, special: false, start: false, back: false }, held: { special: false } };
  };
});

/** Arma la situación: dónde estás tú y tu compañera, y la pelota que viene. */
const jugada = (yo, compa, desde, cae, alto, orden) => p.evaluate(([yo, compa, desde, cae, alto, orden]) => {
  const s = window.game.scene.getScene('DaCau');
  const [me, co] = s.pat.filter((q) => q.c.team === 0);
  s.pausaT = 0; s.marcador = [0, 0];
  for (const q of s.pat) { q.x = q.casa; q.z = 0; q.vz = 0; q.st = 'piso'; q.golpeT = 0; q.plan = { n: -1, tipo: 'bien', reaccion: 0, ruido: 0 }; }
  me.x = yo; co.x = compa;
  const c = s.cau; const rival = s.pat.find((q) => q.c.team === 1);
  c.en = 'aire'; c.x = desde; c.z = 70; c.lado = 1; c.toques = 1; c.ultimo = rival; c.ultimoTiro = 'patada';
  s.lanzar(cae, alto);
  window.__log = []; window.__orden = orden;
}, [yo, compa, desde, cae, alto, orden]);
const esperar = async (ms) => { await p.waitForTimeout(ms); return p.evaluate(() => window.__log.slice()); };

// 1. tú atrás recibes y le armas con patada; ella está en la red
let ok1 = 0;
for (let i = 0; i < 4; i++) {
  await jugada(150, 250, 360, 150, 110, 'patada');
  if (i === 0) { await p.waitForTimeout(1500); await p.screenshot({ path: `${out}/1_armado_para_ella.png` }); }
  const l = await esperar(i === 0 ? 2500 : 4000);
  const bien = l[0] === 'yo:pase' && l[1] === 'compa:chilena';
  if (bien) ok1++;
  console.log('  jugada 1:', l.join(' → '));
}
check(ok1 >= 3, 'le armas y ella salta a rematar', `${ok1} de 4`);

// 2. ella recibe atrás y te arma a ti en la red: rematas
let ok2 = 0;
for (let i = 0; i < 4; i++) {
  await jugada(250, 130, 360, 130, 110, null);
  if (i === 0) {
    await p.waitForFunction(() => window.__log.length >= 1, null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(500);
    const marca = await p.evaluate(() => { const m = window.game.scene.getScene('DaCau').cau.marca; return { v: m.visible, color: m.strokeColor }; });
    check(marca.v && marca.color === 0xff8020, 'el círculo naranja marca dónde saltar');
    await p.screenshot({ path: `${out}/2_armado_para_ti.png` });
  }
  const l = await esperar(4000);
  if (l[0] === 'compa:pase' && l[1] === 'yo:chilena') ok2++;
  console.log('  jugada 2:', l.join(' → '));
}
check(ok2 >= 3, 'ella recibe, te arma y rematas', `${ok2} de 4`);

// 3. estás en la red y recibes tú: tu patada es un pase alto a ella, que te la arma de vuelta y rematas
let ok3 = 0;
for (let i = 0; i < 3; i++) {
  await jugada(250, 110, 360, 250, 110, 'patada');
  const l = await esperar(5500);
  // si ella ya subió a la red, tu patada es el armado para ella: también vale
  if ((l[0] === 'yo:recibo' && l[1] === 'compa:pase' && l[2] === 'yo:chilena') || (l[0] === 'yo:pase' && l[1] === 'compa:chilena')) ok3++;
  console.log('  jugada 3:', l.join(' → '));
}
check(ok3 >= 2, 'tu patada desde la red termina en chilena (de ella o tuya)', `${ok3} de 3`);

// 4. máquina contra máquina: tú también la máquina
await p.evaluate(() => { const s = window.game.scene.getScene('DaCau'); s.pat[0].c.human = false; s.marcador = [0, 0]; s.alSaque(0); window.__log = []; });
// el đá cầu se juega a 5: el marcador vuelve a cero para que el partido no se acabe antes de contar las jugadas
for (let i = 0; i < 15; i++) { await p.waitForTimeout(5000); await p.evaluate(() => { const s = window.game.scene.getScene('DaCau'); if (Math.max(...s.marcador) >= 3) s.marcador = [0, 0]; }); }
const l4 = await p.evaluate(() => window.__log.slice());
const rem = [0, 1].map((t) => l4.filter((x) => x.endsWith(':chilena') && (t === 0 ? !x.startsWith('rival') : x.startsWith('rival'))).length);
const arm = l4.filter((x) => x.endsWith(':pase')).length;
console.log(`  partido: ${l4.length} toques, ${arm} armados, chilenas ${rem.join(' / ')}`);
check(arm >= 4 && rem[0] >= 2 && rem[1] >= 2, 'los dos lados arman y rematan');
await p.screenshot({ path: `${out}/4_partido.png` });

console.log(logs.length ? logs.join('\n') : 'sin errores');
console.log(fallas ? `${fallas} FALLAS` : 'todo bien: las jugadas de tres toques salen en el đá cầu');
await b.close();
process.exit(fallas ? 1 : 0);
