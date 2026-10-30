"use client";

import Link from "next/link";
import { Tabs } from "radix-ui";
import { ArrowUpRight, Lock, Loader2 } from "lucide-react";
import { useId, useLayoutEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { DataGate, RelativeTime } from "@/components/data/data-gate";
import { DispatchComposer } from "@/components/dispatches/dispatch-composer";
import { IncidentActions } from "@/components/incidents/incident-actions";
import { useKingdom, useVillageMap } from "@/components/providers/kingdom-provider";
import { InitiativeCard } from "@/components/restoration/restoration-view";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Select, Textarea } from "@/components/ui/field";
import { ConditionChip, PriorityChip, SeverityChip, StatusChip } from "@/components/ui/marks";
import { EmptyState } from "@/components/ui/states";
import { RepositoryError } from "@/lib/data/repository";
import {
  CONDITION_LABEL,
  ROLE_LABEL,
  SERVICE_LABEL,
  SERVICE_STATE_LABEL,
  SEVERITY_LABEL,
  STATUS_LABEL,
} from "@/lib/labels";
import { can, isStaff } from "@/lib/permissions";
import { initiativeStatus, isOpen, sortIncidents, triageQueue } from "@/lib/selectors";
import { useNow } from "@/lib/use-now";
import { cn } from "@/lib/utils";
import { villageProgressSchema } from "@/lib/validation";
import {
  INCIDENT_SEVERITIES,
  SERVICE_KEYS,
  SERVICE_STATES,
  VILLAGE_CONDITIONS,
  type Incident,
  type Village,
} from "@/types/domain";

export function OperationsConsole() {
  return (
    <DataGate>
      <OperationsGate />
    </DataGate>
  );
}

function OperationsGate() {
  const { actor, mode, setDemoRole, signedIn } = useKingdom();
  if (!isStaff(actor.role)) {
    return (
      <div className="surface mx-auto flex max-w-2xl flex-col items-start gap-5 p-8 sm:p-10">
        <Lock className="size-6 text-ivory" aria-hidden />
        <h2 className="display text-4xl">Restricted to officers of the Crown</h2>
        <p className="leading-relaxed text-secondary">
          The operations desk is where village stewards triage reports, post updates and set restoration progress. You
          are browsing as a <span className="text-ivory">{ROLE_LABEL[actor.role]}</span>.
        </p>
        {mode === "demo" ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted">This is a demo. Choose a role to explore the desk (simulation only):</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => setDemoRole("steward")} data-testid="become-steward">
                Act as Village Steward
              </Button>
              <Button variant="secondary" onClick={() => setDemoRole("admin")}>
                Act as Royal Council
              </Button>
            </div>
          </div>
        ) : (
          <Link href="/sign-in" className={buttonClasses("primary", "md")}>
            {signedIn ? "Your account has citizen access" : "Sign in as a steward"}
          </Link>
        )}
      </div>
    );
  }
  return <OperationsDesk />;
}

function OperationsDesk() {
  const { snapshot, actor } = useKingdom();
  const queue = triageQueue(snapshot.incidents);
  const submitted = queue.filter((i) => i.status === "submitted").length;
  const critical = queue.filter((i) => i.severity === "critical").length;

  return (
    <div>
      <div className="mb-10 grid grid-cols-2 gap-px border border-line-soft bg-line-soft md:grid-cols-4">
        {[
          ["Awaiting review", submitted],
          ["Open in queue", queue.length],
          ["Critical open", critical],
          ["Active efforts", snapshot.initiatives.filter((i) => initiativeStatus(i) !== "completed").length],
        ].map(([label, value]) => (
          <div key={label} className="bg-canvas p-5">
            <p className="eyebrow">{label}</p>
            <p className="mt-2 font-display text-5xl leading-none text-bright tabular">{value}</p>
          </div>
        ))}
      </div>

      <Tabs.Root defaultValue="queue">
        <Tabs.List aria-label="Operations sections" className="flex gap-1 overflow-x-auto border-b border-line">
          {[
            ["queue", "Incoming queue"],
            ["villages", "Villages"],
            ["dispatches", "Dispatches"],
            ["restoration", "Restoration"],
          ].map(([value, label]) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="relative -mb-px h-11 shrink-0 border-b border-transparent px-4 font-mono text-[0.68rem] uppercase tracking-[0.16em] text-muted transition-colors hover:text-ivory data-[state=active]:border-ivory data-[state=active]:text-bright"
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="queue" className="pt-8 focus:outline-none">
          <Queue />
        </Tabs.Content>
        <Tabs.Content value="villages" className="pt-8 focus:outline-none">
          <VillageControls />
        </Tabs.Content>
        <Tabs.Content value="dispatches" className="pt-8 focus:outline-none">
          <DispatchDesk />
        </Tabs.Content>
        <Tabs.Content value="restoration" className="pt-8 focus:outline-none">
          <div className="grid gap-6 lg:grid-cols-2">
            {snapshot.initiatives.map((i) => (
              <InitiativeCard key={i.id} initiative={i} villageName={snapshot.villages.find((v) => v.id === i.villageId)?.name ?? ""} />
            ))}
          </div>
        </Tabs.Content>
      </Tabs.Root>
      <p className="mt-10 text-xs text-faint">Signed in as {actor.name} · {ROLE_LABEL[actor.role]}</p>
    </div>
  );
}

/* Queue -------------------------------------------------------------- */

function Queue() {
  const { snapshot } = useKingdom();
  const villages = useVillageMap();
  const now = useNow();
  const [status, setStatus] = useState<string>("open");
  const [village, setVillage] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [activeId, setActiveId] = useState<string | null>(null);

  // Close the drawer if this page is hidden by navigation (Activity).
  useLayoutEffect(() => () => setActiveId(null), []);

  const list = useMemo(() => {
    // Open incidents in triage order, then resolved ones by most recent.
    const ordered = [
      ...triageQueue(snapshot.incidents),
      ...sortIncidents(snapshot.incidents.filter((i) => !isOpen(i)), "updated"),
    ];
    return ordered.filter(
      (i) =>
        (status === "all" || (status === "open" ? isOpen(i) : i.status === status)) &&
        (village === "all" || i.villageId === village) &&
        (severity === "all" || i.severity === severity),
    );
  }, [snapshot.incidents, status, village, severity]);

  const active = snapshot.incidents.find((i) => i.id === activeId) ?? null;

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4">
        <QueueFilter label="Status" value={status} onChange={setStatus}>
          <option value="open">Open (triage order)</option>
          <option value="all">Everything</option>
          {(["submitted", "acknowledged", "in_restoration", "resolved"] as const).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </QueueFilter>
        <QueueFilter label="Village" value={village} onChange={setVillage}>
          <option value="all">All villages</option>
          {snapshot.villages.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </QueueFilter>
        <QueueFilter label="Severity" value={severity} onChange={setSeverity}>
          <option value="all">All severities</option>
          {INCIDENT_SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {SEVERITY_LABEL[s]}
            </option>
          ))}
        </QueueFilter>
        <p className="ml-auto font-mono text-xs text-muted" aria-live="polite">
          {list.length} in view
        </p>
      </div>

      {list.length === 0 ? (
        <EmptyState className="mt-8" title="The Night Watch is quiet">
          No reports in the queue match these filters.
        </EmptyState>
      ) : (
        <ul className="mt-6 border-t border-line" data-testid="ops-queue">
          {list.map((i) => (
            <li key={i.id} className="grid items-center gap-x-5 gap-y-3 border-b border-line-soft py-4 md:grid-cols-[8rem_minmax(0,1fr)_auto_auto]">
              <div>
                <p className="font-mono text-xs text-secondary">{i.reference}</p>
                <RelativeTime iso={i.submittedAt} now={now} className="font-mono text-[0.62rem] uppercase tracking-[0.12em] text-faint" />
              </div>
              <div className="min-w-0">
                <p className="truncate font-display text-xl text-bright">{i.title}</p>
                <p className="mt-0.5 text-xs text-muted">
                  {villages.get(i.villageId)?.name} · {i.assignedTeam ?? "Unassigned"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <SeverityChip severity={i.severity} />
                <StatusChip status={i.status} />
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant={i.status === "submitted" ? "primary" : "secondary"} onClick={() => setActiveId(i.id)} data-testid={`manage-${i.reference}`}>
                  {i.status === "submitted" ? "Review" : "Manage"}
                </Button>
                <Link href={`/incidents/${i.reference}`} className={buttonClasses("ghost", "sm", "px-2")} aria-label={`Open full record ${i.reference}`}>
                  <ArrowUpRight className="size-4" aria-hidden />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={active !== null} onOpenChange={(open) => !open && setActiveId(null)}>
        {active ? <QueueDrawer incident={active} villageName={villages.get(active.villageId)?.name ?? ""} /> : null}
      </Dialog>
    </div>
  );
}

function QueueDrawer({ incident, villageName }: { incident: Incident; villageName: string }) {
  return (
    <DialogContent title={incident.title} description={`${incident.reference} · ${villageName}`}>
      <div className="flex flex-wrap gap-2">
        <SeverityChip severity={incident.severity} />
        <StatusChip status={incident.status} />
      </div>
      <p className="mt-4 text-sm leading-relaxed text-secondary">{incident.description}</p>
      <p className="mt-3 text-xs text-muted">Location: {incident.location}</p>
      <div className="mt-6 border-t border-line-soft pt-6">
        <IncidentActions incident={incident} compact />
      </div>
      <Link href={`/incidents/${incident.reference}`} className={buttonClasses("ghost", "sm", "mt-6 -ml-3")}>
        Open the full record & timeline <ArrowUpRight className="size-3.5" aria-hidden />
      </Link>
    </DialogContent>
  );
}

function QueueFilter({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  const id = useId();
  return (
    <div className="flex min-w-40 flex-col gap-1.5">
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-10 text-sm">
        {children}
      </Select>
    </div>
  );
}

/* Villages ----------------------------------------------------------- */

function VillageControls() {
  const { snapshot, actor } = useKingdom();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {snapshot.villages.map((v) => (
        <div key={v.id} className="surface flex flex-col gap-6 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-display text-3xl text-bright">{v.name}</p>
              <p className="text-xs text-muted">{v.epithet}</p>
            </div>
            <ConditionChip condition={v.condition} />
          </div>
          <ProgressForm village={v} />
          {can(actor.role, "village.manage") ? <RecordForm village={v} /> : null}
        </div>
      ))}
    </div>
  );
}

function ProgressForm({ village }: { village: Village }) {
  const { actions } = useKingdom();
  const uid = useId();
  const [value, setValue] = useState(village.restoration);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = villageProgressSchema.safeParse({ restoration: value, message });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setBusy(true);
    try {
      await actions.updateVillageProgress(village.id, parsed.data);
      setMessage("");
      toast.success(`${village.name} restoration set to ${value}%`);
    } catch (err) {
      const msg = err instanceof RepositoryError ? err.message : "The village could not be updated.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4" aria-label={`Update ${village.name} restoration`}>
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor={`${uid}-range`} className="text-sm font-medium text-ivory">
            Restoration progress
          </label>
          <output htmlFor={`${uid}-range`} className="font-mono text-sm text-bright tabular">
            {value}%
          </output>
        </div>
        <input
          id={`${uid}-range`}
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="mt-3 w-full accent-white"
          data-testid={`range-${village.id}`}
        />
        <p className="mt-1 text-xs text-muted">Currently recorded: {village.restoration}%</p>
      </div>
      <Field id={`${uid}-note`} label="What changed?" error={error}>
        <Textarea
          id={`${uid}-note`}
          rows={2}
          className="min-h-20"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Shown on the village's restoration log."
          aria-invalid={!!error}
          aria-describedby={error ? `${uid}-note-error` : undefined}
          data-testid={`note-${village.id}`}
        />
      </Field>
      <Button type="submit" variant="secondary" size="sm" disabled={busy} className="self-start" data-testid={`save-${village.id}`}>
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        Record progress
      </Button>
    </form>
  );
}

function RecordForm({ village }: { village: Village }) {
  const { actions } = useKingdom();
  const uid = useId();
  const [condition, setCondition] = useState(village.condition);
  const [services, setServices] = useState(village.services);
  const [description, setDescription] = useState(village.description);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await actions.manageVillage(village.id, { condition, services, description });
      toast.success(`${village.name} record updated`);
    } catch (err) {
      toast.error(err instanceof RepositoryError ? err.message : "The record could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="group border-t border-line-soft pt-4">
      <summary className="cursor-pointer list-none font-mono text-[0.66rem] uppercase tracking-[0.16em] text-secondary hover:text-bright">
        <span className="group-open:hidden">+ </span>
        <span className="hidden group-open:inline">− </span>
        Council: edit village record
      </summary>
      <form onSubmit={submit} className="mt-4 flex flex-col gap-4">
        <Field id={`${uid}-cond`} label="Overall condition">
          <Select id={`${uid}-cond`} value={condition} onChange={(e) => setCondition(e.target.value as Village["condition"])}>
            {VILLAGE_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABEL[c]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          {SERVICE_KEYS.map((key) => (
            <Field key={key} id={`${uid}-${key}`} label={SERVICE_LABEL[key]}>
              <Select
                id={`${uid}-${key}`}
                value={services[key]}
                onChange={(e) => setServices({ ...services, [key]: e.target.value as Village["services"][typeof key] })}
                className="h-10 text-sm"
              >
                {SERVICE_STATES.map((s) => (
                  <option key={s} value={s}>
                    {SERVICE_STATE_LABEL[s]}
                  </option>
                ))}
              </Select>
            </Field>
          ))}
        </div>
        <Field id={`${uid}-desc`} label="Description">
          <Textarea id={`${uid}-desc`} rows={3} className="min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Button type="submit" size="sm" disabled={busy} className="self-start">
          Save record
        </Button>
      </form>
    </details>
  );
}

/* Dispatches --------------------------------------------------------- */

function DispatchDesk() {
  const { snapshot, actor, actions } = useKingdom();
  const villages = useVillageMap();
  const now = useNow();
  const canArchive = can(actor.role, "announcement.archive");
  const sorted = [...snapshot.announcements].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
      <section className="lg:col-span-7" aria-labelledby="compose-heading">
        <h2 id="compose-heading" className="font-display text-3xl text-bright">
          Publish a dispatch
        </h2>
        <p className="mt-1 text-sm text-muted">
          {can(actor.role, "announcement.publish.kingdom") ? "As the Royal Council you may issue kingdom-wide dispatches." : "Stewards issue dispatches for a single village."}
        </p>
        <div className="mt-6">
          <DispatchComposer />
        </div>
      </section>
      <section className="lg:col-span-5" aria-labelledby="issued-heading">
        <h2 id="issued-heading" className="eyebrow">
          Issued dispatches
        </h2>
        <ul className="mt-4">
          {sorted.map((a) => (
            <li key={a.id} className="flex items-start justify-between gap-3 border-b border-line-soft py-4">
              <Link href={`/dispatches/${a.id}`} className="min-w-0 group">
                <div className="flex items-center gap-2">
                  <PriorityChip priority={a.priority} />
                  <span className={cn("eyebrow !text-[0.6rem]", a.state === "archived" && "!text-faint")}>{a.state}</span>
                </div>
                <p className={cn("mt-2 font-display text-lg leading-snug group-hover:text-bright", a.state === "archived" ? "text-muted" : "text-ivory")}>{a.title}</p>
                <p className="mt-0.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-faint">
                  {a.villageId ? villages.get(a.villageId)?.name : "Kingdom-wide"} · <RelativeTime iso={a.publishedAt} now={now} />
                </p>
              </Link>
              {canArchive ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await actions.setAnnouncementState(a.id, a.state === "published" ? "archived" : "published");
                      toast.success(a.state === "published" ? "Archived" : "Republished");
                    } catch (err) {
                      toast.error(err instanceof RepositoryError ? err.message : "Could not update the dispatch.");
                    }
                  }}
                >
                  {a.state === "published" ? "Archive" : "Restore"}
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
