import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { fetchCardSnapshot } from "./card-data";
import { DEFAULT_CONFIG, normalizeConfig, SECTION_KEYS } from "./config";
import { formatDecimal, formatMetricLabel, formatNumber, formatPlanLabel } from "./format";
import { localize, type TranslationKey } from "./localize";
import type {
  AccountViewModel,
  CardProfile,
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
const HELP_URL = "https://github.com/LucaFSmart/codex-usage#dashboard-card";

const PROFILE_FIELDS: readonly {
  key: keyof CardProfile;
  label: TranslationKey;
  compact?: boolean;
  suffix?: TranslationKey;
}[] = [
  { key: "lifetime_tokens", label: "lifetimeTokens", compact: true },
  { key: "total_threads", label: "threads", compact: true },
  { key: "peak_daily_tokens", label: "peakDailyTokens", compact: true },
  { key: "current_streak_days", label: "currentStreak", suffix: "days" },
  { key: "longest_streak_days", label: "longestStreak", suffix: "days" },
  { key: "longest_running_turn_sec", label: "longestTurn", suffix: "seconds" },
  { key: "fast_mode_usage_percentage", label: "fastMode" },
  { key: "total_skills_used", label: "totalSkills", compact: true },
  { key: "unique_skills_used", label: "uniqueSkills", compact: true },
  { key: "most_used_reasoning_effort", label: "reasoning" },
  {
    key: "most_used_reasoning_effort_percentage",
    label: "reasoningShare",
  },
];

function formatPercent(value: number | null, locale: string | undefined): string {
  return value === null
    ? "—"
    : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)}%`;
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
    if (this.config.display_mode === "compact") return 3;
    return this.config.display_mode === "detailed" ? 7 : 5;
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has("hass") && this.hass) {
      void this.startClient().catch(() => {
        this.error = true;
      });
    }
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
      try {
        this.unsubscribe = await this.hass.connection.subscribeEvents(
          () => void this.loadSnapshot(),
          CARD_DATA_EVENT,
        );
      } catch {
        this.error = true;
        this.subscribedConnection = undefined;
      }
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

  private get locale(): string | undefined {
    return this.hass?.locale?.language ?? this.hass?.language;
  }

  private statusLabel(severity: Severity): string {
    if (severity === "blocked") return this.t("blocked");
    if (severity === "stale") return this.t("stale");
    if (severity === "missing") return this.t("unavailable");
    if (severity === "critical") return this.t("criticalStatus");
    if (severity === "elevated") return this.t("elevatedStatus");
    return this.t("available");
  }

  private blockerLabel(blocker: AccountViewModel["blocker"]): string {
    if (blocker === "spend") return this.t("blockerSpend");
    if (blocker === "credits") return this.t("blockerCredits");
    if (blocker === "usage_limit") return this.t("blockerUsage");
    return this.t("blockerUnknown");
  }

  private limitLabel(limit: LimitViewModel): string {
    const closeTo = (expected: number): boolean =>
      limit.duration_seconds !== null &&
      limit.duration_seconds >= expected * 0.95 &&
      limit.duration_seconds <= expected * 1.05;
    if (closeTo(18_000)) return this.t("fiveHours");
    if (closeTo(604_800)) return this.t("week");
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

  private valueVisible(section: SectionKey, key: string): boolean {
    return this.config.sections[section].values[key] !== false;
  }

  private renderLimit(limit: LimitViewModel, primary: boolean): TemplateResult {
    const used =
      limit.used_percent ??
      (limit.remaining_percent === null ? null : 100 - limit.remaining_percent);
    const remaining = limit.remaining_percent ?? (used === null ? null : 100 - used);
    const content = html` <div class="limit-head">
        <span>${this.limitLabel(limit)}</span>
        ${
          this.config.sections.resets.visible &&
          this.valueVisible("resets", limit.id) &&
          limit.resets_at
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
                <strong>${formatPercent(used, this.locale)}</strong>
              </div>`
            : html`<strong class="limit-value">${formatPercent(used, this.locale)}</strong>`
        }
        <div class="limit-copy">
          <strong>${formatPercent(remaining, this.locale)} ${this.t("remaining")}</strong>
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
            this.config.sections.pace.visible &&
            this.valueVisible("pace", limit.id) &&
            limit.pace !== null
              ? html`<small
                  >${this.t("pace")}: ${formatNumber(Math.abs(limit.pace), this.locale)}
                  ${this.t("percentagePoints")}
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
    const detailed = this.config.display_mode === "detailed";
    const showCreditBalance = this.valueVisible("credits", "balance");
    const showCreditState = detailed && this.valueVisible("credits", "state");
    if (
      this.config.sections.credits.visible &&
      account.credits &&
      (showCreditBalance || showCreditState)
    ) {
      const state = account.credits.unlimited
        ? this.t("unlimited")
        : account.credits.has_credits
          ? this.t("available")
          : this.t("unavailable");
      cards.push(
        html`<div class="detail panel" data-detail="credits">
          <span>${this.t("credits")}</span
          ><strong data-credit-key=${showCreditBalance ? "balance" : "state"}
            >${
              showCreditBalance
                ? account.credits.unlimited
                  ? "∞"
                  : formatDecimal(account.credits.balance, this.locale)
                : state
            }</strong
          >
          ${
            showCreditState && showCreditBalance
              ? html`<small data-credit-key="state">${this.t("creditState")}: ${state}</small>`
              : nothing
          }
        </div>`,
      );
    }
    const showResetCount = this.valueVisible("credits", "reset_credits");
    const showResetDetails =
      detailed &&
      (this.valueVisible("credits", "total_earned") || this.valueVisible("credits", "next_expiry"));
    if (
      this.config.sections.credits.visible &&
      account.reset_credits &&
      (showResetCount || showResetDetails)
    ) {
      cards.push(
        html`<div class="detail panel" data-detail="reset-credits">
          <span>${this.t("resetCredits")}</span>
          <strong
            >${
              showResetCount
                ? formatNumber(account.reset_credits.available_count, this.locale)
                : "—"
            }</strong
          >
          ${
            detailed
              ? html`<div class="metrics">
                  ${
                    this.valueVisible("credits", "total_earned")
                      ? html`<small data-credit-key="total_earned"
                          >${this.t("totalEarned")}:
                          ${formatNumber(account.reset_credits.total_earned, this.locale)}</small
                        >`
                      : nothing
                  }
                  ${
                    this.valueVisible("credits", "next_expiry") && account.reset_credits.next_expiry
                      ? html`<small data-credit-key="next_expiry"
                          >${this.t("nextExpiry")}:
                          ${this.resetLabel(account.reset_credits.next_expiry)}</small
                        >`
                      : nothing
                  }
                </div>`
              : nothing
          }
        </div>`,
      );
    }
    if (this.config.sections.spending.visible && account.spend) {
      const spendCandidates: Array<[string, string | number | null]> = [
        ["remaining", account.spend.remaining],
        ["limit", account.spend.limit],
        ["used", account.spend.used],
        ["used_percent", account.spend.used_percent],
      ];
      const primarySpend = spendCandidates.find(
        ([key, value]) => this.valueVisible("spending", key) && value !== null,
      );
      const showSpendDetails =
        detailed &&
        ["used", "limit", "used_percent", "source", "reset"].some((key) =>
          this.valueVisible("spending", key),
        );
      if (primarySpend || showSpendDetails) {
        const [primarySpendKey, primarySpendValue] = primarySpend ?? ["remaining", null];
        cards.push(
          html`<div class="detail panel" data-detail="spending">
            <span>${this.t("spending")}</span
            ><strong data-spend-key=${primarySpendKey}
              >${
                primarySpendKey === "used_percent"
                  ? formatPercent(primarySpendValue as number | null, this.locale)
                  : formatDecimal(primarySpendValue as string | null, this.locale)
              }</strong
            >
            ${
              detailed
                ? html`<div class="metrics">
                    ${
                      this.valueVisible("spending", "used")
                        ? html`<small data-spend-key="used"
                            >${this.t("used")}:
                            ${formatDecimal(account.spend.used, this.locale)}</small
                          >`
                        : nothing
                    }
                    ${
                      this.valueVisible("spending", "limit")
                        ? html`<small data-spend-key="limit"
                            >${this.t("limit")}:
                            ${formatDecimal(account.spend.limit, this.locale)}</small
                          >`
                        : nothing
                    }
                    ${
                      this.valueVisible("spending", "used_percent")
                        ? html`<small data-spend-key="used_percent"
                            >${this.t("usage")}:
                            ${formatPercent(account.spend.used_percent, this.locale)}</small
                          >`
                        : nothing
                    }
                    ${
                      this.valueVisible("spending", "source") && account.spend.source
                        ? html`<small data-spend-key="source"
                            >${this.t("source")}: ${account.spend.source}</small
                          >`
                        : nothing
                    }
                    ${
                      this.valueVisible("spending", "reset") && account.spend.resets_at
                        ? html`<small data-spend-key="reset"
                            >${this.t("resets")}: ${this.resetLabel(account.spend.resets_at)}</small
                          >`
                        : nothing
                    }
                  </div>`
                : this.valueVisible("spending", "used_percent") &&
                    account.spend.used_percent !== null
                  ? html`<small
                      >${formatPercent(account.spend.used_percent, this.locale)}
                      ${this.t("used")}</small
                    >`
                  : nothing
            }
          </div>`,
        );
      }
    }
    if (this.config.sections.profile.visible && account.profile) {
      const fields =
        this.config.display_mode === "detailed"
          ? PROFILE_FIELDS
          : PROFILE_FIELDS.filter((field) =>
              ["lifetime_tokens", "total_threads"].includes(field.key),
            );
      cards.push(
        html`<div class="detail profile panel">
          <span>${this.t("profile")}</span>
          <div class="profile-metrics">
            ${fields.map((field) => {
              if (!this.valueVisible("profile", field.key)) return nothing;
              const value = account.profile?.[field.key];
              if (value === null || value === undefined) return nothing;
              const formatted =
                typeof value === "number"
                  ? field.key === "fast_mode_usage_percentage" ||
                    field.key === "most_used_reasoning_effort_percentage"
                    ? formatPercent(value, this.locale)
                    : formatNumber(value, this.locale, field.compact)
                  : formatMetricLabel(value);
              return html`<div class="profile-value" data-profile-key=${field.key}>
                <strong>${formatted}${field.suffix ? ` ${this.t(field.suffix)}` : ""}</strong>
                <small>${this.t(field.label)}</small>
              </div>`;
            })}
          </div>
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
    const severity = this.error && this.snapshot ? "stale" : (view?.severity ?? "missing");
    const multipleAccounts =
      Boolean(view && view.accounts.length > 1) && this.config.account_mode !== "single";
    const plan = formatPlanLabel(account?.plan ?? null);
    const subtitle = account
      ? multipleAccounts
        ? `${account.name}${plan ? ` · ${plan}` : ""}`
        : plan
      : "";
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
            ${subtitle ? html`<p>${subtitle}</p>` : nothing}
          </div>
          <span class="status"
            ><i></i>${multipleAccounts ? `${this.t("overall")} · ` : ""}${this.statusLabel(
              severity,
            )}</span
          >
        </header>
        ${
          multipleAccounts && view && this.config.allow_account_switching
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
          account?.blocker
            ? html`<div class="blocker-note">${this.blockerLabel(account.blocker)}</div>`
            : nothing
        }
        ${
          !account
            ? html`<div class="empty">${this.t("unavailable")}</div>`
            : this.config.sections.limits.visible
              ? limits.length
                ? html`<main class="limits">
                    ${limits.map((item, index) =>
                      this.renderLimit(item, index === 0 && this.config.display_mode !== "compact"),
                    )}
                  </main>`
                : html`<div class="empty">
                    ${this.error ? this.t("unavailable") : this.t("noData")}
                  </div>`
              : nothing
        }
        ${account ? this.renderDetails(account) : nothing}
        ${
          account && this.config.sections.footer.visible
            ? html`<footer>
                ${
                  this.valueVisible("footer", "updated")
                    ? html`<span
                        >${this.t("updated")}: ${this.resetLabel(account.updated_at)}</span
                      >`
                    : nothing
                }
                ${
                  this.valueVisible("footer", "version")
                    ? html`<span>v${view?.integrationVersion}</span>`
                    : nothing
                }
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
    .blocker-note {
      margin: 0 0 12px;
      padding: 9px 11px;
      border-radius: calc(var(--codex-usage-panel-radius, var(--panel-radius)) * 0.7);
      border: 1px solid color-mix(in srgb, var(--state-color) 55%, transparent);
      background: color-mix(in srgb, var(--state-color) 11%, transparent);
      color: var(--state-color);
      font-size: 0.78rem;
      font-weight: 650;
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
    .metrics {
      display: grid;
      gap: 3px;
      margin-top: 4px;
    }
    .profile {
      grid-column: 1 / -1;
    }
    .profile-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      gap: 8px;
      margin-top: 5px;
    }
    .profile-value {
      display: grid;
      gap: 2px;
      padding: 9px;
      border-radius: calc(var(--codex-usage-panel-radius, var(--panel-radius)) * 0.65);
      background: color-mix(in srgb, var(--primary-background-color) 48%, transparent);
    }
    .profile-value strong {
      overflow-wrap: anywhere;
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

  private toggleValue(section: SectionKey, key: string): void {
    const next = structuredClone(this.config);
    next.sections[section].values[key] = next.sections[section].values[key] === false;
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

  private updateColors(event: CustomEvent<{ value: Record<string, unknown> }>): void {
    event.stopPropagation();
    this.emitConfig(normalizeConfig({ ...this.config, colors: event.detail.value }));
  }

  private readonly computeLabel = (schema: { name?: string }): string => {
    const labels: Record<string, TranslationKey> = {
      title: "cardTitle",
      display_mode: "displayMode",
      account_mode: "accountMode",
      selected_entry_id: "selectedAccount",
      included_entry_ids: "includedAccounts",
      allow_account_switching: "accountSwitching",
      show_unavailable_limits: "showUnavailable",
      stale_after_minutes: "staleAfter",
      elevated: "elevatedStatus",
      critical: "criticalStatus",
      normal: "colorNormal",
      blocked: "colorBlocked",
      stale: "colorStale",
      missing: "colorMissing",
      card_radius: "cardRadius",
      panel_radius: "panelRadius",
      spacing: "spacing",
    };
    if (schema.name === "critical") return this.t("colorCritical");
    const label = schema.name ? labels[schema.name] : undefined;
    return label ? this.t(label) : (schema.name ?? "");
  };

  private valueOptions(section: SectionKey): Array<{ key: string; label: string }> {
    if (["limits", "resets", "pace"].includes(section)) {
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
        { key: "state", label: this.t("creditState") },
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
      {
        name: "display_mode",
        selector: {
          select: {
            mode: "dropdown",
            options: [
              { value: "adaptive", label: this.t("displayAdaptive") },
              { value: "compact", label: this.t("displayCompact") },
              { value: "detailed", label: this.t("displayDetailed") },
            ],
          },
        },
      },
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
                  ><input
                    type="checkbox"
                    .checked=${this.config.sections[key].visible}
                    @change=${() => this.toggleSection(key)}
                  />${this.sectionLabel(key)}</label
                >
                ${
                  this.config.sections[key].visible && this.valueOptions(key).length > 0
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
            { name: "elevated", selector: { number: { min: 0, max: 99, mode: "slider" } } },
            { name: "critical", selector: { number: { min: 1, max: 100, mode: "slider" } } },
          ]}
          .computeLabel=${this.computeLabel}
          @value-changed=${this.updateThresholds}
        ></ha-form>
        <h4>${this.t("semanticColors")}</h4>
        <ha-form
          .hass=${this.hass}
          .data=${this.config.colors}
          .schema=${[
            { name: "normal", selector: { text: {} } },
            { name: "elevated", selector: { text: {} } },
            { name: "critical", selector: { text: {} } },
            { name: "blocked", selector: { text: {} } },
            { name: "stale", selector: { text: {} } },
            { name: "missing", selector: { text: {} } },
          ]}
          .computeLabel=${this.computeLabel}
          @value-changed=${this.updateColors}
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
