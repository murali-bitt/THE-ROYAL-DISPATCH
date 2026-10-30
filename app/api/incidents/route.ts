import { readBody, respondWith, withKingdom } from "@/lib/api";
import { createIncident } from "@/lib/data/mutations";
import { insertIncident } from "@/lib/supabase/kingdom";
import type { NewIncidentInput } from "@/lib/validation";

export async function POST(request: Request) {
  return withKingdom(async ({ sb, session, state }) => {
    const body = (await readBody(request)) as NewIncidentInput;
    // Validates the body and the actor's permission exactly as the demo does.
    const { incident } = createIncident(await state(), body, session.actor);
    const id = await insertIncident(sb, incident);
    return respondWith(sb, (s) => s.incidents.find((i) => i.id === id), 201);
  });
}
