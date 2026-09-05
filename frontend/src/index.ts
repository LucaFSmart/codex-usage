import "./codex-usage-card";
import "./codex-usage-card-editor";

const metadata = {
  type: "codex-usage-card",
  name: "Codex Usage Card",
  description: "Adaptive multi-account Codex usage overview.",
  preview: true,
  documentationURL: "https://github.com/LucaFSmart/codex-usage#dashboard-card",
};

window.customCards ??= [];
if (!window.customCards.some((card) => card.type === metadata.type)) {
  window.customCards.push(metadata);
}
