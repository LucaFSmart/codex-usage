import { describe, expect, it, vi } from "vitest";

import { fetchCardSnapshot, normalizeCardSnapshot } from "../src/card-data";
import { makeFakeHass, SNAPSHOT } from "./fixtures";

describe("normalizeCardSnapshot", () => {
  it("accepts the versioned, privacy-safe integration snapshot", () => {
    expect(normalizeCardSnapshot(SNAPSHOT)).toEqual(SNAPSHOT);
  });

  it("drops invalid accounts, values, and unsafe entity IDs", () => {
    const sourceAccount = SNAPSHOT.accounts[0]!;
    const sourceLimit = sourceAccount.limits[0]!;
    const result = normalizeCardSnapshot({
      schema_version: 1,
      integration_version: "0.5.1",
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
