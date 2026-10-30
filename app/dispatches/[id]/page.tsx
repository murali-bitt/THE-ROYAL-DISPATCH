import type { Metadata } from "next";
import { Suspense } from "react";
import { DispatchDetail } from "@/components/dispatches/dispatch-views";
import { Container } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Royal dispatch",
  description: "The full text of a royal dispatch.",
};

export default function DispatchPage({ params }: PageProps<"/dispatches/[id]">) {
  return (
    <Container className="pt-10">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        {params.then(({ id }) => (
          <DispatchDetail id={id} />
        ))}
      </Suspense>
    </Container>
  );
}
