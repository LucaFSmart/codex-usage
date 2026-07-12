import { describe, expect, it } from "vitest";

describe("card registration", () => {
  it("registers the card and card-picker metadata exactly once", async () => {
    window.customCards = [];
    await import("../src/index");
    expect(customElements.get("codex-usage-card")).toBeDefined();
    expect(window.customCards).toContainEqual(
      expect.objectContaining({
        type: "codex-usage-card",
        name: "Codex Usage Card",
      }),
    );
  });
});
