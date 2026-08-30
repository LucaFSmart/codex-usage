import { describe, expect, it } from "vitest";

import { localize, STRINGS } from "../src/localize";

describe("localize", () => {
  it("picks German for a de-prefixed language and English otherwise", () => {
    expect(localize("de-DE", "credits")).toBe("Guthaben");
    expect(localize("en-US", "credits")).toBe("Credits");
    expect(localize(undefined, "credits")).toBe("Credits");
  });

  it("interpolates {token} placeholders from the values map", () => {
    expect(localize("en", "resetsInMinutes", { minutes: 42 })).toBe("Resets in 42 min");
    expect(localize("de", "resetsInMinutes", { minutes: 42 })).toBe("Setzt sich in 42 Min. zurück");
  });

  it("leaves an unmatched placeholder untouched", () => {
    expect(localize("en", "resetsInMinutes", {})).toBe("Resets in {minutes} min");
  });

  it("supports multiple distinct placeholders in one string", () => {
    expect(localize("en", "resetsInHoursMinutes", { hours: 2, minutes: 14 })).toBe(
      "Resets in 2h 14m",
    );
  });

  it("defines the exact same set of keys for every locale", () => {
    expect(Object.keys(STRINGS.de).sort()).toEqual(Object.keys(STRINGS.en).sort());
  });
});
