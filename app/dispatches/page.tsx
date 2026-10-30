import type { Metadata } from "next";
import { DispatchList, PublishDispatchButton } from "@/components/dispatches/dispatch-views";
import { Container, PageHero } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Royal dispatches",
  description: "Official announcements from the Royal Council and the stewards of Valmora.",
};

export default function DispatchesPage() {
  return (
    <>
      <PageHero label="V · Official announcements" realm="Whispers from the Crown" title="Royal dispatches" aside={<PublishDispatchButton />}>
        Warnings, closures and progress from the Royal Council and the stewards of every village. The most urgent dispatch
        is always first.
      </PageHero>
      <Container className="mt-12">
        <DispatchList />
      </Container>
    </>
  );
}
