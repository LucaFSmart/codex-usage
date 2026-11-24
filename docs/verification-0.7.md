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

The initial HA 2026.11.2 runtime job exposed a test-bootstrap omission:
`frame.async_setup(hass)` was missing. HA checks config-entry return values via
that helper even when the boolean remains valid for a custom integration.
The test now initializes it and asserts the entry is loaded before checking
entities. See the [initial failed job](https://github.com/LucaFSmart/codex-usage/actions/runs/45388611653).
This is a test-environment correction; the production entrypoint contract
remains compatible with the retained minimum. See
[HA's contract guidance](https://contributors.home-assistant.io/blog/2026/10/23/config-entry-methods-return-none/).

Release candidate `c70eb5a95a1295e4e44810b0a66bf4f393f39bde` passed the complete
[Validate push run](https://github.com/LucaFSmart/codex-usage/actions/runs/45388955853)
and both languages in [CodeQL](https://github.com/LucaFSmart/codex-usage/actions/runs/45388965446).
This includes both Linux runtime/Blueprint targets (HA 2026.11.2 and 2026.3.0),
both Python suites, lock reproduction, the strict current Python audit, HACS,
hassfest and all frontend gates including Chromium tests. The PR runtime jobs
also passed for both targets in
[PR validation](https://github.com/LucaFSmart/codex-usage/actions/runs/45388965368).
An independent source review found no code regressions; two stale documentation
references were corrected. [PR #40](https://github.com/LucaFSmart/codex-usage/pull/40)
contains the release patch.

This verification-record update is documentation-only and must pass the same
checks before merge. The merged commit is checked again before publishing tag
and GitHub release `0.7.7`; the tag must match the manifest version.

## Production observations and limits

The existing production installation runs released 0.7.6 on HA 2026.11.2.
Usage, profile and reset sources were healthy during the review. One generic
fetch error at 12:07 CET recovered by 12:12; its retained message does not
identify a cause. No production login, reset redemption or purchase was made.
The release patch has not been installed there during this review.

The minimum test environment retains known inherited advisories. WHAM HTTP
endpoints remain undocumented as a stable third-party API. A green release
cannot guarantee every account's response shape or future provider behavior.
