import { describe, expect, it } from "vitest";

import { DEFAULT_THRESHOLDS } from "../src/config";
import { evaluateAccount, evaluateLimit, worstSeverity } from "../src/status";

describe("evaluateLimit", () => {
  it.each([
    [null, "missing"],
    [Number.NaN, "missing"],
    [59.9, "normal"],
    [60, "elevated"],
    [84.9, "elevated"],
    [85, "critical"],
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

describe("worstSeverity", () => {
  it("uses the explicit severity precedence", () => {
    expect(worstSeverity(["normal", "stale", "critical", "elevated"])).toBe("critical");
    expect(worstSeverity(["blocked", "critical"])).toBe("blocked");
  });

  it("does not let a missing limit override a valid limit", () => {
    expect(worstSeverity(["missing", "normal"])).toBe("normal");
  });

  it("returns missing when no valid limit severity exists", () => {
    expect(worstSeverity([])).toBe("missing");
    expect(worstSeverity(["missing", "missing"])).toBe("missing");
  });
});

describe("evaluateAccount", () => {
  it("keeps a weekly-normal account normal when five-hour data is missing", () => {
    expect(evaluateAccount(["missing", "normal"])).toBe("normal");
  });

  it("lets any explicit backend blocker override all limit severities", () => {
    expect(evaluateAccount(["normal", "elevated"], [false, true])).toBe("blocked");
  });
});
