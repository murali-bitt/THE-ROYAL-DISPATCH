"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight, Check, Copy, Radio, Volume2, VolumeX } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { RoyalSeal } from "@/components/art/seal";
import { SoundToggle } from "@/components/shell/sound-toggle";
import { Button } from "@/components/ui/button";
import { Ornament } from "@/components/ui/ornament";
import { SPONSOR } from "@/lib/config";
import { SoundUnavailableError } from "@/lib/audio/sound-engine";
import { playTransmission, SoundOffError, turnSoundOn, useSound } from "@/lib/audio/sound-control";
import { cn } from "@/lib/utils";

/**
 * THE ALLIANCE PROTOCOL — the official event partner, KAPIDHWAJ, written into
 * the world of Valmora as an allied guild of ward engineers and signal keepers.
 * The in-universe role is fiction for this site; it claims nothing about the
 * real sponsor's products or services.
 */

/** Neutral emblem for the Alliance Protocol. This is NOT the sponsor's logo. */
function RelayEmblem({ className, active = false }: { className?: string; active?: boolean }) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden className={cn("text-ivory", className)}>
      <rect x="6" y="6" width="108" height="108" fill="none" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <rect x="12" y="12" width="96" height="96" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="1 3" opacity="0.6" />
      {[18, 30, 42].map((r, i) => (
        <path
          key={r}
          d={`M ${60 - r} ${74} A ${r} ${r} 0 0 1 ${60 + r} ${74}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4 - i * 0.3}
          opacity={active ? 1 : 0.85 - i * 0.2}
          className={active ? "relay-arc" : undefined}
          style={active ? { animationDelay: `${i * 0.18}s` } : undefined}
        />
      ))}
      <path d="M60 74 L60 98 M50 98 H70" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="60" cy="74" r="3.5" fill="currentColor" />
    </svg>
  );
}

type TransmissionState = "idle" | "playing" | "done" | "cut" | "error";

function Waveform({ active }: { active: boolean }) {
  const reduce = useReducedMotion();
  const bars = 28;
  return (
    <div aria-hidden className="flex h-12 items-center gap-[3px]">
      {Array.from({ length: bars }, (_, i) => {
        // A quiet carrier wave while idle.
        // Rounded so the server-rendered transform matches the client exactly.
        const rest = Math.round((0.06 + 0.3 * Math.abs(Math.sin(i * 0.45)) * Math.abs(Math.cos(i * 0.17))) * 1000) / 1000;
        return (
          <motion.span
            key={i}
            className={cn("w-[3px] flex-1 origin-center rounded-[1px]", active ? "bg-ivory" : "bg-line-strong")}
            initial={false}
            animate={
              active && !reduce
                ? { scaleY: [rest, 0.35 + 0.65 * Math.abs(Math.sin(i * 0.9)), rest + 0.1, 0.9 * Math.abs(Math.cos(i * 0.5)) + 0.1, rest] }
                : { scaleY: rest }
            }
            transition={active && !reduce ? { duration: 1.1, repeat: Infinity, delay: (i % 7) * 0.05, ease: "easeInOut" } : { duration: 0.4 }}
            style={{ height: "100%" }}
          />
        );
      })}
    </div>
  );
}

export function TransmissionConsole() {
  const [state, setState] = useState<TransmissionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const sound = useSound();
  const soundOn = sound.status === "on";
  const playing = state === "playing";
  const busy = useRef(false);

  async function replay() {
    if (busy.current) return; // one transmission at a time
    busy.current = true;
    setError(null);
    setState("playing");
    try {
      // Called directly from the click handler so the browser's
      // user-gesture rule for starting audio is satisfied.
      const result = await playTransmission();
      setState(result.interrupted ? "cut" : "done");
    } catch (err) {
      setState("error");
      setError(
        err instanceof SoundUnavailableError || err instanceof SoundOffError
          ? err.message
          : "The transmission could not be played in this browser.",
      );
      toast.error("Transmission could not be played");
    } finally {
      busy.current = false;
    }
  }

  // A refusal to start audio at all is a fault of the relay too — show it here.
  const fault = state === "error" ? error : sound.status === "error" ? sound.message : null;
  const statusText = fault
    ? fault
    : playing
      ? "Transmitting on the allied relay…"
      : state === "done"
        ? "Transmission received by all seven villages."
        : state === "cut"
          ? soundOn
            ?"Transmission cut short by another signal. Replay to hear it in full."
            : "Transmission stopped — sound was switched off."
          : soundOn
            ? "Standing by. Press replay to hear the protocol."
            : "Sound is off. Turn sound on to hear the transmission.";

  return (
    <div className={cn("frame-corners relative border bg-canvas/75 p-5 transition-colors duration-500 sm:p-6", playing ? "border-ivory/60" : "border-line")}>
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow flex items-center gap-2">
          <Radio className="size-3.5" aria-hidden /> Alliance Protocol transmission
        </p>
        <span className={cn("font-mono text-[0.6rem] uppercase tracking-[0.18em]", playing || fault ? "text-bright" : "text-faint")}>
          {playing ? "● On air" : fault ? "▲ Fault" : soundOn ? "○ Ready" : "○ Silent"}
        </span>
      </div>

      <div className="relative mt-4">
        {playing ? <span aria-hidden className="transmission-rings" /> : null}
        <Waveform active={playing} />
      </div>

      <p
        role={fault ? "alert" : "status"}
        aria-live="polite"
        className={cn("mt-3 min-h-10 text-sm leading-snug", fault ? "text-bright" : "text-secondary")}
        data-testid="transmission-status"
      >
        {statusText}
      </p>

      <Button
        size="lg"
        className="mt-4 w-full whitespace-normal py-3 text-center leading-snug"
        onClick={() => void replay()}
        disabled={playing || !soundOn}
        aria-describedby="transmission-note"
        data-testid="replay-transmission"
      >
        {soundOn ? <Volume2 className="size-4 shrink-0" aria-hidden /> : <VolumeX className="size-4 shrink-0" aria-hidden />}
        {playing ? "Transmitting…" : "Replay Alliance Protocol Transmission"}
      </Button>
      <p id="transmission-note" className="mt-3 text-xs leading-relaxed text-muted">
        {soundOn
          ? "Plays an original ~3-second synthesised signal over the kingdom's soundscape."
          : "Sound must be on to replay the transmission. Nothing ever plays until you choose to turn it on."}
      </p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-line-soft pt-4">
        <div className="min-w-0">
          <p className="text-sm text-ivory">Kingdom sound</p>
          <p className="text-xs text-muted">Soundscape, transmission and report chime. Off at the start of every visit.</p>
        </div>
        {soundOn ? (
          <SoundToggle label="Sound" testId="console-sound-toggle" />
        ) : (
          <Button
            variant="secondary"
            size="sm"
            onClick={() =>
              void turnSoundOn().then((result) => {
                if (result.status === "error") toast.error(result.message ?? "Sound could not be started in this browser.");
              })
            }
            disabled={sound.status === "starting"}
            data-testid="console-sound-on"
          >
            <Volume2 className="size-3.5" aria-hidden />
            {sound.status === "starting" ? "Starting…" : "Turn sound on"}
          </Button>
        )}
      </div>
    </div>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function SponsorProfileCard() {
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  const handleRef = useRef<HTMLParagraphElement>(null);

  async function onCopy() {
    const ok = await copyText(SPONSOR.handle);
    if (ok) {
      setCopy("copied");
      toast.success(`Copied ${SPONSOR.handle}`);
      setTimeout(() => setCopy("idle"), 2400);
    } else {
      setCopy("failed");
      // Select the visible handle so it can be copied manually.
      const node = handleRef.current;
      if (node) {
        const range = document.createRange();
        range.selectNodeContents(node);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      toast.error("Copy was blocked — the handle is selected so you can copy it manually");
    }
  }

  return (
    <article aria-labelledby="sponsor-name" className="frame-corners frame-corners-bright relative overflow-hidden border border-ivory/40 bg-raised/90 p-6 shadow-lift sm:p-8">
      <div aria-hidden className="pointer-events-none absolute inset-[5px] border border-line-soft" />
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.09),transparent_65%)]" />
      <div className="relative flex items-start gap-5">
        <RelayEmblem className="size-16 shrink-0 sm:size-20" />
        <div className="min-w-0">
          <p className="eyebrow !text-secondary">{SPONSOR.designation}</p>
          <h3 id="sponsor-name" className="gothic mt-2 text-[2.2rem] font-semibold leading-none tracking-[0.1em] text-bright sm:text-[2.7rem]">
            {SPONSOR.name}
          </h3>
          <p ref={handleRef} className="mt-3 break-all font-mono text-[0.95rem] text-ivory" data-testid="sponsor-handle">
            {SPONSOR.handle}
          </p>
        </div>
      </div>

      <p className="relative mt-6 text-sm leading-relaxed text-secondary">
        Follow the alliance beyond the kingdom&apos;s borders. Visit KAPIDHWAJ&apos;s official Instagram profile to see the
        partner behind the Spookathon.
      </p>

      <div className="relative mt-6 flex flex-col gap-2.5">
        <a
          href={SPONSOR.instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View ${SPONSOR.handle} on Instagram (opens in a new tab)`}
          className="btn-sheen group/button relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden whitespace-normal rounded-xs border border-ivory bg-ivory px-5 py-3 text-center font-mono text-[0.72rem] font-semibold uppercase leading-snug tracking-[0.16em] text-canvas transition-[background-color,box-shadow] duration-200 hover:bg-bright hover:shadow-glow active:translate-y-px"
          data-testid="sponsor-instagram"
        >
          View {SPONSOR.handle} on Instagram
          <ArrowUpRight className="size-4 shrink-0 transition-transform group-hover/button:-translate-y-0.5 group-hover/button:translate-x-0.5" aria-hidden />
        </a>
        <Button variant="secondary" onClick={() => void onCopy()} aria-label={`Copy handle ${SPONSOR.handle}`} data-testid="sponsor-copy">
          {copy === "copied" ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copy === "copied" ? "Handle copied" : "Copy handle"}
        </Button>
        <p aria-live="polite" className="min-h-4 text-xs text-muted">
          {copy === "copied" ? `${SPONSOR.handle} is on your clipboard.` : copy === "failed" ? "Your browser blocked clipboard access. The handle above is selected — copy it manually." : ""}
        </p>
      </div>
      <p className="relative mt-2 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-faint">
        instagram.com/kapidhwaj.innovations · external link
      </p>
    </article>
  );
}

/** The accord, typeset: the Crown's seal joined to the alliance relay. Not a sponsor logo. */
function AllianceAccord() {
  return (
    <div aria-hidden className="flex items-center gap-4">
      <RoyalSeal className="size-12 shrink-0 opacity-90" />
      <span className="h-px w-10 bg-gradient-to-r from-line-strong to-ivory/70 sm:w-16" />
      <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-secondary">Accord</span>
      <span className="h-px w-10 bg-gradient-to-l from-line-strong to-ivory/70 sm:w-16" />
      <RelayEmblem className="size-12 shrink-0" />
    </div>
  );
}

/** The full overview section. */
export function AllianceProtocol() {
  return (
    <section id="alliance" aria-labelledby="alliance-heading" className="relative overflow-hidden border-y border-line-soft">
      <div aria-hidden className="architecture absolute inset-0" />
      <div aria-hidden className="fog opacity-70" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.35),transparent)]" />
      <div className="relative mx-auto grid grid-cols-1 max-w-[88rem] gap-12 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-16 lg:px-10 lg:py-28">
        <div className="lg:col-span-7">
          <AllianceAccord />
          <p className="eyebrow mt-8 flex flex-wrap items-center gap-3">
            <span className="text-ivory">The Alliance Protocol</span>
            <span aria-hidden className="h-px w-8 bg-line-strong" />
            <span>Official event partner — KAPIDHWAJ</span>
          </p>
          <h2 id="alliance-heading" className="gothic mt-6 text-[clamp(2.1rem,4.6vw,3.9rem)] text-bright">
            When the kingdom lost its voice, an alliance answered.
          </h2>
          <Ornament className="mt-7 max-w-md" />
          <p className="mt-7 max-w-2xl text-lg leading-relaxed text-secondary">
            When Kirmada&apos;s curse put out the beacons and turned the ravens back, the Royal Council invoked an old
            accord with <span className="text-bright">KAPIDHWAJ</span> — a legendary order of ward engineers and signal
            keepers. Through the Alliance Protocol, the Crown and its allies reconnect fractured villages, coordinate
            restoration, and carry warnings through the dark.
          </p>

          <ol className="mt-10 grid gap-px border border-line-soft bg-line-soft sm:grid-cols-3">
            {[
              {
                n: "I",
                title: "The relay network",
                body: "Allied signal relays carry every report filed here from the villages to the Crown's stewards.",
              },
              {
                n: "II",
                title: "Ward engineering",
                body: "Alliance wardwrights stand with Company III on the Thornwatch ridge as the stones are re-bound.",
              },
              {
                n: "III",
                title: "Restoration in concert",
                body: "One record, shared by every village, so no steward works blind and no citizen goes unheard.",
              },
            ].map((item) => (
              <li key={item.n} className="group bg-canvas/95 p-5 transition-colors duration-500 hover:bg-raised">
                <p className="gothic text-2xl text-faint transition-colors duration-500 group-hover:text-secondary">{item.n}</p>
                <p className="mt-3 text-sm font-semibold text-ivory">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </li>
            ))}
          </ol>

          <figure className="mt-10 border-l border-ivory pl-6">
            <blockquote className="font-display text-2xl italic leading-snug text-ivory sm:text-[1.7rem]">
              “By decree of the Royal Council: while the beacons are dark, the allied relays shall carry the Crown&apos;s
              word. Let no village believe itself alone.”
            </blockquote>
            <figcaption className="eyebrow mt-4">Royal proclamation · Kingsfall</figcaption>
          </figure>
          <figure className="mt-8 pl-6">
            <blockquote className="font-mono text-sm leading-relaxed text-muted">
              ⟡ intercepted on the relay at 00:13:04 — “So the little kingdom has found friends. Light your relays. I
              have waited longer than your signals can carry.”
            </blockquote>
            <figcaption className="eyebrow mt-3 !text-faint">Attributed to Kirmada</figcaption>
          </figure>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5 lg:pt-4">
          <SponsorProfileCard />
          <TransmissionConsole />
          <p className="text-xs leading-relaxed text-faint">
            KAPIDHWAJ is the official event partner of the Spookathon. Its role in the Kingdom of Valmora is fiction
            written for this site and describes no real product, service or endorsement.
          </p>
        </div>
      </div>
    </section>
  );
}
