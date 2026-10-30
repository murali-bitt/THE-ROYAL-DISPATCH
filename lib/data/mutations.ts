import type { z } from "zod";
import { REFERENCE_PREFIX } from "@/lib/config";
import { assertCan, canTransition } from "@/lib/permissions";
import { STATUS_LABEL } from "@/lib/labels";
import { createId } from "@/lib/utils";
import {
  announcementSchema,
  fieldErrors,
  incidentNoteSchema,
  milestoneSchema,
  newIncidentSchema,
  transitionSchema,
  villageManageSchema,
  villageProgressSchema,
  type AnnouncementInput,
  type IncidentNoteInput,
  type MilestoneInput,
  type NewIncidentInput,
  type TransitionInput,
  type VillageManageInput,
  type VillageProgressInput,
} from "@/lib/validation";
import {
  AWAKENING_ANNOUNCEMENT,
  AWAKENING_INCIDENTS,
  formatReference,
  type KingdomState,
} from "@/lib/data/seed";
import type {
  Actor,
  Announcement,
  Incident,
  IncidentUpdate,
  Initiative,
  PublicationState,
  Village,
} from "@/types/domain";

/**
 * Pure state transitions for the kingdom. Each function validates its input,
 * checks the actor's permission, and returns a new state plus the changed
 * record. The local demo repository persists the result; the unit tests
 * exercise these directly.
 */

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} could not be found.`);
    this.name = "NotFoundError";
  }
}

export class DomainValidationError extends Error {
  constructor(
    message: string,
    public fields: Record<string, string> = {},
  ) {
    super(message);
    this.name = "DomainValidationError";
  }
}

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    const fields = fieldErrors(result.error);
    throw new DomainValidationError(Object.values(fields)[0] ?? "Invalid input.", fields);
  }
  return result.data;
}

function replace<T extends { id: string }>(list: T[], next: T): T[] {
  return list.map((item) => (item.id === next.id ? next : item));
}

function findIncident(state: KingdomState, id: string): Incident {
  const incident = state.incidents.find((i) => i.id === id);
  if (!incident) throw new NotFoundError("That incident");
  return incident;
}

function findVillage(state: KingdomState, id: string): Village {
  const village = state.villages.find((v) => v.id === id);
  if (!village) throw new NotFoundError("That village");
  return village;
}

export function createIncident(
  state: KingdomState,
  rawInput: NewIncidentInput,
  actor: Actor,
  now: Date = new Date(),
): { state: KingdomState; incident: Incident } {
  assertCan(actor.role, "incident.create");
  const input = parse(newIncidentSchema, rawInput);
  findVillage(state, input.villageId);

  const at = now.toISOString();
  const sequence = state.nextSequence;
  const name = input.anonymous ? null : input.reporterName || null;
  const incident: Incident = {
    id: createId("inc"),
    reference: formatReference(REFERENCE_PREFIX, now.getFullYear(), sequence),
    title: input.title,
    description: input.description,
    category: input.category,
    severity: input.severity,
    villageId: input.villageId,
    location: input.location,
    submittedAt: at,
    updatedAt: at,
    status: "submitted",
    reporter: { anonymous: input.anonymous, name },
    assignedTeam: null,
    attachment: input.attachment,
    updates: [
      {
        id: createId("upd"),
        at,
        kind: "submitted",
        message: "Report received by the Royal Dispatch.",
        authorName: "The Royal Dispatch",
        authorRole: "system",
      },
    ],
  };

  return {
    state: { ...state, nextSequence: sequence + 1, incidents: [incident, ...state.incidents] },
    incident,
  };
}

export function transitionIncident(
  state: KingdomState,
  incidentId: string,
  rawInput: TransitionInput,
  actor: Actor,
  now: Date = new Date(),
): { state: KingdomState; incident: Incident } {
  assertCan(actor.role, "incident.transition");
  const input = parse(transitionSchema, rawInput);
  const incident = findIncident(state, incidentId);

  if (!canTransition(incident.status, input.to)) {
    throw new DomainValidationError(
      `An incident that is ${STATUS_LABEL[incident.status].toLowerCase()} cannot move to ${STATUS_LABEL[input.to].toLowerCase()}.`,
    );
  }

  const at = now.toISOString();
  const isReopen = incident.status === "resolved" && input.to === "in_restoration";
  const defaultMessage: Record<string, string> = {
    acknowledged: `Acknowledged and assigned to ${input.team}.`,
    in_restoration: isReopen
      ? "Reopened into restoration for further work."
      : "Response team on site. Restoration under way.",
    resolved: "Marked as resolved.",
  };
  const update: IncidentUpdate = {
    id: createId("upd"),
    at,
    kind: "status",
    message: input.note || defaultMessage[input.to] || `Status changed to ${STATUS_LABEL[input.to]}.`,
    authorName: actor.name,
    authorRole: actor.role,
    fromStatus: incident.status,
    toStatus: input.to,
  };

  const next: Incident = {
    ...incident,
    status: input.to,
    assignedTeam: input.team ?? incident.assignedTeam,
    updatedAt: at,
    updates: [...incident.updates, update],
  };
  return { state: { ...state, incidents: replace(state.incidents, next) }, incident: next };
}

export function addIncidentNote(
  state: KingdomState,
  incidentId: string,
  rawInput: IncidentNoteInput,
  actor: Actor,
  now: Date = new Date(),
): { state: KingdomState; incident: Incident } {
  assertCan(actor.role, "incident.note");
  const input = parse(incidentNoteSchema, rawInput);
  const incident = findIncident(state, incidentId);
  const at = now.toISOString();
  const next: Incident = {
    ...incident,
    updatedAt: at,
    updates: [
      ...incident.updates,
      {
        id: createId("upd"),
        at,
        kind: "note",
        message: input.message,
        authorName: actor.name,
        authorRole: actor.role,
      },
    ],
  };
  return { state: { ...state, incidents: replace(state.incidents, next) }, incident: next };
}

export function updateVillageProgress(
  state: KingdomState,
  villageId: string,
  rawInput: VillageProgressInput,
  actor: Actor,
  now: Date = new Date(),
): { state: KingdomState; village: Village } {
  assertCan(actor.role, "village.progress");
  const input = parse(villageProgressSchema, rawInput);
  const village = findVillage(state, villageId);
  const at = now.toISOString();
  const next: Village = {
    ...village,
    restoration: input.restoration,
    updatedAt: at,
    log: [
      ...village.log,
      {
        id: createId("vlog"),
        at,
        message: input.message,
        authorName: actor.name,
        restoration: input.restoration,
      },
    ],
  };
  return { state: { ...state, villages: replace(state.villages, next) }, village: next };
}

export function manageVillage(
  state: KingdomState,
  villageId: string,
  rawInput: VillageManageInput,
  actor: Actor,
  now: Date = new Date(),
): { state: KingdomState; village: Village } {
  assertCan(actor.role, "village.manage");
  const input = parse(villageManageSchema, rawInput);
  const village = findVillage(state, villageId);
  const next: Village = {
    ...village,
    condition: input.condition,
    description: input.description,
    services: { ...input.services },
    updatedAt: now.toISOString(),
  };
  return { state: { ...state, villages: replace(state.villages, next) }, village: next };
}

export function publishAnnouncement(
  state: KingdomState,
  rawInput: AnnouncementInput,
  actor: Actor,
  now: Date = new Date(),
): { state: KingdomState; announcement: Announcement } {
  const input = parse(announcementSchema, rawInput);
  assertCan(actor.role, input.villageId ? "announcement.publish.village" : "announcement.publish.kingdom");
  if (input.villageId) findVillage(state, input.villageId);
  const announcement: Announcement = {
    id: createId("dsp"),
    title: input.title,
    summary: input.summary,
    body: input.body,
    priority: input.priority,
    category: input.category,
    villageId: input.villageId,
    issuedBy: input.issuedBy,
    publishedAt: now.toISOString(),
    state: "published",
  };
  return {
    state: { ...state, announcements: [announcement, ...state.announcements] },
    announcement,
  };
}

export function setAnnouncementState(
  state: KingdomState,
  announcementId: string,
  publication: PublicationState,
  actor: Actor,
): { state: KingdomState; announcement: Announcement } {
  assertCan(actor.role, "announcement.archive");
  const announcement = state.announcements.find((a) => a.id === announcementId);
  if (!announcement) throw new NotFoundError("That dispatch");
  const next = { ...announcement, state: publication };
  return { state: { ...state, announcements: replace(state.announcements, next) }, announcement: next };
}

export function setMilestone(
  state: KingdomState,
  initiativeId: string,
  rawInput: MilestoneInput,
  actor: Actor,
  now: Date = new Date(),
): { state: KingdomState; initiative: Initiative } {
  assertCan(actor.role, "initiative.update");
  const input = parse(milestoneSchema, rawInput);
  const initiative = state.initiatives.find((i) => i.id === initiativeId);
  if (!initiative) throw new NotFoundError("That restoration initiative");
  const milestone = initiative.milestones.find((m) => m.id === input.milestoneId);
  if (!milestone) throw new NotFoundError("That milestone");

  const at = now.toISOString();
  const verb = input.done ? "Completed" : "Reopened";
  const next: Initiative = {
    ...initiative,
    milestones: initiative.milestones.map((m) =>
      m.id === milestone.id ? { ...m, done: input.done, doneAt: input.done ? at : null } : m,
    ),
    updates: [
      ...initiative.updates,
      {
        id: createId("iup"),
        at,
        message: input.note ? `${verb}: ${milestone.title}. ${input.note}` : `${verb}: ${milestone.title}.`,
        authorName: actor.name,
      },
    ],
  };
  return { state: { ...state, initiatives: replace(state.initiatives, next) }, initiative: next };
}

/**
 * Surface the awakening records exactly once. Idempotent: calling it again
 * after the awakening has been applied returns the state unchanged.
 * Existing reports and restoration data are never modified.
 */
export function applyAwakening(state: KingdomState, now: Date = new Date()): KingdomState {
  if (state.awakeningAppliedAt) return state;
  const at = now.toISOString();
  let sequence = state.nextSequence;
  const surfaced: Incident[] = AWAKENING_INCIDENTS.map((seed) => {
    const incident: Incident = {
      ...seed,
      id: createId("inc"),
      reference: formatReference(REFERENCE_PREFIX, now.getFullYear(), sequence),
      submittedAt: at,
      updatedAt: at,
      status: "submitted",
      assignedTeam: null,
      attachment: null,
      updates: [
        {
          id: createId("upd"),
          at,
          kind: "submitted",
          message: "Raised automatically by the Watch when the Sleeper awakened.",
          authorName: "The Royal Dispatch",
          authorRole: "system",
        },
      ],
    };
    sequence += 1;
    return incident;
  });

  const announcement: Announcement = { ...AWAKENING_ANNOUNCEMENT, publishedAt: at };
  return {
    ...state,
    nextSequence: sequence,
    incidents: [...surfaced, ...state.incidents],
    announcements: [announcement, ...state.announcements.filter((a) => a.id !== announcement.id)],
    awakeningAppliedAt: at,
  };
}
