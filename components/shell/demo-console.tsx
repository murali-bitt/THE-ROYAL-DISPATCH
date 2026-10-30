"use client";

import { Popover } from "radix-ui";
import { FlaskConical, RotateCcw, TimerReset, FastForward } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useKingdom } from "@/components/providers/kingdom-provider";
import { Button } from "@/components/ui/button";
import { STORAGE_KEYS } from "@/lib/config";
import { ROLE_DESCRIPTION, ROLE_LABEL } from "@/lib/labels";
import { fastForward, restartClock } from "@/lib/sleeper/clock";
import { useSleeper } from "@/lib/sleeper/use-sleeper";
import { cn } from "@/lib/utils";
import { ROLES } from "@/types/domain";

/**
 * DEMO ROLE SWITCHER — shown only in local demo mode. It is a simulation for
 * judges, not security: in production the role comes from the server session
 * and the database enforces it.
 */
export function DemoConsole() {
  const { mode, actor, setDemoRole, actions, status } = useKingdom();
  const { awakened } = useSleeper();
  const [open, setOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  if (mode !== "demo" || status === "loading") return null;

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmReset(false);
      }}
    >
      <Popover.Trigger
        className="fixed bottom-4 left-4 z-[45] inline-flex h-10 items-center gap-2.5 rounded-full border border-line-strong bg-canvas/90 pl-3 pr-4 font-mono text-[0.64rem] uppercase tracking-[0.16em] text-ivory shadow-lift backdrop-blur-md transition-colors hover:border-ivory"
        aria-label={`Demo role switcher. Current role: ${ROLE_LABEL[actor.role]}`}
      >
        <FlaskConical className="size-3.5" aria-hidden />
        <span className="text-muted">Demo</span>
        <span aria-hidden className="h-3 w-px bg-line-strong" />
        <span>{ROLE_LABEL[actor.role]}</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="top"
          align="start"
          sideOffset={10}
          collisionPadding={16}
          className="z-[46] w-[min(22rem,calc(100vw-2rem))] rounded-md border border-line bg-canvas-2 p-5 shadow-lift data-[state=open]:animate-[fade-in_160ms_ease-out]"
        >
          <p className="eyebrow">Demo role switcher · simulation</p>
          <p className="mt-2 text-[0.8rem] leading-relaxed text-muted">
            No backend is configured, so records live in this browser. Switching role here is for exploring the demo
            — it is not a security boundary.
          </p>

          <fieldset className="mt-4">
            <legend className="sr-only">Act as</legend>
            <div className="flex flex-col gap-1.5">
              {ROLES.map((role) => {
                const selected = actor.role === role;
                return (
                  <label
                    key={role}
                    className={cn(
                      "flex cursor-pointer items-start gap-3 rounded-xs border px-3 py-2.5 transition-colors",
                      selected ? "border-ivory bg-white/[0.05]" : "border-line-soft hover:border-line-strong",
                    )}
                  >
                    <input
                      type="radio"
                      name="demo-role"
                      value={role}
                      checked={selected}
                      onChange={() => {
                        setDemoRole(role);
                        toast(`Now acting as ${ROLE_LABEL[role]}`);
                      }}
                      className="mt-1 accent-white"
                    />
                    <span>
                      <span className="block text-sm font-medium text-ivory">{ROLE_LABEL[role]}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted">{ROLE_DESCRIPTION[role]}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="mt-5 border-t border-line-soft pt-4">
            <p className="eyebrow">Curse clock</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {!awakened ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    fastForward(15);
                    toast("Curse clock advanced to the final 15 seconds");
                  }}
                >
                  <FastForward className="size-3.5" aria-hidden /> Final 15 s
                </Button>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  try {
                    window.localStorage.removeItem(STORAGE_KEYS.awakeningSeen);
                  } catch {
                    // ignore
                  }
                  restartClock();
                  toast("Curse clock restarted at 13:04 — records are unchanged");
                }}
              >
                <TimerReset className="size-3.5" aria-hidden /> Restart 13:04
              </Button>
            </div>
          </div>

          <div className="mt-5 border-t border-line-soft pt-4">
            {confirmReset ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-secondary">
                  Restore the seeded kingdom? Every report, update and dispatch made in this browser will be removed.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={async () => {
                      await actions.resetDemo();
                      setConfirmReset(false);
                      setOpen(false);
                      toast.success("Demo kingdom restored to its seeded state");
                    }}
                  >
                    Reset everything
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="quiet" size="sm" className="-ml-3" onClick={() => setConfirmReset(true)}>
                <RotateCcw className="size-3.5" aria-hidden /> Reset demo data
              </Button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
