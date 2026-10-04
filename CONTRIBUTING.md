# Contributing

1. Fork the repository and create a focused branch.
2. Use Python 3.14 for development (matches CI); the integration's functionally tested minimum is Home Assistant 2026.3.0 (see `hacs.json`), while contributors should use the latest stable release for security updates. The real Home Assistant smoke test requires Linux and runs on Ubuntu in CI.
3. Follow the README's hash-locked development setup, then run `ruff format --check .`, `ruff check .`, the full Python suite and the real integration tests with the documented asyncio options.
4. In `frontend/`, run `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run audit`, `npm test`, `npm run test:coverage`, `npm run build`, and `npm run test:visual`.
5. Never include access tokens, refresh tokens, ID tokens, device codes, cookies, or unredacted diagnostics in issues or test fixtures.
6. Explain user-visible changes in `CHANGELOG.md`.

Backend compatibility changes should remain inside `custom_components/codex_usage/api.py` whenever possible. Include sanitized response fixtures that cover old and new response shapes.

## Releasing

1. Bump the manifest version, Python `CARD_VERSION`, frontend package/lock and visual-harness metadata together. Update version expectations, manual card resource examples, README, release notes and `CHANGELOG.md`.
2. Rebuild and commit the bundled card, then run every Validate and CodeQL check on the final PR commit. Both supported Home Assistant targets and byte-for-byte Python lock reproduction must pass. Record fresh evidence in `docs/verification-0.7.md`.
3. Test fresh setup, token refresh, reauthentication, reload, and removal on a current Home Assistant release.
4. Merge only after the final checks pass. Verify the merged commit's checks, then tag a GitHub release at that commit whose tag matches the manifest version exactly (for example, `1.2.3`).
5. Codex Usage is listed in the default HACS catalog; HACS picks up new releases automatically once tagged, no separate submission step is needed.
