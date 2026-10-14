import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { Input } from '../core/input';
import { chip } from '../core/music';
import { kit } from '../core/kit';
import { txt } from '../core/ui';
import { sortearGira, type Gira } from '../events/base';
import { elegibles, equipo, equipoDe, setPartido, type Equipo } from '../core/equipos';
import { cargarAtletas } from '../core/carga';

/** Los cuatro de la Familia y los cuatro del Instituto (el equipo de la intro y del título). */
export const FAMILIA = ['rick', 'steph', 'sophie', 'alana'];
export const INSTITUTO = ['kenji', 'ryu', 'goro', 'tetsu'];

/** El apodo y la técnica de cada uno (la técnica sale en grande cuando la usa en la pelea). */
export const INFO: Record<string, { apodo: string; tecnica: string }> = {
  rick: { apodo: 'EL CAPITÁN', tecnica: 'PUÑO MACH' },
  steph: { apodo: 'LA VELOZ', tecnica: 'PATADA HURACÁN' },
  sophie: { apodo: 'LA ACRÓBATA', tecnica: 'CHILENA ASESINA' },
  alana: { apodo: 'LA PEQUEÑA TERRIBLE', tecnica: '¡THOR AL RESCATE!' },
  kenji: { apodo: '"TORO" EL CAPITÁN', tecnica: 'UPPERCUT DEL DRAGÓN' },
  ryu: { apodo: 'EL KARATEKA', tecnica: 'RODILLA VOLADORA' },
  goro: { apodo: 'EL GIGANTE', tecnica: 'TACKLE LOCOMOTORA' },
  tetsu: { apodo: 'EL LANZADOR', tecnica: 'DOBLE POTE' },
  minh: { apodo: 'EL DRAGÓN DE SAIGÓN', tecnica: 'COLA DEL DRAGÓN' },
  lan: { apodo: 'LA RELÁMPAGO', tecnica: 'ABANICO DE LOTO' },
  tuan: { apodo: 'EL DEL CARRITO', tecnica: 'CARRITO DE BÁNH MÌ' },
  ba_hoa: { apodo: 'LA ABUELA DEL MERCADO', tecnica: 'NÓN LÁ GIRATORIO' },
  andres: { apodo: 'EL DOCTOR', tecnica: 'DIAGNÓSTICO FATAL' },
  camila: { apodo: 'SUMERCÉ', tecnica: 'TINTICO VOLADOR' },
  pipe: { apodo: 'EL PARCERO', tecnica: 'CHILENA DE LA SÉPTIMA' },
  don_hernando: { apodo: 'EL PATRIARCA', tecnica: 'RUANAZO' },
  gabo: { apodo: 'EL PANA MAYOR', tecnica: 'AREPAZO' },
  yuli: { apodo: 'LA CHAMA', tecnica: 'PATADA CARAQUEÑA' },
  toto: { apodo: 'EL CHAMO', tecnica: 'CHAPITAZO' },
  carmen: { apodo: 'LA SEÑORA CARMEN', tecnica: 'CHANCLETA TELEDIRIGIDA' },
  ender: { apodo: 'EL PRIMO', tecnica: 'GAITAZO' },
  yusmary: { apodo: 'LA REINA DEL LAGO', tecnica: 'RAYO DEL CATATUMBO' },
  jhonder: { apodo: 'EL BICHO', tecnica: 'PATACÓN VOLADOR' },
  abuela_nerva: { apodo: 'LA ABUELA NERVA', tecnica: 'BENDICIÓN MARACUCHA' },
};

type Paso = 'equipo' | 'jugador' | 'rivalEquipo' | 'rival';

/**
 * La selección: tu equipo (los seis), tu atleta, el equipo rival y, en el 1 contra 1, tu rival. El entrenamiento se
 * salta el rival: ahí te espera el Instituto.
 */
export class Select extends Phaser.Scene {
  private modo = '1v1';
  private paso: Paso = 'equipo';
  private sel = 0;
  private miEquipo = 'familia_gg';
  private suEquipo = 'instituto_nekketsu';
  private jugador = 'rick';
  private pad!: Input;
  private cards: Phaser.GameObjects.Container[] = [];
  private fig: Figura | null = null;
  private title!: Phaser.GameObjects.BitmapText;
  private info!: Phaser.GameObjects.BitmapText;
  private sub!: Phaser.GameObjects.BitmapText;
  private nextMove = 0;

  constructor() { super('Select'); }

  init(d: { modo?: string }) {
    this.modo = d.modo ?? '1v1';
    this.paso = 'equipo';
    this.sel = 0;
    this.cards = [];
    this.fig = null;
  }

  create() {
    this.cameras.main.fadeIn(200);
    this.add.image(320, 180, 'bg_caracas').setTint(0x6a6a9a);
    this.pad = new Input(this, false);
    this.title = txt(this, 320, 22, '', 'fuente_titulo', 2);
    this.sub = txt(this, 320, 44, '', 'fuente_ui', 1).setTint(0xc0c0e0);
    this.info = txt(this, 320, 220, '', 'fuente_ui', 2);
    this.build();
  }

  private get practica() { return this.modo.startsWith('practica:'); }
  private get equiposDelPaso(): Equipo[] { return this.paso === 'equipo' ? elegibles() : elegibles().filter((e) => e.id !== this.miEquipo); }
  private get atletasDelPaso(): string[] { return equipo(this.paso === 'jugador' ? this.miEquipo : this.suEquipo).atletas; }
  private get esEquipos() { return this.paso === 'equipo' || this.paso === 'rivalEquipo'; }
  private get n() { return this.esEquipos ? this.equiposDelPaso.length : this.atletasDelPaso.length; }

  private build() {
    for (const c of this.cards) c.destroy();
    this.cards = [];
    this.fig?.destroy();
    this.fig = null;
    const titulos: Record<Paso, string> = { equipo: 'ELIGE TU EQUIPO', jugador: 'ELIGE TU ATLETA', rivalEquipo: 'ELIGE AL RIVAL', rival: 'ELIGE TU RIVAL' };
    this.title.setText(titulos[this.paso]);
    this.sub.setText(this.paso === 'jugador' ? equipo(this.miEquipo).nombre.toUpperCase() : this.paso === 'rival' ? equipo(this.suEquipo).nombre.toUpperCase() : '');
    if (this.esEquipos) this.buildEquipos();
    else this.buildAtletas();
    this.refresh();
  }

  /** Las tarjetas de los equipos: tres por fila, con su bandera, su nombre y las caras de los cuatro. */
  private buildEquipos() {
    const es = this.equiposDelPaso;
    const porFila = 3;
    es.forEach((e, i) => {
      const col = i % porFila, fila = Math.floor(i / porFila);
      const enFila = Math.min(porFila, es.length - fila * porFila);
      const x = 320 + (col - (enFila - 1) / 2) * 200, y = 108 + fila * 118;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      c.add(g);
      if (this.textures.exists(e.bandera)) c.add(this.add.image(-74, -36, e.bandera).setScale(0.55));
      c.add(txt(this, 6, -36, e.corto, 'fuente_ui', 2).setTint(e.claro));
      e.atletas.forEach((a, k) => c.add(this.add.image(-60 + k * 40, 6, `retratos:${a}`, 'chico_feliz')));
      c.setData('g', g).setData('color', e.color);
      c.setSize(184, 104).setInteractive().on('pointerdown', () => { if (this.sel === i) this.confirm(); else { this.sel = i; this.refresh(); } });
      this.cards.push(c);
    });
  }

  /** Las tarjetas de los atletas: los cuatro del equipo, con su retrato grande. */
  private buildAtletas() {
    const ids = this.atletasDelPaso;
    const color = equipo(this.paso === 'jugador' ? this.miEquipo : this.suEquipo).color;
    ids.forEach((id, i) => {
      const x = 98 + i * 148, y = 112;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      c.add(g);
      c.add(this.add.image(0, 0, `retratos:${id}`, this.paso === 'jugador' ? 'grande_feliz' : 'grande_enojo'));
      const a = kit().atletas[id];
      c.add(txt(this, 0, 62, a.nombre.replace(/".*"/, '').trim(), 'fuente_titulo', 1));
      if (a.numero) c.add(txt(this, 40, -40, `#${a.numero}`, 'fuente_ui', 1).setTint(0xf2c230));
      c.setData('g', g).setData('color', color);
      c.setSize(110, 140).setInteractive().on('pointerdown', () => { if (this.sel === i) this.confirm(); else { this.sel = i; this.refresh(); } });
      this.cards.push(c);
    });
  }

  private refresh() {
    const equipos = this.esEquipos;
    this.cards.forEach((c, i) => {
      const g = c.getData('g') as Phaser.GameObjects.Graphics;
      const on = i === this.sel;
      g.clear();
      if (equipos) {
        g.fillStyle(0x08081a, 0.88).fillRoundedRect(-92, -52, 184, 104, 6);
        g.lineStyle(on ? 3 : 1, on ? c.getData('color') : 0x4a4a6a).strokeRoundedRect(-92, -52, 184, 104, 6);
      } else {
        g.fillStyle(0x08081a, 0.85).fillRect(-54, -54, 108, 130);
        g.lineStyle(on ? 3 : 1, on ? c.getData('color') : 0x4a4a6a).strokeRect(-54, -54, 108, 130);
      }
      c.setScale(on ? 1.06 : 0.94).setAlpha(on ? 1 : 0.7);
    });
    this.fig?.destroy();
    this.fig = null;
    if (equipos) {
      const e = this.equiposDelPaso[this.sel];
      this.info.setY(334).setText(e.nombre.toUpperCase()).setTint(e.claro);
    } else {
      const id = this.atletasDelPaso[this.sel];
      this.info.setY(220).setText(`${INFO[id]?.apodo ?? ''} · ${INFO[id]?.tecnica ?? ''}`).setTint(this.paso === 'jugador' ? 0xffe080 : 0xff8080);
      this.mostrar(id);
    }
    chip.blip(660 + this.sel * 80, 0.04, 'sq25', 0.14);
  }

  /** El atleta en grande; si sus animaciones todavía no cargaron, se cargan y aparece. */
  private mostrar(id: string) {
    const poner = () => {
      if (!this.scene.isActive() || this.esEquipos || this.atletasDelPaso[this.sel] !== id) return;
      this.fig?.destroy();
      this.fig = new Figura(this, 320, 340, id, this.paso === 'jugador' ? 'celebrate' : 'taunt').setScale(2.5);
      this.fig.row = 'down';
    };
    cargarAtletas(this, [id], ['ngg_mov'], poner);
  }

  private confirm() {
    chip.blip(1320, 0.12, 'sq25', 0.2, 1760);
    this.sound.play('elegir', { volume: 0.5 });
    if (this.paso === 'equipo') {
      this.miEquipo = this.equiposDelPaso[this.sel].id;
      this.paso = 'jugador';
      this.sel = 0;
      this.build();
      return;
    }
    if (this.paso === 'jugador') {
      this.jugador = this.atletasDelPaso[this.sel];
      // en el entrenamiento te espera el Instituto (o la Familia, si el Instituto eres tú)
      if (this.practica) {
        this.suEquipo = this.miEquipo === 'instituto_nekketsu' ? 'familia_gg' : 'instituto_nekketsu';
        this.salir();
        return;
      }
      this.paso = 'rivalEquipo';
      // el rival que sale marcado: el Instituto, como en la historia (o la Familia, si el Instituto eres tú)
      const def = this.miEquipo === 'instituto_nekketsu' ? 'familia_gg' : 'instituto_nekketsu';
      this.sel = Math.max(0, this.equiposDelPaso.findIndex((e) => e.id === def));
      this.build();
      return;
    }
    if (this.paso === 'rivalEquipo') {
      this.suEquipo = this.equiposDelPaso[this.sel].id;
      if (this.modo === '1v1' || this.modo === 'judo') { this.paso = 'rival'; this.sel = 0; this.build(); return; }
      this.salir();
      return;
    }
    this.salir(this.atletasDelPaso[this.sel]);
  }

  /** Arranca lo elegido, con el partido ya puesto. */
  private salir(rival?: string) {
    setPartido(this.miEquipo, this.suEquipo);
    const id = this.jugador;
    const capitan = equipo(this.suEquipo).atletas[0];
    if (this.modo === '4v4') { this.fadeTo('Fight', { modo: '4v4', jugador: id, rival: capitan }); return; }
    if (this.modo === 'gira') {
      const gira: Gira = { jugador: id, idx: 0, puntos: [0, 0], resultados: [], pruebas: sortearGira(), equipos: [this.miEquipo, this.suEquipo] };
      this.registry.set('gira', gira);
      this.fadeTo('Medallero');
      return;
    }
    if (this.practica) {
      const sc = this.modo.slice(9);
      if (sc === 'Fight') this.fadeTo('Fight', { modo: '1v1', jugador: id, rival: equipo(this.suEquipo).atletas[2] ?? capitan, practica: true });
      else this.fadeTo(sc, { jugador: id, practica: true });
      return;
    }
    if (this.modo === '1v1' || this.modo === 'judo') { this.fadeTo('Fight', { modo: this.modo, jugador: id, rival: rival ?? capitan }); return; }
    // "CrossCountry@2": un tramo suelto del Cross
    const [sc, t] = this.modo.split('@');
    this.fadeTo(sc, t === undefined ? { jugador: id } : { jugador: id, tramo: Number(t), suelto: true });
  }

  private fadeTo(scene: string, d?: object) {
    this.cameras.main.fadeOut(250);
    this.cameras.main.once('camerafadeoutcomplete', () => { if (scene !== 'Title') chip.stop(0.3); this.scene.start(scene, d); });
  }

  private atras() {
    const antes: Record<Paso, Paso | null> = { equipo: null, jugador: 'equipo', rivalEquipo: 'jugador', rival: 'rivalEquipo' };
    const a = antes[this.paso];
    if (!a) { this.scene.start('Title'); return; }
    this.paso = a;
    // vuelve marcado lo que había elegido
    this.sel = a === 'equipo' ? Math.max(0, elegibles().findIndex((e) => e.id === this.miEquipo))
      : a === 'jugador' ? Math.max(0, equipo(this.miEquipo).atletas.indexOf(this.jugador))
        : Math.max(0, this.equiposDelPaso.findIndex((e) => e.id === this.suEquipo));
    this.build();
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    this.fig?.step(dt);
    if (this.fig?.anim.done) this.fig.set(this.paso === 'jugador' ? 'celebrate' : 'idle', true);
    const p = this.pad.read();
    const dx = Math.round(p.x), dy = Math.round(p.y);
    if ((dx !== 0 || (dy !== 0 && this.esEquipos)) && this.time.now > this.nextMove) {
      // en la grilla de equipos, arriba y abajo cambian de fila
      const paso = dy !== 0 ? dy * 3 : dx;
      this.sel = (this.sel + paso + this.n * 3) % this.n;
      this.nextMove = this.time.now + 180;
      this.refresh();
    }
    if (dx === 0 && dy === 0) this.nextMove = 0;
    if (p.pressed.punch || p.pressed.start || p.pressed.kick || p.pressed.jump) this.confirm();
    if (p.pressed.back) this.atras();
  }
}

/** El equipo de un atleta, para quien no pasa por la selección (las pruebas de la gira, los tests). */
export { equipoDe };
