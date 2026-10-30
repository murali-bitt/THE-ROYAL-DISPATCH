import { expect, test, type Page } from "@playwright/test";
import { AUDIO_SPY, type AudioSpy } from "./audio-spy";

/**
 * The storm, the navigation whoosh and Kirmada's portrait + MP3 audio.
 * Audio checks prove what the page builds, fetches, decodes and starts; no
 * automated test can prove what physical speakers emit.
 */

const audio = (page: Page) =>
  page.evaluate(() => {
    const a = (window as never as { __audio: AudioSpy & { kirmadaElement: HTMLAudioElement | null } }).__audio;
    const el = a.kirmadaElement;
    return {
      ...a,
      context: undefined,
      kirmadaElement: undefined,
      kirmadaPaused: el ? el.paused : true,
      kirmadaCurrentTime: el ? el.currentTime : 0,
    };
  });

const primary = (page: Page) => page.getByRole("navigation", { name: "Primary" });

test.describe("The storm", () => {
  test("lightning strikes at random, then the sky returns to dark", async ({ page }) => {
    await page.goto("/");
    const bg = page.getByTestId("haunted-background");
    await expect(bg).toHaveAttribute("data-strikes", /^[1-9]/, { timeout: 12_000 });
    await expect(bg).toHaveAttribute("data-storm", "idle", { timeout: 4_000 });
    // Content stays clickable through a storm: the background never takes input.
    expect(await bg.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  });

  test("reduced motion: no lightning at all", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.waitForTimeout(7_000); // longer than the first strike could take
    const bg = page.getByTestId("haunted-background");
    await expect(bg).toHaveAttribute("data-atmosphere", "static");
    expect(await bg.getAttribute("data-strikes")).toBeNull();
  });
});

test.describe("The navigation whoosh", () => {
  test("is silent while sound is off", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/");
    await primary(page).getByRole("link", { name: /Registry/ }).click();
    await expect(page).toHaveURL(/\/incidents$/);
    await primary(page).getByRole("link", { name: /Villages/ }).click();
    await expect(page).toHaveURL(/\/villages$/);
    const a = await audio(page);
    expect(a.contexts).toBe(0);
    expect(a.oneShots).toBe(0);
  });

  test("plays on header navigation — click, keyboard and Report — but not on hover or the current page", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/");
    await page.getByTestId("sound-toggle").click();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-checked", "true");

    await primary(page).getByRole("link", { name: /Grimoire/ }).hover();
    await page.waitForTimeout(300);
    expect((await audio(page)).oneShots).toBe(0); // hover is silent

    await primary(page).getByRole("link", { name: /Registry/ }).click();
    await expect(page).toHaveURL(/\/incidents$/);
    await expect.poll(async () => (await audio(page)).oneShots).toBe(1);

    await page.waitForTimeout(250);
    await primary(page).getByRole("link", { name: /Registry/ }).click(); // already here
    await page.waitForTimeout(300);
    expect((await audio(page)).oneShots).toBe(1);

    await primary(page).getByRole("link", { name: /Villages/ }).focus();
    await page.waitForTimeout(200);
    expect((await audio(page)).oneShots).toBe(1); // focus is silent
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/villages$/);
    await expect.poll(async () => (await audio(page)).oneShots).toBe(2);

    await page.waitForTimeout(250);
    await page.getByRole("banner").getByRole("link", { name: "Report an incident" }).first().click();
    await expect(page).toHaveURL(/\/report$/);
    await expect.poll(async () => (await audio(page)).oneShots).toBe(3);

    // The soundscape was never stopped or doubled by any of it.
    const a = await audio(page);
    expect(a.loopsStarted).toBe(1);
    expect(a.loopsStopped).toBe(0);
    expect(a.contexts).toBe(1);
  });

  test("rapid navigation makes one whoosh, and lands on the last page chosen", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/");
    await page.getByTestId("sound-toggle").click();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-checked", "true");
    await page.evaluate(() => {
      const nav = document.querySelector('nav[aria-label="Primary"]')!;
      for (const href of ["/incidents", "/villages", "/dispatches"]) (nav.querySelector(`a[href="${href}"]`) as HTMLAnchorElement).click();
    });
    await expect(page).toHaveURL(/\/dispatches$/);
    await page.waitForTimeout(400);
    expect((await audio(page)).oneShots).toBe(1);
  });

  test("never cuts off a running Alliance transmission", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/");
    await page.getByTestId("sound-toggle").click();
    const replay = page.getByTestId("replay-transmission");
    await replay.scrollIntoViewIfNeeded();
    await replay.click();
    await expect(page.getByTestId("transmission-status")).toHaveText(/Transmitting/);
    await primary(page).getByRole("link", { name: /Registry/ }).click();
    await expect(page).toHaveURL(/\/incidents$/);
    await page.waitForTimeout(250);
    await primary(page).getByRole("link", { name: /Overview/ }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect.poll(async () => (await audio(page)).oneShots).toBe(2);
    await expect(page.getByTestId("transmission-status")).toHaveText(/Transmission received/, { timeout: 8000 });
  });

  test("navigation still works when the whoosh cannot play", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/");
    await page.getByTestId("sound-toggle").click();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-checked", "true");
    await page.evaluate(() => {
      AudioBufferSourceNode.prototype.start = () => {
        throw new Error("audio device lost");
      };
    });
    await primary(page).getByRole("link", { name: /Grimoire/ }).click();
    await expect(page).toHaveURL(/\/grimoire$/);
    await expect(page.getByRole("heading", { level: 1, name: /The Grimoire/ })).toBeVisible();
  });
});

test.describe("Kirmada's portrait & MP3 interaction", () => {
  test("the Grimoire profile shows the supplied artwork, in monochrome, with alt text and artifact traceability links", async ({ page }) => {
    await page.goto("/grimoire");
    const profile = page.getByTestId("kirmada-profile");
    await expect(profile.getByRole("heading", { name: "Kirmada" })).toBeVisible();
    const img = profile.getByRole("img", { name: /Kirmada/ });
    await expect(img).toBeVisible();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth)).toBeGreaterThan(0);
    expect(decodeURIComponent((await img.getAttribute("src")) ?? "")).toContain("/images/kirmada.jpg");
    expect(await img.evaluate((el) => getComputedStyle(el).filter)).toContain("grayscale(1)");
    // It has a fixed frame: the box exists before and after load, so nothing shifts.
    const box = await img.boundingBox();
    expect(box!.height).toBeGreaterThan(300);

    // Artifacts link to connected villages, incidents, restoration initiatives and dispatches.
    const drownedBell = page.locator("#drowned-bell");
    await expect(drownedBell.getByRole("link", { name: "Hollowmere", exact: true })).toBeVisible();
    await expect(drownedBell.getByRole("link", { name: /KNG-2026-0031/ })).toBeVisible();
    await expect(drownedBell.getByRole("link", { name: /Clearing the Hollowmere Waters/i })).toBeVisible();
    await expect(drownedBell.getByRole("link", { name: /Water restoration has begun in Hollowmere/i })).toBeVisible();
  });

  test("appears where Kirmada matters, and not beside ordinary notices", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#curse-heading")).toBeAttached();
    await expect(page.locator('[data-testid="kirmada-portrait"][data-variant="hero"]')).toBeAttached();

    await page.goto("/dispatches/dsp-council-artifact");
    await expect(page.getByRole("img", { name: /Kirmada/ })).toBeVisible();
    await page.goto("/dispatches/dsp-hollowmere-water");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByTestId("kirmada-portrait")).toHaveCount(0);

    await page.goto("/incidents/KNG-2026-0031"); // the Drowned Bell's lake
    await expect(page.getByText("Threat · Kirmada").filter({ visible: true })).toBeVisible();
  });

  test("portraits never break the layout at phone and tablet widths", async ({ page }) => {
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/grimoire", "/dispatches/dsp-council-artifact"]) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `overflow on ${path} at ${width}px`).toBeLessThanOrEqual(0);
      }
    }
  });

  test("public /audio/kirmada.mp3 responds 200 OK and decodes in the browser as valid non-silent audio", async ({ page, request }) => {
    const res = await request.get("/audio/kirmada.mp3");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("audio/mpeg");
    const body = await res.body();
    expect(body.byteLength).toBe(50356);

    await page.goto("/");
    const decoded = await page.evaluate(async () => {
      const response = await fetch("/audio/kirmada.mp3");
      const arrayBuffer = await response.arrayBuffer();
      const ctx = new OfflineAudioContext(2, 44100 * 4, 44100);
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      const data = audioBuffer.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < data.length; i += 1) {
        const abs = Math.abs(data[i]);
        if (abs > peak) peak = abs;
      }
      return {
        duration: audioBuffer.duration,
        channels: audioBuffer.numberOfChannels,
        peak,
      };
    });
    expect(decoded.duration).toBeGreaterThan(2.5);
    expect(decoded.channels).toBeGreaterThanOrEqual(1);
    expect(decoded.peak).toBeGreaterThan(0.05);
  });

  test("does not autoplay on page load and prevents playback while global SOUND is OFF", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/grimoire");
    const portrait = page.locator('[data-testid="kirmada-portrait"][data-variant="grimoire"]');
    await expect(portrait).toHaveAttribute("data-audio-state", "muted");
    await expect(portrait.getByTestId("kirmada-audio-cue")).toContainText("Enable sound");

    // Hover, focus and click while sound is OFF create no audio and do not play.
    await portrait.hover();
    await portrait.focus();
    await portrait.click();
    await page.waitForTimeout(200);

    const a = await audio(page);
    expect(a.kirmadaCreated).toBe(0);
    expect(a.kirmadaPlays).toBe(0);
    await expect(portrait).toHaveAttribute("data-audio-state", "muted");
  });

  test("hovering with SOUND ON plays /audio/kirmada.mp3 once, ignores movement inside, fades out on leave, and replays on re-entry", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/grimoire");
    await page.getByTestId("sound-toggle").click();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-checked", "true");

    const portrait = page.locator('[data-testid="kirmada-portrait"][data-variant="grimoire"]');
    await expect(portrait).toHaveAttribute("data-audio-state", "ready");
    await expect(portrait.getByTestId("kirmada-audio-cue")).toContainText("Hover to hear");

    const box = await portrait.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width * 0.3, box!.y + box!.height * 0.3);
    await expect(portrait).toHaveAttribute("data-audio-state", "playing");
    await expect(portrait.getByTestId("kirmada-audio-cue")).toContainText("Speaking");

    let a = await audio(page);
    expect(a.kirmadaCreated).toBe(1);
    expect(a.kirmadaPlays).toBe(1);
    expect(a.kirmadaSrc).toContain("/audio/kirmada.mp3");
    expect(a.kirmadaPaused).toBe(false);

    // Moving the cursor inside the same portrait does not restart or stack playback.
    await page.mouse.move(box!.x + box!.width * 0.6, box!.y + box!.height * 0.5);
    await page.mouse.move(box!.x + box!.width * 0.4, box!.y + box!.height * 0.7);
    await page.waitForTimeout(150);
    a = await audio(page);
    expect(a.kirmadaPlays).toBe(1);
    expect(a.kirmadaMaxSimultaneous).toBe(1);

    // Leaving the portrait fades out (~220ms), pauses and resets to 0.
    await page.mouse.move(5, 5);
    await expect(portrait).toHaveAttribute("data-audio-state", "ready");
    await expect.poll(async () => (await audio(page)).kirmadaPaused, { timeout: 2_000 }).toBe(true);
    expect((await audio(page)).kirmadaCurrentTime).toBe(0);

    // Re-entering after cleanup replays the sound on the same shared Audio instance.
    await page.mouse.move(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5);
    await expect(portrait).toHaveAttribute("data-audio-state", "playing");
    a = await audio(page);
    expect(a.kirmadaCreated).toBe(1);
    expect(a.kirmadaPlays).toBe(2);
    expect(a.kirmadaMaxSimultaneous).toBe(1);
  });

  test("keyboard focus, touch tap, multiple portrait handoff, and global SOUND OFF cutoff work cleanly", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/grimoire");
    await page.getByTestId("sound-toggle").click();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-checked", "true");

    const mainPortrait = page.locator('[data-testid="kirmada-portrait"][data-variant="grimoire"]');
    const contextPortrait = page.locator('[data-testid="kirmada-portrait"][data-variant="context"]').first();

    // 1. Keyboard focus starts playback; blur stops it.
    await mainPortrait.focus();
    await expect(mainPortrait).toHaveAttribute("data-audio-state", "playing");
    expect((await audio(page)).kirmadaPlays).toBe(1);

    // Focusing a second portrait hands off without overlapping two Audio elements.
    await contextPortrait.focus();
    await expect(contextPortrait).toHaveAttribute("data-audio-state", "playing");
    await expect(mainPortrait).toHaveAttribute("data-audio-state", "ready");
    let a = await audio(page);
    expect(a.kirmadaCreated).toBe(1);
    expect(a.kirmadaMaxSimultaneous).toBe(1);

    await contextPortrait.evaluate((el: HTMLElement) => el.blur());
    await expect(contextPortrait).toHaveAttribute("data-audio-state", "ready");
    await expect.poll(async () => (await audio(page)).kirmadaPaused, { timeout: 2_000 }).toBe(true);

    // 2. Touch interaction toggles playback on and off.
    await mainPortrait.dispatchEvent("touchstart");
    await expect(mainPortrait).toHaveAttribute("data-audio-state", "playing");
    await mainPortrait.dispatchEvent("touchstart");
    await expect(mainPortrait).toHaveAttribute("data-audio-state", "ready");
    await expect.poll(async () => (await audio(page)).kirmadaPaused, { timeout: 2_000 }).toBe(true);

    // 3. Global SOUND OFF immediately cuts active Kirmada playback and resets to 0.
    await mainPortrait.focus();
    await expect(mainPortrait).toHaveAttribute("data-audio-state", "playing");
    await page.getByTestId("sound-toggle").click();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-checked", "false");
    await expect(mainPortrait).toHaveAttribute("data-audio-state", "muted");
    a = await audio(page);
    expect(a.kirmadaPaused).toBe(true);
    expect(a.kirmadaCurrentTime).toBe(0);
  });

  test("coexists with Alliance transmission and ambient soundscape, and handles rejected play() gracefully", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/");
    await page.getByTestId("sound-toggle").click();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-checked", "true");

    // Start the Alliance transmission, then hover Kirmada's hero portrait while it transmits.
    const replay = page.getByTestId("replay-transmission");
    await replay.scrollIntoViewIfNeeded();
    await replay.click();
    await expect(page.getByTestId("transmission-status")).toHaveText(/Transmitting/);

    const heroPortrait = page.locator('[data-testid="kirmada-portrait"][data-variant="hero"]');
    await heroPortrait.focus();
    await expect(heroPortrait).toHaveAttribute("data-audio-state", "playing");

    // The Alliance transmission finishes normally and ambient is never duplicated.
    await expect(page.getByTestId("transmission-status")).toHaveText(/Transmission received/, { timeout: 8_000 });
    const a = await audio(page);
    expect(a.loopsStarted).toBe(1);
    expect(a.loopsStopped).toBe(0);

    await heroPortrait.evaluate((el: HTMLElement) => el.blur());
    await expect.poll(async () => (await audio(page)).kirmadaPaused, { timeout: 2_000 }).toBe(true);

    // Simulate a rejected play() promise: UI shows blocked state instead of crashing or lying.
    await page.evaluate(() => {
      HTMLMediaElement.prototype.play = () => Promise.reject(new Error("NotAllowedError"));
    });
    await heroPortrait.focus();
    await expect(heroPortrait).toHaveAttribute("data-audio-state", "blocked");
    await expect(heroPortrait.getByTestId("kirmada-audio-cue")).toContainText("Tap to retry");
  });
});
