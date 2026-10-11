# Codex Usage 0.7.5 verification

Reviewed on 2026-10-12. The [0.7.4 record](verification-0.7.4.md) preserves earlier evidence. This record covers the maintenance patch and distinguishes local execution, remote Linux checks and production installation.

## Environments

| Environment | Evidence |
| --- | --- |
| Python 3.14.6 / HA 2026.8.3, Windows | Full unit suite and portable real-HA integration harness |
| HA 2026.3.0, Ubuntu CI | Declared compatibility floor, exact hash-locked runtime |
| HA 2026.10.1, Ubuntu CI | Current runtime, harness 0.13.372, strict dependency audit |
| Node 22.23.1 locally / Node 24 in CI | Frontend tools, unit/coverage and Chromium browser tests |

Both Python locks reproduce byte-for-byte with uv 0.12.23 and the documented Linux x86_64/Python 3.14.2 compile target. See [requirements guidance](../requirements/README.md). Linux runtime checks must pass on the final PR commit before publication; local Windows tests cannot substitute for them.

## Fresh local evidence

- 329 Python unit tests and 3 real-HA integration tests pass. Five warnings originate in installed HA/backoff dependencies. Ruff lint and formatting pass.
- Frontend format, ESLint and TypeScript checks pass. 159 unit tests pass. Coverage gates for config/data/view-model modules pass; this percentage does not describe every UI rendering branch.
- All 32 Chromium browser tests pass: standard light/dark themes, semantic states, selected-account isolation, disclosure, keyboard controls, actual composited status text contrast, and 240/320/480-pixel cards in a 1200-pixel desktop viewport. The independent UI review also checks internal text bounds at 160/200/240/320 pixels with long German labels.
- Current Python lock and npm audit report zero known vulnerabilities. Both environments patch the flexible multidict dependency; source-map-js is 1.2.2. TypeScript remains 6.0.3 because the parser's supported peer range excludes 7.
- The production bundle is rebuilt with Vite 8.3.4. Manifest, Python card/cache/User-Agent version, package/lock, harness and manual resource URLs agree on 0.7.5.
- Updated documentation captures were inspected at 720x600 compact dark, 720x1400 expanded dark and 360x800 compact light German viewports. The expanded capture uses full-page height to show every detail row. These are synthetic fixtures, not account screenshots.
- In-app browser verification loads meaningful content without an error overlay, changes the selected account and expands Details. No relevant runtime errors appear; the development harness emits Lit's expected development-mode warning. Repository Playwright provides repeatable viewport, keyboard, state and console checks.
- Visual comparison retains the existing information architecture, ring/bar rows, continuous Details area and HA theme backgrounds. Intentional repairs: readable typography/opacity, wrapping status text, card-width adaptation, touch target spacing and explicit accessible control state. No new product copy, external card dependency or raster UI was introduced.
- Independent frontend/backend code reviews found no unresolved blocking regression after the fractional-threshold follow-up. The scoped original-snapshot security scan reports zero findings with partial static coverage; see the [review limits](research/2026-10-12-maintenance-and-card-review.md).
- Live HA remains integration 0.7.4 on Core 2026.10.1: loaded entry, successful sources, no active Repairs or offered updates, and no matching Codex runtime error in the queried log window. This is not a deployment test of 0.7.5. No authenticated Chrome tab was exposed in this session; live state was read through HA MCP and updated UI verified in the local harness.

## Remote checks

Publication requires Validate and both CodeQL languages on the final immutable commit: HACS, hassfest, current/minimum Python suites, both real runtime/Blueprint targets, Python lock reproduction, current Python audit, frontend format/lint/types/audit/unit/coverage/bundle and all Chromium checks. Remote results are recorded after the run completes.

The implementation commit `8596e87215d0a8f83b9cb3430534f8e023376173` passed the complete [Validate run](https://github.com/LucaFSmart/codex-usage/actions/runs/38184910639) and both languages in [CodeQL](https://github.com/LucaFSmart/codex-usage/actions/runs/38184910769). This includes real Linux runtime/Blueprint execution on Home Assistant 2026.3.0 and 2026.10.1, byte-for-byte lock reproduction, the strict current Python audit and all frontend gates. The corresponding push runs also passed. [PR #29](https://github.com/LucaFSmart/codex-usage/pull/29) contains the reviewed update; any subsequent commit still requires its own green required checks before merge/publication.

## Retained constraints

The maintainer explicitly retains HA 2026.3.0 support. Its exact old dependency snapshot retains 76 known GitHub alerts and newer audit findings; none are dismissed or hidden. It is a test target, not a deployment recommendation. Forcing newer exact HA dependencies would invalidate that runtime target.

WHAM HTTP endpoints remain undocumented as a stable third-party API. Tests and current provider review cannot guarantee every plan's live response or future schema. No production login, purchase, reset redemption, notification delivery or permission attack was performed.
