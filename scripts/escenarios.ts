/**
 * Escenarios de PixelForja (lote E): toma cada layout de data/stages/ y deja su carpeta en public/assets/escenarios/<id>/,
 * con el formato del pedido (10.3). También escribe public/assets/escenarios/index.json, que el juego lee para saber
 * qué pruebas ya tienen arte (las que no, se ven en gris).
 *   npm run escenarios                     todos
 *   npm run escenarios -- saigon_hem       solo esos
 *   npm run escenarios -- --forja <ruta>   con otra copia de PixelForja (por ejemplo, la rama de un lote sin mezclar)
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const fi = args.indexOf('--forja');
const forja = fi >= 0 ? args.splice(fi, 2)[1] : join(root, 'tools', 'pixel_forja');
const solo = args;
const oblique = join(forja, 'src', 'engine', 'world', 'oblique');
if (!existsSync(join(oblique, 'exportar.ts'))) throw new Error(`Esta copia de PixelForja no tiene escenarios oblicuos todavía (lote E1): ${forja}`);
const { renderEscena } = await import(pathToFileURL(join(oblique, 'escena.ts')).href);
const { exportarEscena } = await import(pathToFileURL(join(oblique, 'exportar.ts')).href);
const { validateLayout } = await import(pathToFileURL(join(oblique, 'layout.ts')).href);

const stages = join(root, 'data', 'stages');
const out = join(root, 'public', 'assets', 'escenarios');
const indexPath = join(out, 'index.json');
const index: Record<string, { nombre: string; generado: string }> = existsSync(indexPath) ? JSON.parse(readFileSync(indexPath, 'utf8')) : {};
for (const f of readdirSync(stages).filter((n) => n.endsWith('.layout.json'))) {
  const id = basename(f, '.layout.json');
  if (solo.length && !solo.includes(id)) continue;
  const L = JSON.parse(readFileSync(join(stages, f), 'utf8'));
  const v = validateLayout(L);
  if (v.errores?.length) throw new Error(`${f}: ${v.errores.join(', ')}`);
  for (const a of v.avisos ?? []) console.log(`  aviso ${id}: ${a}`);
  const t0 = Date.now();
  const dir = join(out, id);
  rmSync(dir, { recursive: true, force: true });
  for (const a of exportarEscena(renderEscena(L)) as { nombre: string; bytes: Uint8Array }[]) {
    // las postales y la ficha son para aprobar en PixelForja; el juego no las carga
    if (a.nombre.startsWith('postales/')) continue;
    const p = join(dir, a.nombre);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, a.bytes);
  }
  index[id] = { nombre: L.nombre ?? id, generado: new Date().toISOString().slice(0, 10) };
  console.log(`  ${id}: listo en ${((Date.now() - t0) / 1000).toFixed(1)} s`);
}
mkdirSync(out, { recursive: true });
writeFileSync(indexPath, JSON.stringify(index, null, 1));
