# Changelog

All notable changes to this project are documented here.

## Unreleased

- **Privacy fix:** stop using the ChatGPT account email as the device, entity,
  and config entry name. It previously appeared in the Home Assistant UI and
  was baked into generated entity IDs (e.g.
  `sensor.codex_usage_<email>_five_hour_usage`), which persist in the recorder
  database, statistics, and automations. Names are now based on the opaque
  `account_id` only. Existing installations keep their old entity IDs until
  the integration is removed and re-added (Home Assistant does not rename
  entity IDs automatically); remove and re-add the integration, or rename the
  affected entities manually, to drop the email from entity IDs already
  created by 0.1.0.
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
