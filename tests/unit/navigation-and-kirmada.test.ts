import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isPageChange } from "@/components/shell/nav";
import { SEED_ARTIFACTS } from "@/lib/data/seed";
import { concernsKirmada, KIRMADA_AUDIO_SRC, KIRMADA_PORTRAIT } from "@/lib/kirmada";

const click = (over: Partial<Parameters<typeof isPageChange>[2]> = {}) => ({
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
  ...over,
});

describe("header navigation sound rule", () => {
  it("a plain click or keyboard Enter on another page is a page change", () => {
    expect(isPageChange("/", "/incidents", click())).toBe(true);
    expect(isPageChange("/incidents/KNG-2026-0031", "/incidents", click())).toBe(true);
    expect(isPageChange("/grimoire", "/report", click())).toBe(true);
  });

  it("the page you are on, new-tab clicks and cancelled clicks are not", () => {
    expect(isPageChange("/incidents", "/incidents", click())).toBe(false);
    expect(isPageChange("/report", "/report", click())).toBe(false);
    expect(isPageChange("/", "/villages", click({ ctrlKey: true }))).toBe(false);
    expect(isPageChange("/", "/villages", click({ metaKey: true }))).toBe(false);
    expect(isPageChange("/", "/villages", click({ shiftKey: true }))).toBe(false);
    expect(isPageChange("/", "/villages", click({ button: 1 }))).toBe(false);
    expect(isPageChange("/", "/villages", click({ defaultPrevented: true }))).toBe(false);
  });
});

describe("Kirmada", () => {
  it("ships the supplied portrait unchanged as a public asset", () => {
    const published = `public${KIRMADA_PORTRAIT.src}`;
    expect(existsSync(published)).toBe(true);
    const bytes = readFileSync(published);
    expect(bytes.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff])); // a JPEG
    // The original at the project root is preserved and identical.
    if (existsSync("kirmada.jpg")) expect(bytes.equals(readFileSync("kirmada.jpg"))).toBe(true);
  });

  it("ships the supplied Kirmada MP3 unchanged as /audio/kirmada.mp3", () => {
    expect(KIRMADA_AUDIO_SRC).toBe("/audio/kirmada.mp3");
    expect(KIRMADA_PORTRAIT.audioSrc).toBe("/audio/kirmada.mp3");
    const published = `public${KIRMADA_PORTRAIT.audioSrc}`;
    expect(existsSync(published)).toBe(true);
    const bytes = readFileSync(published);
    expect(bytes.length).toBeGreaterThan(10_000);
    // ID3v2 header ("ID3") followed by MPEG audio frames
    expect(bytes.subarray(0, 3).toString("ascii")).toBe("ID3");
    if (existsSync("kirmada.mp3")) {
      expect(bytes.equals(readFileSync("kirmada.mp3"))).toBe(true);
    }
  });

  it("appears only beside content that concerns him", () => {
    expect(concernsKirmada("The Council believes the lantern is one of the artifacts scattered by Kirmada.")).toBe(true);
    expect(concernsKirmada(null, undefined, "KIRMADA stirs")).toBe(true);
    expect(concernsKirmada("Boil all water drawn from Hollowmere until further notice.")).toBe(false);
    expect(concernsKirmada("Kirmadas")).toBe(false);
    const marked = SEED_ARTIFACTS.filter((a) => concernsKirmada(a.lore, a.description)).map((a) => a.id);
    expect(marked).toContain("drowned-bell");
    expect(marked).not.toContain("ashen-compass"); // its lore never names him
  });
});
