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

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'juego',
  width: 640,
  height: 360,
  backgroundColor: '#0b0b14',
  pixelArt: true,
  roundPixels: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true, activePointers: 4 },
  scene: [Boot, Tap, Intro, Title, Select, Fight, Medallero, Vallas, Natacion, Jabalina],
});

(window as unknown as { game: Phaser.Game }).game = game;
