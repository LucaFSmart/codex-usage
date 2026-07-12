import "./codex-usage-card";

const metadata = {
  type: "codex-usage-card",
  name: "Codex Usage Card",
  description: "Displays Codex usage data.",
};

window.customCards ??= [];
if (!window.customCards.some((card) => card.type === metadata.type)) {
  window.customCards.push(metadata);
}
