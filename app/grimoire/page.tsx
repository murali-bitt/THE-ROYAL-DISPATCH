import type { Metadata } from "next";
import { GrimoireView } from "@/components/grimoire/grimoire-view";
import { Container, PageHero } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "The Grimoire",
  description: "Kirmada, the Wheel of Evil, and the cursed artifacts scattered across the Kingdom of Valmora.",
};

export default function GrimoirePage() {
  return (
    <>
      <PageHero label="VII · Kept by the Royal Arcanum" realm="The Grimoire" title="Kirmada & the cursed artifacts">
        A sorcerer&apos;s spells have cursed the kingdom, and his artifacts lie scattered across its lands. This is what the
        Arcanum knows — and which reports each artifact is behind.
      </PageHero>
      <Container className="mt-16">
        <GrimoireView />
      </Container>
    </>
  );
}
