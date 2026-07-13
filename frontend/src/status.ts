import type { Severity, UsageThresholds } from "./types";

const SEVERITY_RANK: Record<Severity, number> = {
  missing: 0,
  normal: 1,
  stale: 2,
  elevated: 3,
  critical: 4,
  blocked: 5,
};

export function evaluateLimit(
  usage: number | null | undefined,
  explicitlyBlocked: boolean,
  thresholds: UsageThresholds,
): Severity {
  if (explicitlyBlocked) return "blocked";
  if (typeof usage !== "number" || !Number.isFinite(usage)) return "missing";
  if (usage >= thresholds.blocked) return "blocked";
  if (usage >= thresholds.critical) return "critical";
  if (usage >= thresholds.elevated) return "elevated";
  return "normal";
}

export function worstSeverity(severities: readonly Severity[]): Severity {
  return severities.reduce<Severity>(
    (worst, severity) => (SEVERITY_RANK[severity] > SEVERITY_RANK[worst] ? severity : worst),
    "missing",
  );
}

export function evaluateAccount(
  limitSeverities: readonly Severity[],
  explicitBlockers: readonly boolean[] = [],
): Severity {
  return explicitBlockers.some(Boolean) ? "blocked" : worstSeverity(limitSeverities);
}
