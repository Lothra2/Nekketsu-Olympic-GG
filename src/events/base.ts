import Phaser from 'phaser';
import { MAX_W } from '../core/pantalla';
import { Input, rotular } from '../core/input';
import { chip, PELEA } from '../core/music';
import { kit, bucle, nombreCorto } from '../core/kit';
import { txt, flash, pantallaCarga, speedLines } from '../core/ui';
import { efecto } from '../core/fx';
import { letreroGrande, MarcadorTV, hayUi } from '../core/interfaz';
import { Coach, type Paso } from '../core/coach';
import { nuestros, ellos, conJugador, lado, victoria } from '../core/equipos';
import { cargarAtletas, packsDe } from '../core/carga';
import { hayArte, pintarEscenario } from './escenario';

export interface EventData { jugador: string; gira?: boolean; practica?: boolean }
export interface Competidor { id: string; team: 0 | 1; human: boolean }

/** Estado de la Olimpiada Express (vive en el registro de Phaser). `pruebas`: los ids sorteados para esta gira. */
/** La Olimpiada en curso. `equipos` es el partido: [el tuyo, el rival] (sin el campo, la Familia contra el Instituto). */
export interface Gira { jugador: string; idx: number; puntos: [number, number]; resultados: { prueba: string; podio: string[] }[]; pruebas?: string[]; equipos?: [string, string] }

/** Una prueba que puede tocar en la gira: su escena, con qué datos arranca y su bandera en el medallero. */
export interface PruebaGira { id: string; scene: string; nombre: string; lugar: string; bandera: string; datos?: Record<string, unknown> }

/** Todas las pruebas jugables. La final (el Kachinuki) va siempre de última. */
export const PRUEBAS_GIRA: PruebaGira[] = [
  { id: 'CrossCountry', scene: 'CrossCountry', nombre: 'CROSS COUNTRY', lugar: 'SAIGÓN, VIETNAM', bandera: 'flag_vn' },
  { id: 'Obstaculos', scene: 'Obstaculos', nombre: 'OBSTÁCULOS COMUNA 13', lugar: 'MEDELLÍN, COLOMBIA', bandera: 'flag_co' },
  { id: 'Vallas', scene: 'Vallas', nombre: 'VALLAS DEL CAFÉ', lugar: 'EJE CAFETERO, COLOMBIA', bandera: 'flag_co' },
  { id: 'Natacion', scene: 'Natacion', nombre: 'NATACIÓN HẠ LONG', lugar: 'BAHÍA DE HẠ LONG, VIETNAM', bandera: 'flag_vn' },
  { id: 'Jabalina', scene: 'Jabalina', nombre: 'JABALINA LLANERA', lugar: 'LLANOS DE APURE, VENEZUELA', bandera: 'flag_ve' },
  { id: 'Azoteas', scene: 'Azoteas', nombre: 'AZOTEAS DE CARTAGENA', lugar: 'CARTAGENA, COLOMBIA', bandera: 'flag_co' },
  { id: 'Tamawari', scene: 'Tamawari', nombre: 'TAMA-WARI HỘI AN', lugar: 'HỘI AN, VIETNAM', bandera: 'flag_vn' },
  { id: 'DaCau', scene: 'DaCau', nombre: 'ĐÁ CẦU TAO ĐÀN', lugar: 'SAIGÓN, VIETNAM', bandera: 'flag_vn' },
  { id: 'Tejo', scene: 'Tejo', nombre: 'TEJO LA CANDELARIA', lugar: 'BOGOTÁ, COLOMBIA', bandera: 'flag_co' },
  { id: 'Quemado', scene: 'Quemado', nombre: 'QUEMADO NEKKETSU', lugar: 'PATIO DEL LICEO, CARACAS', bandera: 'flag_ve' },
  { id: 'Chapita', scene: 'Chapita', nombre: 'CHAPITA', lugar: 'BARRIO DE CARACAS, VENEZUELA', bandera: 'flag_ve' },
  { id: 'Voley', scene: 'Voley', nombre: 'VÓLEY PLAYA MARGARITA', lugar: 'PLAYA EL AGUA, MARGARITA', bandera: 'flag_ve' },
  { id: 'Tenis', scene: 'Tenis', nombre: 'TENIS DE DOBLES', lugar: 'ĐÀ LẠT, VIETNAM', bandera: 'flag_vn' },
  { id: 'Futbol', scene: 'Futbol', nombre: 'FÚTBOL CALLEJERO', lugar: 'CARNAVAL DE BARRANQUILLA, COLOMBIA', bandera: 'flag_co' },
  { id: 'Basket', scene: 'Basket', nombre: 'BÁSQUET 3X3', lugar: 'MARACAIBO, VENEZUELA', bandera: 'flag_ve' },
  { id: 'Judo', scene: 'Fight', nombre: 'JUDO Y VOVINAM', lugar: 'HÀ NỘI, VIETNAM', bandera: 'flag_vn', datos: { modo: 'judo' } },
  { id: 'Fight', scene: 'Fight', nombre: 'KACHINUKI FINAL', lugar: 'AZOTEA DE CARACAS, VENEZUELA', bandera: 'flag_ve', datos: { modo: '4v4', rival: 'kenji' } },
];
/** Cuántas pruebas sortea la gira antes de la final. */
export const SORTEO = 5;

/** Los datos de una prueba por su escena (o por su id). */
export const prueba = (scene: string) => PRUEBAS_GIRA.find((p) => p.id === scene) ?? PRUEBAS_GIRA.find((p) => p.scene === scene)!;

/**
 * Sortea la gira: cinco pruebas al azar, con al menos una de Vietnam y una de Colombia (Venezuela ya tiene la
 * final), en el orden del catálogo, y el Kachinuki al final.
 */
export function sortearGira(): string[] {
  const pool = PRUEBAS_GIRA.filter((p) => p.id !== 'Fight');
  for (let intento = 0; intento < 50; intento++) {
    const elegidas = [...pool].sort(() => Math.random() - 0.5).slice(0, SORTEO);
    if (!elegidas.some((p) => p.bandera === 'flag_vn') || !elegidas.some((p) => p.bandera === 'flag_co')) continue;
    return [...pool.filter((p) => elegidas.includes(p)).map((p) => p.id), 'Fight'];
  }
  return ['CrossCountry', 'Obstaculos', 'Vallas', 'Natacion', 'Jabalina', 'Fight'];
}

/** Las pruebas de esta gira (las de siempre si viene de antes del sorteo). */
export const pruebasDe = (g: Gira): PruebaGira[] =>
  (g.pruebas ?? ['CrossCountry', 'Obstaculos', 'Vallas', 'Natacion', 'Jabalina', 'Fight']).map((id) => prueba(id));
export const PUNTOS = [10, 6, 4, 2];


/** Los 4 de una prueba individual: tú, un compañero de tu equipo y dos del equipo rival. */
export function lineup(jugador: string): Competidor[] {
  const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
  const comp = pick(nuestros().filter((f) => f !== jugador));
  const inst = [...ellos()].sort(() => Math.random() - 0.5).slice(0, 2);
  return [
    { id: jugador, team: 0, human: true },
    { id: comp, team: 0, human: false },
    { id: inst[0], team: 1, human: false },
    { id: inst[1], team: 1, human: false },
  ];
}

/**
 * Base de las pruebas: capa de marcador sin zoom, cámara que se acerca, cuenta regresiva, letreros y la tabla
 * de resultados con medallas. En la Olimpiada suma puntos y pasa a la siguiente.
 */
export abstract class EventScene extends Phaser.Scene {
  protected ui!: Phaser.GameObjects.Layer;
  protected uiCam!: Phaser.Cameras.Scene2D.Camera;
  protected pad!: Input;
  protected d!: EventData;
  protected gente: Competidor[] = [];
  protected fase: 'previa' | 'juego' | 'fin' = 'previa';
  protected coach: Coach | null = null;
  private endChoice: ((p: ReturnType<Input['read']>) => void) | null = null;

  init(d: EventData) {
    this.d = { jugador: d.jugador ?? 'rick', gira: !!d.gira, practica: !!d.practica };
    // la persona juega con su equipo, aunque la prueba arranque sin pasar por la selección
    conJugador(this.d.jugador);
    // en el entrenamiento estás solo: nadie te apura
    this.gente = this.d.practica ? [{ id: this.d.jugador, team: 0, human: true }] : lineup(this.d.jugador);
    this.coach = null;
    this.fase = 'previa';
    this.endChoice = null;
    this.ultimo = -1;
  }

  /**
   * Las animaciones de los dos equipos que usa esta prueba (y se sueltan las demás). Las pruebas que tienen su
   * preload lo llaman con super.preload().
   */
  preload() {
    pantallaCarga(this, prueba(this.scene.key)?.nombre ?? '');
    cargarAtletas(this, [...nuestros(), ...ellos()], packsDe(this.scene.key), undefined, true);
  }

  /** Prepara capas y cámara. Llamar al inicio de create(). */
  /** lo que mide el mundo para la cámara: con las canchas a 800 va de -margen a largo - margen */
  private mundo = { zoom: 1, x0: 0, w: 640, margen: 0 };
  private llenar: () => void = () => {};

  protected setup(zoom: number, worldW: number) {
    this.cameras.main.fadeIn(250);
    this.registry.set('marchaSonando', false);
    this.ui = this.add.layer().setDepth(10000);
    const cam = this.cameras.main;
    this.mundo = { zoom, x0: 0, w: worldW, margen: 0 };
    cam.setZoom(zoom).setBounds(0, 0, worldW, 360);
    // en los celulares alargados una cancha fija (640 de mundo) no alcanzaba a cubrir lo ancho de la pantalla: la
    // cámara la pegaba a la izquierda y a la derecha se veía el vacío o el arte repetido. Se acerca lo justo para
    // que la cancha llene la pantalla. Con el arte de las canchas a 800 (lote E4) ya no hace falta: hay escenario a
    // los lados y la cámara va centrada en la cancha
    const llenar = () => {
      const m = this.mundo;
      const z = Math.max(m.zoom, this.scale.gameSize.width / m.w);
      if (Math.abs(cam.zoom - z) > 0.001) cam.setZoom(z);
      if (m.margen) cam.centerOnX(320);
    };
    this.llenar = llenar;
    llenar();
    this.scale.on(Phaser.Scale.Events.RESIZE, llenar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, llenar));
    cam.ignore(this.ui);
    this.uiCam = this.cameras.add(0, 0, 640, 360).setName('ui');
    this.pad = new Input(this, undefined, this.ui);
  }

  /**
   * Fondo con paralaje que se repite sin costura: el cuadro y su espejo, uno al lado del otro.
   */
  /** el tema del mundo que suena en bucle (lo pone `tema()`) */
  private temaSonando: Phaser.Sound.BaseSound | null = null;

  /**
   * El tema del mundo de la prueba (lotes H2 y H3 de PixelForja) en bucle. Si el kit no lo trae, la pelea del chip de
   * siempre. Se calla solo al llegar a los resultados.
   */
  protected tema(n: string | null) {
    this.temaSonando = null;
    if (!n || !kit().audio.musica?.[n]) { chip.play(PELEA); return; }
    chip.stop(0.2);
    void bucle(this, 'musica', n, 0.4).then((s) => { this.temaSonando = s; if (this.fase === 'fin') this.callarTema(); });
  }

  /** el ambiente del lugar que suena debajo de la música (lo pone `ambiente()`) */
  private ambienteSonando: Phaser.Sound.BaseSound | null = null;

  /** El ambiente del lugar (lote H6: mar, cafetal, llano) en bucle, bajito y desde un punto al azar. Se calla con el tema. */
  protected ambiente(n: string) {
    // el anterior se calla: el Cross cambia de ambiente en cada tramo
    this.ambienteSonando?.stop();
    this.ambienteSonando = null;
    if (!kit().audio.ambientes?.[n]) return;
    void bucle(this, 'ambientes', n, 0.3, true).then((s) => { this.ambienteSonando = s; if (this.fase === 'fin') this.callarTema(); });
  }

  private callarTema() {
    for (const s of [this.temaSonando, this.ambienteSonando]) if (s) this.tweens.add({ targets: s, volume: 0, duration: 300, onComplete: () => s.stop() });
    this.temaSonando = null;
    this.ambienteSonando = null;
  }

  /** Un efecto del kit, si lo trae; si no, `siNo` (el sonido sintetizado de antes). */
  protected suena(n: string, volumen = 0.5, siNo?: () => void, rate = 1) {
    if (this.cache.audio.exists(n)) this.sound.play(n, { volume: volumen, rate });
    else siNo?.();
  }

  /** el arte de PixelForja del escenario de la prueba, si llegó (lo pone `escenario()`) */
  protected arteFondo: ReturnType<typeof pintarEscenario> | null = null;

  /**
   * El escenario de PixelForja (encolado en el preload con queueEscenario) si llegó, con su vida y sus luces andando
   * cada cuadro. Si no llegó, el fondo pintado por código de siempre: una imagen, o lo que arme `respaldo` (los
   * fondos que se repiten a lo ancho). Devuelve si hay arte.
   */
  protected escenario(id: string, respaldo: string | (() => void)): boolean {
    this.arteFondo = hayArte(this, id) ? pintarEscenario(this, id, 5000) : null;
    if (!this.arteFondo) {
      if (typeof respaldo === 'string') this.add.image(320, 180, respaldo).setDepth(-10);
      else respaldo();
      return false;
    }
    this.montarArte();
    return true;
  }

  /**
   * Monta el arte ya pintado (`arteFondo`): con la cancha a 800 (lote E4) la cámara puede ver el escenario de los
   * lados, sin acercarse, y la paralaje va con la x del arte. Las pruebas que pintan su arte a mano también lo llaman.
   */
  protected montarArte() {
    if (!this.arteFondo) return;
    const M = this.arteFondo.margen;
    if (M > 0) {
      this.mundo = { ...this.mundo, x0: -M, w: this.arteFondo.largo, margen: M };
      this.cameras.main.setBounds(-M, 0, this.arteFondo.largo, 360);
      this.llenar();
    }
    const tick = (_t: number, dms: number) => this.arteFondo?.tick(Math.min(0.05, dms / 1000), this.cameras.main.scrollX + M, () => false);
    this.events.on(Phaser.Scenes.Events.UPDATE, tick);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.events.off(Phaser.Scenes.Events.UPDATE, tick));
  }

  protected fondo(key: string): Phaser.GameObjects.TileSprite {
    const k = `${key}_espejo`;
    if (!this.textures.exists(k)) {
      const src = this.textures.get(key).getSourceImage() as HTMLCanvasElement;
      const c = document.createElement('canvas');
      c.width = src.width * 2; c.height = src.height;
      const x = c.getContext('2d')!;
      x.imageSmoothingEnabled = false;
      x.drawImage(src, 0, 0);
      x.save(); x.scale(-1, 1); x.drawImage(src, -c.width, 0); x.restore();
      this.textures.addCanvas(k, c);
    }
    // de lado a lado de la pantalla, también en las anchas
    return this.add.tileSprite(0, 0, MAX_W, 360, k).setOrigin(0).setScrollFactor(0).setDepth(-10);
  }

  /** Para que nadie se quede esperando: si la persona no llega, se cierra igual un rato después de los demás. */
  protected porTiempo(listos: boolean[], humano: boolean, clock: number): boolean {
    if (humano) { this.ultimo = this.ultimo < 0 ? clock : this.ultimo; return clock - this.ultimo > 4 || listos.every(Boolean); }
    if (listos.filter(Boolean).length >= listos.length - 1) { this.ultimo = this.ultimo < 0 ? clock : this.ultimo; return clock - this.ultimo > 7; }
    return false;
  }
  private ultimo = -1;

  protected uiAdd<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.ui.add(o);
    return o;
  }

  /** La cámara del marcador solo dibuja el marcador. Llamar al final de cada update. */
  protected filterUi() {
    const id = this.uiCam.id;
    for (const o of this.children.list) if ((o as unknown) !== this.ui) o.cameraFilter |= id;
  }

  /** Los puntos en números de marcador de TV del kit, sobre su placa (o el texto de siempre si no están). */
  protected marcadorTV(x: number, y: number, depth = 8001): { setText(s: string): unknown } {
    if (MarcadorTV.disponible(this)) { const m = new MarcadorTV(this, x, y).setText('0 - 0'); this.uiAdd(m.c.setDepth(depth)); return m; }
    return this.uiAdd(txt(this, x, y, '0 - 0', 'fuente_titulo', 1).setDepth(depth));
  }

  protected banner(s: string, font: 'fuente_titulo' | 'fuente_titulo_plata' | 'fuente_ui', scale: number, hold: number, y = 150) {
    return letreroGrande(this, (o) => this.uiAdd(o), s, font, scale, hold, y);
  }

  /** la cámara lenta: cuánto le queda y a qué velocidad va el juego mientras tanto */
  private lentoT = 0;
  private lentoK = 1;

  /** El paso de tiempo del juego en este cuadro: el de siempre, o en cámara lenta mientras dura la jugada. */
  protected dtJuego(dms: number): number {
    const real = Math.min(0.05, dms / 1000);
    if (this.lentoT <= 0) return real;
    this.lentoT -= real;
    return real * this.lentoK;
  }

  /** La cámara lenta un ratito. */
  protected camaraLenta(seg: number, k = 0.25) { this.lentoT = Math.max(this.lentoT, seg); this.lentoK = k; }

  /**
   * El golpe fuerte de una jugada (el remate, el smash, la clavada, el batazo): un instante en cámara lenta, la
   * cámara se acerca y vuelve, el destello y el ¡POW! del kit en el punto del golpe (en pixeles de la escena).
   */
  protected golpeFuerte(x: number, y: number, fuerte = 1) {
    this.camaraLenta(0.22 * fuerte, 0.2);
    const cam = this.cameras.main, z0 = cam.zoom;
    cam.zoomTo(z0 * (1 + 0.1 * fuerte), 110, 'Quad.easeOut', true, (_c, p) => { if (p >= 1) cam.zoomTo(z0, 240, 'Quad.easeIn', true); });
    efecto(this, fuerte >= 1.5 ? 'onomatopeya_crack' : 'onomatopeya_pow', x, y - 10, { depth: 7000 });
    flash(this, 60);
    cam.shake(120, 0.006 * fuerte);
  }

  /**
   * El corte de anime de la técnica especial: el juego en cámara lenta, la franja del equipo con sus líneas de
   * velocidad, el retrato grande del atleta que entra de un lado, el nombre de la técnica y el suyo. Dura `seg`.
   */
  protected corte(id: string, tecnica: string, team: 0 | 1, seg = 0.9) {
    this.camaraLenta(seg, 0.12);
    const side = team === 0 ? 1 : -1;
    const objs: Phaser.GameObjects.GameObject[] = [];
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => { objs.push(o); return this.uiAdd(o); };
    add(this.add.rectangle(320, 180, 800, 360, 0x000000, 0.55).setDepth(8600));
    add(this.add.rectangle(320, 150, 800, 110, team === 0 ? 0x1a3a9a : 0x9a1a2a, 0.95).setDepth(8601));
    add(speedLines(this, 8602));
    const por = add(this.add.image(320 - side * 400, 150, `retratos:${id}`, 'grande_enojo').setDepth(8603));
    this.tweens.add({ targets: por, x: 320 - side * 160, duration: 200, ease: 'Back.out' });
    // la técnica y el nombre van entre el retrato y el borde de lo que se ve (640 en la tablet, hasta 800 en el iPhone)
    const W = Math.min(800, this.scale.gameSize.width), ini = side > 0 ? 320 - side * 160 + 56 : 320 - W / 2 + 8, fin = side > 0 ? 320 + W / 2 - 8 : 320 - side * 160 - 56;
    const cx = (ini + fin) / 2, ancho = fin - ini;
    const name = add(txt(this, cx, 136, tecnica, 'fuente_titulo', 1).setDepth(8604).setAlpha(0));
    const e = name.width * 2 <= ancho ? 2 : 1;
    name.setScale(5);
    this.tweens.add({ targets: name, scale: e, alpha: 1, duration: 200, delay: 120 });
    const who = add(txt(this, cx, 172, this.nombre(id), 'fuente_ui', 1).setDepth(8604).setTint(0xffe080));
    who.setScale(who.width * 2 <= ancho ? 2 : 1);
    chip.boom(0.7);
    if (this.cache.audio.exists('subir_nivel')) this.sound.play('subir_nivel', { volume: 0.5 });
    flash(this, 120);
    this.time.delayedCall(seg * 1000, () => this.tweens.add({ targets: objs, alpha: 0, duration: 120, onComplete: () => objs.forEach((o) => o.destroy()) }));
  }


  /** Nombre de la prueba, lugar y la cuenta regresiva. */
  protected async previa(nombre: string, lugar: string, ayuda: string) {
    const band = this.uiAdd(this.add.graphics().setDepth(8400));
    band.fillStyle(0x08081a, 0.75).fillRect(-80, 100, 800, 92);
    band.fillStyle(0xf2c230).fillRect(-80, 100, 800, 2).fillRect(-80, 190, 800, 2);
    const t1 = this.uiAdd(txt(this, 320, 120, nombre, 'fuente_titulo', 2).setDepth(8500));
    const t2 = this.uiAdd(txt(this, 320, 150, lugar, 'fuente_ui', 2).setDepth(8500).setTint(0xffe080));
    const t3 = this.uiAdd(txt(this, 320, 178, rotular(ayuda, this.pad.fuente), 'fuente_ui', 1).setDepth(8500).setTint(0xc0c0e0));
    await new Promise<void>((r) => this.time.delayedCall(2200, r));
    t1.destroy(); t2.destroy(); t3.destroy(); band.destroy();
    await this.banner('EN SUS MARCAS', 'fuente_titulo_plata', 2, 600);
    await this.banner('LISTOS', 'fuente_titulo_plata', 2, 500);
    this.fase = 'juego';
    this.sonidoYa();
    void this.banner('¡YA!', 'fuente_titulo', 5, 500);
  }

  /** El sonido del ¡YA! (la natación lo cambia por su salida). */
  protected sonidoYa() { chip.blip(1320, 0.25, 'sq50', 0.22, 1760); }

  /** El que te espera en el entrenamiento: el capitán del equipo rival (Kenji, casi siempre). */
  protected get rivalEntreno() { return ellos()[0] ?? 'kenji'; }
  protected get rivalEntrenoNombre() { return this.nombre(this.rivalEntreno); }

  protected nombre(id: string) { return nombreCorto(id); }

  /**
   * Tabla final. `orden` va del primero al último; `valor` es lo que se muestra (tiempo, distancia).
   * En la Olimpiada reparte puntos al equipo de cada uno.
   */
  protected resultados(titulo: string, orden: { c: Competidor; valor: string }[]) {
    this.fase = 'fin';
    this.callarTema();
    // el acorde del equipo que ganó la prueba
    victoria(this, lado(orden[0]?.c.team ?? 0).id);
    flash(this, 150);
    const g = this.uiAdd(this.add.graphics().setDepth(8400));
    g.fillStyle(0x08081a, 0.9).fillRect(140, 60, 360, 220);
    g.lineStyle(2, 0xf2c230).strokeRect(141, 61, 358, 218);
    this.uiAdd(txt(this, 320, 82, titulo, 'fuente_titulo', 1).setDepth(8500));
    const medal = [0xffd040, 0xd0d8e8, 0xd08a40, 0x6a6a8a];
    const gira = this.registry.get('gira') as Gira | undefined;
    orden.forEach((o, i) => {
      const y = 116 + i * 34;
      // oro, plata y bronce del kit (cuadros 0, 1 y 2)
      if (i < 3 && hayUi(this, 'medallas_32')) this.uiAdd(this.add.image(170, y, 'ui_medallas_32', i).setDepth(8500));
      // y el cuarto, su cinta de participación (lote CINTA)
      else if (i === 3 && hayUi(this, 'cinta_32')) this.uiAdd(this.add.image(170, y, 'ui_cinta_32').setDepth(8500));
      else {
        g.fillStyle(medal[i]).fillCircle(170, y, 10);
        this.uiAdd(txt(this, 170, y, `${i + 1}`, 'fuente_ui', 1).setDepth(8500).setTint(0x101018));
      }
      this.uiAdd(this.add.image(206, y, `retratos:${o.c.id}`, i === 0 ? 'chico_feliz' : i === 3 ? 'chico_triste' : 'chico_neutral').setScale(0.7).setDepth(8500));
      this.uiAdd(txt(this, 232, y, this.nombre(o.c.id), 'fuente_ui', 2, 0).setDepth(8500).setTint(o.c.human ? 0xffe040 : o.c.team === 0 ? 0x9ac8ff : 0xffa0a0));
      this.uiAdd(txt(this, 480, y, o.valor, 'fuente_ui', 2, 1).setDepth(8500));
      if (this.d.gira && gira) this.uiAdd(txt(this, 480, y + 12, `+${PUNTOS[i]} PTS`, 'fuente_ui', 1, 1).setDepth(8500).setTint(0x8ae08a));
    });
    if (this.d.gira && gira) {
      orden.forEach((o, i) => { gira.puntos[o.c.team] += PUNTOS[i]; });
      gira.resultados.push({ prueba: titulo, podio: orden.map((o) => o.c.id) });
      this.registry.set('gira', gira);
    }
    if (this.d.gira) this.menuFinal(['SIGUIENTE'], 262, () => this.siguiente());
    else this.menuFinal(['OTRA VEZ', 'MENÚ'], 262, (i) => { if (i === 0) this.scene.restart(this.d); else this.alMenu(); });
  }

  /** Opciones al final, en fila: con flechas y botón, o tocándolas. */
  protected menuFinal(opts: string[], y: number, pick: (i: number) => void) {
    let sel = 0;
    const w = opts.length === 3 ? 196 : 120;
    const items = opts.map((o, i) => this.uiAdd(txt(this, 320 + (i - (opts.length - 1) / 2) * w, y, o, 'fuente_ui', 2).setDepth(8500).setInteractive()));
    const draw = () => items.forEach((t, i) => t.setTint(i === sel ? 0xffe040 : 0x8a8aa8));
    draw();
    let lock = 0.6, lx = 0, gone = false;
    const go = (i: number) => { if (gone) return; gone = true; chip.blip(1320, 0.1, 'sq25', 0.2, 1760); pick(i); };
    items.forEach((t, i) => t.on('pointerdown', () => go(i)));
    this.endChoice = (p) => {
      lock -= 1 / 60;
      if (lock > 0) return;
      if (p.x !== 0 && p.x !== lx) { sel = (sel + p.x + opts.length) % opts.length; draw(); chip.blip(660, 0.04); }
      lx = p.x;
      if (p.pressed.punch || p.pressed.start || p.pressed.kick || p.pressed.jump) go(sel);
    };
  }

  protected alMenu() { chip.stop(0.2); this.scene.start('Title'); }

  /**
   * Entrenamiento: sin cuenta regresiva ni rivales. Un cartel arriba va diciendo qué hacer y espera.
   * Al terminar: jugar de verdad, repetir o volver al menú.
   */
  protected async entrenar(nombre: string, pasos: Paso[], y = 40) {
    const band = this.uiAdd(this.add.graphics().setDepth(8400));
    band.fillStyle(0x08081a, 0.75).fillRect(-80, 120, 800, 64);
    band.fillStyle(0xf2c230).fillRect(-80, 120, 800, 2).fillRect(-80, 182, 800, 2);
    const t1 = this.uiAdd(txt(this, 320, 140, 'ENTRENAMIENTO', 'fuente_titulo_plata', 2).setDepth(8500));
    const t2 = this.uiAdd(txt(this, 320, 166, `${nombre} · SIN RIVALES Y SIN APURO`, 'fuente_ui', 2).setDepth(8500).setTint(0xffe080));
    await new Promise<void>((r) => this.time.delayedCall(1600, r));
    band.destroy(); t1.destroy(); t2.destroy();
    this.fase = 'juego';
    this.coach = new Coach(this, this.ui, this.pad, pasos, () => this.finPractica(), y);
  }

  private finPractica() {
    this.fase = 'fin';
    this.callarTema();
    victoria(this, lado(0).id);
    flash(this, 150);
    const g = this.uiAdd(this.add.graphics().setDepth(8400));
    g.fillStyle(0x08081a, 0.88).fillRect(30, 110, 580, 120);
    g.lineStyle(2, 0xf2c230).strokeRect(31, 111, 578, 118);
    this.uiAdd(txt(this, 320, 138, '¡YA SABES JUGAR!', 'fuente_titulo', 2).setDepth(8500));
    this.uiAdd(txt(this, 320, 166, '¿TE ANIMAS CONTRA LOS RIVALES?', 'fuente_ui', 2).setDepth(8500).setTint(0xffe080));
    this.menuFinal(['JUGAR DE VERDAD', 'OTRA VEZ', 'MENÚ'], 204, (i) => {
      if (i === 0) this.scene.restart({ jugador: this.d.jugador });
      else if (i === 1) this.scene.restart(this.d);
      else this.alMenu();
    });
  }

  /** Pasa a la siguiente prueba de la Olimpiada (por el medallero). */
  protected siguiente() {
    const gira = this.registry.get('gira') as Gira;
    gira.idx++;
    this.registry.set('gira', gira);
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Medallero'));
  }

  /** Llamar al principio de update: maneja el menú final. Devuelve true si la escena ya terminó. */
  protected endTick(p: ReturnType<Input['read']>): boolean {
    if (this.endChoice) { this.endChoice(p); return true; }
    return false;
  }
}
