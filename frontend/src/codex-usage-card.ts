import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";

import type { HomeAssistant, LovelaceCardConfig } from "./types";

@customElement("codex-usage-card")
export class CodexUsageCard extends LitElement {
  @property({ attribute: false }) public hass?: HomeAssistant;
  private config: LovelaceCardConfig = { type: "custom:codex-usage-card" };

  public setConfig(config: LovelaceCardConfig): void {
    if (config.type !== "custom:codex-usage-card") throw new Error("Invalid card type");
    this.config = structuredClone(config);
  }

  protected render() {
    return html`<ha-card><div>Codex Usage</div></ha-card>`;
  }
}

@customElement("codex-usage-card-editor")
export class CodexUsageCardEditor extends LitElement {}
