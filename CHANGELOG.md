# Changelog

All notable changes to this project are documented here.

## 0.3.1 - 2026-07-12

- Add a new neutral, brand-independent integration icon designed for clear
  display at Home Assistant icon sizes.
- Refine the README and acknowledgements for HACS publishing while preserving
  the API stability, authentication, trademark, and attribution disclosures.
- Streamline the public repository to integration, user, contributor, and
  maintenance documentation relevant to the project.
- Update GitHub Actions to current Node 24-based action releases and validate
  against Home Assistant 2026.7.2 while retaining the 2026.3.0 minimum test.
- No runtime behavior changes from 0.3.0.

## 0.3.0 - 2026-07-12

- Restore correct weekly usage reporting for the new response shape where a
  weekly-only limit is returned as `primary_window` and `secondary_window` is
  absent. Windows are now classified by their actual duration instead of their
  `primary`/`secondary` position, while existing entity IDs remain unchanged.
- Keep the five-hour entities unavailable when OpenAI does not return a
  five-hour window, rather than showing weekly data under the wrong name.
- Add a read-only sensor for available usage-limit reset credits and an
  optional binary sensor for the credit overage-limit state.
- Discover code-review limits and previously unknown main-limit durations as
  dynamic read-only sensors when OpenAI returns them, and include those limits
  in the overall "Rate limit reached" binary sensor.
- Name dynamic limit windows by duration and add regression coverage for old,
  reversed, rounded, weekly-only, malformed, and newly extended API responses.
- Update the README and example dashboard for the expanded read-only data.

## 0.2.0 - 2026-07-02

- **Privacy fix:** stop using the ChatGPT account email as the device, entity,
  and config entry name. It previously appeared in the Home Assistant UI and
  was baked into generated entity IDs (e.g.
  `sensor.codex_usage_<email>_five_hour_usage`), which persist in the recorder
  database, statistics, and automations. Names are now based on the opaque
  `account_id` only. **If you installed 0.1.0, updating alone does not remove
  the email from your existing config entry title, device name, or entity
  IDs** — Home Assistant does not recompute or rename those on a code update.
  Remove and re-add the integration (Settings → Devices & services → Codex
  Usage → ⋮ → Delete, then add it again) to get the new naming, or rename the
  affected entities/device manually.
- Lower the minimum Home Assistant requirement from 2026.6.0 to 2026.3.0, the
  first release that requires Python 3.14 (needed for this integration's
  `except X, Y:` syntax). Verified by running the full test suite against
  `homeassistant==2026.3.0`; a `tests-min-version` CI job now guards this.
- Note in README.md that this integration reuses the Codex CLI's public OAuth
  client ID and an undocumented usage endpoint, both of which OpenAI could
  change or restrict without notice.

## 0.1.0 - 2026-07-01

- Initial HACS-compatible Home Assistant integration.
- OpenAI device-code authentication and automatic token refresh.
- Five-hour, weekly, credit, spending, and dynamic additional-limit entities.
- English and German translations, diagnostics, tests, and example dashboard.
- Neutral brand artwork and explicit Home Assistant 2026.6 HACS requirement.
- Defensive handling for missing and non-finite usage values.
