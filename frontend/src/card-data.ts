import type {
  CardAccount,
  CardCredits,
  CardLimit,
  CardSnapshot,
  CardSpend,
  HomeAssistant,
  SafeBlocker,
} from "./types";

const BLOCKERS: readonly SafeBlocker[] = ["spend", "credits", "usage_limit", "unknown", null];

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

function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
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
  if (used === null && remaining === null && nullableBoolean(source.reached) !== true) return null;
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
  const profile = record(source.profile);
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
          available_count: finite(reset.available_count),
          total_earned: finite(reset.total_earned),
          next_expiry: date(reset.next_expiry),
        }
      : null,
    profile: profile
      ? (Object.fromEntries(
          Object.entries(profile).filter(
            ([, item]) =>
              item === null ||
              typeof item === "string" ||
              (typeof item === "number" && Number.isFinite(item)),
          ),
        ) as Record<string, string | number | null>)
      : null,
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
