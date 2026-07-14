import type {
  AccountMode,
  CardAppearance,
  CodexUsageCardConfig,
  DisplayMode,
  SectionConfig,
  SectionKey,
  Severity,
  UsageThresholds,
} from "./types";

const ACCOUNT_MODES: readonly AccountMode[] = ["auto", "single", "all"];
const DISPLAY_MODES: readonly DisplayMode[] = ["adaptive", "compact", "detailed"];
export const SECTION_KEYS: readonly SectionKey[] = [
  "limits",
  "resets",
  "pace",
  "credits",
  "spending",
  "profile",
  "footer",
];
const SEVERITIES: readonly Severity[] = [
  "missing",
  "stale",
  "normal",
  "elevated",
  "critical",
  "blocked",
];

export const DEFAULT_THRESHOLDS: UsageThresholds = { elevated: 60, critical: 85 };

export const DEFAULT_COLORS: Record<Severity, string> = {
  normal: "var(--codex-usage-normal-color, #25b7f3)",
  elevated: "var(--codex-usage-elevated-color, #ffb74d)",
  critical: "var(--codex-usage-critical-color, #ff5f6d)",
  blocked: "var(--codex-usage-blocked-color, #d32f49)",
  stale: "var(--codex-usage-stale-color, #78909c)",
  missing: "var(--codex-usage-missing-color, #9e9e9e)",
};

const section = (visible = true): SectionConfig => ({ visible, values: {} });

export const DEFAULT_CONFIG: CodexUsageCardConfig = {
  type: "custom:codex-usage-card",
  account_mode: "auto",
  included_entry_ids: [],
  allow_account_switching: true,
  display_mode: "adaptive",
  title: "Codex Usage",
  show_unavailable_limits: false,
  sections: {
    limits: section(),
    resets: section(),
    pace: section(),
    credits: section(),
    spending: section(),
    profile: section(),
    footer: section(),
  },
  thresholds: { ...DEFAULT_THRESHOLDS },
  colors: { ...DEFAULT_COLORS },
  stale_after_minutes: 15,
  appearance: { card_radius: 20, panel_radius: 14, spacing: 16 },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneInput(input: unknown): Record<string, unknown> {
  if (!isRecord(input)) return {};
  try {
    return structuredClone(input);
  } catch {
    return {};
  }
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

function textId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function textIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(textId).filter((item): item is string => Boolean(item)))];
}

function normalizeSections(value: unknown): Record<SectionKey, SectionConfig> {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(
    SECTION_KEYS.map((key) => {
      const input = isRecord(source[key]) ? source[key] : {};
      const values = isRecord(input.values)
        ? Object.fromEntries(
            Object.entries(input.values).filter(([, item]) => typeof item === "boolean"),
          )
        : {};
      return [
        key,
        {
          visible:
            typeof input.visible === "boolean"
              ? input.visible
              : DEFAULT_CONFIG.sections[key].visible,
          values,
        },
      ];
    }),
  ) as Record<SectionKey, SectionConfig>;
}

function normalizeThresholds(value: unknown): UsageThresholds {
  if (!isRecord(value)) return { ...DEFAULT_THRESHOLDS };
  const elevated = value.elevated;
  const critical = value.critical;
  return typeof elevated === "number" &&
    Number.isFinite(elevated) &&
    typeof critical === "number" &&
    Number.isFinite(critical) &&
    elevated >= 0 &&
    elevated < critical &&
    critical <= 100
    ? { elevated, critical }
    : { ...DEFAULT_THRESHOLDS };
}

function validColor(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return true;
  try {
    return CSS.supports("color", value);
  } catch {
    return false;
  }
}

function normalizeColors(value: unknown): Record<Severity, string> {
  const source = isRecord(value) ? value : {};
  return Object.fromEntries(
    SEVERITIES.map((key) => [
      key,
      validColor(source[key]) ? source[key].trim() : DEFAULT_COLORS[key],
    ]),
  ) as Record<Severity, string>;
}

function dimension(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max
    ? value
    : fallback;
}

function normalizeAppearance(value: unknown): CardAppearance {
  const source = isRecord(value) ? value : {};
  return {
    card_radius: dimension(source.card_radius, DEFAULT_CONFIG.appearance.card_radius, 0, 48),
    panel_radius: dimension(source.panel_radius, DEFAULT_CONFIG.appearance.panel_radius, 0, 36),
    spacing: dimension(source.spacing, DEFAULT_CONFIG.appearance.spacing, 4, 32),
  };
}

export function normalizeConfig(input: unknown): CodexUsageCardConfig {
  const source = cloneInput(input);
  const config: CodexUsageCardConfig = {
    type: typeof source.type === "string" ? source.type : DEFAULT_CONFIG.type,
    account_mode: isOneOf(source.account_mode, ACCOUNT_MODES)
      ? source.account_mode
      : DEFAULT_CONFIG.account_mode,
    included_entry_ids: textIds(source.included_entry_ids),
    allow_account_switching:
      typeof source.allow_account_switching === "boolean"
        ? source.allow_account_switching
        : DEFAULT_CONFIG.allow_account_switching,
    display_mode: isOneOf(source.display_mode, DISPLAY_MODES)
      ? source.display_mode
      : DEFAULT_CONFIG.display_mode,
    title: typeof source.title === "string" ? source.title : DEFAULT_CONFIG.title,
    show_unavailable_limits:
      typeof source.show_unavailable_limits === "boolean"
        ? source.show_unavailable_limits
        : DEFAULT_CONFIG.show_unavailable_limits,
    sections: normalizeSections(source.sections),
    thresholds: normalizeThresholds(source.thresholds),
    colors: normalizeColors(source.colors),
    stale_after_minutes:
      typeof source.stale_after_minutes === "number" &&
      Number.isFinite(source.stale_after_minutes) &&
      source.stale_after_minutes >= 5 &&
      source.stale_after_minutes <= 1440
        ? source.stale_after_minutes
        : DEFAULT_CONFIG.stale_after_minutes,
    appearance: normalizeAppearance(source.appearance),
  };
  const selected = textId(source.selected_entry_id);
  if (selected) config.selected_entry_id = selected;
  for (const key of ["view_layout", "layout_options", "grid_options"] as const) {
    if (isRecord(source[key])) config[key] = source[key];
  }
  if (Array.isArray(source.visibility)) config.visibility = structuredClone(source.visibility);
  return config;
}
