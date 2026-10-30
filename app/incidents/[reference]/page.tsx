import type { Metadata } from "next";
import { Suspense } from "react";
import { IncidentDetail } from "@/components/incidents/incident-detail";
import { Container } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Incident record",
  description: "The full record, status and activity timeline of a reported incident.",
};

export default function IncidentPage({ params }: PageProps<"/incidents/[reference]">) {
  return (
    <Container className="pt-10">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        {params.then(({ reference }) => (
          <IncidentDetail reference={reference} />
        ))}
      </Suspense>
    </Container>
  );
}
