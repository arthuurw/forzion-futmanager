/**
 * The default backend (door 2): the browser's Web Audio API, silent where it does not exist.
 * Effects are synthesized in a 16-bit console flavour: pulse and triangle voices, filtered noise
 * for the crowd, a short echo on everything.
 */
import { createRng } from "../engine/rng";
import type { AudioBackend, Bus, EffectId, TrackData } from "./backend";

type Ctor = typeof AudioContext;

function contextClass(): Ctor | undefined {
  const g = globalThis as { AudioContext?: Ctor; webkitAudioContext?: Ctor };
  return g.AudioContext ?? g.webkitAudioContext;
}

/** Envelope points: seconds from the start, and the gain there. Starts and ends silent. */
type Shape = readonly (readonly [number, number])[];

interface Graph {
  ctx: AudioContext;
  music: GainNode;
  sfx: GainNode;
  /** Where effect voices connect: dry to the bus, and through the echo. */
  voices: GainNode;
  track: GainNode;
  noise: AudioBuffer;
  pulse25: PeriodicWave;
  pulse12: PeriodicWave;
}

const ECHO_S = 0.13;
const ECHO_FEEDBACK = 0.28;
const ECHO_WET = 0.22;
/** A soft top end, like the console's sampler. */
const WARMTH_HZ = 6500;
const AMBIENCE_LEVEL = 0.4;
/**
 * How far ahead an effect is scheduled. A start already in the past when the audio thread reads it
 * begins mid-attack, a click; 10 ms was too little while the live screen re-renders every minute.
 */
const LOOKAHEAD_S = 0.05;

function build(ctx: AudioContext): Graph {
  const music = ctx.createGain();
  music.connect(ctx.destination);
  const track = ctx.createGain();
  track.connect(music);

  const warmth = ctx.createBiquadFilter();
  warmth.type = "lowpass";
  warmth.frequency.value = WARMTH_HZ;
  warmth.connect(ctx.destination);
  const sfx = ctx.createGain();
  sfx.connect(warmth);
  const voices = ctx.createGain();
  voices.connect(sfx);
  const delay = ctx.createDelay(1);
  delay.delayTime.value = ECHO_S;
  const feedback = ctx.createGain();
  feedback.gain.value = ECHO_FEEDBACK;
  const dark = ctx.createBiquadFilter();
  dark.type = "lowpass";
  dark.frequency.value = 2500;
  const wet = ctx.createGain();
  wet.gain.value = ECHO_WET;
  voices.connect(delay);
  delay.connect(dark);
  dark.connect(feedback);
  feedback.connect(delay);
  dark.connect(wet);
  wet.connect(sfx);

  // Two seconds of pink noise from a fixed seed: the crowd's raw material. White noise put a third
  // of the crowd's energy above 2 kHz, where it hisses like a radio between stations.
  const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noise.getChannelData(0);
  const rng = createRng(0x5eed);
  // Paul Kellet's pink filter over white noise (-3 dB per octave).
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < data.length; i++) {
    const w = rng.next() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.18;
    b6 = w * 0.115926;
  }

  return { ctx, music, sfx, voices, track, noise, pulse25: pulseWave(ctx, 0.25), pulse12: pulseWave(ctx, 0.125) };
}

/** A band-limited pulse wave, the square-ish lead of the old consoles. */
function pulseWave(ctx: AudioContext, duty: number): PeriodicWave {
  const n = 24;
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  for (let k = 1; k < n; k++) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  return ctx.createPeriodicWave(real, imag);
}

function envelope(param: AudioParam, t: number, shape: Shape): number {
  param.setValueAtTime(0, t);
  for (const [dt, v] of shape) param.linearRampToValueAtTime(v, t + dt);
  return t + (shape.at(-1)?.[0] ?? 0);
}

function glide(param: AudioParam, t: number, points: Shape, scale = 1): void {
  const [first, ...rest] = points;
  if (!first) return;
  param.setValueAtTime(first[1] * scale, t + first[0]);
  for (const [dt, v] of rest) param.linearRampToValueAtTime(v * scale, t + dt);
}

function midi(note: number): number {
  return 440 * 2 ** ((note - 69) / 12);
}

/** One blow of the referee's whistle: a high tone with a fast trill, dropping into pitch. */
function blow(g: Graph, t: number, length: number, pitch: number): void {
  const { ctx } = g;
  const f = 2750 * pitch;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(f * 1.05, t);
  osc.frequency.linearRampToValueAtTime(f, t + 0.04);
  const trill = ctx.createOscillator();
  trill.frequency.value = 27;
  const depth = ctx.createGain();
  depth.gain.value = 170;
  trill.connect(depth);
  depth.connect(osc.frequency);
  const amp = ctx.createGain();
  const end = envelope(amp.gain, t, [
    [0.012, 0.15],
    [length - 0.04, 0.13],
    [length, 0],
  ]);
  osc.connect(amp);
  amp.connect(g.voices);
  osc.start(t);
  trill.start(t);
  osc.stop(end + 0.05);
  trill.stop(end + 0.05);
}

/** A band of crowd noise: `band` moves the filter centre (Hz) over time, `shape` the volume. */
function crowdBand(g: Graph, t: number, shape: Shape, band: Shape, q: number, pitch: number): void {
  const { ctx } = g;
  const src = ctx.createBufferSource();
  src.buffer = g.noise;
  src.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = q;
  glide(filter.frequency, t, band, pitch);
  const amp = ctx.createGain();
  // A narrow band keeps little of the noise's energy: make up for it.
  const boost = 2.5 * Math.sqrt(q);
  const end = envelope(
    amp.gain,
    t,
    shape.map(([dt, v]) => [dt, v * boost] as const),
  );
  src.connect(filter);
  filter.connect(amp);
  amp.connect(g.voices);
  // A different stretch of the noise each time, so layered bands do not phase.
  src.start(t, (pitch * 7.3) % 1.5);
  src.stop(end + 0.05);
}

/** A pulse or triangle note. */
function note(g: Graph, t: number, length: number, freq: number, level: number, wave: PeriodicWave | "triangle"): void {
  const { ctx } = g;
  const osc = ctx.createOscillator();
  if (wave === "triangle") osc.type = "triangle";
  else osc.setPeriodicWave(wave);
  osc.frequency.value = freq;
  const amp = ctx.createGain();
  const end = envelope(amp.gain, t, [
    [0.008, level],
    [Math.max(0.01, length - 0.03), level * 0.7],
    [length, 0],
  ]);
  osc.connect(amp);
  amp.connect(g.voices);
  osc.start(t);
  osc.stop(end + 0.02);
}

const ROAR: readonly { shape: Shape; band: Shape }[] = [
  // A swell that holds, then fades.
  {
    shape: [[0.3, 0.5], [1.9, 0.45], [3.6, 0]],
    band: [[0, 700], [0.4, 1400], [3.6, 1000]],
  },
  // A burst, a breath, and a second wave.
  {
    shape: [[0.15, 0.55], [0.8, 0.33], [1.3, 0.5], [3.2, 0]],
    band: [[0, 750], [0.3, 1350], [1.3, 1250], [3.2, 1000]],
  },
];

const GROAN: readonly { shape: Shape; band: Shape }[] = [
  { shape: [[0.12, 0.34], [0.9, 0.26], [1.5, 0]], band: [[0, 800], [1.5, 280]] },
  { shape: [[0.2, 0.3], [0.7, 0.34], [1.9, 0]], band: [[0, 650], [0.6, 560], [1.9, 230]] },
];

const OOH: readonly { shape: Shape; band: Shape }[] = [
  { shape: [[0.08, 0.3], [0.45, 0.24], [0.9, 0]], band: [[0, 380], [0.35, 700], [0.9, 450]] },
  { shape: [[0.1, 0.32], [0.55, 0.26], [1.1, 0]], band: [[0, 420], [0.4, 820], [1.1, 500]] },
  { shape: [[0.06, 0.26], [0.35, 0.2], [0.7, 0]], band: [[0, 350], [0.25, 650], [0.7, 420]] },
];

function play(g: Graph, id: EffectId, variant: number, pitch: number): void {
  const t = g.ctx.currentTime + LOOKAHEAD_S;
  switch (id) {
    case "whistle-short":
      return blow(g, t, 0.22, pitch);
    case "whistle-double":
      blow(g, t, 0.16, pitch);
      return blow(g, t + 0.26, 0.16, pitch);
    case "whistle-long":
      blow(g, t, 0.18, pitch);
      blow(g, t + 0.3, 0.18, pitch);
      return blow(g, t + 0.6, 0.95, pitch);
    case "crowd-roar": {
      const v = ROAR[variant] ?? ROAR[0]!;
      crowdBand(g, t, v.shape, v.band, 1.1, pitch);
      // The low rumble under the cheer.
      return crowdBand(g, t, v.shape.map(([dt, a]) => [dt, a * 0.6] as const), [[0, 320]], 0.8, pitch);
    }
    case "crowd-groan": {
      const v = GROAN[variant] ?? GROAN[0]!;
      return crowdBand(g, t, v.shape, v.band, 2.4, pitch);
    }
    case "crowd-ooh": {
      const v = OOH[variant] ?? OOH[0]!;
      return crowdBand(g, t, v.shape, v.band, 3, pitch);
    }
    case "crowd-boo": {
      crowdBand(g, t, [[0.2, 0.3], [1.1, 0.26], [1.5, 0]], [[0, 240], [1.5, 200]], 5, pitch);
      // Two detuned low pulses: many voices booing together.
      note(g, t + 0.05, 1.35, 98 * pitch, 0.05, g.pulse25);
      return note(g, t + 0.05, 1.35, 104 * pitch, 0.05, g.pulse25);
    }
    case "goal-jingle": {
      // A quick major arpeggio up to a held top note, over a triangle bass (C major before tuning).
      const start = t + 0.2;
      const step = 0.085;
      [67, 72, 76, 79].forEach((n, i) => note(g, start + i * step, step, midi(n) * pitch, 0.09, g.pulse25));
      note(g, start + 4 * step, 0.5, midi(84) * pitch, 0.09, g.pulse25);
      note(g, start + 4 * step, 0.5, midi(79) * pitch, 0.05, g.pulse12);
      note(g, start, 2 * step, midi(48) * pitch, 0.12, "triangle");
      note(g, start + 2 * step, 2 * step, midi(55) * pitch, 0.12, "triangle");
      return note(g, start + 4 * step, 0.5, midi(60) * pitch, 0.12, "triangle");
    }
  }
}

interface Ambience {
  stop(when: number): void;
  gain: GainNode;
}

/** The crowd murmur: two noise bands, breathing slowly. Starts at gain 0. */
function ambience(g: Graph): Ambience {
  const { ctx } = g;
  const t = ctx.currentTime;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  const level = ctx.createGain();
  level.gain.value = AMBIENCE_LEVEL;
  gain.connect(level);
  level.connect(g.sfx);
  const sources: AudioScheduledSourceNode[] = [];
  for (const [hz, q, rate, offset] of [
    [420, 0.7, 0.13, 0],
    [1100, 1, 0.31, 0.9],
  ] as const) {
    const src = ctx.createBufferSource();
    src.buffer = g.noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = hz;
    filter.Q.value = q;
    const breath = ctx.createGain();
    breath.gain.value = 0.8;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const depth = ctx.createGain();
    depth.gain.value = 0.2;
    lfo.connect(depth);
    depth.connect(breath.gain);
    src.connect(filter);
    filter.connect(breath);
    breath.connect(gain);
    src.start(t, offset);
    lfo.start(t);
    sources.push(src, lfo);
  }
  return {
    gain,
    stop(when) {
      for (const s of sources) s.stop(when);
    },
  };
}

function ramp(g: Graph, param: AudioParam, value: number, seconds: number): void {
  const t = g.ctx.currentTime;
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);
  param.linearRampToValueAtTime(value, t + seconds);
}

export function webAudioBackend(): AudioBackend {
  let g: Graph | null = null;
  let crowd: Ambience | null = null;
  let source: AudioBufferSourceNode | null = null;

  const quiet = (p: Promise<unknown> | undefined) => void p?.catch(() => undefined);

  function stopTrack(): void {
    const src = source;
    source = null;
    if (!src) return;
    src.onended = null;
    try {
      src.stop();
    } catch {
      // Already stopped.
    }
  }

  return {
    start() {
      if (g) return true;
      const Context = contextClass();
      if (!Context) return false;
      try {
        g = build(new Context());
        quiet(g.ctx.resume());
        return true;
      } catch {
        return false;
      }
    },
    wake() {
      if (g?.ctx.state === "suspended") quiet(g.ctx.resume());
    },
    setMasterGain(bus: Bus, gain) {
      if (g) g[bus].gain.value = gain;
    },
    playEffect(id, variant, pitch) {
      if (g) play(g, id, variant, pitch);
    },
    startAmbience() {
      if (g) crowd = ambience(g);
    },
    rampAmbience(gain, seconds) {
      if (g && crowd) ramp(g, crowd.gain.gain, gain, seconds);
    },
    stopAmbience(afterSeconds) {
      if (g && crowd) crowd.stop(g.ctx.currentTime + afterSeconds);
      crowd = null;
    },
    async download(url) {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return res.arrayBuffer();
    },
    decode(data): Promise<TrackData> {
      if (!g) return Promise.reject(new Error("no audio context"));
      return g.ctx.decodeAudioData(data);
    },
    playTrack(track, onEnded) {
      if (!g) return;
      stopTrack();
      g.track.gain.cancelScheduledValues(g.ctx.currentTime);
      g.track.gain.setValueAtTime(1, g.ctx.currentTime);
      const src = g.ctx.createBufferSource();
      src.buffer = track as AudioBuffer;
      src.connect(g.track);
      src.onended = () => {
        if (source !== src) return;
        source = null;
        onEnded();
      };
      source = src;
      src.start();
    },
    rampMusic(gain, seconds) {
      if (g) ramp(g, g.track.gain, gain, seconds);
    },
    stopTrack,
    suspend() {
      quiet(g?.ctx.suspend());
    },
    resume() {
      quiet(g?.ctx.resume());
    },
  };
}
