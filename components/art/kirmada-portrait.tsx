"use client";

import { Volume2, VolumeX } from "lucide-react";
import Image from "next/image";
import { type ReactNode, useEffect, useId, useRef } from "react";
import {
  playKirmadaHover,
  stopKirmadaHover,
  toggleKirmadaTap,
  useKirmadaAudio,
  useSound,
} from "@/lib/audio/sound-control";
import { KIRMADA_ALT, KIRMADA_PORTRAIT } from "@/lib/kirmada";
import { cn } from "@/lib/utils";

/**
 * KirmadaPortrait — the one way the antagonist's artwork is shown.
 * Always the supplied image; always in cinematic monochrome (.kirmada-image);
 * always a fixed aspect ratio, so it never shifts the layout.
 *
 *  hero      — the Overview's antagonist profile (full figure, tall)
 *  grimoire  — the Grimoire's character dossier (full figure, tall)
 *  lore      — a close portrait beside lore text (face and horns)
 *  context   — a small face mark beside a mention (artifacts, dispatches, incidents)
 *  event     — the awakening reveal (face, wide)
 *
 * Every user-facing portrait (hero, grimoire, lore, context) responds to pointer
 * hover, keyboard focus and touch tap by playing `/audio/kirmada.mp3` when the
 * global sound switch is ON, and fading out cleanly when the visitor leaves.
 *
 * Pass `decorative` where his name is already in the adjacent text, so screen
 * readers do not hear the same description again and again.
 */
type Variant = "hero" | "grimoire" | "lore" | "context" | "event";

const VARIANTS: Record<Variant, { frame: string; sizes: string; position: string; zoom: number }> = {
  hero: { frame: "aspect-[4/5]", sizes: "(min-width: 1024px) 34vw, 90vw", position: "52% 36%", zoom: 1 },
  grimoire: { frame: "aspect-[4/5]", sizes: "(min-width: 1024px) 40vw, 92vw", position: "52% 38%", zoom: 1 },
  lore: { frame: "aspect-square", sizes: "(min-width: 768px) 14rem, 60vw", position: KIRMADA_PORTRAIT.face, zoom: 1.5 },
  context: { frame: "aspect-square", sizes: "6rem", position: KIRMADA_PORTRAIT.face, zoom: 2.3 },
  event: { frame: "aspect-[16/10]", sizes: "(min-width: 768px) 36rem, 90vw", position: "50% 40%", zoom: 1.35 },
};

export function KirmadaPortrait({
  variant = "lore",
  className,
  alt = KIRMADA_ALT,
  decorative = false,
  priority = false,
  caption,
}: {
  variant?: Variant;
  className?: string;
  alt?: string;
  decorative?: boolean;
  priority?: boolean;
  caption?: ReactNode;
}) {
  const v = VARIANTS[variant];
  const portraitId = useId();
  const sound = useSound();
  const voice = useKirmadaAudio();
  const lastTouchAt = useRef(0);

  const interactive = variant !== "event";
  const soundOn = sound.status === "on";
  const isPlaying = interactive && soundOn && voice.status === "playing" && voice.activeOwner === portraitId;
  const isBlocked = interactive && soundOn && voice.status === "blocked" && voice.activeOwner === portraitId;
  const audioState = !interactive
    ? "passive"
    : isPlaying
      ? "playing"
      : isBlocked
        ? "blocked"
        : soundOn
          ? "ready"
          : "muted";

  useEffect(() => {
    if (!interactive) return;
    return () => {
      stopKirmadaHover(portraitId, true);
    };
  }, [interactive, portraitId]);

  const cueLabel = isPlaying
    ? "The sorcerer stirs · Speaking"
    : isBlocked
      ? "The sorcerer stirs · Tap to retry"
      : soundOn
        ? "The sorcerer stirs · Hover to hear"
        : "The sorcerer stirs · Enable sound";

  const titleText = !interactive
    ? undefined
    : isPlaying
      ? "The sorcerer stirs — Kirmada is speaking"
      : isBlocked
        ? "Browser blocked audio — tap or click to retry"
        : soundOn
          ? "The sorcerer stirs — hover, focus or tap to hear Kirmada"
          : "The sorcerer stirs — turn Sound on in the header to hear Kirmada";

  return (
    <figure
      className={cn(
        "kirmada-portrait relative",
        interactive && "cursor-pointer focus-visible:outline-none",
        className,
      )}
      data-variant={variant}
      data-testid="kirmada-portrait"
      data-audio-state={audioState}
      tabIndex={interactive ? 0 : undefined}
      title={titleText}
      onPointerEnter={
        interactive
          ? (event) => {
              if (event.pointerType === "touch") return;
              void playKirmadaHover(portraitId);
            }
          : undefined
      }
      onMouseEnter={
        interactive
          ? () => {
              if (Date.now() - lastTouchAt.current < 400) return;
              void playKirmadaHover(portraitId);
            }
          : undefined
      }
      onPointerLeave={
        interactive
          ? (event) => {
              if (event.pointerType === "touch") return;
              stopKirmadaHover(portraitId);
            }
          : undefined
      }
      onMouseLeave={
        interactive
          ? () => {
              if (Date.now() - lastTouchAt.current < 400) return;
              stopKirmadaHover(portraitId);
            }
          : undefined
      }
      onFocus={
        interactive
          ? () => {
              if (Date.now() - lastTouchAt.current < 80) return;
              void playKirmadaHover(portraitId);
            }
          : undefined
      }
      onBlur={
        interactive
          ? () => {
              stopKirmadaHover(portraitId);
            }
          : undefined
      }
      onTouchStart={
        interactive
          ? () => {
              lastTouchAt.current = Date.now();
              void toggleKirmadaTap(portraitId);
            }
          : undefined
      }
      onClick={
        interactive
          ? () => {
              if (Date.now() - lastTouchAt.current < 400) return;
              void playKirmadaHover(portraitId);
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                void toggleKirmadaTap(portraitId);
              }
            }
          : undefined
      }
    >
      <div className={cn("kirmada-frame relative overflow-hidden", v.frame, variant === "context" ? "rounded-xs" : "frame-corners")}>
        <Image
          src={KIRMADA_PORTRAIT.src}
          alt={decorative ? "" : alt}
          fill
          sizes={v.sizes}
          // Next 16 deprecates `priority`; above-the-fold portraits load eagerly at high priority instead.
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          className="kirmada-image object-cover"
          style={{ objectPosition: v.position, transform: v.zoom !== 1 ? `scale(${v.zoom})` : undefined, transformOrigin: KIRMADA_PORTRAIT.face }}
        />
        <div aria-hidden className="kirmada-vignette" />
        {interactive && variant !== "context" ? (
          <div
            aria-hidden="true"
            data-testid="kirmada-audio-cue"
            data-audio-status={audioState}
            className={cn(
              "pointer-events-none absolute inset-x-2.5 bottom-2.5 z-10 flex items-center justify-between gap-2 border px-2.5 py-1.5 font-mono text-[10px] tracking-[0.18em] uppercase transition",
              isPlaying
                ? "border-ivory/60 bg-obsidian/92 text-ivory shadow-[0_0_18px_rgba(255,255,255,0.22)]"
                : soundOn
                  ? "border-line-strong/80 bg-obsidian/85 text-silver"
                  : "border-line-soft bg-obsidian/80 text-ash",
            )}
          >
            <span className="inline-flex items-center gap-1.5 truncate">
              {soundOn ? <Volume2 className="h-3 w-3 shrink-0 text-ivory" /> : <VolumeX className="h-3 w-3 shrink-0 text-ash" />}
              <span className="truncate">{cueLabel}</span>
            </span>
            {isPlaying ? (
              <span className="sound-bars shrink-0">
                <i />
                <i />
                <i />
              </span>
            ) : null}
          </div>
        ) : null}
        {interactive && variant === "context" ? (
          <span
            aria-hidden="true"
            data-testid="kirmada-audio-cue"
            data-audio-status={audioState}
            className={cn(
              "pointer-events-none absolute right-1 bottom-1 z-10 inline-flex h-4 w-4 items-center justify-center rounded-xs border transition",
              isPlaying
                ? "border-ivory/70 bg-obsidian/95 text-ivory shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                : soundOn
                  ? "border-line-strong/80 bg-obsidian/80 text-silver opacity-85"
                  : "border-line-soft bg-obsidian/75 text-ash opacity-65",
            )}
          >
            {soundOn ? <Volume2 className="h-2.5 w-2.5" /> : <VolumeX className="h-2.5 w-2.5" />}
          </span>
        ) : null}
      </div>
      {caption ? <figcaption className="mt-3">{caption}</figcaption> : null}
    </figure>
  );
}
