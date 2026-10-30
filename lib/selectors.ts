import { CONDITION_RANK, PRIORITY_RANK, SEVERITY_RANK } from "@/lib/labels";
import type {
  Announcement,
  Incident,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  Initiative,
  KingdomSnapshot,
  Village,
} from "@/types/domain";

/* Incidents ---------------------------------------------------------- */

export const isOpen = (incident: Incident) => incident.status !== "resolved";

export interface IncidentFilters {
  query: string;
  status: IncidentStatus | "all" | "open";
  villageId: string | "all";
  category: IncidentCategory | "all";
  severity: IncidentSeverity | "all";
  sort: IncidentSort;
}

export type IncidentSort = "updated" | "newest" | "oldest" | "severity";

export const DEFAULT_FILTERS: IncidentFilters = {
  query: "",
  status: "all",
  villageId: "all",
  category: "all",
  severity: "all",
  sort: "updated",
};

/** All filters combine (logical AND) — a record must satisfy every active filter. */
export function filterIncidents(
  incidents: Incident[],
  filters: IncidentFilters,
  villages: Village[],
): Incident[] {
  const names = new Map(villages.map((v) => [v.id, v.name.toLowerCase()]));
  const terms = filters.query.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const matches = incidents.filter((incident) => {
    if (filters.status === "open" && !isOpen(incident)) return false;
    if (filters.status !== "all" && filters.status !== "open" && incident.status !== filters.status)
      return false;
    if (filters.villageId !== "all" && incident.villageId !== filters.villageId) return false;
    if (filters.category !== "all" && incident.category !== filters.category) return false;
    if (filters.severity !== "all" && incident.severity !== filters.severity) return false;
    if (terms.length) {
      const haystack = [
        incident.reference,
        incident.title,
        incident.description,
        incident.location,
        names.get(incident.villageId) ?? "",
        incident.assignedTeam ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!terms.every((t) => haystack.includes(t))) return false;
    }
    return true;
  });

  return sortIncidents(matches, filters.sort);
}

export function sortIncidents(incidents: Incident[], sort: IncidentSort): Incident[] {
  const time = (iso: string) => new Date(iso).getTime();
  const copy = [...incidents];
  switch (sort) {
    case "newest":
      return copy.sort((a, b) => time(b.submittedAt) - time(a.submittedAt));
    case "oldest":
      return copy.sort((a, b) => time(a.submittedAt) - time(b.submittedAt));
    case "severity":
      return copy.sort(
        (a, b) =>
          Number(isOpen(b)) - Number(isOpen(a)) ||
          SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] ||
          time(a.submittedAt) - time(b.submittedAt),
      );
    case "updated":
    default:
      return copy.sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
  }
}

/** The steward's queue: open incidents, most severe first, oldest first within a severity. */
export function triageQueue(incidents: Incident[]): Incident[] {
  return sortIncidents(incidents.filter(isOpen), "severity");
}

/* Villages ----------------------------------------------------------- */

export function incidentsForVillage(snapshot: KingdomSnapshot, villageId: string) {
  return snapshot.incidents.filter((i) => i.villageId === villageId);
}

export function openCountForVillage(snapshot: KingdomSnapshot, villageId: string) {
  return snapshot.incidents.filter((i) => i.villageId === villageId && isOpen(i)).length;
}

export function villagesBySeverity(villages: Village[]): Village[] {
  return [...villages].sort(
    (a, b) => CONDITION_RANK[b.condition] - CONDITION_RANK[a.condition] || a.restoration - b.restoration,
  );
}

/* Restoration -------------------------------------------------------- */

export function initiativeProgress(initiative: Initiative): number {
  if (initiative.milestones.length === 0) return 0;
  const done = initiative.milestones.filter((m) => m.done).length;
  return Math.round((done / initiative.milestones.length) * 100);
}

export type InitiativeStatus = "planned" | "active" | "completed";

export function initiativeStatus(initiative: Initiative): InitiativeStatus {
  const progress = initiativeProgress(initiative);
  if (progress >= 100) return "completed";
  if (progress === 0) return "planned";
  return "active";
}

/**
 * Kingdom Restoration Index: the unweighted mean of every village's
 * steward-reported restoration value. It is a demo aggregate, not a
 * population-weighted measure, and the UI says so.
 */
export function kingdomRestoration(villages: Village[]): number {
  if (villages.length === 0) return 0;
  const total = villages.reduce((sum, v) => sum + v.restoration, 0);
  return Math.round(total / villages.length);
}

/* Dispatches --------------------------------------------------------- */

export function publishedAnnouncements(announcements: Announcement[]): Announcement[] {
  return announcements
    .filter((a) => a.state === "published")
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

/** The most important current dispatch: highest priority, then most recent. */
export function featuredAnnouncement(announcements: Announcement[]): Announcement | null {
  const published = publishedAnnouncements(announcements);
  if (!published.length) return null;
  return [...published].sort(
    (a, b) =>
      PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  )[0];
}

export function announcementsForVillage(announcements: Announcement[], villageId: string) {
  return publishedAnnouncements(announcements).filter(
    (a) => a.villageId === villageId || a.villageId === null,
  );
}

/* Overview ----------------------------------------------------------- */

export interface KingdomMetrics {
  openIncidents: number;
  criticalOpen: number;
  villagesAffected: number;
  totalVillages: number;
  restorationIndex: number;
  resolvedIncidents: number;
  totalIncidents: number;
  activeInitiatives: number;
}

export function kingdomMetrics(snapshot: KingdomSnapshot): KingdomMetrics {
  const open = snapshot.incidents.filter(isOpen);
  return {
    openIncidents: open.length,
    criticalOpen: open.filter((i) => i.severity === "critical").length,
    villagesAffected: snapshot.villages.filter((v) => v.condition !== "stable").length,
    totalVillages: snapshot.villages.length,
    restorationIndex: kingdomRestoration(snapshot.villages),
    resolvedIncidents: snapshot.incidents.length - open.length,
    totalIncidents: snapshot.incidents.length,
    activeInitiatives: snapshot.initiatives.filter((i) => initiativeStatus(i) !== "completed").length,
  };
}

export type ActivityItem =
  | { kind: "incident"; id: string; at: string; incident: Incident; message: string; label: string }
  | { kind: "dispatch"; id: string; at: string; announcement: Announcement }
  | { kind: "village"; id: string; at: string; village: Village; message: string };

/** A unified, newest-first feed of everything that has happened in the kingdom. */
export function activityFeed(snapshot: KingdomSnapshot, limit = 8): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const incident of snapshot.incidents) {
    for (const update of incident.updates) {
      items.push({
        kind: "incident",
        id: `${incident.id}:${update.id}`,
        at: update.at,
        incident,
        message: update.message,
        label:
          update.kind === "submitted"
            ? "New report"
            : update.kind === "status"
              ? "Status changed"
              : "Steward update",
      });
    }
  }
  for (const announcement of publishedAnnouncements(snapshot.announcements)) {
    items.push({ kind: "dispatch", id: announcement.id, at: announcement.publishedAt, announcement });
  }
  for (const village of snapshot.villages) {
    for (const entry of village.log) {
      items.push({ kind: "village", id: entry.id, at: entry.at, village, message: entry.message });
    }
  }
  return items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, limit);
}
