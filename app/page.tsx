import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { ArrowRight, Feather, Radio } from "lucide-react";
import { AllianceProtocol } from "@/components/alliance/alliance-protocol";
import { RoyalSeal } from "@/components/art/seal";
import {
  ActivityFeed,
  CurseSection,
  DispatchesPreview,
  RealmMetrics,
  RestorationPreview,
  VillageSummary,
} from "@/components/overview/overview-sections";
import { CurseClockPanel } from "@/components/sleeper/curse-clock";
import { buttonClasses } from "@/components/ui/button";
import { Ornament } from "@/components/ui/ornament";
import { Container } from "@/components/ui/section";

const HERO_WORDS = ["The", "Crown", "still", "hears", "you."];

export default function OverviewPage() {
  return (
    <>
      <section aria-labelledby="hero-heading" className="relative overflow-hidden">
        <div aria-hidden className="architecture absolute inset-0 opacity-70" />
        <div aria-hidden className="fog" />
        <RoyalSeal className="pointer-events-none absolute -left-24 top-20 hidden size-[32rem] opacity-[0.035] lg:block" />
        <Container className="relative grid grid-cols-1 gap-12 pb-16 pt-14 md:pt-20 lg:grid-cols-12 lg:items-end lg:pb-24">
          <div className="lg:col-span-7">
            <p className="eyebrow hero-fade flex flex-wrap items-center gap-3" style={{ "--delay": "0s" } as CSSProperties}>
              <span className="text-ivory">The Royal Dispatch</span>
              <span aria-hidden className="h-px w-8 bg-line-strong" />
              Royal Incident Response Network
            </p>
            <h1 id="hero-heading" className="gothic emerge mt-8 text-[clamp(2.6rem,7vw,6.1rem)] font-semibold uppercase !leading-[0.98] tracking-[0.05em] [text-shadow:0_0_42px_rgb(255_255_255/0.14)]">
              {HERO_WORDS.map((word, i) => (
                <Fragment key={word}>
                  {i > 0 ? " " : null}
                  <span className="silver" style={{ "--i": i } as CSSProperties}>
                    {word}
                  </span>
                </Fragment>
              ))}
            </h1>
            <Ornament className="hero-fade mt-8 max-w-sm" />
            <p className="hero-fade mt-8 max-w-xl text-lg leading-relaxed text-secondary" style={{ "--delay": "1.05s" } as CSSProperties}>
              The kingdom has fallen silent. Kirmada&apos;s curse spreads beyond the last lantern. Send word to the Crown
              before the final ward goes dark.
            </p>
            <div className="hero-fade mt-10 flex flex-wrap gap-3" style={{ "--delay": "1.2s" } as CSSProperties}>
              <Link href="/report" className={buttonClasses("primary", "lg", "h-auto min-h-13 flex-col items-start gap-0.5 py-2.5")}>
                <span className="inline-flex items-center gap-2">
                  <Feather className="size-4" aria-hidden /> Send a Raven <ArrowRight className="size-4 transition-transform group-hover/button:translate-x-1" aria-hidden />
                </span>
                <span className="text-[0.6rem] font-medium tracking-[0.18em] text-canvas/70">Report an incident</span>
              </Link>
              <Link href="/villages" className={buttonClasses("secondary", "lg")}>
                Enter the Kingdom
              </Link>
            </div>
            <Link
              href="#alliance"
              className="hero-fade group mt-10 inline-flex items-center gap-3 border-l border-ivory pl-4 text-sm text-secondary transition-colors hover:text-bright"
              style={{ "--delay": "1.35s" } as CSSProperties}
            >
              <Radio className="size-4 shrink-0 text-ivory" aria-hidden />
              <span>
                Signals restored through <span className="font-semibold text-ivory">the Alliance Protocol</span> with
                KAPIDHWAJ, official event partner
              </span>
              <ArrowRight className="size-3.5 shrink-0 transition-transform group-hover:translate-x-1" aria-hidden />
            </Link>
          </div>
          <div className="hero-fade lg:col-span-5" style={{ "--delay": "0.6s" } as CSSProperties}>
            <CurseClockPanel />
          </div>
        </Container>
      </section>

      <RealmMetrics />

      <Container className="mt-20 grid grid-cols-1 gap-20 lg:grid-cols-12 lg:gap-14">
        <div className="lg:col-span-7">
          <ActivityFeed />
        </div>
        <div className="lg:col-span-5">
          <VillageSummary />
        </div>
      </Container>

      <div className="mt-24">
        <AllianceProtocol />
      </div>

      <Container className="mt-24 flex flex-col gap-24">
        <DispatchesPreview />
        <RestorationPreview />
      </Container>

      <div className="mt-24">
        <CurseSection />
      </div>
    </>
  );
}
