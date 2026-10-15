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

/** Los que van con su tratamiento por delante: Señora Carmen, Don Hernando, Abuela Nerva, Chamo Toto, Bà Hoa. */
const TRATO = ['señora', 'don', 'abuela', 'chamo', 'bà'];
/**
 * El nombre corto de un atleta, en mayúsculas: sin el apodo entre comillas ni el apellido (KENJI, RYU), pero con su
 * tratamiento cuando lo lleva (SEÑORA CARMEN, no SEÑORA).
 */
export function nombreCorto(id: string) {
  const p = (kit().atletas[id]?.nombre ?? id).replace(/".*"/, '').trim().split(/\s+/);
  return (TRATO.includes(p[0].toLowerCase()) && p[1] ? `${p[0]} ${p[1]}` : p[0]).toUpperCase();
}

/** Clave de textura de un pack de un atleta. */
export const texKey = (id: string, pack: string) => `${id}:${pack}`;
export const frameName = (anim: string, row: Row, i: number) => `${anim}_${row}_${i}`;

/** Las texturas del juego, para saber qué packs de cada atleta están cargados (cada escena carga los suyos). */
let texturas: Phaser.Textures.TextureManager | null = null;

/**
 * En qué pack está una animación de un atleta: el preferido si la trae, si no el primero que la trae. Solo cuentan
 * los packs cargados: lo que la escena no pidió no existe para ella (la figura se queda con lo que tenía).
 */
export function findAnim(id: string, anim: string, prefer?: string): { pack: string; data: AnimData } | null {
  const at = kit().atletas[id];
  if (!at) {
    const d = kit().animales[id]?.anims[anim];
    return d ? { pack: 'animal', data: d } : null;
  }
  const cargado = (p: string) => !texturas || texturas.exists(texKey(id, p));
  if (prefer && at.packs[prefer]?.anims[anim] && cargado(prefer)) return { pack: prefer, data: at.packs[prefer].anims[anim] };
  for (const [p, pd] of Object.entries(at.packs)) if (pd.anims[anim] && cargado(p)) return { pack: p, data: pd.anims[anim] };
  return null;
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
  texturas = scene.textures;
  const atlas = (a: string | object) => (typeof a === 'string' ? KIT + a : a);
  // de los atletas, al arrancar solo los retratos: sus animaciones las pide cada escena (core/carga.ts)
  for (const [id, a] of Object.entries(m.atletas)) scene.load.image(`retratos:${id}`, KIT + a.retratos.archivo);
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

/**
 * Los retratos grandes en pixel, como antes del lote G2 (Rick los prefiere así): cada grande es su chico de 40
 * recortado a 32 x 32 (desde x 4 e y 1) y agrandado x3 a bloques, que es justo como salían antes (probado: cero
 * pixeles distintos contra la hoja vieja). Se rehace al cargar, así vale con cualquier kit.
 */
function retratosPixel(scene: Phaser.Scene, key: string, r: { chico: number; grande: number; expresiones: string[] }) {
  const src = scene.textures.get(key).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
  if (!src || r.chico !== 40 || r.grande !== 96 || src instanceof HTMLCanvasElement) return;
  const cv = document.createElement('canvas');
  cv.width = src.width;
  cv.height = src.height;
  const ctx = cv.getContext('2d');
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0, src.width, r.chico, 0, 0, src.width, r.chico);
  r.expresiones.forEach((_e, i) => ctx.drawImage(src, i * r.chico + 4, 1, 32, 32, i * r.grande, r.chico, r.grande, r.grande));
  scene.textures.remove(key);
  scene.textures.addCanvas(key, cv);
}

/** Recorta los retratos (40 y 96) y las cabecitas en cuadros con nombre. */
export function cutPortraits(scene: Phaser.Scene) {
  const m = kit();
  for (const [id, a] of Object.entries(m.atletas)) {
    retratosPixel(scene, `retratos:${id}`, a.retratos);
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
/**
 * Carga (si hace falta) un audio del kit para una escena y avisa si la escena sigue siendo la misma corrida cuando
 * llega. Ojo: dentro del create() la escena todavía no está "activa" (está creándose), y la segunda vez que entras el
 * audio ya está en caché y no hay espera; por eso se mira la corrida y no isActive(), que dejaba muda la canción al
 * volver a jugar un mundo.
 */
async function audioListo(scene: Phaser.Scene, key: string, a: Sonido): Promise<boolean> {
  let cerrada = false;
  const alCerrar = () => { cerrada = true; };
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, alCerrar);
  if (!scene.cache.audio.exists(key)) {
    await new Promise<void>((res) => {
      scene.load.audio(key, rutas(a));
      scene.load.once(Phaser.Loader.Events.COMPLETE, () => res());
      scene.load.start();
    });
  }
  scene.events.off(Phaser.Scenes.Events.SHUTDOWN, alCerrar);
  const st = scene.sys.settings.status;
  return !cerrada && st >= Phaser.Scenes.LOADING && st <= Phaser.Scenes.PAUSED && scene.cache.audio.exists(key);
}

/**
 * Toca una vez una música corta del kit (el acorde de victoria de un equipo), cargándola la primera vez. Devuelve
 * false si el kit no la trae o no se pudo tocar.
 */
export async function unaVez(scene: Phaser.Scene, n: string, volumen = 0.6): Promise<boolean> {
  const a = kit().audio.musica?.[n];
  if (!a) return false;
  const key = `mus_${n}`;
  if (!(await audioListo(scene, key, a))) return false;
  const s = scene.sound.add(key, { volume: volumen });
  s.once(Phaser.Sound.Events.COMPLETE, () => s.destroy());
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => { if (!s.pendingRemove) s.destroy(); });
  return s.play();
}

export async function bucle(scene: Phaser.Scene, seccion: 'musica' | 'ambientes', n: string, volumen = 0.5, azar = false): Promise<Phaser.Sound.BaseSound | null> {
  const a = kit().audio[seccion]?.[n];
  if (!a) return null;
  const key = `${seccion === 'musica' ? 'mus' : 'amb'}_${n}`;
  if (!(await audioListo(scene, key, a))) return null;
  const s = scene.sound.add(key, { volume: volumen });
  const largo = a.muestras && a.frecuencia ? a.muestras / a.frecuencia : 0;
  if (largo > 0) {
    s.addMarker({ name: 'bucle', start: 0, duration: largo, config: { loop: true, volume: volumen } });
    // con `azar`, arranca en cualquier punto del bucle: así no suena igual cada vez que entras
    s.play('bucle', azar ? { seek: Math.random() * largo * 0.95 } : undefined);
  } else s.play({ loop: true });
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => s.destroy());
  return s;
}
