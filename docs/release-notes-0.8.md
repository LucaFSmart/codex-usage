# Codex Usage 0.8.0

**Requires Home Assistant 2026.11.2 or newer.** Older installations should stay
on 0.7.7 until HA is upgraded. Restart HA after updating and refresh the browser;
manual resource URLs should use `?v=0.8.0`.

- Add an enabled public Codex service-status sensor per account and a separate
  card row/notice, covering official Codex Web, API, CLI, VS Code and Codex in ChatGPT Desktop components.
- Poll public status once per HA instance without credentials or account IDs.
  Usage and status failures are isolated; unknown or stale data is never green.
  Public announcements do not claim to diagnose an individual request failure.
- Replace the old HA 2026.3.0 test dependency environment with the explicitly
  selected HA 2026.11.2 minimum. Audit both environments without exceptions.
- Update certifi, Ruff, pytest, CodeQL and setup-python, incorporating the
  relevant open Dependabot proposals with reproducible Python locks.

The public status compatibility endpoint may change and OpenAI's aggregate
status can differ from an individual account's experience. The authenticated
WHAM usage transport also remains an undocumented third-party HTTP contract.
See [verification](verification-0.8.md) and [upgrading](upgrading-to-0.8.md).
