/**
 * THE HAUNTED CROWN — an original ambient soundscape for an abandoned kingdom,
 * synthesised live with the Web Audio API. No audio files, nothing copyrighted.
 *
 * Layers (all deliberately quiet, with a hard level ceiling):
 *  - a low ward drone (a detuned fifth under a slowly breathing lowpass),
 *  - distant wind (looped pink noise through a wandering band-pass),
 *  - a faint spectral tone that drifts between eerie intervals,
 *  - sparse, far-off metallic bells, heavily reverberated.
 *
 * Ownership: there is at most one live session. startAmbient() is idempotent
 * while one plays; stopAmbient() fades it out, then stops and disconnects every
 * node it created and clears every timer it scheduled. A session that is fading
 * out never touches a newer one, and a start that is overtaken by a stop never
 * builds a graph.
 */

import { acquireAudioGraph } from "@/lib/audio/sound-engine";

/** Ceiling for the whole soundscape before the shared master and compressor. */
export const AMBIENT_LEVEL = 0.55;
const FADE_IN_S = 3.5;
const DUCKED = 0.3;

interface Session {
  context: AudioContext;
  dryOut: GainNode;
  wetOut: GainNode;
  sources: AudioScheduledSourceNode[];
  nodes: AudioNode[];
  timers: Set<ReturnType<typeof setTimeout>>;
  hidden: boolean;
  ducked: boolean;
  duckTimer: ReturnType<typeof setTimeout> | null;
  onVisibility: () => void;
}

let session: Session | null = null;
let generation = 0;
let noise: { context: AudioContext; buffer: AudioBuffer } | null = null;

export function isAmbientPlaying() {
  return session !== null;
}

/* ---------------------------------------------------------------- helpers */

function gain(s: Session, value: number) {
  const g = s.context.createGain();
  g.gain.value = value;
  s.nodes.push(g);
  return g;
}

function filter(s: Session, type: BiquadFilterType, frequency: number, q = 0.7) {
  const f = s.context.createBiquadFilter();
  f.type = type;
  f.frequency.value = frequency;
  f.Q.value = q;
  s.nodes.push(f);
  return f;
}

function oscillator(s: Session, type: OscillatorType, frequency: number, detune = 0) {
  const o = s.context.createOscillator();
  o.type = type;
  o.frequency.value = frequency;
  o.detune.value = detune;
  s.sources.push(o);
  s.nodes.push(o);
  return o;
}

/** A slow sine LFO added onto an AudioParam. Depth must stay below the param's base. */
function lfo(s: Session, rate: number, depth: number, target: AudioParam) {
  const o = oscillator(s, "sine", rate);
  o.connect(gain(s, depth)).connect(target);
  o.start();
}

function later(s: Session, ms: number, fn: () => void) {
  const id = setTimeout(() => {
    s.timers.delete(id);
    if (session === s) fn();
  }, ms);
  s.timers.add(id);
}

/** Pink noise (Paul Kellet's economy filter), cached per context. */
function noiseBuffer(context: AudioContext) {
  if (noise?.context === context) return noise.buffer;
  const length = Math.floor(context.sampleRate * 6);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel);
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.963 * b1 + white * 0.2965164;
      b2 = 0.57 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.11;
    }
  }
  noise = { context, buffer };
  return buffer;
}

function level(s: Session) {
  if (s.hidden) return 0;
  return s.ducked ? AMBIENT_LEVEL * DUCKED : AMBIENT_LEVEL;
}

function rampTo(s: Session, to: number, seconds: number) {
  const t = s.context.currentTime;
  for (const g of [s.dryOut, s.wetOut]) {
    g.gain.cancelScheduledValues(t);
    g.gain.setValueAtTime(g.gain.value, t);
    g.gain.linearRampToValueAtTime(to, t + seconds);
  }
}

/* ----------------------------------------------------------------- layers */

function drone(s: Session) {
  const lowpass = filter(s, "lowpass", 360, 0.6);
  const body = gain(s, 1);
  lowpass.connect(body).connect(s.dryOut);
  body.connect(gain(s, 0.25)).connect(s.wetOut);
  const voices: [OscillatorType, number, number, number][] = [
    ["sine", 73.42, 0.085, 0], // D2
    ["sine", 110, 0.05, 4], // A2, slightly sharp
    ["triangle", 146.83, 0.022, -5], // D3, slightly flat
  ];
  for (const [type, frequency, amount, detune] of voices) {
    const o = oscillator(s, type, frequency, detune);
    o.connect(gain(s, amount)).connect(lowpass);
    o.start();
  }
  lfo(s, 0.021, 140, lowpass.frequency); // the drone "breathes" over ~48 s
  lfo(s, 0.047, 0.22, body.gain);
}

function wind(s: Session) {
  const source = s.context.createBufferSource();
  source.buffer = noiseBuffer(s.context);
  source.loop = true;
  s.sources.push(source);
  s.nodes.push(source);
  const band = filter(s, "bandpass", 520, 0.8);
  const high = filter(s, "highpass", 160);
  const gust = gain(s, 0.045);
  source.connect(band).connect(high).connect(gust);
  gust.connect(s.dryOut);
  gust.connect(gain(s, 0.5)).connect(s.wetOut);
  lfo(s, 0.06, 260, band.frequency);
  lfo(s, 0.11, 0.025, gust.gain);
  source.start();
}

/** Intervals the spectral tone drifts between: open fifth, minor sixth, tritone, fourth. */
const SPECTRAL_CHORDS: [number, number][] = [
  [293.66, 440],
  [293.66, 466.16],
  [277.18, 392],
  [261.63, 349.23],
];

function spectral(s: Session) {
  const pad = gain(s, 0);
  pad.connect(gain(s, 0.35)).connect(s.dryOut);
  pad.connect(gain(s, 0.9)).connect(s.wetOut);
  const t = s.context.currentTime;
  pad.gain.setValueAtTime(0, t);
  pad.gain.linearRampToValueAtTime(1, t + 14); // emerges long after the drone
  const voices = SPECTRAL_CHORDS[0].map((frequency, i) => {
    const o = oscillator(s, "sine", frequency, i === 0 ? 3 : -3);
    const g = gain(s, i === 0 ? 0.008 : 0.006);
    o.connect(g).connect(pad);
    lfo(s, 0.13 + i * 0.07, 0.003, g.gain);
    o.start();
    return o;
  });
  let chord = 0;
  const drift = () => {
    chord = (chord + 1) % SPECTRAL_CHORDS.length;
    const now = s.context.currentTime;
    voices.forEach((o, i) => {
      o.frequency.cancelScheduledValues(now);
      o.frequency.setValueAtTime(o.frequency.value, now);
      o.frequency.exponentialRampToValueAtTime(SPECTRAL_CHORDS[chord][i], now + 7);
    });
    later(s, 18_000, drift);
  };
  later(s, 18_000, drift);
}

const BELL_PARTIALS: [number, number, number][] = [
  [1, 1, 4.2],
  [2.76, 0.4, 2.6],
  [5.4, 0.18, 1.4],
  [8.93, 0.08, 0.8],
];

function bells(s: Session) {
  const bus = gain(s, 1);
  bus.connect(gain(s, 0.3)).connect(s.dryOut);
  bus.connect(s.wetOut);
  const toll = () => {
    const t = s.context.currentTime + 0.05;
    const base = [196, 233.08, 261.63, 293.66][Math.floor(Math.random() * 4)];
    const amount = 0.018 + Math.random() * 0.012;
    for (const [ratio, weight, decay] of BELL_PARTIALS) {
      // Short-lived voices: they stop themselves and are released on "ended".
      const o = s.context.createOscillator();
      const g = s.context.createGain();
      o.frequency.value = base * ratio;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(amount * weight, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      o.connect(g).connect(bus);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
      o.start(t);
      o.stop(t + decay + 0.1);
    }
    later(s, 11_000 + Math.random() * 8_000, toll);
  };
  later(s, 7_000 + Math.random() * 3_000, toll);
}

/* -------------------------------------------------------------- lifecycle */

/**
 * Starts the soundscape (must be called from a user gesture, which is when the
 * shared AudioContext may be resumed). Resolves with the running context.
 * Throws SoundUnavailableError if the browser refuses audio.
 */
export async function startAmbient(): Promise<AudioContext> {
  const ticket = ++generation;
  const { context, master, reverb } = await acquireAudioGraph();
  if (ticket !== generation || session) return context; // overtaken by stop() or another start

  const dryOut = context.createGain();
  const wetOut = context.createGain();
  dryOut.gain.value = 0;
  wetOut.gain.value = 0;
  dryOut.connect(master);
  wetOut.connect(reverb);

  const s: Session = {
    context,
    dryOut,
    wetOut,
    sources: [],
    nodes: [dryOut, wetOut],
    timers: new Set(),
    hidden: typeof document !== "undefined" && document.hidden,
    ducked: false,
    duckTimer: null,
    onVisibility: () => {
      s.hidden = document.hidden;
      rampTo(s, level(s), s.hidden ? 0.6 : 1.5);
    },
  };
  session = s;
  drone(s);
  wind(s);
  spectral(s);
  bells(s);
  document.addEventListener("visibilitychange", s.onVisibility);
  rampTo(s, level(s), FADE_IN_S);
  return context;
}

/** Fades the soundscape out, then releases every node and timer. Resolves once released. */
export function stopAmbient(fadeSeconds = 1.6): Promise<void> {
  generation++;
  const s = session;
  if (!s) return Promise.resolve();
  session = null;
  document.removeEventListener("visibilitychange", s.onVisibility);
  for (const id of s.timers) clearTimeout(id);
  s.timers.clear();
  if (s.duckTimer) clearTimeout(s.duckTimer);
  rampTo(s, 0, fadeSeconds);
  return new Promise((resolve) => {
    setTimeout(() => {
      for (const source of s.sources) {
        try {
          source.stop();
        } catch {
          // already stopped
        }
      }
      for (const node of s.nodes) node.disconnect();
      resolve();
    }, fadeSeconds * 1000 + 120);
  });
}

/** Lowers the soundscape while a one-shot effect plays, then restores it. */
export function duckAmbient(ms: number) {
  const s = session;
  if (!s) return;
  s.ducked = true;
  rampTo(s, level(s), 0.25);
  if (s.duckTimer) clearTimeout(s.duckTimer);
  s.duckTimer = setTimeout(() => {
    s.duckTimer = null;
    if (session !== s) return;
    s.ducked = false;
    rampTo(s, level(s), 1.8);
  }, ms);
}
