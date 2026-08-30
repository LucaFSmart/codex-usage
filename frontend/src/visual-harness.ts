import "./codex-usage-card";

import type { CardSnapshot, HomeAssistant } from "./types";

const query = new URLSearchParams(location.search);
const requestedState = query.get("state") ?? "normal";
const accountCount = Number(query.get("accounts") ?? "1");
const compact = query.get("mode") === "compact";
document.body.className = query.get("theme") === "light" ? "light" : "dark";

const usage =
  requestedState === "warning"
    ? 80
    : requestedState === "critical"
      ? 95
      : requestedState === "blocked"
        ? 100
        : 35;
const updated = requestedState === "stale" ? "2000-01-01T00:00:00Z" : new Date().toISOString();
const snapshot: CardSnapshot = {
  schema_version: 1,
  integration_version: "0.6.3",
  generated_at: new Date().toISOString(),
  accounts: Array.from({ length: accountCount }, (_, index) => ({
    id: `entry-${index}`,
    name: index ? "Studio" : "Workspace Alpha",
    plan: index ? "business" : "plus",
    available: true,
    updated_at: updated,
    blocker: requestedState === "blocked" ? "usage_limit" : null,
    limits: [
      ...(requestedState === "weekly-only"
        ? []
        : [
            {
              id: "codex:primary:five_hour",
              name: "Codex",
              source: "main" as const,
              duration_seconds: 18000,
              used_percent: usage,
              remaining_percent: 100 - usage,
              resets_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
              reached: requestedState === "blocked",
              entity_id: "sensor.codex_five_hour_usage",
            },
          ]),
      {
        id: "codex:secondary:weekly",
        name: "Codex",
        source: "main" as const,
        duration_seconds: 604800,
        used_percent: usage,
        remaining_percent: 100 - usage,
        resets_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        reached: requestedState === "blocked",
        entity_id: "sensor.codex_weekly_usage",
      },
      ...(requestedState === "weekly-only"
        ? []
        : [
            {
              id: "codex:additional:code_review",
              name: "Code review",
              source: "additional" as const,
              duration_seconds: 604800,
              used_percent: 20,
              remaining_percent: 80,
              resets_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
              reached: false,
              entity_id: null,
            },
          ]),
    ],
    credits: { balance: "12.50", has_credits: true, unlimited: false, overage_reached: false },
    spend: {
      source: "workspace",
      limit: "100",
      used: "18",
      remaining: "82",
      used_percent: 18,
      remaining_percent: 82,
      resets_at: null,
      reached: false,
    },
    reset_credits: { available_count: 1, total_earned: 3, next_expiry: null },
    profile: {
      lifetime_tokens: 2860000000,
      peak_daily_tokens: 184000000,
      total_threads: 340,
      current_streak_days: 12,
      longest_streak_days: 29,
      longest_running_turn_sec: 480,
      fast_mode_usage_percentage: 12.5,
      total_skills_used: 84,
      unique_skills_used: 11,
      most_used_reasoning_effort: "high",
      most_used_reasoning_effort_percentage: 72,
    },
  })),
};

const hass: HomeAssistant = {
  states: {},
  language: "en",
  locale: { language: "en-US" },
  async callWS<T>(): Promise<T> {
    return structuredClone(snapshot) as T;
  },
  connection: {
    async subscribeEvents(): Promise<() => void> {
      return () => undefined;
    },
  },
};

const card = document.createElement("codex-usage-card") as HTMLElement & {
  hass: HomeAssistant;
  setConfig(config: Record<string, unknown>): void;
};
card.setConfig({ type: "custom:codex-usage-card", compact });
card.hass = hass;
document.body.append(card);
