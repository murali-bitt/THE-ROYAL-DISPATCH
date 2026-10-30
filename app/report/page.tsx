import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportForm } from "@/components/incidents/report-form";
import { Container, PageHero } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_EXPLAINER, STATUS_LABEL } from "@/lib/labels";
import { INCIDENT_STATUSES } from "@/types/domain";

export const metadata: Metadata = {
  title: "Report an incident",
  description: "File a report of a magical disaster, damaged ward or failed service with the Royal Dispatch.",
};

export default function ReportPage() {
  return (
    <>
      <PageHero label="II · File a report" realm="Send a Raven" title="Report an incident to the Crown">
        Tell the Crown what you have seen. Your raven carries a tracking reference to the stewards of your village, and
        every answer they give is written where you can follow it.
      </PageHero>
      <Container className="mt-14 grid grid-cols-1 gap-14 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Suspense fallback={<Skeleton className="h-[40rem] w-full" />}>
            <ReportForm />
          </Suspense>
        </div>
        <aside className="lg:col-span-4" aria-labelledby="what-next">
          <div className="lg:sticky lg:top-32">
            <h2 id="what-next" className="eyebrow">
              What happens next · the raven&apos;s road
            </h2>
            <ol className="mt-6 flex flex-col">
              {INCIDENT_STATUSES.map((status, i) => (
                <li key={status} className="relative border-l border-line pb-7 pl-6 last:pb-0">
                  <span aria-hidden className="absolute -left-[5px] top-1 size-2.5 rounded-full border border-ivory bg-canvas" />
                  <p className="font-mono text-[0.66rem] uppercase tracking-[0.16em] text-ivory">
                    {String(i + 1).padStart(2, "0")} · {STATUS_LABEL[status]}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{STATUS_EXPLAINER[status]}</p>
                </li>
              ))}
            </ol>
            <div className="mt-10 border border-line-soft p-5">
              <p className="eyebrow">If you find an artifact</p>
              <p className="mt-2 text-sm leading-relaxed text-secondary">
                Do not touch it or carry it indoors. Note where it lies and choose <em>Cursed artifact</em>.
              </p>
            </div>
          </div>
        </aside>
      </Container>
    </>
  );
}
