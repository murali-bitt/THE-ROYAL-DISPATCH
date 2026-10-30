"use client";

import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useKingdom } from "@/components/providers/kingdom-provider";
import { KirmadaPortrait } from "@/components/art/kirmada-portrait";
import { WheelSigil } from "@/components/art/seal";
import { STORAGE_KEYS } from "@/lib/config";
import { useSleeper } from "@/lib/sleeper/use-sleeper";

/**
 * Orchestrates the awakening story beat:
 *  - marks <html data-awakened> so the atmosphere deepens (CSS only),
 *  - asks the repository to surface the awakening records exactly once,
 *  - plays a short, non-blocking monochrome transition once per browser.
 * It never removes or alters existing reports.
 */
export function AwakeningController() {
  const { awakened } = useSleeper();
  const { status, snapshot, actions } = useKingdom();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    document.documentElement.dataset.awakened = awakened ? "true" : "false";
  }, [awakened]);

  useEffect(() => {
    if (awakened && status === "ready" && !snapshot.awakeningAppliedAt) {
      void actions.applyAwakening();
    }
  }, [awakened, status, snapshot.awakeningAppliedAt, actions]);

  useEffect(() => {
    if (!awakened) return;
    let seen = false;
    try {
      seen = window.localStorage.getItem(STORAGE_KEYS.awakeningSeen) === "1";
      window.localStorage.setItem(STORAGE_KEYS.awakeningSeen, "1");
    } catch {
      seen = false;
    }
    if (seen) return;
    // Defer so the state change is not synchronous within the effect.
    const start = window.setTimeout(() => setPlaying(true), 0);
    const stop = window.setTimeout(() => setPlaying(false), 4200);
    return () => {
      window.clearTimeout(start);
      window.clearTimeout(stop);
    };
  }, [awakened]);

  return <AwakeningOverlay show={playing} />;
}

function AwakeningOverlay({ show }: { show: boolean }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="awakening"
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 1.2 } }}
        >
          {/* a restrained silver flash — never a full white-out */}
          {!reduce && (
            <motion.div
              className="absolute inset-0 bg-bright"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0, 0.2, 0] }}
              transition={{ duration: 0.9, times: [0, 0.12, 0.4, 0.55, 1] }}
            />
          )}
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.82 }}
            transition={{ delay: reduce ? 0 : 0.5, duration: 0.8 }}
          />
          <motion.div
            className="relative flex flex-col items-center px-6 text-center"
            initial={{ opacity: 0, scale: reduce ? 1 : 1.06, filter: reduce ? "none" : "blur(8px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: reduce ? 0 : 0.8, duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative w-[min(30rem,82vw)]">
              <KirmadaPortrait variant="event" decorative priority />
              <WheelSigil awake className="absolute -bottom-8 left-1/2 size-16 -translate-x-1/2 text-bright sm:size-20" />
            </div>
            <p className="mt-12 font-mono text-[0.7rem] uppercase tracking-[0.5em] text-muted">00:00</p>
            <p className="display mt-4 text-[clamp(2.2rem,7vw,5rem)] tracking-[0.04em]">The Sleeper has awakened</p>
            <p className="mt-4 max-w-md text-sm text-secondary">Kirmada stirs beneath Kingsfall Downs.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Persistent, non-blocking kingdom-wide alert shown after the awakening. */
export function AwakeningBanner() {
  const { awakened } = useSleeper();
  if (!awakened) return null;
  return (
    <div role="region" aria-label="Kingdom-wide alert" className="relative z-30 border-b border-ivory bg-ivory text-canvas">
      <div className="mx-auto flex max-w-[88rem] flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-10">
        <div className="flex items-center gap-3 text-sm">
          <KirmadaPortrait variant="context" decorative className="w-8 shrink-0" />
          <span>
            <strong className="font-mono text-[0.7rem] uppercase tracking-[0.2em]">Kingdom-wide alert</strong>
            <span className="mx-2 opacity-40">/</span>
            The Sleeper has awakened. New disturbances have surfaced at Kingsfall and Moonfall.
          </span>
        </div>
        <Link
          href="/incidents?status=submitted"
          className="inline-flex shrink-0 items-center gap-2 font-mono text-[0.68rem] font-semibold uppercase tracking-[0.18em] underline-offset-4 hover:underline"
        >
          View surfaced incidents <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
