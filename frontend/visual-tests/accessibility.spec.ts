import { expect, test } from "@playwright/test";

function contrastRatio(
  color: string,
  surface: string,
  opacity: number,
  background: string,
): number {
  const parse = (value: string) => {
    const components = value === "transparent" ? [0, 0, 0, 0] : value.match(/[\d.]+/g)!.map(Number);
    return {
      rgb: components
        .slice(0, 3)
        .map((channel) => (value.startsWith("color(srgb") ? channel * 255 : channel)),
      alpha: components[3] ?? 1,
    };
  };
  const base = parse(surface).rgb;
  const tint = parse(background);
  const backdrop = tint.rgb.map(
    (channel, index) => channel * tint.alpha + base[index]! * (1 - tint.alpha),
  );
  const foreground = parse(color).rgb.map(
    (value, index) => value * opacity + backdrop[index]! * (1 - opacity),
  );
  const luminance = (rgb: number[]) =>
    rgb
      .map((value) => {
        const channel = value / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index]!, 0);
  const a = luminance(foreground);
  const b = luminance(backdrop);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

for (const theme of ["light", "dark"]) {
  for (const state of ["normal", "warning", "critical", "blocked"]) {
    test(`${theme} ${state} text has readable contrast`, async ({ page }) => {
      await page.goto(`/visual/?theme=${theme}&state=${state}`);
      const card = page.locator("codex-usage-card");
      await expect(card.locator(".ring").first()).toBeVisible();
      const background = await card
        .locator("ha-card")
        .evaluate((element) => getComputedStyle(element).backgroundColor);
      for (const selector of [
        ".status",
        ".callout",
        ".limit-remaining-label",
        ".section-label",
        "footer",
      ]) {
        const element = card.locator(selector).first();
        const style = await element.evaluate((node) => {
          const value = getComputedStyle(node);
          return {
            color: value.color,
            opacity: Number(value.opacity),
            background: value.backgroundColor,
          };
        });
        expect(
          contrastRatio(style.color, background, style.opacity, style.background),
          selector,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
}

test("keyboard account and disclosure controls expose selection and expansion", async ({
  page,
}) => {
  await page.goto("/visual/?accounts=2&mode=compact&lang=de");
  const card = page.locator("codex-usage-card");
  const studio = card.getByRole("button", { name: "Studio", exact: true });
  await studio.press("Enter");
  await expect(studio).toHaveAttribute("aria-pressed", "true");
  await expect(card.locator("header p")).toContainText("Studio");
  const toggle = card.getByRole("button", { name: "Details anzeigen", exact: true });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.press("Space");
  await expect(
    card.getByRole("button", { name: "Details ausblenden", exact: true }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(card.locator("#codex-details")).toBeVisible();
});

for (const theme of ["light", "dark"]) {
  test(`the public outage notice is legible and keyboard-accessible in ${theme}`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width: 1200, height: 900 });
    await page.goto(
      `/visual/?theme=${theme}&width=240&lang=de&state=blocked&accounts=2&mixed=1&provider=outage`,
    );
    await expect(page).toHaveTitle("Codex Usage Card visual test");
    const card = page.locator("codex-usage-card");
    const notice = card.locator(".provider-notice");
    const statusLink = notice.getByRole("link", { name: "OpenAI-Statusseite" });
    const studio = card.getByRole("button", { name: "Studio", exact: true });

    await expect(notice).toBeInViewport();
    await expect(notice).toContainText("Ausfall");
    await expect(notice).toContainText("Codex in ChatGPT Desktop");
    await expect(statusLink).toHaveAttribute("href", "https://status.openai.com/");
    await expect(statusLink).toHaveAttribute("target", "_blank");
    await expect(statusLink).toHaveAttribute("rel", /\bnoopener\b/);
    expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    const cardBounds = (await card.boundingBox())!;
    const linkBounds = (await statusLink.boundingBox())!;
    expect(cardBounds.width).toBe(240);
    expect(linkBounds.x + linkBounds.width).toBeLessThanOrEqual(cardBounds.x + cardBounds.width);

    const [foreground, tint, surface] = await statusLink.evaluate((node) => [
      getComputedStyle(node).color,
      getComputedStyle(node.closest(".provider-notice")!).backgroundColor,
      getComputedStyle(node.closest("ha-card")!).backgroundColor,
    ]);
    expect(contrastRatio(foreground!, surface!, 1, tint!)).toBeGreaterThanOrEqual(4.5);

    await expect(card.locator(".status")).toHaveText("Limit erreicht");
    await page.keyboard.press("Tab");
    await expect(statusLink).toBeFocused();
    expect(await statusLink.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("solid");
    await studio.press("Enter");
    await expect(studio).toHaveAttribute("aria-pressed", "true");
    await expect(card.locator(".status")).toHaveText("Gesund");
    await expect(notice).toHaveCount(1);
    await expect(notice).toContainText("Ausfall");
    expect(errors).toEqual([]);
  });
}

for (const width of [240, 320, 480]) {
  test(`a ${width}px card adapts inside a desktop dashboard`, async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 1000 });
    await page.goto(`/visual/?width=${width}&lang=de&accounts=2&long=1&state=critical`);
    const card = page.locator("codex-usage-card");
    await expect(card.locator(".ring").first()).toBeVisible();
    const bounds = await card.boundingBox();
    expect(bounds!.width).toBeLessThanOrEqual(width);
    const head = card.locator(".limit-head").first();
    const resetBounds = await head.locator(".limit-relative").boundingBox();
    expect(resetBounds!.x + resetBounds!.width).toBeLessThanOrEqual(bounds!.x + bounds!.width);
    expect(await card.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    if (width <= 320) {
      expect(await head.evaluate((element) => getComputedStyle(element).flexDirection)).toBe(
        "column",
      );
    }
  });
}
