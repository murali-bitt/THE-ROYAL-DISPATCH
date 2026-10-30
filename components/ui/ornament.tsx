import { cn } from "@/lib/utils";

/** An engraved divider: hairline, a lit lozenge between two pips, hairline. */
export function Ornament({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("flex items-center gap-3 text-ivory", className)}>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-line-strong" />
      <span className="size-1 rotate-45 bg-line-strong" />
      <span className="size-2 rotate-45 border border-ivory/80 shadow-[0_0_10px_rgb(255_255_255/0.35)]" />
      <span className="size-1 rotate-45 bg-line-strong" />
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-line-strong" />
    </div>
  );
}
