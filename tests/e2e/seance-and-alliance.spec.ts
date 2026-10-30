import { expect, test } from "@playwright/test";
import { AUDIO_SPY } from "./audio-spy";

test.describe("The Séance — Alliance Protocol transmission", () => {
  test("never plays on load, plays real audio once sound is on, and can be replayed", async ({ page }) => {
    await page.addInitScript(AUDIO_SPY);
    await page.goto("/");
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => (window as never as { __audio: { contexts: number } }).__audio.contexts)).toBe(0);

    const replay = page.getByTestId("replay-transmission");
    const status = page.getByTestId("transmission-status");
    await replay.scrollIntoViewIfNeeded();
    // While sound is off the console says so and the replay cannot be pressed.
    await expect(status).toHaveText(/Sound is off/);
    await expect(replay).toBeDisabled();

    await page.getByTestId("sound-toggle").click();
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-checked", "true");
    const before = await page.evaluate(() => (window as never as { __audio: { oscillatorsStarted: number } }).__audio.oscillatorsStarted);
    await replay.click();
    await expect(status).toHaveText(/Transmitting/);
    await expect(replay).toBeDisabled();

    const first = await page.evaluate(() => (window as never as { __audio: { contexts: number; oscillatorsStarted: number } }).__audio);
    expect(first.contexts).toBe(1);
    expect(first.oscillatorsStarted - before).toBeGreaterThan(5); // the transmission's own oscillators

    // The signal reaching the destination is genuinely non-silent.
    await expect
      .poll(() => page.evaluate(() => (window as never as { __audio: { peak: number } }).__audio.peak), { timeout: 4000 })
      .toBeGreaterThan(0.01);

    await expect(status).toHaveText(/Transmission received/, { timeout: 8000 });
    await expect(replay).toBeEnabled();

    await replay.click();
    await expect(status).toHaveText(/Transmitting/);
    const second = await page.evaluate(() => (window as never as { __audio: { contexts: number; oscillatorsStarted: number } }).__audio);
    expect(second.contexts).toBe(1); // one shared context, no pile-up of contexts
    expect(second.oscillatorsStarted).toBeGreaterThan(first.oscillatorsStarted);
  });

  test("reports a failure instead of pretending sound played", async ({ page }) => {
    await page.addInitScript(() => {
      // Simulate a browser without Web Audio.
      Object.defineProperty(window, "AudioContext", { value: undefined, configurable: true });
      Object.defineProperty(window, "webkitAudioContext", { value: undefined, configurable: true });
    });
    await page.goto("/");
    await page.getByTestId("replay-transmission").scrollIntoViewIfNeeded();
    await page.getByTestId("sound-toggle").click();
    await expect(page.getByTestId("transmission-status")).toHaveText(/unavailable/i);
    await expect(page.getByTestId("transmission-status")).toHaveAttribute("role", "alert");
    // The switch stays honestly off, and the replay stays unavailable.
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("aria-checked", "false");
    await expect(page.getByTestId("sound-toggle")).toHaveAttribute("data-state", "error");
    await expect(page.getByTestId("replay-transmission")).toBeDisabled();
  });
});

test.describe("The Alliance Protocol — KAPIDHWAJ", () => {
  test("features the official partner, the exact handle and a safe Instagram link", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /When the kingdom lost its voice/ })).toBeVisible();
    await expect(page.getByText("Official event partner — KAPIDHWAJ")).toBeVisible();
    await expect(page.getByTestId("sponsor-handle")).toHaveText("@kapidhwaj.innovations");

    const link = page.getByTestId("sponsor-instagram");
    await expect(link).toHaveAttribute("href", "https://www.instagram.com/kapidhwaj.innovations/");
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAccessibleName(/View @kapidhwaj\.innovations on Instagram/);
    await expect(link).toHaveText(/View @kapidhwaj\.innovations on Instagram/i);
  });

  test("copy handle puts the exact handle on the clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    await page.getByTestId("sponsor-copy").click();
    await expect(page.getByTestId("sponsor-copy")).toHaveText(/Handle copied/);
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("@kapidhwaj.innovations");
  });

  test("copy handle reports failure honestly when the clipboard is blocked", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", { value: { writeText: () => Promise.reject(new Error("denied")) }, configurable: true });
      document.execCommand = () => false;
    });
    await page.goto("/");
    await page.getByTestId("sponsor-copy").click();
    await expect(page.getByText(/blocked clipboard access/)).toBeVisible();
    await expect(page.getByTestId("sponsor-copy")).not.toHaveText(/Handle copied/);
  });
});
