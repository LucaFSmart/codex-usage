# Codex Usage 0.5.4 Maintenance Design

## Objective

Prepare a focused `0.5.4` maintenance update that moves validation onto the
current Home Assistant `2026.8.2`, hardens reset-time parsing against a missing
absolute timestamp, and refreshes frontend tooling without expanding product
behavior. The declared minimum stays Home Assistant `2026.3.0`.

## Current State

- Released integration and card version: `0.5.3`.
- Current Home Assistant release: `2026.8.2`; declared minimum `2026.3.0`
  already requires Python `>=3.14.2`, so the repository's Python `3.14` target
  covers the whole supported span.
- 111 Python tests and 54 frontend tests pass; Ruff, ESLint, TypeScript, and
  bundle parity are clean on `0.5.3`.
- The `integration-smoke` job was pinned to Home Assistant `2026.7.2` because
  `pytest-homeassistant-custom-component` required exactly that release. Version
  `0.13.356` now pins `homeassistant==2026.8.2`, so the split pin can go.
- Dependabot tracks GitHub Actions only, which is why eight frontend packages
  drifted behind between releases.
- Home Assistant `2026.8` restricts a device to a single config entry and
  renames frontend component sizes to Web Awesome short names. Neither applies:
  each config entry owns its own service device, and the card sets no `size`
  attributes.
- HACS default-catalog PR #9138 is open with all checks green and no reviewer
  feedback. 418 older pull requests sit ahead of it in the queue.

## API Contract Review

Re-checked against `openai/codex` at `main` (`rust-v0.148.0-alpha.22`):

- `CLIENT_ID` is unchanged at `app_EMoamEEZ73f0CkXaXp7hrann`.
- Device authorization still uses `{issuer}/api/accounts/deviceauth/usercode`
  and `/token`, the verification page `{issuer}/codex/device`, and the redirect
  `{issuer}/deviceauth/callback`, with `{issuer}` = `https://auth.openai.com`.
- Tokens are still exchanged and refreshed at `{issuer}/oauth/token`.
- The four read-only endpoints still resolve to `/backend-api/wham/usage`,
  `/wham/profiles/me`, `/wham/accounts/check`, and
  `/wham/rate-limit-reset-credits`.
- The usage payload still carries `plan_type`, `rate_limit`, `credits`,
  `spend_control`, `additional_rate_limits`, `rate_limit_reached_type`, and
  `rate_limit_reset_credits`. Newer blocker strings such as
  `workspace_owner_credits_depleted` still resolve through the existing
  substring mapping.

No contract change is required. Three observations do not justify code changes:

- `credits.overage_limit_reached` is absent from the current backend schema.
  The parser reads it defensively and yields `None` when it is missing.
- `code_review_rate_limit` is likewise absent; code review is reported through
  `additional_rate_limits`. The branch is kept for accounts still served the
  older shape and is now documented as such in `api.py`.
- `credits.approx_local_messages`, `credits.approx_cloud_messages`, and
  `profile.stats.daily_usage_buckets` are new upstream fields. The first two are
  untyped in the generated models and unread by the client, and the third is a
  time series that does not fit a sensor state. All three stay out of scope
  until real response data justifies a design.

## Design Decisions

### Reset-time fallback

Every reset payload carries `reset_after_seconds` next to `reset_at`, for both
rate-limit windows and the spend control. The parser reads only `reset_at`, so a
missing or unparsable absolute timestamp drops a reset sensor to unknown even
though a usable relative offset was delivered.

Add one `_reset_time` helper that prefers `reset_at` and otherwise returns the
current time plus a non-negative `reset_after_seconds` offset. Both the window
parser and the spend-limit parser consume it. Offset validation follows the
module's existing numeric coercion: booleans, negatives, and non-finite values
are rejected, and numeric strings are accepted exactly as the surrounding
percentage and duration helpers accept them.

### Validation matrix

- `tests` and `integration-smoke` move to Home Assistant `2026.8.2`.
- `tests-min-version` stays on `2026.3.0` and keeps proving the declared
  minimum.
- The Python target and the `3.14` CI interpreter stay unchanged.

### Dependency policy

Add an npm Dependabot entry for `/frontend` on the same monthly schedule as the
GitHub Actions entry, and ignore major TypeScript updates for as long as
`typescript-eslint` accepts only TypeScript below `6.1.0`. Take the compatible
minor and patch releases now; keep TypeScript at `6.0.2`.

## File Responsibilities

- `custom_components/codex_usage/api.py`: `_relative_seconds` and `_reset_time`
  helpers, their two call sites, and the note on the legacy code-review key.
- `tests/test_api.py`: fallback, precedence, and rejection cases for the
  relative offset, plus the spend-control fallback.
- `.github/workflows/validate.yml`: Home Assistant pins.
- `.github/dependabot.yml`: npm ecosystem and TypeScript major-version guard.
- `frontend/package.json` and `frontend/package-lock.json`: exact tool versions.
- Version-bearing source, tests, fixtures, README, and changelog: consistent
  `0.5.4`.

## Verification Strategy

1. Ruff check and format.
2. Python unit tests under Home Assistant `2026.8.2`.
3. Python unit tests under the minimum Home Assistant `2026.3.0`.
4. ESLint, TypeScript, Vitest, coverage, bundle parity, and Playwright visual
   tests under Node `24`.
5. `npm audit` with zero known vulnerabilities.
6. Version-string search and a clean Git status after commits.

Any failed check blocks the push.

## Non-Goals

- No new entities, card features, endpoints, or configuration options.
- No change to polling, authentication, account selection, or plan handling.
- No minimum Home Assistant version increase.
- No TypeScript major-version migration.
- No release publication, tag, or HACS queue intervention.
