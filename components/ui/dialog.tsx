"use client";

import { Dialog as D } from "radix-ui";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

/**
 * Side drawer (default) or centred dialog. Radix handles focus trapping,
 * Escape to close, scroll locking and returning focus to the trigger.
 */
export function DialogContent({
  title,
  description,
  children,
  side = "right",
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  side?: "right" | "left" | "center";
  className?: string;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_200ms_ease-out] data-[state=closed]:animate-[fade-out_160ms_ease-in]" />
      <D.Content
        className={cn(
          "fixed z-50 flex flex-col border-line bg-canvas-2 shadow-lift focus:outline-none",
          side === "center"
            ? "left-1/2 top-1/2 max-h-[88dvh] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-md border data-[state=open]:animate-[rise-in_260ms_var(--ease-noir)]"
            : side === "right"
              ? "inset-y-0 right-0 w-[min(32rem,100vw)] border-l data-[state=open]:animate-[slide-in-right_320ms_var(--ease-noir)] data-[state=closed]:animate-[slide-out-right_200ms_ease-in]"
              : "inset-y-0 left-0 w-[min(22rem,88vw)] border-r data-[state=open]:animate-[slide-in-left_320ms_var(--ease-noir)] data-[state=closed]:animate-[slide-out-left_200ms_ease-in]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line-soft px-6 py-5">
          <div className="min-w-0">
            <D.Title className="font-display text-2xl leading-tight text-bright">{title}</D.Title>
            {description ? (
              <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">Dialog</D.Description>
            )}
          </div>
          <D.Close
            className="-mr-2 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-xs text-muted transition-colors hover:bg-white/5 hover:text-bright"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden />
          </D.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
      </D.Content>
    </D.Portal>
  );
}
