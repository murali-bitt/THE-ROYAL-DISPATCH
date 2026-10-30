import type {
  AnnouncementCategory,
  AnnouncementPriority,
  IncidentCategory,
  IncidentSeverity,
  IncidentStatus,
  Role,
  ServiceKey,
  ServiceState,
  VillageCondition,
} from "@/types/domain";

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  submitted: "Submitted",
  acknowledged: "Acknowledged",
  in_restoration: "Restoration in progress",
  resolved: "Resolved",
};

export const STATUS_SHORT: Record<IncidentStatus, string> = {
  submitted: "Submitted",
  acknowledged: "Acknowledged",
  in_restoration: "In restoration",
  resolved: "Resolved",
};

export const STATUS_EXPLAINER: Record<IncidentStatus, string> = {
  submitted: "Received by the Dispatch. Awaiting a steward's review.",
  acknowledged: "A steward has verified the report and assigned a response team.",
  in_restoration: "A response team is on site and repairs are under way.",
  resolved: "The Crown considers this matter restored. It may be reopened.",
};

export const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  critical: "Critical",
};

export const SEVERITY_RANK: Record<IncidentSeverity, number> = {
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

export const SEVERITY_HELP: Record<IncidentSeverity, string> = {
  low: "Unsettling, but no one is in danger.",
  moderate: "Daily life is disrupted for some households.",
  high: "Services are failing or people may be at risk.",
  critical: "Lives, wards or whole villages are in immediate danger.",
};

export const CATEGORY_LABEL: Record<IncidentCategory, string> = {
  magical_anomaly: "Magical anomaly",
  cursed_artifact: "Cursed artifact",
  water_food: "Water or food disruption",
  roads: "Roads and transportation",
  communication: "Communication failure",
  wards: "Damaged protective wards",
  shelter_healing: "Shelter or healing assistance",
  other: "Other",
};

export const CATEGORY_HELP: Record<IncidentCategory, string> = {
  magical_anomaly: "Unnatural light, sound, weather or movement.",
  cursed_artifact: "An object that behaves wrongly. Do not touch it.",
  water_food: "Wells, lakes, granaries or markets affected.",
  roads: "Blocked roads, bridges or trade routes.",
  communication: "Beacons, ravens, bells or messengers failing.",
  wards: "Ward-stones, barriers or sigils weakened.",
  shelter_healing: "People need beds, warmth or a healer.",
  other: "Anything the categories above do not cover.",
};

export const CONDITION_LABEL: Record<VillageCondition, string> = {
  stable: "Stable",
  strained: "Strained",
  afflicted: "Afflicted",
  critical: "Critical",
};

export const CONDITION_RANK: Record<VillageCondition, number> = {
  stable: 0,
  strained: 1,
  afflicted: 2,
  critical: 3,
};

export const SERVICE_LABEL: Record<ServiceKey, string> = {
  communications: "Communications",
  roads: "Roads",
  water: "Water",
  food: "Food supply",
  wards: "Protective wards",
};

export const SERVICE_STATE_LABEL: Record<ServiceState, string> = {
  operational: "Operational",
  degraded: "Degraded",
  disrupted: "Disrupted",
};

export const PRIORITY_LABEL: Record<AnnouncementPriority, string> = {
  routine: "Routine",
  advisory: "Advisory",
  urgent: "Urgent",
  critical: "Critical",
};

export const PRIORITY_RANK: Record<AnnouncementPriority, number> = {
  routine: 0,
  advisory: 1,
  urgent: 2,
  critical: 3,
};

export const ANNOUNCEMENT_CATEGORY_LABEL: Record<AnnouncementCategory, string> = {
  wards: "Wards",
  roads: "Roads",
  water: "Water",
  council: "Council",
  curse: "The Curse",
  relief: "Relief",
};

export const ROLE_LABEL: Record<Role, string> = {
  citizen: "Citizen",
  steward: "Village Steward",
  admin: "Royal Council",
};

export const ROLE_DESCRIPTION: Record<Role, string> = {
  citizen: "Report incidents, follow updates and read dispatches.",
  steward: "Triage reports, post updates, set restoration progress, issue village dispatches.",
  admin: "Everything a steward can do, plus village records and kingdom-wide dispatches.",
};
