import { readBody, respondWith, withKingdom } from "@/lib/api";
import { publishAnnouncement } from "@/lib/data/mutations";
import { insertAnnouncement } from "@/lib/supabase/kingdom";
import type { AnnouncementInput } from "@/lib/validation";

export async function POST(request: Request) {
  return withKingdom(async ({ sb, session, state }) => {
    const body = (await readBody(request)) as AnnouncementInput;
    const { announcement } = publishAnnouncement(await state(), body, session.actor);
    const id = await insertAnnouncement(sb, announcement, session.userId);
    return respondWith(sb, (s) => s.announcements.find((a) => a.id === id), 201);
  });
}
