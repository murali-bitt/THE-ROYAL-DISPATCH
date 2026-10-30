"use client";

import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** An accessible meter. The width always reflects the value passed in. */
export function ProgressBar({
  value,
  label,
  showValue = true,
  size = "md",
  className,
}: {
  value: number;
  label: string;
  showValue?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const reduce = useReducedMotion();
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        className={cn(
          "relative flex-1 overflow-hidden bg-white/[0.06]",
          size === "sm" && "h-1",
          size === "md" && "h-1.5",
          size === "lg" && "h-2.5",
        )}
      >
        {/* quarter ticks */}
        <div aria-hidden className="absolute inset-0 flex justify-between">
          {[0, 1, 2, 3, 4].map((t) => (
            <span key={t} className="h-full w-px bg-canvas/80" />
          ))}
        </div>
        <motion.div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-secondary to-bright"
          initial={reduce ? false : { width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: reduce ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      {showValue ? (
        <span className="w-10 text-right font-mono text-xs tabular text-secondary">{pct}%</span>
      ) : null}
    </div>
  );
}
