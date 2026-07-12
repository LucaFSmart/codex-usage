export interface LovelaceCardConfig {
  type: string;
  view_layout?: Record<string, unknown>;
  layout_options?: Record<string, unknown>;
}

export interface HomeAssistant {
  states: Record<string, HassEntity>;
  language: string;
  locale?: { language: string };
  callWS<T>(message: Record<string, unknown>): Promise<T>;
  connection: {
    subscribeEvents<T>(callback: (event: T) => void, eventType: string): Promise<() => void>;
  };
}

export interface HassEntity {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

declare global {
  interface Window {
    customCards?: Array<Record<string, unknown>>;
  }
}
