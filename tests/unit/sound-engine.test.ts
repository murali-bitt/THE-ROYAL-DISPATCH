import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** Just enough of the Web Audio API for the engine to schedule a graph. */
function param() {
  return {
    value: 0,
    setValueAtTime() {},
    linearRampToValueAtTime() {},
    exponentialRampToValueAtTime() {},
    cancelScheduledValues() {},
  };
}
function node(extra: Record<string, unknown> = {}) {
  return { connect: (target: unknown) => target, disconnect() {}, ...extra };
}
class FakeAudioContext {
  state = "running";
  currentTime = 0;
  sampleRate = 100;
  destination = node();
  async resume() {}
  createGain = () => node({ gain: param() });
  createDynamicsCompressor = () => node({ threshold: param(), ratio: param() });
  createConvolver = () => node({ buffer: null });
  createBiquadFilter = () => node({ type: "", frequency: param(), Q: param() });
  createOscillator = () => node({ type: "", frequency: param(), detune: param(), start() {}, stop() {} });
  createBuffer = (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length) });
}

describe("sound engine", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("window", { AudioContext: FakeAudioContext });
    vi.resetModules();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("resolves a transmission when it finishes", async () => {
    const { playAllianceTransmission } = await import("@/lib/audio/sound-engine");
    const done = playAllianceTransmission();
    await vi.advanceTimersByTimeAsync(3000);
    await expect(done).resolves.toEqual({ durationMs: 2900 });
  });

  it("settles an interrupted transmission instead of leaving it pending", async () => {
    const { playAllianceTransmission, playReportSealed } = await import("@/lib/audio/sound-engine");
    let settled = false;
    const transmission = playAllianceTransmission().then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(500);
    await playReportSealed(); // a second sound cuts the first one off
    await vi.advanceTimersByTimeAsync(0);
    await transmission;
    expect(settled).toBe(true);
  });

  it("reports unavailability instead of pretending to play", async () => {
    vi.stubGlobal("window", {});
    const { playAllianceTransmission, SoundUnavailableError } = await import("@/lib/audio/sound-engine");
    await expect(playAllianceTransmission()).rejects.toBeInstanceOf(SoundUnavailableError);
  });
});
