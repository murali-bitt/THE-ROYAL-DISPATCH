import { json, withKingdom } from "@/lib/api";
import { triggerAwakening } from "@/lib/supabase/kingdom";

/** Idempotent: the database function surfaces the awakening records only once. */
export async function POST() {
  return withKingdom(async ({ sb }) => {
    await triggerAwakening(sb);
    return json({ ok: true });
  });
}
