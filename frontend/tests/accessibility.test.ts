import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../src/codex-usage-card";
import "../src/codex-usage-card-editor";
import type { CodexUsageCard } from "../src/codex-usage-card";
import type { CodexUsageCardEditor } from "../src/codex-usage-card-editor";
import { makeFakeHass, SNAPSHOT } from "./fixtures";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-07-15T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

async function mountCard(snapshot = SNAPSHOT): Promise<CodexUsageCard> {
  const card = document.createElement("codex-usage-card") as CodexUsageCard;
  card.setConfig({ type: "custom:codex-usage-card", compact: true });
  card.hass = makeFakeHass(snapshot);
  document.body.append(card);
  await vi.waitFor(() => expect(card.shadowRoot?.querySelector(".account-chip")).not.toBeNull());
  await card.updateComplete;
  return card;
}

describe("accessible card interactions", () => {
  it("names the spending meter separately from remaining-quota meters", async () => {
    const card = await mountCard({
      ...SNAPSHOT,
      accounts: SNAPSHOT.accounts.map((account) => ({
        ...account,
        spend: {
          source: "workspace",
          limit: "100",
          used: "25",
          remaining: "75",
          used_percent: 25,
          remaining_percent: 75,
          resets_at: null,
          reached: false,
        },
      })),
    });
    card.shadowRoot!.querySelector<HTMLButtonElement>(".details-toggle")!.click();
    await card.updateComplete;
    expect(card.shadowRoot!.querySelector(".bar--mini")?.getAttribute("aria-label")).toBe(
      "Spending: Usage",
    );
  });
  it("announces the selected account and updates selection after activation", async () => {
    const card = await mountCard();
    const alpha = card.shadowRoot!.querySelector<HTMLButtonElement>('[data-entry-id="entry-a"]')!;
    const beta = card.shadowRoot!.querySelector<HTMLButtonElement>('[data-entry-id="entry-b"]')!;
    expect(beta.getAttribute("aria-pressed")).toBe("true");
    expect(alpha.getAttribute("aria-pressed")).toBe("false");
    alpha.click();
    await card.updateComplete;
    expect(alpha.getAttribute("aria-pressed")).toBe("true");
    expect(beta.getAttribute("aria-pressed")).toBe("false");
  });

  it("names remaining-quota meters and keeps unknown values indeterminate", async () => {
    const card = await mountCard();
    const meters = [...card.shadowRoot!.querySelectorAll('[role="progressbar"]')];
    expect(meters).toHaveLength(2);
    expect(meters[0]!.getAttribute("aria-label")).toBe("5 hours: remaining");
    expect(meters[0]!.getAttribute("aria-valuetext")).toBe("9% remaining");
    expect(meters[1]!.getAttribute("aria-label")).toBe("Week: remaining");
    expect(meters[1]!.hasAttribute("aria-valuenow")).toBe(false);
  });

  it("exposes detail disclosure state and an existing controlled region", async () => {
    const card = await mountCard();
    const toggle = card.shadowRoot!.querySelector<HTMLButtonElement>(".details-toggle")!;
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    const regionId = toggle.getAttribute("aria-controls")!;
    expect(card.shadowRoot!.getElementById(regionId)?.hasAttribute("hidden")).toBe(true);
    toggle.click();
    await card.updateComplete;
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(card.shadowRoot!.getElementById(regionId)?.hasAttribute("hidden")).toBe(false);
  });
});

describe("unambiguous editor controls", () => {
  it("preserves fractional thresholds and keeps their sliders within valid bounds", async () => {
    const editor = document.createElement("codex-usage-card-editor") as CodexUsageCardEditor;
    editor.setConfig({
      type: "custom:codex-usage-card",
      thresholds: { warning: 0.25, critical: 0.5 },
    });
    editor.hass = makeFakeHass();
    document.body.append(editor);
    await editor.updateComplete;
    const form = [...editor.shadowRoot!.querySelectorAll("ha-form")][1]! as HTMLElement & {
      schema: Array<{ selector: { number: { min: number; max: number } } }>;
    };
    expect(form.schema[0]!.selector.number).toMatchObject({ min: 0, max: 0.5 });
    expect(form.schema[1]!.selector.number).toMatchObject({ min: 0.25, max: 100 });
    const changed = vi.fn();
    editor.addEventListener("config-changed", changed);
    form.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: { warning: 0.5, critical: 0.5 } } }),
    );
    expect((changed.mock.calls[0]![0] as CustomEvent).detail.config.thresholds).toEqual({
      warning: 0.25,
      critical: 0.5,
    });
    form.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: { warning: 0.1, critical: 0.4 } } }),
    );
    expect((changed.mock.calls[1]![0] as CustomEvent).detail.config.thresholds).toEqual({
      warning: 0.1,
      critical: 0.4,
    });
  });
  it("keeps customized thresholds when a slider reaches the other threshold", async () => {
    const editor = document.createElement("codex-usage-card-editor") as CodexUsageCardEditor;
    editor.setConfig({
      type: "custom:codex-usage-card",
      thresholds: { warning: 65, critical: 92 },
    });
    editor.hass = makeFakeHass();
    document.body.append(editor);
    await editor.updateComplete;
    const changed = vi.fn();
    editor.addEventListener("config-changed", changed);
    const form = [...editor.shadowRoot!.querySelectorAll("ha-form")][1]!;
    form.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: { warning: 95, critical: 92 } } }),
    );
    expect((changed.mock.calls[0]![0] as CustomEvent).detail.config.thresholds).toEqual({
      warning: 65,
      critical: 92,
    });
    form.dispatchEvent(
      new CustomEvent("value-changed", { detail: { value: { warning: 65, critical: 60 } } }),
    );
    expect((changed.mock.calls[1]![0] as CustomEvent).detail.config.thresholds).toEqual({
      warning: 65,
      critical: 92,
    });
  });
  it("labels windows by duration, groups shared account controls and exposes budget toggles", async () => {
    const editor = document.createElement("codex-usage-card-editor") as CodexUsageCardEditor;
    const sharedWeekly = SNAPSHOT.accounts[0]!.limits[0]!;
    editor.setConfig({ type: "custom:codex-usage-card" });
    editor.hass = makeFakeHass({
      ...SNAPSHOT,
      accounts: [
        SNAPSHOT.accounts[0]!,
        {
          ...SNAPSHOT.accounts[1]!,
          limits: [...SNAPSHOT.accounts[1]!.limits, { ...sharedWeekly }],
        },
      ],
    });
    document.body.append(editor);
    await vi.waitFor(() => expect(editor.shadowRoot?.textContent).toContain("Alpha"));
    await editor.updateComplete;
    const limitSection = editor
      .shadowRoot!.querySelector('[data-section-key="limits"]')!
      .closest(".section-row")!;
    expect(limitSection.textContent).toContain("Week");
    expect(limitSection.textContent).toContain("5 hours");
    expect(
      limitSection.querySelector('[data-value-key="codex:secondary:weekly"]')?.textContent,
    ).toContain("Alpha, Beta");
    const budgetSection = editor
      .shadowRoot!.querySelector('[data-section-key="budget"]')!
      .closest(".section-row")!;
    expect(budgetSection.querySelectorAll("input[type=checkbox]")).toHaveLength(2);
    const changed = vi.fn();
    editor.addEventListener("config-changed", changed);
    budgetSection.querySelector<HTMLInputElement>("input[type=checkbox]")!.click();
    expect(
      (changed.mock.calls[0]![0] as CustomEvent).detail.config.sections.budget.values[
        sharedWeekly.id
      ],
    ).toBe(false);
  });

  it("gives both color inputs a distinct accessible name", async () => {
    const editor = document.createElement("codex-usage-card-editor") as CodexUsageCardEditor;
    editor.setConfig({ type: "custom:codex-usage-card" });
    editor.hass = makeFakeHass();
    document.body.append(editor);
    await editor.updateComplete;
    const inputs = [...editor.shadowRoot!.querySelectorAll('[data-color-key="ok"] input')];
    const names = inputs.map((input) => input.getAttribute("aria-label"));
    expect(names.every(Boolean)).toBe(true);
    expect(new Set(names).size).toBe(2);
  });
});
