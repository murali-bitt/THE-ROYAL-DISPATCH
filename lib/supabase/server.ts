import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseConfig } from "@/lib/env";
import type { Actor, Role } from "@/types/domain";
import { ROLES } from "@/types/domain";

/**
 * Server client bound to the request's auth cookies. Queries run as the
 * signed-in user (or anon), so Postgres RLS applies to every statement.
 */
export async function createSupabaseServerClient() {
  if (!supabaseConfig) throw new Error("Supabase is not configured.");
  const cookieStore = await cookies();
  return createServerClient(supabaseConfig.url, supabaseConfig.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a context that cannot set cookies; the proxy refreshes sessions.
        }
      },
    },
  });
}

export type ServerSupabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export interface ServerSession {
  userId: string | null;
  actor: Actor;
}

/**
 * Resolve the actor from verified JWT claims and the profiles table.
 * The role is never read from the request body or a client-controlled header.
 */
export async function getServerSession(supabase: ServerSupabase): Promise<ServerSession> {
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  if (!userId) return { userId: null, actor: { role: "citizen", name: "Citizen" } };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", userId)
    .maybeSingle();

  const role: Role = ROLES.includes(profile?.role as Role) ? (profile!.role as Role) : "citizen";
  const name = profile?.display_name || (typeof data?.claims?.email === "string" ? data.claims.email : "Citizen");
  return { userId, actor: { role, name } };
}
