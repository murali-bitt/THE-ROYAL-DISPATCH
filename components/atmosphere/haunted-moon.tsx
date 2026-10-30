import { cn } from "@/lib/utils";

/**
 * The haunted moon — original monochrome SVG artwork. Its maria and craters
 * are arranged so that, if you look long enough, the moon is looking back:
 * two hollow sockets and a thin, cratered grin, all kept at low contrast.
 * Pointer parallax, halo strength and the terminator shadow are driven by the
 * background's CSS custom properties (see .haunt-moon in globals.css).
 * Ids are static because exactly one moon is ever mounted, inside the
 * background layer.
 */
export function HauntedMoon({ variant, className }: { variant: "hero" | "watch"; className?: string }) {
  return (
    <div className={cn("haunt-moon", className)} data-variant={variant} data-testid="haunted-moon">
      <svg viewBox="0 0 400 400" className="h-full w-full overflow-visible">
        <defs>
          <radialGradient id="moon-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.2" />
            <stop offset="38%" stopColor="#ffffff" stopOpacity="0.07" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.02" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="moon-disc" cx="40%" cy="36%" r="68%">
            <stop offset="0%" stopColor="#d6d6d6" />
            <stop offset="42%" stopColor="#a3a3a3" />
            <stop offset="80%" stopColor="#5c5c5c" />
            <stop offset="100%" stopColor="#2e2e2e" />
          </radialGradient>
          <radialGradient id="moon-shade" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="#000000" stopOpacity="0" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.78" />
          </radialGradient>
          <radialGradient id="moon-crater" cx="38%" cy="34%" r="70%">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.06" />
          </radialGradient>
          <clipPath id="moon-clip">
            <circle cx="200" cy="200" r="118" />
          </clipPath>
        </defs>

        <circle className="haunt-moon-halo" cx="200" cy="200" r="200" fill="url(#moon-halo)" />

        <g className="haunt-moon-body">
          <g clipPath="url(#moon-clip)">
            <circle cx="200" cy="200" r="118" fill="url(#moon-disc)" />
            {/* maria: the dark seas */}
            <path d="M120 150 C140 120 190 118 205 140 C220 160 190 185 160 182 C132 180 108 172 120 150 Z" fill="#000" opacity="0.13" />
            <path d="M230 230 C260 214 300 228 298 258 C296 286 262 300 236 288 C212 276 206 244 230 230 Z" fill="#000" opacity="0.11" />
            <path d="M150 250 C168 238 196 248 196 268 C196 290 166 298 150 284 C138 274 138 258 150 250 Z" fill="#000" opacity="0.09" />

            {/* the face — two sockets, slanted, and a thin grin of craters */}
            <g className="haunt-moon-face">
              <path d="M150 176 C158 162 182 160 190 172 C184 184 160 188 150 176 Z" fill="#000" opacity="0.3" />
              <path d="M214 170 C224 158 248 162 254 176 C244 188 220 184 214 170 Z" fill="#000" opacity="0.3" />
              <circle cx="171" cy="174" r="2.4" fill="#fff" opacity="0.18" className="haunt-moon-eye" />
              <circle cx="235" cy="173" r="2.4" fill="#fff" opacity="0.18" className="haunt-moon-eye" />
              {[
                [158, 232, 4],
                [170, 240, 3.4],
                [184, 245, 3.8],
                [200, 247, 3.2],
                [216, 245, 3.8],
                [230, 240, 3.4],
                [242, 232, 4],
              ].map(([cx, cy, r]) => (
                <circle key={cx} cx={cx} cy={cy} r={r} fill="url(#moon-crater)" />
              ))}
            </g>

            {/* scattered craters */}
            {[
              [262, 132, 9],
              [284, 176, 5],
              [128, 214, 7],
              [206, 300, 6],
              [118, 270, 4],
              [300, 220, 4],
              [180, 108, 5],
              [246, 106, 3.5],
            ].map(([cx, cy, r]) => (
              <g key={`${cx}-${cy}`}>
                <circle cx={cx} cy={cy} r={r} fill="url(#moon-crater)" />
                <circle cx={cx} cy={cy} r={r} fill="none" stroke="#fff" strokeOpacity="0.1" strokeWidth="0.8" />
              </g>
            ))}

            {/* the terminator: shadow that shifts with the visitor's lantern */}
            <circle className="haunt-moon-shade" cx="200" cy="200" r="132" fill="url(#moon-shade)" />
            <circle className="haunt-moon-eclipse" cx="200" cy="200" r="118" fill="#000" />
          </g>
          <circle cx="200" cy="200" r="118" fill="none" stroke="#fff" strokeOpacity="0.14" strokeWidth="1" />
        </g>
      </svg>
    </div>
  );
}
