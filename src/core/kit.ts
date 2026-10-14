import Phaser from 'phaser';

/** Lo que el juego lee del kit de PixelForja (public/assets/kit/manifest.json). */

export const KIT = 'assets/kit/';
export const ROWS = ['right', 'down_right', 'up_right', 'down', 'up'] as const;
export type Row = (typeof ROWS)[number];

export type Box = [number, number, number, number];
export type Pt = [number, number];
/**
 * Un evento de una animación. `bote` es la pelota que toca el piso (el dribble), `atrapa` la pelota que llega a la mano
 * (desde ahí `objetos` vuelve a mandar), `frase` el gesto fuerte de una burla, donde va el globo, y `brazada` el brazo
 * que entra al agua en los nados.
 */
export interface Evento { tipo: 'paso' | 'impacto' | 'suelta' | 'despegue' | 'aterriza' | 'bote' | 'atrapa' | 'frase' | 'brazada'; cuadro: number; fase: number; pie?: string; punto?: Pt[] }

/**
 * Un objeto suelto de un cuadro (packs con `sin_props`): la pelota no viene pintada y va aquí, con su centro desde el
 * pivote (y hacia abajo), su radio sin contorno y si va detrás del cuerpo. Al espejar, x pasa a -x.
 */
export interface ObjetoCuadro { tipo: 'pelota'; clase: string; x: number; y: number; r: number; detras: 0 | 1 }

export interface AnimData {
  cuadros: number;
  fps: number;
  loop: boolean;
  eventos?: Evento[];
  avance?: number;
  desplazamiento?: number[];
  elevacion?: number[];
  /** fila de la superficie del agua en la celda, por cuadro (natación) */
  agua?: (number | null)[];
  cuerpo?: (Box | null)[][];
  cajas?: (Box | null)[][];
  manos?: [Pt, Pt][][];
  cabeza?: Pt[][];
  carga?: (Pt | null)[][];
  arma?: ([number, number, number, number] | null)[][];
  /** la pelota de cada cuadro en los packs sin pelota pintada: [fila][cuadro] */
  objetos?: (ObjetoCuadro[] | null)[][];
  /** saltos a un muro (el gato): cuánto del alto del muro sube en cada cuadro, y el rango de muros donde se ve bien */
  subida?: number[];
  muro_min?: number;
  muro_max?: number;
}

/** `atlas` es la ruta del JSON del atlas, o el JSON mismo (la copia del artifact los mete en el manifiesto). */
export interface PackData { atlas: string | object; imagen: string; anims: Record<string, AnimData> }

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

export interface Animal { nombre: string; celda: number; pivote: Pt; atlas: string | object; imagen: string; anims: Record<string, AnimData>; tipo?: string }

/**
 * Un ave del kit (lote C7b): va en `animales` con `tipo: "ave"`, pero en una tira como los NPC y no en atlas.
 * El ancla son las patas sobre el piso. `aire` dice cuánto sube el dibujo sobre el ancla en cada cuadro (la sombra
 * se queda abajo). Miran a la derecha: para la izquierda, espejo.
 */
export interface Ave {
  nombre: string; tipo: 'ave'; imagen: string; w: number; h: number; ancla: Pt; cuadros: number;
  anims: Record<string, { desde: number; cuadros: number; fps: number; loop: boolean; aire?: number[] }>;
  eventos?: Record<string, { tipo: string; cuadro: number }[]>;
}

export interface Manifest {
  atletas: Record<string, Atleta>;
  animales: Record<string, Animal>;
  objetos: Record<string, Objeto>;
  cabecitas: { archivo: string; celda: number; orden: string[] };
  ui: { fuentes: Record<string, { png: string; fnt: string; alto_linea: number; base: number }> };
  audio: Partial<Record<'sfx' | 'musica' | 'ambientes', Record<string, Sonido>>>;
  fx?: Record<string, Fx>;
  /** la gente de la calle (lote C6a): una tira por NPC, más la pelota; `notas` es texto */
  npc?: Record<string, Npc | string>;
  /** las pelotas sueltas (lote SP2): un cuadro por tamaño de celda en objetos/pelotas.png */
  pelotas?: Record<string, { clase: string; atlas: string; cuadros: Record<string, string> }>;
  /** lo que el kit todavía no trae (llega con un lote futuro) */
  pendiente?: string[];
}

/** Un efecto del catálogo de PixelForja (lote F): hoja de cuadros con su ancla. */
export interface Fx {
  archivo: string; w: number; h: number; cuadros: number; columnas: number; fps: number; loop: boolean;
  /** el pixel del cuadro que va sobre el punto del personaje (mirando a la derecha) */
  ancla: Pt;
  se_pega_a: string; capa: 'frente' | 'detras'; grupo: string;
  /** en los que no se animan solos (la bola del Tama-wari): el nombre de cada cuadro */
  estados?: string[];
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

/** En qué pack está cada animación de un atleta (el primero que la trae). */
const packOf = new Map<string, Map<string, string>>();
export function findAnim(id: string, anim: string, prefer?: string): { pack: string; data: AnimData } | null {
  const at = kit().atletas[id];
  if (prefer && at?.packs[prefer]?.anims[anim]) return { pack: prefer, data: at.packs[prefer].anims[anim] };
  let m = packOf.get(id);
  if (!m) {
    m = new Map();
    if (at) { for (const [p, pd] of Object.entries(at.packs)) for (const n of Object.keys(pd.anims)) if (!m.has(n)) m.set(n, p); }
    else for (const n of Object.keys(kit().animales[id].anims)) m.set(n, 'animal');
    packOf.set(id, m);
  }
  const pack = m.get(anim);
  if (!pack) return null;
  if (pack === 'animal') return { pack, data: kit().animales[id].anims[anim] };
  return { pack, data: at.packs[pack].anims[anim] };
}

/**
 * Un sonido del kit. Con `audio.formato: "comprimido"` (lote H1b), `archivo` es la lista [ogg, m4a]: Phaser carga el
 * primero que el navegador sepa tocar (OGG en Chrome y Android, M4A en Safari del iPhone). `muestras / frecuencia` es
 * el largo exacto del original: el bucle se cierra ahí y no en el final del archivo comprimido, que trae relleno.
 */
export interface Sonido { archivo: string | string[]; duracion: number; bucle?: boolean; muestras?: number; frecuencia?: number }

// el M4A también puede venir con extensión .mp4 (algunos hosts no sirven .m4a): es el mismo audio
const rutas = (a: Sonido): Phaser.Types.Loader.FileTypes.AudioFileURLConfig[] =>
  [a.archivo].flat().map((f) => {
    const ext = f.split('.').pop()!.toLowerCase();
    return { url: KIT + f, type: ext === 'mp4' ? 'm4a' : ext };
  });

/**
 * Un NPC del kit: una tira de cuadros de w x h (el cuadro i en x = i * w), con el ancla en los pies. Cada animación
 * es un tramo de la tira. `eventos` va como en el resto del kit (la patada de los pelados: impacto en el cuadro 2).
 * Los músicos son un grupo en un solo sprite (rapero y percusionista, con el parlante).
 */
export interface Npc {
  archivo: string; w: number; h: number; ancla: Pt; cuadros: number;
  anims: Record<string, { desde: number; cuadros: number; fps: number; loop: boolean; vista?: string }>;
  eventos?: Record<string, { tipo: string; cuadro: number }[]>;
  grupo?: string[];
}

/** El cuadro de una pelota suelta del kit (balon_basket, pelota_tenis...) para la celda de 48, o null si no está. */
export function pelotaKit(scene: Phaser.Scene, id: string): string | null {
  const f = kit().pelotas?.[id]?.cuadros['48'];
  return f && scene.textures.exists('pelotas') && scene.textures.get('pelotas').has(f) ? f : null;
}

/** Los NPC del kit (sin las notas). */
export const npcs = (): Record<string, Npc> =>
  Object.fromEntries(Object.entries(kit().npc ?? {}).filter((e): e is [string, Npc] => typeof e[1] === 'object' && !!e[1]?.archivo));

/** Las aves del kit (las que vienen en `animales` con `tipo: "ave"`). */
export const aves = (): Record<string, Ave> =>
  Object.fromEntries(Object.entries(kit().animales).filter(([, a]) => a.tipo === 'ave')) as unknown as Record<string, Ave>;

/** Pone en la cola de carga todo el kit. Se llama con el manifiesto ya cargado. */
export function queueKit(scene: Phaser.Scene) {
  const m = kit();
  const atlas = (a: string | object) => (typeof a === 'string' ? KIT + a : a);
  for (const [id, a] of Object.entries(m.atletas)) {
    for (const [p, pd] of Object.entries(a.packs)) scene.load.atlas(texKey(id, p), KIT + pd.imagen, atlas(pd.atlas));
    scene.load.image(`retratos:${id}`, KIT + a.retratos.archivo);
  }
  for (const [id, a] of Object.entries(m.animales)) if (a.tipo !== 'ave') scene.load.atlas(texKey(id, 'animal'), KIT + a.imagen, atlas(a.atlas));
  for (const [id, a] of Object.entries(aves())) scene.load.spritesheet(`ave_${id}`, KIT + a.imagen, { frameWidth: a.w, frameHeight: a.h });
  const armas = Object.values(m.objetos)[0];
  if (armas) scene.load.atlas('armas', KIT + armas.atlas.replace('.json', '.png'), KIT + armas.atlas);
  scene.load.image('cabecitas', KIT + m.cabecitas.archivo);
  const pel = Object.values(m.pelotas ?? {})[0];
  if (pel) scene.load.atlas('pelotas', KIT + pel.atlas.replace('.json', '.png'), KIT + pel.atlas);
  // solo las fuentes (el manifiesto también trae notas en esa sección)
  for (const [n, f] of Object.entries(m.ui.fuentes)) if (typeof f === 'object' && f?.png) scene.load.bitmapFont(n, KIT + f.png, KIT + f.fnt);
  // los efectos al arrancar; la música y los ambientes pesan y se cargan cuando una escena los pide (bucle())
  for (const [n, a] of Object.entries(m.audio.sfx ?? {})) scene.load.audio(n, rutas(a));
  for (const [id, e] of Object.entries(m.fx ?? {})) scene.load.spritesheet(`fx_${id}`, KIT + e.archivo, { frameWidth: e.w, frameHeight: e.h });
  for (const [id, n] of Object.entries(npcs())) scene.load.spritesheet(`npc_${id}`, KIT + n.archivo, { frameWidth: n.w, frameHeight: n.h });
}

/** Crea una animación por efecto (los de estados, como la bola del Tama-wari, no se animan solos). */
export function makeFxAnims(scene: Phaser.Scene) {
  for (const [id, e] of Object.entries(kit().fx ?? {})) {
    if (!e.fps || e.estados || scene.anims.exists(`fx_${id}`)) continue;
    scene.anims.create({ key: `fx_${id}`, frames: scene.anims.generateFrameNumbers(`fx_${id}`, { start: 0, end: e.cuadros - 1 }), frameRate: e.fps, repeat: e.loop ? -1 : 0 });
  }
}

/** Una animación por cada tramo de la tira de cada NPC: `npc_<id>_<anim>`. */
export function makeNpcAnims(scene: Phaser.Scene) {
  for (const [id, n] of Object.entries(npcs())) {
    for (const [a, d] of Object.entries(n.anims)) {
      const key = `npc_${id}_${a}`;
      if (scene.anims.exists(key) || !scene.textures.exists(`npc_${id}`)) continue;
      scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(`npc_${id}`, { start: d.desde, end: d.desde + d.cuadros - 1 }), frameRate: d.fps, repeat: d.loop ? -1 : 0 });
    }
  }
}

/** Una animación por cada tramo de la tira de cada ave: `ave_<id>_<anim>`. */
export function makeAveAnims(scene: Phaser.Scene) {
  for (const [id, a] of Object.entries(aves())) {
    for (const [n, d] of Object.entries(a.anims)) {
      const key = `ave_${id}_${n}`;
      if (scene.anims.exists(key) || !scene.textures.exists(`ave_${id}`)) continue;
      scene.anims.create({ key, frames: scene.anims.generateFrameNumbers(`ave_${id}`, { start: d.desde, end: d.desde + d.cuadros - 1 }), frameRate: d.fps, repeat: d.loop ? -1 : 0 });
    }
  }
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

/**
 * Toca en bucle una música (`musica`) o un ambiente (`ambientes`) del kit, cargándolo la primera vez. El bucle se
 * cierra con un marcador de `muestras / frecuencia` segundos, el largo del original: así el relleno del OGG y del M4A
 * no mete un silencio cada vuelta. Devuelve el sonido (o null si el kit no lo trae, o la escena se fue antes).
 */
export async function bucle(scene: Phaser.Scene, seccion: 'musica' | 'ambientes', n: string, volumen = 0.5): Promise<Phaser.Sound.BaseSound | null> {
  const a = kit().audio[seccion]?.[n];
  if (!a) return null;
  const key = `${seccion === 'musica' ? 'mus' : 'amb'}_${n}`;
  if (!scene.cache.audio.exists(key)) {
    await new Promise<void>((res) => {
      scene.load.audio(key, rutas(a));
      scene.load.once(Phaser.Loader.Events.COMPLETE, () => res());
      scene.load.start();
    });
  }
  if (!scene.sys.isActive() || !scene.cache.audio.exists(key)) return null;
  const s = scene.sound.add(key, { volume: volumen });
  const largo = a.muestras && a.frecuencia ? a.muestras / a.frecuencia : 0;
  if (largo > 0) {
    s.addMarker({ name: 'bucle', start: 0, duration: largo, config: { loop: true, volume: volumen } });
    s.play('bucle');
  } else s.play({ loop: true });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => s.destroy());
  return s;
}
