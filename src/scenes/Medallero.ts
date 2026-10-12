import Phaser from 'phaser';
import { Figura } from '../core/figura';
import { Input } from '../core/input';
import { chip, MARCHA, VICTORIA } from '../core/music';
import { txt, panel, flash } from '../core/ui';
import { PRUEBAS_GIRA, type Gira } from '../events/base';
import { FAMILIA, INSTITUTO } from './Select';
import { fireworks } from './logo';

const BANDERA: Record<string, string> = { Vallas: 'flag_co', Natacion: 'flag_vn', Jabalina: 'flag_ve', Fight: 'flag_ve' };

/**
 * Entre prueba y prueba de la Olimpiada Express: el marcador por equipos, lo que va de gira y la que viene.
 * Al final, el podio y los campeones.
 */
export class Medallero extends Phaser.Scene {
  private pad!: Input;
  private gira!: Gira;
  private figs: Figura[] = [];
  private listo = false;
  private fin = false;

  constructor() { super('Medallero'); }

  create() {
    this.gira = this.registry.get('gira') as Gira;
    this.figs = [];
    this.listo = false;
    this.fin = this.gira.idx >= PRUEBAS_GIRA.length;
    this.cameras.main.fadeIn(300);
    this.pad = new Input(this, false);
    if (this.fin) this.final(); else this.tablero();
    this.time.delayedCall(900, () => { this.listo = true; });
    this.input.on('pointerdown', () => this.seguir());
  }

  private tablero() {
    const g = this.gira;
    chip.play(MARCHA);
    this.add.image(320, 180, 'bg_ruta').setTint(0x8080a0);
    txt(this, 320, 24, 'OLIMPIADA EXPRESS', 'fuente_titulo', 2);
    // marcador por equipos
    panel(this, 60, 46, 520, 64);
    txt(this, 170, 64, 'FAMILIA GG', 'fuente_ui', 2).setTint(0x9ac8ff);
    txt(this, 470, 64, 'INSTITUTO', 'fuente_ui', 2).setTint(0xffa0a0);
    const a = txt(this, 170, 92, `${g.puntos[0]}`, 'fuente_titulo', 2);
    const b = txt(this, 470, 92, `${g.puntos[1]}`, 'fuente_titulo', 2);
    txt(this, 320, 86, 'PTS', 'fuente_ui', 2).setTint(0xf2c230);
    if (g.idx > 0) for (const t of [a, b]) this.tweens.add({ targets: t, scale: { from: 3, to: 2 }, duration: 400, ease: 'Back.out' });
    FAMILIA.forEach((id, i) => this.add.image(84 + i * 14, 92, 'cabecitas', id));
    INSTITUTO.forEach((id, i) => this.add.image(514 + i * 14, 92, 'cabecitas', id));
    // las pruebas: hechas con su oro, la que viene parpadeando
    panel(this, 60, 118, 520, 150);
    PRUEBAS_GIRA.forEach((p, i) => {
      const y = 140 + i * 34;
      const hecha = g.resultados[i];
      const viene = i === g.idx;
      this.add.image(88, y, BANDERA[p.scene]).setScale(0.75);
      const n = txt(this, 112, y - 5, p.nombre, 'fuente_ui', 2, 0).setTint(hecha ? 0x8a8aa8 : viene ? 0xffe040 : 0xffffff);
      txt(this, 112, y + 9, p.lugar, 'fuente_ui', 1, 0).setTint(0x8a8ab0);
      if (hecha) {
        const oro = hecha.podio[0];
        this.add.circle(470, y, 8, 0xffd040);
        this.add.image(496, y, 'cabecitas', oro);
        txt(this, 512, y, oro.toUpperCase(), 'fuente_ui', 1, 0);
      } else if (viene) {
        this.tweens.add({ targets: n, alpha: 0.3, duration: 400, yoyo: true, repeat: -1 });
        txt(this, 560, y, i === PRUEBAS_GIRA.length - 1 ? 'X2 PTS' : '', 'fuente_ui', 1, 1).setTint(0xff8040);
      }
    });
    const p = PRUEBAS_GIRA[g.idx];
    const msg = g.idx === 0 ? '¡ARRANCA LA GIRA! 10 · 6 · 4 · 2 PUNTOS POR PUESTO' : g.idx === PRUEBAS_GIRA.length - 1 ? 'LA FINAL VALE 20 PUNTOS PARA EL EQUIPO QUE GANE' : `PRÓXIMA: ${p.nombre}`;
    txt(this, 320, 284, msg, 'fuente_ui', 1).setTint(0xffe080);
    const go = txt(this, 320, 306, 'PRESIONA START', 'fuente_ui', 2);
    this.tweens.add({ targets: go, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });
    // la familia y el jugador, animados abajo
    const f = new Figura(this, 40, 340, g.jugador, 'idle').setScale(1.2);
    f.row = 'down_right';
    this.figs.push(f);
    const thor = new Figura(this, 600, 344, 'thor', 'wag').setScale(1.2);
    thor.row = 'down_right';
    thor.left = true;
    this.figs.push(thor);
  }

  private final() {
    const g = this.gira;
    const gana = g.puntos[0] >= g.puntos[1] ? 0 : 1;
    chip.play(VICTORIA);
    flash(this, 300);
    this.add.image(320, 180, 'bg_caracas');
    this.add.image(320, 280, 'bg_azotea');
    fireworks(this);
    txt(this, 320, 30, gana === 0 ? '¡CAMPEONES DE LA GIRA!' : 'GANÓ EL INSTITUTO...', gana === 0 ? 'fuente_titulo' : 'fuente_titulo_plata', 2);
    txt(this, 320, 58, gana === 0 ? 'LA FAMILIA GG SE TRAE LA COPA PA\' SAIGÓN' : '¡LA REVANCHA ES PERSONAL, CHAMO!', 'fuente_ui', 2).setTint(0xffe080);
    panel(this, 170, 76, 300, 40);
    txt(this, 240, 96, `GG ${g.puntos[0]}`, 'fuente_ui', 2).setTint(0x9ac8ff);
    txt(this, 400, 96, `INST ${g.puntos[1]}`, 'fuente_ui', 2).setTint(0xffa0a0);
    // podio con los cuatro del equipo ganador
    const team = gana === 0 ? FAMILIA : INSTITUTO;
    const podio = this.add.graphics();
    podio.fillStyle(0xf2c230).fillRect(280, 268, 80, 60);
    podio.fillStyle(0xd0d8e8).fillRect(200, 284, 80, 44);
    podio.fillStyle(0xd08a40).fillRect(360, 296, 80, 32);
    txt(this, 320, 296, '1', 'fuente_titulo', 2).setTint(0x8a5a10);
    txt(this, 240, 306, '2', 'fuente_titulo', 2).setTint(0x6a6a7a);
    txt(this, 400, 312, '3', 'fuente_titulo', 2).setTint(0x6a3a10);
    const pos: [number, number][] = [[320, 268], [240, 284], [400, 296], [470, 330]];
    const lider = gana === 0 ? g.jugador : 'kenji';
    const orden = [lider, ...team.filter((id) => id !== lider)];
    orden.forEach((id, i) => {
      const f = new Figura(this, pos[i][0], pos[i][1], id, 'victory').setScale(1.6);
      f.row = 'down';
      this.figs.push(f);
    });
    if (gana === 0) { const thor = new Figura(this, 150, 330, 'thor', 'celebrate').setScale(1.6); thor.row = 'down_right'; this.figs.push(thor); }
    const go = txt(this, 320, 346, 'PRESIONA START PARA VOLVER', 'fuente_ui', 1);
    this.tweens.add({ targets: go, alpha: 0.2, duration: 450, yoyo: true, repeat: -1 });
    this.sound.play(gana === 0 ? 'subir_nivel' : 'enemigo_muere', { volume: 0.5 });
  }

  private seguir() {
    if (!this.listo) return;
    this.listo = false;
    chip.blip(1320, 0.1, 'sq25', 0.2, 1760);
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.fin) {
        this.registry.remove('gira');
        chip.stop(0.2);
        this.registry.set('marchaSonando', false);
        this.scene.start('Title');
        return;
      }
      const p = PRUEBAS_GIRA[this.gira.idx];
      if (p.scene === 'Fight') this.scene.start('Fight', { modo: '4v4', jugador: this.gira.jugador, rival: 'kenji', gira: true });
      else this.scene.start(p.scene, { jugador: this.gira.jugador, gira: true });
    });
  }

  update(_t: number, dms: number) {
    const dt = Math.min(0.05, dms / 1000);
    for (const f of this.figs) { f.step(dt); if (f.anim.done) f.set(f.anim.name, true); }
    const p = this.pad.read();
    if (p.pressed.start || p.pressed.punch || p.pressed.kick || p.pressed.jump) this.seguir();
  }
}
