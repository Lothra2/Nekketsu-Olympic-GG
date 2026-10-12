/**
 * Kit del juego, generado con PixelForja (submódulo en tools/pixel_forja).
 *   npm run kit            todo
 *   npm run kit -- --rapido  2 animaciones por pack, para probar
 *
 * Puente hasta que llegue el lote I (kit a medida por configuración): usa el kit deportivo del motor con dos packs
 * propios del juego, y le suma las fuentes y los sonidos. Lo propio del juego vive aquí, no en PixelForja.
 */
import { mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSportsKit, SPORT_PACKS } from '../tools/pixel_forja/src/engine/kit/sportskit.ts';
import { migrateFicha, validateFicha, isHuman, type HumanFicha, type AnimalFicha } from '../tools/pixel_forja/src/engine/sheet/ficha.ts';
import { bitmapFonts } from '../tools/pixel_forja/src/engine/ui/fonts.ts';
import { encodePng } from '../tools/pixel_forja/src/engine/export/png.ts';
import { SFX, encodeWav, type SfxName } from '../tools/pixel_forja/src/engine/audio/sfx.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const forja = join(root, 'tools', 'pixel_forja');
const out = join(root, 'public', 'assets', 'kit');
const quick = process.argv.includes('--rapido');

/** Los packs del juego. Cada uno sale en un atlas por atleta. */
const PACKS: Record<string, string[]> = {
  ngg_mov: ['idle', 'walk', 'run', 'jump_rise', 'jump_apex', 'jump_fall', 'land', 'hit', 'fall_getup', 'knockout', 'celebrate', 'sad', 'victory', 'taunt', 'dizzy', 'ko_bounce'],
  ngg_golpe: ['jab', 'punch', 'low_kick', 'kick_martial', 'uppercut', 'run_punch', 'run_kick', 'air_kick', 'fight_hit', 'fight_block'],
  ngg_carga: ['lift', 'carry_idle', 'carry_walk', 'carry_run', 'throw_overhead', 'carried', 'thrown_spin', 'land_flat', 'weapon_pick', 'weapon_swing', 'weapon_swing_heavy', 'weapon_throw'],
};
for (const [k, v] of Object.entries(PACKS)) (SPORT_PACKS as Record<string, readonly string[]>)[k] = v;

const SONIDOS: SfxName[] = ['golpe', 'critico', 'jugador_dolor', 'enemigo_dolor', 'enemigo_muere', 'esquiva', 'bloqueo', 'recoger', 'romper', 'elegir', 'click', 'descubrir', 'subir_nivel', 'oro_mucho', 'jefe_pisoton', 'ladrido', 'paso_piedra_0', 'paso_piedra_1', 'paso_piedra_2'];

// fichas: las de los equipos del juego (por ahora las de ejemplo de PixelForja)
const fichasDir = join(forja, 'docs', 'ejemplos', 'nekketsu', 'fichas');
const athletes: Record<string, HumanFicha> = {};
const animales: Record<string, AnimalFicha> = {};
for (const n of readdirSync(fichasDir).filter((x) => x.endsWith('.ficha.json'))) {
  const id = basename(n, '.ficha.json');
  const f = migrateFicha(JSON.parse(readFileSync(join(fichasDir, n), 'utf8')));
  const errs = validateFicha(f);
  if (errs.length) throw new Error(`${n}: ${errs.join(', ')}`);
  if (isHuman(f)) athletes[id] = { ...f, movementProfile: 'premium' };
  else animales[id] = { ...f, movementProfile: 'premium' };
}

// la carpeta se reescribe entera, pero solo si es un kit
if (existsSync(out) && readdirSync(out).length) {
  const m = join(out, 'manifest.json');
  const ok = existsSync(m) && JSON.parse(readFileSync(m, 'utf8')).generado_con === 'PixelForja';
  if (!ok) throw new Error(`No borro ${out}: no es un kit de PixelForja`);
}

const t0 = Date.now();
const files = buildSportsKit({
  athletes, animales, packs: Object.keys(PACKS) as never, cell: 48, quick,
  filas: ['right', 'down_right', 'up_right', 'down', 'up'], datos: true, atlas: true, retratos: true, cabecitas: true, objetos: true,
  progress: (m) => console.log(`  ${m}`),
});

const write = (name: string, bytes: Uint8Array) => {
  const p = join(out, name);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, bytes);
};
rmSync(out, { recursive: true, force: true });
let manifest: Record<string, any> = {};
for (const f of files) {
  if (f.name === 'manifest.json') manifest = JSON.parse(new TextDecoder().decode(f.bytes));
  else write(f.name, f.bytes);
}

// fuentes (Silkscreen, OFL)
const fontDir = join(forja, 'node_modules', '@fontsource', 'silkscreen', 'files');
const ab = (p: string) => { const b = readFileSync(p); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer; };
const fuentes: Record<string, { png: string; fnt: string; alto: number }> = {};
for (const font of bitmapFonts(ab(join(fontDir, 'silkscreen-latin-400-normal.woff')), ab(join(fontDir, 'silkscreen-latin-700-normal.woff')))) {
  const png = `ui/fuentes/${font.name}.png`, fnt = `ui/fuentes/${font.name}.fnt`;
  write(png, encodePng(font.png));
  write(fnt, new TextEncoder().encode(font.fnt.replace(/file="[^"]*"/, `file="${font.name}.png"`)));
  fuentes[font.name] = { png, fnt, alto: font.lineHeight };
}

// sonidos
const audio: Record<string, string> = {};
for (const n of SONIDOS) { const a = `audio/${n}.wav`; write(a, encodeWav(SFX[n]())); audio[n] = a; }

manifest.juego = 'Nekketsu Olympic GG';
manifest.packs_juego = PACKS;
manifest.ui = { ...(manifest.ui ?? {}), fuentes };
manifest.audio = audio;
write('manifest.json', new TextEncoder().encode(JSON.stringify(manifest)));
const creditos = join(out, 'CREDITOS.txt');
const prev = existsSync(creditos) ? readFileSync(creditos, 'utf8') : '';
writeFileSync(creditos, `Nekketsu Olympic GG\n\nPersonajes, armas y sonidos generados con PixelForja.\nFuentes: Silkscreen, de Jason Kottke. SIL Open Font License 1.1.\n\n${prev}`);
console.log(`Kit listo en ${out}: ${files.length} archivos, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
