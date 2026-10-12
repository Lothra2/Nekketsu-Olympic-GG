import Phaser from 'phaser';

/** Lo que el juego lee del kit de PixelForja (public/assets/kit/manifest.json). */

export const KIT = 'assets/kit/';
export const ROWS = ['right', 'down_right', 'up_right', 'down', 'up'] as const;
export type Row = (typeof ROWS)[number];

export type Box = [number, number, number, number];
export type Pt = [number, number];
export interface Evento { tipo: 'paso' | 'impacto' | 'suelta' | 'despegue' | 'aterriza'; cuadro: number; fase: number; pie?: string; punto?: Pt[] }

export interface AnimData {
  cuadros: number;
  fps: number;
  loop: boolean;
  eventos?: Evento[];
  avance?: number;
  desplazamiento?: number[];
  elevacion?: number[];
  cuerpo?: (Box | null)[][];
  cajas?: (Box | null)[][];
  manos?: [Pt, Pt][][];
  cabeza?: Pt[][];
  carga?: (Pt | null)[][];
  arma?: ([number, number, number, number] | null)[][];
}

export interface PackData { atlas: string; imagen: string; anims: Record<string, AnimData> }

export interface Atleta {
  nombre: string;
  celda: number;
  pivote: Pt;
  numero?: string;
  retratos: { archivo: string; chico: number; grande: number; expresiones: string[]; escala_grande?: number };
  cabecita: string;
  packs: Record<string, PackData>;
}

export interface Objeto { atlas: string; w: number; h: number; agarre: Pt; peso: 'liviano' | 'medio' | 'pesado'; rota: boolean; uso: string; nombre: { es: string; en: string }; anims: Record<string, number> }

export interface Animal { nombre: string; celda: number; pivote: Pt; atlas: string; imagen: string; anims: Record<string, AnimData> }

export interface Manifest {
  atletas: Record<string, Atleta>;
  animales: Record<string, Animal>;
  objetos: Record<string, Objeto>;
  cabecitas: { archivo: string; celda: number; orden: string[] };
  ui: { fuentes: Record<string, { png: string; fnt: string; alto: number }> };
  audio: Record<string, string>;
}

let manifest: Manifest | null = null;
export const kit = (): Manifest => {
  if (!manifest) throw new Error('El kit no está cargado');
  return manifest;
};
export const setKit = (m: Manifest) => { manifest = m; };

/** Clave de textura de un pack de un atleta. */
export const texKey = (id: string, pack: string) => `${id}:${pack}`;
export const frameName = (anim: string, row: Row, i: number) => `${anim}_${row}_${i}`;

/** En qué pack está cada animación de un atleta. */
const packOf = new Map<string, Map<string, string>>();
export function findAnim(id: string, anim: string): { pack: string; data: AnimData } | null {
  let m = packOf.get(id);
  if (!m) {
    m = new Map();
    const at = kit().atletas[id];
    if (at) { for (const [p, pd] of Object.entries(at.packs)) for (const n of Object.keys(pd.anims)) m.set(n, p); }
    else for (const n of Object.keys(kit().animales[id].anims)) m.set(n, 'animal');
    packOf.set(id, m);
  }
  const pack = m.get(anim);
  if (!pack) return null;
  if (pack === 'animal') return { pack, data: kit().animales[id].anims[anim] };
  return { pack, data: kit().atletas[id].packs[pack].anims[anim] };
}

/** Pone en la cola de carga todo el kit. Se llama con el manifiesto ya cargado. */
export function queueKit(scene: Phaser.Scene) {
  const m = kit();
  for (const [id, a] of Object.entries(m.atletas)) {
    for (const [p, pd] of Object.entries(a.packs)) scene.load.atlas(texKey(id, p), KIT + pd.imagen, KIT + pd.atlas);
    scene.load.image(`retratos:${id}`, KIT + a.retratos.archivo);
  }
  for (const [id, a] of Object.entries(m.animales)) scene.load.atlas(texKey(id, 'animal'), KIT + a.imagen, KIT + a.atlas);
  const armas = Object.values(m.objetos)[0];
  if (armas) scene.load.atlas('armas', KIT + armas.atlas.replace('.json', '.png'), KIT + armas.atlas);
  scene.load.image('cabecitas', KIT + m.cabecitas.archivo);
  for (const [n, f] of Object.entries(m.ui.fuentes)) scene.load.bitmapFont(n, KIT + f.png, KIT + f.fnt);
  for (const [n, a] of Object.entries(m.audio)) scene.load.audio(n, KIT + a);
}

/** Recorta los retratos (40 y 96) y las cabecitas en cuadros con nombre. */
export function cutPortraits(scene: Phaser.Scene) {
  const m = kit();
  for (const [id, a] of Object.entries(m.atletas)) {
    const t = scene.textures.get(`retratos:${id}`);
    a.retratos.expresiones.forEach((e, i) => {
      t.add(`chico_${e}`, 0, i * a.retratos.chico, 0, a.retratos.chico, a.retratos.chico);
      t.add(`grande_${e}`, 0, i * a.retratos.grande, a.retratos.chico, a.retratos.grande, a.retratos.grande);
    });
  }
  const c = scene.textures.get('cabecitas');
  m.cabecitas.orden.forEach((id, i) => c.add(id, 0, i * m.cabecitas.celda, 0, m.cabecitas.celda, m.cabecitas.celda));
}
