# Changelog

All notable changes to this project are documented here.

## 0.6.3 - 2026-08-30

Security-focused release.

- **Fix an access-control gap in the `codex_usage/card_data` websocket
  command.** It previously returned every configured account's usage,
  credit, and spend data to any authenticated Home Assistant user,
  regardless of that user's entity permissions. It now checks the
  requesting user against each account's entities and fails closed
  (excludes the account) unless the user is an admin or has explicit
  read access to all of that config entry's entities, including
  disabled ones. Only relevant to multi-user Home Assistant instances
  where a non-admin user shouldn't see another user's Codex usage.
- **Replace the diagnostics redaction blocklist with an allowlist.**
  `async_get_config_entry_diagnostics` previously redacted a fixed list
  of known-sensitive keys (tokens, account/user ID, email) and passed
  everything else through. It now includes only `expires_at` and
  `fedramp` from the config entry, and `update_interval` from options —
  any new sensitive field added to the entry in the future is excluded
  by default instead of needing to be remembered on a redaction list.
- **Pin third-party GitHub Actions in `validate.yml` to exact commit
  SHAs** (`actions/checkout`, `actions/setup-python`, `actions/setup-node`,
  `hacs/action`, `home-assistant/actions/hassfest`) instead of mutable
  tags/branches, and add an explicit `permissions: contents: read` at
  the workflow level. Standard supply-chain hardening for a public,
  HACS-distributed repository.
- Add a native color-picker swatch next to each semantic-color text
  field in the card editor, alongside the existing free-text input. The
  swatch reads/writes just the `#hex` fallback inside the existing
  `var(--codex-usage-X-color, #hex)` value, so CSS-variable/theme
  overrides keep working exactly as before; typing a value directly in
  the text field is unaffected.
- Fix a race condition in the card editor: switching Home Assistant
  connections while an account list fetch was still in flight could let
  a stale response overwrite the current account list.
- Add a singular "1 reset credit available" string, previously always
  pluralized regardless of count.

## 0.6.2 - 2026-08-30

- Replace the brand icon (`custom_components/codex_usage/brand/icon.png`,
  also shown in the README) with a new design. Still 256×256 RGBA with a
  transparent background, verified by the existing brand-icon contract
  test. No other file references the icon, so this is the only asset
  that changed.

## 0.6.1 - 2026-08-30

Small follow-up to 0.6.0, from a deeper review pass.

- Add display labels for five `openai/codex` plan values that shipped
  since the last check (`self_serve_business_prolite`, `ent26`,
  `enterprise_cbp_automation`, `edu_plus`, `edu_pro`). Unknown plans were
  never rejected — they fell back to a generic title-cased label — so
  this is cosmetic, not a fix for broken behavior.
- Add `npm audit --audit-level=high` to the `frontend` CI job and as
  `npm run audit`, so a high/critical dependency advisory now fails CI
  instead of only being checked manually before a release.
- Remove a leftover "Until a GitHub repository is configured" sentence
  from `SECURITY.md`.
- Update the bug report template's version placeholders
  (`0.1.0`/`2026.7.2` → `0.6.1`/`2026.8.3`).

## 0.6.0 - 2026-08-30

Card-focused release. The backend data model and HTTP contract are
unchanged; every change below is in the bundled dashboard card.

- Redesign the card's information hierarchy: a compact status chip
  (Healthy / Low usage remaining / Critically low usage remaining / Limit
  reached / Data unavailable), a one-line "most constrained limit" callout,
  and remaining percentage (not used) as the primary number on the 5-hour
  and weekly limits, with relative reset times ("Resets in 2h 14m") as the
  primary reset label and the absolute timestamp demoted to secondary text.
- Replace `display_mode` (`adaptive`/`compact`/`detailed`) with a single
  `compact: boolean` option plus a live "Show details"/"Hide details"
  toggle. The primary limits always render; only credits, spend,
  additional limits, account details, and profile stats live behind the
  toggle, which the viewer can expand or collapse at any time regardless
  of the configured default.
- Decouple data freshness from usage severity. An account can now show a
  healthy status chip and an independent "Data may be outdated" line at
  the same time, instead of a stale snapshot forcing the whole card into
  an ambiguous state.
- Extend `sections.<key>.visible` to accept `"auto"` (show only if the
  account actually has that data) alongside the existing boolean. Credits,
  spending, profile, and additional limits default to `"auto"`, so an
  account with no spend control or no reset credits no longer shows empty
  placeholders.
- Add two new sections: `additional_limits` (any `additional_rate_limits`
  entry, rendered with the same row treatment as the primary limits, just
  less prominent) and `account` (plan, workspace, and a truncated account
  ID — no email or full raw IDs).
- Rework the visual language to one continuous `ha-card` surface: no more
  per-item bordered/background panels for limits, credits, spend, reset
  credits, or account details. Everything is separated by spacing and
  typography instead, using a small set of CSS custom-property spacing
  tokens (`--codex-space-1` through `--codex-space-5`).
- Rename the severity thresholds from `elevated`/`critical` (60/85% used)
  to `warning`/`critical` (75/90% used), and the color palette from
  `normal`/`elevated`/`missing`/`stale` to `ok`/`warning`/`unknown`, with
  `stale` no longer a configurable color (freshness now uses one fixed,
  non-severity CSS variable).
- Remove `appearance.panel_radius`. It rounded per-item panels that no
  longer exist after the visual rework above, so it had become dead
  configuration.
- Default `compact` to `true`. A fresh install now opens on just the
  status chip, the most-constrained-limit callout, and the primary
  limits — matching the original "answer three questions immediately"
  goal of this redesign — with the details toggle one click away.
- Fix the most-constrained-limit callout naming the wrong thing when an
  account is blocked by credits or an unrecognized reason: it previously
  always said "blocked by your {limit}" even when the real blocker had
  nothing to do with a specific rate-limit window. It now has dedicated
  copy for each of the four blocker states (spend, credits, usage limit,
  unknown), matching the existing blocker-note text.
- Format spend amounts (remaining/used/limit) as USD, consistent with the
  credits copy — they previously rendered as bare numbers.
- Add subtle, uppercase section labels ("Credits", "Spending", "Profile",
  "Account") above each detail group, matching the treatment "Additional
  limits" already had. Still no borders, backgrounds, or boxes — just a
  small heading and spacing, per the single-surface design.

This is a breaking change for anyone with an existing card configuration
that sets `display_mode`, `thresholds.elevated`, `colors.normal` /
`colors.elevated` / `colors.stale` / `colors.missing`, or
`appearance.panel_radius` — those keys are no longer read. Anyone relying
on the previous expanded-by-default behavior should set `compact: false`
explicitly. Nothing else in the config schema changed.

## 0.5.4 - 2026-08-18

- Derive a limit's reset time from the backend's `reset_after_seconds` when
  the absolute `reset_at` timestamp is missing or unparsable. This applies to
  both rate-limit windows and spend controls, so a reset sensor stays
  available instead of dropping to unknown. An absolute timestamp still wins
  whenever the backend sends one.
- Update the `tests` and `integration-smoke` CI jobs to Home Assistant
  `2026.8.2`. `pytest-homeassistant-custom-component` now pins that exact
  release, which removes the split pin `0.5.3` had to carry. The
  `tests-min-version` job still proves the declared minimum `2026.3.0`.
- Let Dependabot track the `frontend` npm manifest monthly, next to the
  existing GitHub Actions updates. Major TypeScript updates are ignored while
  `typescript-eslint` only accepts TypeScript versions below `6.1.0`.
- Update compatible frontend maintenance releases: ESLint to `10.8.1`,
  `happy-dom` to `20.11.2`, `@playwright/test` to `1.62.1`,
  `typescript-eslint` to `8.67.0`, Vite to `8.2.1`, and Vitest with
  `@vitest/coverage-v8` to `4.1.11`. TypeScript stays at `6.0.2`.
- Refresh the transitive `brace-expansion` development dependency that
  arrived with ESLint `10.8.1`, clearing a high-severity denial-of-service
  advisory. The published card bundle never depended on it.
- Re-verify the HTTP contract against the official open-source Codex client
  (`openai/codex`, `rust-v0.148.0-alpha.22`). The OAuth client ID, the
  device-authorization routes, the token endpoint, and all four read-only
  ChatGPT backend endpoints are unchanged, as are the usage payload fields
  this integration reads. No contract change was required.
- Record in `api.py` that the dedicated `code_review_rate_limit` key is an
  older response shape. The current backend schema reports code review
  through `additional_rate_limits`, and the key is kept only so accounts
  still served it do not lose the limit.

Apart from the reset-time fallback, this release contains no behavior changes
to the integration or the bundled dashboard card.

## 0.5.3 - 2026-07-21

- Remove the redundant `custom_components/codex_usage/strings.json`. Home
  Assistant only loads custom-integration translations from `translations/`
  at runtime; `translations/en.json` is now the canonical key set that
  `translations/de.json` is checked against.
- Allow Prettier to accept either LF or CRLF line endings (`endOfLine:
  "auto"`) so a Windows checkout with `core.autocrlf=true` no longer fails
  `format:check` locally, while all other style rules stay strict.
- Update CI to `actions/setup-python@v7` and `actions/setup-node@v7`,
  matching the already-current `actions/checkout@v7`.
- Update the `tests` CI job and the documented local dev setup to Home
  Assistant `2026.7.3`. The `integration-smoke` job stays on `2026.7.2`
  because `pytest-homeassistant-custom-component` currently pins that exact
  Home Assistant release.
- Update compatible frontend maintenance releases: `happy-dom` to `20.11.0`,
  Prettier to `3.9.6`, `typescript-eslint` to `8.65.0`, and Vite to `8.1.5`.
  TypeScript stays at `6.0.2`, since `typescript-eslint@8.65.0` only accepts
  TypeScript versions below `6.1.0`.

This release contains no behavior changes to the integration or the bundled
dashboard card.

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
