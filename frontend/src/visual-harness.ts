import "./codex-usage-card";

import type { CardSnapshot, HomeAssistant } from "./types";

const query = new URLSearchParams(location.search);
const requestedState = query.get("state") ?? "normal";
const accountCount = Number(query.get("accounts") ?? "1");
document.body.className = query.get("theme") === "light" ? "light" : "dark";

const usage =
  requestedState === "elevated"
    ? 70
    : requestedState === "critical"
      ? 91
      : requestedState === "blocked"
        ? 100
        : 35;
const updated = requestedState === "stale" ? "2000-01-01T00:00:00Z" : new Date().toISOString();
const snapshot: CardSnapshot = {
  schema_version: 1,
  integration_version: "0.5.0",
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
    profile: { lifetime_tokens: 2860000000, total_threads: 340, current_streak_days: 12 },
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
card.setConfig({ type: "custom:codex-usage-card", display_mode: "detailed" });
card.hass = hass;
document.body.append(card);
