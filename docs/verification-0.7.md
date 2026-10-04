# Codex Usage 0.7.4 verification

Reviewed on 2026-10-04, with the final dependency refresh checked on 2026-10-05 from fresh command output. The [0.7.3 record](verification-0.7.3.md) preserves the previous release evidence. Publication is gated on the final commit's remote checks, not this local record alone.

## Environments and gates

| Environment                                      | Role                                                                   |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| Python 3.14.6 / Home Assistant 2026.8.3, Windows | Local full Python suite and portable real-HA runtime harness           |
| Home Assistant 2026.3.0, Linux                   | Exact declared minimum: full suite and runtime/Blueprint matrix in CI  |
| Home Assistant 2026.9.4, Linux                   | Current HA target: full suite and runtime/Blueprint matrix in CI       |
| Node.js 22.23.1 locally / Node.js 24 in CI       | Frontend lint, types, audit, unit/coverage, bundle and Chromium checks |

Both Linux environments install their exact hash-locked test requirements. CI regenerates both locks with uv 0.12.5, Python 3.14.2 and `x86_64-manylinux_2_28`, seeding the pinned outputs, and requires byte-for-byte equality. The exact minimum omits the upstream pytest HA plugin because it does not pin Home Assistant 2026.3.0. The current lane uses pytest-homeassistant-custom-component 0.13.367 and the documented asyncio settings.

## Local evidence

- Ruff 0.16.10 format check and lint passed.
- Python: 305 repository tests plus 3 real runtime tests passed. Five dependency deprecation warnings remain in the local HA/aiohttp/backoff environment.
- Runtime checks cover component setup, later main-window discovery, stable IDs, no duplicate entities, persisted disabled settings, options reload, failed usage availability, unload, Repairs and Recorder metadata. Authentication/config-flow fixtures cover refresh and reauthentication without live credentials.
- Regression tests reproduce the selected-account status/freshness defect, card detach/reconnect and old-response races, queued update delivery, quota-cooldown cause changes, malformed error codes, oversized numeric inputs, invalid encoding and false duplicate-window conflicts.
- Frontend: formatting, ESLint and TypeScript passed; 151 unit tests passed. Coverage for the configured parser/config/view-model scope: 96.99% statements, 93.78% branches, 100% functions and lines.
- A clean npm install with a newly created empty cache passed; npm audit reported zero vulnerabilities. The final frontend toolchain uses ESLint 10.12.0, Vitest/coverage 5.0.3 and Vite 8.3.2. Its production build preserves the committed bundle (93.06 kB, 24.52 kB gzip), and the bundle check passed.
- Chromium: all 20 responsive/state/interaction tests passed, including exhausted/healthy account switching in light and dark modes at widths from 320 to 1,200 pixels.
- Manifest, Python card/cache/User-Agent version, frontend package/lock and harness metadata agree on 0.7.4. Manual resource examples use `?v=0.7.4`.
- All repository Markdown relative targets exist; external URL checks found no hard HTTP/network failure. Authentication/bot-protection responses do not prove page contents. Current OpenAI pages were opened and reviewed separately in the [October research record](research/2026-10-04-openai-documentation-recheck.md).
- The existing HA installation was checked read-only via MCP and Chrome: HA 2026.9.4, valid configuration, no active Repairs, Codex entry loaded, live card visible, no Codex system-log errors. It still runs 0.7.3; this is not a deployment test of 0.7.4.

## Remote publication evidence

The final PR and merged commit must pass Validate and CodeQL: HACS, hassfest, full latest/minimum Python suites, both real runtime/Blueprint targets, lock reproduction, frontend checks and both CodeQL languages. [PR #23](https://github.com/LucaFSmart/codex-usage/pull/23) delivered the runtime fixes. [PR #28](https://github.com/LucaFSmart/codex-usage/pull/28) incorporates the later Dependabot PRs #24–#27 and the current ESLint patch; its results remain visible in [GitHub Actions](https://github.com/LucaFSmart/codex-usage/actions). The release tag must match the manifest exactly and point to the verified merged commit.

## Dependency and provider limits

The final direct npm dependency check leaves TypeScript 6.0.3 deliberately pinned: typescript-eslint 8.71.0 and its parser declare `>=4.8.4 <6.1.0`, which excludes the published TypeScript 7.0.2 major. The existing Dependabot major-update ignore remains necessary until that supported peer range widens.

GitHub reported 92 open Python dependency alerts during this audit: 76 in the minimum compatibility snapshot and 16 in the current-runtime test lock. The latter concern PyJWT/cryptography versions pinned exactly by Home Assistant 2026.9.4 (`2.13.0` / `48.0.1`), confirmed against its published package metadata. Forcing newer versions would stop testing the declared HA environment. These environments are development-only; the integration's manifest has no additional Python requirements. Alerts remain visible and are not dismissed as false positives. Keep deployed Home Assistant current; this report does not certify its dependencies free of vulnerabilities.

The authenticated WHAM HTTP source is not documented as a stable third-party API. Sanitized fixtures and defensive parsing cannot guarantee future provider compatibility or every plan's live behavior. App Server remains a separate interface with stable and opt-in experimental methods. No live purchase, reset redemption, new authorization or notification delivery was performed.
