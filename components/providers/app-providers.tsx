"use client";

import { MotionConfig } from "motion/react";
import { Tooltip } from "radix-ui";
import { Toaster } from "sonner";
import type { ReactNode } from "react";
import { KingdomProvider } from "@/components/providers/kingdom-provider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <Tooltip.Provider delayDuration={250}>
        <KingdomProvider>{children}</KingdomProvider>
      </Tooltip.Provider>
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          unstyled: true,
          classNames: {
            toast:
              "flex w-[min(24rem,calc(100vw-2rem))] items-start gap-3 rounded-xs border border-line-strong bg-elevated px-4 py-3.5 text-sm text-ivory shadow-lift font-sans",
            title: "font-medium leading-snug",
            description: "mt-1 text-xs text-muted",
            success: "border-ivory",
            error: "border-ivory border-dashed",
            icon: "mt-0.5 text-bright",
            actionButton:
              "ml-auto shrink-0 rounded-xs bg-ivory px-2.5 py-1 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-canvas",
          },
        }}
      />
    </MotionConfig>
  );
}
