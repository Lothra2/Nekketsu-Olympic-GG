import Phaser from 'phaser';
import { KIT, kit, texKey } from './kit';

/**
 * La carga de los atletas, escena por escena. Las animaciones de un atleta son unos 35 MB en la tarjeta gráfica:
 * con 24 atletas no caben todas a la vez en un iPhone. Cada escena pide solo a los que juegan y solo los packs que
 * usa, y lo demás se suelta.
 */

/** Los packs que usa cada escena (sacado de las animaciones que nombra cada una; las burlas, donde hay pelea). */
const PELEA = ['ngg_mov', 'ngg_golpe', 'ngg_carga', 'ngg_burlas'];
export const PACKS: Record<string, string[]> = {
  Title: ['ngg_mov'],
  Intro: ['ngg_mov', 'ngg_golpe', 'ngg_carga', 'atletismo', 'natacion'],
  Select: ['ngg_mov'],
  Medallero: ['ngg_mov'],
  /** el judo: cada luchador en su judogi (blanco el de la persona, azul el rival), que trae también lo básico */
  Judo: ['judo', 'judo_azul'],
  Fight: [...PELEA, 'futbol'],
  CrossCountry: PELEA,
  Obstaculos: PELEA,
  Tamawari: PELEA,
  Azoteas: ['ngg_mov', 'ngg_golpe', 'ngg_carga', 'atletismo'],
  Vallas: ['ngg_mov', 'ngg_golpe', 'atletismo'],
  Jabalina: ['ngg_mov', 'ngg_golpe', 'atletismo'],
  Natacion: ['ngg_mov', 'ngg_golpe', 'natacion'],
  DaCau: ['ngg_mov', 'ngg_golpe', 'futbol'],
  Tejo: ['ngg_mov', 'ngg_carga', 'beisbol'],
  Quemado: ['ngg_mov', 'ngg_golpe', 'ngg_carga', 'beisbol'],
  Chapita: ['ngg_mov', 'ngg_golpe', 'ngg_carga', 'beisbol'],
  Voley: ['ngg_mov', 'ngg_golpe', 'voley'],
  Tenis: ['ngg_mov', 'ngg_golpe', 'ngg_carga', 'tennis'],
  Futbol: ['ngg_mov', 'ngg_golpe', 'ngg_carga', 'futbol', 'keeper'],
  Basket: ['ngg_mov', 'ngg_golpe', 'ngg_carga', 'basket'],
};

/** Lo que cada paquete del artifact trae adentro (las imágenes y los atlas de cada atleta), ya como URL del navegador. */
const desempacados = new Map<string, string>();

/** Los atlas que llegaron en un paquete como rejilla compacta, ya armados como el JSON que espera Phaser. */
const atlasArmados = new Map<string, object>();

interface Rejilla { w: number; h: number; cols: number; pivote: [number, number]; n: string[] }

/**
 * Arma el atlas de Phaser de una rejilla compacta: los cuadros de un atleta van en una grilla pareja, así que basta
 * con los nombres en orden y el tamaño de la celda (el JSON entero pesaba 40 veces más y casi todo se repetía).
 */
function armarAtlas(r: Rejilla, meta: object) {
  const frames: Record<string, object> = {};
  r.n.forEach((nombre, i) => {
    const x = (i % r.cols) * r.w, y = Math.floor(i / r.cols) * r.h;
    frames[nombre] = { frame: { x, y, w: r.w, h: r.h }, rotated: false, trimmed: false, spriteSourceSize: { x: 0, y: 0, w: r.w, h: r.h }, sourceSize: { w: r.w, h: r.h }, pivot: { x: r.pivote[0], y: r.pivote[1] } };
  });
  return { frames, meta };
}

/**
 * Devuelve al manifiesto los datos por cuadro de un atleta que viajaron en su paquete (en la copia del artifact el
 * manifiesto va sin ellos, para que arranque liviano). Las animaciones de un pack solo se tocan con su textura
 * cargada, y la textura sale del mismo paquete, así que llegan a tiempo.
 */
function devolverDatos(id: string, datos: Record<string, Record<string, Record<string, unknown>>>) {
  const at = kit().atletas[id];
  if (!at) return;
  for (const [p, anims] of Object.entries(datos)) for (const [n, campos] of Object.entries(anims)) {
    const a = at.packs[p]?.anims[n];
    if (a) Object.assign(a, campos);
  }
}

/** La URL de un archivo del kit: la de siempre, o la que salió de su paquete. */
export const urlKit = (ruta: string) => desempacados.get(ruta) ?? KIT + ruta;

interface Paquete {
  archivo: string;
  partes: Record<string, [number, number]>;
  /** la parte con los datos pesados por cuadro (cajas, cuerpo, manos, cabeza, pies) que no van en el manifiesto */
  datos?: string;
  atleta?: string;
}

/**
 * Pone en la cola los packs de esos atletas que no estén cargados. Si viene `listo`, arranca la carga (fuera del
 * preload) y avisa al terminar. Con `soltar`, suelta las animaciones de los atletas y packs que esta escena no pide.
 */
export function cargarAtletas(scene: Phaser.Scene, ids: string[], packs: string[] | ((id: string) => string[]), listo?: () => void, soltar = false) {
  const m = kit();
  const quiero = new Set<string>();
  const faltan: { key: string; img: string; atlas: string | object }[] = [];
  const paquetes = new Map<string, Paquete>();
  for (const id of new Set(ids)) {
    const a = m.atletas[id];
    if (!a) continue;
    // en la copia del artifact cada atleta viene en uno o más paquetes (el de siempre y el del judo)
    const conPaquetes = a as unknown as { paquete?: Paquete; paquetes?: Paquete[] };
    const suyos = conPaquetes.paquetes ?? (conPaquetes.paquete ? [conPaquetes.paquete] : []);
    for (const p of typeof packs === 'function' ? packs(id) : packs) {
      const pd = a.packs[p];
      if (!pd) continue;
      const key = texKey(id, p);
      quiero.add(key);
      if (scene.textures.exists(key)) continue;
      faltan.push({ key, img: pd.imagen, atlas: pd.atlas });
      const paq = suyos.find((q) => pd.imagen in q.partes);
      if (paq && !desempacados.has(pd.imagen)) paquetes.set(paq.archivo, paq);
    }
  }
  if (soltar) {
    // lo que ya no se usa: los packs de atletas que esta escena no pide
    for (const [id, a] of Object.entries(m.atletas)) for (const p of Object.keys(a.packs)) {
      const key = texKey(id, p);
      if (!quiero.has(key) && scene.textures.exists(key)) scene.textures.remove(key);
    }
  }
  const encolar = () => {
    for (const f of faltan) if (!scene.textures.exists(f.key)) scene.load.atlas(f.key, urlKit(f.img), typeof f.atlas === 'string' ? atlasArmados.get(f.atlas) ?? urlKit(f.atlas) : f.atlas);
  };
  if (!faltan.length) { listo?.(); return; }
  if (paquetes.size) {
    // primero los paquetes; al llegar cada uno se desarma en URLs y recién ahí se piden sus imágenes
    let pendientes = paquetes.size;
    for (const paq of paquetes.values()) {
      const key = `paq:${paq.archivo}`;
      scene.load.binary(key, KIT + paq.archivo);
      scene.load.once(`filecomplete-binary-${key}`, (_k: string, _t: string, datos: ArrayBuffer) => {
        for (const [ruta, [ini, largo]] of Object.entries(paq.partes)) {
          if (desempacados.has(ruta) || atlasArmados.has(ruta)) continue;
          const parte = datos.slice(ini, ini + largo);
          if (ruta === paq.datos && paq.atleta) { devolverDatos(paq.atleta, JSON.parse(new TextDecoder().decode(parte))); desempacados.set(ruta, ''); continue; }
          if (ruta.endsWith('.json')) {
            const j = JSON.parse(new TextDecoder().decode(parte)) as { rejilla?: Rejilla; meta?: object };
            if (j.rejilla) { atlasArmados.set(ruta, armarAtlas(j.rejilla, j.meta ?? {})); continue; }
            desempacados.set(ruta, URL.createObjectURL(new Blob([parte], { type: 'application/json' })));
          } else desempacados.set(ruta, URL.createObjectURL(new Blob([parte], { type: 'image/png' })));
        }
        scene.cache.binary.remove(key);
        if (--pendientes === 0) encolar();
      });
    }
  } else encolar();
  if (listo) {
    scene.load.once(Phaser.Loader.Events.COMPLETE, () => listo());
    scene.load.start();
  }
}

/** Los packs de una escena (todos los del kit si no está en la lista). */
export const packsDe = (escena: string) => PACKS[escena] ?? Object.keys(Object.values(kit().atletas)[0]?.packs ?? {});
