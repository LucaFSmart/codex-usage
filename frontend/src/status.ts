import type { Severity, UsageThresholds } from "./types";

export const SEVERITY_RANK: Record<Severity, number> = {
  unknown: 0,
  ok: 1,
  warning: 2,
  critical: 3,
  blocked: 4,
};

export function evaluateLimit(
  usage: number | null | undefined,
  explicitlyBlocked: boolean,
  thresholds: UsageThresholds,
): Severity {
  if (explicitlyBlocked) return "blocked";
  if (typeof usage !== "number" || !Number.isFinite(usage)) return "unknown";
  if (usage >= thresholds.critical) return "critical";
  if (usage >= thresholds.warning) return "warning";
  return "ok";
}

export function worstSeverity(severities: readonly Severity[]): Severity {
  return severities.reduce<Severity>(
    (worst, severity) => (SEVERITY_RANK[severity] > SEVERITY_RANK[worst] ? severity : worst),
    "unknown",
  );
}

export function evaluateAccount(
  limitSeverities: readonly Severity[],
  explicitBlockers: readonly boolean[] = [],
): Severity {
  return explicitBlockers.some(Boolean) ? "blocked" : worstSeverity(limitSeverities);
}
