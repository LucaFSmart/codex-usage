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
    // alpha: used_percent 40, remaining_percent 60 -> remaining is now the primary metric
    expect(
      card.shadowRoot?.querySelector('[data-limit-id="codex:primary:weekly"]')?.textContent,
    ).toContain("60%");
    expect(
      card.shadowRoot?.querySelector('[data-limit-id="codex:primary:weekly"]')?.textContent,
    ).toContain("40% used");
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

    card.shadowRoot?.querySelector<HTMLButtonElement>("button.limit-row")?.click();
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

  it("shows a healthy chip alongside an independent freshness banner when stale", async () => {
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
    // decoupling: the account is still "ok" severity, the chip still says Healthy...
    expect(card.shadowRoot?.querySelector(".status")?.textContent).toContain("Healthy");
    // ...while the freshness banner independently says data may be outdated.
    expect(card.shadowRoot?.textContent).toContain("Data may be outdated");
  });

  it("shows a most-constrained callout naming the tightest limit", async () => {
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({
      type: "custom:codex-usage-card",
      account_mode: "single",
      selected_entry_id: "entry-b",
    });
    card.hass = makeFakeHass();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    // beta has a single five-hour limit at 91% used / 9% remaining -> critical -> low-remaining copy
    const callout = card.shadowRoot?.querySelector(".callout")?.textContent;
    expect(callout).toContain("9%");
  });

  it("names the actual blocker in the callout instead of always blaming a rate limit", async () => {
    const creditsBlocked = {
      ...SNAPSHOT.accounts[0]!,
      blocker: "credits" as const,
    };
    const creditsCard = await mount<CodexUsageCard>("codex-usage-card");
    creditsCard.setConfig({ type: "custom:codex-usage-card" });
    creditsCard.hass = makeFakeHass({ ...SNAPSHOT, accounts: [creditsBlocked] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await creditsCard.updateComplete;
    const creditsCallout = creditsCard.shadowRoot?.querySelector(".callout")?.textContent;
    expect(creditsCallout).toContain("credit limit");
    expect(creditsCallout).not.toContain("Week");

    const unknownBlocked = {
      ...SNAPSHOT.accounts[0]!,
      blocker: "unknown" as const,
    };
    const unknownCard = await mount<CodexUsageCard>("codex-usage-card");
    unknownCard.setConfig({ type: "custom:codex-usage-card" });
    unknownCard.hass = makeFakeHass({ ...SNAPSHOT, accounts: [unknownBlocked] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await unknownCard.updateComplete;
    const unknownCallout = unknownCard.shadowRoot?.querySelector(".callout")?.textContent;
    expect(unknownCallout).toContain("unavailable");
    expect(unknownCallout).not.toContain("Week");
  });

  it("renders the most-constrained callout before the primary limits", async () => {
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({ type: "custom:codex-usage-card" });
    card.hass = makeFakeHass({ ...SNAPSHOT, accounts: [SNAPSHOT.accounts[0]!] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    const main = card.shadowRoot?.querySelector("main.limits");
    const callout = card.shadowRoot?.querySelector(".callout");
    expect(callout).not.toBeNull();
    expect(main).not.toBeNull();
    const position = callout!.compareDocumentPosition(main!);
    // DOCUMENT_POSITION_FOLLOWING (4) means `main` comes after `callout`.
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("collapses details by default and expands only when compact is explicitly false", async () => {
    const account = {
      ...SNAPSHOT.accounts[0]!,
      credits: { balance: "12.50", has_credits: true, unlimited: false, overage_reached: false },
    };
    const compact = await mount<CodexUsageCard>("codex-usage-card");
    compact.setConfig({ type: "custom:codex-usage-card" });
    compact.hass = makeFakeHass({ ...SNAPSHOT, accounts: [account] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await compact.updateComplete;

    expect(compact.shadowRoot?.querySelector('[data-detail="credits"]')).toBeNull();
    expect(compact.shadowRoot?.querySelector(".details-toggle")?.textContent).toContain(
      "Show details",
    );

    const expanded = await mount<CodexUsageCard>("codex-usage-card");
    expanded.setConfig({ type: "custom:codex-usage-card", compact: false });
    expanded.hass = makeFakeHass({ ...SNAPSHOT, accounts: [account] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await expanded.updateComplete;

    expect(expanded.shadowRoot?.querySelector('[data-detail="credits"]')).not.toBeNull();
    expect(expanded.shadowRoot?.querySelector(".details-toggle")?.textContent).toContain(
      "Hide details",
    );

    compact.shadowRoot?.querySelector<HTMLButtonElement>(".details-toggle")?.click();
    await compact.updateComplete;
    expect(compact.shadowRoot?.querySelector('[data-detail="credits"]')).not.toBeNull();
  });

  it("always renders the primary limits regardless of the compact default", async () => {
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({
      type: "custom:codex-usage-card",
      compact: true,
      account_mode: "single",
      selected_entry_id: "entry-a",
    });
    card.hass = makeFakeHass();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    expect(card.shadowRoot?.querySelector('[data-limit-id="codex:primary:weekly"]')).not.toBeNull();
  });

  it("auto-hides the credits section when the account has no credits data", async () => {
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({ type: "custom:codex-usage-card", compact: false });
    card.hass = makeFakeHass({ ...SNAPSHOT, accounts: [SNAPSHOT.accounts[0]!] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    expect(card.shadowRoot?.querySelector('[data-detail="credits"]')).toBeNull();
  });

  it("renders additional limits inside details using the same row treatment as primary limits", async () => {
    const account = {
      ...SNAPSHOT.accounts[0]!,
      limits: [
        ...SNAPSHOT.accounts[0]!.limits,
        {
          id: "code_review",
          name: "Code review",
          source: "additional" as const,
          duration_seconds: 604_800,
          used_percent: 20,
          remaining_percent: 80,
          resets_at: "2026-07-19T19:34:47Z",
          reached: false,
          entity_id: null,
        },
      ],
    };
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({ type: "custom:codex-usage-card", compact: false });
    card.hass = makeFakeHass({ ...SNAPSHOT, accounts: [account] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    const row = card.shadowRoot?.querySelector('[data-limit-id="code_review"]');
    expect(row).not.toBeNull();
    expect(row?.classList.contains("limit-row")).toBe(true);
  });

  it("formats spend amounts as USD, consistent with the credits copy", async () => {
    const account = {
      ...SNAPSHOT.accounts[0]!,
      spend: {
        source: "workspace",
        limit: "100",
        used: "18.2",
        remaining: "81.8",
        used_percent: 18,
        remaining_percent: 82,
        resets_at: null,
        reached: false,
      },
    };
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({ type: "custom:codex-usage-card", compact: false });
    card.hass = makeFakeHass({ ...SNAPSHOT, accounts: [account] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    const spendingRow = card.shadowRoot?.querySelector('[data-detail="spending"]')?.textContent;
    expect(spendingRow).toContain("$81.8");
    const usedRow = card.shadowRoot?.querySelector('[data-spend-key="used"]')?.textContent;
    expect(usedRow).toContain("$18.2");
    const limitRow = card.shadowRoot?.querySelector('[data-spend-key="limit"]')?.textContent;
    expect(limitRow).toContain("$100");
  });

  it("does not render individually-boxed sub-cards for credits, spend, or account details", async () => {
    const account = {
      ...SNAPSHOT.accounts[0]!,
      credits: { balance: "12.50", has_credits: true, unlimited: false, overage_reached: false },
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
    };
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({ type: "custom:codex-usage-card", compact: false });
    card.hass = makeFakeHass({ ...SNAPSHOT, accounts: [account] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    for (const selector of [
      '[data-detail="credits"]',
      '[data-detail="spending"]',
      ".account-details",
    ]) {
      const el = card.shadowRoot?.querySelector(selector);
      expect(el, `${selector} should exist`).not.toBeNull();
      expect(el?.classList.contains("panel")).toBe(false);
    }
  });

  it("labels every detail group with a subtle section heading, matching additional limits", async () => {
    const account = {
      ...SNAPSHOT.accounts[0]!,
      credits: { balance: "12.50", has_credits: true, unlimited: false, overage_reached: false },
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
        lifetime_tokens: 1000,
        peak_daily_tokens: null,
        current_streak_days: null,
        longest_streak_days: null,
        total_threads: null,
        longest_running_turn_sec: null,
        fast_mode_usage_percentage: null,
        total_skills_used: null,
        unique_skills_used: null,
        most_used_reasoning_effort: null,
        most_used_reasoning_effort_percentage: null,
      },
    };
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({ type: "custom:codex-usage-card", compact: false });
    card.hass = makeFakeHass({ ...SNAPSHOT, accounts: [account] });
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    const labels = [...(card.shadowRoot?.querySelectorAll(".section-label") ?? [])].map(
      (el) => el.textContent,
    );
    expect(labels).toEqual(["Credits", "Spending", "Profile", "Account"]);
  });

  it("labels a multi-account aggregate status unambiguously", async () => {
    const card = await mount<CodexUsageCard>("codex-usage-card");
    card.setConfig({ type: "custom:codex-usage-card", stale_after_minutes: 1440 });
    card.hass = makeFakeHass();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await card.updateComplete;

    expect(card.shadowRoot?.querySelector(".status")?.textContent).toContain("Overall");
    expect(card.shadowRoot?.querySelector(".status")?.textContent).toContain(
      "Critically low usage remaining",
    );
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
        detail: { value: { title: "After", compact: true } },
        bubbles: true,
        composed: true,
      }),
    );

    expect(original.title).toBe("Before");
    expect((listener.mock.calls[0]?.[0] as CustomEvent).detail.config.title).toBe("After");
  });

  it("provides translated HA-form labels and a compact toggle", async () => {
    const editor = await mount<CodexUsageCardEditor>("codex-usage-card-editor");
    editor.setConfig({ type: "custom:codex-usage-card" });
    editor.hass = { ...makeFakeHass(), language: "de", locale: { language: "de-DE" } };
    await editor.updateComplete;

    const form = editor.shadowRoot?.querySelector("ha-form") as HTMLElement & {
      computeLabel?: (schema: { name: string }) => string;
      schema?: Array<Record<string, unknown>>;
    };
    expect(form.computeLabel?.({ name: "title" })).toBe("Titel");
    const compact = form.schema?.find((item) => item.name === "compact") as
      { selector?: { boolean?: Record<string, unknown> } } | undefined;
    expect(compact?.selector?.boolean).toBeDefined();
  });

  it("exposes account inclusion, freshness, colors, and per-value controls", async () => {
    const editor = await mount<CodexUsageCardEditor>("codex-usage-card-editor");
    editor.setConfig({ type: "custom:codex-usage-card" });
    editor.hass = makeFakeHass();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await editor.updateComplete;

    const forms = [...(editor.shadowRoot?.querySelectorAll("ha-form") ?? [])] as Array<
      HTMLElement & { schema?: Array<{ name: string }> }
    >;
    const names = forms.flatMap((form) => form.schema?.map((item) => item.name) ?? []);
    expect(names).toContain("included_entry_ids");
    expect(names).toContain("stale_after_minutes");
    expect(names).toContain("ok");
    expect(names).not.toContain("stale");
    expect(names).toContain("warning");
    expect(editor.shadowRoot?.querySelector('[data-value-key="peak_daily_tokens"]')).not.toBeNull();
    expect(editor.shadowRoot?.querySelector('[data-value-key="balance"]')).not.toBeNull();
    expect(editor.shadowRoot?.querySelector('[data-value-key="remaining"]')).not.toBeNull();
    expect(
      editor.shadowRoot?.querySelector(
        'a[href="https://github.com/LucaFSmart/codex-usage#dashboard-card"]',
      ),
    ).not.toBeNull();
  });

  it("lists the new additional_limits and account sections", async () => {
    const editor = await mount<CodexUsageCardEditor>("codex-usage-card-editor");
    editor.setConfig({ type: "custom:codex-usage-card" });
    editor.hass = makeFakeHass();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await editor.updateComplete;

    expect(editor.shadowRoot?.textContent).toContain("Additional limits");
    expect(editor.shadowRoot?.textContent).toContain("Account");
  });
});
