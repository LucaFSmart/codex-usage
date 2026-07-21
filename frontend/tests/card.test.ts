import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../src/codex-usage-card";
import { CodexUsageCard, CodexUsageCardEditor } from "../src/codex-usage-card";
import { makeFakeHass, SNAPSHOT } from "./fixtures";

async function mount<T extends HTMLElement>(tag: string): Promise<T> {
  const element = document.createElement(tag) as T & { updateComplete: Promise<boolean> };
  document.body.append(element);
  await element.updateComplete;
  return element;
}

// Only Date is faked (not setTimeout/setInterval) so the setTimeout-based
// snapshot-load waits below keep working; this pins "now" to the fixtures'
// timestamps the same way view-model.test.ts does.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-07-15T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

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

  it("shows only the formatted plan beneath the title for one account", async () => {
    const snapshot = {
      ...SNAPSHOT,
      accounts: [
        {
          ...SNAPSHOT.accounts[0]!,
          name: "Private friendly account",
          plan: "self_serve_business_usage_based",
        },
      ],
    };
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({ type: "custom:codex-usage-card" });
    card.hass = makeFakeHass(snapshot);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    const subtitle = card.shadowRoot?.querySelector("header p")?.textContent?.trim();
    expect(subtitle).toBe("Usage-based Business");
    expect(subtitle).not.toContain("Private friendly account");
  });

  it("does not render an empty-state error when only the limits section is hidden", async () => {
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({
      type: "custom:codex-usage-card",
      sections: { limits: { visible: false, values: {} } },
    });
    card.hass = makeFakeHass({ ...SNAPSHOT, accounts: [SNAPSHOT.accounts[0]!] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    expect(card.shadowRoot?.querySelector(".empty")).toBeNull();
    expect(card.shadowRoot?.querySelector("footer")).not.toBeNull();
  });

  it("marks an existing snapshot stale immediately after a refresh error", async () => {
    const hass = makeFakeHass({ ...SNAPSHOT, accounts: [SNAPSHOT.accounts[0]!] });
    let update: (() => void) | undefined;
    let calls = 0;
    hass.callWS = async <T>(message: Record<string, unknown>): Promise<T> => {
      expect(message.type).toBe("codex_usage/card_data");
      calls += 1;
      if (calls === 1)
        return structuredClone({ ...SNAPSHOT, accounts: [SNAPSHOT.accounts[0]!] }) as T;
      throw new Error("offline");
    };
    hass.connection.subscribeEvents = vi.fn(async (callback) => {
      update = callback as () => void;
      return () => undefined;
    });
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({ type: "custom:codex-usage-card" });
    card.hass = hass;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    update?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    expect(card.shadowRoot?.querySelector("ha-card")?.classList.contains("stale")).toBe(true);
    expect(card.shadowRoot?.textContent).toContain("Out of date");
  });

  it("renders richer adaptive details and all profile values only in detailed mode", async () => {
    const account = {
      ...SNAPSHOT.accounts[0]!,
      blocker: "credits" as const,
      credits: {
        balance: "12.50",
        has_credits: true,
        unlimited: false,
        overage_reached: true,
      },
      reset_credits: { available_count: 2, total_earned: 4, next_expiry: "2026-08-01T10:00:00Z" },
      spend: {
        source: "workspace",
        limit: "100",
        used: "25",
        remaining: "75",
        used_percent: 25,
        remaining_percent: 75,
        resets_at: "2026-08-01T10:00:00Z",
        reached: false,
      },
      profile: {
        lifetime_tokens: 3_224_184_720,
        total_threads: 351,
        peak_daily_tokens: 50_000,
        current_streak_days: 3,
        longest_streak_days: 8,
        longest_running_turn_sec: 240,
        fast_mode_usage_percentage: 12.5,
        total_skills_used: 10,
        unique_skills_used: 4,
        most_used_reasoning_effort: "unknown",
        most_used_reasoning_effort_percentage: 80,
      },
    };
    const snapshot = { ...SNAPSHOT, accounts: [account] };
    const adaptive = await mount<CodexUsageCard>("codex-usage-card");
    adaptive.setConfig({ type: "custom:codex-usage-card", display_mode: "adaptive" });
    adaptive.hass = makeFakeHass(snapshot);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await adaptive.updateComplete;

    expect(adaptive.shadowRoot?.querySelector('[data-detail="reset-credits"]')).not.toBeNull();
    expect(adaptive.shadowRoot?.querySelector('[data-profile-key="peak_daily_tokens"]')).toBeNull();
    expect(adaptive.shadowRoot?.textContent).toContain("Credit limit reached");

    const detailed = await mount<CodexUsageCard>("codex-usage-card");
    detailed.setConfig({
      type: "custom:codex-usage-card",
      display_mode: "detailed",
      sections: { profile: { visible: true, values: { total_threads: false } } },
    });
    detailed.hass = makeFakeHass(snapshot);
    await new Promise((resolve) => setTimeout(resolve, 0));
    await detailed.updateComplete;

    expect(
      detailed.shadowRoot?.querySelector('[data-profile-key="peak_daily_tokens"]'),
    ).not.toBeNull();
    expect(
      detailed.shadowRoot?.querySelector(
        '[data-profile-key="most_used_reasoning_effort_percentage"]',
      ),
    ).not.toBeNull();
    expect(detailed.shadowRoot?.querySelector('[data-profile-key="total_threads"]')).toBeNull();
    expect(detailed.shadowRoot?.querySelector('[data-spend-key="used_percent"]')).not.toBeNull();
    expect(detailed.shadowRoot?.textContent).toContain("Unknown");
    expect(detailed.shadowRoot?.textContent).not.toContain("Unknown plan");
  });

  it("labels a multi-account aggregate status unambiguously", async () => {
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({ type: "custom:codex-usage-card", stale_after_minutes: 1440 });
    card.hass = makeFakeHass();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    expect(card.shadowRoot?.querySelector(".status")?.textContent).toContain("Overall");
    expect(card.shadowRoot?.querySelector(".status")?.textContent).toContain("Critical");
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

  it("provides translated HA-form labels and localized select choices", async () => {
    const editor = await mount<CodexUsageCardEditor>("codex-usage-card-editor");
    editor.setConfig({ type: "custom:codex-usage-card" });
    editor.hass = { ...makeFakeHass(), language: "de", locale: { language: "de-DE" } };
    await editor.updateComplete;

    const form = editor.shadowRoot?.querySelector("ha-form") as HTMLElement & {
      computeLabel?: (schema: { name: string }) => string;
      schema?: Array<Record<string, unknown>>;
    };
    expect(form.computeLabel?.({ name: "title" })).toBe("Titel");
    const display = form.schema?.find((item) => item.name === "display_mode") as {
      selector?: { select?: { options?: Array<{ value: string; label: string }> } };
    };
    expect(display.selector?.select?.options).toContainEqual({
      value: "compact",
      label: "Kompakt",
    });
  });

  it("exposes account inclusion, freshness, colors, and per-value controls", async () => {
    const editor = await mount<CodexUsageCardEditor>("codex-usage-card-editor");
    editor.setConfig({ type: "custom:codex-usage-card", display_mode: "detailed" });
    editor.hass = makeFakeHass();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await editor.updateComplete;

    const forms = [...(editor.shadowRoot?.querySelectorAll("ha-form") ?? [])] as Array<
      HTMLElement & { schema?: Array<{ name: string }> }
    >;
    const names = forms.flatMap((form) => form.schema?.map((item) => item.name) ?? []);
    expect(names).toContain("included_entry_ids");
    expect(names).toContain("stale_after_minutes");
    expect(names).toContain("normal");
    expect(editor.shadowRoot?.querySelector('[data-value-key="peak_daily_tokens"]')).not.toBeNull();
    expect(editor.shadowRoot?.querySelector('[data-value-key="balance"]')).not.toBeNull();
    expect(editor.shadowRoot?.querySelector('[data-value-key="remaining"]')).not.toBeNull();
    expect(
      editor.shadowRoot?.querySelector(
        'a[href="https://github.com/LucaFSmart/codex-usage#dashboard-card"]',
      ),
    ).not.toBeNull();
  });
});
