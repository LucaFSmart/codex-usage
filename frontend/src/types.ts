export interface LovelaceCardConfig {
  type: string;
  view_layout?: Record<string, unknown>;
  layout_options?: Record<string, unknown>;
}

export type AccountMode = "auto" | "single" | "all";
export type DisplayMode = "compact" | "detailed";
export type Severity = "missing" | "stale" | "normal" | "elevated" | "critical" | "blocked";
export type SectionKey =
  "limits" | "resets" | "pace" | "profile" | "credits" | "spending" | "footer";

export interface SectionConfig {
  visible: boolean;
  expanded: boolean;
  values: Record<string, boolean>;
}

export interface UsageThresholds {
  elevated: number;
  critical: number;
  blocked: number;
}

export interface CardAppearance {
  card_background?: string;
  panel_background?: string;
  card_radius: number;
  panel_radius: number;
  spacing: number;
}

export interface CodexUsageCardConfig extends LovelaceCardConfig {
  account_mode: AccountMode;
  device_id?: string;
  included_device_ids: string[];
  allow_account_switching: boolean;
  display_mode: DisplayMode;
  title: string;
  sections: Record<SectionKey, SectionConfig>;
  thresholds: UsageThresholds;
  colors: Record<Severity, string>;
  stale_after_minutes: number;
  appearance: CardAppearance;
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
