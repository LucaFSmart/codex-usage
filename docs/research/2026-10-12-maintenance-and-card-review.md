# Maintenance and card review — October 12, 2026

This review covers dependency resolution and known advisories, Python integration lifecycle/authentication/data contracts, frontend rendering/editor behavior, current provider and Home Assistant compatibility, documentation and publication checks. It prepares 0.7.5; the verification record separates local evidence from final Linux CI and live deployment.

## Provider and Home Assistant

The official [OpenAI changelog](https://learn.chatgpt.com/docs/changelog) documents GPT-6.1 Sol Ultrafast on October 8 and GPT-5.5 retirement from ChatGPT/Work/Codex on October 14; the API retirement is separate. [Pricing](https://learn.chatgpt.com/docs/pricing) lists Ultrafast's 8x included-usage and 6x purchased-credit rates. These are upstream metering rules; the monitor observes provider percentages and does not select models or multiply reported usage.

Provider source was reviewed at openai/codex commit `9f3d25588b3f0bdf452d4eda919f2c2365a89bba`: [device authorization](https://github.com/openai/codex/blob/9f3d25588b3f0bdf452d4eda919f2c2365a89bba/codex-rs/login/src/device_code_auth.rs), [backend client](https://github.com/openai/codex/blob/9f3d25588b3f0bdf452d4eda919f2c2365a89bba/codex-rs/backend-client/src/client.rs) and its usage/window/reset types. The existing usage/profile/accounts/reset endpoints and optional quota metadata remain compatible. Authenticated WHAM HTTP endpoints remain undocumented as a stable third-party interface; [App Server](https://learn.chatgpt.com/docs/app-server) is a separate RPC surface, not an interchangeable HTTP response contract.

The current Linux CI target is Home Assistant 2026.10.1, with matching pytest harness 0.13.372. Relevant [developer changes](https://developers.home-assistant.io/blog/) were checked against imports, device/config-entry APIs and abort translations. Local abort messages remain for the declared 2026.3.0 compatibility floor. Live HA 2026.10.1 runs integration 0.7.4 with loaded entry, successful usage/profile/reset sources, no active Repairs and no matching Codex runtime error in the queried log window. The ordinary custom-integration loader notice is not a defect. No production login, purchase or reset redemption was performed.

## Confirmed fixes

- Account setup/removal now emits the card-data lifecycle event. Without it, a newly added account could wait for polling and the last removed account could remain displayed indefinitely.
- Device login honors confirmation, provider poll spacing and the documented 15-minute lifetime. Invalid device identifiers, PKCE fields and token expiry values now fail safely. Extreme timezone offsets in optional reset-credit timestamps no longer crash the update.
- A truncated or timed-out HTTP 429 error body no longer discards the already-received provider retry deadline. Quota-body classification is best-effort; ordinary rate limiting remains authoritative when classification cannot complete.
- Browser tests reproduced low text contrast and clipped reset text in narrow desktop cards. Meaningful text now uses theme text colors at full opacity, and container queries adapt to card width. New Sections defaults avoid impractically small cards while preserving existing layout configuration.
- Screen-reader names/states, keyboard activation and disclosure regions now identify quota/spend meters, selected accounts and expanded details. Controls have larger touch targets.
- The editor identifies time windows and every account affected by a shared ID, exposes budget switches and preserves valid customized/fractional thresholds when a slider would make the pair invalid. Color inputs have distinct accessible names.
- The warning Blueprint includes its canonical source URL for Home Assistant's re-import operation.

## Peer comparison and design decision

Public project metadata and source were reviewed on October 12; no third-party code or assets were copied.

| Project | Release observed | Useful pattern |
| --- | --- | --- |
| [Mushroom](https://github.com/piitaya/lovelace-mushroom/releases/tag/v5.2.3) | 5.2.3, September 1; Apache-2.0 | Native HA geometry, theme tokens and translated visual editor |
| [Bubble Card](https://github.com/Clooos/Bubble-Card/releases/tag/v3.4.1) | 3.4.1, September 25; MIT | Compact controls, progressive details and touch behavior |
| [Modern Circular Gauge](https://github.com/selvalt7/modern-circular-gauge/releases/tag/v0.15.0) | 0.15.0, September 25; MIT | Clear primary percentage with subordinate data |
| [Button Card](https://github.com/custom-cards/button-card/releases/tag/v7.0.1) | 7.0.1; MIT | Container-aware sizing and configurable HA actions |
| [CodexBar](https://github.com/steipete/CodexBar/releases/tag/v0.74.1) | 0.74.1, October 11; MIT | Usage/reset hierarchy and explicit data freshness |
| [HA Codex Bridge](https://github.com/Herbertmt978/HA_Codex_Bridge/releases/tag/1.13.12) | 1.13.12, October 5; MIT | HA/Codex integration context; different control-oriented scope |

Three directions were considered: improving current native HA rows, making large dual gauges the primary surface, or replacing the rows with Bubble-style quota bands. Targeted improvement of the existing Lit card is the recommended direction. It fixes measured readability, accessibility, editor and layout defects while retaining mature quota/error semantics, YAML compatibility and schema 1. A framework rewrite or external card dependency would add migration and maintenance cost without resolving an observed architectural problem. Bigger visual variants remain optional design work rather than a requirement for correctness.

The verified presentation retains the ring/bar rows, continuous detail surface, theme backgrounds and existing visible labels. The intentional changes are full-opacity readable text, wrapping status/heading text, touch targets and card-width stacking. Browser interaction checks cover account switching and detail expansion. Small existing-design fixes do not need generated raster UI concepts.

## Dependency and security interpretation

The current Python lock and npm lock have zero known vulnerabilities in fresh audits. `source-map-js` moves to 1.2.2 ([advisory](https://github.com/advisories/GHSA-68fv-2mgg-jv7q)); both Python environments move flexible `multidict` to 6.9.1. Exact current HA dependencies are upgraded together. TypeScript 7 remains outside typescript-eslint's supported peer range, so 6.0.3 is retained.

At the start GitHub reported 92 open Python dependency alerts: 16 current and 76 minimum-environment alerts. The updated current environment addresses its 16. The old minimum's remaining alerts come from Home Assistant 2026.3.0 exact pins; replacing those packages arbitrarily would invalidate compatibility evidence. Its audit also discovers newer advisory IDs not yet represented by GitHub. No warning is dismissed or suppressed. Retiring that historical target requires an explicit change to the public supported minimum.

The maintainer explicitly chose to retain Home Assistant 2026.3.0 support during this review. The old test environment therefore remains isolated as documented compatibility evidence; deployed Home Assistant should use the latest stable release.

A scoped Codex Security scan of the original backend snapshot completed with zero reportable findings and partial static coverage. No independent baseline auditor was available, the generated bundle was not fully manually reviewed, and live permission attacks were not run. Its original-snapshot result is not a security certification of subsequent changes. Independent code review, regression checks and final CodeQL cover the maintenance patch separately. Daybreak access was not enabled; protected security outputs may require [enrollment](https://chatgpt.com/cyber).
