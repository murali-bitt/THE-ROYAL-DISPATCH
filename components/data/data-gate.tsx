"use client";

import type { ReactNode } from "react";
import { useKingdom } from "@/components/providers/kingdom-provider";
import { Button } from "@/components/ui/button";
import { SkeletonRows } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { relativeTime as relative } from "@/lib/time";

/** Renders a skeleton until the kingdom's records have loaded in the browser. */
export function DataGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  const { status, error, reload } = useKingdom();
  if (status === "loading") return <>{fallback ?? <SkeletonRows />}</>;
  if (status === "error")
    return (
      <ErrorState
        message={error ?? "Unknown error."}
        action={
          <Button variant="secondary" size="sm" onClick={() => void reload()}>
            Try again
          </Button>
        }
      />
    );
  return <>{children}</>;
}

export function RelativeTime({ iso, now, className }: { iso: string; now: number; className?: string }) {
  return (
    <time dateTime={iso} title={new Date(iso).toLocaleString("en-GB")} className={className}>
      {now === 0 ? "—" : relative(iso, now)}
    </time>
  );
}

