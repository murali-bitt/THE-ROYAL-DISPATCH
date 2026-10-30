import type { Metadata } from "next";
import { RestorationView } from "@/components/restoration/restoration-view";
import { Container, PageHero } from "@/components/ui/section";

export const metadata: Metadata = {
  title: "Restoration operations",
  description: "What the curse has damaged, what is being done about it, and how far restoration has progressed.",
};

export default function RestorationPage() {
  return (
    <>
      <PageHero label="VI · Mending the kingdom" realm="The Long Vigil" title="Restoration operations">
        What has been damaged, what is being done about it, and how far each village has come. Every bar on this page is
        drawn from the same records stewards update — alongside allied wardwrights and relays of the Alliance Protocol.
      </PageHero>
      <Container className="mt-12">
        <RestorationView />
      </Container>
    </>
  );
}
