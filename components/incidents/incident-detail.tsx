"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { DataGate, RelativeTime } from "@/components/data/data-gate";
import { CategoryIcon } from "@/components/incidents/category-icon";
import { IncidentActions } from "@/components/incidents/incident-actions";
import { Lifecycle } from "@/components/incidents/lifecycle";
import { useKingdom } from "@/components/providers/kingdom-provider";
import { buttonClasses } from "@/components/ui/button";
import { ConditionChip, PriorityChip, SeverityChip, StatusChip, StatusGlyph } from "@/components/ui/marks";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { KirmadaPortrait } from "@/components/art/kirmada-portrait";
import { concernsKirmada } from "@/lib/kirmada";
import { CATEGORY_LABEL, ROLE_LABEL, SEVERITY_HELP, STATUS_EXPLAINER, STATUS_LABEL } from "@/lib/labels";
import { isStaff } from "@/lib/permissions";
import { publishedAnnouncements } from "@/lib/selectors";
import { formatDateTime } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { cn, paragraphs } from "@/lib/utils";
import type { IncidentUpdate } from "@/types/domain";

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-label="Loading incident">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-16 w-3/4" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

export function IncidentDetail({ reference }: { reference: string }) {
  return (
    <DataGate fallback={<DetailSkeleton />}>
      <IncidentDetailInner reference={decodeURIComponent(reference)} />
    </DataGate>
  );
}

function IncidentDetailInner({ reference }: { reference: string }) {
  const { snapshot, actor } = useKingdom();
  const now = useNow();
  const incident = snapshot.incidents.find((i) => i.reference.toLowerCase() === reference.toLowerCase());

  if (!incident) {
    return (
      <EmptyState
        title="No record bears that reference"
        action={
          <Link href="/incidents" className={buttonClasses("secondary", "md")}>
            Search the registry
          </Link>
        }
      >
        <p>
          The Black Ledger holds no case marked <span className="font-mono text-ivory">{reference}</span>. Check the
          reference on your receipt — it looks like KNG-2026-0041.
        </p>
      </EmptyState>
    );
  }

  const village = snapshot.villages.find((v) => v.id === incident.villageId);
  const initiative = snapshot.initiatives.find((i) => i.incidentIds.includes(incident.id));
  const artifact = snapshot.artifacts.find((a) => a.incidentIds.includes(incident.id));
  const relatedDispatches = publishedAnnouncements(snapshot.announcements)
    .filter(
      (a) =>
        a.villageId === incident.villageId ||
        (incident.category === "cursed_artifact" && a.id === "dsp-council-artifact"),
    )
    .slice(0, 2);
  const timeline = [...incident.updates].reverse();

  return (
    <article aria-labelledby="incident-title">
      <Link href="/incidents" className="inline-flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-muted hover:text-bright">
        <ArrowLeft className="size-3.5" aria-hidden /> The Black Ledger
      </Link>

      <header className="mt-8 grid grid-cols-1 gap-8 border-b border-line-soft pb-10 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <p className="eyebrow mb-4 flex items-center gap-3">
            <span aria-hidden className="size-1.5 rotate-45 border border-ivory/70" />
            Royal Case Record · Incident record
          </p>
          <p className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm tracking-[0.08em] text-ivory" data-testid="incident-reference">
              {incident.reference}
            </span>
            <StatusChip status={incident.status} />
            <SeverityChip severity={incident.severity} />
          </p>
          <h1 id="incident-title" className="display mt-6 text-[clamp(2.2rem,5vw,4rem)]">
            {incident.title}
          </h1>
          <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-secondary">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4 text-muted" aria-hidden />
              {incident.location}
            </span>
            <span aria-hidden className="text-faint">/</span>
            {village ? (
              <Link href={`/villages/${village.id}`} className="underline decoration-line-strong underline-offset-4 hover:text-bright">
                {village.name}
              </Link>
            ) : (
              <span>Unknown village</span>
            )}
            <span aria-hidden className="text-faint">/</span>
            <span className="inline-flex items-center gap-1.5">
              <CategoryIcon category={incident.category} className="size-4" />
              {CATEGORY_LABEL[incident.category]}
            </span>
          </p>
        </div>
        <div className="lg:col-span-4 lg:self-end">
          <Lifecycle status={incident.status} />
          <p className="mt-4 text-sm leading-relaxed text-muted" data-testid="status-explainer">
            <span className="text-ivory">{STATUS_LABEL[incident.status]}.</span> {STATUS_EXPLAINER[incident.status]}
          </p>
        </div>
      </header>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="flex flex-col gap-12 lg:col-span-7">
          <section aria-labelledby="report-heading">
            <h2 id="report-heading" className="eyebrow">
              The report
            </h2>
            <div className="prose-noir mt-4 max-w-2xl text-[1.04rem] leading-relaxed text-ivory/90">
              {paragraphs(incident.description).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
            {incident.attachment ? (
              <figure className="mt-6 max-w-xl">
                {/* eslint-disable-next-line @next/next/no-img-element -- validated data URL evidence */}
                <img src={incident.attachment} alt={`Evidence submitted with ${incident.reference}`} className="evidence-plate w-full border border-line" />
                <figcaption className="eyebrow mt-2">Evidence plate · rendered in monochrome</figcaption>
              </figure>
            ) : null}
          </section>

          <section aria-labelledby="timeline-heading">
            <div className="flex items-baseline justify-between">
              <h2 id="timeline-heading" className="eyebrow">
                Activity timeline
              </h2>
              <span className="font-mono text-[0.66rem] text-faint">{incident.updates.length} entries</span>
            </div>
            <ol className="relative mt-6 border-l border-line pl-0" data-testid="timeline">
              {timeline.map((update, index) => (
                <TimelineEntry key={update.id} update={update} now={now} latest={index === 0} />
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-8 lg:col-span-5" aria-label="Incident details">
          {isStaff(actor.role) ? <IncidentActions incident={incident} /> : null}

          <dl className="grid grid-cols-2 gap-px overflow-hidden border border-line-soft bg-line-soft text-sm">
            {[
              ["Reference", <span key="r" className="font-mono">{incident.reference}</span>],
              ["Submitted", formatDateTime(incident.submittedAt)],
              ["Last updated", <RelativeTime key="u" iso={incident.updatedAt} now={now} />],
              ["Response team", incident.assignedTeam ?? "Not yet assigned"],
              ["Reported by", incident.reporter.anonymous ? "Anonymous citizen" : (incident.reporter.name ?? "A citizen")],
              ["Severity", SEVERITY_HELP[incident.severity]],
            ].map(([label, value]) => (
              <div key={label as string} className="bg-canvas-2 p-4">
                <dt className="eyebrow">{label}</dt>
                <dd className="mt-1.5 text-secondary">{value}</dd>
              </div>
            ))}
          </dl>

          {village ? (
            <Link href={`/villages/${village.id}`} className="group surface flex items-center justify-between gap-4 p-5 transition-colors hover:border-line-strong">
              <div>
                <p className="eyebrow">Village</p>
                <p className="mt-1 font-display text-2xl text-bright">{village.name}</p>
                <div className="mt-2 flex items-center gap-3">
                  <ConditionChip condition={village.condition} />
                  <span className="font-mono text-xs text-muted">{village.restoration}% restored</span>
                </div>
              </div>
              <ArrowRight className="size-4 text-muted group-hover:text-bright" aria-hidden />
            </Link>
          ) : null}

          {initiative ? (
            <Link href="/restoration" className="group surface block p-5 transition-colors hover:border-line-strong">
              <p className="eyebrow">Part of restoration effort</p>
              <p className="mt-1 font-display text-xl text-bright">{initiative.title}</p>
              <p className="mt-1 text-xs text-muted">Led by {initiative.lead}</p>
            </Link>
          ) : null}

          {artifact ? (
            <Link href={`/grimoire#${artifact.id}`} className="group block border border-dashed border-line-strong p-5 transition-colors hover:border-ivory">
              <p className="eyebrow">Linked in the Grimoire</p>
              <p className="mt-1 font-display text-xl italic text-bright">{artifact.name}</p>
              <p className="mt-1 text-xs text-muted">{artifact.disaster}</p>
              {concernsKirmada(artifact.lore, artifact.description, incident.description) ? (
                <div className="mt-4 flex items-center gap-4 border-t border-line-soft pt-4">
                  <KirmadaPortrait variant="context" decorative className="w-14 shrink-0" />
                  <p className="text-xs leading-relaxed text-secondary">
                    <span className="eyebrow block !text-ivory">Threat · Kirmada</span>
                    One of the artifacts he scattered before the Battle of Kingsfall Downs.
                  </p>
                </div>
              ) : null}
            </Link>
          ) : null}

          {relatedDispatches.length ? (
            <div className="surface p-5">
              <p className="eyebrow">Related royal dispatches</p>
              <ul className="mt-3 flex flex-col divide-y divide-line-soft">
                {relatedDispatches.map((d) => (
                  <li key={d.id} className="py-2.5 first:pt-0 last:pb-0">
                    <Link href={`/dispatches/${d.id}`} className="group flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <PriorityChip priority={d.priority} />
                        <span className="font-mono text-[0.62rem] uppercase tracking-[0.14em] text-faint">{d.issuedBy}</span>
                      </div>
                      <span className="font-display text-lg text-ivory group-hover:text-bright">{d.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {!isStaff(actor.role) ? (
            <p className="text-xs leading-relaxed text-muted">
              Stewards update this record as the response progresses. Bookmark this page or keep the reference{" "}
              <span className="font-mono text-secondary">{incident.reference}</span> to follow it.
            </p>
          ) : null}
        </aside>
      </div>
    </article>
  );
}

function TimelineEntry({ update, now, latest }: { update: IncidentUpdate; now: number; latest: boolean }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative pb-8 pl-8 last:pb-0"
    >
      <span
        aria-hidden
        className={cn(
          "absolute -left-[7px] top-1 flex size-3.5 items-center justify-center rounded-full border bg-canvas",
          latest ? "border-bright text-bright" : "border-line-strong text-muted",
        )}
      >
        {update.toStatus ? <StatusGlyph status={update.toStatus} className="size-2" /> : <span className="size-1 rounded-full bg-current" />}
      </span>
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[0.66rem] uppercase tracking-[0.14em]">
        <span className={latest ? "text-bright" : "text-secondary"}>
          {update.kind === "submitted"
            ? "Report received"
            : update.toStatus
              ? `${update.fromStatus ? `${STATUS_LABEL[update.fromStatus]} → ` : ""}${STATUS_LABEL[update.toStatus]}`
              : "Progress update"}
        </span>
        <span className="text-faint">{formatDateTime(update.at)}</span>
        <RelativeTime iso={update.at} now={now} className="normal-case tracking-normal text-faint" />
      </p>
      <p className="mt-2 max-w-2xl leading-relaxed text-ivory/90">{update.message}</p>
      <p className="mt-1.5 text-xs text-muted">
        {update.authorName}
        {update.authorRole !== "system" ? ` · ${ROLE_LABEL[update.authorRole]}` : ""}
      </p>
    </motion.li>
  );
}
