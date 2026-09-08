import type {
  CardAccount,
  CardCredits,
  CardLimit,
  CardLimitStatus,
  CardLimitSummary,
  CardProfile,
  CardSnapshot,
  CardSpend,
  CardSource,
  HomeAssistant,
  SafeBlocker,
} from "./types";

const SOURCE_KEYS = ["usage", "profile", "reset_details", "workspace_discovery"] as const;
const SOURCE_STATES = ["ok", "error", "unsupported", "disabled", "never"] as const;
const ERROR_CODES = [
  "rate_limited",
  "connection",
  "authentication",
  "invalid_response",
  "http_error",
] as const;
const RESTRICTION_REASONS = [
  "spend",
  "credits",
  "usage_limit",
  "additional_limit",
  "unknown",
  "none",
] as const;

const BLOCKERS: readonly SafeBlocker[] = ["spend", "credits", "usage_limit", "unknown", null];
const PROFILE_KEYS = [
  "lifetime_tokens",
  "peak_daily_tokens",
  "current_streak_days",
  "longest_streak_days",
  "total_threads",
  "longest_running_turn_sec",
  "fast_mode_usage_percentage",
  "total_skills_used",
  "unique_skills_used",
  "most_used_reasoning_effort",
  "most_used_reasoning_effort_percentage",
] as const satisfies readonly (keyof CardProfile)[];
const PROFILE_PERCENT_KEYS = new Set<keyof CardProfile>([
  "fast_mode_usage_percentage",
  "most_used_reasoning_effort_percentage",
]);

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function date(value: unknown): string | null {
  const candidate = text(value);
  return candidate && Number.isFinite(Date.parse(candidate)) ? candidate : null;
}

function percent(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 100
    ? value
    : null;
}

function count(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : null;
}

function nullableBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function entityId(value: unknown): string | null {
  const id = text(value);
  return id && /^(sensor|binary_sensor)\.[a-z0-9_]+$/.test(id) ? id : null;
}

function limit(value: unknown): CardLimit | null {
  const source = record(value);
  if (!source) return null;
  const id = text(source.id);
  const name = text(source.name);
  if (!id || !name || (source.source !== "main" && source.source !== "additional")) return null;
  const used = percent(source.used_percent);
  const remaining = percent(source.remaining_percent);
  return {
    id,
    name,
    source: source.source,
    duration_seconds:
      typeof source.duration_seconds === "number" &&
      Number.isFinite(source.duration_seconds) &&
      source.duration_seconds > 0
        ? source.duration_seconds
        : null,
    used_percent: used,
    remaining_percent: remaining,
    resets_at: date(source.resets_at),
    reached: source.reached === true,
    entity_id: entityId(source.entity_id),
    ...(Object.hasOwn(source, "budget_pph")
      ? {
          budget_pph:
            typeof source.budget_pph === "number" &&
            Number.isFinite(source.budget_pph) &&
            source.budget_pph >= 0
              ? source.budget_pph
              : null,
        }
      : {}),
    ...(Object.hasOwn(source, "budget_calculated_at")
      ? { budget_calculated_at: date(source.budget_calculated_at) }
      : {}),
  };
}

function limitStatus(value: unknown): CardLimitStatus | null {
  const source = record(value);
  const id = text(source?.id);
  const name = text(source?.name);
  if (!source || !id || !name || (source.source !== "main" && source.source !== "additional"))
    return null;
  return {
    id,
    name,
    source: source.source,
    allowed: nullableBoolean(source.allowed),
    reached: nullableBoolean(source.reached),
  };
}

function limitSummary(value: unknown): CardLimitSummary | undefined {
  const source = record(value);
  if (!source || !RESTRICTION_REASONS.includes(source.reason as never)) return undefined;
  const affected = Array.isArray(source.affected_limits)
    ? [
        ...new Set(
          source.affected_limits.map(text).filter((item): item is string => item !== null),
        ),
      ].slice(0, 50)
    : [];
  return {
    reached: nullableBoolean(source.reached),
    reason: source.reason as CardLimitSummary["reason"],
    affected_limits: affected,
    affected_limits_truncated: source.affected_limits_truncated === true,
    ...(Object.hasOwn(source, "fallback_available")
      ? { fallback_available: nullableBoolean(source.fallback_available) }
      : {}),
    ...(Object.hasOwn(source, "fallback_limit_id")
      ? { fallback_limit_id: text(source.fallback_limit_id) }
      : {}),
  };
}

function sourceStatus(value: unknown): CardSource | null {
  const source = record(value);
  if (
    !source ||
    !SOURCE_STATES.includes(source.state as never) ||
    (source.refresh_mode !== "poll" && source.refresh_mode !== "on_auth")
  )
    return null;
  return {
    state: source.state as CardSource["state"],
    last_attempt: date(source.last_attempt),
    last_success: date(source.last_success),
    retry_at: date(source.retry_at),
    error_code: ERROR_CODES.includes(source.error_code as never)
      ? (source.error_code as CardSource["error_code"])
      : null,
    refresh_mode: source.refresh_mode,
    expected_interval_seconds:
      typeof source.expected_interval_seconds === "number" &&
      Number.isFinite(source.expected_interval_seconds) &&
      source.expected_interval_seconds > 0
        ? source.expected_interval_seconds
        : null,
  };
}

function credits(value: unknown): CardCredits | null {
  const source = record(value);
  return source
    ? {
        balance: text(source.balance),
        has_credits: nullableBoolean(source.has_credits),
        unlimited: nullableBoolean(source.unlimited),
        overage_reached: nullableBoolean(source.overage_reached),
      }
    : null;
}

function spend(value: unknown): CardSpend | null {
  const source = record(value);
  return source
    ? {
        source: text(source.source),
        limit: text(source.limit),
        used: text(source.used),
        remaining: text(source.remaining),
        used_percent: percent(source.used_percent),
        remaining_percent: percent(source.remaining_percent),
        resets_at: date(source.resets_at),
        reached: nullableBoolean(source.reached),
      }
    : null;
}

function profile(value: unknown): CardProfile | null {
  const source = record(value);
  if (!source) return null;
  const entries: Array<readonly [keyof CardProfile, string | number | null]> = [];
  for (const key of PROFILE_KEYS) {
    if (!Object.hasOwn(source, key)) continue;
    const item = source[key];
    if (item === null) {
      entries.push([key, null]);
      continue;
    }
    if (key === "most_used_reasoning_effort") {
      const value = text(item);
      if (value !== null) entries.push([key, value]);
      continue;
    }
    const value = PROFILE_PERCENT_KEYS.has(key) ? percent(item) : count(item);
    if (value !== null) entries.push([key, value]);
  }
  return Object.fromEntries(entries) as CardProfile;
}

function account(value: unknown): CardAccount | null {
  const source = record(value);
  if (!source) return null;
  const id = text(source.id);
  const name = text(source.name);
  if (!id || !name || !Array.isArray(source.limits)) return null;
  const blocker = BLOCKERS.includes(source.blocker as SafeBlocker)
    ? (source.blocker as SafeBlocker)
    : "unknown";
  const reset = record(source.reset_credits);
  return {
    id,
    name,
    plan: text(source.plan),
    available: source.available === true,
    updated_at: date(source.updated_at),
    blocker,
    limits: source.limits.map(limit).filter((item): item is CardLimit => item !== null),
    credits: credits(source.credits),
    spend: spend(source.spend),
    reset_credits: reset
      ? {
          available_count: count(reset.available_count),
          total_earned: count(reset.total_earned),
          next_expiry: date(reset.next_expiry),
          ...((["usage", "reset_details", "none"] as const).includes(reset.count_source as never)
            ? { count_source: reset.count_source as "usage" | "reset_details" | "none" }
            : {}),
          ...(date(reset.count_updated_at)
            ? { count_updated_at: date(reset.count_updated_at) }
            : {}),
          ...(nullableBoolean(reset.details_consistent) !== null
            ? { details_consistent: nullableBoolean(reset.details_consistent) }
            : {}),
          ...(typeof reset.details_present === "boolean"
            ? { details_present: reset.details_present }
            : {}),
          ...(date(reset.details_updated_at)
            ? { details_updated_at: date(reset.details_updated_at) }
            : {}),
        }
      : null,
    profile: profile(source.profile),
    ...(Array.isArray(source.limit_statuses)
      ? {
          limit_statuses: source.limit_statuses
            .map(limitStatus)
            .filter((item): item is CardLimitStatus => item !== null),
        }
      : {}),
    ...(() => {
      const summary = limitSummary(source.limit_summary);
      return summary ? { limit_summary: summary } : {};
    })(),
    ...(record(source.sources)
      ? {
          sources: Object.fromEntries(
            SOURCE_KEYS.map((key) => [key, sourceStatus(record(source.sources)?.[key])]).filter(
              ([, item]) => item !== null,
            ),
          ),
        }
      : {}),
  };
}

export function normalizeCardSnapshot(value: unknown): CardSnapshot {
  const source = record(value);
  if (!source || source.schema_version !== 1 || !Array.isArray(source.accounts)) {
    throw new Error("Unsupported Codex Usage card data");
  }
  const integrationVersion = text(source.integration_version);
  const generatedAt = date(source.generated_at);
  if (!integrationVersion || !generatedAt) throw new Error("Incomplete Codex Usage card data");
  return {
    schema_version: 1,
    integration_version: integrationVersion,
    generated_at: generatedAt,
    accounts: source.accounts.map(account).filter((item): item is CardAccount => item !== null),
  };
}

export async function fetchCardSnapshot(hass: HomeAssistant): Promise<CardSnapshot> {
  const raw = await hass.callWS<unknown>({ type: "codex_usage/card_data" });
  return normalizeCardSnapshot(raw);
}
