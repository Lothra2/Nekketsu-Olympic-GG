/**
 * Chip de sonido estilo NES hecho con Web Audio: 2 cuadradas (con ancho de pulso), una triangular y ruido.
 * Las canciones son originales y se escriben como texto: una nota por paso ("C5"), "-" sigue, "." silencio.
 * Batería: k bombo, s redoblante, h platillo, r redoble, t tom.
 */

type Wave = 'sq12' | 'sq25' | 'sq50' | 'tri' | 'saw' | 'drums';
export interface Track { wave: Wave; steps: string[]; vol: number; oct?: number }
export interface Song { bpm: number; perBeat: number; tracks: Track[]; loop: boolean }

const NOTE = /^([A-G])(#|b)?(-?\d)$/;
const SEMI: Record<string, number> = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
export function freq(n: string, oct = 0): number {
  const m = NOTE.exec(n);
  if (!m) return 0;
  const s = SEMI[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + oct - 4) * 12;
  return 440 * Math.pow(2, s / 12);
}

const bar = (s: string) => s.trim().split(/\s+/);
const join = (...bars: string[]) => bars.flatMap(bar);

class Chip {
  ctx: AudioContext | null = null;
  master!: GainNode;
  music!: GainNode;
  sfx!: GainNode;
  private waves = new Map<string, PeriodicWave>();
  private noise!: AudioBuffer;
  private timer: number | null = null;
  private song: Song | null = null;
  private step = 0;
  private nextTime = 0;
  private songGain: GainNode | null = null;
  muted = false;

  attach(ctx: AudioContext) {
    if (this.ctx) return;
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(ctx.destination);
    this.music = ctx.createGain();
    this.music.gain.value = 0.42;
    this.music.connect(this.master);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.7;
    this.sfx.connect(this.master);
    for (const [k, duty] of [['sq12', 0.125], ['sq25', 0.25], ['sq50', 0.5]] as const) {
      const n = 32, re = new Float32Array(n), im = new Float32Array(n);
      // pulso de ancho `duty`: serie de Fourier exacta
      for (let i = 1; i < n; i++) { re[i] = Math.sin(2 * Math.PI * i * duty) / (Math.PI * i); im[i] = (1 - Math.cos(2 * Math.PI * i * duty)) / (Math.PI * i); }
      this.waves.set(k, ctx.createPeriodicWave(re, im));
    }
    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    let r = 0x1234;
    for (let i = 0; i < len; i++) { r ^= r << 13; r ^= r >> 17; r ^= r << 5; d[i] = ((r >>> 0) / 0xffffffff) * 2 - 1; }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  private osc(wave: Wave, f: number, t: number, dur: number, vol: number, out: AudioNode, slide?: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    if (wave === 'tri') o.type = 'triangle';
    else if (wave === 'saw') o.type = 'sawtooth';
    else o.setPeriodicWave(this.waves.get(wave)!);
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.setValueAtTime(vol, t + Math.max(0.01, dur * 0.7));
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private hit(kind: string, t: number, vol: number, out: AudioNode) {
    const ctx = this.ctx!;
    if (kind === 'k') { this.osc('tri', 150, t, 0.16, vol * 1.6, out, 38); return; }
    if (kind === 't') { this.osc('tri', 220, t, 0.14, vol * 1.2, out, 90); return; }
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    const g = ctx.createGain();
    const dur = kind === 'h' ? 0.035 : 0.13;
    f.type = kind === 'h' ? 'highpass' : 'bandpass';
    f.frequency.value = kind === 'h' ? 7000 : 1900;
    g.gain.setValueAtTime(kind === 'h' ? vol * 0.35 : vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.01);
  }

  play(song: Song, fadeIn = 0) {
    if (!this.ctx) return;
    this.stop(0.08);
    this.song = song;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.06;
    this.songGain = this.ctx.createGain();
    this.songGain.gain.value = fadeIn ? 0 : 1;
    if (fadeIn) this.songGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + fadeIn);
    this.songGain.connect(this.music);
    const tick = () => this.schedule();
    tick();
    this.timer = window.setInterval(tick, 25);
  }

  stop(fade = 0.3) {
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    if (this.songGain && this.ctx) {
      const g = this.songGain;
      g.gain.cancelScheduledValues(this.ctx.currentTime);
      g.gain.setValueAtTime(g.gain.value, this.ctx.currentTime);
      g.gain.linearRampToValueAtTime(0, this.ctx.currentTime + fade);
      setTimeout(() => g.disconnect(), fade * 1000 + 300);
    }
    this.songGain = null;
    this.song = null;
  }

  private schedule() {
    const s = this.song, ctx = this.ctx;
    if (!s || !ctx || !this.songGain) return;
    const stepDur = 60 / s.bpm / s.perBeat;
    const len = Math.max(...s.tracks.map((t) => t.steps.length));
    while (this.nextTime < ctx.currentTime + 0.15) {
      if (this.step >= len) {
        if (!s.loop) { this.stop(0.5); return; }
        this.step = 0;
      }
      for (const tr of s.tracks) {
        const tok = tr.steps[this.step % tr.steps.length];
        if (!tok || tok === '-' || tok === '.') continue;
        if (tr.wave === 'drums') {
          if (tok === 'r') { this.hit('s', this.nextTime, tr.vol * 0.8, this.songGain); this.hit('s', this.nextTime + stepDur / 2, tr.vol * 0.8, this.songGain); }
          else for (const ch of tok) this.hit(ch, this.nextTime, tr.vol, this.songGain);
          continue;
        }
        // largo: cuenta los "-" que siguen
        let n = 1;
        while (tr.steps[(this.step + n) % tr.steps.length] === '-' && this.step + n < tr.steps.length) n++;
        this.osc(tr.wave, freq(tok, tr.oct ?? 0), this.nextTime, n * stepDur * 0.95, tr.vol, this.songGain);
      }
      this.step++;
      this.nextTime += stepDur;
    }
  }

  /** Efecto corto sintetizado (blips de texto, cursor, etc). */
  blip(f = 880, dur = 0.04, wave: Wave = 'sq25', vol = 0.18, slide?: number) {
    if (!this.ctx) return;
    this.osc(wave, f, this.ctx.currentTime + 0.001, dur, vol, this.sfx, slide);
  }

  /** El kikirikí del gallo: tres notas que suben y la última larga que cae. */
  kikiriki(vol = 0.1) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.001;
    this.osc('saw', 640, t, 0.07, vol, this.sfx, 860);
    this.osc('saw', 720, t + 0.1, 0.07, vol, this.sfx, 940);
    this.osc('saw', 800, t + 0.2, 0.1, vol, this.sfx, 1080);
    this.osc('saw', 980, t + 0.34, 0.5, vol, this.sfx, 620);
  }

  /** El aleteo de un ave: tres golpecitos de ruido. */
  aleteo(vol = 0.12) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.001;
    for (let i = 0; i < 3; i++) this.hit('s', t + i * 0.07, vol * (1 - i * 0.25), this.sfx);
  }

  /** Golpe de ruido (explosiones, impacto de logo). */
  boom(vol = 0.6) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.hit('k', t, vol, this.sfx);
    this.hit('s', t, vol * 0.8, this.sfx);
    this.osc('tri', 90, t, 0.4, vol, this.sfx, 30);
  }
}

export const chip = new Chip();

// ---------------------------------------------------------------- canciones

type Chord = [string, string, string];
const CH: Record<string, Chord> = {
  C: ['C', 'E', 'G'], F: ['F', 'A', 'C'], G: ['G', 'B', 'D'], Dm: ['D', 'F', 'A'], Am: ['A', 'C', 'E'], E: ['E', 'G#', 'B'], Em: ['E', 'G', 'B'],
};
const bassMarch = (c: string) => { const [r, , f] = CH[c]; return [`${r}2`, '.', `${f}2`, '.', `${r}2`, `${r}2`, `${f}2`, '.']; };
const bassRock = (c: string) => { const [r] = CH[c]; return [`${r}2`, `${r}2`, `${r}3`, `${r}2`, `${r}2`, `${r}3`, `${r}2`, `${r}2`]; };
const pad = (c: string, o = 4) => { const [, t, f] = CH[c]; return [`${t}${o}`, '-', '-', '-', `${f}${o}`, '-', '-', '-']; };

/** Marcha Nekketsu: la de la banda escolar, en Do mayor a 132. */
const marchaLead = join(
  'C5 - E5 - G5 - - E5', 'F5 - E5 - D5 - C5 -', 'D5 - E5 - F5 - A5 -', 'G5 - - - - - . .',
  'C5 - E5 - G5 - - E5', 'A5 - G5 - F5 - E5 -', 'D5 - G5 - B4 - D5 -', 'C5 - - - - - . G4',
  'E5 - E5 F5 G5 - E5 -', 'F5 - F5 G5 A5 - F5 -', 'G5 - A5 G5 F5 - E5 -', 'D5 - E5 F5 G5 - - -',
  'C6 - B5 - A5 - G5 -', 'F5 - A5 - G5 - E5 -', 'D5 - G5 - F5 - D5 -', 'C5 - G4 - C5 - - .',
);
const marchaChords = ['C', 'F', 'Dm', 'G', 'C', 'F', 'G', 'C', 'C', 'F', 'C', 'G', 'Am', 'F', 'G', 'C'];
const marchaDrums = marchaChords.flatMap((_, i) => bar((i % 4 === 3) ? 'k . s . k s r r' : 'k . s . k k s .'));
export const MARCHA: Song = {
  bpm: 132, perBeat: 2, loop: true,
  tracks: [
    { wave: 'sq25', steps: marchaLead, vol: 0.2 },
    { wave: 'sq12', steps: marchaChords.flatMap((c) => pad(c)), vol: 0.09 },
    { wave: 'tri', steps: marchaChords.flatMap(bassMarch), vol: 0.32 },
    { wave: 'drums', steps: marchaDrums, vol: 0.28 },
    { wave: 'drums', steps: marchaChords.flatMap(() => bar('h h h h h h h h')), vol: 0.18 },
  ],
};

/** Azotea Final: el tema de pelea, en La menor a 152. */
const peleaLead = join(
  'A4 - C5 - E5 - D5 C5', 'D5 - E5 - C5 - A4 -', 'F4 - A4 - C5 - B4 A4', 'G4 - B4 - D5 - - -',
  'A4 - C5 - E5 - A5 G5', 'F5 - E5 - D5 - C5 D5', 'E5 - - - D5 - C5 -', 'B4 - - - G#4 - - -',
  'E5 - E5 - A5 - G5 E5', 'D5 - C5 - D5 - E5 -', 'F5 - F5 - E5 - D5 C5', 'D5 - - - G4 - - -',
  'C5 - D5 - E5 - G5 A5', 'G5 - E5 - D5 - C5 -', 'A4 - C5 - F5 - E5 D5', 'E5 - - - - - . .',
);
const peleaChords = ['Am', 'Dm', 'F', 'G', 'Am', 'F', 'C', 'E', 'Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'E'];
export const PELEA: Song = {
  bpm: 152, perBeat: 2, loop: true,
  tracks: [
    { wave: 'sq50', steps: peleaLead, vol: 0.16 },
    { wave: 'sq12', steps: peleaChords.flatMap((c) => pad(c)), vol: 0.07 },
    { wave: 'tri', steps: peleaChords.flatMap(bassRock), vol: 0.3 },
    { wave: 'drums', steps: peleaChords.flatMap((_, i) => bar(i % 8 === 7 ? 'k s k s t t r r' : 'k h s h k k s h')), vol: 0.26 },
  ],
};

/** Fanfarria de victoria. */
export const VICTORIA: Song = {
  bpm: 150, perBeat: 2, loop: false,
  tracks: [
    { wave: 'sq25', steps: join('C5 E5 G5 C6 - - E6 -', 'D6 - - - C6 - - -', 'G5 A5 B5 C6 - - - -', '. . . . . . . .'), vol: 0.22 },
    { wave: 'sq12', steps: join('E4 G4 C5 E5 - - G5 -', 'F5 - - - E5 - - -', 'D5 F5 G5 E5 - - - -', '. . . . . . . .'), vol: 0.12 },
    { wave: 'tri', steps: join('C3 - G2 - C3 - - -', 'F2 - - - C3 - - -', 'G2 - G2 - C3 - - -', '. . . . . . . .'), vol: 0.32 },
    { wave: 'drums', steps: join('k . s . k . s .', 'k . s . k k s .', 'k s k s r r k .', '. . . . . . . .'), vol: 0.28 },
  ],
};

/** Tensión: la intro antes del logo. Pulso grave, tom y un arpegio frío. */
export const TENSION: Song = {
  bpm: 96, perBeat: 2, loop: true,
  tracks: [
    { wave: 'tri', steps: join('A1 - - - - - - -', 'A1 - - - - - - -', 'F1 - - - - - - -', 'G1 - - - E1 - - -'), vol: 0.34 },
    { wave: 'sq12', steps: join('A4 C5 E5 A5 E5 C5 A4 E4', 'A4 C5 E5 A5 E5 C5 A4 E4', 'F4 A4 C5 F5 C5 A4 F4 C4', 'G4 B4 D5 G5 E5 B4 G#4 E4'), vol: 0.06 },
    { wave: 'drums', steps: join('k . . . t . . .', 'k . . . t . k .', 'k . . . t . . .', 'k . t . t . r r'), vol: 0.3 },
  ],
};

/** Saigón Chạy: alegre, pentatónica, para la presentación de la Familia GG. */
const saigonLead = join(
  'E5 G5 A5 - G5 E5 D5 -', 'C5 D5 E5 G5 E5 - . .', 'A5 - G5 E5 G5 - A5 C6', 'A5 - G5 - E5 - . .',
  'E5 G5 A5 - G5 E5 D5 -', 'C5 D5 E5 G5 A5 - G5 -', 'E5 D5 C5 D5 E5 - G5 -', 'C5 - - - . . . .',
);
const saigonChords = ['C', 'Am', 'F', 'G', 'C', 'Am', 'F', 'C'];
export const SAIGON: Song = {
  bpm: 140, perBeat: 2, loop: true,
  tracks: [
    { wave: 'sq25', steps: saigonLead, vol: 0.18 },
    { wave: 'sq12', steps: saigonChords.flatMap((c) => { const [r, t, f] = CH[c]; return [`${r}4`, `${t}4`, `${f}4`, `${t}4`, `${r}4`, `${t}4`, `${f}4`, `${t}4`]; }), vol: 0.06 },
    { wave: 'tri', steps: saigonChords.flatMap((c) => { const [r, , f] = CH[c]; return [`${r}2`, '.', `${r}3`, '.', `${f}2`, '.', `${r}3`, '.']; }), vol: 0.3 },
    { wave: 'drums', steps: saigonChords.flatMap((_, i) => bar(i % 4 === 3 ? 'k h s h k s r r' : 'k h s h k k s h')), vol: 0.24 },
  ],
};
