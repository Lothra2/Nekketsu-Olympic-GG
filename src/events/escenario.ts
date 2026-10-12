import Phaser from 'phaser';

/**
 * El arte de un escenario oblicuo de PixelForja (pedido 10.3), en `public/assets/escenarios/<id>/`.
 * `assets/escenarios/index.json` dice cuáles hay; si el de una prueba no está, la prueba se ve en gris.
 * Todo viene a escala 1, con x e y de pantalla (y = franja.atras + y del mundo).
 */

const BASE = 'assets/escenarios/';

interface Capa { archivo?: string; archivos?: string[]; trozo?: number; y: number; paralaje?: number; repetir_x?: boolean; clima?: string }
interface Cuadro { x: number; y: number; w: number; h: number }
interface Pieza { id: string; tipo: string; capa: 'cerca' | 'tras_cerca'; x: number; y: number; fps: number; velocidad?: number; cada?: number; cuadros: Cuadro[] }
interface Objeto { id: string; tipo: string; cuadro: Cuadro; x: number; y: number; orden: number }
interface Luz { x: number; y: number; color: string; radio: number; latido?: number; parpadeo?: number; encendida: boolean }
interface Particula { tipo: string; fx?: string; x0: number; x1: number; y0: number; y1: number; color?: string[]; cada: number; sube?: number; vida?: number }
export interface EscenarioJson {
  id: string; franja: { atras: number; adelante: number }; largo: number; clima: string[];
  capas: Record<string, Capa>;
  vida: { imagen: string; piezas: Pieza[] };
}

const k = (id: string, n: string) => `esc_${id}_${n}`;

/** Lo pone en la cola de carga si existe. Llamar en el preload de la escena. */
export function queueEscenario(scene: Phaser.Scene, id: string) {
  const index = scene.cache.json.get('escenarios') as Record<string, unknown> | undefined;
  if (!index?.[id] || scene.textures.exists(k(id, 'objetos'))) return;
  const dir = `${BASE}${id}/`;
  scene.load.json(k(id, 'escenario'), dir + 'escenario.json');
  scene.load.json(k(id, 'objetos_json'), dir + 'objetos.json');
  scene.load.json(k(id, 'luces'), dir + 'luces.json');
  scene.load.json(k(id, 'particulas'), dir + 'particulas.json');
  scene.load.once(`filecomplete-json-${k(id, 'escenario')}`, (_key: string, _t: string, e: EscenarioJson) => {
    for (const [n, c] of Object.entries(e.capas)) {
      // solo las imágenes: la capa de objetos apunta a su json
      if (c.archivo?.endsWith('.png')) scene.load.image(k(id, n), dir + c.archivo);
      c.archivos?.forEach((a, i) => { if (a.endsWith('.png')) scene.load.image(k(id, `${n}_${i}`), dir + a); });
    }
    scene.load.image(k(id, 'objetos'), dir + 'objetos.png');
    scene.load.image(k(id, 'vida'), dir + e.vida.imagen);
  });
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
  scene.add.image(0, C.cielo.y, k(id, 'cielo')).setOrigin(0).setScrollFactor(0).setDepth(-40);
  const lejos = scene.add.tileSprite(0, C.lejos.y, W, scene.textures.get(k(id, 'lejos')).getSourceImage().height, k(id, 'lejos')).setOrigin(0).setScrollFactor(0).setDepth(-35);
  // trozos de 1280: casas, piso y primer plano
  const trozos = (n: string, depth: number) => C[n]?.archivos?.forEach((_a, i) => scene.add.image(i * (C[n].trozo ?? 1280), C[n].y, k(id, `${n}_${i}`)).setOrigin(0).setDepth(depth));
  trozos('cerca', -20);
  trozos('piso', -15);
  trozos('frente', depthFrente);
  // objetos ordenados con los atletas
  const obj = scene.cache.json.get(k(id, 'objetos_json')) as { objetos: Objeto[] };
  for (const o of obj.objetos) scene.add.image(o.x, o.y, k(id, 'objetos'), cuadro(scene, k(id, 'objetos'), o.id, o.cuadro)).setOrigin(0).setDepth(FT + o.orden);
  // vida
  const vida = e.vida.piezas.map((p) => {
    const frames = p.cuadros.map((c, i) => cuadro(scene, k(id, 'vida'), `${p.id}_${i}`, c));
    const img = scene.add.image(p.x, p.y, k(id, 'vida'), frames[0]).setOrigin(0).setDepth(p.capa === 'tras_cerca' ? -22 : -19);
    return { p, img, frames, t: Math.random() * 3, vuela: false, x: p.x, y: p.y, espera: 0 };
  });
  // luces que laten y partículas sencillas (las que piden un efecto del kit esperan al lote F)
  const luces = ((scene.cache.json.get(k(id, 'luces')) as { luces: Luz[] }).luces ?? []).filter((l) => l.encendida).map((l) => {
    const c = Phaser.Display.Color.HexStringToColor(l.color).color;
    const g = scene.add.circle(l.x, l.y, l.radio, c, 0.18).setBlendMode(Phaser.BlendModes.ADD).setDepth(l.y < FT ? -18 : FT + (l.y - FT));
    return { l, g };
  });
  const parts = ((scene.cache.json.get(k(id, 'particulas')) as { particulas: Particula[] }).particulas ?? []).filter((p) => !p.fx).map((p) => {
    const tint = (p.color ?? ['#ffffff']).map((s) => Phaser.Display.Color.HexStringToColor(s).color);
    const em = scene.add.particles(0, 0, 'px', {
      lifespan: (p.vida ?? 1) * 1000, speedY: p.sube ? { min: -p.sube * 1.2, max: -p.sube * 0.6 } : 0, speedX: { min: -3, max: 3 },
      scale: { start: 0.5, end: 0.15 }, alpha: { start: 0.8, end: 0 }, tint, emitting: false,
    }).setDepth(p.y0 < FT ? -18 : FT + 130);
    return { p, em, t: Math.random() * p.cada };
  });

  return {
    /** Paralaje, vida y luces. `cerca(x, y)` dice si hay un atleta a mano (para espantar palomas). */
    tick(dt: number, camX: number, cerca: (x: number, y: number) => boolean) {
      lejos.tilePositionX = camX * (C.lejos.paralaje ?? 0.25);
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
        if (l.latido) g.setAlpha(0.12 + 0.1 * (0.5 + 0.5 * Math.sin(now * Math.PI * 2 * l.latido)));
        if (l.parpadeo) g.setVisible(Math.sin(now * 37 * l.parpadeo) > -0.7);
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
