/**
 * The challenge card reads "Sleeping... Wakes in 13:04".
 * We interpret that as 13 minutes and 4 seconds. If the organisers intended
 * a different duration, change this single constant.
 */
export const SLEEPER_DURATION_MS = (13 * 60 + 4) * 1000;

/** Year used when minting public incident references (KNG-YYYY-NNNN). */
export const REFERENCE_PREFIX = "KNG";

export const STORAGE_KEYS = {
  state: "royal-dispatch:v1:kingdom",
  role: "royal-dispatch:v1:demo-role",
  sleeper: "royal-dispatch:v1:sleeper",
  awakeningSeen: "royal-dispatch:v1:awakening-seen",
  // Sound is intentionally not persisted: every visit begins silent (lib/audio/sound-control.ts).
} as const;

/** THE ALLIANCE PROTOCOL — official event partner, as given in the challenge brief. */
export const SPONSOR = {
  name: "KAPIDHWAJ",
  designation: "Official Event Partner",
  handle: "@kapidhwaj.innovations",
  instagramUrl: "https://www.instagram.com/kapidhwaj.innovations/",
} as const;

/** Attachments are downscaled in the browser before storage. */
export const ATTACHMENT_LIMITS = {
  maxInputBytes: 5 * 1024 * 1024,
  maxStoredChars: 450_000,
  maxDimension: 960,
  acceptedTypes: ["image/jpeg", "image/png", "image/webp"] as const,
};

export const RESPONSE_TEAMS = [
  "Royal Arcanum",
  "Wardwright Company III",
  "Waterkeepers of Hollowmere",
  "Roadwardens of the West",
  "Signal Corps of Moonfall",
  "Healers of the Grey Order",
  "Granary Wardens",
  "Kingsfall City Watch",
] as const;
