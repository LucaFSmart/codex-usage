import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { fetchCardSnapshot } from "./card-data";
import { DEFAULT_COLORS, DEFAULT_CONFIG, normalizeConfig, SECTION_KEYS } from "./config";
import { localize, type TranslationKey } from "./localize";
import type {
  CardProfile,
  CardSnapshot,
  CodexUsageCardConfig,
  HomeAssistant,
  LovelaceCardConfig,
  SectionKey,
  Severity,
} from "./types";
const HELP_URL = "https://github.com/LucaFSmart/codex-usage#dashboard-card";
const PROFILE_FIELDS: readonly { key: keyof CardProfile; label: TranslationKey }[] = [
  { key: "lifetime_tokens", label: "lifetimeTokens" },
  { key: "total_threads", label: "threads" },
  { key: "peak_daily_tokens", label: "peakDailyTokens" },
  { key: "current_streak_days", label: "currentStreak" },
  { key: "longest_streak_days", label: "longestStreak" },
  { key: "longest_running_turn_sec", label: "longestTurn" },
  { key: "fast_mode_usage_percentage", label: "fastMode" },
  { key: "total_skills_used", label: "totalSkills" },
  { key: "unique_skills_used", label: "uniqueSkills" },
  { key: "most_used_reasoning_effort", label: "reasoning" },
  { key: "most_used_reasoning_effort_percentage", label: "reasoningShare" },
];
const COLOR_KEYS: readonly Severity[] = ["ok", "warning", "critical", "blocked", "unknown"];
const COLOR_LABELS: Record<Severity, TranslationKey> = {
  ok: "colorOk",
  warning: "colorWarning",
  critical: "colorCritical",
  blocked: "colorBlocked",
  unknown: "colorUnknown",
};
const VAR_HEX_PATTERN = /^var\((--[\w-]+)\s*,\s*(#[0-9a-fA-F]{6})\)$/i;
function extractSwatchHex(value: string, fallback: string): string {
  const match = value.match(VAR_HEX_PATTERN);
  if (match) return match[2]!;
  return /^#[0-9a-fA-F]{6}$/i.test(value) ? value : fallback;
}
function applySwatchHex(value: string, hex: string): string {
  const match = value.match(VAR_HEX_PATTERN);
  return match ? `var(${match[1]}, ${hex})` : hex;
}

@customElement("codex-usage-card-editor")
export class CodexUsageCardEditor extends LitElement {
  @property({ attribute: false }) public accessor hass: HomeAssistant | undefined = undefined;
  @state() private accessor config: CodexUsageCardConfig = structuredClone(DEFAULT_CONFIG);
  @state() private accessor accounts: CardSnapshot["accounts"] = [];
  private loadedConnection: HomeAssistant["connection"] | undefined;

  private readonly handleValueChanged = (event: Event): void => {
    if (!(event instanceof CustomEvent) || !event.detail?.value) return;
    event.stopPropagation();
    const next = normalizeConfig({ ...this.config, ...structuredClone(event.detail.value) });
    this.emitConfig(next);
  };

  private emitConfig(next: CodexUsageCardConfig): void {
    this.config = next;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config: structuredClone(next) },
        bubbles: true,
        composed: true,
      }),
    );
  }

  public override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener("value-changed", this.handleValueChanged);
  }

  public override disconnectedCallback(): void {
    this.removeEventListener("value-changed", this.handleValueChanged);
    super.disconnectedCallback();
  }

  public setConfig(config: LovelaceCardConfig): void {
    this.config = normalizeConfig(config);
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has("hass") || !this.hass || this.loadedConnection === this.hass.connection)
      return;
    const connection = this.hass.connection;
    this.loadedConnection = connection;
    void fetchCardSnapshot(this.hass)
      .then((snapshot) => {
        if (this.loadedConnection !== connection) return;
        this.accounts = snapshot.accounts;
      })
      .catch(() => {
        if (this.loadedConnection !== connection) return;
        this.accounts = [];
        this.loadedConnection = undefined;
      });
  }

  private t(key: TranslationKey): string {
    return localize(this.hass?.locale?.language ?? this.hass?.language, key);
  }

  private setSectionVisibility(key: SectionKey, event: Event): void {
    const next = structuredClone(this.config);
    const value = (event.target as HTMLSelectElement).value;
    next.sections[key].visible = value === "true" ? true : value === "false" ? false : "auto";
    this.emitConfig(next);
  }

  private toggleValue(section: SectionKey, key: string): void {
    const next = structuredClone(this.config);
    next.sections[section].values[key] = next.sections[section].values[key] === false;
    this.emitConfig(next);
  }

  private sectionLabel(key: SectionKey): string {
    const labels: Record<SectionKey, TranslationKey> = {
      limits: "sectionLimits",
      additional_limits: "sectionAdditionalLimits",
      resets: "sectionResets",
      pace: "sectionPace",
      account: "sectionAccount",
      credits: "sectionCredits",
      spending: "sectionSpending",
      budget: "budget",
      sources: "sources",
      profile: "sectionProfile",
      footer: "sectionFooter",
    };
    return this.t(labels[key]);
  }

  private updateThresholds(event: CustomEvent<{ value: Record<string, unknown> }>): void {
    event.stopPropagation();
    this.emitConfig(normalizeConfig({ ...this.config, thresholds: event.detail.value }));
  }

  private updateAppearance(event: CustomEvent<{ value: Record<string, unknown> }>): void {
    event.stopPropagation();
    this.emitConfig(normalizeConfig({ ...this.config, appearance: event.detail.value }));
  }

  private colorSwatchValue(key: Severity): string {
    const fallback = extractSwatchHex(DEFAULT_COLORS[key], "#000000");
    return extractSwatchHex(this.config.colors[key], fallback);
  }

  private updateColorSwatch(key: Severity, event: Event): void {
    const hex = (event.target as HTMLInputElement).value;
    const next = applySwatchHex(this.config.colors[key], hex);
    this.emitConfig(
      normalizeConfig({ ...this.config, colors: { ...this.config.colors, [key]: next } }),
    );
  }

  private updateColorText(key: Severity, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.emitConfig(
      normalizeConfig({ ...this.config, colors: { ...this.config.colors, [key]: value } }),
    );
  }

  private readonly computeLabel = (schema: { name?: string }): string => {
    const labels: Record<string, TranslationKey> = {
      title: "cardTitle",
      compact: "compactMode",
      account_mode: "accountMode",
      selected_entry_id: "selectedAccount",
      included_entry_ids: "includedAccounts",
      allow_account_switching: "accountSwitching",
      show_unavailable_limits: "showUnavailable",
      stale_after_minutes: "staleAfter",
      card_radius: "cardRadius",
      spacing: "spacing",
    };
    const label = schema.name ? labels[schema.name] : undefined;
    return label ? this.t(label) : (schema.name ?? "");
  };

  private readonly computeThresholdLabel = (schema: { name?: string }): string => {
    const labels: Record<string, TranslationKey> = {
      warning: "thresholdWarning",
      critical: "colorCritical",
    };
    const label = schema.name ? labels[schema.name] : undefined;
    return label ? this.t(label) : (schema.name ?? "");
  };

  private valueOptions(section: SectionKey): Array<{ key: string; label: string }> {
    if (["limits", "additional_limits", "resets", "pace"].includes(section)) {
      const seen = new Set<string>();
      return this.accounts.flatMap((account) =>
        account.limits.flatMap((limit) => {
          if (seen.has(limit.id)) return [];
          seen.add(limit.id);
          return [{ key: limit.id, label: `${account.name}: ${limit.name}` }];
        }),
      );
    }
    if (section === "credits") {
      return [
        { key: "balance", label: this.t("balance") },
        { key: "unlimited", label: this.t("unlimited") },
        { key: "reset_credits", label: this.t("resetCredits") },
        { key: "total_earned", label: this.t("totalEarned") },
        { key: "next_expiry", label: this.t("nextExpiry") },
      ];
    }
    if (section === "spending") {
      return [
        { key: "remaining", label: this.t("remaining") },
        { key: "used", label: this.t("used") },
        { key: "limit", label: this.t("limit") },
        { key: "used_percent", label: this.t("usage") },
        { key: "source", label: this.t("source") },
        { key: "reset", label: this.t("resets") },
      ];
    }
    if (section === "profile") {
      return PROFILE_FIELDS.map((field) => ({ key: field.key, label: this.t(field.label) }));
    }
    if (section === "account") {
      return [
        { key: "plan", label: this.t("planLabel") },
        { key: "workspace", label: this.t("workspace") },
        { key: "account_id", label: this.t("accountId") },
      ];
    }
    if (section === "footer") {
      return [
        { key: "updated", label: this.t("updated") },
        { key: "version", label: "Version" },
      ];
    }
    return [];
  }

  private resetAdvanced(): void {
    this.emitConfig(
      normalizeConfig({
        ...this.config,
        thresholds: DEFAULT_CONFIG.thresholds,
        stale_after_minutes: DEFAULT_CONFIG.stale_after_minutes,
        colors: DEFAULT_CONFIG.colors,
        appearance: DEFAULT_CONFIG.appearance,
      }),
    );
  }

  protected override render(): TemplateResult {
    const schema: Record<string, unknown>[] = [
      { name: "title", selector: { text: {} } },
      { name: "compact", selector: { boolean: {} } },
      {
        name: "account_mode",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "auto", label: this.t("accountAuto") },
              { value: "single", label: this.t("accountSingle") },
              { value: "all", label: this.t("accountAll") },
            ],
          },
        },
      },
      {
        name: "included_entry_ids",
        selector: {
          select: {
            multiple: true,
            options: this.accounts.map((account) => ({ value: account.id, label: account.name })),
          },
        },
      },
      ...(this.config.account_mode === "single"
        ? [
            {
              name: "selected_entry_id",
              selector: {
                select: {
                  mode: "dropdown",
                  options: this.accounts.map((account) => ({
                    value: account.id,
                    label: account.name,
                  })),
                },
              },
            },
          ]
        : []),
      {
        name: "allow_account_switching",
        selector: { boolean: {} },
      },
      {
        name: "show_unavailable_limits",
        selector: { boolean: {} },
      },
      {
        name: "stale_after_minutes",
        selector: { number: { min: 5, max: 1440, mode: "box", unit_of_measurement: "min" } },
      },
    ];
    return html`<div class="editor">
      <ha-form
        .hass=${this.hass}
        .data=${this.config}
        .schema=${schema}
        .computeLabel=${this.computeLabel}
      ></ha-form>
      <details open>
        <summary>${this.t("sections")}</summary>
        <div class="section-list">
          ${SECTION_KEYS.map(
            (key) =>
              html`<div class="section-row">
                <label class="section-toggle"
                  >${this.sectionLabel(key)}
                  <select
                    data-section-key=${key}
                    .value=${String(this.config.sections[key].visible)}
                    @change=${(event: Event) => this.setSectionVisibility(key, event)}
                  >
                    <option value="auto">${this.t("accountAuto")}</option>
                    <option value="true">${this.t("alwaysShow")}</option>
                    <option value="false">${this.t("hide")}</option>
                  </select>
                </label>
                ${
                  this.config.sections[key].visible !== false && this.valueOptions(key).length > 0
                    ? html`<div class="value-toggles">
                        ${this.valueOptions(key).map(
                          (item) =>
                            html`<label data-value-key=${item.key}
                              ><input
                                type="checkbox"
                                .checked=${this.config.sections[key].values[item.key] !== false}
                                @change=${() => this.toggleValue(key, item.key)}
                              />${item.label}</label
                            >`,
                        )}
                      </div>`
                    : nothing
                }
              </div>`,
          )}
        </div>
      </details>
      <details>
        <summary>${this.t("advanced")}</summary>
        <h4>${this.t("thresholds")}</h4>
        <ha-form
          .hass=${this.hass}
          .data=${this.config.thresholds}
          .schema=${[
            { name: "warning", selector: { number: { min: 0, max: 99, mode: "slider" } } },
            { name: "critical", selector: { number: { min: 1, max: 100, mode: "slider" } } },
          ]}
          .computeLabel=${this.computeThresholdLabel}
          @value-changed=${this.updateThresholds}
        ></ha-form>
        <h4>${this.t("semanticColors")}</h4>
        <div class="color-list">
          ${COLOR_KEYS.map(
            (key) =>
              html`<label class="color-row" data-color-key=${key}>
                <span>${this.t(COLOR_LABELS[key])}</span>
                <input
                  type="color"
                  .value=${this.colorSwatchValue(key)}
                  @input=${(event: Event) => this.updateColorSwatch(key, event)}
                />
                <input
                  type="text"
                  .value=${this.config.colors[key]}
                  @change=${(event: Event) => this.updateColorText(key, event)}
                />
              </label>`,
          )}
        </div>
        <h4>${this.t("appearance")}</h4>
        <ha-form
          .hass=${this.hass}
          .data=${this.config.appearance}
          .schema=${[
            { name: "card_radius", selector: { number: { min: 0, max: 48, mode: "box" } } },
            { name: "spacing", selector: { number: { min: 4, max: 32, mode: "box" } } },
          ]}
          .computeLabel=${this.computeLabel}
          @value-changed=${this.updateAppearance}
        ></ha-form>
        <button class="reset-button" @click=${this.resetAdvanced}>
          ${this.t("resetDefaults")}
        </button>
        <p><a href=${HELP_URL} target="_blank" rel="noreferrer">${this.t("documentation")}</a></p>
      </details>
    </div>`;
  }

  static override styles = css`
    .editor {
      display: grid;
      gap: 16px;
    }
    details {
      border-top: 1px solid var(--divider-color);
      padding-top: 10px;
    }
    .color-list {
      display: grid;
      gap: 8px;
    }
    .color-row {
      display: grid;
      grid-template-columns: minmax(90px, 1fr) 40px minmax(0, 2fr);
      align-items: center;
      gap: 8px;
    }
    .color-row input[type="color"] {
      width: 40px;
      height: 32px;
      padding: 2px;
    }
    .color-row input[type="text"] {
      min-width: 0;
      box-sizing: border-box;
      padding: 8px;
    }
    summary {
      cursor: pointer;
      font-weight: 600;
    }
    .section-list {
      display: grid;
      gap: 12px;
      margin-top: 12px;
    }
    .section-row {
      display: grid;
      gap: 8px;
    }
    .section-toggle {
      font-weight: 600;
    }
    .value-toggles {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 7px 12px;
      padding-inline-start: 24px;
      color: var(--secondary-text-color);
      font-size: 0.88rem;
    }
    label {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    p {
      color: var(--secondary-text-color);
    }
    a {
      color: var(--primary-color);
    }
    h4 {
      margin-bottom: 4px;
    }
    .reset-button {
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px 12px;
      background: transparent;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    @media (max-width: 520px) {
      .value-toggles {
        grid-template-columns: 1fr;
      }
    }
  `;
}
