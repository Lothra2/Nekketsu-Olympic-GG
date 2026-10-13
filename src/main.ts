import Phaser from 'phaser';
import { Boot } from './scenes/Boot';
import { Tap } from './scenes/Tap';
import { Intro } from './scenes/Intro';
import { Title } from './scenes/Title';
import { Select } from './scenes/Select';
import { Fight } from './scenes/Fight';
import { Medallero } from './scenes/Medallero';
import { Vallas } from './events/Vallas';
import { Natacion } from './events/Natacion';
import { Jabalina } from './events/Jabalina';
import { Tamawari } from './events/Tamawari';
import { DaCau } from './events/DaCau';
import { Tejo } from './events/Tejo';
import { Azoteas } from './events/Azoteas';
import { Quemado } from './events/Quemado';
import { Chapita } from './events/Chapita';
import { Voley } from './events/Voley';
import { CrossCountry } from './events/CrossCountry';
import { Obstaculos } from './events/Obstaculos';
import { BASE_H, BASE_W, instalarPantalla } from './core/pantalla';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'juego',
  width: BASE_W,
  height: BASE_H,
  backgroundColor: '#0b0b14',
  pixelArt: true,
  roundPixels: true,
  // el ancho lo ajusta core/pantalla según la pantalla (de 640 a 800); FIT lo escala sin deformar
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true, activePointers: 4 },
  scene: [Boot, Tap, Intro, Title, Select, Fight, Medallero, Vallas, Natacion, Jabalina, CrossCountry, Obstaculos, Tamawari, DaCau, Tejo, Azoteas, Quemado, Chapita, Voley],
});

instalarPantalla(game);

(window as unknown as { game: Phaser.Game }).game = game;
