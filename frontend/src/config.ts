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
const DISPLAY_MODES: readonly DisplayMode[] = ["compact", "detailed"];
const SECTION_KEYS: readonly SectionKey[] = [
  "limits",
  "resets",
  "pace",
  "profile",
  "credits",
  "spending",
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

export const DEFAULT_THRESHOLDS: UsageThresholds = {
  elevated: 60,
  critical: 85,
  blocked: 100,
};

export const DEFAULT_COLORS: Record<Severity, string> = {
  missing: "var(--codex-usage-missing-color, #9e9e9e)",
  stale: "var(--codex-usage-stale-color, #78909c)",
  normal: "var(--codex-usage-normal-color, #008c95)",
  elevated: "var(--codex-usage-warning-color, #f9a825)",
  critical: "var(--codex-usage-critical-color, #f4511e)",
  blocked: "var(--codex-usage-blocked-color, #c62828)",
};

const DEFAULT_SECTION: SectionConfig = {
  visible: true,
  expanded: true,
  values: {},
};

export const DEFAULT_CONFIG: CodexUsageCardConfig = {
  type: "custom:codex-usage-card",
  account_mode: "auto",
  included_device_ids: [],
  allow_account_switching: true,
  display_mode: "detailed",
  title: "Codex Usage",
  sections: {
    limits: structuredClone(DEFAULT_SECTION),
    resets: structuredClone(DEFAULT_SECTION),
    pace: structuredClone(DEFAULT_SECTION),
    profile: { ...structuredClone(DEFAULT_SECTION), expanded: false },
    credits: { ...structuredClone(DEFAULT_SECTION), expanded: false },
    spending: { ...structuredClone(DEFAULT_SECTION), expanded: false },
    footer: structuredClone(DEFAULT_SECTION),
  },
  thresholds: { ...DEFAULT_THRESHOLDS },
  colors: { ...DEFAULT_COLORS },
  stale_after_minutes: 15,
  appearance: {
    card_radius: 16,
    panel_radius: 12,
    spacing: 16,
  },
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

function normalizeDeviceId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeIncludedDeviceIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const ids = value
    .map(normalizeDeviceId)
    .filter((deviceId): deviceId is string => deviceId !== undefined);
  return [...new Set(ids)];
}

function normalizeSections(value: unknown): Record<SectionKey, SectionConfig> {
  const sections = isRecord(value) ? value : {};

  return Object.fromEntries(
    SECTION_KEYS.map((key) => {
      const defaults = DEFAULT_CONFIG.sections[key];
      const section = isRecord(sections[key]) ? sections[key] : {};
      const configuredValues = isRecord(section.values) ? section.values : {};
      const values = { ...defaults.values };

      for (const [valueKey, visible] of Object.entries(configuredValues)) {
        if (typeof visible === "boolean") values[valueKey] = visible;
      }

      return [
        key,
        {
          visible: typeof section.visible === "boolean" ? section.visible : defaults.visible,
          expanded: typeof section.expanded === "boolean" ? section.expanded : defaults.expanded,
          values,
        },
      ];
    }),
  ) as Record<SectionKey, SectionConfig>;
}

function normalizeThresholds(value: unknown): UsageThresholds {
  if (!isRecord(value)) return { ...DEFAULT_THRESHOLDS };

  const { elevated, critical, blocked } = value;
  const valid =
    typeof elevated === "number" &&
    Number.isFinite(elevated) &&
    typeof critical === "number" &&
    Number.isFinite(critical) &&
    typeof blocked === "number" &&
    Number.isFinite(blocked) &&
    0 <= elevated &&
    elevated < critical &&
    critical < blocked &&
    blocked <= 100;

  return valid ? { elevated, critical, blocked } : { ...DEFAULT_THRESHOLDS };
}

function isValidColor(value: unknown): value is string {
  if (typeof value !== "string" || value.trim().length === 0) return false;
  if (typeof CSS === "undefined" || typeof CSS.supports !== "function") return true;

  try {
    return CSS.supports("color", value);
  } catch {
    return false;
  }
}

function normalizeColors(value: unknown): Record<Severity, string> {
  const colors = isRecord(value) ? value : {};
  return Object.fromEntries(
    SEVERITIES.map((severity) => [
      severity,
      isValidColor(colors[severity]) ? colors[severity].trim() : DEFAULT_COLORS[severity],
    ]),
  ) as Record<Severity, string>;
}

function normalizeAppearance(value: unknown): CardAppearance {
  const appearance = isRecord(value) ? value : {};
  const normalized: CardAppearance = {
    card_radius:
      typeof appearance.card_radius === "number" && Number.isFinite(appearance.card_radius)
        ? appearance.card_radius
        : DEFAULT_CONFIG.appearance.card_radius,
    panel_radius:
      typeof appearance.panel_radius === "number" && Number.isFinite(appearance.panel_radius)
        ? appearance.panel_radius
        : DEFAULT_CONFIG.appearance.panel_radius,
    spacing:
      typeof appearance.spacing === "number" && Number.isFinite(appearance.spacing)
        ? appearance.spacing
        : DEFAULT_CONFIG.appearance.spacing,
  };

  if (typeof appearance.card_background === "string") {
    normalized.card_background = appearance.card_background;
  }
  if (typeof appearance.panel_background === "string") {
    normalized.panel_background = appearance.panel_background;
  }
  return normalized;
}

function normalizeStaleMinutes(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 5 && value <= 1440
    ? value
    : DEFAULT_CONFIG.stale_after_minutes;
}

export function normalizeConfig(input: unknown): CodexUsageCardConfig {
  const source = cloneInput(input);
  const config: CodexUsageCardConfig = {
    type: typeof source.type === "string" ? source.type : DEFAULT_CONFIG.type,
    account_mode: isOneOf(source.account_mode, ACCOUNT_MODES)
      ? source.account_mode
      : DEFAULT_CONFIG.account_mode,
    included_device_ids: normalizeIncludedDeviceIds(source.included_device_ids),
    allow_account_switching:
      typeof source.allow_account_switching === "boolean"
        ? source.allow_account_switching
        : DEFAULT_CONFIG.allow_account_switching,
    display_mode: isOneOf(source.display_mode, DISPLAY_MODES)
      ? source.display_mode
      : DEFAULT_CONFIG.display_mode,
    title: typeof source.title === "string" ? source.title : DEFAULT_CONFIG.title,
    sections: normalizeSections(source.sections),
    thresholds: normalizeThresholds(source.thresholds),
    colors: normalizeColors(source.colors),
    stale_after_minutes: normalizeStaleMinutes(source.stale_after_minutes),
    appearance: normalizeAppearance(source.appearance),
  };

  const deviceId = normalizeDeviceId(source.device_id);
  if (deviceId !== undefined) config.device_id = deviceId;
  if (isRecord(source.view_layout)) config.view_layout = source.view_layout;
  if (isRecord(source.layout_options)) config.layout_options = source.layout_options;

  return config;
}
