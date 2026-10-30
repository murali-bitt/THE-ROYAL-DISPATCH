"use client";

import Link from "next/link";
import { useId } from "react";
import { ConditionGlyph } from "@/components/ui/marks";
import { CONDITION_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { Village } from "@/types/domain";

/**
 * An illustrated, non-geographic map of the fictional Kingdom of Valmora.
 * The landscape is a static SVG; village markers are real HTML links/buttons
 * positioned over it so they are keyboard- and screen-reader-accessible.
 */

const W = 1000;
const H = 680;

const COAST =
  "M120 120 C180 70 300 62 380 50 C470 38 560 30 640 60 C720 90 800 108 860 168 C905 214 902 282 880 330 C860 380 882 430 852 480 C826 524 776 548 742 584 C716 610 690 586 662 596 C612 640 524 642 452 632 C380 622 300 610 240 580 C170 545 112 500 92 430 C72 360 62 282 76 212 C86 162 100 134 120 120 Z";

const ROADS = [
  // western trade road — Kingsfall → Ashenreach → the west coast
  "M490 347 C420 340 300 322 180 299 C140 292 110 296 82 300",
  "M490 347 C486 270 478 180 470 102",
  "M490 347 C580 320 700 260 800 218",
  "M490 347 C560 420 630 490 680 544",
  "M490 347 C440 400 390 440 340 476",
  "M240 163 C220 210 200 255 180 299",
  "M240 163 C320 140 400 118 470 102",
];

export interface MapMarker {
  village: Village;
  openIncidents: number;
}

export function KingdomMap({
  markers,
  selectedId,
  onSelect,
  onHover,
  linkMarkers = false,
  awakened = false,
  className,
  compact = false,
}: {
  markers: MapMarker[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  linkMarkers?: boolean;
  awakened?: boolean;
  className?: string;
  compact?: boolean;
}) {
  // Hidden routes stay mounted under <Activity>, so SVG ids must be unique per instance.
  const uid = useId().replace(/:/g, "");
  const spotlit = markers.find((m) => m.village.id === selectedId)?.village;
  return (
    <figure className={cn("relative w-full select-none", className)}>
      <div className="map-plate frame-corners relative w-full overflow-hidden rounded-xs" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" role="img" aria-labelledby={`${uid}-title`}>
          <title id={`${uid}-title`}>Illustrated map of the Kingdom of Valmora showing its villages</title>
          <defs>
            <pattern id={`${uid}-sea`} width="14" height="10" patternUnits="userSpaceOnUse">
              <path d="M0 5 Q3.5 2.5 7 5 T14 5" fill="none" stroke="#ffffff" strokeOpacity="0.06" strokeWidth="0.8" />
            </pattern>
            <pattern id={`${uid}-hatch`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="0.8" />
            </pattern>
            <radialGradient id={`${uid}-reach`} cx="54%" cy="58%" r="50%">
              <stop offset="0%" stopColor="#000000" stopOpacity={awakened ? 0.75 : 0.45} />
              <stop offset="60%" stopColor="#000000" stopOpacity={awakened ? 0.35 : 0.12} />
              <stop offset="100%" stopColor="#000000" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`${uid}-moon`} cx="18%" cy="8%" r="80%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.09" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
            <clipPath id={`${uid}-land`}>
              <path d={COAST} />
            </clipPath>
          </defs>

          <rect width={W} height={H} fill={`url(#${uid}-sea)`} />
          <path d={COAST} fill="#111111" />
          <path d={COAST} fill={`url(#${uid}-moon)`} />
          {/* coast echo lines */}
          <path d={COAST} fill="none" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.4" />
          <path d={COAST} fill="none" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" transform="translate(500 340) scale(1.025) translate(-500 -340)" />
          <path d={COAST} fill="none" stroke="#ffffff" strokeOpacity="0.05" strokeWidth="1" transform="translate(500 340) scale(1.05) translate(-500 -340)" />

          <g clipPath={`url(#${uid}-land)`}>
            {/* Northern ridge */}
            {Array.from({ length: 13 }, (_, i) => {
              const x = 330 + i * 24 + (i % 2) * 6;
              const y = 96 + (i % 3) * 10;
              const h = 26 + (i % 4) * 6;
              return (
                <g key={`m${i}`}>
                  <path d={`M${x - 16} ${y + 10} L${x} ${y - h + 20} L${x + 16} ${y + 10}`} fill="#0d0d0d" stroke="#ffffff" strokeOpacity="0.45" strokeWidth="1" />
                  <path d={`M${x} ${y - h + 20} L${x + 7} ${y + 10}`} stroke="#ffffff" strokeOpacity="0.2" strokeWidth="0.8" />
                </g>
              );
            })}
            {/* the ward-line (failing) */}
            <path d="M300 150 C400 132 520 128 650 148" fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="2 9" />

            {/* Briarwood */}
            {Array.from({ length: 34 }, (_, i) => {
              const cx = 168 + ((i * 37) % 150);
              const cy = 128 + ((i * 53) % 90);
              return <circle key={`t${i}`} cx={cx} cy={cy} r={3 + (i % 3)} fill="none" stroke="#ffffff" strokeOpacity="0.28" strokeWidth="0.8" />;
            })}

            {/* Hollowmere lake */}
            <ellipse cx="296" cy="512" rx="74" ry="34" fill="#050505" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1" />
            <ellipse cx="296" cy="512" rx="74" ry="34" fill={`url(#${uid}-hatch)`} />
            <ellipse cx="296" cy="512" rx="88" ry="42" fill="none" stroke="#ffffff" strokeOpacity="0.08" />

            {/* Kingsfall Downs contours */}
            {[30, 54, 80, 108].map((r, i) => (
              <ellipse key={r} cx="545" cy="405" rx={r * 1.35} ry={r * 0.7} fill="none" stroke="#ffffff" strokeOpacity={0.12 - i * 0.02} strokeWidth="0.8" />
            ))}

            {/* Moonfall cliffs */}
            {Array.from({ length: 16 }, (_, i) => (
              <path key={`c${i}`} d={`M${838 + (i % 2) * 6} ${150 + i * 9} l22 4`} stroke="#ffffff" strokeOpacity="0.3" strokeWidth="0.8" />
            ))}

            {/* Ash terraces */}
            {Array.from({ length: 6 }, (_, i) => (
              <path key={`a${i}`} d={`M${140 + i * 4} ${262 + i * 10} q40 -8 80 0`} fill="none" stroke="#ffffff" strokeOpacity="0.14" strokeWidth="0.8" />
            ))}

            {/* Kirmada's reach */}
            <rect width={W} height={H} fill={`url(#${uid}-reach)`} />
          </g>

          {/* Roads */}
          {ROADS.map((d, i) => (
            <path key={i} d={d} fill="none" stroke="#ffffff" strokeOpacity="0.32" strokeWidth="1.1" strokeDasharray="5 5" />
          ))}

          {/* The ash fissure across the western road */}
          <path d="M126 270 l8 10 l-6 8 l9 9 l-5 10 l7 11" fill="none" stroke="#ffffff" strokeWidth="1.8" />

          {/* The Sleeper's barrow */}
          <g transform="translate(560 420)">
            <circle r={awakened ? 16 : 12} fill="#000000" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="1" />
            <circle r={awakened ? 24 : 20} fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeDasharray="1 3" />
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i * Math.PI) / 4;
              return <line key={i} x1={Math.cos(a) * 4} y1={Math.sin(a) * 4} x2={Math.cos(a) * 10} y2={Math.sin(a) * 10} stroke="#ffffff" strokeOpacity="0.7" strokeWidth="0.9" />;
            })}
            {awakened && <path d="M-26 -6 l10 4 l-4 6 l12 2" fill="none" stroke="#ffffff" strokeWidth="1.2" />}
          </g>

          {!compact && (
            <g fill="#ffffff" style={{ fontFamily: "var(--font-mono)" }}>
              <text x="560" y="462" textAnchor="middle" fontSize="11" fillOpacity="0.55" letterSpacing="3">
                {awakened ? "THE BARROW · OPEN" : "THE SLEEPER'S BARROW"}
              </text>
              <text x="470" y="40" textAnchor="middle" fontSize="11" fillOpacity="0.4" letterSpacing="4">THE NORTHERN RIDGE</text>
              <text x="230" y="230" textAnchor="middle" fontSize="10" fillOpacity="0.35" letterSpacing="3">BRIARWOOD</text>
              <text x="296" y="572" textAnchor="middle" fontSize="10" fillOpacity="0.35" letterSpacing="3">THE STILL LAKE</text>
              <text x="935" y="420" textAnchor="middle" fontSize="11" fillOpacity="0.3" letterSpacing="4" transform="rotate(90 935 420)">THE GREY SEA</text>
              <text x="118" y="250" fontSize="9" fillOpacity="0.5" letterSpacing="2">ASH FISSURE</text>
            </g>
          )}

          {/* Compass rose */}
          <g transform="translate(84 600)" stroke="#ffffff" strokeOpacity="0.5" fill="none">
            <circle r="22" strokeWidth="0.8" />
            <circle r="30" strokeWidth="0.5" strokeDasharray="1 3" />
            <path d="M0 -34 L5 0 L0 34 L-5 0 Z" fill="#ffffff" fillOpacity="0.15" strokeWidth="0.8" />
            <path d="M-34 0 L0 4 L34 0 L0 -4 Z" strokeWidth="0.8" />
            <text y="-40" textAnchor="middle" fontSize="10" fill="#ffffff" fillOpacity="0.6" stroke="none" style={{ fontFamily: "var(--font-mono)" }}>
              N
            </text>
          </g>
        </svg>

        {/* Atmosphere over the chart: drifting fog and a lantern on the chosen village. */}
        <div aria-hidden className="map-fog" />
        {spotlit ? <span aria-hidden className="map-spot" style={{ left: `${spotlit.map.x}%`, top: `${spotlit.map.y}%` }} /> : null}

        {/* Village markers */}
        <ul className="absolute inset-0" aria-label="Villages">
          {markers.map(({ village, openIncidents }) => {
            const selected = selectedId === village.id;
            const label = `${village.name} — ${CONDITION_LABEL[village.condition]}, ${openIncidents} open incident${openIncidents === 1 ? "" : "s"}, ${village.restoration}% restored`;
            const inner = (
              <>
                <span className="relative flex size-6 items-center justify-center">
                  {selected || village.condition === "critical" ? (
                    <span aria-hidden className="absolute inset-0 animate-pulse-ring rounded-full border border-ivory" />
                  ) : (
                    <span aria-hidden className="marker-breathe absolute inset-0 rounded-full border border-ivory/40" />
                  )}
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full border bg-canvas transition-colors",
                      selected ? "border-bright bg-ivory text-canvas" : "border-ivory/70 text-ivory group-hover/marker:border-bright",
                    )}
                  >
                    <ConditionGlyph condition={village.condition} className="size-2.5" />
                  </span>
                </span>
                <span
                  className={cn(
                    "pointer-events-none ml-1.5 whitespace-nowrap font-mono text-[0.6rem] uppercase tracking-[0.16em] transition-colors sm:text-[0.66rem]",
                    compact ? "hidden md:inline" : "hidden sm:inline",
                    selected ? "text-bright" : "text-secondary group-hover/marker:text-bright",
                  )}
                >
                  {village.name}
                  {openIncidents > 0 ? <span className="ml-1.5 text-muted">· {openIncidents}</span> : null}
                </span>
              </>
            );
            const markerClass =
              "group/marker absolute flex -translate-x-3 -translate-y-1/2 items-center rounded-full p-1 -m-1 focus-visible:outline-offset-2";
            return (
              <li key={village.id} style={{ left: `${village.map.x}%`, top: `${village.map.y}%` }} className="absolute">
                {linkMarkers ? (
                  <Link href={`/villages/${village.id}`} aria-label={label} className={markerClass} onMouseEnter={() => onHover?.(village.id)} onMouseLeave={() => onHover?.(null)}>
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    aria-label={label}
                    aria-pressed={selected}
                    className={markerClass}
                    onClick={() => onSelect?.(village.id)}
                    onMouseEnter={() => onHover?.(village.id)}
                    onMouseLeave={() => onHover?.(null)}
                    onFocus={() => onHover?.(village.id)}
                    onBlur={() => onHover?.(null)}
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted">
        <span>Illustrated chart · not to scale</span>
        {(["stable", "strained", "afflicted", "critical"] as const).map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5">
            <ConditionGlyph condition={c} className="size-2.5" />
            {CONDITION_LABEL[c]}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
