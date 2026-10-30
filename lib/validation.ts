import { z } from "zod";
import { ATTACHMENT_LIMITS, RESPONSE_TEAMS } from "@/lib/config";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_PRIORITIES,
  INCIDENT_CATEGORIES,
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  PUBLICATION_STATES,
  SERVICE_STATES,
  VILLAGE_CONDITIONS,
} from "@/types/domain";

/**
 * These schemas are the single source of validation. The report form uses
 * them on the client, the local demo repository re-checks every mutation,
 * and the API routes parse every request body with them on the server.
 */

const ATTACHMENT_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

export const attachmentSchema = z
  .string()
  .max(ATTACHMENT_LIMITS.maxStoredChars, "The image is too large after compression.")
  .regex(ATTACHMENT_PATTERN, "Only JPEG, PNG or WebP images are accepted.");

export const newIncidentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(6, "Give the incident a short title of at least 6 characters.")
    .max(120, "Keep the title under 120 characters."),
  category: z.enum(INCIDENT_CATEGORIES, "Choose the kind of incident."),
  villageId: z.string().trim().min(1, "Choose the affected village."),
  location: z
    .string()
    .trim()
    .min(3, "Name a landmark, road or building so responders can find it.")
    .max(140, "Keep the location under 140 characters."),
  description: z
    .string()
    .trim()
    .min(30, "Describe what you saw in at least 30 characters.")
    .max(2000, "Keep the description under 2,000 characters."),
  severity: z.enum(INCIDENT_SEVERITIES, "Choose how severe this is."),
  anonymous: z.boolean(),
  reporterName: z.string().trim().max(60, "Keep your name under 60 characters."),
  attachment: attachmentSchema.nullable(),
});
export type NewIncidentInput = z.infer<typeof newIncidentSchema>;

const teamSchema = z.enum(RESPONSE_TEAMS, "Choose a response team.");

export const transitionSchema = z
  .object({
    to: z.enum(INCIDENT_STATUSES),
    team: teamSchema.optional(),
    note: z.string().trim().max(800, "Keep the note under 800 characters.").optional(),
  })
  .superRefine((value, ctx) => {
    if (value.to === "acknowledged" && !value.team) {
      ctx.addIssue({
        code: "custom",
        path: ["team"],
        message: "Assign a response team to acknowledge this incident.",
      });
    }
    if (value.to === "resolved" && (value.note ?? "").length < 10) {
      ctx.addIssue({
        code: "custom",
        path: ["note"],
        message: "Explain how the incident was resolved (at least 10 characters).",
      });
    }
  });
export type TransitionInput = z.infer<typeof transitionSchema>;

export const incidentNoteSchema = z.object({
  message: z
    .string()
    .trim()
    .min(8, "Write an update of at least 8 characters.")
    .max(800, "Keep the update under 800 characters."),
});
export type IncidentNoteInput = z.infer<typeof incidentNoteSchema>;

export const villageProgressSchema = z.object({
  restoration: z.number().int().min(0).max(100),
  message: z
    .string()
    .trim()
    .min(8, "Describe what changed in at least 8 characters.")
    .max(400, "Keep the note under 400 characters."),
});
export type VillageProgressInput = z.infer<typeof villageProgressSchema>;

export const villageManageSchema = z.object({
  condition: z.enum(VILLAGE_CONDITIONS),
  description: z.string().trim().min(20).max(600),
  services: z.object({
    communications: z.enum(SERVICE_STATES),
    roads: z.enum(SERVICE_STATES),
    water: z.enum(SERVICE_STATES),
    food: z.enum(SERVICE_STATES),
    wards: z.enum(SERVICE_STATES),
  }),
});
export type VillageManageInput = z.infer<typeof villageManageSchema>;

export const announcementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(6, "The headline needs at least 6 characters.")
    .max(120, "Keep the headline under 120 characters."),
  summary: z
    .string()
    .trim()
    .min(12, "Write a one-line summary of at least 12 characters.")
    .max(220, "Keep the summary under 220 characters."),
  body: z
    .string()
    .trim()
    .min(30, "The full dispatch needs at least 30 characters.")
    .max(4000, "Keep the dispatch under 4,000 characters."),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES),
  category: z.enum(ANNOUNCEMENT_CATEGORIES),
  villageId: z.string().trim().min(1).nullable(),
  issuedBy: z
    .string()
    .trim()
    .min(3, "Name the issuing office.")
    .max(80, "Keep the office name under 80 characters."),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

export const announcementStateSchema = z.object({
  state: z.enum(PUBLICATION_STATES),
});

export const milestoneSchema = z.object({
  milestoneId: z.string().min(1),
  done: z.boolean(),
  note: z.string().trim().max(400).optional(),
});
export type MilestoneInput = z.infer<typeof milestoneSchema>;

/** Flatten a ZodError into a { field: message } map for API responses. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
