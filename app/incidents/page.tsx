import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { IncidentRegistry } from "@/components/incidents/incident-registry";
import { buttonClasses } from "@/components/ui/button";
import { Container, PageHero } from "@/components/ui/section";
import { SkeletonRows } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Incident registry",
  description: "Search and filter every incident reported to the Royal Dispatch.",
};

export default function IncidentsPage() {
  return (
    <>
      <PageHero
        label="III · Public record"
        realm="The Black Ledger"
        title="Incident registry"
        aside={
          <Link href="/report" className={buttonClasses("primary", "md")}>
            Report an incident
          </Link>
        }
      >
        Every disturbance that has reached the Crown, and what has been done about it. Search by reference, village or
        word — every filter narrows the same ledger.
      </PageHero>
      <Container className="mt-12">
        <Suspense fallback={<SkeletonRows rows={6} />}>
          <IncidentRegistry />
        </Suspense>
      </Container>
    </>
  );
}
