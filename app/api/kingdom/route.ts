import { json, withKingdom } from "@/lib/api";
import { loadSnapshot } from "@/lib/supabase/kingdom";

export async function GET() {
  return withKingdom(async ({ sb }) => json(await loadSnapshot(sb)));
}
