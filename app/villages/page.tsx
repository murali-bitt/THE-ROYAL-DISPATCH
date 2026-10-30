import type { Metadata } from "next";
import { VillageDirectory } from "@/components/villages/village-views";
import { Container, PageHero } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Village status",
  description: "The condition, services and restoration of every village in the Kingdom of Valmora.",
};

export default function VillagesPage() {
  return (
    <>
      <PageHero label="IV · Seven villages under one curse" realm="The Forsaken Lands" title="Village status & the kingdom map">
        From the ward-line at Thornwatch to the harbour of Greyhaven: where the curse has struck, which services have
        failed, and how far each village has been restored.
      </PageHero>
      <Container className="mt-12">
        <VillageDirectory />
      </Container>
    </>
  );
}
