import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { fetchCardSnapshot } from "./card-data";
import { DEFAULT_CONFIG, normalizeConfig, SECTION_KEYS } from "./config";
import { localize, type TranslationKey } from "./localize";
import type {
  AccountViewModel,
  CardSnapshot,
  CodexUsageCardConfig,
  HomeAssistant,
  LimitViewModel,
  LovelaceCardConfig,
  SectionKey,
  Severity,
} from "./types";
import { buildCardViewModel } from "./view-model";

const CARD_DATA_EVENT = "codex_usage_card_data_updated";
const HELP_URL = "https://github.com/lucasscoded/Codex-Usage#dashboard-card";

function formatPercent(value: number | null): string {
  return value === null
    ? "—"
    : `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}%`;
}

@customElement("codex-usage-card")
export class CodexUsageCard extends LitElement {
  @property({ attribute: false }) public accessor hass: HomeAssistant | undefined = undefined;
  @state() private accessor snapshot: CardSnapshot | undefined = undefined;
  @state() private accessor error = false;
  @state() private accessor sessionEntryId: string | undefined = undefined;

  private config: CodexUsageCardConfig = structuredClone(DEFAULT_CONFIG);
  private unsubscribe: (() => void) | undefined;
  private subscribedConnection: HomeAssistant["connection"] | undefined;
  private loading = false;

  public static getStubConfig(): Record<string, never> {
    return {};
  }

  public static async getConfigElement(): Promise<HTMLElement> {
    return document.createElement("codex-usage-card-editor");
  }

  public setConfig(config: LovelaceCardConfig): void {
    if (config.type !== "custom:codex-usage-card") throw new Error("Invalid card type");
    this.config = normalizeConfig(config);
    this.sessionEntryId = undefined;
    this.requestUpdate();
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, min_columns: 3, max_columns: 12 };
  }

  public getCardSize(): number {
    return this.config.display_mode === "compact" ? 3 : 5;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("hass") && this.hass) void this.startClient();
  }

  public override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    this.subscribedConnection = undefined;
  }

  private async startClient(): Promise<void> {
    if (!this.hass) return;
    const needsInitialLoad = this.subscribedConnection !== this.hass.connection || !this.snapshot;
    if (this.subscribedConnection !== this.hass.connection) {
      this.unsubscribe?.();
      this.subscribedConnection = this.hass.connection;
      this.unsubscribe = await this.hass.connection.subscribeEvents(
        () => void this.loadSnapshot(),
        CARD_DATA_EVENT,
      );
    }
    if (needsInitialLoad) await this.loadSnapshot();
  }

  private async loadSnapshot(): Promise<void> {
    if (!this.hass || this.loading) return;
    this.loading = true;
    try {
      this.snapshot = await fetchCardSnapshot(this.hass);
      this.error = false;
    } catch {
      this.error = true;
    } finally {
      this.loading = false;
    }
  }

  private t(key: TranslationKey): string {
    return localize(this.hass?.locale?.language ?? this.hass?.language, key);
  }

  private statusLabel(severity: Severity): string {
    if (severity === "blocked") return this.t("blocked");
    if (severity === "stale") return this.t("stale");
    if (severity === "missing") return this.t("unavailable");
    return this.t("available");
  }

  private limitLabel(limit: LimitViewModel): string {
    if (limit.duration_seconds === 18_000) return this.t("fiveHours");
    if (limit.duration_seconds === 604_800) return this.t("week");
    if (limit.duration_seconds && limit.duration_seconds % 86_400 === 0) {
      return `${limit.duration_seconds / 86_400} ${this.t("days")}`;
    }
    return limit.name || this.t("unknownWindow");
  }

  private resetLabel(value: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "—";
    return new Intl.DateTimeFormat(this.hass?.locale?.language ?? this.hass?.language, {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  private openMoreInfo(entityId: string | null): void {
    if (!entityId) return;
    this.dispatchEvent(
      new CustomEvent("hass-more-info", {
        detail: { entityId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private renderLimit(limit: LimitViewModel, primary: boolean): TemplateResult {
    const used =
      limit.used_percent ??
      (limit.remaining_percent === null ? null : 100 - limit.remaining_percent);
    const remaining = limit.remaining_percent ?? (used === null ? null : 100 - used);
    const content = html` <div class="limit-head">
        <span>${this.limitLabel(limit)}</span>
        ${
          this.config.sections.resets.visible && limit.resets_at
            ? html`<span class="reset"
                >${this.t("resets")}: ${this.resetLabel(limit.resets_at)}</span
              >`
            : nothing
        }
      </div>
      <div class="limit-content">
        ${
          primary
            ? html`<div class="ring" style=${`--progress:${used ?? 0}`} aria-hidden="true">
                <strong>${formatPercent(used)}</strong>
              </div>`
            : html`<strong class="limit-value">${formatPercent(used)}</strong>`
        }
        <div class="limit-copy">
          <strong>${formatPercent(remaining)} ${this.t("remaining")}</strong>
          <div
            class="bar"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow=${used ?? 0}
          >
            <span style=${`width:${used ?? 0}%`}></span>
          </div>
          ${
            this.config.sections.pace.visible && limit.pace !== null
              ? html`<small
                  >${this.t("pace")}: ${Math.abs(limit.pace).toFixed(1)}%
                  ${limit.pace >= 0 ? this.t("ahead") : this.t("behind")}</small
                >`
              : nothing
          }
        </div>
      </div>`;
    return limit.entity_id
      ? html`<button class="limit-panel panel" @click=${() => this.openMoreInfo(limit.entity_id)}>
          ${content}
        </button>`
      : html`<div class="limit-panel panel">${content}</div>`;
  }

  private renderDetails(account: AccountViewModel): TemplateResult | typeof nothing {
    if (this.config.display_mode === "compact") return nothing;
    const cards: TemplateResult[] = [];
    if (this.config.sections.credits.visible && account.credits) {
      cards.push(
        html`<div class="detail panel">
          <span>${this.t("credits")}</span
          ><strong>${account.credits.unlimited ? "∞" : (account.credits.balance ?? "—")}</strong>
        </div>`,
      );
    }
    if (this.config.sections.spending.visible && account.spend) {
      cards.push(
        html`<div class="detail panel">
          <span>${this.t("spending")}</span
          ><strong>${account.spend.remaining ?? account.spend.limit ?? "—"}</strong>
        </div>`,
      );
    }
    if (this.config.sections.profile.visible && account.profile) {
      const tokens = account.profile.lifetime_tokens;
      const threads = account.profile.total_threads;
      cards.push(
        html`<div class="detail profile panel">
          <span>${this.t("profile")}</span
          ><strong
            >${typeof tokens === "number" ? new Intl.NumberFormat().format(tokens) : "—"}</strong
          ><small>${this.t("tokens")} · ${threads ?? "—"} ${this.t("threads")}</small>
        </div>`,
      );
    }
    return cards.length ? html`<div class="details">${cards}</div>` : nothing;
  }

  protected override render(): TemplateResult {
    const view = this.snapshot
      ? buildCardViewModel(this.snapshot, this.config, this.sessionEntryId)
      : null;
    const account = view?.selectedAccount ?? null;
    const severity = view?.severity ?? "missing";
    const limits =
      account?.limits.filter(
        (item) =>
          this.config.sections.limits.values[item.id] !== false &&
          (this.config.show_unavailable_limits ||
            item.used_percent !== null ||
            item.remaining_percent !== null),
      ) ?? [];
    const color = this.config.colors[severity];
    const style = `--state-color:${color};--card-radius:${this.config.appearance.card_radius}px;--panel-radius:${this.config.appearance.panel_radius}px;--card-spacing:${this.config.appearance.spacing}px`;

    return html`<ha-card class=${severity} style=${style}>
      <div class="surface">
        <header>
          <div>
            <h2>${this.config.title}</h2>
            <p>${account ? `${account.name}${account.plan ? ` · ${account.plan}` : ""}` : ""}</p>
          </div>
          <span class="status"><i></i>${this.statusLabel(severity)}</span>
        </header>
        ${
          view && view.accounts.length > 1 && this.config.allow_account_switching
            ? html`<nav aria-label=${this.t("account")}>
                ${view.accounts.map(
                  (item) =>
                    html`<button
                      class="account-chip ${item.id === account?.id ? "selected" : ""}"
                      data-entry-id=${item.id}
                      @click=${() => (this.sessionEntryId = item.id)}
                    >
                      <i style=${`--chip-color:${this.config.colors[item.severity]}`}></i
                      >${item.name}
                    </button>`,
                )}
              </nav>`
            : nothing
        }
        ${
          account && limits.length && this.config.sections.limits.visible
            ? html`<main class="limits">
                ${limits.map((item, index) => this.renderLimit(item, index === 0))}
              </main>`
            : html`<div class="empty">
                ${this.error ? this.t("unavailable") : this.t("noData")}
              </div>`
        }
        ${account ? this.renderDetails(account) : nothing}
        ${
          account && this.config.sections.footer.visible
            ? html`<footer>
                <span>${this.t("updated")}: ${this.resetLabel(account.updated_at)}</span
                ><span>v${view?.integrationVersion}</span>
              </footer>`
            : nothing
        }
      </div>
    </ha-card>`;
  }

  static override styles = css`
    :host {
      display: block;
      color: var(--primary-text-color);
    }
    ha-card {
      display: block;
      --state-color: var(--codex-usage-normal-color, #25b7f3);
      position: relative;
      overflow: hidden;
      border-radius: var(--codex-usage-card-radius, var(--card-radius));
      border: 1px solid color-mix(in srgb, var(--state-color) 62%, transparent);
      background: linear-gradient(
        145deg,
        color-mix(
          in srgb,
          var(--state-color) 13%,
          var(--ha-card-background, var(--card-background-color))
        ),
        var(--ha-card-background, var(--card-background-color)) 42%
      );
      box-shadow:
        0 16px 38px rgba(0, 0, 0, 0.18),
        inset 0 1px color-mix(in srgb, var(--state-color) 28%, transparent);
      transition:
        border-color 0.25s ease,
        background 0.25s ease;
    }
    ha-card::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 3px;
      background: var(--state-color);
      box-shadow: 0 0 24px var(--state-color);
      opacity: 0.85;
    }
    .surface {
      padding: var(--codex-usage-spacing, var(--card-spacing));
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
      margin-bottom: 14px;
    }
    h2 {
      margin: 0;
      font-size: 1.28rem;
      letter-spacing: -0.025em;
    }
    p {
      margin: 3px 0 0;
      color: var(--secondary-text-color);
      font-size: 0.82rem;
      text-transform: capitalize;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      border: 1px solid color-mix(in srgb, var(--state-color) 64%, transparent);
      background: color-mix(in srgb, var(--state-color) 13%, transparent);
      color: var(--state-color);
      padding: 6px 10px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .status i,
    nav i {
      width: 7px;
      height: 7px;
      background: currentColor;
      border-radius: 50%;
    }
    nav {
      display: flex;
      gap: 7px;
      overflow-x: auto;
      margin: 0 0 12px;
      scrollbar-width: none;
    }
    button {
      font: inherit;
      color: inherit;
    }
    .account-chip {
      border: 1px solid var(--divider-color);
      background: color-mix(in srgb, var(--primary-background-color) 35%, transparent);
      border-radius: 999px;
      padding: 6px 10px;
      display: flex;
      gap: 6px;
      align-items: center;
      cursor: pointer;
    }
    .account-chip i {
      background: var(--chip-color);
    }
    .account-chip.selected {
      border-color: var(--state-color);
      background: color-mix(in srgb, var(--state-color) 14%, transparent);
    }
    .limits {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(230px, 100%), 1fr));
      gap: var(--codex-usage-spacing, var(--card-spacing));
    }
    .panel {
      border: 1px solid color-mix(in srgb, var(--divider-color) 75%, transparent);
      border-radius: var(--codex-usage-panel-radius, var(--panel-radius));
      background: color-mix(in srgb, var(--secondary-background-color) 72%, transparent);
    }
    .limit-panel {
      padding: 15px;
      min-width: 0;
      text-align: left;
    }
    button.limit-panel {
      cursor: pointer;
      width: 100%;
    }
    .limit-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      text-transform: uppercase;
      font-weight: 700;
      font-size: 0.68rem;
      color: var(--secondary-text-color);
    }
    .reset {
      text-transform: none;
      font-weight: 500;
    }
    .limit-content {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 13px;
    }
    .ring {
      --progress: 0;
      width: 70px;
      height: 70px;
      flex: 0 0 70px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background:
        radial-gradient(
          circle,
          var(--ha-card-background, var(--card-background-color)) 57%,
          transparent 59%
        ),
        conic-gradient(
          var(--state-color) calc(var(--progress) * 1%),
          color-mix(in srgb, var(--divider-color) 65%, transparent) 0
        );
    }
    .ring strong {
      font-size: 1.15rem;
    }
    .limit-value {
      font-size: 1.45rem;
      min-width: 60px;
    }
    .limit-copy {
      flex: 1;
      min-width: 0;
      display: grid;
      gap: 7px;
    }
    .bar {
      height: 6px;
      overflow: hidden;
      border-radius: 99px;
      background: color-mix(in srgb, var(--divider-color) 65%, transparent);
    }
    .bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--state-color);
    }
    small,
    footer {
      color: var(--secondary-text-color);
      font-size: 0.72rem;
    }
    .details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    .detail {
      padding: 12px;
      display: grid;
      gap: 3px;
    }
    .detail span {
      color: var(--secondary-text-color);
      font-size: 0.7rem;
      text-transform: uppercase;
    }
    .detail strong {
      font-size: 1rem;
    }
    footer {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-top: 13px;
      padding: 0 2px;
    }
    .empty {
      padding: 30px 14px;
      text-align: center;
      color: var(--secondary-text-color);
    }
    button:focus-visible {
      outline: 2px solid var(--state-color);
      outline-offset: 2px;
    }
    @media (max-width: 479px) {
      .surface {
        padding: 14px;
      }
      .limit-head {
        display: grid;
      }
      .reset {
        font-size: 0.65rem;
      }
      .ring {
        width: 62px;
        height: 62px;
        flex-basis: 62px;
      }
      footer {
        display: grid;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      ha-card {
        transition: none;
      }
    }
  `;
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
    this.loadedConnection = this.hass.connection;
    void fetchCardSnapshot(this.hass)
      .then((snapshot) => {
        this.accounts = snapshot.accounts;
      })
      .catch(() => {
        this.accounts = [];
      });
  }

  private t(key: TranslationKey): string {
    return localize(this.hass?.locale?.language ?? this.hass?.language, key);
  }

  private toggleSection(key: SectionKey): void {
    const next = structuredClone(this.config);
    next.sections[key].visible = !next.sections[key].visible;
    this.emitConfig(next);
  }

  private sectionLabel(key: SectionKey): string {
    const labels: Record<SectionKey, TranslationKey> = {
      limits: "sectionLimits",
      resets: "sectionResets",
      pace: "sectionPace",
      credits: "sectionCredits",
      spending: "sectionSpending",
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

  private resetAdvanced(): void {
    this.emitConfig(
      normalizeConfig({
        ...this.config,
        thresholds: DEFAULT_CONFIG.thresholds,
        stale_after_minutes: DEFAULT_CONFIG.stale_after_minutes,
        appearance: DEFAULT_CONFIG.appearance,
      }),
    );
  }

  protected override render(): TemplateResult {
    const schema: Record<string, unknown>[] = [
      { name: "title", label: this.t("cardTitle"), selector: { text: {} } },
      {
        name: "display_mode",
        label: this.t("displayMode"),
        selector: { select: { mode: "dropdown", options: ["adaptive", "compact", "detailed"] } },
      },
      {
        name: "account_mode",
        label: this.t("accountMode"),
        selector: { select: { mode: "dropdown", options: ["auto", "single", "all"] } },
      },
      ...(this.config.account_mode === "single"
        ? [
            {
              name: "selected_entry_id",
              label: this.t("selectedAccount"),
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
        label: this.t("accountSwitching"),
        selector: { boolean: {} },
      },
      {
        name: "show_unavailable_limits",
        label: this.t("showUnavailable"),
        selector: { boolean: {} },
      },
    ];
    return html`<div class="editor">
      <ha-form .hass=${this.hass} .data=${this.config} .schema=${schema}></ha-form>
      <details open>
        <summary>${this.t("sections")}</summary>
        <div class="toggles">
          ${SECTION_KEYS.map((key) => html`<label><input type="checkbox" .checked=${this.config.sections[key].visible} @change=${() => this.toggleSection(key)} />${this.sectionLabel(key)}</label>`)}
        </div>
      </details>
      <details>
        <summary>${this.t("advanced")}</summary>
        <h4>${this.t("thresholds")}</h4>
        <ha-form
          .hass=${this.hass}
          .data=${this.config.thresholds}
          .schema=${[
            { name: "elevated", selector: { number: { min: 0, max: 99, mode: "slider" } } },
            { name: "critical", selector: { number: { min: 1, max: 100, mode: "slider" } } },
          ]}
          @value-changed=${this.updateThresholds}
        ></ha-form>
        <h4>${this.t("appearance")}</h4>
        <ha-form
          .hass=${this.hass}
          .data=${this.config.appearance}
          .schema=${[
            { name: "card_radius", selector: { number: { min: 0, max: 48, mode: "box" } } },
            { name: "panel_radius", selector: { number: { min: 0, max: 36, mode: "box" } } },
            { name: "spacing", selector: { number: { min: 4, max: 32, mode: "box" } } },
          ]}
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
    summary {
      cursor: pointer;
      font-weight: 600;
    }
    .toggles {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
      margin-top: 12px;
    }
    label {
      display: flex;
      gap: 8px;
      align-items: center;
      text-transform: capitalize;
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
  `;
}
