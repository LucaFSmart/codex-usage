import { evaluateLimit, worstSeverity } from "./status";
import type {
  AccountViewModel,
  CardAccount,
  CardSnapshot,
  CardViewModel,
  CodexUsageCardConfig,
  LimitViewModel,
  Severity,
} from "./types";

function parsedDate(value: string | null): Date | null {
  if (!value) return null;
  const result = new Date(value);
  return Number.isFinite(result.getTime()) ? result : null;
}

function isStale(value: string | null, minutes: number, now: Date): boolean {
  const updated = parsedDate(value);
  return updated === null || now.getTime() - updated.getTime() > minutes * 60_000;
}

function pace(limit: CardAccount["limits"][number], now: Date): number | null {
  if (!limit.duration_seconds || !limit.resets_at || limit.used_percent === null) return null;
  const reset = parsedDate(limit.resets_at);
  if (!reset) return null;
  const started = reset.getTime() - limit.duration_seconds * 1000;
  const elapsed = ((now.getTime() - started) / (limit.duration_seconds * 1000)) * 100;
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 110) return null;
  return limit.used_percent - Math.min(100, elapsed);
}

function accountModel(
  account: CardAccount,
  config: CodexUsageCardConfig,
  now: Date,
): AccountViewModel {
  const stale = !account.available || isStale(account.updated_at, config.stale_after_minutes, now);
  const limits: LimitViewModel[] = account.limits.map((item) => ({
    ...item,
    severity: evaluateLimit(
      item.used_percent,
      item.reached || account.blocker !== null,
      config.thresholds,
    ),
    pace: pace(item, now),
  }));
  let severity: Severity =
    account.blocker !== null ? "blocked" : worstSeverity(limits.map((item) => item.severity));
  if (account.blocker === null && stale && severity !== "missing") severity = "stale";
  return { ...account, limits, severity, stale };
}

export function buildCardViewModel(
  snapshot: CardSnapshot,
  config: CodexUsageCardConfig,
  sessionEntryId?: string,
  now = new Date(),
): CardViewModel {
  let source = snapshot.accounts;
  if (config.included_entry_ids.length > 0) {
    source = source.filter((item) => config.included_entry_ids.includes(item.id));
  }
  const accounts = source.map((item) => accountModel(item, config, now));
  const requested = sessionEntryId ?? config.selected_entry_id;
  let selectedAccount = requested ? (accounts.find((item) => item.id === requested) ?? null) : null;
  if (!selectedAccount) {
    selectedAccount =
      config.account_mode === "single"
        ? (accounts[0] ?? null)
        : ([...accounts].sort(
            (left, right) =>
              ["missing", "normal", "stale", "elevated", "critical", "blocked"].indexOf(
                right.severity,
              ) -
              ["missing", "normal", "stale", "elevated", "critical", "blocked"].indexOf(
                left.severity,
              ),
          )[0] ?? null);
  }
  return {
    accounts,
    selectedAccount,
    severity:
      config.account_mode === "single" && selectedAccount
        ? selectedAccount.severity
        : worstSeverity(accounts.map((item) => item.severity)),
    generatedAt: parsedDate(snapshot.generated_at),
    integrationVersion: snapshot.integration_version,
  };
}
