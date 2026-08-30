import { describe, expect, it } from "vitest";

import { DEFAULT_THRESHOLDS } from "../src/config";
import { evaluateAccount, evaluateLimit, SEVERITY_RANK, worstSeverity } from "../src/status";

describe("evaluateLimit", () => {
  it.each([
    [null, "unknown"],
    [Number.NaN, "unknown"],
    [74.9, "ok"],
    [75, "warning"],
    [89.9, "warning"],
    [90, "critical"],
    [99.9, "critical"],
    [100, "critical"],
  ] as const)("evaluates %s as %s at the exact default boundaries", (usage, expected) => {
    expect(evaluateLimit(usage, false, DEFAULT_THRESHOLDS)).toBe(expected);
  });

  it("lets an explicit backend blocker override percentage thresholds", () => {
    expect(evaluateLimit(20, true, DEFAULT_THRESHOLDS)).toBe("blocked");
    expect(evaluateLimit(null, true, DEFAULT_THRESHOLDS)).toBe("blocked");
  });
});

describe("SEVERITY_RANK", () => {
  it("ranks severities from least to most severe", () => {
    expect(SEVERITY_RANK.unknown).toBeLessThan(SEVERITY_RANK.ok);
    expect(SEVERITY_RANK.ok).toBeLessThan(SEVERITY_RANK.warning);
    expect(SEVERITY_RANK.warning).toBeLessThan(SEVERITY_RANK.critical);
    expect(SEVERITY_RANK.critical).toBeLessThan(SEVERITY_RANK.blocked);
  });
});

describe("worstSeverity", () => {
  it("uses the explicit severity precedence", () => {
    expect(worstSeverity(["ok", "critical", "warning"])).toBe("critical");
    expect(worstSeverity(["blocked", "critical"])).toBe("blocked");
  });

  it("does not let an unknown limit override a valid limit", () => {
    expect(worstSeverity(["unknown", "ok"])).toBe("ok");
  });

  it("returns unknown when no valid limit severity exists", () => {
    expect(worstSeverity([])).toBe("unknown");
    expect(worstSeverity(["unknown", "unknown"])).toBe("unknown");
  });
});

describe("evaluateAccount", () => {
  it("keeps a weekly-ok account ok when five-hour data is missing", () => {
    expect(evaluateAccount(["unknown", "ok"])).toBe("ok");
  });

  it("lets any explicit backend blocker override all limit severities", () => {
    expect(evaluateAccount(["ok", "warning"], [false, true])).toBe("blocked");
  });
});
