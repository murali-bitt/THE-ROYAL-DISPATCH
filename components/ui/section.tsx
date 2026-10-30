import type { ReactNode } from "react";
import { Ornament } from "@/components/ui/ornament";
import { cn } from "@/lib/utils";

export function SectionHeading({
  index,
  label,
  title,
  children,
  action,
  as: Tag = "h2",
  id,
  className,
}: {
  index?: string;
  label: string;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
  id?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div className="max-w-2xl">
        <p className="eyebrow flex items-center gap-3">
          {index ? <span className="text-ivory">{index}</span> : null}
          {index ? <span aria-hidden className="h-px w-8 bg-gradient-to-r from-line-strong to-ivory/60" /> : null}
          <span>{label}</span>
        </p>
        <Tag id={id} className="gothic mt-4 text-[clamp(1.75rem,3.4vw,2.6rem)] text-bright">
          {title}
        </Tag>
        {children ? <div className="mt-4 max-w-xl text-[0.98rem] leading-relaxed text-secondary">{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * The page header used on every section of the Dispatch. The kingdom's name
 * for the page (`realm`) is the headline; the plain functional name (`title`)
 * sits directly beneath it inside the same <h1>, so the accessible name reads
 * e.g. "The Black Ledger — Incident registry".
 */
export function PageHero({
  label,
  realm,
  title,
  children,
  aside,
}: {
  label: string;
  realm?: string;
  title: ReactNode;
  children?: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden border-b border-line-soft">
      <div aria-hidden className="architecture absolute inset-0" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.25),transparent)]" />
      <div className="relative mx-auto grid grid-cols-1 max-w-[88rem] gap-10 px-4 pb-12 pt-12 sm:px-6 md:pt-16 lg:grid-cols-12 lg:px-10 lg:pb-16">
        <div className="lg:col-span-8">
          <p className="eyebrow flex items-center gap-3">
            <span aria-hidden className="size-1.5 rotate-45 border border-ivory/70" />
            {label}
          </p>
          <h1 className="mt-5">
            {realm ? (
              <>
                <span className="gothic silver block text-[clamp(2.3rem,5.6vw,4.6rem)] font-semibold">{realm}</span>
                <span className="sr-only"> — </span>
                <span className="mt-3 block font-display text-[clamp(1.25rem,2.2vw,1.75rem)] italic leading-tight text-secondary">{title}</span>
              </>
            ) : (
              <span className="gothic silver block text-[clamp(2.3rem,5.6vw,4.6rem)] font-semibold">{title}</span>
            )}
          </h1>
          <Ornament className="mt-7 max-w-xs" />
          {children ? <div className="mt-6 max-w-2xl text-base leading-relaxed text-secondary md:text-lg">{children}</div> : null}
        </div>
        {aside ? <div className="lg:col-span-4 lg:self-end lg:justify-self-end">{aside}</div> : null}
      </div>
    </header>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[88rem] px-4 sm:px-6 lg:px-10", className)}>{children}</div>;
}
