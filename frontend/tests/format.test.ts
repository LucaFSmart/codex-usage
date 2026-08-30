import { describe, expect, it } from "vitest";

import {
  formatAbsoluteReset,
  formatPlanLabel,
  formatUsd,
  relativeDurationUntil,
} from "../src/format";

describe("relativeDurationUntil", () => {
  const now = new Date("2026-08-30T12:00:00Z");

  it("returns null for a missing or invalid value", () => {
    expect(relativeDurationUntil(null, now)).toBeNull();
    expect(relativeDurationUntil("not a date", now)).toBeNull();
  });

  it("computes minutes, hours, and days for a future timestamp", () => {
    expect(relativeDurationUntil("2026-08-30T12:03:00Z", now)).toEqual({
      totalMinutes: 3,
      days: 0,
      hours: 0,
      minutes: 3,
    });
    expect(relativeDurationUntil("2026-08-30T14:14:00Z", now)).toEqual({
      totalMinutes: 134,
      days: 0,
      hours: 2,
      minutes: 14,
    });
    expect(relativeDurationUntil("2026-09-02T15:00:00Z", now)).toEqual({
      totalMinutes: 4500,
      days: 3,
      hours: 3,
      minutes: 0,
    });
  });

  it("clamps a past timestamp to zero rather than going negative", () => {
    expect(relativeDurationUntil("2026-08-30T11:00:00Z", now)).toEqual({
      totalMinutes: 0,
      days: 0,
      hours: 0,
      minutes: 0,
    });
  });
});

describe("formatAbsoluteReset", () => {
  it("returns an em dash for a missing or invalid value", () => {
    expect(formatAbsoluteReset(null, "en-US")).toBe("—");
    expect(formatAbsoluteReset("not a date", "en-US")).toBe("—");
  });

  it("formats a valid timestamp with weekday, date, and time", () => {
    const formatted = formatAbsoluteReset("2026-09-02T15:00:00Z", "en-US");
    expect(formatted).not.toBe("—");
    expect(formatted.length).toBeGreaterThan(0);
  });
});

describe("formatUsd", () => {
  it("prefixes a valid decimal with a dollar sign", () => {
    expect(formatUsd("18.2", "en-US")).toBe("$18.2");
    expect(formatUsd("100", "en-US")).toBe("$100");
  });

  it("returns an em dash without a dollar sign for a missing value", () => {
    expect(formatUsd(null, "en-US")).toBe("—");
  });
});

describe("formatPlanLabel", () => {
  it.each([
    ["self_serve_business_prolite", "Business Pro Lite"],
    ["ent26", "Enterprise 26"],
    ["enterprise_cbp_automation", "Automation Enterprise"],
    ["edu_plus", "Edu Plus"],
    ["edu_pro", "Edu Pro"],
  ])("labels the current openai/codex plan value %s as %s", (value, expected) => {
    expect(formatPlanLabel(value)).toBe(expected);
  });

  it("falls back to a generic title-cased label for a genuinely unknown plan", () => {
    expect(formatPlanLabel("some_future_plan")).toBe("Some Future Plan");
  });
});
