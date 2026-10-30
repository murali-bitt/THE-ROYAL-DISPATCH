"use client";

import { useSyncExternalStore } from "react";
import { duckAmbient, startAmbient, stopAmbient } from "@/lib/audio/ambient";
import {
  getKirmadaVoiceState,
  KIRMADA_IDLE,
  type KirmadaVoiceState,
  playAllianceTransmission,
  playKirmadaClip,
  playReportSealed,
  playWhoosh,
  SoundUnavailableError,
  stopEffects,
  stopKirmadaClip,
  subscribeKirmadaVoice,
  suspendAudio,
} from "@/lib/audio/sound-engine";

/**
 * THE ONE SOUND SWITCH — controls the ambient soundscape, the Alliance
 * Protocol transmission, the report-sealed chime, the navigation whoosh
 * and Kirmada's portrait voice clip.
 *
 *  - OFF for every new page session. The choice is deliberately never
 *    persisted, so a reload is silent until the visitor presses the switch.
 *  - "on" is only reported once the soundscape's graph is actually running;
 *    a refusal from the browser leaves the switch off with a message.
 *  - Turning it off cuts any effect, fades the soundscape, releases its nodes
 *    and then suspends the AudioContext.
 *  - It lives in module scope, so client-side navigation keeps one soundscape
 *    playing instead of starting another per route.
 */

export type SoundStatus = "off" | "starting" | "on" | "error";
export interface SoundState {
  status: SoundStatus;
  message: string | null;
}

const OFF: SoundState = { status: "off", message: null };
let state: SoundState = OFF;
const listeners = new Set<() => void>();
const watched = new WeakSet<AudioContext>();
let request = 0;

function set(next: SoundState) {
  state = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSound(): SoundState {
  return useSyncExternalStore(subscribe, () => state, () => OFF);
}

export function getSound(): SoundState {
  return state;
}

export function useKirmadaAudio(): KirmadaVoiceState {
  return useSyncExternalStore(subscribeKirmadaVoice, getKirmadaVoiceState, () => KIRMADA_IDLE);
}

export function getKirmadaAudio(): KirmadaVoiceState {
  return getKirmadaVoiceState();
}

/** If the browser or OS pauses audio behind our back, say so instead of claiming it plays. */
function watch(context: AudioContext) {
  if (watched.has(context)) return;
  watched.add(context);
  context.addEventListener("statechange", () => {
    if (state.status === "on" && context.state !== "running") {
      request++;
      stopEffects();
      void stopAmbient(0);
      set({ status: "error", message: "The browser paused audio. Press Sound to resume." });
    }
  });
}

/** Call from a click. Resolves with the resulting state. */
export async function turnSoundOn(): Promise<SoundState> {
  if (state.status === "on" || state.status === "starting") return state;
  const ticket = ++request;
  set({ status: "starting", message: null });
  try {
    const context = await startAmbient();
    if (ticket !== request) return state; // switched off while starting
    watch(context);
    set({ status: "on", message: null });
  } catch (error) {
    if (ticket !== request) return state;
    void stopAmbient(0);
    set({
      status: "error",
      message: error instanceof SoundUnavailableError ? error.message : "Sound could not be started in this browser.",
    });
  }
  return state;
}

export function turnSoundOff() {
  request++;
  set(OFF);
  stopEffects();
  void stopAmbient().then(() => {
    if (state.status !== "on" && state.status !== "starting") suspendAudio();
  });
}

export class SoundOffError extends Error {
  constructor() {
    super("Sound is off. Turn sound on to hear the transmission.");
    this.name = "SoundOffError";
  }
}

/** The Alliance Protocol transmission — only while sound is on; the soundscape dips beneath it. */
export async function playTransmission() {
  if (state.status !== "on") throw new SoundOffError();
  duckAmbient(3200);
  return playAllianceTransmission();
}

/** Optional confirmation when a report is sealed. Decoration: silent when off, failures ignored. */
export function playSealChime() {
  if (state.status !== "on") return;
  duckAmbient(1400);
  void playReportSealed().catch(() => undefined);
}

/**
 * The navigation whoosh — only while sound is on. Fire-and-forget: it never
 * delays or blocks navigation, and a failure to play is silent decoration.
 * It plays on its own interface channel, so the soundscape and a running
 * transmission carry on underneath it.
 */
export function playNavigationWhoosh() {
  if (state.status !== "on") return;
  void playWhoosh().catch(() => undefined);
}

/**
 * Kirmada portrait voice clip — plays /audio/kirmada.mp3 once from the
 * beginning when a visitor hovers, focuses or taps a Kirmada portrait while
 * the global sound switch is ON. Gently ducks the ambient soundscape beneath
 * the clip and never interrupts a running Alliance transmission.
 */
export async function playKirmadaHover(ownerId?: string): Promise<boolean> {
  if (state.status !== "on") return false;
  duckAmbient(3200);
  return playKirmadaClip(ownerId);
}

/**
 * Stops Kirmada portrait audio when the pointer leaves or focus blurs.
 * Fades out smoothly (~220ms) unless `immediate` is requested.
 */
export function stopKirmadaHover(ownerId?: string, immediate = false): void {
  stopKirmadaClip({ ownerId, immediate });
  if (state.status === "on") {
    duckAmbient(120);
  }
}

/**
 * Touch / keyboard toggle for Kirmada portrait audio: starts playback if not
 * playing for this portrait, or stops it cleanly if already playing.
 */
export async function toggleKirmadaTap(ownerId = "default"): Promise<boolean> {
  if (state.status !== "on") return false;
  const current = getKirmadaVoiceState();
  if (current.status === "playing" && current.activeOwner === ownerId) {
    stopKirmadaHover(ownerId);
    return false;
  }
  stopKirmadaClip({ ownerId, immediate: true });
  return playKirmadaHover(ownerId);
}
