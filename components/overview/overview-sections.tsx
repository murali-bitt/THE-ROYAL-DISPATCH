"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { useMemo, useState } from "react";
import { KingdomMap } from "@/components/art/kingdom-map";
import { KirmadaPortrait } from "@/components/art/kirmada-portrait";
import { WheelSigil } from "@/components/art/seal";
import { DataGate, RelativeTime } from "@/components/data/data-gate";
import { useKingdom, useVillageMap } from "@/components/providers/kingdom-provider";
import { buttonClasses } from "@/components/ui/button";
import { ConditionChip, ConditionGlyph, PriorityChip, SeverityChip, StatusGlyph } from "@/components/ui/marks";
import { ProgressBar } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeading } from "@/components/ui/section";
import {
  activityFeed,
  featuredAnnouncement,
  initiativeProgress,
  initiativeStatus,
  kingdomMetrics,
  openCountForVillage,
  publishedAnnouncements,
  villagesBySeverity,
} from "@/lib/selectors";
import { useSleeper } from "@/lib/sleeper/use-sleeper";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";

const rise = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } }),
};

/* ------------------------------------------------------------------ */

export function RealmMetrics() {
  const { snapshot, status } = useKingdom();
  const m = useMemo(() => kingdomMetrics(snapshot), [snapshot]);
  const items = [
    { label: "Open incidents", value: m.openIncidents, note: `${m.criticalOpen} critical`, href: "/incidents?status=open" },
    { label: "Villages afflicted", value: m.villagesAffected, note: `of ${m.totalVillages} villages`, href: "/villages" },
    { label: "Restoration index", value: `${m.restorationIndex}%`, note: "mean of village values", href: "/restoration" },
    { label: "Resolved", value: m.resolvedIncidents, note: `of ${m.totalIncidents} reported`, href: "/incidents?status=resolved" },
  ];
  return (
    <section aria-label="State of the realm" className="border-y border-line-soft bg-canvas-2/60">
      <dl className="mx-auto grid max-w-[88rem] grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <div key={item.label} className={cn("border-line-soft", i % 2 === 1 && "border-l", i >= 2 && "border-t lg:border-t-0", i >= 1 && "lg:border-l")}>
            <Link href={item.href} className="group flex h-full flex-col gap-3 px-4 py-7 transition-[background-color,box-shadow] duration-500 hover:bg-white/[0.025] hover:shadow-[inset_0_1px_0_rgb(255_255_255/0.25)] sm:px-6 lg:px-10 lg:py-9">
              <dt className="eyebrow flex items-center justify-between">
                {item.label}
                <ArrowUpRight className="size-3.5 text-faint transition-colors group-hover:text-bright" aria-hidden />
              </dt>
              <dd>
                {status === "ready" ? (
                  <motion.span initial="hidden" animate="show" custom={i} variants={rise} className="block font-display text-[clamp(2.8rem,6vw,4.4rem)] leading-none text-bright tabular" data-testid={`metric-${i}`}>
                    {item.value}
                  </motion.span>
                ) : (
                  <Skeleton className="h-14 w-24" />
                )}
                <span className="mt-2 block font-mono text-[0.66rem] uppercase tracking-[0.14em] text-muted">{item.note}</span>
              </dd>
            </Link>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function ActivityFeed() {
  const { snapshot } = useKingdom();
  const now = useNow();
  const items = useMemo(() => activityFeed(snapshot, 9), [snapshot]);

  return (
    <section aria-labelledby="activity-heading">
      <SectionHeading
        index="01"
        label="Dispatch wire"
        id="activity-heading"
        title="Signals from the villages"
        action={
          <span className="eyebrow inline-flex items-center gap-2">
            <span aria-hidden className="relative flex size-2">
              <span className="absolute inset-0 animate-pulse-ring rounded-full border border-ivory" />
              <span className="size-2 rounded-full bg-ivory" />
            </span>
            Live
          </span>
        }
      />
      <DataGate>
        <ol className="mt-8 border-t border-line" aria-live="polite" aria-relevant="additions">
          {items.map((item, i) => (
            <motion.li key={item.id} initial="hidden" animate="show" custom={i} variants={rise} className="border-b border-line-soft">
              {item.kind === "incident" ? (
                <Link href={`/incidents/${item.incident.reference}`} className="group grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-4 gap-y-1 py-4 sm:grid-cols-[1.25rem_7rem_minmax(0,1fr)_auto]">
                  <StatusGlyph status={item.incident.status} className="mt-1 size-3 text-secondary" />
                  <RelativeTime iso={item.at} now={now} className="col-start-2 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-faint sm:col-start-auto sm:mt-1" />
                  <span className="col-start-2 min-w-0 sm:col-start-auto">
                    <span className="eyebrow !text-[0.6rem]">
                      {item.label} · {item.incident.reference}
                    </span>
                    <span className="mt-1 block truncate text-[0.95rem] text-ivory group-hover:text-bright">{item.incident.title}</span>
                    <span className="mt-0.5 block truncate text-sm text-muted">{item.message}</span>
                  </span>
                  <span className="col-start-2 sm:col-start-auto sm:mt-1">
                    <SeverityChip severity={item.incident.severity} />
                  </span>
                </Link>
              ) : item.kind === "dispatch" ? (
                <Link href={`/dispatches/${item.announcement.id}`} className="group grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-4 gap-y-1 py-4 sm:grid-cols-[1.25rem_7rem_minmax(0,1fr)_auto]">
                  <span aria-hidden className="mt-1.5 size-2.5 rotate-45 border border-ivory" />
                  <RelativeTime iso={item.at} now={now} className="col-start-2 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-faint sm:col-start-auto sm:mt-1" />
                  <span className="col-start-2 min-w-0 sm:col-start-auto">
                    <span className="eyebrow !text-[0.6rem]">Royal dispatch · {item.announcement.issuedBy}</span>
                    <span className="mt-1 block truncate font-display text-lg italic text-ivory group-hover:text-bright">{item.announcement.title}</span>
                  </span>
                  <span className="col-start-2 sm:col-start-auto sm:mt-1">
                    <PriorityChip priority={item.announcement.priority} />
                  </span>
                </Link>
              ) : (
                <Link href={`/villages/${item.village.id}`} className="group grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-4 gap-y-1 py-4 sm:grid-cols-[1.25rem_7rem_minmax(0,1fr)_auto]">
                  <ConditionGlyph condition={item.village.condition} className="mt-1 size-3 text-secondary" />
                  <RelativeTime iso={item.at} now={now} className="col-start-2 font-mono text-[0.66rem] uppercase tracking-[0.12em] text-faint sm:col-start-auto sm:mt-1" />
                  <span className="col-start-2 min-w-0 sm:col-start-auto">
                    <span className="eyebrow !text-[0.6rem]">Village status · {item.village.name}</span>
                    <span className="mt-1 block truncate text-sm text-secondary group-hover:text-ivory">{item.message}</span>
                  </span>
                  <span className="col-start-2 font-mono text-xs text-muted sm:col-start-auto sm:mt-1">{item.village.restoration}%</span>
                </Link>
              )}
            </motion.li>
          ))}
        </ol>
        <Link href="/incidents" className="mt-6 inline-flex items-center gap-2 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-secondary hover:text-bright">
          Open the full registry <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </DataGate>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function VillageSummary() {
  const { snapshot } = useKingdom();
  const { awakened } = useSleeper();
  const [hovered, setHovered] = useState<string | null>(null);
  const villages = useMemo(() => villagesBySeverity(snapshot.villages), [snapshot.villages]);
  const markers = useMemo(
    () => snapshot.villages.map((village) => ({ village, openIncidents: openCountForVillage(snapshot, village.id) })),
    [snapshot],
  );

  return (
    <section aria-labelledby="villages-heading">
      <SectionHeading index="02" label="Village status · The Forsaken Lands" id="villages-heading" title="The kingdom at a glance" />
      <DataGate fallback={<Skeleton className="mt-8 aspect-[1000/680] w-full" />}>
        <div className="mt-8">
          <KingdomMap markers={markers} linkMarkers selectedId={hovered} onHover={setHovered} awakened={awakened} compact />
        </div>
        <ul className="mt-6 border-t border-line">
          {villages.map((v) => (
            <li key={v.id} className="border-b border-line-soft">
              <Link
                href={`/villages/${v.id}`}
                onMouseEnter={() => setHovered(v.id)}
                onMouseLeave={() => setHovered(null)}
                className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3 transition-colors sm:grid-cols-[8rem_minmax(0,1fr)_7rem]", hovered === v.id && "bg-white/[0.03]")}
              >
                <span className="font-display text-xl text-bright">{v.name}</span>
                <span className="justify-self-end sm:order-last">
                  <ConditionChip condition={v.condition} />
                </span>
                <ProgressBar value={v.restoration} label={`${v.name} restoration`} size="sm" className="col-span-2 sm:col-span-1" />
              </Link>
            </li>
          ))}
        </ul>
      </DataGate>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function DispatchesPreview() {
  const { snapshot } = useKingdom();
  const now = useNow();
  const villages = useVillageMap();
  const featured = featuredAnnouncement(snapshot.announcements);
  const rest = publishedAnnouncements(snapshot.announcements).filter((a) => a.id !== featured?.id).slice(0, 3);

  return (
    <section aria-labelledby="dispatches-heading">
      <SectionHeading
        index="03"
        label="Royal dispatches"
        id="dispatches-heading"
        title="Whispers from the Crown"
        action={
          <Link href="/dispatches" className={buttonClasses("secondary", "sm")}>
            All dispatches
          </Link>
        }
      />
      <DataGate>
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          {featured ? (
            <Link
              href={`/dispatches/${featured.id}`}
              className={cn(
                "group relative flex flex-col justify-between overflow-hidden p-7 lg:col-span-7 sm:p-9",
                featured.priority === "critical" ? "bg-ivory text-canvas" : "surface",
              )}
            >
              <div>
                <div className="flex items-center gap-3">
                  <PriorityChip priority={featured.priority} className={featured.priority === "critical" ? "border-canvas bg-canvas text-ivory" : ""} />
                  <span className={cn("eyebrow", featured.priority === "critical" && "!text-canvas/70")}>
                    {featured.villageId ? villages.get(featured.villageId)?.name : "Kingdom-wide"}
                  </span>
                </div>
                <p className={cn("display mt-6 text-[clamp(2rem,3.6vw,3rem)]", featured.priority === "critical" && "!text-canvas")}>{featured.title}</p>
                <p className={cn("mt-4 max-w-xl leading-relaxed", featured.priority === "critical" ? "text-canvas/80" : "text-secondary")}>{featured.summary}</p>
              </div>
              <p className={cn("mt-8 flex items-center justify-between font-mono text-[0.66rem] uppercase tracking-[0.16em]", featured.priority === "critical" ? "text-canvas/70" : "text-muted")}>
                <span>
                  {featured.issuedBy} · <RelativeTime iso={featured.publishedAt} now={now} />
                </span>
                <span className="inline-flex items-center gap-2">
                  Read dispatch <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </p>
            </Link>
          ) : null}
          <ul className="flex flex-col lg:col-span-5">
            {rest.map((a) => (
              <li key={a.id} className="border-b border-line-soft first:border-t">
                <Link href={`/dispatches/${a.id}`} className="group block py-5">
                  <div className="flex items-center gap-3">
                    <PriorityChip priority={a.priority} />
                    <span className="eyebrow">
                      <RelativeTime iso={a.publishedAt} now={now} />
                    </span>
                  </div>
                  <p className="mt-3 font-display text-xl leading-snug text-ivory group-hover:text-bright">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{a.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </DataGate>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function RestorationPreview() {
  const { snapshot } = useKingdom();
  const villages = useVillageMap();
  const m = kingdomMetrics(snapshot);
  const active = snapshot.initiatives.filter((i) => initiativeStatus(i) !== "completed");
  return (
    <section aria-labelledby="restoration-heading">
      <SectionHeading
        index="04"
        label="Restoration · The Long Vigil"
        id="restoration-heading"
        title="What is being mended"
        action={
          <Link href="/restoration" className={buttonClasses("secondary", "sm")}>
            Restoration operations
          </Link>
        }
      />
      <DataGate>
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow">Kingdom restoration index</p>
            <p className="mt-3 font-display text-[clamp(4rem,9vw,7rem)] leading-none text-bright tabular">{m.restorationIndex}%</p>
            <ProgressBar value={m.restorationIndex} label="Kingdom restoration index" showValue={false} size="lg" className="mt-5" />
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Unweighted mean of the restoration values reported by each village&apos;s steward. {m.activeInitiatives} recovery
              efforts are under way.
            </p>
          </div>
          <ul className="grid gap-px border border-line-soft bg-line-soft sm:grid-cols-2 lg:col-span-8">
            {active.slice(0, 4).map((initiative) => (
              <li key={initiative.id} className="bg-canvas p-5">
                <p className="eyebrow">{villages.get(initiative.villageId)?.name}</p>
                <p className="mt-2 font-display text-xl leading-snug text-ivory">{initiative.title}</p>
                <ProgressBar value={initiativeProgress(initiative)} label={`${initiative.title} progress`} className="mt-4" />
                <p className="mt-2 text-xs text-muted">
                  {initiative.milestones.filter((x) => x.done).length} of {initiative.milestones.length} milestones · {initiative.lead}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </DataGate>
    </section>
  );
}

/* ------------------------------------------------------------------ */

export function CurseSection() {
  const { awakened } = useSleeper();
  return (
    <section aria-labelledby="curse-heading" className="relative overflow-hidden border-y border-line-soft">
      <div aria-hidden className="fog" />
      <div className="relative mx-auto grid grid-cols-1 max-w-[88rem] items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:px-10 lg:py-28">
        <div className="flex justify-center lg:col-span-5">
          <div className="relative w-[min(24rem,86vw)]">
            <KirmadaPortrait
              variant="hero"
              caption={
                <span className="flex flex-col gap-1">
                  <span className="gothic text-xl font-semibold tracking-[0.18em] text-bright">Kirmada</span>
                  <span className="eyebrow">The sorcerer who unmade the kingdom</span>
                </span>
              }
            />
            <WheelSigil
              awake={awakened}
              className={cn("pointer-events-none absolute -right-8 -top-8 w-24 transition-opacity duration-1000 sm:w-28", awakened ? "opacity-100" : "opacity-70")}
            />
          </div>
        </div>
        <div className="lg:col-span-7">
          <p className="eyebrow">05 — The Wheel of Evil</p>
          <h2 id="curse-heading" className="gothic silver mt-5 text-[clamp(2.1rem,4.4vw,3.8rem)] font-semibold">
            {awakened ? "Kirmada is awake." : "Kirmada did not die. He slept."}
          </h2>
          <div className="prose-noir mt-6 max-w-xl text-lg leading-relaxed text-secondary">
            <p>
              A sorcerer of the old wars, Kirmada was buried beneath Kingsfall Downs at the end of the Battle of the Downs.
              Before he fell he scattered his artifacts across the kingdom — a lantern, a bell, a book, a compass — and each
              one now bleeds his curse into the land.
            </p>
            <p>
              His curse does not destroy a kingdom in one night. It makes every village forget how to call for help.
            </p>
            <p>
              {awakened
                ? "The hourglass has run out and the barrow has opened. Every report matters now more than ever."
                : "His hourglass runs upward. When the last grain rises, the Sleeper wakes. Until then, every report helps the Crown find and contain what he left behind."}
            </p>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/grimoire" className={buttonClasses("secondary", "md")}>
              Open the Grimoire
            </Link>
            <Link href="/report?category=cursed_artifact" className={buttonClasses("ghost", "md")}>
              Report an artifact
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
