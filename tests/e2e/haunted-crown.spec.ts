import { expect, test, type Page } from "@playwright/test";
import { AUDIO_SPY, type AudioSpy } from "./audio-spy";

/**
 * THE HAUNTED CROWN — the global sound switch and the living background.
 * These prove the implementation (audio graphs created, started, stopped and
 * released; layers inert to input); they cannot prove what a speaker emits.
 */

const audio = (page: Page) => page.evaluate(() => {
  const a = (window as never as { __audio: AudioSpy }).__audio;
  return { ...a, context: undefined, state: a.context?.state ?? null };
});

test.describe("The global sound switch", () => {
  test("starts silent, turns a real soundscape on and off, and cleans it up", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/");
    const toggle = page.getByTestId("sound-toggle");
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await expect(toggle).toHaveText(/Sound\s*Off/i);
    await page.waitForTimeout(1200);
    expect((await audio(page)).contexts).toBe(0); // nothing on load

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "true");
    await expect(toggle).toHaveText(/Sound\s*On/i);
    const on = await audio(page);
    expect(on.contexts).toBe(1);
    expect(on.loopsStarted).toBe(1);
    expect(on.state).toBe("running");
    // The soundscape genuinely reaches the output (fades in over a few seconds).
    await expect.poll(async () => (await audio(page)).peak, { timeout: 8000 }).toBeGreaterThan(0.005);

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    // After the fade, the loop is stopped and the context is put to sleep.
    await expect.poll(async () => (await audio(page)).loopsStopped, { timeout: 5000 }).toBe(1);
    await expect.poll(async () => (await audio(page)).state, { timeout: 5000 }).toBe("suspended");
    await expect(page.getByTestId("replay-transmission")).toBeDisabled();
  });

  test("one soundscape survives navigation without stacking", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/");
    await page.getByTestId("sound-toggle").click();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-checked", "true");

    const primary = page.getByRole("navigation", { name: "Primary" });
    for (const name of [/Registry/, /Villages/, /Grimoire/, /Overview/]) {
      await primary.getByRole("link", { name }).click();
      await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-checked", "true");
    }
    const after = await audio(page);
    expect(after.contexts).toBe(1);
    expect(after.loopsStarted).toBe(1);
    expect(after.loopsStopped).toBe(0);

    // The Alliance transmission still plays over it.
    const before = after.oscillatorsStarted;
    const replay = page.getByTestId("replay-transmission");
    await replay.scrollIntoViewIfNeeded();
    await replay.click();
    await expect(page.getByTestId("transmission-status")).toHaveText(/Transmitting/);
    expect((await audio(page)).oscillatorsStarted - before).toBeGreaterThan(5);
    await expect(page.getByTestId("transmission-status")).toHaveText(/Transmission received/, { timeout: 8000 });
  });

  test("rapid toggling never leaves a soundscape running", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/");
    const toggle = page.getByTestId("sound-toggle");
    for (let i = 0; i < 6; i++) await toggle.click();
    await expect(toggle).toHaveAttribute("aria-checked", "false");
    await page.waitForTimeout(2500);
    const a = await audio(page);
    expect(a.loopsStarted - a.loopsStopped).toBe(0);
  });

  test("a reload is silent even after sound was switched on", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/");
    await page.getByTestId("sound-toggle").click();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-checked", "true");
    await page.reload();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-checked", "false");
    await page.waitForTimeout(1200);
    expect((await audio(page)).contexts).toBe(0);
  });
});

test.describe("The haunted background", () => {
  test("is decorative: hidden from assistive tech and never takes input", async ({ page }) => {
    await page.goto("/");
    const bg = page.getByTestId("haunted-background");
    await expect(bg).toHaveAttribute("aria-hidden", "true");
    await expect(bg).toHaveAttribute("data-atmosphere", "running");
    expect(await bg.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
    // Wherever you click, you reach the page, not the background.
    const hits = await page.evaluate(() => {
      const bgEl = document.querySelector("[data-testid=haunted-background]")!;
      const points = [
        [window.innerWidth * 0.5, window.innerHeight * 0.5],
        [window.innerWidth * 0.85, window.innerHeight * 0.25],
        [20, window.innerHeight - 20],
      ];
      return points.map(([x, y]) => bgEl.contains(document.elementFromPoint(x, y)));
    });
    expect(hits).toEqual([false, false, false]);
    await expect(page.getByTestId("haunted-moon")).toHaveAttribute("data-variant", "hero");
  });

  test("pauses its animation loop while the tab is hidden", async ({ page }) => {
    await page.goto("/");
    const bg = page.getByTestId("haunted-background");
    await expect(bg).toHaveAttribute("data-atmosphere", "running");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(bg).toHaveAttribute("data-atmosphere", "paused");
    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await expect(bg).toHaveAttribute("data-atmosphere", "running");
  });

  test("reduced motion renders a still scene with no endless animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByTestId("haunted-background")).toHaveAttribute("data-atmosphere", "static");
    await expect(page.getByRole("heading", { level: 1, name: /The Crown still hears you/i })).toBeVisible();
    await page.waitForTimeout(500);
    const endless = await page.evaluate(
      () =>
        document
          .getAnimations()
          .filter((a) => a.playState === "running" && a.effect?.getTiming().iterations === Infinity).length,
    );
    expect(endless).toBe(0);
  });

  test("no horizontal overflow at tablet and phone widths", async ({ page }) => {
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/", "/incidents", "/villages", "/report"]) {
        await page.goto(path);
        await page.waitForLoadState("networkidle");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        expect(overflow, `overflow on ${path} at ${width}px`).toBeLessThanOrEqual(0);
      }
      await expect(page.getByTestId("sound-toggle")).toBeVisible();
    }
  });
});
