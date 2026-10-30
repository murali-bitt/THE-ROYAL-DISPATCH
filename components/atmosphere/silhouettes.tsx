/**
 * Original monochrome silhouettes for the haunted background: a distant ridge
 * with a ruined chapel, a dead tree and the castle of Kingsfall (one window
 * still lit), two hooded watchers on the ridge, bare branches reaching in from
 * the edge, passing ravens and slowly turning ward sigils. All decorative.
 */

function Skyline() {
  return (
    <svg className="haunt-skyline" viewBox="0 0 1600 240" preserveAspectRatio="xMidYMax slice">
      {/* far ridge, softened by fog */}
      <path
        d="M0 240 V170 C90 160 180 176 270 166 C380 154 470 172 590 160 C700 150 790 168 900 158 C1010 148 1120 164 1240 152 C1350 142 1470 160 1600 150 V240 Z"
        fill="#0b0b0b"
      />
      {/* the ruined chapel */}
      <g fill="#0b0b0b">
        <rect x="236" y="128" width="40" height="44" />
        <polygon points="232,128 256,78 280,128" />
        <rect x="282" y="146" width="26" height="24" />
        <path d="M308 170 V150 C312 140 322 140 326 150 V170 Z" />
      </g>

      {/* near ridge */}
      <path
        d="M0 240 V198 C120 188 220 204 330 194 C430 185 530 200 640 190 C760 180 860 196 980 188 C1100 180 1200 194 1320 186 C1440 178 1520 192 1600 186 V240 Z"
        fill="#050505"
        stroke="#1b1b1b"
        strokeWidth="1"
      />

      {/* dead tree */}
      <path
        d="M520 196 C522 172 517 152 524 130 M522 162 C510 152 498 147 486 140 M486 140 L476 133 M523 146 C536 136 548 132 560 121 M560 121 L568 110 M524 130 C520 118 527 108 522 94 M522 94 L516 86 M540 134 L546 124"
        fill="none"
        stroke="#050505"
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      {/* the castle of Kingsfall */}
      <g fill="#050505">
        <rect x="1100" y="160" width="230" height="36" />
        <rect x="1110" y="146" width="14" height="30" />
        <polygon points="1106,146 1117,124 1128,146" />
        <rect x="1150" y="92" width="22" height="104" />
        <polygon points="1145,92 1161,46 1177,92" />
        <rect x="1180" y="124" width="84" height="72" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={i} x={1180 + i * 14.4} y="116" width="8" height="9" />
        ))}
        <rect x="1272" y="70" width="14" height="126" />
        <polygon points="1268,70 1279,20 1290,70" />
        <rect x="1300" y="138" width="18" height="58" />
        <polygon points="1297,138 1309,110 1321,138" />
      </g>
      {/* one window is still lit, high in the spire */}
      <rect className="haunt-window" x="1277" y="94" width="4" height="7" fill="#9a9a9a" />

      {/* two hooded watchers on the ridge */}
      <g fill="#040404" className="haunt-watchers">
        <path d="M900 120 C892 120 888 128 888 136 C888 142 885 148 882 156 C876 170 872 180 869 192 L931 192 C928 180 924 170 918 156 C915 148 912 142 912 136 C912 128 908 120 900 120 Z" />
        <path d="M956 140 C950 140 947 146 947 152 C947 157 945 161 943 167 C939 177 936 184 934 192 L978 192 C976 184 973 177 969 167 C967 161 965 157 965 152 C965 146 962 140 956 140 Z" />
        <path d="M975 128 L981 192" stroke="#040404" strokeWidth="2" />
      </g>
    </svg>
  );
}

function Branches() {
  return (
    <svg className="haunt-branches" viewBox="0 0 320 260">
      <g fill="none" stroke="#111111" strokeLinecap="round">
        <path d="M-10 40 C40 46 80 60 120 84 C150 102 176 108 210 104" strokeWidth="7" />
        <path d="M120 84 C132 66 150 54 170 48 M170 48 L188 34 M150 98 C170 120 182 140 186 168 M186 168 L180 190 M210 104 C230 100 248 108 262 122 M262 122 L282 126" strokeWidth="3" />
        <path d="M60 52 C70 30 88 18 104 12 M88 66 C96 90 92 110 82 128 M82 128 L70 140 M232 100 L246 82 M246 82 L262 76 M178 140 L198 148" strokeWidth="1.8" />
        <path d="M-10 120 C30 118 60 128 84 146 C100 158 120 162 140 158 M84 146 C88 166 84 186 74 204" strokeWidth="4" />
      </g>
    </svg>
  );
}

function Raven({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 60 24">
      <g fill="#0e0e0e">
        <path className="haunt-wing" d="M30 12 C24 4 14 2 2 6 C12 8 20 12 26 15 Z" />
        <path className="haunt-wing haunt-wing-right" d="M30 12 C36 4 46 2 58 6 C48 8 40 12 34 15 Z" />
        <ellipse cx="30" cy="14" rx="5" ry="3" />
        <path d="M34 13 L39 12.5 L34.5 15 Z" />
      </g>
    </svg>
  );
}

/** Trig results can differ in the last digit between server and browser; round so hydration matches. */
const r2 = (n: number) => Math.round(n * 100) / 100;

function WardSigil({ className }: { className?: string }) {
  const ticks = Array.from({ length: 48 }, (_, i) => (i * Math.PI * 2) / 48);
  return (
    <svg className={className} viewBox="-100 -100 200 200">
      <g fill="none" stroke="#ffffff" strokeWidth="0.6">
        <circle r="96" />
        <circle r="88" strokeDasharray="1 4" />
        <circle r="60" />
        <circle r="22" />
        {ticks.map((a, i) => (
          <line key={i} x1={r2(Math.cos(a) * 88)} y1={r2(Math.sin(a) * 88)} x2={r2(Math.cos(a) * (i % 4 === 0 ? 78 : 84))} y2={r2(Math.sin(a) * (i % 4 === 0 ? 78 : 84))} />
        ))}
        <polygon points="0,-60 52,30 -52,30" />
        <polygon points="0,60 52,-30 -52,-30" opacity="0.6" />
      </g>
    </svg>
  );
}

export function Silhouettes() {
  return (
    <>
      <WardSigil className="haunt-sigil haunt-sigil-a" />
      <WardSigil className="haunt-sigil haunt-sigil-b" />
      <Branches />
      <Raven className="haunt-raven haunt-raven-a" />
      <Raven className="haunt-raven haunt-raven-b" />
      <Skyline />
    </>
  );
}
