import Link from "next/link";
import { RoyalSeal } from "@/components/art/seal";
import { NAV_ITEMS, NUMERALS } from "@/components/shell/nav";
import { Ornament } from "@/components/ui/ornament";

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-24 border-t border-line-soft">
      <div className="mx-auto grid grid-cols-1 max-w-[88rem] gap-12 px-4 py-14 sm:px-6 md:grid-cols-12 lg:px-10">
        <div className="md:col-span-5">
          <RoyalSeal className="size-14" />
          <p className="gothic mt-6 text-[1.7rem] font-semibold tracking-[0.08em] text-bright">The kingdom remembers.</p>
          <p className="mt-3 font-display text-xl italic text-secondary">Every voice that reaches the Crown is written down — and answered.</p>
          <Ornament className="mt-6 max-w-[14rem]" />
          <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
            The Royal Dispatch is the Kingdom Incident Response &amp; Restoration Network of Valmora. Every village,
            person and event on this site is fictional demo content created for the Spookathon.
          </p>
        </div>
        <nav aria-label="Footer" className="md:col-span-4 md:col-start-7">
          <p className="eyebrow">The Dispatch</p>
          <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
            {NAV_ITEMS.map((item, index) => (
              <li key={item.href}>
                <Link href={item.href} className="group flex items-baseline gap-2.5 transition-colors">
                  <span aria-hidden className="w-6 shrink-0 font-mono text-[0.58rem] text-faint">{NUMERALS[index]}</span>
                  <span className="flex flex-col">
                    <span className="text-sm text-secondary group-hover:text-bright">{item.realm}</span>
                    <span className="font-mono text-[0.58rem] uppercase tracking-[0.14em] text-faint">{item.label}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="md:col-span-2">
          <p className="eyebrow">Curse clock</p>
          <p className="mt-4 text-xs leading-relaxed text-muted">
            The 13:04 countdown is a simulated story event, not a prediction. It persists in this browser.
          </p>
        </div>
      </div>
      <div className="border-t border-line-soft">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-2 px-4 py-5 font-mono text-[0.6rem] uppercase tracking-[0.18em] text-faint sm:flex-row sm:justify-between sm:px-6 lg:px-10">
          <span>The Haunted Crown · Midnight Noir · strictly grayscale</span>
          <span>Spookathon · The Kingdom Under a Curse</span>
        </div>
      </div>
    </footer>
  );
}
