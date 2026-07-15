const PLAN_LABELS: Record<string, string> = {
  guest: "Guest",
  free: "Free",
  go: "Go",
  plus: "Plus",
  pro: "Pro",
  prolite: "Pro Lite",
  free_workspace: "Free Workspace",
  team: "Team",
  self_serve_business_usage_based: "Usage-based Business",
  business: "Business",
  enterprise_cbp_usage_based: "Usage-based Enterprise",
  education: "Education",
  quorum: "Quorum",
  k12: "K–12",
  enterprise: "Enterprise",
  edu: "Edu",
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
