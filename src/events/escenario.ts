import Phaser from 'phaser';
import { efecto, hayFx } from '../core/fx';
import { kit } from '../core/kit';
import { MAX_W } from '../core/pantalla';

/**
 * El arte de un escenario oblicuo de PixelForja (pedido 10.3), en `public/assets/escenarios/<id>/`.
 * `assets/escenarios/index.json` dice cuáles hay; si el de una prueba no está, la prueba se ve en gris.
 * Todo viene a escala 1, con x e y de pantalla (y = franja.atras + y del mundo).
 */

const BASE = 'assets/escenarios/';

interface Capa { archivo?: string; archivos?: string[]; trozo?: number; y: number; paralaje?: number; repetir_x?: boolean; clima?: string }
interface Cuadro { x: number; y: number; w: number; h: number }
/**
 * Una pieza de vida. Por capa:
 * - `tras_cerca`: entre la ciudad lejana y las casas (las motos del fondo que cruzan con `velocidad` y `cada`).
 * - `cerca`: encima de las casas, quieta, cambia de cuadro a `fps`.
 * - `lejos`: pegada a la capa lejos (x e y son pixeles de lejos.png), corre con su paralaje, se repite cada su ancho y
 *   va de `recorrido.desde` a `recorrido.hasta` en `recorrido.segundos` (el metrocable).
 * - `objeto`: encima de un objeto, ordenada con los atletas por su `orden` (los peldaños de la escalera eléctrica).
 */
interface Pieza {
  id: string; tipo: string; capa: 'cerca' | 'tras_cerca' | 'lejos' | 'objeto'; x: number; y: number; fps: number;
  velocidad?: number; cada?: number; orden?: number; cuadros: Cuadro[];
  recorrido?: { desde: [number, number]; hasta: [number, number]; segundos: number; desfase?: number };
}
interface Objeto { id: string; tipo: string; cuadro: Cuadro; x: number; y: number; orden: number }
/** Una luz: `latido` respira suave; `parpadeo` prende y apaga con ese período en segundos (las luces rojas, los neones). */
interface Luz { x: number; y: number; color: string; radio: number; latido?: number; parpadeo?: number; encendida: boolean }
interface Particula { tipo: string; fx?: string; x0: number; x1: number; y0: number; y1: number; color?: string[]; cada: number; sube?: number; vida?: number }
export interface EscenarioJson {
  id: string; franja: { atras: number; adelante: number }; largo: number; clima: string[];
  /** la vista inclinada con que PixelForja pintó el piso (px = x + inclinacion * y); sin el campo, derecho */
  inclinacion?: number;
  /** lo ancho que viene pintado (largo + inclinación por el fondo de la franja) */
  ancho?: number;
  capas: Record<string, Capa>;
  /** el filo que se desmorona y el vacío de abajo, para cuando el borde avanza (la azotea que se achica) */
  borde?: { filo: { archivo: string; w: number; h: number; cuadros: number; fps: number; ancla: [number, number] }; vacio: { archivo: string; w: number; h: number } };
  vida: { imagen: string; piezas: Pieza[] };
}

const k = (id: string, n: string) => `esc_${id}_${n}`;

/**
 * Lo pone en la cola de carga si existe. Llamar en el preload de la escena. Si el índice lo marca `junto` (la copia
 * del artifact, que tiene un tope de archivos), los cuatro JSON del escenario vienen en uno solo: `junto.json`.
 */
export function queueEscenario(scene: Phaser.Scene, id: string) {
  const index = scene.cache.json.get('escenarios') as Record<string, { junto?: boolean }> | undefined;
  if (!index?.[id] || scene.textures.exists(k(id, 'objetos'))) return;
  const dir = `${BASE}${id}/`;
  const imagenes = (e: EscenarioJson) => {
    for (const [n, c] of Object.entries(e.capas)) {
      // solo las imágenes: la capa de objetos apunta a su json
      if (c.archivo?.endsWith('.png')) scene.load.image(k(id, n), dir + c.archivo);
      c.archivos?.forEach((a, i) => { if (a.endsWith('.png')) scene.load.image(k(id, `${n}_${i}`), dir + a); });
    }
    scene.load.image(k(id, 'objetos'), dir + 'objetos.png');
    if (e.borde) {
      scene.load.spritesheet(k(id, 'filo'), dir + e.borde.filo.archivo, { frameWidth: e.borde.filo.w, frameHeight: e.borde.filo.h });
      scene.load.image(k(id, 'vacio'), dir + e.borde.vacio.archivo);
    }
    scene.load.image(k(id, 'vida'), dir + e.vida.imagen);
  };
  if (index[id].junto) {
    scene.load.json(k(id, 'junto'), dir + 'junto.json');
    scene.load.once(`filecomplete-json-${k(id, 'junto')}`, (_key: string, _t: string, j: { escenario: EscenarioJson; objetos: unknown; luces: unknown; particulas: unknown }) => {
      scene.cache.json.add(k(id, 'escenario'), j.escenario);
      scene.cache.json.add(k(id, 'objetos_json'), j.objetos);
      scene.cache.json.add(k(id, 'luces'), j.luces);
      scene.cache.json.add(k(id, 'particulas'), j.particulas);
      imagenes(j.escenario);
    });
    return;
  }
  scene.load.json(k(id, 'escenario'), dir + 'escenario.json');
  scene.load.json(k(id, 'objetos_json'), dir + 'objetos.json');
  scene.load.json(k(id, 'luces'), dir + 'luces.json');
  scene.load.json(k(id, 'particulas'), dir + 'particulas.json');
  scene.load.once(`filecomplete-json-${k(id, 'escenario')}`, (_key: string, _t: string, e: EscenarioJson) => imagenes(e));
}

export const hayArte = (scene: Phaser.Scene, id: string) => scene.textures.exists(k(id, 'objetos')) && scene.cache.json.exists(k(id, 'escenario'));

/** Un rectángulo de un atlas como cuadro con nombre, para usarlo en imágenes. */
function cuadro(scene: Phaser.Scene, tex: string, name: string, c: Cuadro) {
  const t = scene.textures.get(tex);
  if (!t.has(name)) t.add(name, 0, c.x, c.y, c.w, c.h);
  return name;
}

/**
 * Pinta el escenario y devuelve lo que se mueve cada cuadro: paralaje, vida, palomas que se espantan,
 * luces que laten y partículas.
 */
export function pintarEscenario(scene: Phaser.Scene, id: string, depthFrente: number) {
  const e = scene.cache.json.get(k(id, 'escenario')) as EscenarioJson;
  const FT = e.franja.atras;
  const C = e.capas;
  const W = scene.scale.width;
  // cielo quieto y ciudad lejana con su paralaje
  // (el cielo cierra el ciclo a lo ancho: se repite para cubrir la pantalla más ancha)
  // (quietos a lo ancho pero siguiendo a la cámara en vertical: en la pelea la cámara sube y baja con la acción)
  scene.add.tileSprite(0, C.cielo.y, MAX_W, scene.textures.get(k(id, 'cielo')).getSourceImage().height, k(id, 'cielo')).setOrigin(0).setScrollFactor(0, 1).setDepth(-40);
  const lejos = scene.add.tileSprite(0, C.lejos.y, MAX_W, scene.textures.get(k(id, 'lejos')).getSourceImage().height, k(id, 'lejos')).setOrigin(0).setScrollFactor(0, 1).setDepth(-35);
  // trozos de 1280: casas, piso y primer plano
  const trozos = (n: string, depth: number) => C[n]?.archivos?.forEach((_a, i) => scene.add.image(i * (C[n].trozo ?? 1280), C[n].y, k(id, `${n}_${i}`)).setOrigin(0).setDepth(depth));
  trozos('cerca', -20);
  trozos('piso', -15);
  trozos('frente', depthFrente);
  // objetos ordenados con los atletas
  const obj = scene.cache.json.get(k(id, 'objetos_json')) as { objetos: Objeto[] };
  const objetos = obj.objetos.map((o) => ({ o, img: scene.add.image(o.x, o.y, k(id, 'objetos'), cuadro(scene, k(id, 'objetos'), o.id, o.cuadro)).setOrigin(0).setDepth(FT + o.orden) }));
  // vida: la de la capa lejos va aparte (pegada a la ciudad lejana, con su paralaje)
  const anchoLejos = scene.textures.get(k(id, 'lejos')).getSourceImage().width;
  const profundidad = (p: Pieza) => (p.capa === 'tras_cerca' ? -22 : p.capa === 'objeto' ? FT + (p.orden ?? 0) : -19);
  const vida = e.vida.piezas.filter((p) => p.capa !== 'lejos').map((p) => {
    const frames = p.cuadros.map((c, i) => cuadro(scene, k(id, 'vida'), `${p.id}_${i}`, c));
    const img = scene.add.image(p.x, p.y, k(id, 'vida'), frames[0]).setOrigin(0).setDepth(profundidad(p));
    return { p, img, frames, t: Math.random() * 3, vuela: false, x: p.x, y: p.y, espera: 0 };
  });
  // en la capa lejos: copias cada ancho de lejos.png, las que hagan falta para cubrir la pantalla más ancha
  const copias = Math.ceil(MAX_W / anchoLejos) + 1;
  const lejana = e.vida.piezas.filter((p) => p.capa === 'lejos' && p.recorrido).map((p) => {
    const frames = p.cuadros.map((c, i) => cuadro(scene, k(id, 'vida'), `${p.id}_${i}`, c));
    const imgs = Array.from({ length: copias }, () => scene.add.image(0, C.lejos.y + p.recorrido!.desde[1], k(id, 'vida'), frames[0]).setOrigin(0).setScrollFactor(0, 1).setDepth(-34));
    return { p, imgs, frames };
  });
  // luces que laten y partículas sencillas (las que piden un efecto del kit esperan al lote F)
  // un brillo redondo que se apaga hacia afuera (un disco plano se ve como una mancha)
  if (!scene.textures.exists('luz_suave')) {
    const t = scene.textures.createCanvas('luz_suave', 128, 128)!;
    const ctx = t.getContext();
    const gr = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, 128, 128);
    t.refresh();
  }
  const luces = ((scene.cache.json.get(k(id, 'luces')) as { luces: Luz[] }).luces ?? []).filter((l) => l.encendida).map((l) => {
    const c = Phaser.Display.Color.HexStringToColor(l.color).color;
    const g = scene.add.image(l.x, l.y, 'luz_suave').setScale((l.radio * 2) / 128).setTint(c).setAlpha(0.22).setBlendMode(Phaser.BlendModes.ADD).setDepth(l.y < FT ? -18 : FT + (l.y - FT));
    return { l, g };
  });
  // partículas: las que piden un efecto del kit lo usan; las demás son puntitos que suben o brillan
  const conFx = ((scene.cache.json.get(k(id, 'particulas')) as { particulas: Particula[] }).particulas ?? []).filter((p) => p.fx && hayFx(p.fx)).map((p) => ({ p, t: Math.random() * p.cada }));
  // los fuegos artificiales esperan a que la escena los pida (al final de la pelea, cuando alguien llega)
  let fuegos = false;
  const parts = ((scene.cache.json.get(k(id, 'particulas')) as { particulas: Particula[] }).particulas ?? []).filter((p) => !p.fx).map((p) => {
    const tint = (p.color ?? ['#ffffff']).map((s) => Phaser.Display.Color.HexStringToColor(s).color);
    const em = scene.add.particles(0, 0, 'px', {
      lifespan: (p.vida ?? 1) * 1000, speedY: p.sube ? { min: -p.sube * 1.2, max: -p.sube * 0.6 } : 0, speedX: { min: -3, max: 3 },
      scale: { start: 0.5, end: 0.15 }, alpha: { start: 0.8, end: 0 }, tint, emitting: false,
    }).setDepth(p.y0 < FT ? -18 : FT + 130);
    return { p, em, t: Math.random() * p.cada };
  });

  return {
    /** con cuánto se inclinó el dibujo: el juego corre a los atletas igual */
    inclinacion: e.inclinacion ?? 0,
    /** lo ancho que viene pintado */
    ancho: e.ancho ?? e.largo,
    /** prende (o apaga) los fuegos artificiales del escenario, si los trae */
    fuegos(on: boolean) { fuegos = on; for (const q of conFx) if (q.p.tipo === 'fuegos') q.t = Math.random() * 0.4; },
    /** los objetos pintados (las antenas), para que la escena los tumbe si hace falta */
    objetos,
    /** las texturas del borde que avanza, si el escenario las trae */
    borde: e.borde && scene.textures.exists(k(id, 'filo')) ? { tex: { filo: k(id, 'filo'), vacio: k(id, 'vacio') }, ...e.borde } : null,
    /** Paralaje, vida y luces. `cerca(x, y)` dice si hay un atleta a mano (para espantar palomas). */
    tick(dt: number, camX: number, cerca: (x: number, y: number) => boolean) {
      const lejosX = camX * (C.lejos.paralaje ?? 0.25);
      lejos.tilePositionX = lejosX;
      const ahora = scene.time.now / 1000;
      for (const { p, imgs, frames } of lejana) {
        const r = p.recorrido!;
        const f = (((ahora / r.segundos + (r.desfase ?? 0)) % 1) + 1) % 1;
        const x = r.desde[0] + (r.hasta[0] - r.desde[0]) * f, y = r.desde[1] + (r.hasta[1] - r.desde[1]) * f;
        // la vuelta: x en lejos.png, menos lo que corrió la capa, llevado a la primera copia que asoma por la izquierda
        let sx = (((x - lejosX) % anchoLejos) + anchoLejos) % anchoLejos;
        if (sx > 0) sx -= anchoLejos;
        const cuadroAhora = frames[Math.floor(ahora * (p.fps || 1)) % frames.length];
        imgs.forEach((img, i) => img.setPosition(Math.round(sx + i * anchoLejos), Math.round(C.lejos.y + y)).setFrame(cuadroAhora));
      }
      for (const v of vida) {
        v.t += dt;
        const { p } = v;
        if (p.velocidad) {
          // las motos del fondo cruzan y vuelven cada tanto
          if (v.espera > 0) { v.espera -= dt; v.img.setVisible(false); continue; }
          v.x += p.velocidad * dt;
          if (v.x < -60 || v.x > e.largo + 60) { v.x = p.x; v.espera = p.cada ?? 5; }
          v.img.setVisible(true).setPosition(Math.round(v.x), p.y).setFrame(v.frames[Math.floor(v.t * p.fps) % v.frames.length]);
          continue;
        }
        if (p.tipo === 'palomas' && v.frames.length >= 4) {
          // paradas picotean; si pasa alguien cerca, salen volando y vuelven al rato
          if (!v.vuela && cerca(p.x + 17, p.y)) { v.vuela = true; v.t = 0; }
          if (v.vuela) {
            v.x += 40 * dt; v.y -= 30 * dt;
            v.img.setPosition(Math.round(v.x), Math.round(v.y)).setFrame(v.frames[2 + (Math.floor(v.t * 8) % 2)]).setAlpha(Math.max(0, 1 - v.t / 2.5));
            if (v.t > 6) { v.vuela = false; v.x = p.x; v.y = p.y; v.img.setAlpha(1).setPosition(p.x, p.y); }
          } else v.img.setFrame(v.frames[Math.floor(v.t * p.fps) % 2]);
          continue;
        }
        v.img.setFrame(v.frames[Math.floor(v.t * p.fps) % v.frames.length]);
      }
      const now = scene.time.now / 1000;
      for (const { l, g } of luces) {
        if (l.latido) g.setAlpha(0.14 + 0.12 * (0.5 + 0.5 * Math.sin(now * Math.PI * 2 * l.latido)));
        if (l.parpadeo) g.setVisible(now % l.parpadeo < l.parpadeo / 2);
      }
      for (const q of conFx) {
        if (q.p.tipo === 'fuegos' && !fuegos) continue;
        q.t -= dt;
        if (q.t > 0) continue;
        q.t = q.p.cada;
        if (q.p.x1 < camX - 40 || q.p.x0 > camX + W + 40) continue;
        const x = Phaser.Math.Between(Math.max(q.p.x0, camX - 20), Math.min(q.p.x1, camX + W + 20)), y = Phaser.Math.Between(q.p.y0, q.p.y1);
        const s = efecto(scene, q.p.fx!, x, y, { depth: y < FT ? -18 : y - 0.5, alpha: 0.85 });
        if (s && kit().fx?.[q.p.fx!]?.loop) scene.tweens.add({ targets: s, alpha: 0, delay: 1200, duration: 400, onComplete: () => s.destroy() });
      }
      for (const q of parts) {
        q.t -= dt;
        if (q.t > 0) continue;
        q.t = q.p.cada;
        if (q.p.x1 < camX - 40 || q.p.x0 > camX + W + 40) continue;
        q.em.emitParticleAt(Phaser.Math.Between(q.p.x0, q.p.x1), Phaser.Math.Between(q.p.y0, q.p.y1), 1);
      }
    },
  };
}
