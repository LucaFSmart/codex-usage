# Contributing

1. Fork the repository and create a focused branch.
2. Use Python 3.14 and Home Assistant 2026.6 or newer.
3. Run `ruff format .`, `ruff check .`, and `pytest`.
4. Never include access tokens, refresh tokens, ID tokens, device codes, cookies, or unredacted diagnostics in issues or test fixtures.
5. Explain user-visible changes in `CHANGELOG.md`.

Backend compatibility changes should remain inside `custom_components/codex_usage/api.py` whenever possible. Include sanitized response fixtures that cover old and new response shapes.

## Releasing

1. Bump `version` in `custom_components/codex_usage/manifest.json` (SemVer) and add an entry to `CHANGELOG.md`.
2. Run Ruff, pytest, HACS validation, and hassfest (`.github/workflows/validate.yml` runs all four on push).
3. Test fresh setup, token refresh, reauthentication, reload, and removal on a current Home Assistant release.
4. Tag a GitHub release whose tag matches the manifest version exactly (e.g. `0.1.0`).
5. Optionally submit the repository for inclusion in the HACS default catalog once it has real-world users.

