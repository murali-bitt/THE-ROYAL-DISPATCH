/**
 * Shared domain model for The Royal Dispatch.
 * Every page reads from one KingdomSnapshot built from these records.
 * All places, people and events are fictional demo content.
 */

export const INCIDENT_STATUSES = [
  "submitted",
  "acknowledged",
  "in_restoration",
  "resolved",
] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

export const INCIDENT_SEVERITIES = ["low", "moderate", "high", "critical"] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number];

export const INCIDENT_CATEGORIES = [
  "magical_anomaly",
  "cursed_artifact",
  "water_food",
  "roads",
  "communication",
  "wards",
  "shelter_healing",
  "other",
] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number];

export const VILLAGE_CONDITIONS = ["stable", "strained", "afflicted", "critical"] as const;
export type VillageCondition = (typeof VILLAGE_CONDITIONS)[number];

export const SERVICE_KEYS = ["communications", "roads", "water", "food", "wards"] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];

export const SERVICE_STATES = ["operational", "degraded", "disrupted"] as const;
export type ServiceState = (typeof SERVICE_STATES)[number];

export const ANNOUNCEMENT_PRIORITIES = ["routine", "advisory", "urgent", "critical"] as const;
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

export const ANNOUNCEMENT_CATEGORIES = [
  "wards",
  "roads",
  "water",
  "council",
  "curse",
  "relief",
] as const;
export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export const PUBLICATION_STATES = ["published", "archived"] as const;
export type PublicationState = (typeof PUBLICATION_STATES)[number];

export const ROLES = ["citizen", "steward", "admin"] as const;
export type Role = (typeof ROLES)[number];

export type IncidentUpdateKind = "submitted" | "status" | "note" | "assignment";

export interface IncidentUpdate {
  id: string;
  at: string; // ISO timestamp
  kind: IncidentUpdateKind;
  message: string;
  authorName: string;
  authorRole: Role | "system";
  fromStatus?: IncidentStatus;
  toStatus?: IncidentStatus;
}

export interface Incident {
  id: string;
  reference: string; // e.g. KNG-2026-0041
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  villageId: string;
  location: string;
  submittedAt: string;
  updatedAt: string;
  status: IncidentStatus;
  reporter: { anonymous: boolean; name: string | null };
  assignedTeam: string | null;
  attachment: string | null; // validated raster data URL, rendered in grayscale
  updates: IncidentUpdate[];
}

export interface VillageUpdate {
  id: string;
  at: string;
  message: string;
  authorName: string;
  restoration: number;
}

export interface Village {
  id: string; // slug
  name: string;
  epithet: string;
  description: string;
  condition: VillageCondition;
  services: Record<ServiceKey, ServiceState>;
  restoration: number; // 0–100, set by stewards
  updatedAt: string;
  /** Position on the illustrated (non-geographic) kingdom map, in % of the map frame. */
  map: { x: number; y: number };
  log: VillageUpdate[];
}

export interface Announcement {
  id: string;
  title: string;
  summary: string;
  body: string;
  priority: AnnouncementPriority;
  category: AnnouncementCategory;
  villageId: string | null; // null = kingdom-wide
  issuedBy: string;
  publishedAt: string;
  state: PublicationState;
}

export interface Milestone {
  id: string;
  title: string;
  done: boolean;
  doneAt: string | null;
}

export interface InitiativeUpdate {
  id: string;
  at: string;
  message: string;
  authorName: string;
}

export interface Initiative {
  id: string;
  title: string;
  summary: string;
  villageId: string;
  lead: string;
  incidentIds: string[];
  milestones: Milestone[];
  nextSteps: string[];
  updates: InitiativeUpdate[];
}

export type ArtifactGlyph = "lantern" | "codex" | "bell" | "compass" | "hourglass";

export interface Artifact {
  id: string;
  name: string;
  epithet: string;
  glyph: ArtifactGlyph;
  origin: string;
  description: string;
  lore: string;
  disaster: string;
  containment: string;
  villageId: string;
  incidentIds: string[];
}

export interface KingdomSnapshot {
  incidents: Incident[];
  villages: Village[];
  announcements: Announcement[];
  initiatives: Initiative[];
  artifacts: Artifact[];
  awakeningAppliedAt: string | null;
}

export interface Actor {
  role: Role;
  name: string;
}
