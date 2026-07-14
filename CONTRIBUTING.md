# Contributing

1. Fork the repository and create a focused branch.
2. Use Python 3.14 for development (matches CI); the integration's declared minimum is Home Assistant 2026.3.0 (see `hacs.json`).
3. Run `ruff format .`, `ruff check .`, and `pytest`.
4. In `frontend/`, run `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:coverage`, `npm run build`, and `npm run test:visual`.
5. Never include access tokens, refresh tokens, ID tokens, device codes, cookies, or unredacted diagnostics in issues or test fixtures.
6. Explain user-visible changes in `CHANGELOG.md`.

Backend compatibility changes should remain inside `custom_components/codex_usage/api.py` whenever possible. Include sanitized response fixtures that cover old and new response shapes.

## Releasing

1. Bump `version` in `custom_components/codex_usage/manifest.json` (SemVer) and add an entry to `CHANGELOG.md`.
2. Run the Python, frontend, bundle, browser, HACS, and hassfest checks in `.github/workflows/validate.yml`.
3. Test fresh setup, token refresh, reauthentication, reload, and removal on a current Home Assistant release.
4. Tag a GitHub release whose tag matches the manifest version exactly (e.g. `0.1.0`).
5. Optionally submit the repository for inclusion in the HACS default catalog once it has real-world users.

