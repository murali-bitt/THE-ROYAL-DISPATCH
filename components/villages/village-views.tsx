"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { KingdomMap } from "@/components/art/kingdom-map";
import { DataGate, RelativeTime } from "@/components/data/data-gate";
import { IncidentRow } from "@/components/incidents/incident-row";
import { useKingdom } from "@/components/providers/kingdom-provider";
import { buttonClasses } from "@/components/ui/button";
import { ConditionChip, PriorityChip, ServiceState } from "@/components/ui/marks";
import { ProgressBar } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { SERVICE_LABEL } from "@/lib/labels";
import {
  announcementsForVillage,
  incidentsForVillage,
  initiativeProgress,
  isOpen,
  openCountForVillage,
  sortIncidents,
  villagesBySeverity,
} from "@/lib/selectors";
import { useSleeper } from "@/lib/sleeper/use-sleeper";
import { formatDateTime } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { SERVICE_KEYS, type Village } from "@/types/domain";

function ServiceGrid({ village, dense = false }: { village: Village; dense?: boolean }) {
  return (
    <dl className={cn("grid gap-px border border-line-soft bg-line-soft", dense ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-5")}>
      {SERVICE_KEYS.map((key) => (
        <div key={key} className={cn("flex bg-canvas-2", dense ? "items-center justify-between px-4 py-2.5" : "flex-col gap-2 p-4")}>
          <dt className="text-sm text-secondary">{SERVICE_LABEL[key]}</dt>
          <dd>
            <ServiceState state={village.services[key]} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* Directory ---------------------------------------------------------- */

export function VillageDirectory() {
  return (
    <DataGate fallback={<Skeleton className="aspect-[1000/680] w-full" />}>
      <VillageDirectoryInner />
    </DataGate>
  );
}

function VillageDirectoryInner() {
  const { snapshot } = useKingdom();
  const { awakened } = useSleeper();
  const now = useNow();
  const ordered = useMemo(() => villagesBySeverity(snapshot.villages), [snapshot.villages]);
  const [selectedId, setSelectedId] = useState<string>(ordered[0]?.id ?? "");
  const [hovered, setHovered] = useState<string | null>(null);
  const selected = snapshot.villages.find((v) => v.id === selectedId) ?? ordered[0];
  const markers = snapshot.villages.map((village) => ({ village, openIncidents: openCountForVillage(snapshot, village.id) }));

  if (!selected) return <EmptyState title="No villages on record" />;
  const openCount = openCountForVillage(snapshot, selected.id);

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <KingdomMap markers={markers} selectedId={hovered ?? selected.id} onSelect={setSelectedId} onHover={setHovered} awakened={awakened} />
        <p className="mt-2 text-xs text-muted">Select a village on the chart or in the list to see its condition.</p>
      </div>

      <div className="lg:col-span-4">
        <AnimatePresence mode="wait">
          <motion.section
            key={selected.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            aria-live="polite"
            aria-labelledby="selected-village"
            className="surface p-6"
          >
            <p className="eyebrow">{selected.epithet}</p>
            <h2 id="selected-village" className="mt-2 font-display text-4xl text-bright">
              {selected.name}
            </h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <ConditionChip condition={selected.condition} />
              <span className="font-mono text-xs text-muted">
                {openCount} open incident{openCount === 1 ? "" : "s"}
              </span>
            </div>
            <ProgressBar value={selected.restoration} label={`${selected.name} restoration`} className="mt-5" />
            <div className="mt-5">
              <ServiceGrid village={selected} dense />
            </div>
            {selected.log.length ? (
              <p className="mt-5 text-sm leading-relaxed text-secondary">
                <span className="eyebrow mb-1 block">
                  Latest · <RelativeTime iso={selected.log[selected.log.length - 1].at} now={now} />
                </span>
                {selected.log[selected.log.length - 1].message}
              </p>
            ) : null}
            <Link href={`/villages/${selected.id}`} className={buttonClasses("primary", "md", "mt-6 w-full")} data-testid="open-village">
              Open {selected.name} <ArrowRight className="size-4" aria-hidden />
            </Link>
          </motion.section>
        </AnimatePresence>
      </div>

      <section aria-labelledby="directory-heading" className="lg:col-span-12">
        <h2 id="directory-heading" className="eyebrow">
          Directory · {ordered.length} villages, most afflicted first
        </h2>
        <ul className="mt-5 grid gap-px border border-line-soft bg-line-soft md:grid-cols-2 xl:grid-cols-3">
          {ordered.map((v) => {
            const open = openCountForVillage(snapshot, v.id);
            const isSelected = v.id === selected.id;
            return (
              <li key={v.id} className="bg-canvas">
                <div
                  className={cn("flex h-full flex-col gap-4 p-6 transition-colors", (isSelected || hovered === v.id) && "bg-white/[0.03]")}
                  onMouseEnter={() => setHovered(v.id)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-3xl leading-none text-bright">{v.name}</p>
                      <p className="mt-1.5 text-xs text-muted">{v.epithet}</p>
                    </div>
                    <ConditionChip condition={v.condition} />
                  </div>
                  <ProgressBar value={v.restoration} label={`${v.name} restoration`} size="sm" />
                  <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-muted">
                    {open} open · {SERVICE_KEYS.filter((k) => v.services[k] !== "operational").length} services affected
                  </p>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedId(v.id)}
                      aria-pressed={isSelected}
                      className={buttonClasses(isSelected ? "secondary" : "ghost", "sm")}
                    >
                      {isSelected ? "Shown on chart" : "Show on chart"}
                    </button>
                    <Link href={`/villages/${v.id}`} className={buttonClasses("ghost", "sm")}>
                      Village record <ArrowRight className="size-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/* Detail ------------------------------------------------------------- */

export function VillageDetail({ slug }: { slug: string }) {
  return (
    <DataGate fallback={<Skeleton className="h-96 w-full" />}>
      <VillageDetailInner slug={slug} />
    </DataGate>
  );
}

function VillageDetailInner({ slug }: { slug: string }) {
  const { snapshot } = useKingdom();
  const { awakened } = useSleeper();
  const now = useNow();
  const village = snapshot.villages.find((v) => v.id === slug);

  if (!village) {
    return (
      <EmptyState
        title="No such village"
        action={
          <Link href="/villages" className={buttonClasses("secondary", "md")}>
            Back to the villages
          </Link>
        }
      >
        No chart of Valmora shows a village called “{slug}”. It may never have existed — or the fog has taken it.
      </EmptyState>
    );
  }

  const incidents = sortIncidents(incidentsForVillage(snapshot, village.id), "updated");
  const open = incidents.filter(isOpen);
  const closed = incidents.filter((i) => !isOpen(i));
  const dispatches = announcementsForVillage(snapshot.announcements, village.id);
  const initiatives = snapshot.initiatives.filter((i) => i.villageId === village.id);
  const artifacts = snapshot.artifacts.filter((a) => a.villageId === village.id);
  const markers = snapshot.villages.map((v) => ({ village: v, openIncidents: openCountForVillage(snapshot, v.id) }));

  return (
    <article aria-labelledby="village-title">
      <Link href="/villages" className="inline-flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-muted hover:text-bright">
        <ArrowLeft className="size-3.5" aria-hidden /> The Forsaken Lands
      </Link>

      <header className="mt-8 grid grid-cols-1 gap-10 border-b border-line-soft pb-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <p className="eyebrow">Village record · {village.epithet}</p>
          <h1 id="village-title" className="display mt-4 text-[clamp(3rem,8vw,6.5rem)]">
            {village.name}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <ConditionChip condition={village.condition} />
            <span className="font-mono text-xs text-muted" data-testid="village-open-count">
              {open.length} open incident{open.length === 1 ? "" : "s"}
            </span>
            <span className="font-mono text-xs text-faint">Updated <RelativeTime iso={village.updatedAt} now={now} /></span>
          </div>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-secondary">{village.description}</p>
          <div className="mt-8 max-w-md">
            <p className="eyebrow">Restoration</p>
            <ProgressBar value={village.restoration} label={`${village.name} restoration`} size="lg" className="mt-3" />
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={`/report?village=${village.id}`} className={buttonClasses("primary", "md")}>
              Report an incident in {village.name}
            </Link>
            <Link href={`/incidents?village=${village.id}`} className={buttonClasses("secondary", "md")}>
              All {village.name} records
            </Link>
          </div>
        </div>
        <div className="lg:col-span-5">
          <KingdomMap markers={markers} selectedId={village.id} linkMarkers awakened={awakened} compact />
        </div>
      </header>

      <section aria-labelledby="services-heading" className="mt-12">
        <h2 id="services-heading" className="eyebrow">
          Affected services
        </h2>
        <div className="mt-4">
          <ServiceGrid village={village} />
        </div>
      </section>

      <div className="mt-14 grid grid-cols-1 gap-14 lg:grid-cols-12">
        <div className="flex flex-col gap-14 lg:col-span-8">
          <section aria-labelledby="open-heading">
            <h2 id="open-heading" className="eyebrow">
              Open incidents · {open.length}
            </h2>
            {open.length ? (
              <ul className="mt-4 border-t border-line" data-testid="village-incidents">
                {open.map((i) => (
                  <IncidentRow key={i.id} incident={i} village={village} now={now} showExcerpt={false} />
                ))}
              </ul>
            ) : (
              <EmptyState className="mt-4" title="The ward holds — no open incidents">
                Nothing in {village.name} is awaiting a response from the Crown.
              </EmptyState>
            )}
          </section>
          {closed.length ? (
            <section aria-labelledby="closed-heading">
              <h2 id="closed-heading" className="eyebrow">
                Resolved · {closed.length}
              </h2>
              <ul className="mt-4 border-t border-line">
                {closed.map((i) => (
                  <IncidentRow key={i.id} incident={i} village={village} now={now} showExcerpt={false} />
                ))}
              </ul>
            </section>
          ) : null}

          <section aria-labelledby="activity-heading">
            <h2 id="activity-heading" className="eyebrow">
              Restoration activity
            </h2>
            <ol className="mt-5 border-l border-line">
              {[...village.log].reverse().map((entry) => (
                <li key={entry.id} className="relative pb-6 pl-6 last:pb-0">
                  <span aria-hidden className="absolute -left-[4px] top-1.5 size-2 rounded-full bg-ivory" />
                  <p className="font-mono text-[0.66rem] uppercase tracking-[0.14em] text-faint">
                    {formatDateTime(entry.at)} · {entry.restoration}% restored
                  </p>
                  <p className="mt-1.5 leading-relaxed text-ivory/90">{entry.message}</p>
                  <p className="mt-1 text-xs text-muted">{entry.authorName}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-10 lg:col-span-4" aria-label={`${village.name} dispatches and efforts`}>
          <section aria-labelledby="v-dispatches">
            <h2 id="v-dispatches" className="eyebrow">
              Dispatches for {village.name}
            </h2>
            <ul className="mt-4 flex flex-col">
              {dispatches.slice(0, 5).map((a) => (
                <li key={a.id} className="border-b border-line-soft first:border-t">
                  <Link href={`/dispatches/${a.id}`} className="group block py-4">
                    <div className="flex items-center gap-2">
                      <PriorityChip priority={a.priority} />
                      <span className="eyebrow !text-[0.6rem]">{a.villageId ? village.name : "Kingdom-wide"}</span>
                    </div>
                    <p className="mt-2 font-display text-lg leading-snug text-ivory group-hover:text-bright">{a.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          {initiatives.length ? (
            <section aria-labelledby="v-initiatives">
              <h2 id="v-initiatives" className="eyebrow">
                Restoration efforts
              </h2>
              <ul className="mt-4 flex flex-col gap-3">
                {initiatives.map((i) => (
                  <li key={i.id}>
                    <Link href="/restoration" className="surface block p-4 transition-colors hover:border-line-strong">
                      <p className="font-display text-xl text-bright">{i.title}</p>
                      <ProgressBar value={initiativeProgress(i)} label={`${i.title} progress`} size="sm" className="mt-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {artifacts.length ? (
            <section aria-labelledby="v-artifacts">
              <h2 id="v-artifacts" className="eyebrow">
                In the Grimoire
              </h2>
              <ul className="mt-4 flex flex-col gap-2">
                {artifacts.map((a) => (
                  <li key={a.id}>
                    <Link href={`/grimoire#${a.id}`} className="font-display text-lg italic text-secondary underline decoration-line-strong underline-offset-4 hover:text-bright">
                      {a.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
