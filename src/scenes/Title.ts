import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { Input } from '../core/input';
import { chip, MARCHA } from '../core/music';
import { txt } from '../core/ui';
import { buildLogo, fireworks } from './logo';

const OPCIONES = [
  { id: '1v1', label: 'PELEA 1 CONTRA 1' },
  { id: '4v4', label: 'PELEA 4 CONTRA 4' },
  { id: 'intro', label: 'VER LA INTRO' },
];

export class Title extends Phaser.Scene {
  private pad!: Input;
  private sel = 0;
  private items: Phaser.GameObjects.BitmapText[] = [];
  private cursor!: Phaser.GameObjects.BitmapText;
  private figs: Figura[] = [];
  private started = false;
  private press!: Phaser.GameObjects.BitmapText;
  private menu!: Phaser.GameObjects.Container;

  constructor() { super('Title'); }

  create() {
    this.cameras.main.fadeIn(300);
    this.started = false;
    this.figs = [];
    if (!this.registry.get('marchaSonando')) { chip.play(MARCHA); this.registry.set('marchaSonando', true); }
    this.add.image(320, 180, 'bg_caracas');
    this.add.image(320, 280, 'bg_azotea');
    const logo = this.add.container(0, 0);
    void buildLogo(this, logo, false, -34);
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
    const thor = new Figura(this, 210, 330, 'thor', 'wag').setScale(1.5);
    thor.row = 'down_right';
    this.figs.push(thor);

    this.pad = new Input(this, false);
    this.press = txt(this, 320, 282, 'PRESIONA START', 'fuente_ui', 2);
    this.tweens.add({ targets: this.press, alpha: 0.15, duration: 450, yoyo: true, repeat: -1 });

    this.menu = this.add.container(0, 0).setVisible(false);
    this.items = OPCIONES.map((o, i) => {
      const t = txt(this, 320, 262 + i * 22, o.label, 'fuente_ui', 2);
      t.setInteractive().on('pointerdown', () => { if (this.started) { this.sel = i; this.choose(); } });
      this.menu.add(t);
      return t;
    });
    this.cursor = txt(this, 0, 0, '»', 'fuente_ui', 2).setTint(0xf2c230);
    this.menu.add(this.cursor);
    txt(this, 320, 352, 'FLECHAS MOVER · J PUÑO · K PATADA · L SALTO · U ESPECIAL', 'fuente_ui', 1).setTint(0x8a8ab0);
    this.input.on('pointerdown', () => { if (!this.started) this.openMenu(); });
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
    const o = OPCIONES[this.sel];
    chip.blip(1320, 0.1, 'sq25', 0.2, 1760);
    this.sound.play('elegir', { volume: 0.5 });
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
      this.sel = (this.sel + p.y + OPCIONES.length) % OPCIONES.length;
      this.data.set('next', this.time.now + 180);
      chip.blip(660, 0.04, 'sq25', 0.15);
      this.refresh();
    }
    if (p.y === 0) this.data.set('next', 0);
    if (p.pressed.start || p.pressed.punch || p.pressed.kick) this.choose();
  }
}
