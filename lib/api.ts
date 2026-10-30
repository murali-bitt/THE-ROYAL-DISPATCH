import "server-only";
import { isSupabaseConfigured } from "@/lib/env";
import { PermissionError } from "@/lib/permissions";
import { DomainValidationError, NotFoundError } from "@/lib/data/mutations";
import { asState, DatabaseError, loadSnapshot } from "@/lib/supabase/kingdom";
import { createSupabaseServerClient, getServerSession, type ServerSupabase, type ServerSession } from "@/lib/supabase/server";
import type { KingdomState } from "@/lib/data/seed";

const MAX_BODY_BYTES = 600_000;

export interface KingdomContext {
  sb: ServerSupabase;
  session: ServerSession;
  /** Current state, loaded under the caller's RLS visibility. */
  state: () => Promise<KingdomState>;
}

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

export async function readBody(request: Request): Promise<unknown> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY_BYTES) throw new PayloadTooLarge();
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new PayloadTooLarge();
  try {
    return JSON.parse(text || "{}");
  } catch {
    throw new DomainValidationError("The request body must be valid JSON.");
  }
}

class PayloadTooLarge extends Error {}

/**
 * Wrap a route handler: refuse when Supabase is not configured, resolve the
 * session server-side, and translate domain errors into HTTP responses.
 */
export async function withKingdom(handler: (ctx: KingdomContext) => Promise<Response>): Promise<Response> {
  if (!isSupabaseConfigured) {
    return json(
      { error: "The Supabase backend is not configured. The app is running in local demo mode." },
      503,
    );
  }
  try {
    const sb = await createSupabaseServerClient();
    const session = await getServerSession(sb);
    return await handler({ sb, session, state: async () => asState(await loadSnapshot(sb)) });
  } catch (error) {
    if (error instanceof DomainValidationError) return json({ error: error.message, fields: error.fields }, 422);
    if (error instanceof PermissionError) return json({ error: error.message }, 403);
    if (error instanceof NotFoundError) return json({ error: error.message }, 404);
    if (error instanceof PayloadTooLarge) return json({ error: "The request is too large." }, 413);
    if (error instanceof DatabaseError) {
      console.error("[royal-dispatch]", error.message);
      return json({ error: "The kingdom's records could not be updated. Please try again." }, 500);
    }
    console.error("[royal-dispatch] unexpected error", error);
    return json({ error: "Something went wrong in the Dispatch." }, 500);
  }
}

export async function respondWith<T extends { id: string }>(
  sb: ServerSupabase,
  pick: (snapshot: Awaited<ReturnType<typeof loadSnapshot>>) => T | undefined,
  status = 200,
) {
  const snapshot = await loadSnapshot(sb);
  const record = pick(snapshot);
  if (!record) throw new NotFoundError("The updated record");
  return json({ record, snapshot }, status);
}
