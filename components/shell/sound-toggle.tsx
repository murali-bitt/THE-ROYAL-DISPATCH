"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useId } from "react";
import { toast } from "sonner";
import { turnSoundOff, turnSoundOn, useSound } from "@/lib/audio/sound-control";
import { cn } from "@/lib/utils";

/**
 * The global sound switch. It shows the real state of the audio: "On" only
 * once the soundscape is running, "…" while the browser starts audio, and it
 * stays "Off" (with a message) if the browser refuses.
 */
export function SoundToggle({
  label = "Sound",
  className,
  testId = "sound-toggle",
}: {
  label?: string;
  className?: string;
  testId?: string;
}) {
  const { status, message } = useSound();
  const on = status === "on";
  const starting = status === "starting";
  const id = useId();

  async function toggle() {
    if (on || starting) {
      turnSoundOff();
      return;
    }
    const result = await turnSoundOn();
    if (result.status === "error") toast.error(result.message ?? "Sound could not be started in this browser.");
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={`${id}-label`}
      aria-describedby={message ? `${id}-message` : undefined}
      aria-busy={starting || undefined}
      onClick={() => void toggle()}
      data-testid={testId}
      data-state={status}
      title={message ?? (on ? "Sound is on — press to silence the kingdom" : "Sound is off — press to hear the kingdom")}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 font-mono text-[0.6rem] uppercase tracking-[0.2em] transition-[border-color,background-color,color,box-shadow] duration-300 ease-(--ease-noir) active:scale-[0.97]",
        on
          ? "border-ivory/80 bg-white/[0.07] text-bright shadow-[0_0_20px_-6px_rgb(255_255_255/0.45)]"
          : "border-line-strong bg-canvas/60 text-secondary hover:border-ivory/70 hover:text-bright hover:shadow-[0_0_18px_-8px_rgb(255_255_255/0.4)]",
        className,
      )}
    >
      {on ? <Volume2 className="size-3.5 shrink-0" aria-hidden /> : <VolumeX className="size-3.5 shrink-0" aria-hidden />}
      <span id={`${id}-label`}>{label}</span>
      <span aria-hidden className={on ? "text-bright" : "text-muted"}>
        {starting ? "…" : on ? "On" : "Off"}
      </span>
      {on ? (
        <span aria-hidden className="sound-bars flex h-3 items-end gap-[2px]">
          <span />
          <span />
          <span />
        </span>
      ) : null}
      {message ? (
        <span id={`${id}-message`} className="sr-only">
          {message}
        </span>
      ) : null}
    </button>
  );
}
