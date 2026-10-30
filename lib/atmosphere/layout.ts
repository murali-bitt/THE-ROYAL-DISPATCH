/**
 * Pure layout for the haunted background: where the occult circuit traces run,
 * and how many particles a viewport may carry. Deterministic for a given size
 * and seed, so the same window always shows the same "machinery".
 *
 * Traces live in bands along the left, right and bottom edges; the centre of
 * the viewport — where content is read — is left clear.
 */

export type Point = [number, number];

export interface CircuitTrace {
  points: Point[];
  width: number;
}

export type NodeKind = "pad" | "via" | "rune" | "terminal";

export interface CircuitNode {
  x: number;
  y: number;
  kind: NodeKind;
  r: number;
}

export interface Circuit {
  traces: CircuitTrace[];
  nodes: CircuitNode[];
  /** Measurement rails with tick marks, drawn alongside the bands. */
  rails: { from: Point; to: Point }[];
  band: { x: number; y: number };
}

/** Small, fast, seedable PRNG (mulberry32). */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * One bus of parallel traces entering from an edge. Built in a local frame
 * (entering along +x from x = 0) and then mapped onto the chosen edge.
 */
function bus(rand: () => number, depth: number, along: number, lanes: number, spacing: number) {
  const run1 = depth * (0.22 + rand() * 0.3);
  const bend = (rand() < 0.5 ? -1 : 1) * (14 + rand() * 40);
  const traces: Point[][] = [];
  const ends: Point[] = [];
  for (let k = 0; k < lanes; k++) {
    const offset = along + k * spacing;
    const reach = depth * (0.62 + rand() * 0.34) - k * spacing * 1.3;
    const bendStart = run1 + k * spacing * 0.4;
    const points: Point[] = [
      [-6, offset],
      [bendStart, offset],
      [bendStart + Math.abs(bend), offset + bend],
      [Math.max(bendStart + Math.abs(bend) + 8, reach), offset + bend],
    ];
    traces.push(points);
    ends.push(points[points.length - 1]);
  }
  return { traces, ends };
}

export function generateCircuit(width: number, height: number, seed = 1304): Circuit {
  const rand = seeded(seed + Math.round(width / 40) * 7 + Math.round(height / 40));
  const bandX = clamp(width * 0.17, 64, 300);
  const bandY = clamp(height * 0.12, 48, 140);
  const traces: CircuitTrace[] = [];
  const nodes: CircuitNode[] = [];

  // The sticky header covers the top edge, so the machinery rises from the sides and the floor.
  const top = 96;
  type Edge = "left" | "right" | "bottom";
  const map = (edge: Edge, [x, y]: Point): Point => {
    if (edge === "left") return [x, top + y];
    if (edge === "right") return [width - x, top + y];
    return [y, height - x]; // bottom: local x is depth upwards, local y runs along the width
  };

  const place = (edge: Edge, length: number, depth: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const lanes = 2 + Math.floor(rand() * 4);
      const spacing = 6 + Math.floor(rand() * 3);
      const slot = length / count;
      const along = slot * i + slot * (0.15 + rand() * 0.5);
      const { traces: lines, ends } = bus(rand, depth, along, lanes, spacing);
      for (const line of lines) traces.push({ points: line.map((p) => map(edge, p)), width: 1 });
      ends.forEach((end, k) => {
        const [x, y] = map(edge, end);
        const roll = rand();
        const kind: NodeKind = k === 0 && roll < 0.35 ? "terminal" : roll < 0.5 ? "via" : "pad";
        nodes.push({ x, y, kind, r: kind === "via" ? 1.6 : 2.6 });
      });
      // An occasional rune where a bus ends: the kingdom's wards written into the machine.
      if (rand() < 0.3) {
        const [x, y] = map(edge, [ends[0][0] + 16, ends[0][1] - 10]);
        nodes.push({ x, y, kind: "rune", r: 4.5 });
      }
    }
  };

  const side = Math.max(120, height - top - bandY * 1.4);
  place("left", side, bandX, Math.max(2, Math.round(side / 150)));
  place("right", side, bandX, Math.max(2, Math.round(side / 150)));
  place("bottom", width, bandY, Math.max(2, Math.round(width / 280)));

  const railX = bandX * 1.08;
  const rails = [
    { from: [railX, height * 0.22] as Point, to: [railX, height * 0.7] as Point },
    { from: [width - railX, height * 0.3] as Point, to: [width - railX, height * 0.78] as Point },
  ];

  return { traces, nodes, rails, band: { x: bandX, y: bandY } };
}

/** How many drifting particles a viewport carries: scaled by area, capped hard. */
export function particleBudget(width: number, height: number, { coarse = false, reduced = false } = {}) {
  const byArea = Math.round((width * height) / 22_000);
  const cap = coarse ? 36 : 72;
  const floor = coarse ? 14 : 24;
  const n = clamp(byArea, floor, cap);
  return reduced ? Math.round(n * 0.6) : n;
}

/** Device pixel ratio for the canvases, clamped so large screens stay cheap. */
export function canvasPixelRatio(devicePixelRatio: number, coarse: boolean) {
  return clamp(devicePixelRatio || 1, 1, coarse ? 1.25 : 1.5);
}
