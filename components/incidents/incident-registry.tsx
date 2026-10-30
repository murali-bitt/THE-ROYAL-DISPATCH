"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { useMemo } from "react";
import { DataGate } from "@/components/data/data-gate";
import { IncidentRow } from "@/components/incidents/incident-row";
import { useKingdom, useVillageMap } from "@/components/providers/kingdom-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/states";
import { CATEGORY_LABEL, SEVERITY_LABEL, STATUS_LABEL } from "@/lib/labels";
import { DEFAULT_FILTERS, filterIncidents, type IncidentFilters, type IncidentSort } from "@/lib/selectors";
import { useNow } from "@/lib/use-now";
import { INCIDENT_CATEGORIES, INCIDENT_SEVERITIES, INCIDENT_STATUSES } from "@/types/domain";

const SORT_LABEL: Record<IncidentSort, string> = {
  updated: "Recently updated",
  newest: "Newest reports",
  oldest: "Oldest reports",
  severity: "Most severe first",
};

function parseFilters(params: URLSearchParams): IncidentFilters {
  const pick = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const value = params.get(key);
    return value && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
  };
  return {
    query: params.get("q") ?? "",
    status: pick("status", ["all", "open", ...INCIDENT_STATUSES] as const, "all"),
    villageId: params.get("village") || "all",
    category: pick("category", ["all", ...INCIDENT_CATEGORIES] as const, "all"),
    severity: pick("severity", ["all", ...INCIDENT_SEVERITIES] as const, "all"),
    sort: pick("sort", ["updated", "newest", "oldest", "severity"] as const, "updated"),
  };
}

/**
 * The URL is the single source of truth for filters, so they are shareable,
 * survive refreshes and stay correct when this page is hidden and restored.
 * history.replaceState is integrated with useSearchParams by Next.js.
 */
function writeFilters(next: IncidentFilters) {
  const qs = new URLSearchParams();
  if (next.query) qs.set("q", next.query);
  if (next.status !== "all") qs.set("status", next.status);
  if (next.villageId !== "all") qs.set("village", next.villageId);
  if (next.category !== "all") qs.set("category", next.category);
  if (next.severity !== "all") qs.set("severity", next.severity);
  if (next.sort !== "updated") qs.set("sort", next.sort);
  const query = qs.toString();
  window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
}

export function IncidentRegistry() {
  const params = useSearchParams();
  const { snapshot } = useKingdom();
  const villages = useVillageMap();
  const now = useNow();
  const filters = useMemo(() => parseFilters(new URLSearchParams(params.toString())), [params]);
  const results = useMemo(
    () => filterIncidents(snapshot.incidents, filters, snapshot.villages),
    [snapshot.incidents, snapshot.villages, filters],
  );

  // Patch the URL as it is now, not this render's `filters`: search params reach
  // React asynchronously, so a quick second change could resurrect a cleared filter.
  const current = () => parseFilters(new URLSearchParams(window.location.search));
  const update = (patch: Partial<IncidentFilters>) => writeFilters({ ...current(), ...patch });
  const activeCount = (
    ["status", "villageId", "category", "severity"] as const
  ).filter((k) => filters[k] !== "all").length + (filters.query ? 1 : 0);

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
      <aside className="lg:col-span-3" aria-label="Registry filters">
        <div className="flex flex-col gap-5 lg:sticky lg:top-32">
          <div className="relative">
            <label htmlFor="registry-search" className="sr-only">
              Search incidents
            </label>
            <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" />
            <Input
              id="registry-search"
              type="search"
              placeholder="Reference, place, words…"
              value={filters.query}
              onChange={(e) => update({ query: e.target.value })}
              className="pl-10"
            />
          </div>

          <FilterSelect label="Status" id="f-status" value={filters.status} onChange={(v) => update({ status: v as IncidentFilters["status"] })}>
            <option value="all">All statuses</option>
            <option value="open">All open (not resolved)</option>
            {INCIDENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABEL[s]}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Village" id="f-village" value={filters.villageId} onChange={(v) => update({ villageId: v })}>
            <option value="all">All villages</option>
            {snapshot.villages.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Category" id="f-category" value={filters.category} onChange={(v) => update({ category: v as IncidentFilters["category"] })}>
            <option value="all">All categories</option>
            {INCIDENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Severity" id="f-severity" value={filters.severity} onChange={(v) => update({ severity: v as IncidentFilters["severity"] })}>
            <option value="all">All severities</option>
            {INCIDENT_SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABEL[s]}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Sort by" id="f-sort" value={filters.sort} onChange={(v) => update({ sort: v as IncidentSort })}>
            {(Object.keys(SORT_LABEL) as IncidentSort[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </FilterSelect>

          {activeCount > 0 ? (
            <Button variant="secondary" size="sm" onClick={() => writeFilters({ ...DEFAULT_FILTERS, sort: current().sort })}>
              <X className="size-3.5" aria-hidden /> Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
            </Button>
          ) : null}
        </div>
      </aside>

      <section className="lg:col-span-9" aria-labelledby="registry-results">
        <DataGate>
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-line pb-4">
            <h2 id="registry-results" className="eyebrow">
              <span className="text-ivory" aria-live="polite" data-testid="registry-count">
                {results.length} of {snapshot.incidents.length}
              </span>{" "}
              records · {SORT_LABEL[filters.sort].toLowerCase()}
            </h2>
            <Link href="/report" className="font-mono text-[0.68rem] uppercase tracking-[0.16em] text-secondary underline-offset-4 hover:text-bright hover:underline">
              + File a new report
            </Link>
          </div>

          {snapshot.incidents.length === 0 ? (
            <EmptyState
              className="mt-8"
              title="No disturbances have reached the Ledger"
              action={
                <Link href="/report" className={buttonClasses("primary", "md")}>
                  Report the first incident
                </Link>
              }
            >
              No incidents have been reported yet. If you have seen the curse at work, the Crown is waiting for your raven.
            </EmptyState>
          ) : results.length === 0 ? (
            <EmptyState
              className="mt-8"
              title="No records match these marks"
              action={
                <Button variant="secondary" onClick={() => writeFilters(DEFAULT_FILTERS)}>
                  Clear all filters
                </Button>
              }
            >
              The Ledger holds nothing that matches every filter you chose. Remove one, or search for a reference such as
              KNG-2026-0031.
            </EmptyState>
          ) : (
            <ul data-testid="registry-list">
              {results.map((incident, index) => (
                <IncidentRow key={incident.id} index={index} incident={incident} village={villages.get(incident.villageId)} now={now} />
              ))}
            </ul>
          )}
        </DataGate>
      </section>
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-11 text-sm">
        {children}
      </Select>
    </div>
  );
}
