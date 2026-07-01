# Contributing

1. Fork the repository and create a focused branch.
2. Use Python 3.14 and Home Assistant 2026.6 or newer.
3. Run `ruff format .`, `ruff check .`, and `pytest`.
4. Never include access tokens, refresh tokens, ID tokens, device codes, cookies, or unredacted diagnostics in issues or test fixtures.
5. Explain user-visible changes in `CHANGELOG.md`.

Backend compatibility changes should remain inside `custom_components/codex_usage/api.py` whenever possible. Include sanitized response fixtures that cover old and new response shapes.

