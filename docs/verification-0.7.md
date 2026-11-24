# Codex Usage 0.7.7 verification

Reviewed on 2026-11-24. The [0.7.6 record](verification-0.7.6.md) preserves
previous release evidence. This record separates local checks, Linux CI and
production observations.

## Scope

- Marketplace publishing metadata, installation guidance and version 0.7.7.
- Workspace discovery respects explicit session-access and deactivation flags.
- Current Python test lane: HA 2026.11.2, with no unused older-runtime harness
  and no Pillow override. Minimum HA 2026.3.0 remains unchanged.
- Compatible frontend tooling updates and rebuilt bundled card.
- See the [provider review](research/2026-11-24-openai-documentation-recheck.md)
  and [Marketplace release guide](https://contributors.home-assistant.io/marketplace/guides/releases/).

## Local evidence

The initial maintenance patch passed 351 Python unit tests, three real-HA
smoke tests, 159 frontend unit tests, coverage, formatting, lint, type checks
and all 32 Chromium browser tests. Four workspace regression cases failed
before the parser correction and passed afterward. The local Python runtime
is 3.14.10 with HA 2026.8.3, not the release's Linux runtime matrix.

The final 0.7.7 local run passed 350 Python unit tests, three integration
smoke tests, 159 frontend unit tests and all 32 browser tests. Ruff, frontend
formatting/lint/type checks, coverage, build and both current dependency audits
pass. Both Python locks reproduce byte-for-byte with uv 0.13.6. The one fewer
unit test is the obsolete Pillow-override metadata test removed with its
override; the functional tests are retained. Current Linux runtime checks
are recorded separately below.

## Linux CI and publication

Pending the final release-candidate PR and merged-commit checks. Do not treat
local results as proof that the HA 2026.11.2 or 2026.3.0 matrix passed.

## Production observations and limits

The existing production installation runs released 0.7.6 on HA 2026.11.2.
Usage, profile and reset sources were healthy during the review. One generic
fetch error at 12:07 CET recovered by 12:12; its retained message does not
identify a cause. No production login, reset redemption or purchase was made.
The release patch has not been installed there during this review.

The minimum test environment retains known inherited advisories. WHAM HTTP
endpoints remain undocumented as a stable third-party API. A green release
cannot guarantee every account's response shape or future provider behavior.
