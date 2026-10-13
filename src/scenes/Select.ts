import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { Input } from '../core/input';
import { chip } from '../core/music';
import { kit } from '../core/kit';
import { txt } from '../core/ui';
import { sortearGira, type Gira } from '../events/base';

export const FAMILIA = ['rick', 'steph', 'sophie', 'alana'];
export const INSTITUTO = ['kenji', 'ryu', 'goro', 'tetsu'];
export const INFO: Record<string, { apodo: string; tecnica: string; color: number }> = {
  rick: { apodo: 'EL CAPITÁN', tecnica: 'PUÑO MACH', color: 0x2a5bd7 },
  steph: { apodo: 'LA VELOZ', tecnica: 'PATADA HURACÁN', color: 0xe86aa0 },
  sophie: { apodo: 'LA ACRÓBATA', tecnica: 'CHILENA ASESINA', color: 0x3cc86a },
  alana: { apodo: 'LA PEQUEÑA TERRIBLE', tecnica: '¡THOR AL RESCATE!', color: 0xff4fa0 },
  kenji: { apodo: '"TORO" EL CAPITÁN', tecnica: 'UPPERCUT DEL DRAGÓN', color: 0xd0303a },
  ryu: { apodo: 'EL KARATEKA', tecnica: 'RODILLA VOLADORA', color: 0xd0303a },
  goro: { apodo: 'EL GIGANTE', tecnica: 'TACKLE LOCOMOTORA', color: 0xd0303a },
  tetsu: { apodo: 'EL LANZADOR', tecnica: 'DOBLE POTE', color: 0xd0303a },
};

/** Elige tu atleta de la Familia GG y, en 1 contra 1, tu rival del Instituto. */
export class Select extends Phaser.Scene {
  private modo = '1v1';
  private paso: 'jugador' | 'rival' = 'jugador';
  private sel = 0;
  private jugador = 'rick';
  private pad!: Input;
  private cards: Phaser.GameObjects.Container[] = [];
  private fig: Figura | null = null;
  private title!: Phaser.GameObjects.BitmapText;
  private info!: Phaser.GameObjects.BitmapText;
  private nextMove = 0;

  constructor() { super('Select'); }

  init(d: { modo?: string }) {
    this.modo = d.modo ?? '1v1';
    this.paso = 'jugador';
    this.sel = 0;
    this.cards = [];
    this.fig = null;
  }

  create() {
    this.cameras.main.fadeIn(200);
    this.add.image(320, 180, 'bg_caracas').setTint(0x6a6a9a);
    this.pad = new Input(this, false);
    this.title = txt(this, 320, 22, '', 'fuente_titulo', 2);
    this.info = txt(this, 320, 220, '', 'fuente_ui', 2);
    this.build();
  }

  private lista() { return this.paso === 'jugador' ? FAMILIA : INSTITUTO; }

  private build() {
    for (const c of this.cards) c.destroy();
    this.cards = [];
    this.title.setText(this.paso === 'jugador' ? 'ELIGE TU ATLETA' : 'ELIGE TU RIVAL');
    const ids = this.lista();
    ids.forEach((id, i) => {
      const x = 98 + i * 148, y = 112;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      c.add(g);
      c.add(this.add.image(0, 0, `retratos:${id}`, this.paso === 'jugador' ? 'grande_feliz' : 'grande_enojo'));
      const a = kit().atletas[id];
      c.add(txt(this, 0, 62, a.nombre, 'fuente_titulo', 1));
      if (a.numero) c.add(txt(this, 40, -40, `#${a.numero}`, 'fuente_ui', 1).setTint(0xf2c230));
      c.setData('g', g);
      c.setSize(110, 140).setInteractive().on('pointerdown', () => { if (this.sel === i) this.confirm(); else { this.sel = i; this.refresh(); } });
      this.cards.push(c);
    });
    this.refresh();
  }

  private refresh() {
    const ids = this.lista();
    this.cards.forEach((c, i) => {
      const g = c.getData('g') as Phaser.GameObjects.Graphics;
      const on = i === this.sel;
      g.clear();
      g.fillStyle(0x08081a, 0.85).fillRect(-54, -54, 108, 130);
      g.lineStyle(on ? 3 : 1, on ? INFO[ids[i]].color : 0x4a4a6a).strokeRect(-54, -54, 108, 130);
      c.setScale(on ? 1.06 : 0.94).setAlpha(on ? 1 : 0.7);
    });
    const id = ids[this.sel];
    this.info.setText(`${INFO[id].apodo} · ${INFO[id].tecnica}`).setTint(this.paso === 'jugador' ? 0xffe080 : 0xff8080);
    this.fig?.destroy();
    this.fig = new Figura(this, 320, 340, id, this.paso === 'jugador' ? 'celebrate' : 'taunt').setScale(2.5);
    this.fig.row = 'down';
    chip.blip(660 + this.sel * 80, 0.04, 'sq25', 0.14);
  }

  private confirm() {
    const id = this.lista()[this.sel];
    chip.blip(1320, 0.12, 'sq25', 0.2, 1760);
    this.sound.play('elegir', { volume: 0.5 });
    if (this.paso === 'jugador') {
      this.jugador = id;
      if (this.modo === '4v4') { this.go({ modo: '4v4', jugador: id, rival: 'kenji' }); return; }
      if (this.modo === 'gira') {
        const gira: Gira = { jugador: id, idx: 0, puntos: [0, 0], resultados: [], pruebas: sortearGira() };
        this.registry.set('gira', gira);
        this.fadeTo('Medallero');
        return;
      }
      if (this.modo.startsWith('practica:')) {
        const sc = this.modo.slice(9);
        if (sc === 'Fight') this.fadeTo('Fight', { modo: '1v1', jugador: id, rival: 'goro', practica: true });
        else this.fadeTo(sc, { jugador: id, practica: true });
        return;
      }
      // "CrossCountry@2": un tramo suelto del Cross
      if (this.modo !== '1v1' && this.modo !== 'judo') { const [sc, t] = this.modo.split('@'); this.fadeTo(sc, t === undefined ? { jugador: id } : { jugador: id, tramo: Number(t), suelto: true }); return; }
      this.paso = 'rival';
      this.sel = 0;
      this.build();
      return;
    }
    this.go({ modo: this.modo === 'judo' ? 'judo' : '1v1', jugador: this.jugador, rival: id });
  }

  private go(d: { modo: string; jugador: string; rival: string }) {
    this.fadeTo('Fight', d);
  }

  private fadeTo(scene: string, d?: object) {
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => { if (scene !== 'Title') chip.stop(0.3); this.scene.start(scene, d); });
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    this.fig?.step(dt);
    if (this.fig?.anim.done) this.fig.set(this.paso === 'jugador' ? 'celebrate' : 'idle', true);
    const p = this.pad.read();
    if (p.x !== 0 && this.time.now > this.nextMove) {
      this.sel = (this.sel + p.x + 4) % 4;
      this.nextMove = this.time.now + 180;
      this.refresh();
    }
    if (p.x === 0) this.nextMove = 0;
    if (p.pressed.punch || p.pressed.start || p.pressed.kick || p.pressed.jump) this.confirm();
    if (p.pressed.back) {
      if (this.paso === 'rival') { this.paso = 'jugador'; this.build(); } else this.scene.start('Title');
    }
  }
}
