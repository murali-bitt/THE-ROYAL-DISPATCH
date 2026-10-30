import { readBody, respondWith, withKingdom } from "@/lib/api";
import { setMilestone } from "@/lib/data/mutations";
import { persistMilestone } from "@/lib/supabase/kingdom";
import type { MilestoneInput } from "@/lib/validation";

export async function PATCH(request: Request, ctx: RouteContext<"/api/initiatives/[id]">) {
  const { id } = await ctx.params;
  return withKingdom(async ({ sb, session, state }) => {
    const body = (await readBody(request)) as MilestoneInput;
    const { initiative } = setMilestone(await state(), id, body, session.actor);
    await persistMilestone(sb, initiative, body.milestoneId);
    return respondWith(sb, (s) => s.initiatives.find((i) => i.id === id));
  });
}
