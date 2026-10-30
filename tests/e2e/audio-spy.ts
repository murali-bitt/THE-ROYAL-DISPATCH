/**
 * Instruments the Web Audio API and HTMLMediaElement / Audio so the tests can
 * prove that real audio graph nodes and Kirmada MP3 playback are created,
 * started, paused and cleaned up — not just that the UI changed.
 */
export const AUDIO_SPY = () => {
  const w = window as unknown as {
    __audio: {
      contexts: number;
      oscillatorsStarted: number;
      loopsStarted: number;
      loopsStopped: number;
      oneShots: number;
      peak: number;
      context: AudioContext | null;
      kirmadaCreated: number;
      kirmadaPlays: number;
      kirmadaPauses: number;
      kirmadaPlaying: number;
      kirmadaMaxSimultaneous: number;
      kirmadaSrc: string;
      kirmadaElement: HTMLAudioElement | null;
    };
    AudioContext: typeof AudioContext;
    Audio: typeof Audio;
  };
  w.__audio = {
    contexts: 0,
    oscillatorsStarted: 0,
    loopsStarted: 0,
    loopsStopped: 0,
    oneShots: 0,
    peak: 0,
    context: null,
    kirmadaCreated: 0,
    kirmadaPlays: 0,
    kirmadaPauses: 0,
    kirmadaPlaying: 0,
    kirmadaMaxSimultaneous: 0,
    kirmadaSrc: "",
    kirmadaElement: null,
  };
  const Original = w.AudioContext;
  w.AudioContext = class extends Original {
    constructor(...args: ConstructorParameters<typeof AudioContext>) {
      super(...args);
      w.__audio.contexts += 1;
      w.__audio.context = this;
      // Tap everything that reaches the speakers and record the loudest sample.
      const analyser = this.createAnalyser();
      analyser.fftSize = 2048;
      const buffer = new Float32Array(analyser.fftSize);
      const connect = AudioNode.prototype.connect as (this: AudioNode, ...a: unknown[]) => unknown;
      const destination = this.destination;
      AudioNode.prototype.connect = function (this: AudioNode, ...a: unknown[]) {
        if (a[0] === destination && this !== analyser) connect.call(this, analyser);
        return connect.apply(this, a);
      } as typeof AudioNode.prototype.connect;
      const sample = () => {
        analyser.getFloatTimeDomainData(buffer);
        for (const v of buffer) w.__audio.peak = Math.max(w.__audio.peak, Math.abs(v));
        setTimeout(sample, 20);
      };
      sample();
    }
  } as typeof AudioContext;
  const start = OscillatorNode.prototype.start;
  OscillatorNode.prototype.start = function (...args: Parameters<OscillatorNode["start"]>) {
    w.__audio.oscillatorsStarted += 1;
    return start.apply(this, args);
  };
  // The soundscape's wind is the only *looping* buffer source, so loops count soundscapes.
  // One-shot buffer sources are the navigation whoosh.
  const loopStart = AudioBufferSourceNode.prototype.start;
  AudioBufferSourceNode.prototype.start = function (this: AudioBufferSourceNode, ...args: Parameters<AudioBufferSourceNode["start"]>) {
    if (this.loop) w.__audio.loopsStarted += 1;
    else w.__audio.oneShots += 1;
    return loopStart.apply(this, args);
  };
  const loopStop = AudioBufferSourceNode.prototype.stop;
  AudioBufferSourceNode.prototype.stop = function (this: AudioBufferSourceNode, ...args: Parameters<AudioBufferSourceNode["stop"]>) {
    if (this.loop) w.__audio.loopsStopped += 1;
    return loopStop.apply(this, args);
  };

  // Instrument HTMLAudioElement / Audio for Kirmada portrait MP3 playback.
  const OriginalAudio = w.Audio;
  w.Audio = function (...args: ConstructorParameters<typeof Audio>) {
    const el = new OriginalAudio(...args);
    w.__audio.kirmadaCreated += 1;
    w.__audio.kirmadaElement = el;
    w.__audio.kirmadaSrc = el.getAttribute("src") || el.src;
    el.addEventListener("ended", () => {
      if (w.__audio.kirmadaPlaying > 0) w.__audio.kirmadaPlaying -= 1;
    });
    return el;
  } as unknown as typeof Audio;

  const mediaPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function (this: HTMLMediaElement, ...args: Parameters<HTMLMediaElement["play"]>) {
    if ((this.src || "").includes("kirmada.mp3")) {
      w.__audio.kirmadaPlays += 1;
      w.__audio.kirmadaPlaying += 1;
      w.__audio.kirmadaMaxSimultaneous = Math.max(w.__audio.kirmadaMaxSimultaneous, w.__audio.kirmadaPlaying);
      w.__audio.kirmadaSrc = this.src;
    }
    return mediaPlay.apply(this, args);
  };

  const mediaPause = HTMLMediaElement.prototype.pause;
  HTMLMediaElement.prototype.pause = function (this: HTMLMediaElement, ...args: Parameters<HTMLMediaElement["pause"]>) {
    if ((this.src || "").includes("kirmada.mp3")) {
      w.__audio.kirmadaPauses += 1;
      if (w.__audio.kirmadaPlaying > 0) w.__audio.kirmadaPlaying -= 1;
    }
    return mediaPause.apply(this, args);
  };
};

export interface AudioSpy {
  contexts: number;
  oscillatorsStarted: number;
  loopsStarted: number;
  loopsStopped: number;
  oneShots: number;
  peak: number;
  context: AudioContext | null;
  kirmadaCreated: number;
  kirmadaPlays: number;
  kirmadaPauses: number;
  kirmadaPlaying: number;
  kirmadaMaxSimultaneous: number;
  kirmadaSrc: string;
  kirmadaPaused: boolean;
  kirmadaCurrentTime: number;
}
