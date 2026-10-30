import { readBody, respondWith, withKingdom } from "@/lib/api";
import { transitionIncident } from "@/lib/data/mutations";
import { persistIncidentChange } from "@/lib/supabase/kingdom";
import type { TransitionInput } from "@/lib/validation";

export async function PATCH(request: Request, ctx: RouteContext<"/api/incidents/[id]">) {
  const { id } = await ctx.params;
  return withKingdom(async ({ sb, session, state }) => {
    const body = (await readBody(request)) as TransitionInput;
    const { incident } = transitionIncident(await state(), id, body, session.actor);
    await persistIncidentChange(sb, incident);
    return respondWith(sb, (s) => s.incidents.find((i) => i.id === id));
  });
}
