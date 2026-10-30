"use client";

import { Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useKingdom } from "@/components/providers/kingdom-provider";
import { Button } from "@/components/ui/button";
import { Field, Select, Textarea } from "@/components/ui/field";
import { StatusGlyph } from "@/components/ui/marks";
import { RESPONSE_TEAMS } from "@/lib/config";
import { RepositoryError } from "@/lib/data/repository";
import { STATUS_LABEL } from "@/lib/labels";
import { ALLOWED_TRANSITIONS, can } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { incidentNoteSchema, transitionSchema } from "@/lib/validation";
import type { Incident, IncidentStatus } from "@/types/domain";

const ACTION_LABEL: Record<IncidentStatus, string> = {
  submitted: "Submit",
  acknowledged: "Acknowledge & assign",
  in_restoration: "Begin restoration",
  resolved: "Mark resolved",
};

function actionLabel(from: IncidentStatus, to: IncidentStatus) {
  if (from === "resolved" && to === "in_restoration") return "Reopen into restoration";
  return ACTION_LABEL[to];
}

/** Steward / Council controls for one incident. Hidden entirely for citizens. */
export function IncidentActions({ incident, compact = false }: { incident: Incident; compact?: boolean }) {
  const { actor, actions } = useKingdom();
  const uid = useId();
  const options = ALLOWED_TRANSITIONS[incident.status];
  const [target, setTarget] = useState<IncidentStatus>(options[0]);
  const [team, setTeam] = useState<string>(incident.assignedTeam ?? "");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const [update, setUpdate] = useState("");
  const [updateError, setUpdateError] = useState<string>();
  const [posting, setPosting] = useState(false);

  if (!can(actor.role, "incident.transition")) return null;

  // Keep the chosen transition valid if the incident changed underneath us.
  const selected = options.includes(target) ? target : options[0];

  async function submitTransition(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      to: selected,
      team: selected === "acknowledged" ? team || undefined : undefined,
      note: note.trim() || undefined,
    };
    const parsed = transitionSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0] ?? "form")] = issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await actions.transitionIncident(incident.id, parsed.data);
      toast.success(`${incident.reference} → ${STATUS_LABEL[selected]}`);
      setNote("");
    } catch (error) {
      const message = error instanceof RepositoryError ? error.message : "The status could not be changed.";
      setErrors(error instanceof RepositoryError ? { ...error.fields, form: message } : { form: message });
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function submitUpdate(e: React.FormEvent) {
    e.preventDefault();
    const parsed = incidentNoteSchema.safeParse({ message: update });
    if (!parsed.success) {
      setUpdateError(parsed.error.issues[0]?.message);
      return;
    }
    setUpdateError(undefined);
    setPosting(true);
    try {
      await actions.addIncidentNote(incident.id, parsed.data);
      setUpdate("");
      toast.success("Update posted to the public record");
    } catch (error) {
      const message = error instanceof RepositoryError ? error.message : "The update could not be posted.";
      setUpdateError(message);
      toast.error(message);
    } finally {
      setPosting(false);
    }
  }

  const isReopen = incident.status === "resolved" && selected === "in_restoration";

  return (
    <div className={cn("flex flex-col gap-6", compact ? "" : "surface p-5 sm:p-6")}>
      {!compact && (
        <div>
          <p className="eyebrow">Steward&apos;s desk · {actor.name}</p>
          <p className="mt-1 text-xs text-muted">Changes appear immediately on the public record and timeline.</p>
        </div>
      )}

      <form onSubmit={submitTransition} className="flex flex-col gap-4" aria-label={`Change status of ${incident.reference}`}>
        <fieldset>
          <legend className="text-sm font-medium text-ivory">Move this incident to</legend>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {options.map((option) => (
              <label
                key={option}
                className={cn(
                  "inline-flex cursor-pointer items-center gap-2 rounded-xs border px-3 py-2 font-mono text-[0.66rem] uppercase tracking-[0.14em] transition-colors",
                  selected === option ? "border-ivory bg-white/[0.06] text-bright" : "border-line text-muted hover:text-ivory",
                )}
              >
                <input
                  type="radio"
                  name={`${uid}-to`}
                  value={option}
                  checked={selected === option}
                  onChange={() => setTarget(option)}
                  className="sr-only"
                />
                <StatusGlyph status={option} />
                {STATUS_LABEL[option]}
              </label>
            ))}
          </div>
        </fieldset>

        {selected === "acknowledged" ? (
          <Field id={`${uid}-team`} label="Assign response team" error={errors.team}>
            <Select
              id={`${uid}-team`}
              value={team}
              onChange={(e) => setTeam(e.target.value)}
              aria-invalid={!!errors.team}
              aria-describedby={errors.team ? `${uid}-team-error` : undefined}
            >
              <option value="">Choose a team…</option>
              {RESPONSE_TEAMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field
          id={`${uid}-note`}
          label={
            selected === "resolved"
              ? "How was it resolved?"
              : isReopen
                ? "Reason for reopening"
                : "Note for citizens"
          }
          optional={selected !== "resolved"}
          error={errors.note}
        >
          <Textarea
            id={`${uid}-note`}
            rows={3}
            className="min-h-24"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={
              selected === "resolved"
                ? "What was done, and is anything still unsafe?"
                : isReopen
                  ? "Why is this incident being reopened into restoration?"
                  : "Shown on the public timeline."
            }
            aria-invalid={!!errors.note}
            aria-describedby={errors.note ? `${uid}-note-error` : undefined}
          />
        </Field>

        {errors.form && !errors.team && !errors.note ? (
          <p role="alert" className="text-sm text-bright">
            {errors.form}
          </p>
        ) : null}

        <Button type="submit" disabled={busy} className="self-start" data-testid="transition-submit">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {actionLabel(incident.status, selected)}
        </Button>
      </form>

      <form onSubmit={submitUpdate} className="flex flex-col gap-3 border-t border-line-soft pt-6" aria-label={`Post an update to ${incident.reference}`}>
        <Field id={`${uid}-update`} label="Post a progress update" error={updateError}>
          <Textarea
            id={`${uid}-update`}
            rows={3}
            className="min-h-24"
            value={update}
            onChange={(e) => setUpdate(e.target.value)}
            placeholder="e.g. Wardwrights re-inscribed four stones overnight."
            aria-invalid={!!updateError}
            aria-describedby={updateError ? `${uid}-update-error` : undefined}
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={posting} className="self-start" data-testid="update-submit">
          {posting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          Post update
        </Button>
      </form>
    </div>
  );
}
