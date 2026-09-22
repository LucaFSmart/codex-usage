# Security policy

Do not report credentials or unredacted Home Assistant diagnostics in a public issue.

For a vulnerability, use the repository's private GitHub security-advisory form. Include affected versions, impact, and reproduction steps without real tokens.

This repository runs CodeQL on every push and pull request and on a weekly schedule. Dependabot checks GitHub Actions, Python, and frontend npm dependencies monthly, while GitHub dependency alerts and automated security-update pull requests cover known vulnerable dependencies when the pinned Home Assistant environment can resolve a patched version.

Codex Usage declares no additional Python packages in its Home Assistant manifest. The hash-locked files under `requirements/` are development-only CI environments, not packages shipped by this integration. The minimum-version lock is a compatibility snapshot and may inherit advisories from an older Home Assistant release; it is not a deployment recommendation. Home Assistant only accepts security reports for its [latest stable release](https://www.home-assistant.io/security/), so users should keep Home Assistant current.

OpenAI account or billing incidents must be reported to OpenAI. This community integration cannot revoke or recover OpenAI accounts.

