import Phaser from 'phaser';

/**
 * Niveles de dificultad. Todo lo que cambia entre niveles vive aquí, para afinarlo viendo jugar a la familia.
 * El nivel elegido se guarda en el navegador y sigue la próxima vez.
 */
export type Nivel = 'paseo' | 'normal' | 'nekketsu';
export const ORDEN: Nivel[] = ['paseo', 'normal', 'nekketsu'];

export interface Ajustes {
  nombre: string;
  /** para el menú, en una línea */
  desc: string;
  /** velocidad de la máquina en las carreras (1 = la de siempre) */
  cpuVel: number;
  /** qué tanto pega la máquina (1 = lo de siempre; menos es más lento para atacar) */
  cpuAgresion: number;
  /** vida de tu equipo (1 = la de siempre) */
  vida: number;
  /** daño de tu equipo (1 = el de siempre) */
  daño: number;
  /** cuánto afloja la máquina si vas atrás y aprieta si vas adelante (0 = nada) */
  ayuda: number;
  /** en vallas, la velocidad que te queda al tumbar una valla */
  tropiezo: number;
  /** jabalina: la raya no da nulo, lanza sola al llegar */
  sinNulo: boolean;
  /** natación: tirarse antes del ¡YA! no castiga */
  sinFalso: boolean;
  /** Kachinuki: cuántas veces Thor te salva si te caes de la azotea */
  rescates: number;
}

export const NIVELES: Record<Nivel, Ajustes> = {
  paseo: {
    nombre: 'PASEO', desc: 'LA MÁQUINA VA SUAVE Y TÚ AGUANTAS MÁS. PARA EMPEZAR',
    cpuVel: 0.74, cpuAgresion: 0.4, vida: 2, daño: 1.5, ayuda: 1, tropiezo: 0.75, sinNulo: true, sinFalso: true, rescates: 99,
  },
  normal: {
    nombre: 'NORMAL', desc: 'PAREJO, CON UNA AYUDITA SI TE QUEDAS ATRÁS',
    cpuVel: 0.9, cpuAgresion: 0.75, vida: 1.25, daño: 1.15, ayuda: 0.6, tropiezo: 0.45, sinNulo: false, sinFalso: false, rescates: 1,
  },
  nekketsu: {
    nombre: 'NEKKETSU', desc: 'SIN AYUDA. COMO EN LA NES',
    cpuVel: 1, cpuAgresion: 1, vida: 1, daño: 1, ayuda: 0, tropiezo: 0.35, sinNulo: false, sinFalso: false, rescates: 0,
  },
};

const CLAVE = 'ngg_nivel';
let actual: Nivel | null = null;

export function nivel(): Nivel {
  if (actual) return actual;
  let n: string | null = null;
  try { n = localStorage.getItem(CLAVE); } catch { /* sin almacenamiento: queda el normal */ }
  actual = ORDEN.includes(n as Nivel) ? (n as Nivel) : 'normal';
  return actual;
}

export function setNivel(n: Nivel) {
  actual = n;
  try { localStorage.setItem(CLAVE, n); } catch { /* no se guarda, pero vale para esta partida */ }
}

export const ajustes = (): Ajustes => NIVELES[nivel()];

/**
 * La "goma": multiplica la velocidad de la máquina según cuánto va adelante (positivo) o atrás de la persona,
 * en pixeles. Adelante afloja, atrás aprieta un poco. Con ayuda 0 no hace nada.
 */
export function goma(ventaja: number, a = ajustes()): number {
  if (!a.ayuda) return 1;
  return Phaser.Math.Clamp(1 - (a.ayuda * ventaja) / 900, 1 - 0.32 * a.ayuda, 1 + 0.1 * a.ayuda);
}
