import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "frame-corners flex flex-col items-center gap-4 border border-dashed border-line bg-canvas/40 px-6 py-14 text-center",
        className,
      )}
    >
      <svg viewBox="0 0 48 48" aria-hidden className="size-10 text-faint">
        <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="1" />
        <circle cx="24" cy="24" r="12" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="24" cy="24" r="2" fill="currentColor" />
      </svg>
      <div className="max-w-sm">
        <p className="gothic text-xl text-bright">{title}</p>
        {children ? <div className="mt-2 text-sm leading-relaxed text-muted">{children}</div> : null}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 border border-ivory/60 px-5 py-5">
      <p className="eyebrow !text-bright">The records could not be read</p>
      <p className="font-display text-lg italic text-ivory">The ledger will not open.</p>
      <p className="text-sm text-secondary">{message}</p>
      {action}
    </div>
  );
}
