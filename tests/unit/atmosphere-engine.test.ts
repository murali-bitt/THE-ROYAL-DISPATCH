import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LIGHTNING } from "@/lib/atmosphere/lightning";

/**
 * Drives the real background engine against a minimal fake DOM, with the
 * animation frame stepped by hand, to prove its lifecycle: one loop, at most
 * one bolt, pausing while hidden, nothing animated under reduced motion, and a
 * cleanup that leaves no listener or frame behind.
 */

function fakeContext() {
  const store: Record<string | symbol, unknown> = {};
  return new Proxy(store, {
    get(target, prop) {
      if (prop in target) return target[prop];
      return () => ({ addColorStop() {} });
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

function fakeCanvas() {
  return { width: 0, height: 0, style: {} as Record<string, string>, getContext: () => fakeContext() };
}

interface Env {
  frames: Map<number, (t: number) => void>;
  listeners: Map<string, number>;
  docListeners: Map<string, (() => void)[]>;
  now: number;
  reduced: boolean;
  root: { style: { setProperty: (k: string, v: string) => void }; dataset: Record<string, string> };
  vars: Map<string, string>;
  step: (ms: number) => void;
}

function install(reduced = false): Env {
  const env = {
    frames: new Map(),
    listeners: new Map(),
    docListeners: new Map(),
    now: 0,
    reduced,
    vars: new Map(),
  } as unknown as Env;
  let id = 0;
  const count = (name: string, delta: number) => env.listeners.set(name, (env.listeners.get(name) ?? 0) + delta);
  const media = (query: string) => ({
    matches: query.includes("reduce") ? env.reduced : true,
    addEventListener: () => count(`media:${query}`, 1),
    removeEventListener: () => count(`media:${query}`, -1),
  });
  vi.stubGlobal("window", {
    innerWidth: 1440,
    innerHeight: 900,
    devicePixelRatio: 2,
    scrollY: 0,
    matchMedia: media,
    requestAnimationFrame: (cb: (t: number) => void) => {
      env.frames.set(++id, cb);
      return id;
    },
    cancelAnimationFrame: (handle: number) => env.frames.delete(handle),
    addEventListener: (name: string) => count(name, 1),
    removeEventListener: (name: string) => count(name, -1),
  });
  vi.stubGlobal("document", {
    hidden: false,
    createElement: () => fakeCanvas(),
    addEventListener: (name: string, fn: () => void) => {
      count(`doc:${name}`, 1);
      env.docListeners.set(name, [...(env.docListeners.get(name) ?? []), fn]);
    },
    removeEventListener: (name: string) => count(`doc:${name}`, -1),
  });
  vi.spyOn(performance, "now").mockImplementation(() => env.now);
  env.root = { style: { setProperty: (k, v) => env.vars.set(k, v) }, dataset: {} };
  env.step = (ms: number) => {
    const end = env.now + ms;
    while (env.now < end) {
      env.now += 16;
      const pending = [...env.frames.entries()];
      env.frames.clear();
      for (const [, cb] of pending) cb(env.now);
    }
  };
  return env;
}

async function start(env: Env) {
  const { startAtmosphere } = await import("@/lib/atmosphere/engine");
  return startAtmosphere({
    root: env.root as unknown as HTMLElement,
    circuit: fakeCanvas() as unknown as HTMLCanvasElement,
    fx: fakeCanvas() as unknown as HTMLCanvasElement,
  });
}

describe("background engine lifecycle", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("runs one loop, strikes one bolt at a time at random intervals", async () => {
    const env = install();
    const cleanup = await start(env);
    expect(env.root.dataset.atmosphere).toBe("running");
    env.step(16); // the one-shot frame that publishes the initial scroll position has run
    expect(env.frames.size).toBe(1); // only the loop remains

    const strikeTimes: number[] = [];
    let seen = 0;
    for (let i = 0; i < 4_000; i++) {
      env.step(16);
      expect(env.frames.size).toBeLessThanOrEqual(1); // never more than one pending frame
      const n = Number(env.root.dataset.strikes ?? 0);
      if (n > seen) {
        expect(n).toBe(seen + 1); // strikes arrive one at a time
        seen = n;
        strikeTimes.push(env.now);
      }
    }
    expect(strikeTimes.length).toBeGreaterThanOrEqual(2);
    expect(strikeTimes[0]).toBeGreaterThanOrEqual(LIGHTNING.firstMin);
    expect(strikeTimes[0]).toBeLessThanOrEqual(LIGHTNING.firstMax + 32);
    for (let i = 1; i < strikeTimes.length; i++) {
      // A bolt lives out its life, then a fresh gap is drawn: no overlap, no pile-up.
      expect(strikeTimes[i] - strikeTimes[i - 1]).toBeGreaterThanOrEqual(LIGHTNING.life + LIGHTNING.minInterval);
      expect(strikeTimes[i] - strikeTimes[i - 1]).toBeLessThanOrEqual(LIGHTNING.life + LIGHTNING.maxInterval + 64);
    }
    // The sky glow peaks below its configured ceiling and returns to zero.
    expect(Number(env.vars.get("--flash"))).toBeLessThanOrEqual(LIGHTNING.skyFlash);
    cleanup();
  });

  it("pauses while hidden, owes no strikes on return, and resumes cleanly", async () => {
    const env = install();
    const cleanup = await start(env);
    env.step(1_000);
    (document as unknown as { hidden: boolean }).hidden = true;
    for (const fn of env.docListeners.get("visibilitychange") ?? []) fn();
    expect(env.root.dataset.atmosphere).toBe("paused");
    expect(env.frames.size).toBe(0);
    expect(env.vars.get("--flash")).toBe("0");

    env.now += 120_000; // a long time away: many strike gaps elapse
    (document as unknown as { hidden: boolean }).hidden = false;
    for (const fn of env.docListeners.get("visibilitychange") ?? []) fn();
    expect(env.root.dataset.atmosphere).toBe("running");
    const before = Number(env.root.dataset.strikes ?? 0);
    env.step(LIGHTNING.firstMin - 100);
    expect(Number(env.root.dataset.strikes ?? 0)).toBe(before); // no burst of owed strikes
    cleanup();
  });

  it("renders a still scene with no lightning under reduced motion", async () => {
    const env = install(true);
    const cleanup = await start(env);
    expect(env.root.dataset.atmosphere).toBe("static");
    env.step(16); // the one-shot scroll frame runs; no loop follows it
    expect(env.frames.size).toBe(0);
    env.step(30_000);
    expect(env.root.dataset.strikes).toBeUndefined();
    cleanup();
  });

  it("cleanup removes every listener and the pending frame", async () => {
    const env = install();
    const cleanup = await start(env);
    env.step(500);
    expect([...env.listeners.values()].some((n) => n > 0)).toBe(true);
    cleanup();
    expect(env.frames.size).toBe(0);
    for (const [name, n] of env.listeners) expect(n, name).toBe(0);
    env.step(20_000);
    expect(env.frames.size).toBe(0);
  });
});
