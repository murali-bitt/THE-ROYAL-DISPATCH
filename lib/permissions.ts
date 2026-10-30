import type { IncidentStatus, Role } from "@/types/domain";

/**
 * One permission table shared by the UI (to hide controls), the local demo
 * repository (to reject forbidden mutations) and the API routes (to enforce
 * them on the server). Database RLS policies mirror the same rules.
 */
export type Permission =
  | "incident.create"
  | "incident.transition"
  | "incident.note"
  | "village.progress"
  | "village.manage"
  | "announcement.publish.village"
  | "announcement.publish.kingdom"
  | "announcement.archive"
  | "initiative.update"
  | "operations.view";

const GRANTS: Record<Role, readonly Permission[]> = {
  citizen: ["incident.create"],
  steward: [
    "incident.create",
    "incident.transition",
    "incident.note",
    "village.progress",
    "announcement.publish.village",
    "initiative.update",
    "operations.view",
  ],
  admin: [
    "incident.create",
    "incident.transition",
    "incident.note",
    "village.progress",
    "village.manage",
    "announcement.publish.village",
    "announcement.publish.kingdom",
    "announcement.archive",
    "initiative.update",
    "operations.view",
  ],
};

export function can(role: Role, permission: Permission): boolean {
  return GRANTS[role].includes(permission);
}

export function isStaff(role: Role): boolean {
  return can(role, "operations.view");
}

/** The incident lifecycle. Resolved incidents may be reopened into restoration. */
export const ALLOWED_TRANSITIONS: Record<IncidentStatus, readonly IncidentStatus[]> = {
  submitted: ["acknowledged"],
  acknowledged: ["in_restoration", "resolved"],
  in_restoration: ["resolved"],
  resolved: ["in_restoration"],
};

export function canTransition(from: IncidentStatus, to: IncidentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export class PermissionError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "PermissionError";
  }
}

export function assertCan(role: Role, permission: Permission): void {
  if (!can(role, permission)) throw new PermissionError();
}
