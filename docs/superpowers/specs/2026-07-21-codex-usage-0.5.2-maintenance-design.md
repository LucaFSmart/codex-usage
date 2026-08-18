# Codex Usage 0.5.2 Maintenance Design

## Status

Historical planning document, retained for context. The work it describes
shipped across `0.5.2` and `0.5.3` with one deliberate deviation:

- The "Home Assistant percentage-unit compatibility" decision below rests on a
  premise that does not hold. Home Assistant `2026.7` and `2026.8` define
  `homeassistant.const.PERCENTAGE` as `UnitOfRatio.PERCENTAGE.value` with no
  `_DEPRECATED_PERCENTAGE` entry and no runtime warning, so `PERCENTAGE` is a
  plain alias rather than a deprecated constant. The planned
  `custom_components/codex_usage/compat.py`, its `PERCENTAGE_UNIT` constant,
  and `tests/test_compat.py` were therefore never created, and `sensor.py`
  keeps importing `PERCENTAGE` directly. Verified again for `0.5.4` against
  Home Assistant `2026.8.2`.

## Objective

Prepare a focused `0.5.2` maintenance update that keeps Codex Usage compatible
with Home Assistant `2026.3.0` and current Home Assistant `2026.7.3`, restores a
fully deterministic local validation workflow on Windows, and updates supported
tooling without expanding product behavior.

The implementation ends after verified commits are pushed to a `codex/` branch.
Creating a tag, publishing a GitHub release, and changing HACS default-catalog PR
[#9138](https://github.com/hacs/default/pull/9138) are outside this scope.

## Current State

- Released integration and card version: `0.5.1`.
- Declared minimum Home Assistant version: `2026.3.0`.
- Current Home Assistant release used for the update: `2026.7.3`.
- HACS default-catalog PR #9138 is open with all automated checks passing and no
  reviewer feedback.
- Python unit tests pass against Home Assistant `2026.7.3`.
- Frontend lint, type checking, bundling, and dependency audit pass.
- One frontend test fails after its fixed fixture timestamps become stale.
- Prettier's default LF enforcement conflicts with the repository's Windows
  checkout under system-level `core.autocrlf=true`.
- The shared working tree already contains an uncommitted Claude-authored fix in
  `frontend/tests/card.test.ts`. It fakes only `Date`, keeps real timeout behavior,
  and has reportedly restored all 54 frontend unit tests. This is user-owned work
  that the implementation must review, verify, preserve, and incorporate instead
  of replacing blindly.
- The OpenAI usage and reset-credit routes, supported plan labels, and defensive
  response parsing have been cross-checked against the official open-source Codex
  client. No API-contract change is required by this maintenance update.
- A temporary `LucaFSmart/brands` fork exists, but no Brands PR was opened. Home
  Assistant `2026.3.0` and later prefer the integration's existing local
  `brand/icon.png`, so the fork is unrelated to the implementation.

## Design Decisions

### Home Assistant percentage-unit compatibility

Home Assistant `2026.7` deprecates using `homeassistant.const.PERCENTAGE` as a
sensor unit in favor of `UnitOfRatio.PERCENTAGE`. `UnitOfRatio` does not exist in
Home Assistant `2026.3.0`, so raising the minimum version merely to adopt the new
enum is not justified.

Add a small compatibility module that exports `PERCENTAGE_UNIT`. It imports
`UnitOfRatio.PERCENTAGE` when available and otherwise exports the literal `%`.
All static and dynamically discovered percentage sensors consume that one
constant. Current-version tests assert use of the enum; the existing minimum
version CI job proves that the fallback imports and runs on `2026.3.0`.

### Deterministic frontend time

The multi-account aggregate-status test must control `Date` explicitly. Freeze
only the JavaScript clock for the affected test at a timestamp compatible with
the existing fixture, then restore real timers after every test. Do not hide the
problem by increasing `stale_after_minutes` or moving fixture dates into the far
future. Begin implementation by reviewing and running the existing uncommitted
change; retain it if it satisfies this contract and the complete frontend suite.

### Cross-platform formatting

Set Prettier's `endOfLine` option to `auto`. This keeps the formatter strict about
all other style rules while allowing the same tracked content to validate in LF
CI checkouts and CRLF Windows working trees. Avoid repository-wide line-ending
renormalization in this maintenance update.

### CI and dependency boundaries

- Update the ordinary current-version Python test job from Home Assistant
  `2026.7.2` to `2026.7.3`.
- Keep the integration smoke job on Home Assistant `2026.7.2` and pin
  `pytest-homeassistant-custom-component==0.13.346`, because that helper release
  requires exactly Home Assistant `2026.7.2`. Updating both together belongs in
  a later maintenance change once a compatible helper release exists.
- Keep the minimum-version job on Home Assistant `2026.3.0`.
- Update `actions/setup-python` and `actions/setup-node` from major version `v6`
  to `v7`; retain `actions/checkout@v7`.
- Update only compatible frontend maintenance releases: `happy-dom` to
  `20.11.0`, Prettier to `3.9.6`, `typescript-eslint` to `8.65.0`, and Vite to
  `8.1.5`.
- Keep TypeScript at `6.0.2`. `typescript-eslint@8.65.0` accepts TypeScript
  versions below `6.1.0`, so TypeScript `7.0.2` is intentionally excluded.

### Custom-integration localization

Home Assistant custom integrations load complete translation files from
`translations/` and do not consume `strings.json`. Remove the redundant
`custom_components/codex_usage/strings.json`. Preserve translation-shape
coverage by treating `translations/en.json` as the canonical key set and
asserting that `translations/de.json` contains the same leaf paths.

### Version and documentation consistency

Prepare, but do not publish, version `0.5.2`. Update the integration manifest,
frontend package metadata and lockfile, backend user agent, card version,
version-bearing tests and fixtures, README resource URLs, issue-template example,
development commands, and changelog together. The changelog records only the
maintenance changes in this design and makes no claim that a GitHub release has
already been published.

## File Responsibilities

- `custom_components/codex_usage/compat.py`: Home Assistant version compatibility
  constants only.
- `custom_components/codex_usage/sensor.py`: sensor descriptions and dynamic
  sensor construction using `PERCENTAGE_UNIT`.
- `tests/test_compat.py`: current-version compatibility contract.
- `tests/test_metadata.py`: manifest, HACS, brand, and translation-shape checks.
- `frontend/tests/card.test.ts`: card behavior with an explicitly controlled
  clock.
- `frontend/.prettierrc.json`: cross-platform formatting policy.
- `.github/workflows/validate.yml`: pinned validation matrix and action versions.
- `frontend/package.json` and `frontend/package-lock.json`: exact supported
  frontend tool versions.
- Version-bearing source, tests, README, issue template, contribution guide, and
  changelog: consistent `0.5.2` preparation and HA `2026.7.3` documentation.

## Verification Strategy

Run focused failing tests before each production or configuration change, then
run the complete validation surface:

1. Python unit tests and Ruff under Home Assistant `2026.7.3`.
2. Python unit tests under the minimum Home Assistant `2026.3.0` environment.
3. Integration smoke test with Home Assistant `2026.7.2` and
   `pytest-homeassistant-custom-component==0.13.346`.
4. HACS action and Hassfest validation.
5. Prettier, ESLint, TypeScript, Vitest, coverage thresholds, bundle parity, and
   Playwright visual tests under Node `24`.
6. `npm audit` with zero known vulnerabilities.
7. Version-string search, clean generated bundle diff, and final clean Git
   status after commits.

Any failed check blocks the push. Dependency constraints are not overridden,
warnings are not converted into ignored validation failures, and the HACS PR is
left untouched.

## Commit and Push Structure

Use a new `codex/ha-2026-7-maintenance` branch and keep reviewable commits:

1. `fix: support Home Assistant percentage unit enum`
2. `test: make card freshness checks deterministic`
3. `ci: refresh validation toolchain`
4. `chore: prepare Codex Usage 0.5.2`

After the full verification suite passes, push that branch to `origin`. Do not
tag it, create a release, open or update a pull request, or modify HACS #9138.
The existing `frontend/tests/card.test.ts` change must move onto this branch
without being discarded or overwritten.

## Non-Goals

- No new entities, card features, API endpoints, or configuration options.
- No change to polling, authentication, account selection, or data normalization.
- No change to OpenAI endpoint selection, response parsing, or plan-label maps.
- No minimum Home Assistant version increase.
- No TypeScript major-version migration.
- No Home Assistant Brands submission and no deletion of the external
  `LucaFSmart/brands` fork as part of repository implementation.
- No release publication or HACS queue intervention.
