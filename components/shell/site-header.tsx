"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Feather, Menu } from "lucide-react";
import { Suspense, useState, type MouseEvent } from "react";
import { RoyalSeal } from "@/components/art/seal";
import { SoundToggle } from "@/components/shell/sound-toggle";
import { CurseClockCompact } from "@/components/sleeper/curse-clock";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { buttonClasses } from "@/components/ui/button";
import { useKingdom } from "@/components/providers/kingdom-provider";
import { ROLE_LABEL } from "@/lib/labels";
import { isStaff } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { isActive, isPageChange, NAV_ITEMS, NUMERALS } from "@/components/shell/nav";
import { playNavigationWhoosh } from "@/lib/audio/sound-control";

function Wordmark() {
  return (
    <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label="The Royal Dispatch — overview">
      <RoyalSeal className="size-8 shrink-0 transition-transform duration-700 ease-(--ease-noir) group-hover:rotate-[24deg] max-[359px]:hidden sm:size-9" />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="gothic truncate text-[0.95rem] font-semibold tracking-[0.05em] sm:text-[1.14rem] sm:tracking-[0.08em] text-bright transition-[text-shadow] duration-500 group-hover:[text-shadow:0_0_16px_rgb(255_255_255/0.5)]">
          The Royal Dispatch
        </span>
        <span className="mt-1.5 hidden font-mono text-[0.55rem] uppercase tracking-[0.26em] text-muted sm:block">
          The kingdom remembers
        </span>
      </span>
    </Link>
  );
}

/**
 * usePathname() is request data under Cache Components, so the live header is
 * streamed inside <Suspense>; the prerendered shell shows the same header with
 * no active link.
 */
export function SiteHeader() {
  return (
    <Suspense fallback={<HeaderBody pathname="" />}>
      <HeaderWithPathname />
    </Suspense>
  );
}

function HeaderWithPathname() {
  return <HeaderBody pathname={usePathname()} />;
}

function HeaderBody({ pathname }: { pathname: string }) {
  const { mode, actor, snapshot, status } = useKingdom();
  const [open, setOpen] = useState(false);
  const pending = snapshot.incidents.filter((i) => i.status === "submitted").length;
  // The one navigation-sound handler for every header link. It never blocks or
  // delays navigation; the whoosh is decoration, silent when sound is off.
  const whooshTo = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (isPageChange(pathname, href, event)) playNavigationWhoosh();
  };

  return (
    <header className="site-header sticky top-0 z-40 border-b border-line-soft">
      {/* Upper strip: network, curse clock — and the sound switch, top right on every page */}
      <div className="border-b border-line-soft/70">
        <div className="mx-auto flex h-10 max-w-[88rem] items-center justify-between gap-3 px-4 sm:px-6 lg:px-10">
          <p className="eyebrow !text-[0.58rem] hidden min-w-0 truncate sm:block">
            <span className="hidden lg:inline">The Royal Dispatch · Royal Incident Response Network</span>
            <span className="lg:hidden">Royal Incident Response Network</span>
          </p>
          <div className="flex w-full min-w-0 items-center justify-between gap-3 sm:w-auto sm:justify-end sm:gap-4">
            {status === "ready" ? (
              <span className="eyebrow !text-[0.58rem] hidden items-center gap-2 xl:flex" title={mode === "demo" ? "Local demo data stored in this browser" : "Connected to Supabase"}>
                <span aria-hidden className={cn("inline-block size-1.5 rotate-45", mode === "demo" ? "border border-muted" : "bg-ivory")} />
                {mode === "demo" ? "Demo data" : "Live records"} · {ROLE_LABEL[actor.role]}
              </span>
            ) : null}
            <CurseClockCompact />
            <span aria-hidden className="hidden h-4 w-px bg-line-strong sm:block" />
            <SoundToggle />
          </div>
        </div>
      </div>

      <div className="mx-auto flex h-16 max-w-[88rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Wordmark />

        <nav aria-label="Primary" className="hidden xl:block">
          <ul className="flex items-center">
            {NAV_ITEMS.filter((item) => item.href !== "/report").map((item) => {
              const active = isActive(pathname, item.href);
              const index = NAV_ITEMS.findIndex((n) => n.href === item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={whooshTo(item.href)}
                    aria-current={active ? "page" : undefined}
                    title={item.realm}
                    className={cn(
                      "nav-link relative inline-flex h-10 items-baseline gap-1.5 px-2 font-mono text-[0.66rem] uppercase tracking-[0.12em] transition-[color,text-shadow] duration-300 min-[1440px]:px-3 min-[1440px]:text-[0.68rem] min-[1440px]:tracking-[0.16em]",
                      active ? "text-bright" : "text-muted hover:text-ivory",
                    )}
                  >
                    <span aria-hidden className={cn("hidden text-[0.55rem] tracking-[0.1em] min-[1440px]:inline", active ? "text-secondary" : "text-faint")}>
                      {NUMERALS[index]}
                    </span>
                    {item.label}
                    {item.href === "/operations" && isStaff(actor.role) && pending > 0 ? (
                      <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center self-center rounded-full bg-ivory px-1 text-[0.55rem] font-semibold text-canvas">
                        {pending}
                      </span>
                    ) : null}
                    {active && (
                      <motion.span
                        layoutId="nav-active"
                        aria-hidden
                        className="absolute inset-x-2 -bottom-[13px] flex h-px min-[1440px]:inset-x-3 items-center justify-center bg-ivory shadow-[0_0_10px_rgb(255_255_255/0.7)]"
                        transition={{ type: "spring", stiffness: 380, damping: 34 }}
                      >
                        <span className="size-1.5 rotate-45 border border-ivory bg-canvas" />
                      </motion.span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Link href="/report" onClick={whooshTo("/report")} className={buttonClasses("primary", "sm", "hidden sm:inline-flex")}>
            <Feather className="size-3.5" aria-hidden />
            Report an incident
          </Link>
          <Link href="/report" onClick={whooshTo("/report")} className={buttonClasses("primary", "sm", "w-10 px-0 sm:hidden")} aria-label="Report an incident">
            <Feather className="size-4" aria-hidden />
          </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger className={buttonClasses("secondary", "sm", "w-10 px-0 xl:hidden")} aria-label="Open navigation">
              <Menu className="size-4" aria-hidden />
            </DialogTrigger>
            <DialogContent side="left" title="The Royal Dispatch" description="The Crown still hears you — choose where to go">
              <nav aria-label="Mobile">
                <ol className="flex flex-col">
                  {NAV_ITEMS.map((item, index) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <li key={item.href} className="border-b border-line-soft last:border-b-0">
                        <Link
                          href={item.href}
                          onClick={(event) => {
                            whooshTo(item.href)(event);
                            setOpen(false);
                          }}
                          aria-current={active ? "page" : undefined}
                          className="group flex items-baseline gap-4 py-4"
                        >
                          <span className={cn("w-7 shrink-0 font-mono text-[0.62rem]", active ? "text-ivory" : "text-faint")}>{NUMERALS[index]}</span>
                          <span className="flex flex-col">
                            <span className={cn("gothic text-xl leading-none", active ? "text-bright" : "text-secondary group-hover:text-bright")}>
                              {item.realm}
                            </span>
                            <span className="mt-1.5 text-xs text-muted">{item.description}</span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </header>
  );
}
