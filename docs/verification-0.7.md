# Codex Usage 0.7.6 verification

Reviewed on 2026-10-25. The [0.7.5 record](verification-0.7.5.md) preserves earlier evidence. This record covers the maintenance patch: no integration source code changed apart from the version string. It distinguishes local execution from remote Linux checks.

## Triggers

- The strict Python audit failed on the current test lock: Pillow 12.3.0 (37 advisories, fixed in 13.0.0), certifi 2026.7.22 and uv 0.12.23. Dependabot reported `security_update_not_possible` for Pillow because every Home Assistant 2026.10.x release pins `Pillow==12.3.0` exactly.
- The frontend audit failed on happy-dom 20.14.6 (high severity, fixed in 21.0.4).
- Home Assistant introduced integration categories on 2026-10-20; the HACS action warns when a custom integration omits the field. The `categories` key is not yet part of the manifest schema in stable Home Assistant releases (2026.10.3 and 2026.10.4), which the unpinned hassfest image validates against, so it is deferred.

## Changes and evidence

- Home Assistant 2026.10.3 with harness 0.13.374 pins uv 0.13.5, which resolves the uv advisory. certifi is refreshed to 2026.10.23.
- Pillow 13.0.0 overrides Home Assistant's exact pin in the current lock only (`requirements/latest-test-overrides.txt`, installed with `--no-deps`). The repository's only Pillow use is opening the 256x256 brand icon in `tests/test_metadata.py`; Pillow 13.0.0 opens it locally. Whether Home Assistant 2026.10.3 itself runs with Pillow 13 is covered by the Linux runtime and full test jobs below, not by local evidence.
- The pip-audit run used in CI (`--require-hashes --disable-pip --strict`) reports no known vulnerabilities for the current lock. The minimum lock reproduces byte-for-byte with uv 0.13.5.
- Frontend: happy-dom 21.0.4 and the other non-major updates (vitest and coverage 5.0.5, ESLint 10.13.0, typescript-eslint 8.72.0, Playwright 1.64.1, Vite 8.3.5) are installed. Format, ESLint, TypeScript, 159 unit tests, coverage gates and `npm audit` (zero vulnerabilities) pass locally on Node 22 (CI uses Node 24). The rebuilt bundle is committed. TypeScript stays at 6.0.3 because typescript-eslint does not yet support 7.
- The manifest category was tried and removed: hassfest on this PR's first run failed with "not a valid option at 'categories'". Only Home Assistant's development branch accepts the key. Add `"categories": ["computers_network.cloud_developer_tools"]` (a valid, optional slug) once hassfest accepts it, expected with Home Assistant 2026.11.
- The HTTP contract was rechecked against the upstream `openai/codex` client (release 0.164.0, 2026-10-23): device-code and token routes, the OAuth client ID, `/wham/usage`, `/wham/profiles/me`, `/wham/accounts/check` and `/wham/rate-limit-reset-credits` are unchanged.
- Local evidence (Python 3.14.6 / HA 2026.8.3, Windows, repository `.venv`): 331 Python unit tests and the 3 real-HA integration tests pass, and Ruff lint and formatting pass. This includes a new metadata test that ties the Pillow override, the lock header and the `--no-deps` installs together. These runs use the older locally installed Home Assistant, not 2026.10.3 or 2026.3.0, so the Linux runtime results below remain the evidence for the supported targets.

## Remote checks

Publication requires Validate and both CodeQL languages to pass on the final commit. The code-identical commit `d6fe859e899beefc8a942222191a0b41b5760d9a` passed the complete [Validate run](https://github.com/LucaFSmart/codex-usage/actions/runs/40147302946) and both languages in [CodeQL](https://github.com/LucaFSmart/codex-usage/actions/runs/40147302961); the corresponding push runs passed too. This includes HACS, hassfest, the current (Home Assistant 2026.10.3, Pillow 13) and minimum (2026.3.0) Python suites and real runtime/Blueprint checks on Linux, lock reproduction, the strict current Python audit and all frontend gates including the Chromium tests. The first run of this PR (`61e69ec`) failed hassfest because of the manifest category described above; that is why the key was removed. [PR #31](https://github.com/LucaFSmart/codex-usage/pull/31) contains the reviewed update. This record was added in a documentation-only commit that needs its own green checks before merge.

## Retained constraints

The maintainer explicitly retains Home Assistant 2026.3.0 support. Its exact old dependency snapshot retains 129 open GitHub alerts at review time (the count grows as new advisories are published against that snapshot). None are dismissed or hidden, and the minimum lock is not used for deployment. Forcing newer exact Home Assistant dependencies would invalidate that runtime target; advancing the floor needs a separate compatibility decision.

WHAM HTTP endpoints remain undocumented as a stable third-party API. Tests and provider review cannot guarantee every plan's live response or future schema. No production login, purchase, reset redemption, notification delivery or permission attack was performed.
