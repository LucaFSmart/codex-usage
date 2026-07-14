import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_CONFIG } from "../src/config";
import type { CardAccount, CardSnapshot } from "../src/types";
import { buildCardViewModel } from "../src/view-model";
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
    expect(result.severity).toBe("normal");
    expect(result.accounts).toHaveLength(1);
  });

  it("uses the worst account as the aggregate state", () => {
    const result = buildCardViewModel(SNAPSHOT, DEFAULT_CONFIG);

    expect(result.selectedAccount?.name).toBe("Beta");
    expect(result.severity).toBe("critical");
    expect(result.accounts.map((account) => account.severity)).toEqual(["normal", "critical"]);
  });

  it("honors a fixed single-account selection", () => {
    const result = buildCardViewModel(SNAPSHOT, {
      ...DEFAULT_CONFIG,
      account_mode: "single",
      selected_entry_id: "entry-a",
    });

    expect(result.selectedAccount?.name).toBe("Alpha");
    expect(result.severity).toBe("normal");
  });

  it("marks old otherwise healthy snapshots stale", () => {
    const old: CardSnapshot = {
      ...SNAPSHOT,
      accounts: [{ ...alpha, updated_at: "2026-07-15T09:00:00Z" }],
    };

    expect(buildCardViewModel(old, DEFAULT_CONFIG).severity).toBe("stale");
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
    expect(result.selectedAccount?.severity).toBe("stale");
    expect(result.generatedAt).toBeNull();
  });
});
