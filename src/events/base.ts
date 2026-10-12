import Phaser from 'phaser';
import { MAX_W } from '../core/pantalla';
import { Input, rotular } from '../core/input';
import { chip, VICTORIA } from '../core/music';
import { kit } from '../core/kit';
import { txt, flash } from '../core/ui';
import { Coach, type Paso } from '../core/coach';
import { FAMILIA, INSTITUTO } from '../scenes/Select';

export interface EventData { jugador: string; gira?: boolean; practica?: boolean }
export interface Competidor { id: string; team: 0 | 1; human: boolean }

/** Estado de la Olimpiada Express (vive en el registro de Phaser). */
export interface Gira { jugador: string; idx: number; puntos: [number, number]; resultados: { prueba: string; podio: string[] }[] }
export const PRUEBAS_GIRA = [
  { scene: 'CrossCountry', nombre: 'CROSS COUNTRY', lugar: 'SAIGÓN, VIETNAM' },
  { scene: 'Obstaculos', nombre: 'OBSTÁCULOS COMUNA 13', lugar: 'MEDELLÍN, COLOMBIA' },
  { scene: 'Vallas', nombre: 'VALLAS DEL CAFÉ', lugar: 'EJE CAFETERO, COLOMBIA' },
  { scene: 'Natacion', nombre: 'NATACIÓN HẠ LONG', lugar: 'BAHÍA DE HẠ LONG, VIETNAM' },
  { scene: 'Jabalina', nombre: 'JABALINA LLANERA', lugar: 'LLANOS DE APURE, VENEZUELA' },
  { scene: 'Fight', nombre: 'KACHINUKI FINAL', lugar: 'AZOTEA DE CARACAS, VENEZUELA' },
];
export const PUNTOS = [10, 6, 4, 2];

/** Los datos de una prueba de la gira por su escena. */
export const prueba = (scene: string) => PRUEBAS_GIRA.find((p) => p.scene === scene)!;

/** Los 4 de una prueba individual: tú, un compañero de la familia y dos del Instituto. */
export function lineup(jugador: string): Competidor[] {
  const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
  const comp = pick(FAMILIA.filter((f) => f !== jugador));
  const inst = [...INSTITUTO].sort(() => Math.random() - 0.5).slice(0, 2);
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
    // en el entrenamiento estás solo: nadie te apura
    this.gente = this.d.practica ? [{ id: this.d.jugador, team: 0, human: true }] : lineup(this.d.jugador);
    this.coach = null;
    this.fase = 'previa';
    this.endChoice = null;
    this.ultimo = -1;
  }

  /** Prepara capas y cámara. Llamar al inicio de create(). */
  protected setup(zoom: number, worldW: number) {
    this.cameras.main.fadeIn(250);
    this.registry.set('marchaSonando', false);
    this.ui = this.add.layer().setDepth(10000);
    this.cameras.main.setZoom(zoom).setBounds(0, 0, worldW, 360);
    this.cameras.main.ignore(this.ui);
    this.uiCam = this.cameras.add(0, 0, 640, 360).setName('ui');
    this.pad = new Input(this, undefined, this.ui);
  }

  /**
   * Fondo con paralaje que se repite sin costura: el cuadro y su espejo, uno al lado del otro.
   */
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

  protected banner(s: string, font: 'fuente_titulo' | 'fuente_titulo_plata' | 'fuente_ui', scale: number, hold: number, y = 150) {
    return new Promise<void>((res) => {
      const t = this.uiAdd(txt(this, 320, y, s, font, scale * 2).setDepth(8500).setAlpha(0));
      this.tweens.add({ targets: t, scale, alpha: 1, duration: 200, ease: 'Back.out' });
      chip.boom(0.3);
      this.time.delayedCall(hold, () => this.tweens.add({ targets: t, alpha: 0, scale: scale * 1.3, duration: 200, onComplete: () => { t.destroy(); res(); } }));
    });
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
    chip.blip(1320, 0.25, 'sq50', 0.22, 1760);
    void this.banner('¡YA!', 'fuente_titulo', 5, 500);
  }

  protected nombre(id: string) { return (kit().atletas[id]?.nombre ?? id).split(' ')[0].toUpperCase(); }

  /**
   * Tabla final. `orden` va del primero al último; `valor` es lo que se muestra (tiempo, distancia).
   * En la Olimpiada reparte puntos al equipo de cada uno.
   */
  protected resultados(titulo: string, orden: { c: Competidor; valor: string }[]) {
    this.fase = 'fin';
    chip.play(VICTORIA);
    flash(this, 150);
    const g = this.uiAdd(this.add.graphics().setDepth(8400));
    g.fillStyle(0x08081a, 0.9).fillRect(140, 60, 360, 220);
    g.lineStyle(2, 0xf2c230).strokeRect(141, 61, 358, 218);
    this.uiAdd(txt(this, 320, 82, titulo, 'fuente_titulo', 1).setDepth(8500));
    const medal = [0xffd040, 0xd0d8e8, 0xd08a40, 0x6a6a8a];
    const gira = this.registry.get('gira') as Gira | undefined;
    orden.forEach((o, i) => {
      const y = 116 + i * 34;
      g.fillStyle(medal[i]).fillCircle(170, y, 10);
      this.uiAdd(txt(this, 170, y, `${i + 1}`, 'fuente_ui', 1).setDepth(8500).setTint(0x101018));
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
    chip.play(VICTORIA);
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
