"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CSSProperties } from "react";
import { RelativeTime } from "@/components/data/data-gate";
import { CategoryIcon } from "@/components/incidents/category-icon";
import { SeverityChip, StatusChip } from "@/components/ui/marks";
import { CATEGORY_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Incident, Village } from "@/types/domain";

/** One record in a list of incidents. The whole row is a single link. */
export function IncidentRow({
  incident,
  village,
  now,
  showExcerpt = true,
  index,
  className,
}: {
  incident: Incident;
  village?: Village;
  now: number;
  showExcerpt?: boolean;
  /** Position in the list, for a restrained staggered entrance. */
  index?: number;
  className?: string;
}) {
  const resolved = incident.status === "resolved";
  const urgent = incident.severity === "critical" && !resolved;
  return (
    <li
      className={cn("group relative border-b border-line-soft last:border-b-0", index !== undefined && "rise-in", className)}
      style={index !== undefined ? ({ "--i": index } as CSSProperties) : undefined}
    >
      <span aria-hidden className="ledger-rule" />
      <Link
        href={`/incidents/${incident.reference}`}
        className="grid gap-x-6 gap-y-3 px-1 py-5 transition-[background-color] duration-300 hover:bg-[linear-gradient(90deg,rgb(255_255_255/0.045),rgb(255_255_255/0.01)_60%,transparent)] focus-visible:bg-white/[0.03] sm:px-4 md:grid-cols-[8.5rem_minmax(0,1fr)_auto] md:items-start"
      >
        <div className="flex items-center gap-3 md:flex-col md:items-start md:gap-2">
          <span className="inline-flex items-center gap-2 font-mono text-xs tracking-[0.06em] text-secondary">
            {urgent ? (
              <span aria-hidden className="relative flex size-1.5">
                <span className="absolute inset-0 animate-pulse-ring rounded-full border border-ivory" />
                <span className="size-1.5 rounded-full bg-ivory" />
              </span>
            ) : null}
            {incident.reference}
          </span>
          <RelativeTime iso={incident.updatedAt} now={now} className="font-mono text-[0.66rem] uppercase tracking-[0.12em] text-faint" />
        </div>
        <div className="min-w-0">
          <p className={cn("font-display text-[1.45rem] leading-tight transition-transform duration-500 ease-(--ease-noir) group-hover:translate-x-1", resolved ? "text-secondary" : "text-bright")}>
            {incident.title}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.82rem] text-muted">
            <span className="text-secondary">{village?.name ?? "Unknown village"}</span>
            <span aria-hidden className="text-faint">/</span>
            <span className="inline-flex items-center gap-1.5">
              <CategoryIcon category={incident.category} className="size-3.5" />
              {CATEGORY_LABEL[incident.category]}
            </span>
            {incident.assignedTeam ? (
              <>
                <span aria-hidden className="text-faint">/</span>
                <span>{incident.assignedTeam}</span>
              </>
            ) : null}
          </p>
          {showExcerpt ? (
            <p className="mt-2.5 line-clamp-2 max-w-3xl text-[0.9rem] leading-relaxed text-muted">{incident.description}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
          <SeverityChip severity={incident.severity} />
          <StatusChip status={incident.status} />
          <ArrowUpRight aria-hidden className="ml-auto hidden size-4 text-faint transition-colors group-hover:text-bright md:mt-2 md:block" />
        </div>
      </Link>
    </li>
  );
}
