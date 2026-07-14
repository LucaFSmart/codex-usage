export interface LovelaceCardConfig {
  type: string;
  [key: string]: unknown;
  view_layout?: Record<string, unknown>;
  layout_options?: Record<string, unknown>;
  grid_options?: Record<string, unknown>;
  visibility?: unknown[];
}

export type AccountMode = "auto" | "single" | "all";
export type DisplayMode = "adaptive" | "compact" | "detailed";
export type Severity = "missing" | "stale" | "normal" | "elevated" | "critical" | "blocked";
export type SectionKey =
  "limits" | "resets" | "pace" | "profile" | "credits" | "spending" | "footer";

export interface SectionConfig {
  visible: boolean;
  values: Record<string, boolean>;
}

export interface UsageThresholds {
  elevated: number;
  critical: number;
}

export interface CardAppearance {
  card_radius: number;
  panel_radius: number;
  spacing: number;
}

export interface CodexUsageCardConfig extends LovelaceCardConfig {
  account_mode: AccountMode;
  selected_entry_id?: string;
  included_entry_ids: string[];
  allow_account_switching: boolean;
  display_mode: DisplayMode;
  title: string;
  show_unavailable_limits: boolean;
  sections: Record<SectionKey, SectionConfig>;
  thresholds: UsageThresholds;
  colors: Record<Severity, string>;
  stale_after_minutes: number;
  appearance: CardAppearance;
}

export type SafeBlocker = "spend" | "credits" | "usage_limit" | "unknown" | null;

export interface CardLimit {
  id: string;
  name: string;
  source: "main" | "additional";
  duration_seconds: number | null;
  used_percent: number | null;
  remaining_percent: number | null;
  resets_at: string | null;
  reached: boolean;
  entity_id: string | null;
}

export interface CardCredits {
  balance: string | null;
  has_credits: boolean | null;
  unlimited: boolean | null;
  overage_reached: boolean | null;
}

export interface CardSpend {
  source: string | null;
  limit: string | null;
  used: string | null;
  remaining: string | null;
  used_percent: number | null;
  remaining_percent: number | null;
  resets_at: string | null;
  reached: boolean | null;
}

export interface CardAccount {
  id: string;
  name: string;
  plan: string | null;
  available: boolean;
  updated_at: string | null;
  blocker: SafeBlocker;
  limits: CardLimit[];
  credits: CardCredits | null;
  spend: CardSpend | null;
  reset_credits: {
    available_count: number | null;
    total_earned: number | null;
    next_expiry: string | null;
  } | null;
  profile: Record<string, string | number | null> | null;
}

export interface CardSnapshot {
  schema_version: 1;
  integration_version: string;
  generated_at: string;
  accounts: CardAccount[];
}

export interface LimitViewModel extends CardLimit {
  severity: Severity;
  pace: number | null;
}

export interface AccountViewModel extends Omit<CardAccount, "limits"> {
  limits: LimitViewModel[];
  severity: Severity;
  stale: boolean;
}

export interface CardViewModel {
  accounts: AccountViewModel[];
  selectedAccount: AccountViewModel | null;
  severity: Severity;
  generatedAt: Date | null;
  integrationVersion: string;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language: string;
  locale?: { language: string };
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  connection: {
    subscribeEvents<T>(callback: (event: T) => void, eventType: string): Promise<() => void>;
  };
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

declare global {
  interface Window {
    customCards?: Array<Record<string, unknown>>;
  }
}
