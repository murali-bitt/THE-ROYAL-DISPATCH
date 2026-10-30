import { useId } from "react";
import { cn } from "@/lib/utils";

/** The Royal Dispatch seal — an original monochrome mark. */
export function RoyalSeal({ className, title }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 120 120" className={cn("text-ivory", className)} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title ? <title>{title}</title> : null}
      <defs>
        <path id={`${id}-ring`} d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" />
      </defs>
      <circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="60" cy="60" r="53" fill="none" stroke="currentColor" strokeWidth="0.6" strokeDasharray="1 2.4" />
      <circle cx="60" cy="60" r="35" fill="none" stroke="currentColor" strokeWidth="0.9" />
      <text fontSize="7.6" letterSpacing="2.6" fill="currentColor" style={{ fontFamily: "var(--font-mono)" }}>
        <textPath href={`#${id}-ring`} startOffset="0">
          THE ROYAL DISPATCH · VALMORA · EVERY SIGNAL MATTERS ·
        </textPath>
      </text>
      {/* crown */}
      <path
        d="M40 70 L42 50 L50 60 L60 44 L70 60 L78 50 L80 70 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="miter"
      />
      <path d="M40 74 H80" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="60" cy="41" r="2" fill="currentColor" />
      <circle cx="42" cy="47.5" r="1.4" fill="currentColor" />
      <circle cx="78" cy="47.5" r="1.4" fill="currentColor" />
      <path d="M52 80 L60 86 L68 80" fill="none" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

/** Kirmada's sigil — the Wheel of Evil: a broken rim, eight spokes, a closed eye. */
export function WheelSigil({ className, awake = false }: { className?: string; awake?: boolean }) {
  const spokes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  return (
    <svg viewBox="0 0 200 200" aria-hidden className={cn("text-ivory", className)}>
      <circle cx="100" cy="100" r="92" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.35" />
      {/* broken rim: four arcs with gaps */}
      {[0, 1, 2, 3].map((q) => {
        const a0 = (q * Math.PI) / 2 + 0.18;
        const a1 = ((q + 1) * Math.PI) / 2 - 0.18;
        const r = 78;
        const p = (a: number) => `${100 + r * Math.cos(a)} ${100 + r * Math.sin(a)}`;
        return (
          <path key={q} d={`M ${p(a0)} A ${r} ${r} 0 0 1 ${p(a1)}`} fill="none" stroke="currentColor" strokeWidth="3" />
        );
      })}
      <circle cx="100" cy="100" r="64" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="2 4" />
      {spokes.map((a, i) => (
        <g key={i}>
          <line
            x1={100 + 22 * Math.cos(a)}
            y1={100 + 22 * Math.sin(a)}
            x2={100 + 76 * Math.cos(a)}
            y2={100 + 76 * Math.sin(a)}
            stroke="currentColor"
            strokeWidth={i % 2 === 0 ? 2 : 0.9}
          />
          <path
            d={`M ${100 + 84 * Math.cos(a)} ${100 + 84 * Math.sin(a)} l ${6 * Math.cos(a)} ${6 * Math.sin(a)}`}
            stroke="currentColor"
            strokeWidth="2"
          />
        </g>
      ))}
      <circle cx="100" cy="100" r="22" fill="var(--color-canvas)" stroke="currentColor" strokeWidth="1.6" />
      {awake ? (
        <>
          <path d="M84 100 Q100 86 116 100 Q100 114 84 100 Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <circle cx="100" cy="100" r="5" fill="currentColor" />
        </>
      ) : (
        <path d="M84 101 Q100 110 116 101" fill="none" stroke="currentColor" strokeWidth="1.6" />
      )}
    </svg>
  );
}
