# Changelog

All notable changes to this project are documented here.

## 0.5.2 - 2026-07-21

- Pin the multi-account aggregate-status frontend test to a fixed system
  clock instead of comparing fixture timestamps against the real wall clock,
  so the test stays deterministic regardless of when it runs. Only `Date` is
  faked; real timers are left untouched so the existing snapshot-load waits
  keep working.

This release contains no behavior changes to the integration or the bundled
dashboard card.

## 0.5.1 - 2026-07-15

- Accept the current nested workspace-discovery response and preserve the
  backend-provided account ordering during setup and reauthentication.
- Keep valid usage percentages when a window duration is missing or malformed,
  accept whole-second JSON numbers, and ignore out-of-range reset timestamps
  without interrupting the coordinator.
- Treat explicit spend-control and credit-overage signals as safe blockers and
  reject weekly pace values when the reported reset lies outside its window.
- Ensure every successful core refresh produces a fresh card snapshot event,
  even when all reported usage values are unchanged.
- Migrate exact legacy generated account titles that contained a workspace ID,
  preserve user-defined titles, and defensively remove legacy IDs from device
  and card display data.
- Fix the card documentation link, Home Assistant form labels, localized mode
  choices, single-account subtitle, hidden-limit empty state, unavailable-limit
  placeholders, locale-aware numbers, and immediate connection-error state.
- Distinguish compact, adaptive, and detailed layouts. Add safe blocker text,
  reset-credit details, richer spending values, compact profile numbers, and
  all supported profile aggregates in detailed mode.
- Clarify aggregate multi-account state and extend the visual editor with
  account inclusion, freshness, semantic colors, and per-value visibility.
- Expand contract and regression coverage for all currently known plan labels,
  nested accounts, malformed durations and timestamps, refresh freshness,
  legacy-title privacy, card modes, editor labels, and display filtering.

The release remains fully read-only. Reset-credit redemption, purchases,
workspace messages, raw backend content, and account-changing actions are not
implemented.

## 0.5.0 - 2026-07-15

- Add the bundled `custom:codex-usage-card` with adaptive, compact, and
  detailed layouts, responsive Home Assistant Sections support, semantic
  state colors, light/dark themes, keyboard focus, reduced motion, and a
  native visual editor.
- Add automatic multi-workspace aggregation and session-only account chips;
  the most urgent explicitly reported state determines the overview color.
- Replace entity-registry discovery in the card with a private, authenticated,
  token-free `codex_usage/card_data` WebSocket snapshot. Credentials, backend
  identities, email addresses, raw responses, roles, and internal messages are
  never exposed to the browser.
- Select the desired workspace during setup and preserve that selection during
  token refresh and reauthentication.
- Parse limits by reported capabilities rather than plan names. Preserve
  unknown and monthly windows, validate percentages, durations, and timestamps
  defensively, and support current and future plan labels on a best-effort
  basis.
- Treat only explicit backend denial or blocker signals as blocked; reaching
  100 percent alone no longer invents a blocked account state.
- Read optional account, profile, spending, credit, and reset-credit data on
  isolated schedules. Temporary optional endpoint failures retain the last
  successful safe values and do not interrupt usage updates.
- Keep existing entity unique IDs compatible. Missing optional values now
  remain `unknown` while the coordinator is reachable, and optional profile,
  credit, and spend detail entities start disabled for new installations.
- Restrict diagnostics to an explicit privacy-safe allowlist and remove legacy
  email and token-derived plan claims during config-entry migration.
- Remove the former Button Card and native dashboard examples; the bundled
  card requires no separate frontend repository or card dependency.
- Add frontend formatting, linting, type checking, unit tests, bundle freshness,
  and responsive browser checks to CI.

This release keeps the integration read-only. OAuth device authorization and
token refresh remain the only state-changing HTTP requests.

## 0.4.0 - 2026-07-13

- Add 11 optional, read-only aggregate profile-statistic sensors for lifetime
  and peak token activity, streaks, threads, longest turn duration, Fast mode,
  skill usage, and reasoning-effort distribution.
- Fetch aggregate profile statistics independently at most once per hour while
  preserving the configurable usage polling interval.
- Isolate optional profile-endpoint failures from rate-limit updates, retain
  the last successful profile values, and retry temporary failures after 15
  minutes.
- Extend redacted diagnostics with profile availability, last-success time,
  and an error class that contains no response or identity data.
- Update the detailed and native dashboard examples, English and German entity
  names, icons, README, troubleshooting guidance, and integration smoke test.
- Preserve compatibility with current weekly-only rate-limit responses while
  adding the newly available profile aggregates; no missing five-hour values
  are inferred or copied from the weekly window.

This is a backward-compatible feature release. Update through HACS or replace
the integration files manually, then restart Home Assistant.

## 0.3.2 - 2026-07-12

- Add compact and detailed `custom:button-card` 7.0+ examples with generic,
  single-edit entity variables, responsive layouts, and explicit handling for
  plan-specific unavailable usage, credit, and spending data.
- Display weekly pace as a signed difference from elapsed weekly time instead
  of presenting it as a second 0–100 percent usage bar.

## 0.3.1 - 2026-07-12

- Add a new neutral, brand-independent integration icon designed for clear
  display at Home Assistant icon sizes.
- Refine the README and acknowledgements for HACS publishing while preserving
  the API stability, authentication, trademark, and attribution disclosures.
- Streamline the public repository to integration, user, contributor, and
  maintenance documentation relevant to the project.
- Update GitHub Actions to current Node 24-based action releases and validate
  against Home Assistant 2026.7.2 while retaining the 2026.3.0 minimum test.
- No runtime behavior changes from 0.3.0.

## 0.3.0 - 2026-07-12

- Restore correct weekly usage reporting for the new response shape where a
  weekly-only limit is returned as `primary_window` and `secondary_window` is
  absent. Windows are now classified by their actual duration instead of their
  `primary`/`secondary` position, while existing entity IDs remain unchanged.
- Keep the five-hour entities unavailable when OpenAI does not return a
  five-hour window, rather than showing weekly data under the wrong name.
- Add a read-only sensor for available usage-limit reset credits and an
  optional binary sensor for the credit overage-limit state.
- Discover code-review limits and previously unknown main-limit durations as
  dynamic read-only sensors when OpenAI returns them, and include those limits
  in the overall "Rate limit reached" binary sensor.
- Name dynamic limit windows by duration and add regression coverage for old,
  reversed, rounded, weekly-only, malformed, and newly extended API responses.
- Update the README and example dashboard for the expanded read-only data.

## 0.2.0 - 2026-07-02

- **Privacy fix:** stop using the ChatGPT account email as the device, entity,
  and config entry name. It previously appeared in the Home Assistant UI and
  was baked into generated entity IDs (e.g.
  `sensor.codex_usage_<email>_five_hour_usage`), which persist in the recorder
  database, statistics, and automations. Names are now based on the opaque
  `account_id` only. **If you installed 0.1.0, updating alone does not remove
  the email from your existing config entry title, device name, or entity
  IDs** — Home Assistant does not recompute or rename those on a code update.
  Remove and re-add the integration (Settings → Devices & services → Codex
  Usage → ⋮ → Delete, then add it again) to get the new naming, or rename the
  affected entities/device manually.
- Lower the minimum Home Assistant requirement from 2026.6.0 to 2026.3.0, the
  first release that requires Python 3.14 (needed for this integration's
  `except X, Y:` syntax). Verified by running the full test suite against
  `homeassistant==2026.3.0`; a `tests-min-version` CI job now guards this.
- Note in README.md that this integration reuses the Codex CLI's public OAuth
  client ID and an undocumented usage endpoint, both of which OpenAI could
  change or restrict without notice.

## 0.1.0 - 2026-07-01

- Initial HACS-compatible Home Assistant integration.
- OpenAI device-code authentication and automatic token refresh.
- Five-hour, weekly, credit, spending, and dynamic additional-limit entities.
- English and German translations, diagnostics, tests, and example dashboard.
- Neutral brand artwork and explicit Home Assistant 2026.6 HACS requirement.
- Defensive handling for missing and non-finite usage values.
