import {
  CONDITION_LABEL,
  PRIORITY_LABEL,
  SERVICE_STATE_LABEL,
  SEVERITY_LABEL,
  SEVERITY_RANK,
  STATUS_SHORT,
} from "@/lib/labels";
import { cn } from "@/lib/utils";
import type {
  AnnouncementPriority,
  IncidentSeverity,
  IncidentStatus,
  ServiceState,
  VillageCondition,
} from "@/types/domain";

/*
 * Grayscale status language. Nothing here relies on hue: every state has a
 * distinct shape AND a text label, and emphasis is carried by fill, border
 * style and contrast.
 */

const chip =
  "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-xs border px-2 font-mono text-[0.64rem] uppercase leading-none tracking-[0.14em]";

/** Circle that fills as an incident moves through its lifecycle. */
export function StatusGlyph({ status, className }: { status: IncidentStatus; className?: string }) {
  return (
    <svg viewBox="0 0 14 14" aria-hidden className={cn("size-3 shrink-0", className)}>
      <circle cx="7" cy="7" r="5.75" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {status === "acknowledged" && <path d="M7 7 L7 1.25 A5.75 5.75 0 0 1 12.75 7 Z" fill="currentColor" />}
      {status === "in_restoration" && <path d="M7 1.25 A5.75 5.75 0 0 1 7 12.75 Z" fill="currentColor" />}
      {status === "resolved" && <circle cx="7" cy="7" r="5.75" fill="currentColor" />}
    </svg>
  );
}

export function StatusChip({ status, className }: { status: IncidentStatus; className?: string }) {
  return (
    <span
      className={cn(
        chip,
        status === "submitted" && "border-ivory/70 text-bright",
        status === "acknowledged" && "border-line-strong text-ivory",
        status === "in_restoration" && "border-line-strong bg-white/[0.06] text-ivory",
        status === "resolved" && "border-dashed border-line text-muted",
        className,
      )}
    >
      <StatusGlyph status={status} />
      {STATUS_SHORT[status]}
    </span>
  );
}

/** Ascending bars: one to four filled. */
export function SeverityBars({ severity, className }: { severity: IncidentSeverity; className?: string }) {
  const rank = SEVERITY_RANK[severity];
  return (
    <svg viewBox="0 0 16 12" aria-hidden className={cn("h-3 w-4 shrink-0", className)}>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={i * 4}
          y={9 - i * 3}
          width="2.6"
          height={3 + i * 3}
          fill={i < rank ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={i < rank ? 0 : 0.8}
          opacity={i < rank ? 1 : 0.45}
        />
      ))}
    </svg>
  );
}

export function SeverityChip({ severity, className }: { severity: IncidentSeverity; className?: string }) {
  return (
    <span
      className={cn(
        chip,
        severity === "critical" && "border-ivory bg-ivory font-semibold text-canvas",
        severity === "high" && "border-ivory text-bright",
        severity === "moderate" && "border-line-strong text-secondary",
        severity === "low" && "border-line text-muted",
        className,
      )}
    >
      <SeverityBars severity={severity} />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

/** Square that fills as a village's condition worsens. */
export function ConditionGlyph({ condition, className }: { condition: VillageCondition; className?: string }) {
  return (
    <svg viewBox="0 0 14 14" aria-hidden className={cn("size-3 shrink-0", className)}>
      <rect x="1.5" y="1.5" width="11" height="11" fill={condition === "critical" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" />
      {condition === "strained" && <path d="M2 12 L12 2" stroke="currentColor" strokeWidth="1.4" />}
      {condition === "afflicted" && <path d="M1.5 1.5 H12.5 V12.5 Z" fill="currentColor" />}
    </svg>
  );
}

export function ConditionChip({ condition, className }: { condition: VillageCondition; className?: string }) {
  return (
    <span
      className={cn(
        chip,
        condition === "critical" && "border-ivory bg-ivory font-semibold text-canvas",
        condition === "afflicted" && "border-ivory text-bright",
        condition === "strained" && "border-line-strong text-secondary",
        condition === "stable" && "border-dashed border-line text-muted",
        className,
      )}
    >
      <ConditionGlyph condition={condition} />
      {CONDITION_LABEL[condition]}
    </span>
  );
}

/** Line that breaks as a service fails: solid → dashed → crossed. */
export function ServiceGlyph({ state, className }: { state: ServiceState; className?: string }) {
  return (
    <svg viewBox="0 0 20 10" aria-hidden className={cn("h-2.5 w-5 shrink-0", className)}>
      {state === "operational" && <path d="M1 5 H19" stroke="currentColor" strokeWidth="2" />}
      {state === "degraded" && <path d="M1 5 H19" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2.5" />}
      {state === "disrupted" && (
        <>
          <path d="M1 5 H6 M14 5 H19" stroke="currentColor" strokeWidth="2" />
          <path d="M8 2 L12 8 M12 2 L8 8" stroke="currentColor" strokeWidth="1.6" />
        </>
      )}
    </svg>
  );
}

export function ServiceState({ state }: { state: ServiceState }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.14em]",
        state === "operational" && "text-muted",
        state === "degraded" && "text-secondary",
        state === "disrupted" && "font-semibold text-bright",
      )}
    >
      <ServiceGlyph state={state} />
      {SERVICE_STATE_LABEL[state]}
    </span>
  );
}

export function PriorityChip({ priority, className }: { priority: AnnouncementPriority; className?: string }) {
  return (
    <span
      className={cn(
        chip,
        priority === "critical" && "border-ivory bg-ivory font-semibold text-canvas",
        priority === "urgent" && "border-ivory font-semibold text-bright",
        priority === "advisory" && "border-line-strong text-secondary",
        priority === "routine" && "border-line text-muted",
        className,
      )}
    >
      {priority === "critical" || priority === "urgent" ? (
        <svg viewBox="0 0 10 10" aria-hidden className="size-2.5">
          <path d="M5 0.5 L9.5 9.5 H0.5 Z" fill="currentColor" />
        </svg>
      ) : null}
      {PRIORITY_LABEL[priority]}
    </span>
  );
}
