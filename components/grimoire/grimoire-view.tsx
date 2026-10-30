"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArtifactGlyph } from "@/components/art/artifact-glyph";
import { KirmadaPortrait } from "@/components/art/kirmada-portrait";
import { WheelSigil } from "@/components/art/seal";
import { DataGate } from "@/components/data/data-gate";
import { useKingdom, useVillageMap } from "@/components/providers/kingdom-provider";
import { PriorityChip, StatusChip } from "@/components/ui/marks";
import { Skeleton } from "@/components/ui/skeleton";
import { ClockDigits } from "@/components/sleeper/curse-clock";
import { concernsKirmada } from "@/lib/kirmada";
import { publishedAnnouncements } from "@/lib/selectors";
import { useSleeper } from "@/lib/sleeper/use-sleeper";
import { cn } from "@/lib/utils";

const CHRONICLE = [
  { mark: "I", title: "The Battle of Kingsfall Downs", body: "The Crown's host breaks Kirmada's army on the Downs. The sorcerer falls and is sealed in a barrow beneath the hill." },
  { mark: "II", title: "The scattering", body: "Before the end, Kirmada sends his artifacts into the land — a lantern, a book, a bell, a compass — each bound to a part of the kingdom." },
  { mark: "III", title: "The first tolling", body: "Generations later, a bell rings beneath Hollowmere lake. Water turns to ink; the curse begins." },
  { mark: "IV", title: "The Alliance Protocol", body: "As the beacons die, the Council invokes its accord with KAPIDHWAJ, whose relays keep the villages speaking to the Crown." },
  { mark: "V", title: "The hourglass", body: "Scryers find the Sleeper's glass running upward, with thirteen minutes and four seconds of sand remaining." },
];

export function GrimoireView() {
  const { remaining, awakened } = useSleeper();
  return (
    <div className="flex flex-col gap-24">
      <section aria-labelledby="kirmada-heading" className="grid grid-cols-1 items-start gap-12 lg:grid-cols-12 lg:gap-16" data-testid="kirmada-profile">
        <div className="lg:col-span-5">
          <div className="relative mx-auto w-[min(30rem,100%)] lg:sticky lg:top-36">
            <KirmadaPortrait variant="grimoire" priority />
            <WheelSigil awake={awakened} className="pointer-events-none absolute -bottom-10 -right-6 w-28 opacity-80 sm:w-32" />
          </div>
        </div>
        <div className="lg:col-span-7">
          <p className="eyebrow">The Wheel of Evil · Antagonist</p>
          <h2 id="kirmada-heading" className="gothic silver mt-5 text-[clamp(2.4rem,5.4vw,4.4rem)] font-semibold tracking-[0.12em]">
            Kirmada
          </h2>
          <p className="mt-3 font-display text-[clamp(1.4rem,2.6vw,2rem)] italic leading-snug text-secondary">
            The sorcerer who would not stay buried
          </p>
          <dl className="mt-8 grid grid-cols-1 gap-px border border-line-soft bg-line-soft text-sm sm:grid-cols-2">
            {[
              ["Called", "The Sleeper · Master of the Wheel"],
              ["Bound", "In a barrow beneath Kingsfall Downs"],
              ["His sign", "A broken wheel: eight spokes, a cracked rim, a closed eye"],
              ["Threat", awakened ? "Awake. The Wheel turns again." : "Sleeping — but his glass runs upward"],
            ].map(([label, value]) => (
              <div key={label} className="bg-canvas-2/90 p-4">
                <dt className="eyebrow">{label}</dt>
                <dd className="mt-1.5 text-secondary">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="prose-noir mt-8 max-w-xl text-lg leading-relaxed text-secondary">
            <p>
              Long before the wards fell silent, the name Kirmada was spoken only in the sealed chambers of the Crown. He
              broke the old kingdom once, at the Battle of Kingsfall Downs — and when the Crown&apos;s host finally brought
              him down, he did not die. He slept.
            </p>
            <p>
              His curse does not destroy a kingdom in one night. It makes every village forget how to call for help: the
              beacons gutter, the ravens turn back, the ward-stones go dark one by one.
            </p>
            <p>
              The artifacts scattered across the Forsaken Lands are not trophies. They are fragments of a spell that was
              never meant to be completed — anchors that hold his sleep while feeding his curse. Each one contained
              weakens him; each one lost strengthens the Wheel.
            </p>
          </div>
          <div className="mt-8 inline-flex items-center gap-5 border border-line px-5 py-4">
            <p className="eyebrow">{awakened ? "The Sleeper" : "The Sleeper wakes in"}</p>
            {awakened ? (
              <span className="font-mono text-2xl font-semibold text-bright">Awake</span>
            ) : (
              <ClockDigits remaining={remaining} className="text-2xl text-bright" />
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="chronicle-heading">
        <p className="eyebrow">Chronicle</p>
        <h2 id="chronicle-heading" className="display mt-4 text-[clamp(2rem,4vw,3rem)]">
          How the curse came to Valmora
        </h2>
        <ol className="mt-10 grid gap-px border border-line-soft bg-line-soft md:grid-cols-5">
          {CHRONICLE.map((c) => (
            <li key={c.mark} className="bg-canvas p-6">
              <p className="font-display text-3xl text-faint">{c.mark}</p>
              <p className="mt-4 text-sm font-semibold text-ivory">{c.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted">{c.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="artifacts-heading">
        <p className="eyebrow">The cursed artifacts</p>
        <h2 id="artifacts-heading" className="display mt-4 text-[clamp(2rem,4vw,3rem)]">
          What he left behind
        </h2>
        <DataGate fallback={<Skeleton className="mt-10 h-96 w-full" />}>
          <ArtifactList />
        </DataGate>
      </section>
    </div>
  );
}

function ArtifactList() {
  const { snapshot } = useKingdom();
  const villages = useVillageMap();
  const published = publishedAnnouncements(snapshot.announcements);
  return (
    <ol className="mt-12 flex flex-col">
      {snapshot.artifacts.map((artifact, index) => {
        const incidents = snapshot.incidents.filter((i) => artifact.incidentIds.includes(i.id));
        const village = villages.get(artifact.villageId);
        const initiatives = snapshot.initiatives.filter(
          (init) => init.incidentIds.some((id) => artifact.incidentIds.includes(id)) || init.villageId === artifact.villageId,
        );
        const dispatches = published
          .filter((a) => a.villageId === artifact.villageId || a.id === "dsp-council-artifact")
          .slice(0, 2);
        return (
          <motion.li
            key={artifact.id}
            id={artifact.id}
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 scroll-mt-40 gap-8 border-t border-line-soft py-14 md:grid-cols-12 md:gap-12"
          >
            <div className={cn("flex items-start justify-center md:col-span-4", index % 2 === 1 && "md:order-last")}>
              <div className="relative">
                <div aria-hidden className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.07),transparent_65%)]" />
                <ArtifactGlyph glyph={artifact.glyph} className="relative w-[min(15rem,60vw)]" />
              </div>
            </div>
            <div className="md:col-span-8">
              <p className="eyebrow">
                {String(index + 1).padStart(2, "0")} · {artifact.origin}
              </p>
              <h3 className="display mt-4 text-[clamp(2rem,4vw,3.25rem)]">{artifact.name}</h3>
              <p className="mt-2 font-display text-xl italic text-muted">{artifact.epithet}</p>
              <p className="mt-6 max-w-2xl leading-relaxed text-secondary">{artifact.description}</p>
              {concernsKirmada(artifact.lore, artifact.description) ? (
                <div className="mt-6 flex max-w-2xl items-start gap-5">
                  <KirmadaPortrait variant="context" decorative className="w-16 shrink-0 sm:w-20" />
                  <blockquote className="border-l border-ivory pl-5 font-display text-xl italic leading-relaxed text-ivory">
                    {artifact.lore}
                    <footer className="eyebrow mt-3 not-italic">Bound to Kirmada</footer>
                  </blockquote>
                </div>
              ) : (
                <blockquote className="mt-6 max-w-2xl border-l border-ivory pl-5 font-display text-xl italic leading-relaxed text-ivory">
                  {artifact.lore}
                </blockquote>
              )}
              <dl className="mt-8 grid gap-px border border-line-soft bg-line-soft text-sm sm:grid-cols-3">
                <div className="bg-canvas-2 p-4">
                  <dt className="eyebrow">Linked disaster</dt>
                  <dd className="mt-1.5 text-secondary">{artifact.disaster}</dd>
                </div>
                <div className="bg-canvas-2 p-4">
                  <dt className="eyebrow">Containment</dt>
                  <dd className="mt-1.5 text-secondary">{artifact.containment}</dd>
                </div>
                <div className="bg-canvas-2 p-4">
                  <dt className="eyebrow">Village</dt>
                  <dd className="mt-1.5">
                    {village ? (
                      <Link href={`/villages/${village.id}`} className="text-secondary underline decoration-line-strong underline-offset-4 hover:text-bright">
                        {village.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
              </dl>
              {incidents.length ? (
                <div className="mt-6">
                  <p className="eyebrow mb-2">Linked incident records</p>
                  <ul className="flex flex-col gap-2">
                    {incidents.map((i) => (
                      <li key={i.id}>
                        <Link href={`/incidents/${i.reference}`} className="group flex flex-wrap items-center gap-3 text-sm">
                          <span className="font-mono text-xs text-faint">{i.reference}</span>
                          <span className="text-secondary group-hover:text-bright">{i.title}</span>
                          <StatusChip status={i.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {initiatives.length || dispatches.length ? (
                <div className="mt-6 grid gap-4 border-t border-line-soft pt-5 sm:grid-cols-2">
                  {initiatives.length ? (
                    <div>
                      <p className="eyebrow mb-2">Containment &amp; restoration</p>
                      <ul className="flex flex-col gap-1.5">
                        {initiatives.map((init) => (
                          <li key={init.id}>
                            <Link href="/restoration" className="text-sm text-secondary underline decoration-line-strong underline-offset-4 hover:text-bright">
                              {init.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {dispatches.length ? (
                    <div>
                      <p className="eyebrow mb-2">Associated dispatches</p>
                      <ul className="flex flex-col gap-1.5">
                        {dispatches.map((d) => (
                          <li key={d.id} className="flex flex-wrap items-center gap-2">
                            <PriorityChip priority={d.priority} />
                            <Link href={`/dispatches/${d.id}`} className="text-sm text-secondary underline decoration-line-strong underline-offset-4 hover:text-bright">
                              {d.title}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
