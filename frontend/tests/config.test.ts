import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_COLORS, DEFAULT_CONFIG, DEFAULT_THRESHOLDS, normalizeConfig } from "../src/config";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("normalizeConfig", () => {
  it("fills all defaults for a minimal Lovelace config", () => {
    expect(normalizeConfig({ type: "custom:codex-usage-card" })).toEqual(DEFAULT_CONFIG);
    expect(normalizeConfig({ type: "custom:codex-usage-card" })).toEqual(
      expect.objectContaining({ account_mode: "auto", compact: false }),
    );
  });

  it("merges nested section and appearance defaults", () => {
    const normalized = normalizeConfig({
      type: "custom:codex-usage-card",
      sections: { profile: { visible: false, values: { sessions: false } } },
      appearance: { card_radius: 30 },
    });

    expect(normalized.sections.profile).toEqual({
      ...DEFAULT_CONFIG.sections.profile,
      visible: false,
      values: {
        ...DEFAULT_CONFIG.sections.profile.values,
        sessions: false,
      },
    });
    expect(normalized.sections.limits).toEqual(DEFAULT_CONFIG.sections.limits);
    expect(normalized.appearance).toEqual({
      ...DEFAULT_CONFIG.appearance,
      card_radius: 30,
    });
  });

  it("accepts supported modes and rejects unsupported scalar values", () => {
    expect(
      normalizeConfig({
        type: "custom:codex-usage-card",
        account_mode: "single",
        selected_entry_id: "entry-a",
        allow_account_switching: false,
        compact: true,
        title: "Team usage",
      }),
    ).toEqual(
      expect.objectContaining({
        account_mode: "single",
        selected_entry_id: "entry-a",
        allow_account_switching: false,
        compact: true,
        title: "Team usage",
      }),
    );

    expect(
      normalizeConfig({
        type: "custom:codex-usage-card",
        account_mode: "sometimes",
        selected_entry_id: 42,
        allow_account_switching: "yes",
        compact: "huge",
        title: false,
      }),
    ).toEqual(DEFAULT_CONFIG);
  });

  it("deduplicates valid included entry IDs", () => {
    expect(
      normalizeConfig({
        type: "custom:codex-usage-card",
        included_entry_ids: ["entry-a", "entry-a", 42, "", "entry-b"],
      }).included_entry_ids,
    ).toEqual(["entry-a", "entry-b"]);
  });

  it.each([
    [4, DEFAULT_CONFIG.stale_after_minutes],
    [5, 5],
    [1440, 1440],
    [1441, DEFAULT_CONFIG.stale_after_minutes],
    [Number.NaN, DEFAULT_CONFIG.stale_after_minutes],
  ])("normalizes stale_after_minutes %s to %s", (input, expected) => {
    expect(
      normalizeConfig({ type: "custom:codex-usage-card", stale_after_minutes: input })
        .stale_after_minutes,
    ).toBe(expected);
  });

  it("falls back as a unit when thresholds are invalid or unordered", () => {
    expect(
      normalizeConfig({
        type: "custom:codex-usage-card",
        thresholds: { warning: 75, critical: 75 },
      }).thresholds,
    ).toEqual(DEFAULT_THRESHOLDS);

    expect(
      normalizeConfig({
        type: "custom:codex-usage-card",
        thresholds: { warning: 10, critical: Number.POSITIVE_INFINITY },
      }).thresholds,
    ).toEqual(DEFAULT_THRESHOLDS);
  });

  it("keeps valid ordered threshold boundaries", () => {
    expect(
      normalizeConfig({
        type: "custom:codex-usage-card",
        thresholds: { warning: 0, critical: 99 },
      }).thresholds,
    ).toEqual({ warning: 0, critical: 99 });
  });

  it("validates every configured color and falls back individually", () => {
    vi.stubGlobal("CSS", {
      supports: vi.fn((_property: string, value: string) => value === "rebeccapurple"),
    });

    const normalized = normalizeConfig({
      type: "custom:codex-usage-card",
      colors: { ok: "rebeccapurple", blocked: "not a color" },
    });

    expect(normalized.colors.ok).toBe("rebeccapurple");
    expect(normalized.colors.blocked).toBe(DEFAULT_COLORS.blocked);
    expect(normalized.colors.unknown).toBe(DEFAULT_COLORS.unknown);
  });

  it.each([
    ["auto", "auto"],
    [true, true],
    [false, false],
  ] as const)("accepts %s as a section visibility value", (input, expected) => {
    expect(
      normalizeConfig({
        type: "custom:codex-usage-card",
        sections: { credits: { visible: input, values: {} } },
      }).sections.credits.visible,
    ).toBe(expected);
  });

  it("defaults credits, spending, and profile sections to auto-visibility", () => {
    expect(DEFAULT_CONFIG.sections.credits.visible).toBe("auto");
    expect(DEFAULT_CONFIG.sections.spending.visible).toBe("auto");
    expect(DEFAULT_CONFIG.sections.profile.visible).toBe("auto");
    expect(DEFAULT_CONFIG.sections.additional_limits.visible).toBe("auto");
  });

  it("does not mutate or retain nested references from the input", () => {
    const input = {
      type: "custom:codex-usage-card",
      included_entry_ids: ["entry-a", "entry-a"],
      sections: { profile: { visible: false, values: { sessions: false } } },
      appearance: { card_radius: 30 },
    };
    const before = structuredClone(input);

    const normalized = normalizeConfig(input);
    normalized.included_entry_ids.push("entry-b");
    normalized.sections.profile.values.sessions = true;
    normalized.appearance.card_radius = 1;

    expect(input).toEqual(before);
  });

  it("falls back safely when input cloning or CSS validation throws", () => {
    expect(
      normalizeConfig({ type: "custom:codex-usage-card", unsupported: () => undefined }),
    ).toEqual(DEFAULT_CONFIG);

    vi.stubGlobal("CSS", {
      supports: vi.fn(() => {
        throw new Error("unsupported");
      }),
    });
    expect(
      normalizeConfig({ type: "custom:codex-usage-card", colors: { ok: "broken" } }).colors.ok,
    ).toBe(DEFAULT_COLORS.ok);
  });
});
