import { KIRMADA_AUDIO_SRC } from "@/lib/kirmada";

/**
 * Synthesised audio for the Alliance Protocol and report confirmation.
 *
 * All sound is generated with the Web Audio API — no external audio files —
 * except Kirmada's portrait voice clip, which plays the supplied
 * `/audio/kirmada.mp3` asset on its own managed HTMLAudioElement channel.
 *
 * The AudioContext is created and resumed only inside a user-gesture handler,
 * so browsers never block it or log autoplay warnings on page load.
 *
 * Both effects share a single master chain (compressor -> gain -> destination)
 * plus a small generated impulse-response convolver so tones sit in a stone
 * chamber rather than sounding like raw test oscillators.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let reverb: ConvolverNode | null = null;
let currentVoice: GainNode | null = null;
let currentTimer: ReturnType<typeof setTimeout> | null = null;
let settleCurrent: ((interrupted: boolean) => void) | null = null;

/**
 * A separate, lightweight channel for interface feedback (the navigation
 * whoosh). Keeping it off `currentVoice` means clicking through the header
 * never cuts off a running Alliance transmission, while rapid clicks still
 * fold cleanly into one whoosh instead of stacking.
 */
let uiVoice: GainNode | null = null;
let lastWhooshAt = 0;
let whooshNoise: AudioBuffer | null = null;

function getAudioContextConstructor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export function isWebAudioSupported(): boolean {
  return getAudioContextConstructor() !== null;
}

/** Synthesize a dark stereo impulse response: exponentially decaying filtered noise. */
function buildChamberImpulse(context: AudioContext): AudioBuffer {
  const duration = 1.6;
  const length = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(2, length, context.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < length; i += 1) {
      const t = i / length;
      const white = Math.random() * 2 - 1;
      // one-pole lowpass so the tail is dark, not hissy
      last = last * 0.82 + white * 0.18;
      data[i] = last * Math.pow(1 - t, 2.6) * 0.35;
    }
  }
  return buffer;
}

export class SoundUnavailableError extends Error {
  constructor(message = "Audio is unavailable in this browser.") {
    super(message);
    this.name = "SoundUnavailableError";
  }
}

async function ensureContext(): Promise<AudioContext> {
  const Ctor = getAudioContextConstructor();
  if (!Ctor) throw new SoundUnavailableError();
  if (!ctx) {
    try {
      ctx = new Ctor();
    } catch {
      throw new SoundUnavailableError("The browser refused to open an audio channel.");
    }
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.ratio.value = 3;
    master = ctx.createGain();
    master.gain.value = 0.75;
    reverb = ctx.createConvolver();
    reverb.buffer = buildChamberImpulse(ctx);
    const wet = ctx.createGain();
    wet.gain.value = 0.28;

    master.connect(compressor);
    reverb.connect(wet);
    wet.connect(compressor);
    compressor.connect(ctx.destination);
  }
  if (ctx.state !== "running") {
    try {
      await ctx.resume();
    } catch {
      throw new SoundUnavailableError("The browser blocked audio playback.");
    }
  }
  if (ctx.state !== "running") {
    throw new SoundUnavailableError("The audio channel is suspended by the browser.");
  }
  return ctx;
}

/** Shared AudioContext + chamber reverb for the ambient soundscape. */
export async function acquireAudioGraph(): Promise<{
  context: AudioContext;
  master: GainNode;
  reverb: ConvolverNode;
}> {
  const context = await ensureContext();
  return { context, master: master!, reverb: reverb! };
}

/** Cut any playing effect immediately (used when the global sound switch turns off). */
export function stopEffects() {
  if (ctx) {
    silenceCurrent(ctx);
    silenceUi(ctx);
  }
  stopKirmadaClip({ immediate: true });
}

function silenceUi(context: AudioContext) {
  if (!uiVoice) return;
  const voice = uiVoice;
  uiVoice = null;
  const t = context.currentTime;
  voice.gain.cancelScheduledValues(t);
  voice.gain.setValueAtTime(voice.gain.value, t);
  voice.gain.linearRampToValueAtTime(0, t + 0.04);
  setTimeout(() => voice.disconnect(), 80);
}

function getWhooshNoise(context: AudioContext): AudioBuffer {
  if (whooshNoise && whooshNoise.sampleRate === context.sampleRate) return whooshNoise;
  const length = Math.max(1, Math.floor(context.sampleRate * 0.45));
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let pink = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    pink = pink * 0.9 + white * 0.1;
    data[i] = (white * 0.45 + pink * 0.55) * 0.85;
  }
  whooshNoise = buffer;
  return buffer;
}

const WHOOSH_MIN_GAP_MS = 140;

/**
 * A short (~280 ms), restrained rush of dark air for primary navigation:
 * band-passed noise sweeps down a fifth while a soft low undertone grounds it.
 * Resolves `false` if rapid clicks were folded into a whoosh already playing.
 */
export async function playWhoosh(): Promise<boolean> {
  const now = Date.now();
  if (now - lastWhooshAt < WHOOSH_MIN_GAP_MS) return false;
  lastWhooshAt = now;

  const context = await ensureContext();
  silenceUi(context);

  const voice = context.createGain();
  voice.gain.value = 0.24; // noticeably quieter than the transmission or chime
  voice.connect(master!);
  const reverbSend = context.createGain();
  reverbSend.gain.value = 0.22;
  voice.connect(reverbSend).connect(reverb!);
  uiVoice = voice;

  const t = context.currentTime + 0.005;
  const duration = 0.28;
  const end = t + duration;

  // 1. Filtered air — a resonant bandpass sweeping from mid-high to low-mid.
  const air = context.createBufferSource();
  air.buffer = getWhooshNoise(context);
  const band = context.createBiquadFilter();
  band.type = "bandpass";
  band.Q.setValueAtTime(2.6, t);
  band.Q.linearRampToValueAtTime(1.4, end);
  band.frequency.setValueAtTime(920, t);
  band.frequency.exponentialRampToValueAtTime(190, end);
  const airEnv = envelope(context, voice, t, 0.045, 0.9, duration - 0.045);
  air.connect(band).connect(airEnv);

  // 2. A faint high silk edge at the very start so the gesture feels crisp.
  const high = context.createBiquadFilter();
  high.type = "highpass";
  high.frequency.value = 5200;
  const shimmer = envelope(context, voice, t + 0.05, 0.03, 0.06, 0.12);
  air.connect(high).connect(shimmer);
  air.start(t);
  air.stop(end + 0.05);

  // 3. A low undertone that sinks as the gust passes.
  const under = context.createOscillator();
  under.type = "sine";
  under.frequency.setValueAtTime(74, t);
  under.frequency.exponentialRampToValueAtTime(46, end);
  under.connect(envelope(context, voice, t, 0.05, 0.12, 0.27));
  under.start(t);
  under.stop(end + 0.05);

  air.onended = () => {
    air.disconnect();
    under.disconnect();
    if (uiVoice === voice) uiVoice = null;
    setTimeout(() => voice.disconnect(), 400); // let the reverb tail ring out
  };
  return true;
}

/** Put the context to sleep once nothing needs it; the next play call resumes it. */
export function suspendAudio() {
  if (ctx && ctx.state === "running") void ctx.suspend().catch(() => undefined);
}

/** Fade out and release whatever is currently sounding. */
function silenceCurrent(context: AudioContext) {
  if (currentTimer) clearTimeout(currentTimer);
  currentTimer = null;
  // Never leave a caller awaiting a sound that has been cut off.
  const settle = settleCurrent;
  settleCurrent = null;
  settle?.(true);
  if (!currentVoice) return;
  const voice = currentVoice;
  const t = context.currentTime;
  voice.gain.cancelScheduledValues(t);
  voice.gain.setValueAtTime(voice.gain.value, t);
  voice.gain.linearRampToValueAtTime(0, t + 0.06);
  setTimeout(() => voice.disconnect(), 120);
  currentVoice = null;
}

function newVoice(context: AudioContext) {
  silenceCurrent(context);
  const voice = context.createGain();
  voice.gain.value = 1;
  voice.connect(master!);
  voice.connect(reverb!);
  currentVoice = voice;
  return voice;
}

function envelope(context: AudioContext, destination: AudioNode, start: number, attack: number, peak: number, release: number) {
  const g = context.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + attack + release);
  g.connect(destination);
  return g;
}

function tone(
  context: AudioContext,
  destination: AudioNode,
  { type = "sine", freq, start, attack, peak, release, detune = 0 }: {
    type?: OscillatorType;
    freq: number;
    start: number;
    attack: number;
    peak: number;
    release: number;
    detune?: number;
  },
) {
  const osc = context.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  osc.detune.value = detune;
  osc.connect(envelope(context, destination, start, attack, peak, release));
  osc.start(start);
  osc.stop(start + attack + release + 0.05);
  return osc;
}

/** A struck bell: inharmonic partials with staggered decays. */
function chime(context: AudioContext, destination: AudioNode, base: number, start: number, level: number) {
  const partials: [number, number, number][] = [
    [1, 1, 1.9],
    [2.76, 0.42, 1.2],
    [5.4, 0.22, 0.7],
    [8.93, 0.1, 0.4],
  ];
  for (const [ratio, gain, decay] of partials) {
    tone(context, destination, { freq: base * ratio, start, attack: 0.004, peak: level * gain, release: decay });
  }
}

/**
 * The Alliance Protocol transmission (~2.8 s): a low ward-resonance swells,
 * a descending signal sweep cuts through it, three relay pips answer, and a
 * metallic chime seals the message.
 * Resolves when playback has finished, or early with `interrupted: true` when
 * another sound or stopEffects() cut it off.
 */
export async function playAllianceTransmission(): Promise<{ durationMs: number; interrupted?: true }> {
  const context = await ensureContext();
  const voice = newVoice(context);
  const t = context.currentTime + 0.03;

  // 1. Ward resonance — a perfect fifth, slightly detuned, under a lowpass.
  const low = context.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.setValueAtTime(220, t);
  low.frequency.linearRampToValueAtTime(520, t + 1.2);
  low.connect(voice);
  tone(context, low, { freq: 55, start: t, attack: 0.5, peak: 0.55, release: 2.2 });
  tone(context, low, { freq: 82.4, start: t, attack: 0.6, peak: 0.3, release: 2.0, detune: -6 });
  tone(context, low, { type: "triangle", freq: 110, start: t + 0.05, attack: 0.7, peak: 0.12, release: 1.6, detune: 7 });

  // 2. Signal sweep — a descending, band-passed transmission tone.
  const band = context.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 6;
  band.frequency.setValueAtTime(1800, t + 0.1);
  band.frequency.exponentialRampToValueAtTime(420, t + 0.95);
  band.connect(voice);
  const sweep = context.createOscillator();
  sweep.type = "sawtooth";
  sweep.frequency.setValueAtTime(1500, t + 0.1);
  sweep.frequency.exponentialRampToValueAtTime(260, t + 0.95);
  sweep.connect(envelope(context, band, t + 0.1, 0.08, 0.16, 0.85));
  sweep.start(t + 0.1);
  sweep.stop(t + 1.1);

  // 3. Relay pips — three villages answering the Crown, rising.
  [0, 1, 2].forEach((i) => {
    tone(context, voice, { freq: 1046.5 * Math.pow(1.122, i), start: t + 1.0 + i * 0.14, attack: 0.006, peak: 0.07, release: 0.09 });
  });

  // 4. The seal — a restrained metallic chime and its octave ghost.
  chime(context, voice, 659.25, t + 1.5, 0.22);
  chime(context, voice, 329.6, t + 1.52, 0.08);

  const durationMs = 2900;
  const interrupted = await new Promise<boolean>((resolve) => {
    settleCurrent = resolve;
    currentTimer = setTimeout(() => {
      settleCurrent = null;
      currentTimer = null;
      resolve(false);
    }, durationMs);
  });
  if (currentVoice === voice) currentVoice = null;
  setTimeout(() => voice.disconnect(), 1600);
  return interrupted ? { durationMs, interrupted: true } : { durationMs };
}

/** A brief two-note confirmation (~0.7 s) for a successfully sealed report. */
export async function playReportSealed(): Promise<void> {
  const context = await ensureContext();
  const voice = newVoice(context);
  const t = context.currentTime + 0.02;
  tone(context, voice, { freq: 98, start: t, attack: 0.02, peak: 0.25, release: 0.6 });
  chime(context, voice, 523.25, t, 0.12);
  chime(context, voice, 783.99, t + 0.16, 0.1);
  setTimeout(() => {
    if (currentVoice === voice) currentVoice = null;
    voice.disconnect();
  }, 2200);
}

/* ------------------------------------------------------------------ */
/* Kirmada portrait voice channel — supplied MP3 (/audio/kirmada.mp3) */
/* Independent from `currentVoice` and `uiVoice`: hovering Kirmada     */
/* never interrupts the Alliance transmission or navigation whoosh,   */
/* and at most one shared HTMLAudioElement ever exists or plays.      */
/* ------------------------------------------------------------------ */

export const KIRMADA_VOLUME = 0.78;
export const KIRMADA_FADE_MS = 220;
const KIRMADA_FADE_STEPS = 5;

export type KirmadaVoiceStatus = "idle" | "playing" | "blocked";
export interface KirmadaVoiceState {
  status: KirmadaVoiceStatus;
  activeOwner: string | null;
}

export const KIRMADA_IDLE: KirmadaVoiceState = { status: "idle", activeOwner: null };

let kirmadaElement: HTMLAudioElement | null = null;
let kirmadaOwner: string | null = null;
let kirmadaActive = false;
let kirmadaFadeTimer: ReturnType<typeof setTimeout> | null = null;
let kirmadaTicket = 0;
let kirmadaState: KirmadaVoiceState = KIRMADA_IDLE;
const kirmadaListeners = new Set<() => void>();

function setKirmadaState(next: KirmadaVoiceState) {
  if (kirmadaState.status === next.status && kirmadaState.activeOwner === next.activeOwner) return;
  kirmadaState = next.status === "idle" && next.activeOwner === null ? KIRMADA_IDLE : next;
  for (const listener of kirmadaListeners) listener();
}

export function getKirmadaVoiceState(): KirmadaVoiceState {
  return kirmadaState;
}

export function subscribeKirmadaVoice(listener: () => void): () => void {
  kirmadaListeners.add(listener);
  return () => {
    kirmadaListeners.delete(listener);
  };
}

function clearKirmadaFade() {
  if (kirmadaFadeTimer !== null) {
    clearTimeout(kirmadaFadeTimer);
    kirmadaFadeTimer = null;
  }
}

function getAudioElementCtor(): typeof Audio | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { Audio?: typeof Audio };
  return w.Audio ?? (typeof Audio !== "undefined" ? Audio : null);
}

function ensureKirmadaElement(): HTMLAudioElement {
  if (kirmadaElement) return kirmadaElement;
  const AudioCtor = getAudioElementCtor();
  if (!AudioCtor) throw new SoundUnavailableError();
  const audio = new AudioCtor(KIRMADA_AUDIO_SRC);
  audio.preload = "auto";
  audio.loop = false;
  audio.volume = KIRMADA_VOLUME;
  audio.addEventListener("ended", () => {
    clearKirmadaFade();
    setKirmadaState({ status: "idle", activeOwner: kirmadaOwner });
  });
  kirmadaElement = audio;
  return audio;
}

/**
 * Play Kirmada's supplied MP3 from the beginning once (`loop = false`) for an
 * intentional portrait interaction. While `ownerId` remains active, repeated
 * pointer movement or focus events on the same portrait do not restart it.
 */
export async function playKirmadaClip(ownerId = "default"): Promise<boolean> {
  if (kirmadaActive && kirmadaOwner === ownerId) {
    return kirmadaState.status === "playing";
  }
  const ticket = ++kirmadaTicket;
  clearKirmadaFade();
  let audio: HTMLAudioElement;
  try {
    audio = ensureKirmadaElement();
  } catch {
    kirmadaActive = false;
    kirmadaOwner = null;
    setKirmadaState({ status: "blocked", activeOwner: ownerId });
    return false;
  }

  kirmadaOwner = ownerId;
  kirmadaActive = true;
  if (!audio.paused) {
    try {
      audio.pause();
    } catch {
      // ignore
    }
  }
  audio.loop = false;
  audio.volume = KIRMADA_VOLUME;
  try {
    audio.currentTime = 0;
  } catch {
    // ignore if media metadata has not loaded yet
  }
  setKirmadaState({ status: "playing", activeOwner: ownerId });

  try {
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      await playPromise;
    }
    if (ticket !== kirmadaTicket || !kirmadaActive) {
      try {
        if (!audio.paused) audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
      audio.volume = KIRMADA_VOLUME;
      setKirmadaState(KIRMADA_IDLE);
      return false;
    }
    return true;
  } catch {
    if (ticket === kirmadaTicket) {
      kirmadaActive = false;
      kirmadaOwner = null;
      setKirmadaState({ status: "blocked", activeOwner: ownerId });
    }
    return false;
  }
}

/**
 * Stop Kirmada's MP3. On pointer leave or blur (`immediate = false`), gently
 * fades out over `KIRMADA_FADE_MS` before pausing and resetting to 0. On
 * global mute (`immediate = true`), pauses and resets immediately.
 */
export function stopKirmadaClip(options: { ownerId?: string; immediate?: boolean } = {}): void {
  const { ownerId, immediate = false } = options;
  if (!immediate && ownerId && kirmadaOwner !== null && kirmadaOwner !== ownerId) {
    return;
  }
  if (!immediate && !kirmadaActive) {
    return;
  }
  const ticket = ++kirmadaTicket;
  kirmadaActive = false;
  kirmadaOwner = null;
  clearKirmadaFade();
  setKirmadaState(KIRMADA_IDLE);
  const audio = kirmadaElement;
  if (!audio) {
    return;
  }
  if (immediate || audio.paused) {
    try {
      if (!audio.paused) audio.pause();
      audio.currentTime = 0;
    } catch {
      // ignore
    }
    audio.volume = KIRMADA_VOLUME;
    return;
  }

  const startVolume = audio.volume > 0 ? audio.volume : KIRMADA_VOLUME;
  const stepMs = Math.max(16, Math.floor(KIRMADA_FADE_MS / KIRMADA_FADE_STEPS));
  let step = 0;
  const tick = () => {
    if (ticket !== kirmadaTicket) return;
    step += 1;
    if (step >= KIRMADA_FADE_STEPS || audio.paused) {
      kirmadaFadeTimer = null;
      try {
        if (!audio.paused) audio.pause();
        audio.currentTime = 0;
      } catch {
        // ignore
      }
      audio.volume = KIRMADA_VOLUME;
      return;
    }
    audio.volume = Math.max(0, startVolume * (1 - step / KIRMADA_FADE_STEPS));
    kirmadaFadeTimer = setTimeout(tick, stepMs);
  };
  kirmadaFadeTimer = setTimeout(tick, stepMs);
}
