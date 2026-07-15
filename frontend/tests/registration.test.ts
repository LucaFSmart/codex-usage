import { describe, expect, it } from "vitest";

describe("card registration", () => {
  it("registers the card and card-picker metadata exactly once", async () => {
    window.customCards = [];
    await import("../src/index");

    expect(customElements.get("codex-usage-card")).toBeDefined();
    expect(customElements.get("codex-usage-card-editor")).toBeDefined();

    const matchingCards = window.customCards.filter((card) => card.type === "codex-usage-card");
    expect(matchingCards).toHaveLength(1);
    expect(matchingCards[0]).toEqual(
      expect.objectContaining({
        type: "codex-usage-card",
        name: "Codex Usage Card",
        description: expect.any(String),
        documentationURL: "https://github.com/LucaFSmart/codex-usage#dashboard-card",
      }),
    );

    // @ts-expect-error Vite resolves query-suffixed modules at runtime.
    await import("../src/index?duplicate-registration");
    expect(window.customCards.filter((card) => card.type === "codex-usage-card")).toHaveLength(1);
  });
});
