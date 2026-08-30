import { evaluateLimit, SEVERITY_RANK, worstSeverity } from "./status";
import type {
  AccountViewModel,
  CardAccount,
  CardSnapshot,
  CardViewModel,
  CodexUsageCardConfig,
  LimitViewModel,
  SectionKey,
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
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 100) return null;
  return limit.used_percent - elapsed;
}

function isMoreConstrained(a: LimitViewModel, b: LimitViewModel): boolean {
  if (a.reached !== b.reached) return a.reached;
  const remainingA = a.remaining_percent ?? Number.POSITIVE_INFINITY;
  const remainingB = b.remaining_percent ?? Number.POSITIVE_INFINITY;
  if (remainingA !== remainingB) return remainingA < remainingB;
  if (a.source !== b.source) return a.source === "main";
  return false;
}

export function mostConstrainedLimit(limits: readonly LimitViewModel[]): LimitViewModel | null {
  if (limits.length === 0) return null;
  return limits.reduce((best, current) => (isMoreConstrained(current, best) ? current : best));
}

export function isSectionVisible(
  key: SectionKey,
  visible: boolean | "auto",
  account: AccountViewModel,
): boolean {
  if (visible !== "auto") return visible;
  switch (key) {
    case "credits":
      return account.credits !== null || account.reset_credits !== null;
    case "spending":
      return account.spend !== null;
    case "profile":
      return account.profile !== null;
    case "additional_limits":
      return account.limits.some((item) => item.source === "additional");
    default:
      return true;
  }
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
  const severity: Severity =
    account.blocker !== null ? "blocked" : worstSeverity(limits.map((item) => item.severity));
  return {
    ...account,
    limits,
    severity,
    stale,
    mostConstrainedLimit: mostConstrainedLimit(limits),
  };
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
            (left, right) => SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity],
          )[0] ?? null);
  }
  const single = config.account_mode === "single" ? selectedAccount : null;
  return {
    accounts,
    selectedAccount,
    severity: single ? single.severity : worstSeverity(accounts.map((item) => item.severity)),
    stale: single ? single.stale : accounts.some((item) => item.stale),
    generatedAt: parsedDate(snapshot.generated_at),
    integrationVersion: snapshot.integration_version,
  };
}
