import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_CONFIG } from "../src/config";
import type { CardAccount, CardSnapshot, LimitViewModel } from "../src/types";
import { buildCardViewModel, isSectionVisible, mostConstrainedLimit } from "../src/view-model";
import { SNAPSHOT } from "./fixtures";

const alpha = SNAPSHOT.accounts[0] as CardAccount;
const beta = SNAPSHOT.accounts[1] as CardAccount;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-15T10:00:00Z"));
});

afterEach(() => vi.useRealTimers());

describe("buildCardViewModel", () => {
  it("shows the only account directly", () => {
    const result = buildCardViewModel({ ...SNAPSHOT, accounts: [alpha] }, DEFAULT_CONFIG);

    expect(result.selectedAccount?.name).toBe("Alpha");
    expect(result.severity).toBe("ok");
    expect(result.accounts).toHaveLength(1);
  });

  it("uses the worst account as the aggregate state", () => {
    const result = buildCardViewModel(SNAPSHOT, DEFAULT_CONFIG);

    expect(result.selectedAccount?.name).toBe("Beta");
    expect(result.severity).toBe("critical");
    expect(result.accounts.map((account) => account.severity)).toEqual(["ok", "critical"]);
  });

  it("honors a fixed single-account selection", () => {
    const result = buildCardViewModel(SNAPSHOT, {
      ...DEFAULT_CONFIG,
      account_mode: "single",
      selected_entry_id: "entry-a",
    });

    expect(result.selectedAccount?.name).toBe("Alpha");
    expect(result.severity).toBe("ok");
  });

  it("marks old otherwise healthy snapshots stale without touching severity", () => {
    const old: CardSnapshot = {
      ...SNAPSHOT,
      accounts: [{ ...alpha, updated_at: "2026-07-15T09:00:00Z" }],
    };

    const result = buildCardViewModel(old, DEFAULT_CONFIG);
    expect(result.selectedAccount?.stale).toBe(true);
    expect(result.selectedAccount?.severity).toBe("ok");
    expect(result.stale).toBe(true);
  });

  it("only treats explicit backend blockers as blocked", () => {
    const full: CardSnapshot = {
      ...SNAPSHOT,
      accounts: [
        {
          ...alpha,
          blocker: null,
          limits: [{ ...alpha.limits[0]!, used_percent: 100, remaining_percent: 0 }],
        },
      ],
    };
    expect(buildCardViewModel(full, DEFAULT_CONFIG).severity).toBe("critical");

    full.accounts[0]!.blocker = "usage_limit";
    expect(buildCardViewModel(full, DEFAULT_CONFIG).severity).toBe("blocked");
  });

  it("calculates pace only for plausible windows", () => {
    const result = buildCardViewModel({ ...SNAPSHOT, accounts: [beta] }, DEFAULT_CONFIG);
    expect(result.selectedAccount?.limits[0]?.pace).toBeTypeOf("number");

    const unknown: CardSnapshot = {
      ...SNAPSHOT,
      accounts: [
        {
          ...alpha,
          limits: [
            {
              ...alpha.limits[0]!,
              id: "future-window",
              duration_seconds: null,
            },
          ],
        },
      ],
    };
    expect(buildCardViewModel(unknown, DEFAULT_CONFIG).selectedAccount?.limits[0]?.pace).toBeNull();

    const expired: CardSnapshot = {
      ...SNAPSHOT,
      accounts: [
        {
          ...alpha,
          limits: [
            {
              ...alpha.limits[0]!,
              resets_at: "2026-07-15T09:59:00Z",
            },
          ],
        },
      ],
    };
    expect(buildCardViewModel(expired, DEFAULT_CONFIG).selectedAccount?.limits[0]?.pace).toBeNull();
  });

  it("filters configured accounts and handles unavailable or invalid timestamps", () => {
    const result = buildCardViewModel(
      {
        ...SNAPSHOT,
        generated_at: "invalid",
        accounts: [
          { ...alpha, available: false, updated_at: null },
          { ...beta, limits: [{ ...beta.limits[0]!, resets_at: "invalid" }] },
        ],
      },
      { ...DEFAULT_CONFIG, included_entry_ids: ["entry-a"] },
    );

    expect(result.accounts).toHaveLength(1);
    expect(result.selectedAccount?.severity).toBe("ok");
    expect(result.selectedAccount?.stale).toBe(true);
    expect(result.generatedAt).toBeNull();
  });

  it("attaches a mostConstrainedLimit to each account view model", () => {
    const result = buildCardViewModel({ ...SNAPSHOT, accounts: [beta] }, DEFAULT_CONFIG);
    expect(result.selectedAccount?.mostConstrainedLimit?.id).toBe("codex:primary:five_hour");
  });

  it("aggregates stale across accounts in all-account mode", () => {
    const fresh: CardSnapshot = { ...SNAPSHOT, accounts: [alpha, beta] };
    expect(buildCardViewModel(fresh, DEFAULT_CONFIG).stale).toBe(false);

    const oneStale: CardSnapshot = {
      ...SNAPSHOT,
      accounts: [{ ...alpha, updated_at: "2026-07-15T09:00:00Z" }, beta],
    };
    expect(buildCardViewModel(oneStale, DEFAULT_CONFIG).stale).toBe(true);
  });
});

function makeLimit(overrides: Partial<LimitViewModel>): LimitViewModel {
  return {
    id: "limit",
    name: "Limit",
    source: "main",
    duration_seconds: 3600,
    used_percent: 10,
    remaining_percent: 90,
    resets_at: null,
    reached: false,
    entity_id: null,
    severity: "ok",
    pace: null,
    ...overrides,
  };
}

describe("mostConstrainedLimit", () => {
  it("returns null for an empty limit set", () => {
    expect(mostConstrainedLimit([])).toBeNull();
  });

  it("returns the only limit unconditionally, even with null data", () => {
    const only = makeLimit({ id: "only", remaining_percent: null });
    expect(mostConstrainedLimit([only])).toBe(only);
  });

  it("prefers an already-reached limit over one with lower remaining_percent", () => {
    const reached = makeLimit({ id: "reached", reached: true, remaining_percent: 50 });
    const notReached = makeLimit({ id: "not-reached", reached: false, remaining_percent: 5 });
    expect(mostConstrainedLimit([notReached, reached])).toBe(reached);
  });

  it("picks the lowest remaining_percent when reached status is equal", () => {
    const tighter = makeLimit({ id: "tighter", remaining_percent: 8 });
    const looser = makeLimit({ id: "looser", remaining_percent: 40 });
    expect(mostConstrainedLimit([looser, tighter])).toBe(tighter);
  });

  it("prefers source main on an exact remaining_percent tie", () => {
    const additional = makeLimit({ id: "additional", source: "additional", remaining_percent: 20 });
    const main = makeLimit({ id: "main", source: "main", remaining_percent: 20 });
    expect(mostConstrainedLimit([additional, main])).toBe(main);
    expect(mostConstrainedLimit([main, additional])).toBe(main);
  });

  it("keeps the first occurrence on a full tie", () => {
    const first = makeLimit({ id: "first", remaining_percent: 20 });
    const second = makeLimit({ id: "second", remaining_percent: 20 });
    expect(mostConstrainedLimit([first, second])).toBe(first);
  });
});

describe("isSectionVisible", () => {
  const baseAccount = buildCardViewModel(
    { ...SNAPSHOT, accounts: [alpha] },
    DEFAULT_CONFIG,
  ).selectedAccount!;

  it("passes through boolean visibility unaffected by data presence", () => {
    expect(isSectionVisible("credits", true, baseAccount)).toBe(true);
    expect(isSectionVisible("credits", false, baseAccount)).toBe(false);
  });

  it.each([
    ["credits", "credits"],
    ["spending", "spend"],
    ["profile", "profile"],
  ] as const)("resolves auto for %s based on the account's %s field", (key, field) => {
    expect(isSectionVisible(key, "auto", baseAccount)).toBe(false);
    expect(isSectionVisible(key, "auto", { ...baseAccount, [field]: {} })).toBe(true);
  });

  it("resolves credits as auto-visible when only reset credits are present", () => {
    expect(
      isSectionVisible("credits", "auto", {
        ...baseAccount,
        credits: null,
        reset_credits: { available_count: 2, total_earned: 2, next_expiry: null },
      }),
    ).toBe(true);
  });

  it("resolves auto for additional_limits based on limit sources", () => {
    expect(isSectionVisible("additional_limits", "auto", baseAccount)).toBe(false);
    const withAdditional = {
      ...baseAccount,
      limits: [...baseAccount.limits, makeLimit({ id: "extra", source: "additional" })],
    };
    expect(isSectionVisible("additional_limits", "auto", withAdditional)).toBe(true);
  });

  it("treats auto as true for keys with no auto-specific rule", () => {
    expect(isSectionVisible("limits", "auto", baseAccount)).toBe(true);
  });
});
