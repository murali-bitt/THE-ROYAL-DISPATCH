import { expect, test } from "@playwright/test";

const PAGES = ["/", "/report", "/incidents", "/incidents/KNG-2026-0031", "/villages", "/villages/hollowmere", "/dispatches", "/restoration", "/grimoire", "/operations"];

test("MIDNIGHT NOIR: every computed colour on every page is grayscale", async ({ page }) => {
  test.setTimeout(180_000);
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const offenders = await page.evaluate(() => {
      const found: string[] = [];
      const props = ["color", "backgroundColor", "borderTopColor", "borderLeftColor", "outlineColor", "fill", "stroke"] as const;
      for (const el of Array.from(document.querySelectorAll("*"))) {
        const cs = getComputedStyle(el);
        for (const prop of props) {
          const m = cs[prop].match(/rgba?\(([^)]+)\)/);
          if (!m) continue;
          const [r, g, b, a = 1] = m[1].split(/[\s,/]+/).filter(Boolean).map(Number);
          if (a === 0) continue;
          // Ivory (#F2F0EC) is the warmest tone allowed; anything beyond is a hue.
          if (Math.max(r, g, b) - Math.min(r, g, b) > 8) found.push(`${el.tagName} ${prop} ${cs[prop]}`);
        }
      }
      return found.slice(0, 5);
    });
    expect(offenders, `non-grayscale colours on ${path}`).toEqual([]);
  }
});

test("pages have no horizontal overflow at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 760 });
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `overflow on ${path}`).toBeLessThanOrEqual(0);
  }
});

test("the curse clock persists across refreshes", async ({ page }) => {
  await page.goto("/");
  const clock = page.getByRole("heading", { name: /Sleeping… wakes in/ });
  await expect(clock).toBeVisible();
  const read = () => page.locator("#curse-clock-heading + div .sr-only").textContent();
  await expect.poll(read).toMatch(/wakes in \d+ minutes \d+ seconds/);
  const stored = await page.evaluate(() => localStorage.getItem("royal-dispatch:v1:sleeper"));
  await page.waitForTimeout(2200);
  await page.reload();
  expect(await page.evaluate(() => localStorage.getItem("royal-dispatch:v1:sleeper"))).toBe(stored);
  await expect.poll(read).not.toMatch(/13 minutes 4 seconds/);
});

test("at zero the Sleeper awakens, surfaces records once and keeps existing data", async ({ page }) => {
  await page.goto("/incidents");
  const count = page.getByTestId("registry-count");
  await expect(count).toHaveText(/^\d+ of \d+$/);
  const before = Number((await count.textContent())!.split(" of ")[1]);

  // Put the clock's start in the past so it has already run out.
  await page.evaluate(() => localStorage.setItem("royal-dispatch:v1:sleeper", JSON.stringify({ startedAt: Date.now() - 800_000 })));
  await page.reload();
  await expect(page.getByRole("region", { name: "Kingdom-wide alert" })).toContainText("The Sleeper has awakened");
  await expect(page.locator("html")).toHaveAttribute("data-awakened", "true");
  await expect(count).toHaveText(`${before + 2} of ${before + 2}`);

  await page.reload();
  await expect(count).toHaveText(`${before + 2} of ${before + 2}`); // idempotent
  await page.goto("/dispatches");
  await expect(page.getByTestId("featured-dispatch")).toContainText("The Sleeper has awakened");
});
