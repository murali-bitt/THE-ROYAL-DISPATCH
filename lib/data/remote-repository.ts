import { RepositoryError, type KingdomRepository, type Mutation } from "@/lib/data/repository";
import type { KingdomSnapshot } from "@/types/domain";

/**
 * Supabase provider, used when NEXT_PUBLIC_SUPABASE_* variables are set.
 * The browser never talks to the database directly for writes: every mutation
 * goes through an API route that re-validates the body, resolves the actor
 * from the authenticated session and relies on RLS as a second line of defence.
 * The `actor` argument is deliberately ignored here.
 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
      cache: "no-store",
    });
  } catch {
    throw new RepositoryError("The Dispatch could not be reached. Check your connection and try again.", {}, 0);
  }
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    fields?: Record<string, string>;
  } & T;
  if (!response.ok) {
    throw new RepositoryError(body.error ?? "The request failed.", body.fields ?? {}, response.status);
  }
  return body;
}

async function mutation<T>(path: string, method: string, payload: unknown): Promise<Mutation<T>> {
  return request<Mutation<T>>(path, { method, body: JSON.stringify(payload) });
}

export function createRemoteRepository(): KingdomRepository {
  return {
    mode: "supabase",
    load: () => request<KingdomSnapshot>("/api/kingdom"),
    createIncident: (input) => mutation("/api/incidents", "POST", input),
    transitionIncident: (id, input) => mutation(`/api/incidents/${encodeURIComponent(id)}`, "PATCH", input),
    addIncidentNote: (id, input) =>
      mutation(`/api/incidents/${encodeURIComponent(id)}/updates`, "POST", input),
    updateVillageProgress: (id, input) =>
      mutation(`/api/villages/${encodeURIComponent(id)}`, "PATCH", { kind: "progress", ...input }),
    manageVillage: (id, input) =>
      mutation(`/api/villages/${encodeURIComponent(id)}`, "PATCH", { kind: "manage", ...input }),
    publishAnnouncement: (input) => mutation("/api/announcements", "POST", input),
    setAnnouncementState: (id, state) =>
      mutation(`/api/announcements/${encodeURIComponent(id)}`, "PATCH", { state }),
    setMilestone: (initiativeId, input) =>
      mutation(`/api/initiatives/${encodeURIComponent(initiativeId)}`, "PATCH", input),
    async applyAwakening() {
      await request("/api/awakening", { method: "POST", body: "{}" });
      return request<KingdomSnapshot>("/api/kingdom");
    },
  };
}
