# Codex Usage 0.7.0

0.7 is a broad consistency, resilience and dashboard release. It keeps existing account and entity identities while making unknown, stale and optional data explicit.

## Highlights

- A redesigned bilingual card keeps the standard five-hour and weekly positions stable, uses neutral placeholders for missing values, and moves optional data into configurable sections.
- Card configuration now controls each section and individual metric with Automatic, Always show and Hide modes. Source diagnostics remain hidden by default.
- Main, additional, credit and spend blockers are normalized without making unrelated healthy windows appear exhausted.
- Saved-reset counts use one priority rule across sensors and card. Expiry is shown only when detail and usage sources agree, matching OpenAI's clarified banked-reset behavior.
- Provider `Retry-After` for HTTP 429 and 503 is honored across usage, optional reads and credential refresh. Manual refresh cannot bypass the cooldown.
- Optional profile and reset failures are isolated from main usage. Source state, last success and safe error categories are available without exposing raw responses.
- New disabled-by-default usage-budget sensors show remaining percentage points per hour. The card converts long windows to pp/day and suppresses stale or invalid calculations.
- Four disabled diagnostic timestamp sensors expose the last successful usage, profile, reset-detail and workspace-discovery observations.
- An optional warning Blueprint provides persisted hysteresis with a user-selected action and Toggle helper.
- Recorder metadata for aggregate counters was corrected, English canonical strings were added, and tests now cover Home Assistant 2026.3.0 and 2026.8.3.

Read [upgrading to 0.7](upgrading-to-0.7.md) before updating. Installation, entity, card, automation, privacy and troubleshooting guides are linked from the [README](../README.md).

## Compatibility

Home Assistant 2026.3.0 or newer is required. Existing config entries and stable unique IDs are preserved. The card payload remains schema 1; refresh the browser after installation to load the 0.7 bundle. This candidate has not been tagged or published.
