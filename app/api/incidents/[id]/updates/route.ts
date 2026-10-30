import { readBody, respondWith, withKingdom } from "@/lib/api";
import { addIncidentNote } from "@/lib/data/mutations";
import { persistIncidentChange } from "@/lib/supabase/kingdom";
import type { IncidentNoteInput } from "@/lib/validation";

export async function POST(request: Request, ctx: RouteContext<"/api/incidents/[id]/updates">) {
  const { id } = await ctx.params;
  return withKingdom(async ({ sb, session, state }) => {
    const body = (await readBody(request)) as IncidentNoteInput;
    const { incident } = addIncidentNote(await state(), id, body, session.actor);
    await persistIncidentChange(sb, incident);
    return respondWith(sb, (s) => s.incidents.find((i) => i.id === id), 201);
  });
}
