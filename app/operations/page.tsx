import type { Metadata } from "next";
import { OperationsConsole } from "@/components/operations/operations-console";
import { Container, PageHero } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Operations desk",
  description: "The steward and Royal Council desk: triage incidents, post updates and coordinate restoration.",
};

export default function OperationsPage() {
  return (
    <>
      <PageHero label="VIII · Stewards & the Royal Council" realm="The Night Watch" title="The steward's operations desk">
        Review incoming reports in order of severity, acknowledge and assign them, post updates citizens can read, and
        record each village&apos;s restoration.
      </PageHero>
      <Container className="mt-12">
        <OperationsConsole />
      </Container>
    </>
  );
}
