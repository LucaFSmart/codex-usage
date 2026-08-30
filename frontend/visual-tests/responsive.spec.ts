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

for (const state of ["normal", "warning", "critical", "blocked", "stale", "weekly-only"]) {
  test(`semantic state ${state}`, async ({ page }) => {
    const errors = captureErrors(page);
    await page.setViewportSize({ width: 768, height: 800 });
    await page.goto(`/visual/?theme=dark&state=${state}&accounts=1`);
    const card = page.locator("codex-usage-card");
    await expect(card).toBeVisible();
    const expectedClass = state === "weekly-only" || state === "normal" ? "ok" : state;
    await expect(card.locator("ha-card")).toHaveClass(new RegExp(expectedClass));
    expect(errors).toEqual([]);
  });
}

test("account chip interaction updates the selected account", async ({ page }) => {
  const errors = captureErrors(page);
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/visual/?theme=dark&state=normal&accounts=2");
  const card = page.locator("codex-usage-card");

  await card.locator('button[data-entry-id="entry-1"]').click();

  await expect(card.locator("header p")).toContainText("Studio");
  await expect(card.locator('button[data-entry-id="entry-1"]')).toHaveClass(/selected/);
  expect(errors).toEqual([]);
});

for (const mode of ["compact", "expanded"]) {
  test(`${mode} mode exposes the intended density`, async ({ page }) => {
    const errors = captureErrors(page);
    await page.setViewportSize({ width: 768, height: 1000 });
    const modeParam = mode === "compact" ? "&mode=compact" : "";
    await page.goto(`/visual/?theme=light&state=normal&accounts=1${modeParam}`);
    const card = page.locator("codex-usage-card");

    // Primary limits (each with its own ring) always render, regardless of
    // compact/expanded -- compact only affects the Details area.
    await expect(card.locator(".ring").first()).toBeVisible();

    if (mode === "compact") {
      await expect(card.locator(".details")).toHaveCount(0);
      await expect(card.locator(".details-toggle")).toContainText("Show details");
    } else {
      await expect(card.locator('[data-detail="reset-credits"]')).toBeVisible();
      await expect(card.locator('[data-profile-key="peak_daily_tokens"]')).toBeVisible();
      await expect(card.locator('[data-spend-key="used_percent"]')).toBeVisible();
      await expect(card.locator(".details-toggle")).toContainText("Hide details");
    }
    expect(errors).toEqual([]);
  });
}

test("the details area is one continuous surface, not a nested card", async ({ page }) => {
  const errors = captureErrors(page);
  await page.setViewportSize({ width: 768, height: 1000 });
  await page.goto("/visual/?theme=dark&state=normal&accounts=1");
  const card = page.locator("codex-usage-card");

  await expect(card.locator("ha-card")).toHaveCount(1);

  const creditsSurface = await card.locator('[data-detail="credits"]').evaluate((element) => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, boxShadow: style.boxShadow };
  });
  expect(["rgba(0, 0, 0, 0)", "transparent"]).toContain(creditsSurface.background);
  expect(creditsSurface.boxShadow).toBe("none");

  await card.locator(".details-toggle").click();
  await expect(card.locator("ha-card")).toHaveCount(1);
  await expect(card.locator('[data-detail="credits"]')).toHaveCount(0);
  await expect(card.locator(".ring").first()).toBeVisible();
  expect(errors).toEqual([]);
});
