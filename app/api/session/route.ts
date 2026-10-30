import { json, withKingdom } from "@/lib/api";

export async function GET() {
  return withKingdom(async ({ session }) =>
    json({ signedIn: session.userId !== null, actor: session.actor }),
  );
}
