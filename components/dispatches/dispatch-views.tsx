"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Megaphone } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DataGate, RelativeTime } from "@/components/data/data-gate";
import { DispatchComposer } from "@/components/dispatches/dispatch-composer";
import { KirmadaPortrait } from "@/components/art/kirmada-portrait";
import { useKingdom, useVillageMap } from "@/components/providers/kingdom-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { PriorityChip, StatusChip } from "@/components/ui/marks";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { ANNOUNCEMENT_CATEGORY_LABEL } from "@/lib/labels";
import { can } from "@/lib/permissions";
import { RepositoryError } from "@/lib/data/repository";
import { concernsKirmada } from "@/lib/kirmada";
import { featuredAnnouncement, publishedAnnouncements } from "@/lib/selectors";
import { formatDateTime } from "@/lib/time";
import { useNow } from "@/lib/use-now";
import { cn, paragraphs } from "@/lib/utils";
import type { Announcement } from "@/types/domain";

export function PublishDispatchButton() {
  const { actor } = useKingdom();
  const [open, setOpen] = useState(false);
  const router = useRouter();
  if (!can(actor.role, "announcement.publish.village")) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonClasses("primary", "md")}>
        <Megaphone className="size-4" aria-hidden /> Publish a dispatch
      </DialogTrigger>
      <DialogContent title="Publish a royal dispatch" description={`Issuing as ${actor.name}`}>
        <DispatchComposer
          onPublished={(a) => {
            setOpen(false);
            router.push(`/dispatches/${a.id}`);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

type Scope = "all" | "kingdom" | "village";

export function DispatchList() {
  return (
    <DataGate>
      <DispatchListInner />
    </DataGate>
  );
}

function DispatchListInner() {
  const { snapshot, actor } = useKingdom();
  const villages = useVillageMap();
  const now = useNow();
  const [scope, setScope] = useState<Scope>("all");
  const [showArchived, setShowArchived] = useState(false);
  const staff = can(actor.role, "operations.view");

  const featured = featuredAnnouncement(snapshot.announcements);
  const source = showArchived && staff
    ? [...snapshot.announcements].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    : publishedAnnouncements(snapshot.announcements);
  const list = source.filter((a) => (scope === "all" ? true : scope === "kingdom" ? a.villageId === null : a.villageId !== null));

  return (
    <div className="flex flex-col gap-12">
      {featured ? (
        <Link
          href={`/dispatches/${featured.id}`}
          className={cn(
            "group relative grid grid-cols-1 gap-6 overflow-hidden p-7 sm:p-10 lg:grid-cols-12",
            featured.priority === "critical" ? "bg-ivory text-canvas" : "surface",
          )}
          data-testid="featured-dispatch"
        >
          <div className="lg:col-span-8">
            <p className={cn("eyebrow", featured.priority === "critical" && "!text-canvas/70")}>Most urgent dispatch</p>
            <p className={cn("display mt-5 text-[clamp(2.2rem,4.6vw,3.8rem)]", featured.priority === "critical" && "!text-canvas")}>{featured.title}</p>
            <p className={cn("mt-5 max-w-2xl text-lg leading-relaxed", featured.priority === "critical" ? "text-canvas/80" : "text-secondary")}>{featured.summary}</p>
          </div>
          <div className="flex flex-col justify-between gap-6 lg:col-span-4 lg:items-end lg:text-right">
            <PriorityChip priority={featured.priority} className={featured.priority === "critical" ? "border-canvas bg-canvas text-ivory" : ""} />
            <p className={cn("font-mono text-[0.68rem] uppercase tracking-[0.16em]", featured.priority === "critical" ? "text-canvas/70" : "text-muted")}>
              {featured.issuedBy}
              <br />
              {featured.villageId ? villages.get(featured.villageId)?.name : "Kingdom-wide"} · <RelativeTime iso={featured.publishedAt} now={now} />
              <br />
              <span className="mt-3 inline-flex items-center gap-2">
                Read in full <ArrowRight className="size-3.5" aria-hidden />
              </span>
            </p>
          </div>
        </Link>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div role="group" aria-label="Filter by scope" className="flex flex-wrap gap-1">
          {(["all", "kingdom", "village"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={scope === s}
              onClick={() => setScope(s)}
              className={cn(
                "h-9 rounded-xs border px-3 font-mono text-[0.64rem] uppercase tracking-[0.16em] transition-colors",
                scope === s ? "border-ivory text-bright" : "border-transparent text-muted hover:text-ivory",
              )}
            >
              {s === "all" ? "All" : s === "kingdom" ? "Kingdom-wide" : "Village"}
            </button>
          ))}
        </div>
        {staff ? (
          <label className="flex items-center gap-2 text-sm text-secondary">
            <input type="checkbox" className="size-4 accent-white" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            Include archived
          </label>
        ) : null}
      </div>

      {list.length === 0 ? (
        <EmptyState title="No whispers in this view">No dispatch matches this scope. Try another.</EmptyState>
      ) : (
        <ul className="grid gap-px border border-line-soft bg-line-soft md:grid-cols-2" data-testid="dispatch-list">
          {list.map((a) => (
            <li key={a.id} className="bg-canvas">
              <Link href={`/dispatches/${a.id}`} className="group flex h-full flex-col gap-4 p-6 transition-colors hover:bg-white/[0.02] sm:p-7">
                <div className="flex flex-wrap items-center gap-2.5">
                  <PriorityChip priority={a.priority} />
                  <span className="eyebrow">{ANNOUNCEMENT_CATEGORY_LABEL[a.category]}</span>
                  {a.state === "archived" ? <span className="eyebrow !text-faint">· Archived</span> : null}
                  {concernsKirmada(a.title, a.summary, a.body) ? (
                    <div className="ml-auto inline-flex items-center gap-2">
                      <span className="eyebrow">Concerns Kirmada</span>
                      <KirmadaPortrait variant="context" decorative className="w-9" />
                    </div>
                  ) : null}
                </div>
                <p className={cn("font-display text-[1.7rem] leading-tight", a.state === "archived" ? "text-muted line-through decoration-1" : "text-bright")}>{a.title}</p>
                <p className="line-clamp-3 text-sm leading-relaxed text-muted">{a.summary}</p>
                <p className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 font-mono text-[0.64rem] uppercase tracking-[0.14em] text-faint">
                  <span>
                    {a.villageId ? villages.get(a.villageId)?.name : "Kingdom-wide"} · {a.issuedBy}
                  </span>
                  <RelativeTime iso={a.publishedAt} now={now} />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DispatchDetail({ id }: { id: string }) {
  return (
    <DataGate fallback={<Skeleton className="h-96 w-full" />}>
      <DispatchDetailInner id={id} />
    </DataGate>
  );
}

function DispatchDetailInner({ id }: { id: string }) {
  const { snapshot, actor, actions } = useKingdom();
  const villages = useVillageMap();
  const now = useNow();
  const [busy, setBusy] = useState(false);
  const announcement = snapshot.announcements.find((a) => a.id === id);
  const staff = can(actor.role, "operations.view");

  if (!announcement || (announcement.state === "archived" && !staff)) {
    return (
      <EmptyState
        title="This dispatch cannot be found"
        action={
          <Link href="/dispatches" className={buttonClasses("secondary", "md")}>
            All dispatches
          </Link>
        }
      >
        It may have been withdrawn by the Royal Council, or the link is mistaken.
      </EmptyState>
    );
  }

  const village = announcement.villageId ? villages.get(announcement.villageId) : undefined;
  const related = publishedAnnouncements(snapshot.announcements)
    .filter((a) => a.id !== announcement.id && (a.villageId === announcement.villageId || a.category === announcement.category))
    .slice(0, 3);
  const relatedIncidents = snapshot.incidents
    .filter((i) =>
      announcement.villageId
        ? i.villageId === announcement.villageId
        : announcement.id === "dsp-council-artifact"
          ? i.category === "cursed_artifact"
          : false,
    )
    .slice(0, 3);

  async function toggleArchive(a: Announcement) {
    setBusy(true);
    try {
      await actions.setAnnouncementState(a.id, a.state === "published" ? "archived" : "published");
      toast.success(a.state === "published" ? "Dispatch archived" : "Dispatch republished");
    } catch (error) {
      toast.error(error instanceof RepositoryError ? error.message : "The dispatch could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article aria-labelledby="dispatch-title" className="grid grid-cols-1 gap-14 lg:grid-cols-12">
      <div className="lg:col-span-8">
        <Link href="/dispatches" className="inline-flex items-center gap-2 font-mono text-[0.66rem] uppercase tracking-[0.16em] text-muted hover:text-bright">
          <ArrowLeft className="size-3.5" aria-hidden /> Whispers from the Crown
        </Link>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <span className="eyebrow">Royal dispatch ·</span>
          <PriorityChip priority={announcement.priority} />
          <span className="eyebrow">{ANNOUNCEMENT_CATEGORY_LABEL[announcement.category]}</span>
          {announcement.state === "archived" ? <span className="eyebrow !text-bright">Archived</span> : null}
        </div>
        <h1 id="dispatch-title" className="display mt-6 text-[clamp(2.4rem,5.4vw,4.4rem)]">
          {announcement.title}
        </h1>
        <p className="mt-6 border-l border-ivory pl-5 text-xl leading-relaxed text-secondary">{announcement.summary}</p>
        <div className="prose-noir mt-10 max-w-2xl text-[1.06rem] leading-[1.8] text-ivory/90" data-testid="dispatch-body">
          {paragraphs(announcement.body).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <p className="mt-12 font-display text-2xl italic text-muted">— {announcement.issuedBy}</p>
      </div>

      <aside className="flex flex-col gap-8 lg:col-span-4 lg:pt-24" aria-label="Dispatch details">
        {concernsKirmada(announcement.title, announcement.summary, announcement.body) ? (
          <KirmadaPortrait
            variant="lore"
            className="w-full max-w-xs"
            alt="Kirmada, the sorcerer this dispatch concerns, shown in monochrome"
            caption={
              <span className="flex flex-col gap-1">
                <span className="eyebrow">This dispatch concerns</span>
                <span className="gothic text-lg tracking-[0.14em] text-bright">Kirmada</span>
                <Link href="/grimoire" className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-secondary underline-offset-4 hover:text-bright hover:underline">
                  Read his entry in the Grimoire
                </Link>
              </span>
            }
          />
        ) : null}
        <dl className="flex flex-col divide-y divide-line-soft border-y border-line-soft text-sm">
          {[
            ["Issued by", announcement.issuedBy],
            ["Published", formatDateTime(announcement.publishedAt)],
            ["Scope", village ? village.name : "Kingdom-wide"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 py-3">
              <dt className="eyebrow">{k}</dt>
              <dd className="text-right text-secondary">{v}</dd>
            </div>
          ))}
        </dl>
        {village ? (
          <Link href={`/villages/${village.id}`} className={buttonClasses("secondary", "md")}>
            {village.name} status <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
        {can(actor.role, "announcement.archive") ? (
          <Button variant="secondary" disabled={busy} onClick={() => void toggleArchive(announcement)}>
            {announcement.state === "published" ? "Archive this dispatch" : "Republish this dispatch"}
          </Button>
        ) : null}
        {relatedIncidents.length ? (
          <section aria-labelledby="dispatch-incidents-heading">
            <h2 id="dispatch-incidents-heading" className="eyebrow">
              Related incident records
            </h2>
            <ul className="mt-3">
              {relatedIncidents.map((inc) => (
                <li key={inc.id} className="border-b border-line-soft">
                  <Link href={`/incidents/${inc.reference}`} className="group block py-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs text-faint">{inc.reference}</span>
                      <StatusChip status={inc.status} />
                    </div>
                    <p className="mt-1.5 text-sm text-secondary group-hover:text-bright">{inc.title}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
        {related.length ? (
          <section aria-labelledby="related-heading">
            <h2 id="related-heading" className="eyebrow">
              Related dispatches
            </h2>
            <ul className="mt-3">
              {related.map((a) => (
                <li key={a.id} className="border-b border-line-soft">
                  <Link href={`/dispatches/${a.id}`} className="group block py-4">
                    <p className="font-display text-lg leading-snug text-ivory group-hover:text-bright">{a.title}</p>
                    <p className="mt-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-faint">
                      <RelativeTime iso={a.publishedAt} now={now} />
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </aside>
    </article>
  );
}
