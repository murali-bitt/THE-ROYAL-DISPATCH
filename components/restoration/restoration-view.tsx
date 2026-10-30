"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DataGate, RelativeTime } from "@/components/data/data-gate";
import { useKingdom, useVillageMap } from "@/components/providers/kingdom-provider";
import { ConditionChip, ServiceGlyph, StatusChip } from "@/components/ui/marks";
import { ProgressBar } from "@/components/ui/progress";
import { SectionHeading } from "@/components/ui/section";
import { RepositoryError } from "@/lib/data/repository";
import { CATEGORY_LABEL, SERVICE_LABEL } from "@/lib/labels";
import { can } from "@/lib/permissions";
import {
  initiativeProgress,
  initiativeStatus,
  isOpen,
  kingdomRestoration,
  villagesBySeverity,
} from "@/lib/selectors";
import { formatDate } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { SERVICE_KEYS, type Initiative } from "@/types/domain";

export function RestorationView() {
  return (
    <DataGate>
      <RestorationInner />
    </DataGate>
  );
}

function RestorationInner() {
  const { snapshot } = useKingdom();
  const villages = useVillageMap();
  const now = useNow();
  const index = kingdomRestoration(snapshot.villages);
  const open = snapshot.incidents.filter(isOpen);
  const teams = new Set(open.map((i) => i.assignedTeam).filter(Boolean));
  const active = snapshot.initiatives.filter((i) => initiativeStatus(i) !== "completed");
  const completed = snapshot.initiatives.filter((i) => initiativeStatus(i) === "completed");

  const damage = useMemo(
    () =>
      SERVICE_KEYS.map((key) => ({
        key,
        disrupted: snapshot.villages.filter((v) => v.services[key] === "disrupted").length,
        degraded: snapshot.villages.filter((v) => v.services[key] === "degraded").length,
      })),
    [snapshot.villages],
  );

  const updates = useMemo(() => {
    const items = [
      ...snapshot.initiatives.flatMap((i) => i.updates.map((u) => ({ ...u, source: i.title, villageId: i.villageId }))),
      ...snapshot.villages.flatMap((v) => v.log.map((l) => ({ id: l.id, at: l.at, message: l.message, authorName: l.authorName, source: `${v.name} status`, villageId: v.id }))),
    ];
    return items.sort((a, b) => +new Date(b.at) - +new Date(a.at)).slice(0, 8);
  }, [snapshot.initiatives, snapshot.villages]);

  return (
    <div className="flex flex-col gap-24">
      {/* The three questions */}
      <section aria-label="Restoration summary" className="grid gap-px border border-line-soft bg-line-soft lg:grid-cols-3">
        <div className="bg-canvas p-7">
          <p className="eyebrow">01 · What has been damaged</p>
          <ul className="mt-5 flex flex-col gap-3">
            {damage.map((d) => (
              <li key={d.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-secondary">{SERVICE_LABEL[d.key]}</span>
                <span className="flex items-center gap-4 font-mono text-xs">
                  <span className="inline-flex items-center gap-1.5 text-bright" title="Villages with this service disrupted">
                    <ServiceGlyph state="disrupted" /> {d.disrupted}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-secondary" title="Villages with this service degraded">
                    <ServiceGlyph state="degraded" /> {d.degraded}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5 text-xs text-muted">Villages with each service disrupted / degraded.</p>
        </div>
        <div className="bg-canvas p-7">
          <p className="eyebrow">02 · What is being done</p>
          <p className="mt-5 font-display text-6xl leading-none text-bright tabular">{active.length}</p>
          <p className="mt-2 text-sm text-secondary">active recovery efforts</p>
          <p className="mt-6 font-display text-4xl leading-none text-ivory tabular">{teams.size}</p>
          <p className="mt-2 text-sm text-secondary">response teams deployed on {open.filter((i) => i.assignedTeam).length} open incidents</p>
        </div>
        <div className="bg-canvas p-7">
          <p className="eyebrow">03 · How far it has come</p>
          <p className="mt-5 font-display text-7xl leading-none text-bright tabular" data-testid="restoration-index">
            {index}%
          </p>
          <ProgressBar value={index} label="Kingdom restoration index" showValue={false} size="lg" className="mt-5" />
          <p className="mt-4 text-xs leading-relaxed text-muted">
            <span className="text-secondary">Kingdom Restoration Index</span> — an illustrative demo calculation: the
            unweighted mean of each village&apos;s steward-reported restoration value. The steward-reported village values
            below are the official measures.
          </p>
        </div>
      </section>

      {/* Progress by village */}
      <section aria-labelledby="by-village">
        <SectionHeading index="01" label="Official · steward-reported" id="by-village" title="Progress by village" />
        <ul className="mt-8 border-t border-line">
          {villagesBySeverity(snapshot.villages).map((v) => (
            <li key={v.id} className="border-b border-line-soft">
              <Link href={`/villages/${v.id}`} className="grid items-center gap-x-6 gap-y-2 py-4 transition-colors hover:bg-white/[0.02] sm:grid-cols-[10rem_8rem_minmax(0,1fr)_7rem]">
                <span className="font-display text-2xl text-bright">{v.name}</span>
                <ConditionChip condition={v.condition} />
                <ProgressBar value={v.restoration} label={`${v.name} restoration`} />
                <span className="font-mono text-[0.64rem] uppercase tracking-[0.14em] text-faint sm:text-right">
                  <RelativeTime iso={v.updatedAt} now={now} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Active initiatives */}
      <section aria-labelledby="initiatives-heading">
        <SectionHeading index="02" label="Recovery efforts · progress from milestones" id="initiatives-heading" title="Active restoration operations">
          Each effort&apos;s progress is the share of its milestones completed — nothing is estimated.
        </SectionHeading>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {active.map((i) => (
            <InitiativeCard key={i.id} initiative={i} villageName={villages.get(i.villageId)?.name ?? ""} />
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
        <section aria-labelledby="completed-heading" className="lg:col-span-5">
          <SectionHeading index="03" label="Restored" id="completed-heading" title="Completed efforts" />
          <ul className="mt-8 flex flex-col gap-4">
            {completed.length === 0 ? <li className="text-sm text-muted">No effort has been completed yet.</li> : null}
            {completed.map((i) => (
              <li key={i.id} className="border border-dashed border-line-strong p-5">
                <p className="eyebrow">{villages.get(i.villageId)?.name} · completed</p>
                <p className="mt-2 font-display text-2xl text-bright">{i.title}</p>
                <p className="mt-2 text-sm text-muted">{i.summary}</p>
              </li>
            ))}
            {snapshot.incidents
              .filter((i) => i.status === "resolved")
              .map((i) => (
                <li key={i.id}>
                  <Link href={`/incidents/${i.reference}`} className="flex items-center justify-between gap-3 border-b border-line-soft py-3 text-sm hover:text-bright">
                    <span className="min-w-0 truncate text-secondary">
                      <span className="font-mono text-xs text-faint">{i.reference}</span> · {i.title}
                    </span>
                    <StatusChip status={i.status} />
                  </Link>
                </li>
              ))}
          </ul>
        </section>

        <section aria-labelledby="ops-updates" className="lg:col-span-7">
          <SectionHeading index="04" label="Operational log" id="ops-updates" title="Latest from the field" />
          <ol className="mt-8 border-l border-line">
            {updates.map((u) => (
              <li key={u.id} className="relative pb-7 pl-6 last:pb-0">
                <span aria-hidden className="absolute -left-[4px] top-1.5 size-2 rounded-full bg-ivory" />
                <p className="font-mono text-[0.64rem] uppercase tracking-[0.14em] text-faint">
                  {u.source} · <RelativeTime iso={u.at} now={now} />
                </p>
                <p className="mt-1.5 leading-relaxed text-ivory/90">{u.message}</p>
                <p className="mt-1 text-xs text-muted">{u.authorName}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

export function InitiativeCard({ initiative, villageName }: { initiative: Initiative; villageName: string }) {
  const { snapshot, actor, actions } = useKingdom();
  const [pending, setPending] = useState<string | null>(null);
  const editable = can(actor.role, "initiative.update");
  const progress = initiativeProgress(initiative);
  const incidents = snapshot.incidents.filter((i) => initiative.incidentIds.includes(i.id));
  const latest = initiative.updates[initiative.updates.length - 1];

  async function toggle(milestoneId: string, done: boolean) {
    setPending(milestoneId);
    try {
      await actions.setMilestone(initiative.id, { milestoneId, done });
      toast.success(done ? "Milestone completed" : "Milestone reopened");
    } catch (error) {
      toast.error(error instanceof RepositoryError ? error.message : "The milestone could not be updated.");
    } finally {
      setPending(null);
    }
  }

  return (
    <article className="surface flex flex-col p-6 sm:p-7" aria-labelledby={`${initiative.id}-title`}>
      <p className="eyebrow">
        {villageName} · {initiative.lead}
      </p>
      <h3 id={`${initiative.id}-title`} className="mt-3 font-display text-3xl leading-tight text-bright">
        {initiative.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-muted">{initiative.summary}</p>
      <ProgressBar value={progress} label={`${initiative.title} progress`} size="lg" className="mt-6" />

      <ol className="mt-6 flex flex-col gap-1" aria-label="Milestones">
        {initiative.milestones.map((m) => {
          const inner = (
            <>
              <span
                aria-hidden
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-[2px] border",
                  m.done ? "border-ivory bg-ivory text-canvas" : "border-line-strong",
                )}
              >
                {m.done ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
              <span className={cn("flex-1 text-sm", m.done ? "text-muted line-through decoration-line-strong" : "text-ivory")}>{m.title}</span>
              {m.doneAt ? <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-faint">{formatDate(m.doneAt)}</span> : null}
            </>
          );
          return (
            <li key={m.id}>
              {editable ? (
                <label className={cn("flex cursor-pointer items-start gap-3 rounded-xs px-2 py-1.5 -mx-2 hover:bg-white/[0.03]", pending === m.id && "opacity-60")}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={m.done}
                    disabled={pending !== null}
                    onChange={(e) => void toggle(m.id, e.target.checked)}
                    aria-label={`${m.done ? "Reopen" : "Complete"} milestone: ${m.title}`}
                  />
                  {inner}
                </label>
              ) : (
                <div className="flex items-start gap-3 py-1.5">
                  {inner}
                  <span className="sr-only">{m.done ? "completed" : "not yet completed"}</span>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {latest ? (
        <p className="mt-5 border-l border-line-strong pl-4 text-sm leading-relaxed text-secondary">
          <span className="eyebrow mb-1 block">Latest update</span>
          {latest.message}
        </p>
      ) : null}

      {initiative.nextSteps.length ? (
        <div className="mt-5">
          <p className="eyebrow">Next steps</p>
          <ul className="mt-2 list-inside list-[square] text-sm text-muted marker:text-faint">
            {initiative.nextSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {incidents.length ? (
        <div className="mt-6 flex flex-wrap gap-2 border-t border-line-soft pt-5">
          {incidents.map((i) => (
            <Link key={i.id} href={`/incidents/${i.reference}`} className="rounded-xs border border-line px-2 py-1 font-mono text-[0.64rem] text-secondary hover:border-ivory hover:text-bright" title={`${CATEGORY_LABEL[i.category]}: ${i.title}`}>
              {i.reference}
            </Link>
          ))}
        </div>
      ) : null}
    </article>
  );
}
