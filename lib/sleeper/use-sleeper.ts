"use client";

import { useSyncExternalStore } from "react";
import {
  DURATION_SECONDS,
  getServerSnapshot,
  getSnapshot,
  phaseFor,
  subscribe,
  type SleeperPhase,
} from "@/lib/sleeper/clock";

export interface SleeperState {
  /** null until hydrated on the client. */
  remaining: number | null;
  awakened: boolean;
  phase: SleeperPhase | null;
  /** 0 → 1 as the clock runs down. */
  elapsed: number;
}

export function useSleeper(): SleeperState {
  const remaining = useSyncExternalStore<number | null>(subscribe, getSnapshot, getServerSnapshot);
  if (remaining === null) return { remaining: null, awakened: false, phase: null, elapsed: 0 };
  return {
    remaining,
    awakened: remaining <= 0,
    phase: phaseFor(remaining),
    elapsed: 1 - remaining / DURATION_SECONDS,
  };
}
