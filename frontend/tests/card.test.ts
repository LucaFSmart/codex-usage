import { afterEach, describe, expect, it, vi } from "vitest";

import "../src/codex-usage-card";
import { CodexUsageCard, CodexUsageCardEditor } from "../src/codex-usage-card";
import { makeFakeHass } from "./fixtures";

async function mount<T extends HTMLElement>(tag: string): Promise<T> {
  const element = document.createElement(tag) as T & { updateComplete: Promise<boolean> };
  document.body.append(element);
  await element.updateComplete;
  return element;
}

afterEach(() => document.body.replaceChildren());

describe("CodexUsageCard", () => {
  it("exposes Home Assistant card APIs and section grid defaults", async () => {
    expect(CodexUsageCard.getStubConfig()).toEqual({});
    expect(new CodexUsageCard().getGridOptions()).toEqual({
      columns: 6,
      min_columns: 3,
      max_columns: 12,
    });
    await expect(CodexUsageCard.getConfigElement()).resolves.toBeInstanceOf(CodexUsageCardEditor);
  });

  it("loads snapshots, renders account chips, and switches only in memory", async () => {
    const hass = makeFakeHass();
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({ type: "custom:codex-usage-card" });
    card.hass = hass;
    await card.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    expect(card.shadowRoot?.querySelectorAll("button.account-chip")).toHaveLength(2);
    expect(card.shadowRoot?.textContent).toContain("Beta");
    card.shadowRoot?.querySelector<HTMLButtonElement>('button[data-entry-id="entry-a"]')?.click();
    await card.updateComplete;
    expect(card.shadowRoot?.textContent).toContain("60% remaining");
  });

  it("opens more-info only for limits with a safe active entity", async () => {
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({
      type: "custom:codex-usage-card",
      account_mode: "single",
      selected_entry_id: "entry-a",
    });
    card.hass = makeFakeHass();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;
    const listener = vi.fn();
    card.addEventListener("hass-more-info", listener);

    card.shadowRoot?.querySelector<HTMLButtonElement>("button.limit-panel")?.click();
    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      entityId: "sensor.alpha_weekly_usage",
    });
  });

  it("refreshes on the integration event without refetching on every hass update", async () => {
    const hass = makeFakeHass();
    let update: (() => void) | undefined;
    hass.connection.subscribeEvents = vi.fn(async (callback, eventType) => {
      expect(eventType).toBe("codex_usage_card_data_updated");
      update = callback as () => void;
      return () => undefined;
    });
    const callWS = vi.spyOn(hass, "callWS");
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({ type: "custom:codex-usage-card" });
    card.hass = hass;
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(callWS).toHaveBeenCalledOnce();

    card.hass = { ...hass };
    await card.updateComplete;
    expect(callWS).toHaveBeenCalledOnce();

    update?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(callWS).toHaveBeenCalledTimes(2);
  });
});

describe("CodexUsageCardEditor", () => {
  it("emits an immutable config-changed event", async () => {
    const editor = await mount<CodexUsageCardEditor>("codex-usage-card-editor");
    const original = { type: "custom:codex-usage-card", title: "Before" };
    editor.setConfig(original);
    const listener = vi.fn();
    editor.addEventListener("config-changed", listener);

    editor.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: { title: "After", display_mode: "compact" } },
        bubbles: true,
        composed: true,
      }),
    );

    expect(original.title).toBe("Before");
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail.config.title).toBe("After");
  });
});
