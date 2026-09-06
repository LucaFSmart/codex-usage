# 0.7 verification record

This file records the checks for the local 0.7 candidate. It is updated from fresh command output before the candidate is declared complete. A passing local record is not a GitHub release, tag, push or HACS publication.

## Runtime targets

| Target | Purpose | Result |
| --- | --- | --- |
| Home Assistant 2026.3.0 | Declared minimum; complete Python suite plus real runtime | 238 passed |
| Home Assistant 2026.8.3 | Current development target; complete Python suite plus real runtime | 238 passed |
| Node.js 24.19.0 / Chromium | Card unit, coverage, build and responsive visual behavior | Passed; details below |

The exact 2026.3.0 runtime job uses a portable native Home Assistant harness. No `pytest-homeassistant-custom-component` release pins exact 2026.3.0; forcing its 2026.3.1 dependency would skip the declared minimum. The 2026.8.3 job additionally installs `pytest-homeassistant-custom-component==0.13.357`.

## Required gates

- Python formatting, Ruff and complete test suites on both Home Assistant targets.
- Real component setup, entity registration and unload on both targets.
- Real Blueprint Script execution, restored helper state, hysteresis and restart reconciliation on both targets.
- Metadata/version consistency, translation parity, privacy allowlist, authentication lifecycle, retry/cooldown and diagnostics tests.
- Frontend Prettier, ESLint, TypeScript, audit, unit tests, coverage, committed bundle check and Playwright responsive/interaction suite.
- HACS, hassfest and CodeQL remain publication gates in GitHub. Local equivalents are run where available.

## Final evidence

- Ruff format check and lint: passed for `custom_components`, `tests` and `tests_integration`.
- Python: 238 tests passed on each HA target. The runtime cases perform real config-entry setup, entity registration, options reload, core-failure availability, unload, Repairs registry create/delete, Recorder metadata creation/validation and Blueprint Script/helper execution.
- Frontend on Node.js 24.19.0: Prettier, ESLint and TypeScript passed; 131 Vitest tests passed.
- Frontend coverage: 97.02% statements, 94.3% branches, 100% functions and 100% lines for the configured parser/config/view-model scope.
- Dependency audit: zero vulnerabilities at npm's high severity threshold.
- Vite production build: passed; bundle size 90.95 kB (23.82 kB gzip).
- Playwright Chromium: 18 responsive, semantic-state and interaction tests passed from 320 to 1,200 pixels in light and dark modes.
- Visual review: real card harness rendered and inspected as a wide English overview, wide English details and narrow German layout. Synthetic labels contain no provider account identifiers or credentials.
- Markdown guide link check: ten public Markdown files checked with no missing relative targets.

The committed-bundle reproducibility check is repeated after the candidate commit, because its clean-tree assertion must compare generated output with that commit rather than the preceding 0.6 baseline.

HACS validation, hassfest and CodeQL are configured GitHub publication gates and remain pending until the branch is intentionally pushed. No live OpenAI credentials were used.

## Known limits

The integration consumes authenticated OpenAI web-product endpoints that are not documented as a stable third-party API. Sanitized fixtures and graceful unknown/unsupported behavior reduce schema-change impact but cannot guarantee future compatibility. Live production credentials, purchases, reset redemption and external notification delivery are outside this verification.
