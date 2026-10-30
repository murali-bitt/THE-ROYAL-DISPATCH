import { readBody, respondWith, withKingdom } from "@/lib/api";
import { setAnnouncementState } from "@/lib/data/mutations";
import { persistAnnouncementState } from "@/lib/supabase/kingdom";
import { announcementStateSchema } from "@/lib/validation";
import { DomainValidationError } from "@/lib/data/mutations";

export async function PATCH(request: Request, ctx: RouteContext<"/api/announcements/[id]">) {
  const { id } = await ctx.params;
  return withKingdom(async ({ sb, session, state }) => {
    const parsed = announcementStateSchema.safeParse(await readBody(request));
    if (!parsed.success) throw new DomainValidationError("Choose published or archived.");
    const { announcement } = setAnnouncementState(await state(), id, parsed.data.state, session.actor);
    await persistAnnouncementState(sb, announcement);
    return respondWith(sb, (s) => s.announcements.find((a) => a.id === id));
  });
}
