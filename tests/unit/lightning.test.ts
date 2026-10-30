import { describe, expect, it } from "vitest";
import { seeded } from "@/lib/atmosphere/layout";
import { generateBolt, LIGHTNING, nextStrikeDelay, strikeEnvelope } from "@/lib/atmosphere/lightning";

const VIEWPORTS: [number, number][] = [
  [1440, 900],
  [768, 1024],
  [390, 844],
];

describe("lightning geometry", () => {
  it("starts high, ends lower, and stays valid for any seed", () => {
    for (const [w, h] of VIEWPORTS) {
      for (let seed = 1; seed <= 60; seed++) {
        const bolt = generateBolt(w, h, seeded(seed));
        const start = bolt.main[0];
        const end = bolt.main[bolt.main.length - 1];
        // From the top edge, or high on a side edge.
        expect(start[1] <= 0 || start[1] <= h * 0.27, `start ${start}`).toBe(true);
        expect(end[1]).toBeGreaterThan(start[1] + h * 0.4);
        expect(end[1]).toBeGreaterThanOrEqual(h * 0.7);
        expect(end[0]).toBeGreaterThanOrEqual(w * 0.02 - 1e-9);
        expect(end[0]).toBeLessThanOrEqual(w * 0.98 + 1e-9);
        expect(bolt.main.length).toBeGreaterThanOrEqual(9);
        for (const [x, y] of [...bolt.main, ...bolt.branches.flat()]) {
          expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true);
          expect(x).toBeGreaterThan(-w * 0.6);
          expect(x).toBeLessThan(w * 1.6);
        }
        expect(bolt.originX).toBeGreaterThanOrEqual(0);
        expect(bolt.originX).toBeLessThanOrEqual(1);
      }
    }
  });

  it("keeps branches few and attached to the main bolt", () => {
    for (let seed = 1; seed <= 80; seed++) {
      const bolt = generateBolt(1440, 900, seeded(seed));
      expect(bolt.branches.length).toBeLessThanOrEqual(LIGHTNING.maxBranches);
      for (const branch of bolt.branches) {
        expect(bolt.main).toContainEqual(branch[0]);
        expect(branch.length).toBeGreaterThanOrEqual(5);
      }
    }
    // Small screens get thinner storms.
    for (let seed = 1; seed <= 40; seed++) {
      const thin = generateBolt(390, 844, seeded(seed), 0.6);
      expect(thin.branches.length).toBeLessThanOrEqual(2);
    }
  });

  it("never repeats one trajectory: every strike takes its own path and direction", () => {
    const bolts = Array.from({ length: 40 }, (_, i) => generateBolt(1440, 900, seeded(100 + i)));
    const leans = bolts.map((b) => b.main[b.main.length - 1][0] - b.main[0][0]);
    expect(leans.some((d) => d > 200)).toBe(true); // falls to the right
    expect(leans.some((d) => d < -200)).toBe(true); // falls to the left
    expect(leans.some((d) => Math.abs(d) < 150)).toBe(true); // nearly vertical
    const starts = new Set(bolts.map((b) => Math.round(b.main[0][0] / 50)));
    expect(starts.size).toBeGreaterThan(10);
  });

  it("falls steeply instead of running sideways across the page", () => {
    for (let seed = 1; seed <= 120; seed++) {
      const { main } = generateBolt(1440, 900, seeded(seed));
      const [sx, sy] = main[0];
      const [ex, ey] = main[main.length - 1];
      expect(Math.abs(ex - sx), `seed ${seed}`).toBeLessThanOrEqual((ey - sy) * Math.max(LIGHTNING.maxLean, 0.55) + 1);
    }
  });

  it("is deterministic under a seeded random source", () => {
    expect(generateBolt(1440, 900, seeded(7))).toEqual(generateBolt(1440, 900, seeded(7)));
  });
});

describe("lightning timing", () => {
  it("draws every gap fresh from the configured range", () => {
    const rand = seeded(3);
    const gaps = Array.from({ length: 30 }, () => nextStrikeDelay(rand));
    for (const g of gaps) {
      expect(g).toBeGreaterThanOrEqual(LIGHTNING.minInterval);
      expect(g).toBeLessThanOrEqual(LIGHTNING.maxInterval);
    }
    expect(new Set(gaps.map((g) => Math.round(g / 500))).size).toBeGreaterThan(8);
    const first = nextStrikeDelay(seeded(4), true);
    expect(first).toBeGreaterThanOrEqual(LIGHTNING.firstMin);
    expect(first).toBeLessThanOrEqual(LIGHTNING.firstMax);
  });

  it("traces, strikes, dips, fades and dies away", () => {
    expect(strikeEnvelope(-1, true)).toBe(0);
    expect(strikeEnvelope(40, false)).toBeLessThan(0.2); // faint trace
    expect(strikeEnvelope(120, false)).toBe(1); // the strike
    expect(strikeEnvelope(220, false)).toBeLessThan(0.5); // the dip
    expect(strikeEnvelope(260, true)).toBeGreaterThan(strikeEnvelope(260, false)); // one follow-up flicker
    expect(strikeEnvelope(900, true)).toBeLessThan(0.1); // afterglow
    expect(strikeEnvelope(LIGHTNING.life, true)).toBe(0);
    for (let age = 0; age < LIGHTNING.life; age += 10) {
      const k = strikeEnvelope(age, age % 20 === 0);
      expect(k).toBeGreaterThanOrEqual(0);
      expect(k).toBeLessThanOrEqual(1);
    }
    // After the strike the light only ever falls (the single flicker aside).
    for (let age = 300; age < LIGHTNING.life - 10; age += 10) {
      expect(strikeEnvelope(age + 10, true)).toBeLessThanOrEqual(strikeEnvelope(age, true) + 1e-9);
    }
  });
});
