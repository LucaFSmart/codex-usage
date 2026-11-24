import { describe, expect, it, vi } from "vitest";

import { fetchCardSnapshot, normalizeCardSnapshot } from "../src/card-data";
import { makeFakeHass, PROVIDER_STATUS, SNAPSHOT } from "./fixtures";

describe("normalizeCardSnapshot", () => {
  it("accepts the versioned, privacy-safe integration snapshot", () => {
    expect(normalizeCardSnapshot(SNAPSHOT)).toEqual(SNAPSHOT);
  });

  it("keeps legacy schema 1 snapshots without provider status", () => {
    expect(normalizeCardSnapshot(SNAPSHOT)).not.toHaveProperty("provider_status");
  });

  it("accepts the separate public Codex component snapshot", () => {
    expect(normalizeCardSnapshot({ ...SNAPSHOT, provider_status: PROVIDER_STATUS })).toEqual({
      ...SNAPSHOT,
      provider_status: PROVIDER_STATUS,
    });
  });

  it("only accepts allowlisted public component data and the official URL", () => {
    const normalized = normalizeCardSnapshot({
      ...SNAPSHOT,
      provider_status: {
        ...PROVIDER_STATUS,
        state: "outage",
        last_attempt: "not a timestamp",
        url: "javascript:alert(1)",
        title: "Untrusted incident title",
        components: [
          { ...PROVIDER_STATUS.components[0], state: "outage", name: "Untrusted name" },
          { ...PROVIDER_STATUS.components[1], state: "new_status", secret: "private" },
          { id: "other-service", name: "Other Service", state: "outage" },
        ],
      },
    });

    expect(normalized).toEqual({
      ...SNAPSHOT,
      provider_status: {
        ...PROVIDER_STATUS,
        state: "outage",
        last_attempt: null,
        url: "https://status.openai.com/",
        components: [
          { id: "01JVCV8YSWZFRSM1G5CVP253SK", name: "Codex Web", state: "outage" },
          { id: "01KMP3KP5MGE23B80K1EK4S8PV", name: "Codex API", state: "unknown" },
        ],
      },
    });
  });

  it("downgrades incomplete or ambiguous health readings to unknown", () => {
    for (const components of [
      PROVIDER_STATUS.components.slice(0, -1),
      [...PROVIDER_STATUS.components, { ...PROVIDER_STATUS.components[0], state: "outage" }],
      [
        { ...PROVIDER_STATUS.components[0], state: "new_status" },
        ...PROVIDER_STATUS.components.slice(1),
      ],
    ]) {
      const result = normalizeCardSnapshot({
        ...SNAPSHOT,
        provider_status: { ...PROVIDER_STATUS, components },
      });
      expect(result).toHaveProperty("provider_status.state", "unknown");
    }
  });

  it("discards malformed optional status without affecting account usage", () => {
    expect(normalizeCardSnapshot({ ...SNAPSHOT, provider_status: "outage" })).toEqual(SNAPSHOT);
    const malformed = normalizeCardSnapshot({
      ...SNAPSHOT,
      provider_status: { ...PROVIDER_STATUS, state: "new_status", available: "yes", stale: null },
    });
    expect(malformed).toEqual({
      ...SNAPSHOT,
      provider_status: { ...PROVIDER_STATUS, state: "unknown", available: false, stale: true },
    });
  });

  it("drops invalid accounts, values, and unsafe entity IDs", () => {
    const sourceAccount = SNAPSHOT.accounts[0]!;
    const sourceLimit = sourceAccount.limits[0]!;
    const result = normalizeCardSnapshot({
      schema_version: 1,
      integration_version: "0.6.5",
      generated_at: "2026-07-15T10:00:00Z",
      accounts: [
        {
          ...sourceAccount,
          id: "",
        },
        {
          ...sourceAccount,
          limits: [
            { ...sourceLimit, used_percent: 500 },
            { ...sourceLimit, entity_id: "script.not_allowed" },
          ],
        },
      ],
    });

    expect(result.accounts).toHaveLength(1);
    const [account] = result.accounts;
    expect(account).toBeDefined();
    expect(account!.limits).toHaveLength(2);
    expect(account!.limits[0]?.used_percent).toBeNull();
    expect(account!.limits[1]?.entity_id).toBeNull();
  });

  it("preserves a quota_exceeded source error code (openai/codex#44492)", () => {
    const sourceAccount = SNAPSHOT.accounts[0]!;
    const result = normalizeCardSnapshot({
      ...SNAPSHOT,
      accounts: [
        {
          ...sourceAccount,
          sources: {
            usage: {
              state: "error",
              last_attempt: "2026-09-10T10:00:00Z",
              last_success: null,
              retry_at: "2026-09-10T11:00:00Z",
              error_code: "quota_exceeded",
              refresh_mode: "poll",
              expected_interval_seconds: 300,
            },
          },
        },
      ],
    });

    const account = result.accounts[0]! as (typeof result.accounts)[number] &
      Record<string, unknown>;
    expect(account.sources).toEqual({
      usage: expect.objectContaining({ error_code: "quota_exceeded" }),
    });
  });

  it("normalizes optional aggregates without retaining unsupported fields", () => {
    const sourceAccount = SNAPSHOT.accounts[0]!;
    const result = normalizeCardSnapshot({
      ...SNAPSHOT,
      accounts: [
        null,
        { id: "incomplete", name: "Incomplete" },
        {
          ...sourceAccount,
          blocker: "private_backend_reason",
          credits: {
            balance: " 12.50 ",
            has_credits: true,
            unlimited: false,
            overage_reached: "invalid",
          },
          spend: {
            source: "workspace",
            limit: "100",
            used: "20",
            remaining: "80",
            used_percent: 20,
            remaining_percent: 80,
            resets_at: "invalid",
            reached: false,
          },
          reset_credits: {
            available_count: 1.5,
            total_earned: Number.POSITIVE_INFINITY,
            next_expiry: "2026-07-20T10:00:00Z",
          },
          profile: {
            lifetime_tokens: 123,
            most_used_reasoning_effort: "high",
            current_streak_days: null,
            longest_streak_days: -2,
            fast_mode_usage_percentage: 120,
            private_text: "must not pass",
            invalid_number: Number.NaN,
            private_object: { hidden: true },
          },
          limits: [null, { id: "invalid" }, ...sourceAccount.limits],
        },
      ],
    });

    const account = result.accounts[0]!;
    expect(account.blocker).toBe("unknown");
    expect(account.credits).toEqual({
      balance: "12.50",
      has_credits: true,
      unlimited: false,
      overage_reached: null,
    });
    expect(account.spend?.resets_at).toBeNull();
    expect(account.reset_credits?.available_count).toBeNull();
    expect(account.reset_credits?.total_earned).toBeNull();
    expect(account.profile).toEqual({
      lifetime_tokens: 123,
      current_streak_days: null,
      most_used_reasoning_effort: "high",
    });
  });

  it("keeps explicitly reported unavailable limit placeholders", () => {
    const sourceAccount = SNAPSHOT.accounts[0]!;
    const result = normalizeCardSnapshot({
      ...SNAPSHOT,
      accounts: [
        {
          ...sourceAccount,
          limits: [
            {
              id: "future:primary:unknown",
              name: "Future feature",
              source: "additional",
              duration_seconds: null,
              used_percent: null,
              remaining_percent: null,
              resets_at: null,
              reached: false,
              entity_id: null,
            },
          ],
        },
      ],
    });

    expect(result.accounts[0]?.limits).toHaveLength(1);
    expect(result.accounts[0]?.limits[0]?.used_percent).toBeNull();
  });

  it("keeps schema-one additions optional while allowing only safe status, source, reset, and budget values", () => {
    const sourceAccount = SNAPSHOT.accounts[0]!;
    const result = normalizeCardSnapshot({
      ...SNAPSHOT,
      accounts: [
        {
          ...sourceAccount,
          limit_statuses: [
            {
              id: "base_model_inference",
              name: "Luna Reserve",
              source: "additional",
              allowed: true,
              reached: false,
              normal_model_slug: "gpt-5.6-luna",
            },
            { id: "private", name: "Private", source: "unknown", allowed: "no", reached: false },
          ],
          limit_summary: {
            reason: "usage_limit",
            affected_limits: ["codex"],
            affected_limits_truncated: false,
            fallback_available: true,
            fallback_limit_id: "base_model_inference",
          },
          sources: {
            usage: {
              state: "error",
              last_attempt: "2026-07-15T10:00:00Z",
              last_success: null,
              retry_at: null,
              error_code: "connection",
              refresh_mode: "poll",
              expected_interval_seconds: 300,
            },
            private: { state: "error", error_code: "secret" },
          },
          reset_credits: {
            available_count: 0,
            total_earned: 0,
            next_expiry: null,
            count_source: "usage",
            details_consistent: false,
            details_present: true,
          },
          limits: [
            {
              ...sourceAccount.limits[0]!,
              budget_pph: 0.25,
              budget_calculated_at: "2026-07-15T10:00:00Z",
            },
          ],
        },
      ],
    });

    const account = result.accounts[0]! as (typeof result.accounts)[number] &
      Record<string, unknown>;
    expect(account.limit_statuses).toEqual([
      {
        id: "base_model_inference",
        name: "Luna Reserve",
        source: "additional",
        allowed: true,
        reached: false,
      },
    ]);
    expect(account.limit_statuses?.[0]).not.toHaveProperty("normal_model_slug");
    expect(account.limit_summary).toMatchObject({
      fallback_available: true,
      fallback_limit_id: "base_model_inference",
    });
    expect(account.sources).toEqual({
      usage: expect.objectContaining({ state: "error", error_code: "connection" }),
    });
    expect(account.reset_credits).toMatchObject({
      available_count: 0,
      count_source: "usage",
      details_consistent: false,
      details_present: true,
    });
    expect((account.limits[0] as unknown as Record<string, unknown>).budget_pph).toBe(0.25);
  });

  it("rejects unsupported and incomplete snapshot envelopes", () => {
    expect(() => normalizeCardSnapshot(null)).toThrow("Unsupported");
    expect(() => normalizeCardSnapshot({ schema_version: 2, accounts: [] })).toThrow("Unsupported");
    expect(() =>
      normalizeCardSnapshot({ schema_version: 1, accounts: [], generated_at: "invalid" }),
    ).toThrow("Incomplete");
  });
});

describe("fetchCardSnapshot", () => {
  it("uses only the dedicated read-only WebSocket command", async () => {
    const hass = makeFakeHass();
    const callWS = vi.spyOn(hass, "callWS");

    await expect(fetchCardSnapshot(hass)).resolves.toEqual(SNAPSHOT);
    expect(callWS).toHaveBeenCalledOnce();
    expect(callWS).toHaveBeenCalledWith({ type: "codex_usage/card_data" });
  });
});
