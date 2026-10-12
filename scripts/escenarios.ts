/**
 * Escenarios de PixelForja (lote E): toma cada layout de data/stages/ y deja su carpeta en public/assets/escenarios/<id>/
 * con la entrada estable de PixelForja (generarEscenario). También escribe public/assets/escenarios/index.json, que el
 * juego lee para saber qué pruebas ya tienen arte (las que no, se ven en gris).
 * Si un layout está mal o una de las 9 pruebas falla, no escribe nada de ese escenario y sale con código 1.
 * Solo regenera los que ya tienen arte aprobado (los de index.json): uno nuevo entra cuando se nombra, después de que
 * Rick apruebe su ficha y sus postales en PixelForja.
 *   npm run escenarios                     regenera los que ya tienen arte
 *   npm run escenarios -- saigon_rio       solo esos (y los suma si son nuevos)
 *   npm run escenarios -- --validar        valida todos los layouts y corre las 9 pruebas, sin escribir nada
 *   npm run escenarios -- --forja <ruta>   con otra copia de PixelForja (por ejemplo, la rama de un lote sin mezclar)
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const fi = args.indexOf('--forja');
const forja = fi >= 0 ? args.splice(fi, 2)[1] : join(root, 'tools', 'pixel_forja');
const vi = args.indexOf('--validar');
const validar = vi >= 0;
if (validar) args.splice(vi, 1);
const solo = args;
const api = join(forja, 'src', 'engine', 'world', 'oblique', 'index.ts');
if (!existsSync(api)) throw new Error(`Esta copia de PixelForja no tiene escenarios oblicuos todavía (lote E1): ${forja}`);
const { generarEscenario, validateLayout } = await import(pathToFileURL(api).href);

// los dos equipos usan el contorno del kit; la prueba de legibilidad mide contra ese color
const CONTORNOS = ['#1e1418'];

const stages = join(root, 'data', 'stages');
const out = join(root, 'public', 'assets', 'escenarios');
const indexPath = join(out, 'index.json');
const index: Record<string, { nombre: string; generado: string }> = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : {};
let fallas = 0;
for (const f of readdirSync(stages).filter((n) => n.endsWith('.layout.json'))) {
  const id = basename(f, '.layout.json');
  if (solo.length ? !solo.includes(id) : !validar && !index[id]) continue;
  const L = JSON.parse(readFileSync(join(stages, f), 'utf8'));
  const t0 = Date.now();
  let r;
  try {
    r = generarEscenario(L, { contornos: CONTORNOS });
  } catch (e) {
    // un país cuyo estilo PixelForja todavía no pinta: se revisa la geometría y el arte espera su lote
    const v = validateLayout(L);
    for (const a of v.avisos) console.log(`  aviso ${id}: ${a}`);
    if (v.errores.length) { fallas++; console.error(`  ${id}: NO SALE\n${v.errores.map((x: string) => `    ${x}`).join('\n')}`); continue; }
    console.log(`  ${id}: la geometría valida; el arte espera (${(e as Error).message})`);
    if (!validar) fallas++;
    continue;
  }
  for (const a of r.avisos) console.log(`  aviso ${id}: ${a}`);
  if (!r.ok) {
    fallas++;
    console.error(`  ${id}: NO SALE\n${r.errores.map((e: string) => `    ${e}`).join('\n')}`);
    continue;
  }
  if (validar) {
    console.log(`  ${id}: ${(r.pruebas as { ok: boolean }[]).length} pruebas pasan en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    continue;
  }
  const dir = join(out, id);
  rmSync(dir, { recursive: true, force: true });
  for (const a of r.archivos as { nombre: string; bytes: Uint8Array }[]) {
    const p = join(dir, a.nombre);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, a.bytes);
  }
  index[id] = { nombre: L.nombre ?? id, generado: new Date().toISOString().slice(0, 10) };
  const pruebas = r.pruebas as { ok: boolean }[];
  console.log(`  ${id}: listo en ${((Date.now() - t0) / 1000).toFixed(1)} s, ${pruebas.filter((p) => p.ok).length} de ${pruebas.length} pruebas (ver verificacion.md)`);
}
mkdirSync(out, { recursive: true });
if (!validar) writeFileSync(indexPath, JSON.stringify(index, null, 1));
if (fallas) process.exit(1);
