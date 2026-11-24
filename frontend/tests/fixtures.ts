import type { CardSnapshot, HomeAssistant } from "../src/types";

export const PROVIDER_STATUS = {
  state: "operational",
  available: true,
  last_success: "2026-07-15T09:57:00Z",
  last_attempt: "2026-07-15T09:57:00Z",
  stale: false,
  components: [
    { id: "01JVCV8YSWZFRSM1G5CVP253SK", name: "Codex Web", state: "operational" },
    { id: "01KMP3KP5MGE23B80K1EK4S8PV", name: "Codex API", state: "operational" },
    { id: "01KMKFAMWKNQ84Z1766MV08ZDE", name: "Codex CLI", state: "operational" },
    { id: "01KMP3KP5M8X0EBTVW6KN327EE", name: "Codex VS Code Extension", state: "operational" },
    { id: "01KMKFAMWKQ81YWSE1Z18R6VHR", name: "Codex in ChatGPT Desktop", state: "operational" },
  ],
  url: "https://status.openai.com/",
} as const;

export const SNAPSHOT: CardSnapshot = {
  schema_version: 1,
  integration_version: "0.6.5",
  generated_at: "2026-07-15T10:00:00Z",
  accounts: [
    {
      id: "entry-a",
      name: "Alpha",
      plan: "plus",
      available: true,
      updated_at: "2026-07-15T09:58:00Z",
      blocker: null,
      limits: [
        {
          id: "codex:secondary:weekly",
          name: "Codex",
          source: "main",
          duration_seconds: 604800,
          used_percent: 40,
          remaining_percent: 60,
          resets_at: "2026-07-19T19:34:47Z",
          reached: false,
          entity_id: "sensor.alpha_weekly_usage",
        },
      ],
      credits: null,
      spend: null,
      reset_credits: null,
      profile: null,
    },
    {
      id: "entry-b",
      name: "Beta",
      plan: "business",
      available: true,
      updated_at: "2026-07-15T09:59:00Z",
      blocker: null,
      limits: [
        {
          id: "codex:primary:five_hour",
          name: "Codex",
          source: "main",
          duration_seconds: 18000,
          used_percent: 91,
          remaining_percent: 9,
          resets_at: "2026-07-15T12:00:00Z",
          reached: false,
          entity_id: null,
        },
      ],
      credits: null,
      spend: null,
      reset_credits: null,
      profile: null,
    },
  ],
};

export function makeFakeHass(snapshot: unknown = SNAPSHOT): HomeAssistant {
  return {
    states: {},
    language: "en",
    locale: { language: "en-GB" },
    async callWS<T>(message: Record<string, unknown>): Promise<T> {
      if (message.type === "codex_usage/card_data") return structuredClone(snapshot) as T;
      throw new Error(`Unexpected WebSocket request: ${String(message.type)}`);
    },
    connection: {
      async subscribeMessage(): Promise<() => void> {
        return () => undefined;
      },
      async subscribeEvents(): Promise<() => void> {
        return () => undefined;
      },
    },
  };
}
