import { expect, test } from "@playwright/test";

for (const width of [320, 480, 768, 1200]) {
  for (const theme of ["light", "dark"]) {
    test(`${theme} layout at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/visual/?theme=${theme}&state=normal&accounts=2`);
      await expect(page.locator("codex-usage-card")).toBeVisible();
      const card = page.locator("codex-usage-card");
      expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
        true,
      );
      expect((await page.screenshot()).byteLength).toBeGreaterThan(10_000);
    });
  }
}

for (const state of ["normal", "elevated", "critical", "blocked", "stale", "weekly-only"]) {
  test(`semantic state ${state}`, async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 800 });
    await page.goto(`/visual/?theme=dark&state=${state}&accounts=1`);
    const card = page.locator("codex-usage-card");
    await expect(card).toBeVisible();
    await expect(card.locator("ha-card")).toHaveClass(
      new RegExp(state === "weekly-only" ? "normal" : state),
    );
  });
}
