import { CrossCountry, type Layout } from './CrossCountry';
import c13 from '../../data/stages/medellin_c13.layout.json';

/**
 * Obstáculos Comuna 13: la carrera de obstáculos del original, subiendo la Comuna 13 de Medellín desde la calle de
 * abajo hasta el mirador. Escaleras eléctricas que van al revés, escalones, muros, una viga sobre un hueco,
 * tendederos y perros dormidos. Saltar justo antes de un obstáculo da impulso.
 * Usa el mismo motor del Cross Country, con un solo tramo.
 */
export class Obstaculos extends CrossCountry {
  constructor() { super('Obstaculos', { tramos: [c13 as unknown as Layout], ciudad: 'MEDELLÍN', impulso: true }); }
}
