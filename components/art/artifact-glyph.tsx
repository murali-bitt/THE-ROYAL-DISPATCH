import { cn } from "@/lib/utils";
import type { ArtifactGlyph as Glyph } from "@/types/domain";

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** Original line-art illustrations for the Grimoire's artifacts. */
export function ArtifactGlyph({ glyph, className }: { glyph: Glyph; className?: string }) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden className={cn("text-ivory", className)}>
      <circle cx="48" cy="48" r="46" {...stroke} strokeWidth={0.6} opacity={0.4} />
      {glyph === "lantern" && (
        <g>
          <path d="M40 18 Q48 10 56 18" {...stroke} />
          <path d="M36 24 H60 L58 30 H38 Z" {...stroke} />
          <path d="M38 30 L34 66 H62 L58 30" {...stroke} />
          <path d="M34 66 H62 L60 72 H36 Z" {...stroke} />
          <path d="M42 30 L40 66 M54 30 L56 66" {...stroke} strokeWidth={0.7} />
          {/* the black flame */}
          <path d="M48 58 C40 52 44 44 48 38 C52 44 56 52 48 58 Z" fill="currentColor" />
          <path d="M30 40 L22 36 M66 40 L74 36 M30 52 L20 54 M66 52 L76 54" {...stroke} strokeWidth={0.7} strokeDasharray="1.5 2" />
        </g>
      )}
      {glyph === "codex" && (
        <g>
          <path d="M22 28 Q35 22 48 28 Q61 22 74 28 V70 Q61 64 48 70 Q35 64 22 70 Z" {...stroke} />
          <path d="M48 28 V70" {...stroke} />
          <path d="M28 36 H42 M28 42 H40 M28 48 H42 M54 36 H68 M56 42 H68 M54 48 H66" {...stroke} strokeWidth={0.7} />
          {/* thorns binding the book */}
          <path d="M16 54 Q48 42 80 58" {...stroke} strokeWidth={1.8} />
          <path d="M26 50 l-3 -5 M36 47 l-1 -6 M58 49 l2 -6 M68 52 l4 -5 M31 49 l2 5 M63 51 l-1 6" {...stroke} />
          <path d="M60 72 l6 8 M66 70 l8 6" {...stroke} strokeWidth={0.8} strokeDasharray="2 2" />
        </g>
      )}
      {glyph === "bell" && (
        <g>
          <path d="M44 18 H52 V24" {...stroke} />
          <path d="M48 24 C34 24 32 38 32 50 C32 58 28 62 24 66 H72 C68 62 64 58 64 50 C64 38 62 24 48 24 Z" {...stroke} />
          <circle cx="48" cy="71" r="4" fill="currentColor" />
          {/* waterline */}
          <path d="M14 46 Q22 43 30 46 T46 46 T62 46 T78 46 T84 46" {...stroke} strokeWidth={0.8} />
          <path d="M14 78 Q22 75 30 78 T46 78 T62 78 T78 78" {...stroke} strokeWidth={0.6} opacity={0.6} />
          <path d="M18 84 Q26 81 34 84 T50 84 T66 84" {...stroke} strokeWidth={0.6} opacity={0.4} />
        </g>
      )}
      {glyph === "compass" && (
        <g>
          <circle cx="48" cy="50" r="24" {...stroke} />
          <circle cx="48" cy="50" r="19" {...stroke} strokeWidth={0.6} strokeDasharray="1 2.5" />
          <path d="M44 22 H52 V26 H44 Z" {...stroke} />
          {/* the ash needle, pointing wrong */}
          <path d="M48 50 L62 62 L50 48 Z" fill="currentColor" />
          <path d="M48 50 L36 40" {...stroke} strokeWidth={0.8} strokeDasharray="1 2" />
          <circle cx="48" cy="50" r="2" fill="currentColor" />
          <text x="48" y="36" textAnchor="middle" fontSize="6" fill="currentColor" style={{ fontFamily: "var(--font-mono)" }}>
            N
          </text>
          <path d="M66 70 q4 4 2 9 M70 66 q6 2 7 8 M62 74 q1 5 -2 8" {...stroke} strokeWidth={0.7} />
        </g>
      )}
      {glyph === "hourglass" && (
        <g>
          <path d="M30 18 H66 M30 78 H66" {...stroke} strokeWidth={2} />
          <path d="M34 18 C34 36 46 42 46 48 C46 54 34 60 34 78 M62 18 C62 36 50 42 50 48 C50 54 62 60 62 78" {...stroke} />
          {/* sand rising: most of it is above */}
          <path d="M38 24 H58 C57 32 51 38 48 42 C45 38 39 32 38 24 Z" fill="currentColor" />
          <path d="M48 46 V56" {...stroke} strokeWidth={0.8} strokeDasharray="1 1.6" />
          <path d="M44 76 Q48 73 52 76 Z" fill="currentColor" />
          <path d="M26 30 V66 M70 30 V66" {...stroke} strokeWidth={0.7} />
        </g>
      )}
    </svg>
  );
}
