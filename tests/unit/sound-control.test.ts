import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A recording fake of the Web Audio API and HTMLAudioElement: enough for the
 * engine, the ambient soundscape, the Kirmada MP3 channel and the sound switch
 * to build real graphs and control real playback state, so the tests can count
 * what was created, started, stopped and released.
 */
interface FakeSource {
  kind: "oscillator" | "buffer";
  started: boolean;
  stopped: boolean;
  node: { loop?: boolean; connect?: unknown };
}

class FakeAudioElement {
  src: string;
  preload = "none";
  loop = false;
  volume = 1;
  currentTime = 0;
  paused = true;
  plays = 0;
  pauses = 0;
  shouldRejectPlay = false;
  private listeners = new Map<string, Set<() => void>>();

  constructor(src = "") {
    this.src = src;
    log.audioElements.push(this);
  }

  addEventListener(type: string, listener: () => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
  }

  dispatch(type: string) {
    for (const l of this.listeners.get(type) ?? []) l();
  }

  async play() {
    if (this.shouldRejectPlay) {
      this.paused = true;
      throw new Error("NotAllowedError: play() blocked by policy");
    }
    this.paused = false;
    this.plays += 1;
  }

  pause() {
    if (!this.paused) {
      this.paused = true;
    }
    this.pauses += 1;
  }
}

const log = {
  contexts: [] as FakeAudioContext[],
  sources: [] as FakeSource[],
  audioElements: [] as FakeAudioElement[],
  disconnects: 0,
};

function param(initial = 0) {
  return {
    value: initial,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
  };
}
function node(extra: Record<string, unknown> = {}) {
  return {
    connect: (target: unknown) => target,
    disconnect: () => {
      log.disconnects += 1;
    },
    ...extra,
  };
}
function source(kind: FakeSource["kind"], extra: Record<string, unknown>) {
  const record = { kind, started: false, stopped: false } as FakeSource;
  log.sources.push(record);
  record.node = node({
    ...extra,
    onended: null,
    start: () => {
      record.started = true;
    },
    stop: () => {
      record.stopped = true;
    },
  });
  return record.node;
}

class FakeAudioContext {
  state: AudioContextState = "suspended";
  currentTime = 0;
  sampleRate = 100;
  destination = node();
  private listeners: (() => void)[] = [];
  constructor() {
    log.contexts.push(this);
  }
  async resume() {
    this.setState("running");
  }
  async suspend() {
    this.setState("suspended");
  }
  setState(next: AudioContextState) {
    this.state = next;
    for (const l of this.listeners) l();
  }
  addEventListener(_type: string, listener: () => void) {
    this.listeners.push(listener);
  }
  createGain = () => node({ gain: param(1) });
  createDynamicsCompressor = () => node({ threshold: param(), ratio: param() });
  createConvolver = () => node({ buffer: null });
  createBiquadFilter = () => node({ type: "", frequency: param(), Q: param() });
  createOscillator = () => source("oscillator", { type: "", frequency: param(), detune: param() });
  createBufferSource = () => source("buffer", { buffer: null, loop: false });
  createBuffer = (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) });
}

/** The soundscape's wind is the only looping buffer; whooshes are one-shot buffers. */
const loops = () => log.sources.filter((s) => s.kind === "buffer" && s.node.loop);
const whooshes = () => log.sources.filter((s) => s.kind === "buffer" && !s.node.loop && s.started);

describe("ambient soundscape and the global sound switch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    log.contexts = [];
    log.sources = [];
    log.audioElements = [];
    log.disconnects = 0;
    vi.stubGlobal("Audio", FakeAudioElement);
    vi.stubGlobal("window", { AudioContext: FakeAudioContext, Audio: FakeAudioElement });
    vi.stubGlobal("document", { hidden: false, addEventListener() {}, removeEventListener() {} });
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts exactly one soundscape however often it is asked", async () => {
    const { startAmbient, isAmbientPlaying } = await import("@/lib/audio/ambient");
    await Promise.all([startAmbient(), startAmbient()]);
    await startAmbient();
    expect(loops()).toHaveLength(1);
    expect(isAmbientPlaying()).toBe(true);
  });

  it("stopping releases every source, node and timer it created", async () => {
    const { startAmbient, stopAmbient, isAmbientPlaying } = await import("@/lib/audio/ambient");
    await startAmbient();
    await vi.advanceTimersByTimeAsync(20_000); // let the scheduled bells and chord drifts run
    const started = log.sources.filter((s) => s.started && s.kind === "buffer");
    const done = stopAmbient();
    await vi.advanceTimersByTimeAsync(2_000);
    await done;
    expect(isAmbientPlaying()).toBe(false);
    expect(started.every((s) => s.stopped)).toBe(true);
    expect(log.disconnects).toBeGreaterThan(10);
    expect(vi.getTimerCount()).toBe(0); // no stale callbacks left behind
  });

  it("a stop that overtakes a pending start means nothing is built", async () => {
    const { startAmbient, stopAmbient, isAmbientPlaying } = await import("@/lib/audio/ambient");
    const pending = startAmbient();
    void stopAmbient();
    await pending;
    expect(loops()).toHaveLength(0);
    expect(isAmbientPlaying()).toBe(false);
  });

  it("is off at first, creates no audio, and refuses the transmission while off", async () => {
    const control = await import("@/lib/audio/sound-control");
    expect(control.getSound().status).toBe("off");
    await expect(control.playTransmission()).rejects.toBeInstanceOf(control.SoundOffError);
    expect(log.contexts).toHaveLength(0);
  });

  it("switching on reports 'on' only once the soundscape runs; switching off cleans up and suspends", async () => {
    const control = await import("@/lib/audio/sound-control");
    const state = await control.turnSoundOn();
    expect(state.status).toBe("on");
    expect(loops()[0].started).toBe(true);

    control.turnSoundOff();
    expect(control.getSound().status).toBe("off");
    await vi.advanceTimersByTimeAsync(2_000);
    expect(loops()[0].stopped).toBe(true);
    expect(log.contexts[0].state).toBe("suspended");
    expect(control.getSound().status).toBe("off"); // the suspension is not mistaken for a failure
  });

  it("switching off mid-transmission cuts it and settles it as interrupted", async () => {
    const control = await import("@/lib/audio/sound-control");
    await control.turnSoundOn();
    const transmission = control.playTransmission();
    await vi.advanceTimersByTimeAsync(300);
    control.turnSoundOff();
    await expect(transmission).resolves.toEqual({ durationMs: 2900, interrupted: true });
  });

  it("stays off with a message when the browser has no Web Audio", async () => {
    vi.stubGlobal("window", {});
    const control = await import("@/lib/audio/sound-control");
    const state = await control.turnSoundOn();
    expect(state.status).toBe("error");
    expect(state.message).toMatch(/unavailable/i);
  });

  it("says so when the browser pauses audio behind the switch's back", async () => {
    const control = await import("@/lib/audio/sound-control");
    await control.turnSoundOn();
    log.contexts[0].setState("suspended");
    expect(control.getSound().status).toBe("error");
    expect(control.getSound().message).toMatch(/paused/i);
  });

  it("the navigation whoosh is silent and creates no audio while sound is off", async () => {
    const control = await import("@/lib/audio/sound-control");
    control.playNavigationWhoosh();
    await vi.advanceTimersByTimeAsync(500);
    expect(log.contexts).toHaveLength(0);
    expect(whooshes()).toHaveLength(0);
  });

  it("plays one whoosh per navigation while on, folding rapid clicks into one", async () => {
    const control = await import("@/lib/audio/sound-control");
    await control.turnSoundOn();
    control.playNavigationWhoosh();
    control.playNavigationWhoosh();
    control.playNavigationWhoosh();
    await vi.advanceTimersByTimeAsync(10);
    expect(whooshes()).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(300);
    control.playNavigationWhoosh();
    await vi.advanceTimersByTimeAsync(10);
    expect(whooshes()).toHaveLength(2);
    // The soundscape keeps playing underneath.
    expect(loops()[0].stopped).toBe(false);
    expect(control.getSound().status).toBe("on");
  });

  it("a whoosh never cuts off a running Alliance transmission", async () => {
    const control = await import("@/lib/audio/sound-control");
    await control.turnSoundOn();
    const transmission = control.playTransmission();
    await vi.advanceTimersByTimeAsync(400);
    control.playNavigationWhoosh();
    await vi.advanceTimersByTimeAsync(400);
    control.playNavigationWhoosh();
    await vi.advanceTimersByTimeAsync(3000);
    await expect(transmission).resolves.toEqual({ durationMs: 2900 }); // finished, not interrupted
  });

  it("a whoosh that fails to play is swallowed, so navigation is never affected", async () => {
    const control = await import("@/lib/audio/sound-control");
    await control.turnSoundOn();
    log.contexts[0].createBufferSource = () => {
      throw new Error("no buffers today");
    };
    expect(() => control.playNavigationWhoosh()).not.toThrow();
    await vi.advanceTimersByTimeAsync(50);
    expect(control.getSound().status).toBe("on");
  });

  it("switching sound off also silences the interface channel", async () => {
    const control = await import("@/lib/audio/sound-control");
    await control.turnSoundOn();
    control.playNavigationWhoosh();
    await vi.advanceTimersByTimeAsync(10);
    const disconnectsBefore = log.disconnects;
    control.turnSoundOff();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(log.disconnects).toBeGreaterThan(disconnectsBefore);
    control.playNavigationWhoosh();
    await vi.advanceTimersByTimeAsync(300);
    expect(whooshes()).toHaveLength(1); // nothing new while off
  });

  it("Kirmada portrait audio is silent and creates no Audio element while sound is off", async () => {
    const control = await import("@/lib/audio/sound-control");
    const played = await control.playKirmadaHover("portrait-1");
    expect(played).toBe(false);
    expect(log.audioElements).toHaveLength(0);
    expect(control.getKirmadaAudio().status).toBe("idle");
  });

  it("plays /audio/kirmada.mp3 once on hover while sound is on and ignores duplicate hovers on the same portrait", async () => {
    const control = await import("@/lib/audio/sound-control");
    await control.turnSoundOn();
    const first = await control.playKirmadaHover("portrait-hero");
    expect(first).toBe(true);
    expect(log.audioElements).toHaveLength(1);
    const audio = log.audioElements[0];
    expect(audio.src).toBe("/audio/kirmada.mp3");
    expect(audio.loop).toBe(false);
    expect(audio.plays).toBe(1);
    expect(audio.paused).toBe(false);
    expect(control.getKirmadaAudio()).toEqual({ status: "playing", activeOwner: "portrait-hero" });

    // Moving the pointer or focusing within the same portrait does not restart playback
    audio.currentTime = 1.4;
    const second = await control.playKirmadaHover("portrait-hero");
    expect(second).toBe(true);
    expect(audio.plays).toBe(1);
    expect(audio.currentTime).toBe(1.4);
  });

  it("fades out and resets Kirmada audio on leave, then replays from the start on re-entry", async () => {
    const control = await import("@/lib/audio/sound-control");
    await control.turnSoundOn();
    await control.playKirmadaHover("portrait-hero");
    const audio = log.audioElements[0];
    audio.currentTime = 1.8;

    control.stopKirmadaHover("portrait-hero");
    expect(control.getKirmadaAudio().status).toBe("idle");
    await vi.advanceTimersByTimeAsync(250);
    expect(audio.paused).toBe(true);
    expect(audio.currentTime).toBe(0);

    // Re-entering replays from 0 on the same shared Audio element
    const replayed = await control.playKirmadaHover("portrait-hero");
    expect(replayed).toBe(true);
    expect(log.audioElements).toHaveLength(1);
    expect(audio.plays).toBe(2);
    expect(audio.paused).toBe(false);
  });

  it("reuses one shared Audio element across multiple portraits without overlapping", async () => {
    const control = await import("@/lib/audio/sound-control");
    await control.turnSoundOn();
    await control.playKirmadaHover("portrait-a");
    expect(control.getKirmadaAudio().activeOwner).toBe("portrait-a");

    await control.playKirmadaHover("portrait-b");
    expect(log.audioElements).toHaveLength(1);
    expect(control.getKirmadaAudio().activeOwner).toBe("portrait-b");

    // Stale leave from portrait-a does not cut off portrait-b
    control.stopKirmadaHover("portrait-a");
    await vi.advanceTimersByTimeAsync(250);
    expect(control.getKirmadaAudio()).toEqual({ status: "playing", activeOwner: "portrait-b" });
    expect(log.audioElements[0].paused).toBe(false);
  });

  it("turning global sound off immediately cuts Kirmada audio", async () => {
    const control = await import("@/lib/audio/sound-control");
    await control.turnSoundOn();
    await control.playKirmadaHover("portrait-hero");
    const audio = log.audioElements[0];
    audio.currentTime = 2.1;

    control.turnSoundOff();
    expect(audio.paused).toBe(true);
    expect(audio.currentTime).toBe(0);
    expect(control.getKirmadaAudio()).toEqual({ status: "idle", activeOwner: null });
  });

  it("handles rejected play() promises gracefully without crashing or claiming playback", async () => {
    const control = await import("@/lib/audio/sound-control");
    await control.turnSoundOn();
    // Create the element and make its next play() reject
    await control.playKirmadaHover("portrait-hero");
    control.stopKirmadaHover("portrait-hero", true);
    log.audioElements[0].shouldRejectPlay = true;

    const ok = await control.playKirmadaHover("portrait-hero");
    expect(ok).toBe(false);
    expect(control.getKirmadaAudio()).toEqual({ status: "blocked", activeOwner: "portrait-hero" });
  });

  it("Kirmada portrait audio never interrupts a running Alliance transmission", async () => {
    const control = await import("@/lib/audio/sound-control");
    await control.turnSoundOn();
    const transmission = control.playTransmission();
    await vi.advanceTimersByTimeAsync(300);
    await control.playKirmadaHover("portrait-hero");
    await vi.advanceTimersByTimeAsync(200);
    control.stopKirmadaHover("portrait-hero");
    await vi.advanceTimersByTimeAsync(3000);
    await expect(transmission).resolves.toEqual({ durationMs: 2900 });
    expect(loops()).toHaveLength(1); // ambient soundscape was never duplicated
  });
});
