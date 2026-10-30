import "server-only";
import type { KingdomState } from "@/lib/data/seed";
import type { ServerSupabase } from "@/lib/supabase/server";
import type {
  Announcement,
  Artifact,
  Incident,
  IncidentUpdate,
  Initiative,
  KingdomSnapshot,
  Village,
} from "@/types/domain";

/**
 * Supabase persistence. Reads map database rows onto the shared domain model;
 * writes persist only the record that the shared mutation functions changed,
 * so business rules (lifecycle, permissions, validation) are identical in demo
 * and production, while RLS and triggers independently enforce them again.
 */

class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseError";
  }
}

function check<T>(result: { data: T | null; error: { message: string } | null }, what: string): T {
  if (result.error) throw new DatabaseError(`Could not load ${what}: ${result.error.message}`);
  return (result.data ?? []) as T;
}

type Row = Record<string, unknown>;
const s = (v: unknown) => String(v ?? "");

export async function loadSnapshot(sb: ServerSupabase): Promise<KingdomSnapshot> {
  const [villages, villageUpdates, incidents, incidentUpdates, announcements, initiatives, milestones, initiativeUpdates, artifacts, events] =
    await Promise.all([
      sb.from("villages").select("*").order("name"),
      sb.from("village_updates").select("*").order("created_at"),
      sb
        .from("incidents")
        .select(
          "id, reference, title, description, category, severity, village_id, location, status, anonymous, reporter_name, assigned_team, attachment_data_url, submitted_at, updated_at",
        )
        .order("submitted_at", { ascending: false }),
      sb.from("incident_updates").select("*").order("created_at"),
      sb.from("announcements").select("*").order("published_at", { ascending: false }),
      sb.from("initiatives").select("*").order("id"),
      sb.from("initiative_milestones").select("*").order("position"),
      sb.from("initiative_updates").select("*").order("created_at"),
      sb.from("artifacts").select("*").order("id"),
      sb.from("kingdom_events").select("*").eq("key", "sleeper-awakened"),
    ]);

  const vRows = check<Row[]>(villages, "villages");
  const vuRows = check<Row[]>(villageUpdates, "village updates");
  const iRows = check<Row[]>(incidents, "incidents");
  const iuRows = check<Row[]>(incidentUpdates, "incident updates");
  const aRows = check<Row[]>(announcements, "announcements");
  const inRows = check<Row[]>(initiatives, "initiatives");
  const mRows = check<Row[]>(milestones, "milestones");
  const inuRows = check<Row[]>(initiativeUpdates, "initiative updates");
  const arRows = check<Row[]>(artifacts, "artifacts");
  const evRows = check<Row[]>(events, "kingdom events");

  const updatesByIncident = new Map<string, IncidentUpdate[]>();
  for (const u of iuRows) {
    const list = updatesByIncident.get(s(u.incident_id)) ?? [];
    list.push({
      id: s(u.id),
      at: s(u.created_at),
      kind: u.kind as IncidentUpdate["kind"],
      message: s(u.message),
      authorName: s(u.author_name),
      authorRole: u.author_role as IncidentUpdate["authorRole"],
      ...(u.to_status
        ? { fromStatus: u.from_status as Incident["status"], toStatus: u.to_status as Incident["status"] }
        : {}),
    });
    updatesByIncident.set(s(u.incident_id), list);
  }

  return {
    villages: vRows.map(
      (v): Village => ({
        id: s(v.id),
        name: s(v.name),
        epithet: s(v.epithet),
        description: s(v.description),
        condition: v.condition as Village["condition"],
        services: v.services as Village["services"],
        restoration: Number(v.restoration),
        updatedAt: s(v.updated_at),
        map: { x: Number(v.map_x), y: Number(v.map_y) },
        log: vuRows
          .filter((u) => u.village_id === v.id)
          .map((u) => ({
            id: s(u.id),
            at: s(u.created_at),
            message: s(u.message),
            authorName: s(u.author_name),
            restoration: Number(u.restoration),
          })),
      }),
    ),
    incidents: iRows.map(
      (i): Incident => ({
        id: s(i.id),
        reference: s(i.reference),
        title: s(i.title),
        description: s(i.description),
        category: i.category as Incident["category"],
        severity: i.severity as Incident["severity"],
        villageId: s(i.village_id),
        location: s(i.location),
        status: i.status as Incident["status"],
        reporter: { anonymous: Boolean(i.anonymous), name: (i.reporter_name as string | null) ?? null },
        assignedTeam: (i.assigned_team as string | null) ?? null,
        attachment: (i.attachment_data_url as string | null) ?? null,
        submittedAt: s(i.submitted_at),
        updatedAt: s(i.updated_at),
        updates: updatesByIncident.get(s(i.id)) ?? [],
      }),
    ),
    announcements: aRows.map(
      (a): Announcement => ({
        id: s(a.id),
        title: s(a.title),
        summary: s(a.summary),
        body: s(a.body),
        priority: a.priority as Announcement["priority"],
        category: a.category as Announcement["category"],
        villageId: (a.village_id as string | null) ?? null,
        issuedBy: s(a.issued_by),
        publishedAt: s(a.published_at),
        state: a.state as Announcement["state"],
      }),
    ),
    initiatives: inRows.map(
      (i): Initiative => ({
        id: s(i.id),
        title: s(i.title),
        summary: s(i.summary),
        villageId: s(i.village_id),
        lead: s(i.lead),
        incidentIds: (i.incident_ids as string[]) ?? [],
        nextSteps: (i.next_steps as string[]) ?? [],
        milestones: mRows
          .filter((m) => m.initiative_id === i.id)
          .map((m) => ({
            id: s(m.id),
            title: s(m.title),
            done: Boolean(m.done),
            doneAt: (m.done_at as string | null) ?? null,
          })),
        updates: inuRows
          .filter((u) => u.initiative_id === i.id)
          .map((u) => ({ id: s(u.id), at: s(u.created_at), message: s(u.message), authorName: s(u.author_name) })),
      }),
    ),
    artifacts: arRows.map(
      (a): Artifact => ({
        id: s(a.id),
        name: s(a.name),
        epithet: s(a.epithet),
        glyph: a.glyph as Artifact["glyph"],
        origin: s(a.origin),
        description: s(a.description),
        lore: s(a.lore),
        disaster: s(a.disaster),
        containment: s(a.containment),
        villageId: s(a.village_id),
        incidentIds: (a.incident_ids as string[]) ?? [],
      }),
    ),
    awakeningAppliedAt: evRows[0] ? s(evRows[0].occurred_at) : null,
  };
}

/** Adapt a snapshot so the shared pure mutation functions can run against it. */
export function asState(snapshot: KingdomSnapshot): KingdomState {
  return { version: 1, nextSequence: 0, ...snapshot };
}

function fail(error: { message: string } | null, action: string) {
  if (error) throw new DatabaseError(`Could not ${action}: ${error.message}`);
}

export async function insertIncident(sb: ServerSupabase, incident: Incident): Promise<string> {
  // Reference, status, timestamps and reporter id are assigned by the database trigger.
  const { data, error } = await sb
    .from("incidents")
    .insert({
      title: incident.title,
      description: incident.description,
      category: incident.category,
      severity: incident.severity,
      village_id: incident.villageId,
      location: incident.location,
      anonymous: incident.reporter.anonymous,
      reporter_name: incident.reporter.name,
      attachment_data_url: incident.attachment,
      status: "submitted",
    })
    .select("id")
    .single();
  fail(error, "file the report");
  return s((data as Row).id);
}

async function insertIncidentUpdate(sb: ServerSupabase, incidentId: string, update: IncidentUpdate) {
  const { error } = await sb.from("incident_updates").insert({
    incident_id: incidentId,
    kind: update.kind,
    message: update.message,
    author_name: update.authorName,
    author_role: update.authorRole,
    from_status: update.fromStatus ?? null,
    to_status: update.toStatus ?? null,
  });
  fail(error, "record the update");
}

export async function persistIncidentChange(sb: ServerSupabase, incident: Incident) {
  const { error } = await sb
    .from("incidents")
    .update({ status: incident.status, assigned_team: incident.assignedTeam, updated_at: new Date().toISOString() })
    .eq("id", incident.id);
  fail(error, "update the incident");
  await insertIncidentUpdate(sb, incident.id, incident.updates[incident.updates.length - 1]);
}

export async function persistVillageProgress(sb: ServerSupabase, village: Village) {
  const { error } = await sb
    .from("villages")
    .update({ restoration: village.restoration, updated_at: new Date().toISOString() })
    .eq("id", village.id);
  fail(error, "update the village");
  const entry = village.log[village.log.length - 1];
  const { error: logError } = await sb.from("village_updates").insert({
    village_id: village.id,
    message: entry.message,
    author_name: entry.authorName,
    restoration: entry.restoration,
  });
  fail(logError, "log the village update");
}

export async function persistVillageRecord(sb: ServerSupabase, village: Village) {
  const { error } = await sb
    .from("villages")
    .update({
      condition: village.condition,
      description: village.description,
      services: village.services,
      updated_at: new Date().toISOString(),
    })
    .eq("id", village.id);
  fail(error, "update the village record");
}

export async function insertAnnouncement(sb: ServerSupabase, a: Announcement, authorId: string | null) {
  const { data, error } = await sb
    .from("announcements")
    .insert({
      title: a.title,
      summary: a.summary,
      body: a.body,
      priority: a.priority,
      category: a.category,
      village_id: a.villageId,
      issued_by: a.issuedBy,
      author_id: authorId,
    })
    .select("id")
    .single();
  fail(error, "publish the dispatch");
  return s((data as Row).id);
}

export async function persistAnnouncementState(sb: ServerSupabase, a: Announcement) {
  const { error } = await sb.from("announcements").update({ state: a.state }).eq("id", a.id);
  fail(error, "update the dispatch");
}

export async function persistMilestone(sb: ServerSupabase, initiative: Initiative, milestoneId: string) {
  const milestone = initiative.milestones.find((m) => m.id === milestoneId)!;
  const { error } = await sb
    .from("initiative_milestones")
    .update({ done: milestone.done, done_at: milestone.doneAt })
    .eq("id", milestoneId);
  fail(error, "update the milestone");
  const update = initiative.updates[initiative.updates.length - 1];
  const { error: logError } = await sb.from("initiative_updates").insert({
    initiative_id: initiative.id,
    message: update.message,
    author_name: update.authorName,
  });
  fail(logError, "log the restoration update");
}

export async function triggerAwakening(sb: ServerSupabase) {
  const { error } = await sb.rpc("apply_awakening");
  fail(error, "record the awakening");
}

export { DatabaseError };
