import { StatusGlyph } from "@/components/ui/marks";
import { STATUS_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { INCIDENT_STATUSES, type IncidentStatus } from "@/types/domain";

/** SUBMITTED → ACKNOWLEDGED → RESTORATION IN PROGRESS → RESOLVED */
export function Lifecycle({ status, className }: { status: IncidentStatus; className?: string }) {
  const current = INCIDENT_STATUSES.indexOf(status);
  return (
    <ol className={cn("grid grid-cols-4 gap-1", className)} aria-label="Incident lifecycle">
      {INCIDENT_STATUSES.map((step, index) => {
        const reached = index <= current;
        const isCurrent = index === current;
        return (
          <li key={step} className="flex flex-col gap-2" aria-current={isCurrent ? "step" : undefined}>
            <span className={cn("h-0.5 w-full", reached ? "bg-ivory" : "bg-line")} />
            <span
              className={cn(
                "flex items-start gap-1.5 font-mono text-[0.58rem] uppercase leading-tight tracking-[0.12em] sm:text-[0.62rem]",
                isCurrent ? "text-bright" : reached ? "text-secondary" : "text-faint",
              )}
            >
              <StatusGlyph status={step} className="mt-px hidden size-2.5 sm:block" />
              <span>
                {STATUS_LABEL[step]}
                {isCurrent ? <span className="sr-only"> (current)</span> : null}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
