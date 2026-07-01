# Changelog

All notable changes to this project are documented here.

## Unreleased

- Lower the minimum Home Assistant requirement from 2026.6.0 to 2026.3.0, the
  first release that requires Python 3.14 (needed for this integration's
  `except X, Y:` syntax). Verified by running the full test suite against
  `homeassistant==2026.3.0`; a `tests-min-version` CI job now guards this.

## 0.1.0 - 2026-07-01

- Initial HACS-compatible Home Assistant integration.
- OpenAI device-code authentication and automatic token refresh.
- Five-hour, weekly, credit, spending, and dynamic additional-limit entities.
- English and German translations, diagnostics, tests, and example dashboard.
- Neutral brand artwork and explicit Home Assistant 2026.6 HACS requirement.
- Defensive handling for missing and non-finite usage values.
