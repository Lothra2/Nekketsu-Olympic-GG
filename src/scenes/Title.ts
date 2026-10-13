import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { Input, rotular } from '../core/input';
import { ajustes, nivel, setNivel, ORDEN } from '../core/nivel';
import { chip, MARCHA } from '../core/music';
import { txt } from '../core/ui';
import { buildLogo, fireworks } from './logo';

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

  create() {
    this.cameras.main.fadeIn(300);
    this.started = false;
    this.figs = [];
    if (!this.registry.get('marchaSonando')) { chip.play(MARCHA); this.registry.set('marchaSonando', true); }
    this.add.image(320, 180, 'bg_caracas');
    this.add.image(320, 280, 'bg_azotea');
    const logo = this.add.container(0, 0);
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
    const g = this.add.graphics();
    const n = this.opciones.length;
    // el cuadro crece hacia arriba, sin tapar la línea de teclas de abajo; las listas largas van más juntas
    const lh = n >= 11 ? 15 : n >= 8 ? 18 : 21;
    const top = 338 - (n * lh + 10);
    g.fillStyle(0x08081a, 0.78).fillRect(206, top, 228, n * lh + 10);
    g.lineStyle(1, 0xf2c230, 0.8).strokeRect(206.5, top + 0.5, 227, n * lh + 9);
    this.menu.add(g);
    this.items = this.opciones.map((o, i) => {
      const t = txt(this, 320, top + 5 + lh / 2 + i * lh, o.id === 'nivel' ? `NIVEL: ${ajustes().nombre}` : o.label, 'fuente_ui', 2);
      t.setInteractive().on('pointerdown', () => { if (this.started) { this.sel = i; this.choose(); } });
      this.menu.add(t);
      return t;
    });
    this.cursor = txt(this, 0, 0, '»', 'fuente_ui', 2).setTint(0xf2c230);
    this.menu.add(this.cursor);
    this.refresh();
  }

  private openMenu() {
    this.started = true;
    this.press.destroy();
    this.menu.setVisible(true);
    chip.blip(988, 0.08, 'sq25', 0.2);
  }

  private refresh() {
    this.items.forEach((t, i) => t.setTint(i === this.sel ? 0xffffff : 0x7a7a9a));
    const t = this.items[this.sel];
    this.cursor.setPosition(t.x - t.width / 2 - 14, t.y);
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
    if (p.y !== 0 && this.time.now > (this.data.get('next') ?? 0)) {
      this.sel = (this.sel + p.y + this.opciones.length) % this.opciones.length;
      this.data.set('next', this.time.now + 180);
      chip.blip(660, 0.04, 'sq25', 0.15);
      this.refresh();
    }
    if (p.y === 0) this.data.set('next', 0);
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
