import { SLEEPER_DURATION_MS, STORAGE_KEYS } from "@/lib/config";

/**
 * The Sleeper's clock — a tiny external store consumed with
 * useSyncExternalStore. There is exactly one interval for the whole app no
 * matter how many components show the clock; it starts with the first
 * subscriber and is cleared when the last one unsubscribes.
 *
 * The start timestamp is persisted, so a refresh never restarts the timer,
 * and the awakened state is derived from it (it therefore persists too).
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let timer: ReturnType<typeof setInterval> | null = null;
let startedAt: number | null = null;
let cached: number | null = null;

function persist(value: number) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.sleeper, JSON.stringify({ startedAt: value }));
  } catch {
    // Storage unavailable: the clock still runs for this page view.
  }
}

function readStart(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.sleeper);
    if (raw) {
      const parsed = JSON.parse(raw) as { startedAt?: unknown };
      if (typeof parsed.startedAt === "number" && Number.isFinite(parsed.startedAt) && parsed.startedAt <= Date.now() + SLEEPER_DURATION_MS) {
        return parsed.startedAt;
      }
    }
  } catch {
    // fall through
  }
  const now = Date.now();
  persist(now);
  return now;
}

function start(): number {
  if (startedAt === null) startedAt = readStart();
  return startedAt;
}

/** Whole seconds remaining, never negative. */
export function computeRemaining(start: number, now: number, duration = SLEEPER_DURATION_MS): number {
  return Math.max(0, Math.ceil((start + duration - now) / 1000));
}

function emitIfChanged() {
  const next = computeRemaining(start(), Date.now());
  if (next !== cached) {
    cached = next;
    for (const listener of listeners) listener();
  }
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEYS.sleeper) return;
  startedAt = null; // another tab reset or fast-forwarded the clock
  emitIfChanged();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  if (timer === null) {
    timer = setInterval(emitIfChanged, 250);
    window.addEventListener("storage", onStorage);
  }
  emitIfChanged();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function getSnapshot(): number {
  if (cached === null) cached = computeRemaining(start(), Date.now());
  return cached;
}

/** During SSR the clock is unknown; components render a neutral placeholder. */
export function getServerSnapshot(): number | null {
  return null;
}

/** Demo control: jump so that `secondsLeft` remain. */
export function fastForward(secondsLeft: number) {
  startedAt = Date.now() + secondsLeft * 1000 - SLEEPER_DURATION_MS;
  persist(startedAt);
  emitIfChanged();
}

/** Demo control: start a fresh 13:04 countdown. */
export function restartClock() {
  startedAt = Date.now();
  persist(startedAt);
  emitIfChanged();
}

export const DURATION_SECONDS = Math.round(SLEEPER_DURATION_MS / 1000);

export type SleeperPhase = "dormant" | "stirring" | "restless" | "waking" | "awakened";

export function phaseFor(remaining: number): SleeperPhase {
  if (remaining <= 0) return "awakened";
  if (remaining <= 60) return "waking";
  if (remaining <= 300) return "restless";
  if (remaining <= 540) return "stirring";
  return "dormant";
}

export const PHASE_NARRATIVE: Record<SleeperPhase, { title: string; line: string }> = {
  dormant: {
    title: "The Sleeper lies dormant",
    line: "Beneath Kingsfall Downs the sand runs upward. The Council's scryers keep the count.",
  },
  stirring: {
    title: "The Sleeper stirs",
    line: "The wards are thinning. Stewards report cold air rising from the Downs.",
  },
  restless: {
    title: "The Sleeper is restless",
    line: "The bells of Moonfall ring unbidden. Lamps gutter in every village.",
  },
  waking: {
    title: "The Sleeper is waking",
    line: "Keep your lamps lit. Report everything you see.",
  },
  awakened: {
    title: "The Sleeper has awakened",
    line: "Kirmada stirs beneath Kingsfall Downs. The Wheel turns again.",
  },
};
