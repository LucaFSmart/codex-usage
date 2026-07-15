import { expect, test, type Page } from "@playwright/test";

function captureErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

for (const width of [320, 480, 768, 1200]) {
  for (const theme of ["light", "dark"]) {
    test(`${theme} layout at ${width}px`, async ({ page }) => {
      const errors = captureErrors(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/visual/?theme=${theme}&state=normal&accounts=2`);
      await expect(page.locator("codex-usage-card")).toBeVisible();
      const card = page.locator("codex-usage-card");
      expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      expect((await page.screenshot()).byteLength).toBeGreaterThan(10_000);
      expect(errors).toEqual([]);
    });
  }
}

for (const state of ["normal", "elevated", "critical", "blocked", "stale", "weekly-only"]) {
  test(`semantic state ${state}`, async ({ page }) => {
    const errors = captureErrors(page);
    await page.setViewportSize({ width: 768, height: 800 });
    await page.goto(`/visual/?theme=dark&state=${state}&accounts=1`);
    const card = page.locator("codex-usage-card");
    await expect(card).toBeVisible();
    await expect(card.locator("ha-card")).toHaveClass(
      new RegExp(state === "weekly-only" ? "normal" : state),
    );
    expect(errors).toEqual([]);
  });
}

test("account chip interaction updates the selected account", async ({ page }) => {
  const errors = captureErrors(page);
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/visual/?theme=dark&state=normal&accounts=2&mode=adaptive");
  const card = page.locator("codex-usage-card");

  await card.locator('button[data-entry-id="entry-1"]').click();

  await expect(card.locator("header p")).toContainText("Studio");
  await expect(card.locator('button[data-entry-id="entry-1"]')).toHaveClass(/selected/);
  expect(errors).toEqual([]);
});

for (const mode of ["compact", "adaptive", "detailed"]) {
  test(`${mode} mode exposes the intended density`, async ({ page }) => {
    const errors = captureErrors(page);
    await page.setViewportSize({ width: 768, height: 1000 });
    await page.goto(`/visual/?theme=light&state=normal&accounts=1&mode=${mode}`);
    const card = page.locator("codex-usage-card");

    if (mode === "compact") {
      await expect(card.locator(".details")).toHaveCount(0);
      await expect(card.locator(".ring")).toHaveCount(0);
    } else if (mode === "adaptive") {
      await expect(card.locator('[data-detail="reset-credits"]')).toBeVisible();
      await expect(card.locator('[data-profile-key="peak_daily_tokens"]')).toHaveCount(0);
    } else {
      await expect(card.locator('[data-profile-key="peak_daily_tokens"]')).toBeVisible();
      await expect(card.locator('[data-spend-key="used_percent"]')).toBeVisible();
    }
    expect(errors).toEqual([]);
  });
}
