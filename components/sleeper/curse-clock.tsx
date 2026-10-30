"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useSleeper } from "@/lib/sleeper/use-sleeper";
import { PHASE_NARRATIVE } from "@/lib/sleeper/clock";
import { formatClock } from "@/lib/time";
import { cn } from "@/lib/utils";

/** A single digit that rolls when it changes. */
function Digit({ value, className }: { value: string; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className={cn("relative inline-block overflow-hidden tabular", className)} style={{ width: "0.62em" }}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          className="inline-block"
          initial={reduce ? { opacity: 0 } : { y: "-55%", opacity: 0, filter: "blur(2px)" }}
          animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
          exit={reduce ? { opacity: 0 } : { y: "55%", opacity: 0, filter: "blur(2px)" }}
          transition={{ duration: reduce ? 0.1 : 0.42, ease: [0.22, 1, 0.36, 1] }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function ClockDigits({ remaining, className }: { remaining: number | null; className?: string }) {
  if (remaining === null) {
    return (
      <span className={cn("font-mono tabular text-muted", className)} aria-hidden>
        --:--
      </span>
    );
  }
  const { minutes, seconds } = formatClock(remaining);
  return (
    <span className={cn("inline-flex items-baseline font-mono", className)} aria-hidden>
      <Digit value={minutes[0]} />
      <Digit value={minutes[1]} />
      <span className="mx-[0.04em] animate-flicker opacity-70">:</span>
      <Digit value={seconds[0]} />
      <Digit value={seconds[1]} />
    </span>
  );
}

/** Accessible text equivalent, announced politely only at narrative milestones. */
function srLabel(remaining: number | null) {
  if (remaining === null) return "Curse clock loading";
  if (remaining <= 0) return "The Sleeper has awakened";
  const { minutes, seconds } = formatClock(remaining);
  return `The Sleeper wakes in ${Number(minutes)} minutes ${Number(seconds)} seconds`;
}

/** Compact clock for the header strip. */
export function CurseClockCompact() {
  const { remaining, awakened } = useSleeper();
  return (
    <div className="flex items-center gap-2.5" title="The Sleeper's clock — a fictional, simulated event">
      <span aria-hidden className={cn("relative flex size-2", awakened ? "" : "")}>
        <span className={cn("absolute inset-0 rounded-full", awakened ? "bg-bright" : "bg-secondary animate-flicker")} />
        {awakened && <span className="absolute inset-0 animate-pulse-ring rounded-full border border-bright" />}
      </span>
      <span className="eyebrow !text-[0.6rem] hidden sm:inline">{awakened ? "Awakened" : "Wakes in"}</span>
      {awakened ? (
        <span className="font-mono text-xs font-semibold tracking-[0.18em] text-bright">00:00</span>
      ) : (
        <ClockDigits remaining={remaining} className="text-xs text-ivory" />
      )}
      <span className="sr-only">{srLabel(remaining)}</span>
    </div>
  );
}

/**
 * A clock-face behind the numerals: sixty ticks that slowly turn, and an arc
 * that holds the sand still left. Decorative; the text carries the meaning.
 */
function ClockDial({ elapsed, className }: { elapsed: number; className?: string }) {
  const r = 84;
  const circumference = 2 * Math.PI * r;
  return (
    <svg viewBox="-100 -100 200 200" aria-hidden className={className}>
      <g className="clock-dial" fill="none" stroke="#ffffff">
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const inner = i % 5 === 0 ? 88 : 92;
          // Rounded: trig output can differ in the last digit between server and browser.
          const at = (r: number) => [Math.round(Math.cos(a) * r * 100) / 100, Math.round(Math.sin(a) * r * 100) / 100];
          const [x1, y1] = at(inner);
          const [x2, y2] = at(96);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeOpacity={i % 5 === 0 ? 0.35 : 0.14} strokeWidth="0.8" />;
        })}
      </g>
      <circle r={r} fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1.5" />
      <circle
        r={r}
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.55"
        strokeWidth="1.5"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * Math.min(1, Math.max(0, elapsed))}
        transform="rotate(-90)"
        className="transition-[stroke-dashoffset] duration-1000 ease-linear"
      />
    </svg>
  );
}

/** The full clock panel used on the Overview hero. */
export function CurseClockPanel() {
  const { remaining, awakened, phase, elapsed } = useSleeper();
  const narrative = phase ? PHASE_NARRATIVE[phase] : PHASE_NARRATIVE.dormant;
  return (
    <section
      aria-labelledby="curse-clock-heading"
      data-phase={phase ?? "dormant"}
      className={cn(
        "frame-corners relative overflow-hidden rounded-md border px-6 pb-6 pt-5 sm:px-8 sm:pb-8 sm:pt-6 transition-colors duration-1000",
        awakened ? "border-ivory bg-ivory text-canvas" : "border-line bg-canvas-2/85 md:backdrop-blur-sm",
      )}
    >
      {!awakened && <div aria-hidden className="fog" />}
      {!awakened && <div aria-hidden className="clock-halo" />}
      {!awakened && <ClockDial elapsed={elapsed} className="pointer-events-none absolute -right-14 -top-14 size-60 opacity-70 sm:size-64" />}
      <div className="relative flex items-center justify-between gap-4">
        <p className={cn("eyebrow", awakened && "!text-canvas/70")}>
          Curse clock · The Sleeper
        </p>
        <p className={cn("eyebrow !tracking-[0.12em]", awakened && "!text-canvas/70")}>Simulated</p>
      </div>
      <h2 id="curse-clock-heading" className={cn("relative mt-6 font-display text-xl leading-tight sm:text-2xl", awakened ? "text-canvas" : "text-bright")}>
        {awakened ? "The Sleeper has awakened." : "Sleeping… wakes in"}
      </h2>
      <div className="relative mt-3" aria-live="off">
        {awakened ? (
          <p className="font-mono text-[clamp(3.2rem,9vw,5.5rem)] font-semibold leading-none tracking-tight text-canvas">00:00</p>
        ) : (
          <ClockDigits remaining={remaining} className="clock-numerals text-[clamp(3.2rem,9vw,5.5rem)] font-light leading-none tracking-tight text-bright" />
        )}
        <span className="sr-only">{srLabel(remaining)}</span>
      </div>
      {/* the sand: a depleting hairline */}
      <div aria-hidden className={cn("relative mt-6 h-px w-full", awakened ? "bg-canvas/30" : "bg-line")}>
        <div
          className={cn("absolute inset-y-0 right-0 transition-[width] duration-1000 ease-linear", awakened ? "bg-canvas" : "bg-ivory")}
          style={{ width: `${Math.max(0, (1 - elapsed) * 100)}%` }}
        />
      </div>
      <p aria-live="polite" className={cn("relative mt-5 text-sm leading-relaxed", awakened ? "text-canvas/80" : "text-secondary")}>
        <span className={cn("font-semibold", awakened ? "text-canvas" : "text-ivory")}>{narrative.title}.</span>{" "}
        {narrative.line}
      </p>
    </section>
  );
}
