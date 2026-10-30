import { readBody, respondWith, withKingdom } from "@/lib/api";
import { manageVillage, updateVillageProgress } from "@/lib/data/mutations";
import { persistVillageProgress, persistVillageRecord } from "@/lib/supabase/kingdom";
import type { VillageManageInput, VillageProgressInput } from "@/lib/validation";

export async function PATCH(request: Request, ctx: RouteContext<"/api/villages/[id]">) {
  const { id } = await ctx.params;
  return withKingdom(async ({ sb, session, state }) => {
    const { kind, ...body } = (await readBody(request)) as { kind?: string } & Record<string, unknown>;
    if (kind === "manage") {
      const { village } = manageVillage(await state(), id, body as unknown as VillageManageInput, session.actor);
      await persistVillageRecord(sb, village);
    } else {
      const { village } = updateVillageProgress(
        await state(),
        id,
        body as unknown as VillageProgressInput,
        session.actor,
      );
      await persistVillageProgress(sb, village);
    }
    return respondWith(sb, (s) => s.villages.find((v) => v.id === id));
  });
}
