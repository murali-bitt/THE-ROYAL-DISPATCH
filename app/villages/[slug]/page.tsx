import type { Metadata } from "next";
import { Suspense } from "react";
import { VillageDetail } from "@/components/villages/village-views";
import { Container } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Village record",
  description: "A village's condition, services, incidents, dispatches and restoration activity.",
};

export default function VillagePage({ params }: PageProps<"/villages/[slug]">) {
  return (
    <Container className="pt-10">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        {params.then(({ slug }) => (
          <VillageDetail slug={slug} />
        ))}
      </Suspense>
    </Container>
  );
}
