import { expect, test, type Page } from "@playwright/test";

async function switchRole(page: Page, role: RegExp) {
  await page.getByRole("button", { name: /Demo role switcher/ }).click();
  await page.getByRole("radio", { name: role }).check();
  await page.keyboard.press("Escape");
}

test("citizen report → steward response → village, dispatch and restoration reflect it", async ({ page }) => {
  // 1. Landing page with a live countdown
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /The Crown still hears you/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Sleeping… wakes in/ })).toBeVisible();
  await expect(page.getByTestId("metric-0")).toHaveText(/^\d+$/);

  // 2–4. File a high-severity report and receive a tracking reference
  await page.getByRole("link", { name: "Report an incident" }).first().click();
  await expect(page).toHaveURL(/\/report$/);
  await page.getByLabel("Incident title").fill("Ward-stone at the east gate has cracked");
  await page.getByRole("radio", { name: /Damaged protective wards/ }).check({ force: true });
  await page.getByLabel("Affected village").selectOption("thornwatch");
  await page.getByLabel("Location or landmark").fill("East gate, Thornwatch Keep");
  await page.getByLabel("What happened").fill("The great ward-stone beside the east gate split down the middle at dusk and stopped glowing.");
  await page.getByRole("radio", { name: /^High/ }).check({ force: true });
  await page.getByRole("textbox", { name: /Your name/ }).fill("Judge Wren");
  await page.getByRole("button", { name: /Submit report/ }).click();

  const receipt = page.getByTestId("tracking-reference");
  await expect(receipt).toHaveText(/^KNG-\d{4}-\d{4}$/);
  const reference = (await receipt.textContent())!.trim();

  // 5. Open the new incident
  await page.getByRole("link", { name: /Track this report/ }).click();
  await expect(page).toHaveURL(new RegExp(`/incidents/${reference}$`));
  await expect(page.getByRole("heading", { level: 1, name: "Ward-stone at the east gate has cracked" })).toBeVisible();
  await expect(page.getByTestId("status-explainer")).toContainText("Submitted");

  // 6–8. Steward acknowledges, moves into restoration and posts an update
  await switchRole(page, /Village Steward/);
  await page.getByLabel("Assign response team").selectOption("Wardwright Company III");
  await page.getByRole("button", { name: "Acknowledge & assign" }).click();
  await expect(page.getByTestId("status-explainer")).toContainText("Acknowledged");
  await page.getByRole("radio", { name: /Restoration in progress/ }).check({ force: true });
  await page.getByRole("button", { name: "Begin restoration" }).click();
  await expect(page.getByTestId("status-explainer")).toContainText("Restoration in progress");
  await page.getByLabel("Post a progress update").fill("Wardwrights have braced the stone with iron bands.");
  await page.getByRole("button", { name: "Post update" }).click();

  // 9. Timeline reflects every change, and survives a refresh
  const timeline = page.getByTestId("timeline").filter({ visible: true });
  await expect(timeline).toContainText("Wardwrights have braced the stone with iron bands.");
  await expect(timeline).toContainText("Acknowledged");
  await page.reload();
  await expect(page.getByTestId("timeline").filter({ visible: true })).toContainText("braced the stone");

  // 10. The village shows the incident and its status
  await page.getByRole("link", { name: "Thornwatch" }).first().click();
  await expect(page).toHaveURL(/\/villages\/thornwatch$/);
  const villageIncidents = page.getByTestId("village-incidents").filter({ visible: true });
  await expect(villageIncidents).toContainText(reference);
  await expect(villageIncidents).toContainText("In restoration");

  // 11. Publish a dispatch and find it in the announcements
  await page.goto("/dispatches");
  await page.getByRole("button", { name: /Publish a dispatch/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Headline").fill("East gate closed while the ward is repaired");
  await dialog.getByLabel("One-line summary").fill("Use the north gate until the Wardwrights finish.");
  await dialog.getByLabel("Full dispatch").fill("The east gate of Thornwatch Keep is closed while the cracked ward-stone is bound in iron.");
  await dialog.getByLabel("Scope").selectOption("thornwatch");
  await dialog.getByRole("button", { name: "Publish dispatch" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "East gate closed while the ward is repaired" })).toBeVisible();
  await page.goto("/dispatches");
  await expect(page.getByTestId("dispatch-list").filter({ visible: true })).toContainText("East gate closed while the ward is repaired");

  // 12. Restoration and Grimoire render data
  await page.goto("/restoration");
  await expect(page.getByTestId("restoration-index")).toHaveText(/^\d+%$/);
  await page.goto("/grimoire");
  await expect(page.getByRole("heading", { name: "The Lantern of Unlit Hours" })).toBeVisible();
});

test("registry search, filters, sort and clear work together", async ({ page }) => {
  await page.goto("/incidents");
  const count = page.getByTestId("registry-count");
  await expect(count).toHaveText(/^\d+ of \d+$/);
  const total = Number((await count.textContent())!.split(" of ")[1]);

  await page.getByLabel("Village").selectOption("hollowmere");
  await page.getByLabel("Severity").selectOption("critical");
  await expect(count).toHaveText(`1 of ${total}`);
  await expect(page.getByTestId("registry-list")).toContainText("KNG-2026-0031");
  await expect(page).toHaveURL(/village=hollowmere/);

  await page.getByRole("button", { name: /Clear 2 filters/ }).click();
  await expect(count).toHaveText(`${total} of ${total}`);

  await page.getByLabel("Search incidents").fill("lantern");
  await expect(page.getByTestId("registry-list")).toContainText("Lantern found burning");

  await page.getByLabel("Search incidents").fill("no-such-thing-here");
  await expect(page.getByText("No records match")).toBeVisible();
  await page.getByRole("button", { name: "Clear all filters" }).click();

  await page.getByLabel("Sort by").selectOption("severity");
  await expect(page.getByTestId("registry-list").locator("li").first()).toContainText("Critical");
});

test("village markers open the correct village", async ({ page }) => {
  await page.goto("/villages");
  await page.getByRole("button", { name: /^Moonfall —/ }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Moonfall" })).toBeVisible();
  await page.getByTestId("open-village").click();
  await expect(page).toHaveURL(/\/villages\/moonfall$/);
  await expect(page.getByRole("heading", { level: 1, name: "Moonfall" })).toBeVisible();
});

test("operations desk is gated for citizens and opens for stewards", async ({ page }) => {
  await page.goto("/operations");
  await expect(page.getByRole("heading", { name: /Restricted to officers/ })).toBeVisible();
  await page.getByTestId("become-steward").click();
  await expect(page.getByTestId("ops-queue")).toBeVisible();
  await page.getByRole("button", { name: "Review" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("mobile navigation opens and navigates", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("dialog").getByRole("link", { name: /Grimoire/ }).click();
  await expect(page).toHaveURL(/\/grimoire$/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});
