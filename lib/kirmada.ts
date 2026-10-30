/**
 * Kirmada, the antagonist of Valmora. His portrait is the supplied artwork,
 * copied unchanged to public/images/kirmada.jpg (736 × 736) and always shown in
 * monochrome by CSS — the source file itself is never altered.
 * His voice / theme is the supplied kirmada.mp3, copied unchanged to
 * public/audio/kirmada.mp3.
 */
export const KIRMADA_AUDIO_SRC = "/audio/kirmada.mp3";

export const KIRMADA_PORTRAIT = {
  src: "/images/kirmada.jpg",
  audioSrc: KIRMADA_AUDIO_SRC,
  width: 736,
  height: 736,
  /** Where his face sits in the artwork, as CSS percentages — used to crop and zoom. */
  face: "50% 42%",
} as const;

export const KIRMADA_ALT =
  "Kirmada, the horned sorcerer of the Wheel: a hulking, snarling figure with curled horns and burning eyes, crouched with a skull-topped axe";

/**
 * Does this content concern Kirmada himself? Only then does his portrait
 * appear beside it — ordinary village notices and reports stay free of it.
 */
export function concernsKirmada(...texts: (string | null | undefined)[]) {
  return texts.some((text) => !!text && /\bkirmada\b/i.test(text));
}
