import type { Point } from "@/lib/atmosphere/layout";

/**
 * Silver-white lightning for the haunted background — pure geometry and timing,
 * so it can be tested with a seeded random source. The engine draws it inside
 * its single animation loop (lib/atmosphere/engine.ts).
 *
 * Every tunable value lives in LIGHTNING.
 */
export const LIGHTNING = {
  /** Gap between strikes, ms. Each gap is drawn fresh from this range. */
  minInterval: 8_000,
  maxInterval: 18_000,
  /** The first strike after load (or after the tab returns) comes a little sooner. */
  firstMin: 2_500,
  firstMax: 6_000,
  /** One strike's whole life: trace → strike → (secondary flicker) → fade → afterglow, ms. */
  life: 1_400,
  /** Chance of a single, restrained follow-up flicker. */
  secondaryChance: 0.6,
  /** Big changes of direction along the main path at full detail (each is then crackled finely). */
  minSegments: 8,
  maxSegments: 13,
  /** Sideways travel as a share of the fall: bolts stay steep, never chart-like. */
  maxLean: 0.55,
  /** Share of top-edge strikes that start in the outer thirds of the sky. */
  edgeBias: 0.65,
  /** Branches are few and always attached to the main bolt. */
  maxBranches: 3,
  /** Chance that a bolt enters from an upper side edge instead of the top. */
  sideStartChance: 0.22,
  /** Peak opacity of the sky glow behind content (it never flashes the page). */
  skyFlash: 0.55,
} as const;

export interface Bolt {
  main: Point[];
  branches: Point[][];
  secondary: boolean;
  /** Where the sky glow centres, as a fraction of the viewport width. */
  originX: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A fresh, genuinely random gap before the next strike. */
export function nextStrikeDelay(rand: () => number = Math.random, first = false) {
  const lo = first ? LIGHTNING.firstMin : LIGHTNING.minInterval;
  const hi = first ? LIGHTNING.firstMax : LIGHTNING.maxInterval;
  return lo + rand() * (hi - lo);
}

/** A jagged run between two points: a damped random walk across the line. */
function jagged(rand: () => number, from: Point, to: Point, segments: number, roughness: number): Point[] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const px = -dy / length; // perpendicular
  const py = dx / length;
  const step = (length / segments) * roughness;
  const points: Point[] = [from];
  let drift = 0;
  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    drift = drift * 0.72 + (rand() * 2 - 1) * step;
    // Sharper kinks now and then: lightning changes its mind.
    if (rand() < 0.18) drift += (rand() * 2 - 1) * step * 1.6;
    points.push([from[0] + dx * t + px * drift, from[1] + dy * t + py * drift]);
  }
  points.push(to);
  return points;
}

/**
 * Generates one bolt for a viewport. It starts on the top edge (or high on a
 * side edge) and ends in the lower part of the screen, wandering on the way,
 * with up to `maxBranches` forks. `detail` (0–1) thins it for small screens.
 */
export function generateBolt(width: number, height: number, rand: () => number = Math.random, detail = 1): Bolt {
  let start: Point;
  let side: -1 | 0 | 1 = 0;
  if (rand() < LIGHTNING.sideStartChance) {
    side = rand() < 0.5 ? -1 : 1;
    start = [side < 0 ? -8 : width + 8, height * (0.04 + rand() * 0.22)];
  } else {
    // Mostly from the outer thirds, where the background is open; sometimes anywhere.
    const u = rand();
    const fx = rand() < LIGHTNING.edgeBias ? (u < 0.5 ? 0.03 + u * 0.54 : 0.7 + (u - 0.5) * 0.54) : 0.03 + u * 0.94;
    start = [width * fx, -8];
  }
  const endY = height * (0.7 + rand() * 0.32);
  const fall = endY - start[1];
  // Lightning falls: the sideways travel is capped by how far it drops. Side entries lean inward.
  const lean = side ? -side * (0.15 + rand() * 0.4) * fall : (rand() * 2 - 1) * LIGHTNING.maxLean * fall;
  const end: Point = [clamp(start[0] + lean, width * 0.02, width * 0.98), endY];

  // Two levels of jaggedness: a few big changes of mind, then fine crackle along each run.
  const coarse = Math.max(6, Math.round((LIGHTNING.minSegments + rand() * (LIGHTNING.maxSegments - LIGHTNING.minSegments)) * detail));
  const rough = jagged(rand, start, end, coarse, 1.1);
  const main: Point[] = [rough[0]];
  for (let i = 1; i < rough.length; i++) main.push(...jagged(rand, rough[i - 1], rough[i], 3, 0.5).slice(1));

  const branchCount = Math.min(LIGHTNING.maxBranches, Math.floor(rand() * (LIGHTNING.maxBranches + 1) * detail));
  const branches: Point[][] = [];
  for (let b = 0; b < branchCount; b++) {
    const at = Math.floor(main.length * (0.2 + rand() * 0.5));
    const from = main[at];
    const next = main[Math.min(main.length - 1, at + 3)];
    const heading = Math.atan2(next[1] - from[1], next[0] - from[0]);
    const turn = (rand() < 0.5 ? -1 : 1) * (0.42 + rand() * 0.5); // ~25°–55° off the main path
    const reach = height * (0.08 + rand() * 0.14);
    const angle = heading + turn;
    const to: Point = [from[0] + Math.cos(angle) * reach, from[1] + Math.abs(Math.sin(angle)) * reach];
    branches.push(jagged(rand, from, to, 5 + Math.floor(rand() * 5), 1.2));
  }

  return {
    main,
    branches,
    secondary: rand() < LIGHTNING.secondaryChance,
    originX: clamp(start[0] / width, 0, 1),
  };
}

/**
 * Brightness over a strike's life, 0–1:
 * a faint trace, the sudden strike, a dip, one optional restrained flicker,
 * a fast fade, then a dim afterglow that disappears.
 */
export function strikeEnvelope(age: number, secondary: boolean) {
  if (age < 0 || age >= LIGHTNING.life) return 0;
  if (age < 90) return 0.06 + (age / 90) * 0.1; // trace
  if (age < 150) return 1; // strike
  if (age < 230) return 1 - ((age - 150) / 80) * 0.68; // dip to ~0.32
  if (secondary && age < 300) return 0.72; // one follow-up flicker
  if (age < 700) {
    const from = secondary ? 0.72 : 0.32;
    const k = (age - (secondary ? 300 : 230)) / (700 - (secondary ? 300 : 230));
    return from + (0.1 - from) * (1 - (1 - k) ** 2); // quick fade
  }
  return 0.1 * (1 - (age - 700) / (LIGHTNING.life - 700)); // afterglow
}
