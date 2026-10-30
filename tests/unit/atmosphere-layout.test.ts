import { describe, expect, it } from "vitest";
import { canvasPixelRatio, generateCircuit, particleBudget } from "@/lib/atmosphere/layout";

const VIEWPORTS: [number, number][] = [
  [1440, 900],
  [1280, 800],
  [768, 1024],
  [390, 844],
  [320, 720],
];

describe("haunted background layout", () => {
  it("draws the same circuitry for the same viewport", () => {
    expect(generateCircuit(1440, 900)).toEqual(generateCircuit(1440, 900));
  });

  it("keeps the reading area in the middle of the screen clear of circuitry", () => {
    for (const [w, h] of VIEWPORTS) {
      const { nodes, traces } = generateCircuit(w, h);
      expect(nodes.length, `${w}x${h} nodes`).toBeGreaterThan(4);
      const points = [...nodes.map((n) => [n.x, n.y]), ...traces.flatMap((t) => t.points)];
      for (const [x, y] of points) {
        // Normalised distance inside the ellipse the renderer erases.
        const r2 = ((x - w / 2) / (w * 0.36)) ** 2 + ((y - h / 2) / (h * 0.46)) ** 2;
        expect(r2, `${w}x${h} point ${x.toFixed(0)},${y.toFixed(0)}`).toBeGreaterThan(0.25);
      }
    }
  });

  it("caps particles by viewport and device", () => {
    expect(particleBudget(1440, 900)).toBeLessThanOrEqual(72);
    expect(particleBudget(3840, 2160)).toBe(72);
    expect(particleBudget(3840, 2160, { coarse: true })).toBe(36);
    expect(particleBudget(390, 844, { coarse: true })).toBeGreaterThanOrEqual(14);
    expect(particleBudget(1440, 900, { reduced: true })).toBeLessThan(particleBudget(1440, 900));
  });

  it("clamps the canvas pixel ratio", () => {
    expect(canvasPixelRatio(3, false)).toBe(1.5);
    expect(canvasPixelRatio(3, true)).toBe(1.25);
    expect(canvasPixelRatio(1, false)).toBe(1);
    expect(canvasPixelRatio(0, false)).toBe(1);
  });
});
