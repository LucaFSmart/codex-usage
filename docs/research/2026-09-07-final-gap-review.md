# Codex Usage 0.7 final gap review

Reviewed: 2026-09-07. Scope: the complete 0.7 candidate, current OpenAI product and App Server documentation, Home Assistant 2026.9.1 compatibility, and public patterns in popular HACS projects. This is a source and sanitized-fixture review; no live OpenAI account was queried.

## Release-blocking findings

Two Important findings were reproduced with failing tests and fixed:

1. Reauthentication previously required exact equality for an optional user claim. A legacy entry without the claim could reject the same user when a later token supplied it, and the reverse transition could also fail. Reauthentication now compares the claim only when both values are present, retains a previously verified value when a token omits it, rejects two different known users, and preserves the established config-entry unique ID.
2. The integration combined a config-entry update listener with reloading config-flow methods. Home Assistant deprecated that combination in 2026.6 and will reject it in 2026.12 because it can reload twice or race. Options now use `OptionsFlowWithReload`; the general listener was removed; reauthentication requests one explicit reload; ordinary credential persistence does not reload the integration. See the [Home Assistant deprecation notice](https://developers.home-assistant.io/blog/2026/05/07/config-entry-listener-together-with-reloading-methods/).

The CI current-stable target was also one patch release behind. It now uses Home Assistant 2026.9.1 and `pytest-homeassistant-custom-component==0.13.364`, while 2026.3.0 remains the declared minimum.

No remaining Critical or Important implementation gap was found after these changes.

## Current OpenAI contract check

The current [Codex App Server reference](https://learn.chatgpt.com/docs/app-server) documents a backward-compatible single rate-limit bucket, `rateLimitsByLimitId`, authoritative earned-reset `availableCount`, nullable or capped reset detail rows, rate-limit change notifications, and `account/usage/read` daily token buckets. The 0.7 research record and implementation already follow the compatible semantics without mixing the App Server's camelCase RPC schema into the WHAM HTTP parser.

[Banked resets](https://help.openai.com/en/articles/20001498-how-banked-codex-resets-work) remain one-time saved resets. A full reset refreshes the five-hour and weekly windows and can move the weekly reset date; it is consumed only after at least one eligible window was successfully reset. The integration correctly trusts later server dates and does not infer local consumption from a percentage drop.

[Paid instant resets](https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets) are a separate product operation. They restore the five-hour and weekly allowances immediately, pull the normal weekly allowance forward, and start the next weekly period with the first subsequent Work or Codex request. The integration already treats a temporarily absent reset date as unknown, never turns an observed drop into a saved-reset transaction, and exposes no purchase action.

The current [plan guidance](https://help.openai.com/en/articles/11369540) and [business rate card](https://help.openai.com/en/articles/11481834) continue to describe shared agentic allowances and credit pools across eligible products. The integration therefore must remain account-level and must not attribute consumption to Astra, another model, an app, a task, or a conversation. Astra inference endpoints, context sizes and pricing do not require changes in this read-only quota monitor.

App Server command and WebSocket transports remain experimental, and device-code login remains beta. They do not justify replacing the current transport in 0.7.

## HACS peer comparison

The comparison sampled active, widely used repositories on 2026-09-07: HACS itself (7,690 stars), Adaptive Lighting (3,459), Alexa Media Player (1,974), Browser Mod (1,807), and Pyscript (1,182). Stars are only a popularity signal; Home Assistant's current developer rules remain the normative reference.

The useful shared patterns are already present here:

- UI config flow, options, stable config-entry identity and one logical device per account.
- Coordinator-owned polling, explicit availability, isolated diagnostics and safe reauthentication.
- Separate entities for measurements that users graph or automate. Attributes are reserved for compact context tied to one state. Codex Usage follows this by keeping usage, remaining, reset, budget, credits and source timestamps as entities while the aggregate restriction binary sensor carries only the stable `reason`, bounded `affected_limits`, and truncation flag.
- Disabled-by-default diagnostic or specialist entities instead of enabling every possible metric.
- Dedicated installation, configuration and troubleshooting documentation. Codex Usage additionally provides entity, card, automation, privacy, upgrade, release and verification guides.
- A card configuration that keeps core values stable and lets users choose Automatic, Always show or Hide for optional sections and values. Missing optional data does not produce repeated unavailable rows by default.

Copying the larger attribute payloads used by device-control integrations would be a regression here: frequently changing percentages and timestamps in attributes increase Recorder churn and are harder to automate than typed sensor entities. The current compact restriction attributes are the appropriate exception.

## Recommended future work

| Priority | Proposal | Benefit | Estimated effort | Recommendation |
| --- | --- | --- | --- | --- |
| 1 | App Server stdio proof of concept | Verifies supported authentication, lifecycle, rate-limit reads and daily buckets without changing the default integration | 4–8 h | Do after 0.7 as an isolated experiment. |
| 2 | Optional App Server/sidecar adapter | Documented multi-bucket reads, push-assisted refresh and real daily token history | 40–72 h after the proof of concept | Highest-value feature, but keep WHAM as the default and use full reads after notifications. |
| 3 | Cross-account comparison in the card | Faster comparison of configured workspaces without merging their identities or totals | 16–28 h | Useful for multi-account users; make it opt-in and compare normalized percentages only. |
| 4 | Recorder-backed history views | Trends without maintaining another database | 16–28 h | Use Home Assistant Recorder/history APIs and existing entities; do not create a private parallel history store. |
| 5 | Optional per-feature restriction binary sensors | Simpler automations for named additional limits | 8–16 h | Add only when users need direct per-feature triggers; keep them disabled by default and preserve dynamic identities. |
| 6 | Reset calendar entity | Native calendar display for reported reset dates | 8–16 h | Moderate convenience; lower value than history and comparison. Never predict missing dates. |
| 7 | Earned-reset redemption service | Lets a user consume a documented saved reset from Home Assistant | 16–28 h | Do not add under the current read-only promise. If reconsidered, require a separately enabled service, UUID idempotency, explicit user action and a mandatory post-read. |
| 8 | Workspace messages or owner nudge email | Surfaces provider notices or requests an owner email | 16–32 h | Defer. It adds message retention, redaction and external-notification behavior with little quota-monitoring value. |

Hardcoded model pricing, prompt estimates, automatic reset use, credit purchases, per-model consumption attribution, and a private history database are not recommended. Their inputs are plan-dependent or unavailable from the current transport, and several would change the product's read-only safety boundary.

## Verification result

The final candidate passed Ruff formatting and lint, 244 unit/component tests, and 7 real runtime/Blueprint tests on both Home Assistant 2026.3.0 and 2026.9.1. The frontend passed Prettier, ESLint, TypeScript, 131 Vitest tests with the recorded coverage thresholds, high-severity dependency audit, production build, and 18 Chromium Playwright tests. Repository-relative Markdown links were checked across 37 files after adding this report.
