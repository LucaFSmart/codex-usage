import { LitElement, css, html, nothing, type PropertyValues, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import { fetchCardSnapshot } from "./card-data";
import { DEFAULT_CONFIG, normalizeConfig } from "./config";
import {
  formatAbsoluteReset,
  formatMetricLabel,
  formatNumber,
  formatPlanLabel,
  formatDecimal,
  relativeDurationUntil,
} from "./format";
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
import { buildCardViewModel, isSectionVisible } from "./view-model";

const CARD_DATA_EVENT = "codex_usage_card_data_updated";

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

const STATUS_LABEL_KEY: Record<Severity, TranslationKey> = {
  unknown: "severityUnknown",
  ok: "severityOk",
  warning: "severityWarning",
  critical: "severityCritical",
  blocked: "severityBlocked",
};

function formatPercent(value: number | null, locale: string | undefined): string {
  return value === null
    ? "—"
    : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)}%`;
}

function truncateId(id: string): string {
  return id.length > 4 ? `…${id.slice(-4)}` : id;
}

@customElement("codex-usage-card")
export class CodexUsageCard extends LitElement {
  @property({ attribute: false }) public accessor hass: HomeAssistant | undefined = undefined;
  @state() private accessor snapshot: CardSnapshot | undefined = undefined;
  @state() private accessor error = false;
  @state() private accessor sessionEntryId: string | undefined = undefined;
  @state() private accessor detailsExpanded = true;
  @state() private accessor now = new Date();

  private config: CodexUsageCardConfig = structuredClone(DEFAULT_CONFIG);
  private unsubscribe: (() => void) | undefined;
  private subscribedConnection: HomeAssistant["connection"] | undefined;
  private loading = false;
  private minuteTimer: ReturnType<typeof setInterval> | undefined;

  public override connectedCallback(): void {
    super.connectedCallback();
    this.startMinuteTimer();
  }

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
    this.detailsExpanded = !this.config.compact;
    this.requestUpdate();
  }

  public getGridOptions(): Record<string, number> {
    return { columns: 6, min_columns: 3, max_columns: 12 };
  }

  public getCardSize(): number {
    return this.detailsExpanded ? 7 : 4;
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
    this.stopMinuteTimer();
  }

  private startMinuteTimer(): void {
    if (this.minuteTimer) return;
    this.minuteTimer = setInterval(() => {
      this.now = new Date();
    }, 60_000);
  }

  private stopMinuteTimer(): void {
    if (this.minuteTimer) clearInterval(this.minuteTimer);
    this.minuteTimer = undefined;
  }

  private async startClient(): Promise<void> {
    if (!this.hass) return;
    const needsInitialLoad = this.subscribedConnection !== this.hass.connection || !this.snapshot;
    if (this.subscribedConnection !== this.hass.connection) {
      this.unsubscribe?.();
      this.unsubscribe = undefined;
      const connection = this.hass.connection;
      this.subscribedConnection = connection;
      try {
        const unsubscribe = await connection.subscribeEvents(
          () => void this.loadSnapshot(),
          CARD_DATA_EVENT,
        );
        if (this.subscribedConnection !== connection) {
          unsubscribe();
        } else {
          this.unsubscribe = unsubscribe;
        }
      } catch {
        if (this.subscribedConnection === connection) {
          this.error = true;
          this.subscribedConnection = undefined;
        }
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

  private t(key: TranslationKey, values?: Record<string, string | number>): string {
    return localize(this.hass?.locale?.language ?? this.hass?.language, key, values);
  }

  private get locale(): string | undefined {
    return this.hass?.locale?.language ?? this.hass?.language;
  }

  private statusLabel(severity: Severity): string {
    return this.t(STATUS_LABEL_KEY[severity]);
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

  private absoluteResetLabel(value: string | null): string {
    return formatAbsoluteReset(value, this.locale);
  }

  private relativeResetLabel(value: string | null): string {
    const duration = relativeDurationUntil(value, this.now);
    if (!duration) return "—";
    const { totalMinutes, days, hours, minutes } = duration;
    if (totalMinutes === 0) return this.t("resetsImminently");
    if (totalMinutes < 60) return this.t("resetsInMinutes", { minutes: totalMinutes });
    if (days === 0) {
      return minutes === 0
        ? this.t("resetsInHours", { hours })
        : this.t("resetsInHoursMinutes", { hours, minutes });
    }
    if (days < 7) {
      return hours === 0
        ? this.t("resetsInDays", { days })
        : this.t("resetsInDaysHours", { days, hours });
    }
    return this.t("resetsInDays", { days });
  }

  private calloutLabel(account: AccountViewModel): string | null {
    if (account.blocker === "spend") return this.t("mostConstrainedBlockedSpend");
    if (account.blocker === "credits") return this.t("mostConstrainedBlockedCredits");
    if (account.blocker === "unknown") return this.t("mostConstrainedBlockedUnknown");
    if (account.limit_summary?.reason === "additional_limit") {
      const restricted = account.limit_statuses?.find((item) => item.reached === true);
      return restricted
        ? this.t("restrictionNamed", { limit: restricted.name })
        : this.t("restrictionSomeLimit");
    }
    const limit = account.mostConstrainedLimit;
    if (!limit) return null;
    if (account.blocker === "usage_limit" || limit.reached) {
      return this.t("mostConstrainedBlockedUsage", { limit: this.limitLabel(limit) });
    }
    if (limit.severity === "warning" || limit.severity === "critical") {
      return this.t("mostConstrainedLowRemaining", {
        limit: this.limitLabel(limit),
        percent: formatNumber(limit.remaining_percent, this.locale),
      });
    }
    return this.t("mostConstrainedTightest", { limit: this.limitLabel(limit) });
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

  private eligibleLimits(
    account: AccountViewModel,
    source: "main" | "additional",
  ): LimitViewModel[] {
    const sectionKey: SectionKey = source === "main" ? "limits" : "additional_limits";
    return account.limits.filter(
      (item) =>
        item.source === source &&
        this.config.sections[sectionKey].values[item.id] !== false &&
        (source === "main" ||
          this.config.show_unavailable_limits ||
          item.used_percent !== null ||
          item.remaining_percent !== null),
    );
  }

  private renderLimitRow(limit: LimitViewModel, ring: boolean): TemplateResult {
    const used =
      limit.used_percent ??
      (limit.remaining_percent === null ? null : 100 - limit.remaining_percent);
    const remaining = limit.remaining_percent ?? (used === null ? null : 100 - used);
    const content = html` <div class="limit-head">
        <span class="limit-name">${this.limitLabel(limit)}</span>
        ${
          this.config.sections.resets.visible &&
          this.valueVisible("resets", limit.id) &&
          limit.resets_at
            ? html`<span class="limit-relative">${this.relativeResetLabel(limit.resets_at)}</span>`
            : nothing
        }
      </div>
      <div class="limit-body">
        <div class="limit-metric">
          ${
            ring
              ? html`<div class="ring" style=${`--progress:${remaining ?? 0}`} aria-hidden="true">
                  <strong>${formatPercent(remaining, this.locale)}</strong>
                </div>`
              : html`<strong class="limit-value">${formatPercent(remaining, this.locale)}</strong>`
          }
          <span class="limit-remaining-label">${this.t("remaining")}</span>
        </div>
        <div class="limit-copy">
          <div
            class="bar"
            role="progressbar"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuetext=${formatPercent(remaining, this.locale)}
            aria-valuenow=${remaining === null ? nothing : remaining}
          >
            <span style=${`width:${remaining ?? 0}%`}></span>
          </div>
          <span class="limit-used"
            >${formatPercent(used, this.locale)} ${this.t("usedInline")}</span
          >
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
      </div>
      ${
        this.config.sections.resets.visible &&
        this.valueVisible("resets", limit.id) &&
        limit.resets_at
          ? html`<small class="limit-absolute"
              >${this.t("resets")}: ${this.absoluteResetLabel(limit.resets_at)}</small
            >`
          : nothing
      }`;
    return limit.entity_id
      ? html`<button
          class="limit-row"
          data-limit-id=${limit.id}
          @click=${() => this.openMoreInfo(limit.entity_id)}
        >
          ${content}
        </button>`
      : html`<div class="limit-row" data-limit-id=${limit.id}>${content}</div>`;
  }

  private renderBudgetRows(account: AccountViewModel): TemplateResult | typeof nothing {
    if (!isSectionVisible("budget", this.config.sections.budget.visible, account)) return nothing;
    const rows = account.limits.flatMap((limit) => {
      if (
        !this.valueVisible("budget", limit.id) ||
        limit.budget_pph === null ||
        limit.budget_pph === undefined
      )
        return [];
      const remaining = relativeDurationUntil(limit.resets_at, this.now);
      if (!remaining || remaining.totalMinutes < 1) return [];
      const perDay = (limit.duration_seconds ?? 0) >= 86_400;
      const value = perDay ? limit.budget_pph * 24 : limit.budget_pph;
      return [
        html`<div class="info-row" data-budget-id=${limit.id}>
          <span class="info-label">${this.limitLabel(limit)}</span
          ><span class="info-value"
            >${formatNumber(value, this.locale)} ${perDay ? "pp/day" : "pp/h"}</span
          >
        </div>`,
      ];
    });
    return rows.length
      ? html`<div class="section-label">${this.t("budget")}</div>
          ${rows}`
      : nothing;
  }

  private renderSources(account: AccountViewModel): TemplateResult | typeof nothing {
    if (!isSectionVisible("sources", this.config.sections.sources.visible, account)) return nothing;
    const rows = Object.entries(account.sources ?? {}).map(
      ([key, source]) =>
        html`<div class="info-row" data-source=${key}>
          <span class="info-label">${key}</span><span class="info-value">${source.state}</span>
        </div>`,
    );
    return rows.length
      ? html`<div class="section-label">${this.t("sources")}</div>
          ${rows}`
      : this.config.sections.sources.visible === true
        ? html`<div class="info-row"><span class="info-value">—</span></div>`
        : nothing;
  }

  private renderAdditionalLimits(account: AccountViewModel): TemplateResult | typeof nothing {
    if (
      !isSectionVisible(
        "additional_limits",
        this.config.sections.additional_limits.visible,
        account,
      )
    ) {
      return nothing;
    }
    const limits = this.eligibleLimits(account, "additional");
    if (!limits.length) return nothing;
    return html`<div class="section-label">${this.t("sectionAdditionalLimits")}</div>
      ${limits.map((limit) => this.renderLimitRow(limit, false))}`;
  }

  private renderCreditsRows(account: AccountViewModel): TemplateResult | typeof nothing {
    if (
      !isSectionVisible("credits", this.config.sections.credits.visible, account) ||
      !account.credits
    ) {
      return nothing;
    }
    if (!this.valueVisible("credits", "balance")) return nothing;
    const credits = account.credits;
    const value = credits.unlimited
      ? this.t("unlimitedCredits")
      : credits.balance !== null
        ? credits.has_credits === false
          ? `${this.t("balance")}: ${formatDecimal(credits.balance, this.locale)}`
          : this.t("creditsAvailableAmount", {
              amount: formatDecimal(credits.balance, this.locale),
            })
        : credits.has_credits === false
          ? this.t("unavailable")
          : this.t("creditsAvailableAmount", {
              amount: "—",
            });
    return html`<div class="info-row" data-detail="credits">
      <span class="info-label">${this.t("credits")}</span>
      <span class="info-value">${value}</span>
    </div>`;
  }

  private renderResetCreditsRows(account: AccountViewModel): TemplateResult | typeof nothing {
    if (
      !isSectionVisible("credits", this.config.sections.credits.visible, account) ||
      !account.reset_credits ||
      !this.valueVisible("credits", "reset_credits")
    ) {
      return nothing;
    }
    const resetCredits = account.reset_credits;
    const availableCount = resetCredits.available_count ?? 0;
    const rows: TemplateResult[] = [
      html`<div class="info-row" data-detail="reset-credits">
        <span class="info-label">${this.t("resetCredits")}</span>
        <span class="info-value"
          >${this.t(availableCount === 1 ? "resetCreditAvailable" : "resetCreditsAvailable", {
            count: availableCount,
          })}</span
        >
      </div>`,
    ];
    if (this.valueVisible("credits", "total_earned") && resetCredits.total_earned !== null) {
      rows.push(
        html`<div class="info-row" data-credit-key="total_earned">
          <span class="info-label">${this.t("totalEarned")}</span>
          <span class="info-value">${formatNumber(resetCredits.total_earned, this.locale)}</span>
        </div>`,
      );
    }
    if (this.valueVisible("credits", "next_expiry") && resetCredits.next_expiry) {
      rows.push(
        html`<div class="info-row" data-credit-key="next_expiry">
          <span class="info-label">${this.t("nextExpiry")}</span>
          <span class="info-value"
            >${this.t("expiresOn", { date: this.absoluteResetLabel(resetCredits.next_expiry) })}</span
          >
        </div>`,
      );
    }
    return html`${rows}`;
  }

  private renderSpendingRows(account: AccountViewModel): TemplateResult | typeof nothing {
    if (
      !isSectionVisible("spending", this.config.sections.spending.visible, account) ||
      !account.spend
    ) {
      return nothing;
    }
    const spend = account.spend;
    const candidates: Array<[string, string | number | null]> = [
      ["remaining", spend.remaining],
      ["limit", spend.limit],
      ["used", spend.used],
      ["used_percent", spend.used_percent],
    ];
    const primary = candidates.find(
      ([key, value]) => this.valueVisible("spending", key) && value !== null,
    );
    if (!primary) return nothing;
    const [primaryKey, primaryValue] = primary;
    const rows: TemplateResult[] = [
      html`<div class="info-row" data-detail="spending">
        <span class="info-label">${this.t("spending")}</span>
        <span class="info-value"
          >${
            primaryKey === "used_percent"
              ? formatPercent(primaryValue as number | null, this.locale)
              : formatDecimal(primaryValue as string | null, this.locale)
          }</span
        >
      </div>`,
    ];
    if (this.valueVisible("spending", "used_percent") && spend.used_percent !== null) {
      rows.push(
        html`<div
          class="bar bar--mini"
          role="progressbar"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow=${spend.used_percent}
        >
          <span style=${`width:${spend.used_percent}%`}></span>
        </div>`,
      );
      rows.push(
        html`<div class="info-row" data-spend-key="used_percent">
          <span class="info-label">${this.t("usage")}</span>
          <span class="info-value">${formatPercent(spend.used_percent, this.locale)}</span>
        </div>`,
      );
    }
    if (this.valueVisible("spending", "used") && spend.used !== null) {
      rows.push(
        html`<div class="info-row" data-spend-key="used">
          <span class="info-label">${this.t("used")}</span>
          <span class="info-value">${formatDecimal(spend.used, this.locale)}</span>
        </div>`,
      );
    }
    if (this.valueVisible("spending", "limit") && spend.limit !== null) {
      rows.push(
        html`<div class="info-row" data-spend-key="limit">
          <span class="info-label">${this.t("limit")}</span>
          <span class="info-value">${formatDecimal(spend.limit, this.locale)}</span>
        </div>`,
      );
    }
    if (this.valueVisible("spending", "source") && spend.source) {
      rows.push(
        html`<div class="info-row" data-spend-key="source">
          <span class="info-label">${this.t("source")}</span>
          <span class="info-value">${spend.source}</span>
        </div>`,
      );
    }
    if (this.valueVisible("spending", "reset") && spend.resets_at) {
      rows.push(
        html`<div class="info-row" data-spend-key="reset">
          <span class="info-label">${this.t("resets")}</span>
          <span class="info-value">${this.absoluteResetLabel(spend.resets_at)}</span>
        </div>`,
      );
    }
    return html`${rows}`;
  }

  private renderProfileRows(account: AccountViewModel): TemplateResult | typeof nothing {
    if (
      !isSectionVisible("profile", this.config.sections.profile.visible, account) ||
      !account.profile
    ) {
      return nothing;
    }
    const rows = PROFILE_FIELDS.flatMap((field) => {
      if (!this.valueVisible("profile", field.key)) return [];
      const value = account.profile?.[field.key];
      if (value === null || value === undefined) return [];
      const formatted =
        typeof value === "number"
          ? field.key === "fast_mode_usage_percentage" ||
            field.key === "most_used_reasoning_effort_percentage"
            ? formatPercent(value, this.locale)
            : formatNumber(value, this.locale, field.compact)
          : formatMetricLabel(value);
      const display = `${formatted}${field.suffix ? ` ${this.t(field.suffix)}` : ""}`;
      return [
        html`<div class="info-row" data-profile-key=${field.key}>
          <span class="info-label">${this.t(field.label)}</span>
          <span class="info-value">${display}</span>
        </div>`,
      ];
    });
    return rows.length ? html`${rows}` : nothing;
  }

  private renderAccountRows(account: AccountViewModel): TemplateResult | typeof nothing {
    if (!isSectionVisible("account", this.config.sections.account.visible, account)) return nothing;
    const rows: TemplateResult[] = [];
    if (this.valueVisible("account", "plan") && account.plan) {
      rows.push(
        html`<div class="info-row">
          <span class="info-label">${this.t("planLabel")}</span>
          <span class="info-value">${formatPlanLabel(account.plan)}</span>
        </div>`,
      );
    }
    if (this.valueVisible("account", "workspace")) {
      rows.push(
        html`<div class="info-row">
          <span class="info-label">${this.t("workspace")}</span>
          <span class="info-value">${account.name}</span>
        </div>`,
      );
    }
    if (this.valueVisible("account", "account_id")) {
      rows.push(
        html`<div class="info-row">
          <span class="info-label">${this.t("accountId")}</span>
          <span class="info-value">${truncateId(account.id)}</span>
        </div>`,
      );
    }
    return rows.length
      ? html`<div class="account-details" data-detail="account">${rows}</div>`
      : nothing;
  }

  private renderDetails(account: AccountViewModel): TemplateResult | typeof nothing {
    const creditsRows = this.renderCreditsRows(account);
    const resetCreditsRows = this.renderResetCreditsRows(account);
    const spendingRows = this.renderSpendingRows(account);
    const profileRows = this.renderProfileRows(account);
    const accountRows = this.renderAccountRows(account);
    const budgetRows = this.renderBudgetRows(account);
    const sourceRows = this.renderSources(account);

    const sections = [
      this.renderAdditionalLimits(account),
      creditsRows !== nothing || resetCreditsRows !== nothing
        ? html`<div class="section-label">${this.t("sectionCredits")}</div>
            ${creditsRows}${resetCreditsRows}`
        : nothing,
      spendingRows !== nothing
        ? html`<div class="section-label">${this.t("sectionSpending")}</div>
            ${spendingRows}`
        : nothing,
      profileRows !== nothing
        ? html`<div class="section-label">${this.t("sectionProfile")}</div>
            ${profileRows}`
        : nothing,
      accountRows !== nothing
        ? html`<div class="section-label">${this.t("sectionAccount")}</div>
            ${accountRows}`
        : nothing,
      budgetRows,
      sourceRows,
    ].filter((section) => section !== nothing);
    return sections.length ? html`<div class="details">${sections}</div>` : nothing;
  }

  protected override render(): TemplateResult {
    const view = this.snapshot
      ? buildCardViewModel(this.snapshot, this.config, this.sessionEntryId, this.now)
      : null;
    const account = view?.selectedAccount ?? null;
    const severity: Severity = view?.severity ?? "unknown";
    const stale = this.error ? true : (view?.stale ?? false);
    const multipleAccounts =
      Boolean(view && view.accounts.length > 1) && this.config.account_mode !== "single";
    const plan = formatPlanLabel(account?.plan ?? null);
    const subtitle = account
      ? multipleAccounts
        ? `${account.name}${plan ? ` · ${plan}` : ""}`
        : plan
      : "";
    const primaryLimits = account ? this.eligibleLimits(account, "main") : [];
    const detailsContent = account ? this.renderDetails(account) : nothing;
    const hasDetails = detailsContent !== nothing;
    const callout = account ? this.calloutLabel(account) : null;
    const color = this.config.colors[severity];
    const style = `--state-color:${color};--card-radius:${this.config.appearance.card_radius}px;--card-spacing:${this.config.appearance.spacing}px`;

    return html`<ha-card class="${severity}${stale ? " stale" : ""}" style=${style}>
      <div class="surface">
        <header>
          <div>
            <h2>${this.config.title}</h2>
            ${subtitle ? html`<p>${subtitle}</p>` : nothing}
          </div>
          <span class="status"
            >${multipleAccounts ? `${this.t("overall")} · ` : ""}${this.statusLabel(severity)}</span
          >
        </header>
        ${
          stale
            ? html`<p class="freshness">
                ${this.t("dataMayBeOutdated")}${
                  account
                    ? html` · ${this.t("updated")}: ${this.absoluteResetLabel(account.updated_at)}`
                    : nothing
                }
              </p>`
            : nothing
        }
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
        ${account && callout ? html`<p class="callout">${callout}</p>` : nothing}
        ${
          !account
            ? html`<div class="empty">${this.t("unavailable")}</div>`
            : this.config.sections.limits.visible
              ? primaryLimits.length
                ? html`<main class="limits">
                    ${primaryLimits.map((item) => this.renderLimitRow(item, true))}
                  </main>`
                : html`<div class="empty">
                    ${this.error ? this.t("unavailable") : this.t("noData")}
                  </div>`
              : nothing
        }
        ${
          hasDetails
            ? html`<button
                class="details-toggle"
                @click=${() => (this.detailsExpanded = !this.detailsExpanded)}
              >
                <span>${this.t(this.detailsExpanded ? "hideDetails" : "showDetails")}</span>
                <i class="chevron ${this.detailsExpanded ? "open" : ""}"></i>
              </button>`
            : nothing
        }
        ${hasDetails && this.detailsExpanded ? detailsContent : nothing}
        ${
          account && this.config.sections.footer.visible
            ? html`<footer>
                ${
                  this.valueVisible("footer", "updated")
                    ? html`<span
                        >${this.t("updated")}: ${this.absoluteResetLabel(account.updated_at)}</span
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
      --codex-space-1: 4px;
      --codex-space-2: 8px;
      --codex-space-3: 12px;
      --codex-space-4: 16px;
      --codex-space-5: 24px;
      --codex-progress-height: 6px;
      --codex-chip-height: 22px;
      --codex-icon-size: 16px;
      --codex-radius: 8px;
      --codex-secondary-opacity: 0.62;
    }
    ha-card {
      display: block;
      --state-color: var(--codex-usage-ok-color, #25b7f3);
      position: relative;
      overflow: hidden;
      border-radius: var(--codex-usage-card-radius, var(--card-radius));
      border: 1px solid color-mix(in srgb, var(--state-color) 45%, var(--divider-color));
      background: var(--ha-card-background, var(--card-background-color));
      box-shadow: var(--ha-card-box-shadow, none);
      transition: border-color 0.25s ease;
    }
    ha-card::before {
      content: "";
      position: absolute;
      inset: 0 auto 0 0;
      width: 3px;
      background: var(--state-color);
      opacity: 0.85;
    }
    .surface {
      padding: var(--codex-usage-spacing, var(--card-spacing, var(--codex-space-4)));
      display: grid;
      gap: var(--codex-space-4);
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: var(--codex-space-4);
    }
    h2 {
      margin: 0;
      font-size: 1.2rem;
      font-weight: 650;
      letter-spacing: -0.01em;
    }
    p {
      margin: var(--codex-space-1) 0 0;
      color: var(--secondary-text-color);
      font-size: 0.82rem;
    }
    .status {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      height: var(--codex-chip-height);
      padding: 0 var(--codex-space-2);
      border-radius: 999px;
      background: color-mix(in srgb, var(--state-color) 15%, transparent);
      color: var(--state-color);
      font-size: 0.74rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .freshness {
      margin: calc(-1 * var(--codex-space-2)) 0 0;
      font-size: 0.76rem;
      opacity: var(--codex-secondary-opacity);
    }
    .callout {
      margin: 0;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--state-color);
    }
    nav {
      display: flex;
      gap: var(--codex-space-2);
      overflow-x: auto;
      scrollbar-width: none;
    }
    button {
      font: inherit;
      color: inherit;
      background: none;
      border: none;
      padding: 0;
    }
    .account-chip {
      border: 1px solid var(--divider-color);
      border-radius: 999px;
      padding: var(--codex-space-1) var(--codex-space-2);
      display: flex;
      gap: var(--codex-space-1);
      align-items: center;
      cursor: pointer;
    }
    .account-chip i {
      width: 7px;
      height: 7px;
      background: var(--chip-color);
      border-radius: 50%;
    }
    .account-chip.selected {
      border-color: var(--state-color);
      color: var(--state-color);
    }
    .limits {
      display: grid;
      gap: var(--codex-space-4);
    }
    .limit-row {
      display: block;
      width: 100%;
      text-align: left;
      min-width: 0;
    }
    button.limit-row {
      cursor: pointer;
    }
    .limit-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--codex-space-2);
    }
    .limit-name {
      font-weight: 650;
      font-size: 0.95rem;
    }
    .limit-relative {
      font-size: 0.76rem;
      color: var(--secondary-text-color);
    }
    .limit-body {
      display: flex;
      align-items: center;
      gap: var(--codex-space-3);
      margin-top: var(--codex-space-2);
    }
    .limit-metric {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--codex-space-1);
    }
    .limit-remaining-label {
      font-size: 0.66rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--secondary-text-color);
      opacity: var(--codex-secondary-opacity);
    }
    .ring {
      --progress: 0;
      width: 56px;
      height: 56px;
      flex: 0 0 56px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background:
        radial-gradient(
          circle,
          var(--ha-card-background, var(--card-background-color)) 60%,
          transparent 62%
        ),
        conic-gradient(
          var(--state-color) calc(var(--progress) * 1%),
          color-mix(in srgb, var(--divider-color) 65%, transparent) 0
        );
    }
    .ring strong {
      font-size: 1rem;
    }
    .limit-value {
      font-size: 1.6rem;
      font-weight: 650;
      min-width: 60px;
      text-align: center;
    }
    .limit-copy {
      flex: 1;
      min-width: 0;
      display: grid;
      gap: var(--codex-space-1);
    }
    .bar {
      height: var(--codex-progress-height);
      overflow: hidden;
      border-radius: 99px;
      background: color-mix(in srgb, var(--divider-color) 65%, transparent);
    }
    .bar span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--state-color);
      transition: width 0.2s ease;
    }
    .bar--mini {
      margin-top: var(--codex-space-1);
    }
    .limit-used,
    small {
      color: var(--secondary-text-color);
      font-size: 0.76rem;
    }
    .limit-absolute {
      display: block;
      margin-top: var(--codex-space-1);
      color: var(--secondary-text-color);
      opacity: var(--codex-secondary-opacity);
      font-size: 0.72rem;
    }
    .section-label {
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--secondary-text-color);
      opacity: var(--codex-secondary-opacity);
    }
    .section-label:not(:first-child) {
      margin-top: var(--codex-space-2);
    }
    .details {
      display: grid;
      gap: var(--codex-space-4);
      animation: codex-fade-in 180ms ease;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: var(--codex-space-2);
      font-size: 0.85rem;
    }
    .info-label {
      color: var(--secondary-text-color);
    }
    .info-value {
      font-weight: 600;
      text-align: right;
    }
    .account-details {
      display: grid;
      gap: var(--codex-space-2);
    }
    .details-toggle {
      display: inline-flex;
      align-items: center;
      gap: var(--codex-space-2);
      justify-self: start;
      cursor: pointer;
      color: var(--primary-color);
      font-size: 0.8rem;
      font-weight: 600;
    }
    .chevron {
      width: var(--codex-icon-size);
      height: var(--codex-icon-size);
      border-right: 1.5px solid currentColor;
      border-bottom: 1.5px solid currentColor;
      transform: rotate(45deg);
      transition: transform 0.15s ease;
    }
    .chevron.open {
      transform: rotate(-135deg);
    }
    footer {
      display: flex;
      justify-content: space-between;
      gap: var(--codex-space-2);
      color: var(--secondary-text-color);
      font-size: 0.72rem;
      opacity: var(--codex-secondary-opacity);
    }
    .empty {
      padding: var(--codex-space-5) var(--codex-space-2);
      text-align: center;
      color: var(--secondary-text-color);
    }
    button:focus-visible {
      outline: 2px solid var(--state-color);
      outline-offset: 2px;
    }
    @keyframes codex-fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    @media (max-width: 479px) {
      .surface {
        padding: var(--codex-space-3);
      }
      .limit-head {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--codex-space-1);
      }
      footer {
        flex-direction: column;
        gap: var(--codex-space-1);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      ha-card,
      .bar span,
      .chevron {
        transition: none;
      }
      .details {
        animation: none;
      }
    }
  `;
}
