const PLAN_LABELS: Record<string, string> = {
  guest: "Guest",
  free: "Free",
  go: "Go",
  plus: "Plus",
  pro: "Pro",
  prolite: "Pro Lite",
  free_workspace: "Free Workspace",
  team: "Team",
  self_serve_business_prolite: "Business Pro Lite",
  self_serve_business_usage_based: "Usage-based Business",
  business: "Business",
  ent26: "Enterprise 26",
  enterprise_cbp_automation: "Automation Enterprise",
  enterprise_cbp_usage_based: "Usage-based Enterprise",
  education: "Education",
  quorum: "Quorum",
  k12: "K–12",
  enterprise: "Enterprise",
  edu: "Edu",
  edu_plus: "Edu Plus",
  edu_pro: "Edu Pro",
  unknown: "Unknown plan",
};

export function formatPlanLabel(value: string | null): string {
  if (!value) return "";
  const normalized = value.trim().toLowerCase();
  if (PLAN_LABELS[normalized]) return PLAN_LABELS[normalized];
  return formatMetricLabel(normalized);
}

export function formatMetricLabel(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .split(/[_-]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatNumber(
  value: number | null,
  locale: string | undefined,
  compact = false,
): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(locale, {
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 2 : 1,
  }).format(value);
}

export function formatDecimal(value: string | null, locale: string | undefined): string {
  if (value === null) return "—";
  const number = Number(value);
  return Number.isFinite(number)
    ? new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(number)
    : value;
}

export function formatUsd(value: string | null, locale: string | undefined): string {
  const formatted = formatDecimal(value, locale);
  return formatted === "—" ? formatted : `$${formatted}`;
}

export interface RelativeDuration {
  totalMinutes: number;
  days: number;
  hours: number;
  minutes: number;
}

export function relativeDurationUntil(value: string | null, now: Date): RelativeDuration | null {
  if (!value) return null;
  const target = new Date(value);
  if (!Number.isFinite(target.getTime())) return null;
  const totalMinutes = Math.max(0, Math.round((target.getTime() - now.getTime()) / 60_000));
  return {
    totalMinutes,
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

export function formatAbsoluteReset(value: string | null, locale: string | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
