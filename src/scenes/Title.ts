import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { Input, rotular } from '../core/input';
import { ajustes, nivel, setNivel, ORDEN } from '../core/nivel';
import { chip, MARCHA } from '../core/music';
import { txt } from '../core/ui';
import { buildLogo, fireworks } from './logo';
import { prueba } from '../events/base';
import { FAMILIA, INSTITUTO } from './Select';
import { cargarAtletas, packsDe } from '../core/carga';
import { hayUi, pieza } from '../core/interfaz';

/** Menú en dos niveles para que quepa entre los dos equipos sin tapar a nadie. */
const MENUS: Record<string, { id: string; label: string }[]> = {
  raiz: [
    { id: '>entrenar', label: 'ENTRENAMIENTO' },
    { id: 'gira', label: 'OLIMPIADA EXPRESS' },
    { id: '>pruebas', label: 'PRUEBAS SUELTAS' },
    { id: '>peleas', label: 'PELEA CALLEJERA' },
    { id: 'nivel', label: 'NIVEL' },
    { id: 'intro', label: 'VER LA INTRO' },
  ],
  pruebas: [
    { id: '>cross', label: 'CROSS COUNTRY' },
    { id: 'Obstaculos', label: 'COMUNA 13' },
    { id: 'Vallas', label: 'VALLAS DEL CAFÉ' },
    { id: 'Natacion', label: 'NATACIÓN HẠ LONG' },
    { id: 'Jabalina', label: 'JABALINA LLANERA' },
    { id: 'Azoteas', label: 'AZOTEAS CARTAGENA' },
    { id: 'Tamawari', label: 'TAMA-WARI HỘI AN' },
    { id: 'DaCau', label: 'ĐÁ CẦU SAIGÓN' },
    { id: 'Tejo', label: 'TEJO BOGOTÁ' },
    { id: 'judo', label: 'JUDO HÀ NỘI' },
    { id: 'Quemado', label: 'QUEMADO NEKKETSU' },
    { id: 'Chapita', label: 'CHAPITA CARACAS' },
    { id: 'Voley', label: 'VÓLEY MARGARITA' },
    { id: 'Tenis', label: 'TENIS ĐÀ LẠT' },
    { id: 'Futbol', label: 'FÚTBOL BARRANQUILLA' },
    { id: 'Basket', label: 'BÁSQUET MARACAIBO' },
    { id: '<', label: 'ATRÁS' },
  ],
  // el Cross completo son cinco tramos; para una partida corta se puede correr uno solo
  cross: [
    { id: 'CrossCountry', label: 'CARRERA COMPLETA' },
    { id: 'CrossCountry@0', label: '1 · EL HẺM' },
    { id: 'CrossCountry@1', label: '2 · EL MERCADO' },
    { id: 'CrossCountry@2', label: '3 · EL RÍO' },
    { id: 'CrossCountry@3', label: '4 · LAS AZOTEAS' },
    { id: 'CrossCountry@4', label: '5 · EL ESTADIO' },
    { id: '<', label: 'ATRÁS' },
  ],
  entrenar: [
    { id: 'practica:CrossCountry', label: 'CROSS COUNTRY' },
    { id: 'practica:Obstaculos', label: 'COMUNA 13' },
    { id: 'practica:Vallas', label: 'VALLAS' },
    { id: 'practica:Natacion', label: 'NATACIÓN' },
    { id: 'practica:Jabalina', label: 'JABALINA' },
    { id: 'practica:Azoteas', label: 'GARROCHA' },
    { id: 'practica:Tamawari', label: 'TAMA-WARI' },
    { id: 'practica:DaCau', label: 'ĐÁ CẦU' },
    { id: 'practica:Tejo', label: 'TEJO' },
    { id: 'practica:Quemado', label: 'QUEMADO' },
    { id: 'practica:Chapita', label: 'CHAPITA' },
    { id: 'practica:Voley', label: 'VÓLEY' },
    { id: 'practica:Tenis', label: 'TENIS' },
    { id: 'practica:Futbol', label: 'FÚTBOL' },
    { id: 'practica:Basket', label: 'BÁSQUET' },
    { id: 'practica:Fight', label: 'PELEA' },
    { id: '<', label: 'ATRÁS' },
  ],
  peleas: [
    { id: '1v1', label: '1 CONTRA 1' },
    { id: '4v4', label: '4 CONTRA 4' },
    { id: '<', label: 'ATRÁS' },
  ],
};

export class Title extends Phaser.Scene {
  private pad!: Input;
  private sel = 0;
  private items: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.BitmapText;
  /** en la grilla de dos columnas: dónde va cada opción, el recuadro que marca la elegida y el lugar de la prueba */
  private celdas: { x: number; y: number; w: number }[] = [];
  private marco?: Phaser.GameObjects.Graphics;
  private lugar?: Phaser.GameObjects.BitmapText;
  /** el ícono de 32 de la prueba elegida, junto al lugar (no cabe en la fila de 24) */
  private icono?: Phaser.GameObjects.Image;
  private logo!: Phaser.GameObjects.Container;
  private get grilla() { return this.opciones.length > 8; }
  private figs: Figura[] = [];
  private started = false;
  private press!: Phaser.GameObjects.BitmapText;
  private menu!: Phaser.GameObjects.Container;
  private nivel = 'raiz';
  private ayuda!: Phaser.GameObjects.BitmapText;
  private ayudaEv?: Phaser.Time.TimerEvent;
  private get lineaControles() { return rotular('{MOVER}: MOVER · {PUÑO}: PUÑO · {PATADA}: PATADA · {SALTO}: SALTO · {ESPECIAL}: TÉCNICA', this.pad.fuente); }
  private get opciones() { return MENUS[this.nivel]; }

  constructor() { super('Title'); }

  /** La Familia y el Instituto del título (y se sueltan las animaciones de lo que se jugó antes). */
  preload() { cargarAtletas(this, [...FAMILIA, ...INSTITUTO], packsDe('Title'), undefined, true); }

  create() {
    this.cameras.main.fadeIn(300);
    this.started = false;
    this.figs = [];
    if (!this.registry.get('marchaSonando')) { chip.play(MARCHA); this.registry.set('marchaSonando', true); }
    this.add.image(320, 180, 'bg_caracas');
    this.add.image(320, 280, 'bg_azotea');
    const logo = this.add.container(0, 0);
    this.logo = logo;
    void buildLogo(this, logo, false, -46);
    fireworks(this).setDepth(-1);

    const fam = ['rick', 'steph', 'sophie', 'alana'];
    fam.forEach((id, i) => {
      const f = new Figura(this, 70 + i * 34 - (i > 1 ? 0 : 0), 318 + (i % 2) * 8, id, 'idle').setScale(1.5);
      f.row = 'down_right';
      this.figs.push(f);
    });
    ['kenji', 'ryu', 'goro', 'tetsu'].forEach((id, i) => {
      const f = new Figura(this, 470 + i * 34, 318 + (i % 2) * 8, id, 'idle').setScale(1.5);
      f.row = 'down_right';
      f.left = true;
      this.figs.push(f);
    });
    const thor = new Figura(this, 34, 334, 'thor', 'wag').setScale(1.5);
    thor.row = 'down_right';
    this.figs.push(thor);

    this.pad = new Input(this, false);
    this.press = txt(this, 320, 282, 'PRESIONA START', 'fuente_ui', 2);
    this.tweens.add({ targets: this.press, alpha: 0.15, duration: 450, yoyo: true, repeat: -1 });

    this.menu = this.add.container(0, 0).setVisible(false);
    this.nivel = 'raiz';
    this.sel = 0;
    this.buildMenu();
    this.ayuda = txt(this, 320, 352, rotular('{MOVER}: MOVER · {PUÑO}: PUÑO · {PATADA}: PATADA · {SALTO}: SALTO · {ESPECIAL}: TÉCNICA', this.pad.fuente), 'fuente_ui', 1).setTint(0x8a8ab0);
    this.input.on('pointerdown', () => { if (!this.started) this.openMenu(); });
    this.refresh();
  }

  private buildMenu() {
    this.menu.removeAll(true);
    this.marco = undefined;
    this.lugar = undefined;
    this.icono = undefined;
    // las listas largas (las pruebas, el entrenamiento) van en dos columnas, con la bandera de cada una; el logo y los
    // equipos se apagan un poco para que la grilla se lea bien
    const grilla = this.grilla;
    this.logo.setAlpha(grilla ? 0.15 : 1);
    for (const f of this.figs) f.setAlpha(grilla ? 0.35 : 1);
    if (grilla) this.buildGrilla();
    else this.buildLista();
    this.refresh();
  }

  /** La lista de siempre, para los menús cortos. */
  private buildLista() {
    const g = this.add.graphics();
    const n = this.opciones.length;
    const lh = 21;
    const top = 338 - (n * lh + 10);
    g.fillStyle(0x08081a, 0.78).fillRect(206, top, 228, n * lh + 10);
    g.lineStyle(1, 0xf2c230, 0.8).strokeRect(206.5, top + 0.5, 227, n * lh + 9);
    this.menu.add(g);
    this.celdas = [];
    this.items = this.opciones.map((o, i) => {
      const t = txt(this, 320, top + 5 + lh / 2 + i * lh, o.id === 'nivel' ? `NIVEL: ${ajustes().nombre}` : o.label, 'fuente_ui', 2);
      t.setInteractive().on('pointerdown', () => { if (this.started) { this.sel = i; this.choose(); } });
      this.menu.add(t);
      this.celdas.push({ x: 320, y: t.y, w: 220 });
      return t;
    });
    this.cursor = txt(this, 0, 0, '»', 'fuente_ui', 2).setTint(0xf2c230);
    this.menu.add(this.cursor);
  }

  /** Dos columnas con banderas, ATRÁS abajo al medio, y el lugar de la prueba elegida en el pie. */
  private buildGrilla() {
    const ops = this.opciones;
    const juegos = ops.filter((o) => o.id !== '<');
    const filas = Math.ceil(juegos.length / 2);
    const lh = 24, colW = 252, x0 = 320 - colW - 6, top = 52;
    const alto = filas * lh + 70;
    const g = this.add.graphics();
    g.fillStyle(0x08081a, 0.93).fillRoundedRect(x0 - 10, top - 10, colW * 2 + 32, alto, 6);
    g.lineStyle(2, 0xf2c230, 0.9).strokeRoundedRect(x0 - 10, top - 10, colW * 2 + 32, alto, 6);
    // la raya del medio y la del pie
    g.lineStyle(1, 0xf2c230, 0.25).lineBetween(320, top - 2, 320, top + filas * lh - 4).lineBetween(x0, top + filas * lh + 4, x0 + colW * 2 + 12, top + filas * lh + 4);
    this.menu.add(g);
    this.marco = this.add.graphics();
    this.menu.add(this.marco);
    this.celdas = [];
    this.items = ops.map((o, i) => {
      let x: number, y: number, w: number;
      if (o.id === '<') { x = 320; y = top + filas * lh + 34; w = 120; }
      else {
        const k = juegos.indexOf(o), col = k < filas ? 0 : 1, fila = k % filas;
        x = x0 + col * (colW + 12) + colW / 2; y = top + fila * lh + lh / 2; w = colW;
      }
      this.celdas.push({ x, y, w });
      // la bandera a la izquierda y el nombre al lado
      const p = this.pruebaDe(o.id);
      const conBandera = !!p && this.textures.exists(p.bandera);
      if (conBandera) this.menu.add(this.add.image(x - w / 2 + 16, y, p!.bandera).setScale(0.6));
      const t = txt(this, conBandera ? x - w / 2 + 32 : x, y, o.label, 'fuente_ui', 2, conBandera ? 0 : 0.5);
      // todo el renglón se puede tocar, no solo las letras
      const zona = this.add.zone(x, y, w, lh).setInteractive().on('pointerdown', () => { if (this.started) { this.sel = i; this.refresh(); this.choose(); } });
      this.menu.add([t, zona]);
      return t;
    });
    this.lugar = txt(this, 320, top + filas * lh + 14, '', 'fuente_ui', 1).setTint(0xffe080);
    this.menu.add(this.lugar);
    if (hayUi(this, 'iconos_prueba')) {
      this.icono = this.add.image(320, this.lugar.y, 'ui_iconos_prueba', 0).setVisible(false);
      this.menu.add(this.icono);
    }
    this.cursor = txt(this, -100, -100, '', 'fuente_ui', 1);
    this.menu.add(this.cursor);
  }

  /** La prueba que abre una opción del menú (para su bandera y su lugar). */
  private pruebaDe(id: string) {
    const limpio = id.replace(/^practica:/, '').replace(/^>/, '').replace(/@\d+$/, '');
    const scene = limpio === 'cross' ? 'CrossCountry' : limpio === 'judo' ? 'Judo' : limpio;
    try { return prueba(scene) ?? null; } catch { return null; }
  }

  private openMenu() {
    this.started = true;
    this.press.destroy();
    this.menu.setVisible(true);
    chip.blip(988, 0.08, 'sq25', 0.2);
  }

  private refresh() {
    this.items.forEach((t, i) => t.setTint(i === this.sel ? 0xffffff : 0x8a8ab0));
    const t = this.items[this.sel];
    if (this.marco) {
      // el recuadro dorado alrededor de la elegida, y abajo su lugar
      const c = this.celdas[this.sel];
      this.marco.clear().fillStyle(0xf2c230, 0.16).fillRoundedRect(c.x - c.w / 2, c.y - 11, c.w, 22, 4).lineStyle(1, 0xf2c230, 0.9).strokeRoundedRect(c.x - c.w / 2, c.y - 11, c.w, 22, 4);
      const p = this.pruebaDe(this.opciones[this.sel].id);
      this.lugar?.setText(this.opciones[this.sel].id === '<' ? 'VOLVER AL MENÚ' : p ? p.lugar : '');
      this.ponIcono(this.opciones[this.sel].id, p?.id);
      return;
    }
    this.cursor.setPosition(t.x - t.width / 2 - 14, t.y);
  }

  /** El ícono de la prueba elegida a la izquierda del lugar, y el lugar corrido para que el par quede centrado. */
  private ponIcono(op: string, escena?: string) {
    if (!this.icono || !this.lugar) return;
    const ICONO: Record<string, string> = {
      CrossCountry: 'cross_country', Obstaculos: 'obstaculos', Vallas: 'vallas', Natacion: 'natacion', Jabalina: 'jabalina',
      Azoteas: 'azoteas', Tamawari: 'tamawari', DaCau: 'da_cau', Tejo: 'tejo', Quemado: 'quemado', Chapita: 'chapita',
      Voley: 'voley', Tenis: 'tenis', Futbol: 'futbol', Basket: 'basket', Judo: 'judo', Fight: 'kachinuki',
    };
    const limpio = op.replace(/^practica:/, '').replace(/^>/, '').replace(/@\d+$/, '');
    // las peleas sueltas del menú de peleas llevan el de la pelea; el Kachinuki de la gira, el suyo
    const id = escena ? ICONO[escena] : ['1v1', '2v2', '4v4', 'fight', 'pelea'].includes(limpio) ? 'pelea' : undefined;
    const k = id ? ((pieza('iconos_prueba') as { orden?: string[] } | undefined)?.orden ?? []).indexOf(id) : -1;
    if (k < 0) { this.icono.setVisible(false); this.lugar.setX(320); return; }
    const w = this.lugar.width;
    this.icono.setFrame(k).setVisible(true).setPosition(320 - (w + 36) / 2 + 16, this.lugar.y);
    this.lugar.setX(320 + 18);
  }

  /** En la grilla: la opción más cerca en esa dirección (arriba, abajo, izquierda o derecha). */
  private mover(dx: number, dy: number) {
    const a = this.celdas[this.sel];
    let mejor = -1, dist = Infinity;
    this.celdas.forEach((c, i) => {
      if (i === this.sel) return;
      const vx = c.x - a.x, vy = c.y - a.y;
      // solo lo que queda hacia ese lado; pesa más irse de la línea que la distancia
      if (dx && Math.sign(vx) !== dx) return;
      if (dy && Math.sign(vy) !== dy) return;
      if (dx && Math.abs(vx) < 4) return;
      if (dy && Math.abs(vy) < 4) return;
      const d = dx ? Math.abs(vx) + Math.abs(vy) * 3 : Math.abs(vy) + Math.abs(vx) * 0.5;
      if (d < dist) { dist = d; mejor = i; }
    });
    // por arriba o por abajo da la vuelta a la columna
    if (mejor < 0 && dy) {
      const misma = this.celdas.map((c, i) => ({ c, i })).filter(({ c }) => Math.abs(c.x - a.x) < 4);
      const ext = dy > 0 ? misma.sort((p, q) => p.c.y - q.c.y)[0] : misma.sort((p, q) => q.c.y - p.c.y)[0];
      mejor = ext && ext.i !== this.sel ? ext.i : -1;
    }
    if (mejor >= 0) this.sel = mejor;
  }

  private choose() {
    const o = this.opciones[this.sel];
    chip.blip(1320, 0.1, 'sq25', 0.2, 1760);
    this.sound.play('elegir', { volume: 0.5 });
    if (o.id.startsWith('>')) { this.nivel = o.id.slice(1); this.sel = 0; this.buildMenu(); return; }
    if (o.id === '<') { this.atras(); return; }
    if (o.id === 'nivel') {
      // cambia al siguiente nivel y dice de qué se trata
      setNivel(ORDEN[(ORDEN.indexOf(nivel()) + 1) % ORDEN.length]);
      this.buildMenu();
      this.ayuda.setText(ajustes().desc).setTint(0xffe080);
      this.ayudaEv?.remove();
      this.ayudaEv = this.time.delayedCall(3200, () => this.ayuda.setText(this.lineaControles).setTint(0x8a8ab0));
      return;
    }
    if (o.id === 'intro') { this.registry.set('marchaSonando', false); chip.stop(0.2); this.scene.start('Intro'); return; }
    this.cameras.main.fadeOut(200);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Select', { modo: o.id }));
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    for (const f of this.figs) f.step(dt);
    const p = this.pad.read();
    if (!this.started) {
      if (p.pressed.start || p.pressed.punch || p.pressed.kick || p.pressed.jump) this.openMenu();
      return;
    }
    const dx = Math.round(p.x), dy = Math.round(p.y);
    if ((dy !== 0 || (dx !== 0 && this.grilla)) && this.time.now > (this.data.get('next') ?? 0)) {
      if (this.grilla) this.mover(dy ? 0 : dx, dy);
      else this.sel = (this.sel + dy + this.opciones.length) % this.opciones.length;
      this.data.set('next', this.time.now + 180);
      chip.blip(660, 0.04, 'sq25', 0.15);
      this.refresh();
    }
    if (dy === 0 && dx === 0) this.data.set('next', 0);
    if (p.pressed.start || p.pressed.punch || p.pressed.kick || p.pressed.jump) this.choose();
    if (p.pressed.back && this.nivel !== 'raiz') this.atras();
  }

  private atras() {
    const de = this.nivel;
    this.nivel = 'raiz';
    this.sel = MENUS.raiz.findIndex((o) => o.id === `>${de}`);
    this.buildMenu();
  }
}
