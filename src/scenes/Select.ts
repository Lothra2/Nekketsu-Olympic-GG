import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { Input } from '../core/input';
import { chip } from '../core/music';
import { kit, findAnim } from '../core/kit';
import { txt } from '../core/ui';
import { sortearGira, type Gira } from '../events/base';
import { elegibles, equipo, equipoDe, setPartido, type Equipo } from '../core/equipos';
import { cargarAtletas } from '../core/carga';
import { hayUi, pieza } from '../core/interfaz';

/** Los cuatro de la Familia y los cuatro del Instituto (el equipo de la intro y del título). */
export const FAMILIA = ['rick', 'steph', 'sophie', 'alana'];
export const INSTITUTO = ['kenji', 'ryu', 'goro', 'tetsu'];

/** El apodo y la técnica de cada uno (la técnica sale en grande cuando la usa en la pelea). */
/** La técnica de equipo de PixelForja (lote B7), una por equipo, y su nombre en el corte. */
export const TECNICA_EQUIPO: Record<string, string> = {
  familia_gg: '¡CHANCLETAZO SUPREMO!',
  instituto_nekketsu: '¡COPETAZO!',
  rong_sai_gon: '¡SILLA VOLADORA!',
  rolos_de_chapinero: '¡CICLOVÍA INFERNAL!',
  panas_de_caracas: '¡BATAZO DE JONRÓN!',
  maracuchos_del_lago: '¡FURRAZO!',
};

/** La técnica que usa: la de su equipo si el kit se la trae (`tecnica_<equipo>`), si no la suya de siempre. */
export function nombreTecnica(id: string): string {
  const eq = (kit().atletas[id] as { equipo?: string } | undefined)?.equipo ?? '';
  if (eq && TECNICA_EQUIPO[eq] && findAnim(id, `tecnica_${eq}`)) return TECNICA_EQUIPO[eq];
  return INFO[id]?.tecnica ?? '¡TÉCNICA!';
}

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
      const tar = pieza(`tarjeta_${e.id}`);
      if (tar && hayUi(this, `tarjeta_${e.id}`)) {
        // la tarjeta del equipo de PixelForja (lote G2): fondo, escudo y bandera pintados; el nombre en su `texto` y
        // las cuatro caras en su franja (x 12, 52, 92 y 132, y 36 desde la esquina)
        c.add(this.add.image(0, 0, `ui_tarjeta_${e.id}`));
        const [tx, ty, tw, th] = tar.texto ?? [42, 6, 104, 20];
        // el nombre se queda entre la bandera y el escudo: si no cabe a 2, va a 1
        // el nombre se queda entre la bandera y el escudo: a 2 si cabe, si no lo más grande que quepa en medios
        // (a 1,5 cada pixel de la letra sigue siendo parejo en pantalla)
        const nom = txt(this, -92 + tx + tw / 2, -52 + ty + th / 2, e.corto, 'fuente_ui', 1).setTint(e.claro);
        nom.setScale(Math.max(1, Math.min(2, Math.floor(((tw - 2) / nom.width) * 2) / 2)));
        c.add(nom);
        e.atletas.forEach((a, k) => c.add(this.add.image(-92 + 12 + k * 40, -52 + 36, `retratos:${a}`, 'chico_feliz').setOrigin(0)));
        c.add(g);
        c.setData('kit', true);
      } else {
        c.add(g);
        if (this.textures.exists(e.bandera)) c.add(this.add.image(-74, -36, e.bandera).setScale(0.55));
        c.add(txt(this, 6, -36, e.corto, 'fuente_ui', 2).setTint(e.claro));
        e.atletas.forEach((a, k) => c.add(this.add.image(-60 + k * 40, 6, `retratos:${a}`, 'chico_feliz')));
      }
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
      const cara = this.add.image(0, 0, `retratos:${id}`, this.paso === 'jugador' ? 'grande_feliz' : 'grande_enojo');
      c.add(cara);
      const a = kit().atletas[id];
      // el nombre completo; si no cabe en la tarjeta, en dos renglones partido en el espacio más al medio, y la cara
      // sube un poco para hacerles sitio
      const nombre = a.nombre.replace(/".*"/, '').replace(/\s+/g, ' ').trim();
      const t = txt(this, 0, 62, nombre, 'fuente_titulo', 1);
      c.add(t);
      if (t.width > 100 && nombre.includes(' ')) {
        const esp = [...nombre].map((ch, k) => (ch === ' ' ? k : -1)).filter((k) => k > 0);
        const k = esp.reduce((m, k) => (Math.abs(k - nombre.length / 2) < Math.abs(m - nombre.length / 2) ? k : m));
        t.setText(nombre.slice(0, k).toUpperCase()).setY(52);
        c.add(txt(this, 0, 69, nombre.slice(k + 1), 'fuente_titulo', 1));
        cara.setY(-6);
      }
      for (const o of c.list) if (o instanceof Phaser.GameObjects.BitmapText && o.width > 104) o.setScale(104 / o.width);
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
      if (equipos && c.getData('kit')) {
        // la tarjeta del kit ya trae su fondo: solo el borde de la elegida
        if (on) g.lineStyle(3, 0xffffff, 0.9).strokeRoundedRect(-94, -54, 188, 108, 6);
      } else if (equipos) {
        g.fillStyle(0x08081a, 0.88).fillRoundedRect(-92, -52, 184, 104, 6);
        g.lineStyle(on ? 3 : 1, on ? c.getData('color') : 0x4a4a6a).strokeRoundedRect(-92, -52, 184, 104, 6);
      } else {
        g.fillStyle(0x08081a, 0.85).fillRect(-54, -58, 108, 138);
        g.lineStyle(on ? 3 : 1, on ? c.getData('color') : 0x4a4a6a).strokeRect(-54, -58, 108, 138);
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
      this.info.setY(220).setText(`${INFO[id]?.apodo ?? ''} · ${nombreTecnica(id)}`).setTint(this.paso === 'jugador' ? 0xffe080 : 0xff8080);
      this.mostrar(id);
    }
    chip.blip(660 + this.sel * 80, 0.04, 'sq25', 0.14);
  }

  /** El atleta en grande; si sus animaciones todavía no cargaron, se cargan y aparece. */
  private mostrar(id: string) {
    const poner = () => {
      // creándose también vale: si el atleta ya estaba cargado, esto corre dentro del create()
      const st = this.sys.settings.status;
      if (st < Phaser.Scenes.CREATING || st > Phaser.Scenes.PAUSED || this.esEquipos || this.atletasDelPaso[this.sel] !== id) return;
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
      this.precargar(this.miEquipo);
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
      this.precargar(this.suEquipo);
      if (this.modo === '1v1' || this.modo === 'judo') { this.paso = 'rival'; this.sel = 0; this.build(); return; }
      this.salir();
      return;
    }
    this.salir(this.atletasDelPaso[this.sel]);
  }

  /**
   * Mientras se elige, baja los atletas de un equipo: la primera vez cada atleta llega en su paquete (todas sus
   * animaciones), así que la prueba que viene después arranca casi sin espera.
   */
  private precargar(id: string) {
    const e = equipo(id);
    if (e) cargarAtletas(this, e.atletas, ['ngg_mov'], () => {});
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
