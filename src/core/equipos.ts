import { kit } from './kit';

/**
 * Los seis equipos del juego. Los atletas, los colores y la mascota salen del kit (`equipos` del manifiesto, que viene
 * de data/equipos.json); lo que se dice en pantalla, con su gramática (GANA LA FAMILIA, GANAN LOS ROLOS), va aquí.
 */
export interface Equipo {
  id: string;
  nombre: string;
  /** en el marcador: FAMILIA GG, INSTITUTO, RỒNG… */
  corto: string;
  /** con su artículo, para "¡MANO PARA LA FAMILIA!" */
  con: string;
  /** "GANA LA FAMILIA GG", "GANAN LOS ROLOS" */
  gana: string;
  /** "LA FAMILIA GG SE TRAE LA COPA" */
  copa: string;
  /** lo que dice su burla, en el gesto fuerte */
  frases: string[];
  atletas: string[];
  /** el color del equipo, y uno clarito para los textos sobre fondo oscuro */
  color: number;
  claro: number;
  bandera: string;
  mascota?: string;
}

const TEXTOS: Record<string, Pick<Equipo, 'corto' | 'con' | 'gana' | 'copa' | 'frases' | 'bandera'>> = {
  familia_gg: { corto: 'FAMILIA GG', con: 'LA FAMILIA', gana: 'GANA LA FAMILIA GG', copa: 'LA FAMILIA GG SE TRAE LA COPA', frases: ['¡ASÍ MISMO!', '¡ESO, FAMILIA!', '¡BUENA ESA!'], bandera: 'flag_ve' },
  instituto_nekketsu: { corto: 'INSTITUTO', con: 'EL INSTITUTO', gana: 'GANA EL INSTITUTO', copa: 'EL INSTITUTO SE LLEVA LA COPA', frases: ['¡VEN, PUES!', '¿ESO ES TODO?', '¡NI ME DESPEINÉ!'], bandera: 'flag_jp' },
  rong_sai_gon: { corto: 'RỒNG SÀI GÒN', con: 'LOS RỒNG', gana: 'GANAN LOS RỒNG', copa: 'LOS RỒNG SE LLEVAN LA COPA', frases: ['¡HAY QUÁ!', '¡CỐ LÊN!', '¡EL DRAGÓN NO DUERME!'], bandera: 'flag_vn' },
  rolos_de_chapinero: { corto: 'ROLOS', con: 'LOS ROLOS', gana: 'GANAN LOS ROLOS', copa: 'LOS ROLOS SE LLEVAN LA COPA', frases: ['¡QUÉ OSO, SUMERCÉ!', '¡JA, QUÉ BOLETA!', '¡ESO ES TODO, PARCE?'], bandera: 'flag_co' },
  panas_de_caracas: { corto: 'PANAS', con: 'LOS PANAS', gana: 'GANAN LOS PANAS', copa: 'LOS PANAS SE LLEVAN LA COPA', frases: ['¡VEN, PUES, PANA!', '¡QUÉ NIVEL, MI REY!', '¡CHÉVERE!'], bandera: 'flag_ve' },
  maracuchos_del_lago: { corto: 'MARACUCHOS', con: 'LOS MARACUCHOS', gana: 'GANAN LOS MARACUCHOS', copa: 'LOS MARACUCHOS SE LLEVAN LA COPA', frases: ['¡¿Y QUÉ, PRIMO?!', '¡MOLLEJA, QUÉ LENTO!', '¡AH, VÁLGAME!'], bandera: 'flag_ve' },
};

/** El orden en que salen en la pantalla de equipos. */
export const ORDEN_EQUIPOS = ['familia_gg', 'instituto_nekketsu', 'rong_sai_gon', 'rolos_de_chapinero', 'panas_de_caracas', 'maracuchos_del_lago'];

const hex = (s: string) => parseInt(s.replace('#', ''), 16);
/** Un color más claro, para que el nombre se lea sobre el marcador oscuro. */
const aclarar = (c: number) => {
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  const k = (v: number) => Math.round(v + (255 - v) * 0.55);
  return (k(r) << 16) | (k(g) << 8) | k(b);
};

let cache: Record<string, Equipo> | null = null;

/** Todos los equipos que trae el kit, con sus textos. */
export function equipos(): Record<string, Equipo> {
  if (cache) return cache;
  const delKit = ((kit() as unknown as { equipos?: Record<string, { nombre: string; colores: string[]; atletas: string[]; mascota?: string }> }).equipos) ?? {};
  cache = {};
  for (const [id, e] of Object.entries(delKit)) {
    const t = TEXTOS[id] ?? { corto: e.nombre.toUpperCase(), con: e.nombre.toUpperCase(), gana: `GANA ${e.nombre.toUpperCase()}`, copa: `${e.nombre.toUpperCase()} SE LLEVA LA COPA`, frases: ['¡JA!'], bandera: 'flag_ve' };
    // los atletas que de verdad vinieron en el kit (si uno falta, el equipo juega con los que hay)
    const atletas = e.atletas.filter((a) => kit().atletas[a]);
    const color = hex(e.colores?.[0] ?? '#808080');
    cache[id] = { id, nombre: e.nombre, ...t, atletas, color, claro: aclarar(color), mascota: e.mascota };
  }
  return cache;
}

/** Los equipos que se pueden elegir (con sus cuatro atletas en el kit), en el orden de la pantalla. */
export const elegibles = () => ORDEN_EQUIPOS.map((id) => equipos()[id]).filter((e) => e && e.atletas.length >= 4);

export const equipo = (id: string) => equipos()[id];

/** El equipo de un atleta. */
export function equipoDe(atleta: string): Equipo {
  return Object.values(equipos()).find((e) => e.atletas.includes(atleta)) ?? equipos().familia_gg;
}

/**
 * El partido que se juega: tu equipo (lado 0) y el rival (lado 1). Lo pone la selección y la Olimpiada lo guarda en
 * su gira; sin elegir, la Familia GG contra el Instituto de siempre.
 */
let lados: [string, string] = ['familia_gg', 'instituto_nekketsu'];

export function setPartido(mio: string, rival: string) {
  if (equipos()[mio] && equipos()[rival]) lados = [mio, rival];
}

export const lado = (t: 0 | 1 | number): Equipo => equipos()[lados[t ? 1 : 0]] ?? equipos().familia_gg;
export const nuestros = () => lado(0).atletas;
export const ellos = () => lado(1).atletas;

/** Ajusta el partido para que la persona esté en su equipo (las pruebas que arrancan sin pasar por la selección). */
export function conJugador(jugador: string) {
  if (!lado(0).atletas.includes(jugador)) {
    const suyo = equipoDe(jugador).id;
    lados = [suyo, lados[1] === suyo ? (suyo === 'instituto_nekketsu' ? 'familia_gg' : 'instituto_nekketsu') : lados[1]];
  }
}
