# Codex Usage 0.8.0 verification

Reviewed on 2026-11-24 and 2026-11-25. This release follows [0.7.7](verification-0.7.md).

## Authorized scope

The user requested a detailed review and necessary fixes for open GitHub
problems, and explicitly selected direct implementation of a public provider
status sensor and card notice. The user then selected HA 2026.11.2 as the new
minimum, with older installations remaining on 0.7.7.

## GitHub and dependency review

At base commit `d28de06f7cb1c1f3e9d50eb82eac4b4ff07af511`, GitHub returned no
open issues and no open code-scanning alerts. Five open dependency PRs were
reviewed: [32](https://github.com/LucaFSmart/codex-usage/pull/32),
[34](https://github.com/LucaFSmart/codex-usage/pull/34),
[35](https://github.com/LucaFSmart/codex-usage/pull/35),
[36](https://github.com/LucaFSmart/codex-usage/pull/36) and
[39](https://github.com/LucaFSmart/codex-usage/pull/39).

GitHub reported 140 open Dependabot alerts, all in the minimum test lock.
Certifi alert 262 was independently fixable with certifi 2026.11.20; the other
139 were bound to HA 2026.3.0 exact dependencies, including HA itself. A separate
pip-audit of the updated certifi but old HA snapshot found 200 advisories in ten
remaining packages: this is a different advisory database and count, not a claim
that GitHub returned 200 alerts.

The explicitly approved new minimum retires those old pins. Both test locks now
resolve HA 2026.11.2, certifi 2026.11.20, pytest 9.2.0, Ruff 0.17.6 and uv 0.13.6,
without vulnerability exclusions or dependency overrides. Both strict pip-audit
runs report no known vulnerabilities. CI now audits both environments.

PRs 32/34/39 failed because Dependabot's serialization changed uv comments and
extras in the lock; the actual minimum tests passed. Locks are regenerated from
the repository root instead of weakening the reproduction check. The reviewed
CodeQL 4.39.4 and setup-python 7.1.0 SHA updates are included. Superseded PRs are
closed only once equivalent changes pass CI and merge.

## Public provider status

The [official public component endpoint](https://status.openai.com/api/v2/components.json)
was inspected without credentials. The summary endpoint omits dedicated Codex
components; unresolved incidents returns 404, and observed incident objects
lack reliable component associations. The implementation therefore uses the
component endpoint, not scraped incident titles or unscoped global incidents.

Five known components cover Codex Web, API, CLI, VS Code and Codex in ChatGPT
Desktop. The endpoint's component timestamps are change times, so local receipt
time determines freshness. Other public statuses are mapped defensively; only
operational was observed live during this review. Synthetic degraded, outage,
maintenance and unknown fixtures validate those branches without claiming a
live production incident occurred. Data is shared across accounts and isolated
from authenticated usage or quota failures.

## Verification results

Before independent review, fresh local checks passed 372 Python unit tests,
three integration smoke tests, 179 frontend unit tests and 34 Chromium browser
tests. Ruff, frontend formatting/lint/type checking, coverage and build passed,
as did strict audits of both Python environments and npm. The Python checks
use Windows/Python 3.14.10 with the existing local HA 2026.8.3, so final HA
2026.11.2 evidence comes from Linux CI.

Independent source review found three release-blocking defects: non-admin
custom-event subscriptions, freshness revival under a skewed browser clock,
and a first public fetch tracked by HA startup. The patch adds a read-only
integration subscription, anchors status validity to receipt with monotonic and wall-clock deadlines
that latch expiry, and makes the initial fetch a background task. Each receives
focused regression coverage. Privacy wording is corrected for the public
sensor's exclusion from the private account-data permission gate.

After fixes, local validation passed 372 Python unit tests, four real-HA
integration tests, 186 frontend unit tests and all 34 Chromium browser tests.
The real WebSocket test uses a non-admin ActiveConnection and verifies empty
notifications plus unsubscribe/disconnect cleanup. Freshness tests simulate
clock skew, rollback and sleep without claiming a live outage or real standby
experiment. The initial-poll test holds the public request blocked while HA's
foreground work completes. Independent review confirmed the original defects
and their corrections; the final sleep deadline correction received a focused
follow-up check.

Release candidate `f9c346caf4e3c65dfa44483935f2a8788f86c3b0` passed complete
[Validate](https://github.com/LucaFSmart/codex-usage/actions/runs/45513297776)
and both languages in [CodeQL](https://github.com/LucaFSmart/codex-usage/actions/runs/45513297668).
The corresponding push runs passed as well. Linux CI includes both current
and minimum HA 2026.11.2 runtime/Blueprint jobs, both Python suites, exact lock
reproduction, strict audits of both locks, HACS/hassfest and all frontend gates.
[PR #41](https://github.com/LucaFSmart/codex-usage/pull/41) contains this release.

This verification-only follow-up must pass the same final checks before merge.
The merged commit is checked again before creating tag and GitHub release
`0.8.0`. Superseded dependency PRs are closed after equivalent changes merge;
GitHub's dependency graph is then checked separately for remaining alerts. Both Python environments must
remain reproducible and audit clean. No production account login, purchase,
reset redemption or live outage injection is required or performed.

The public status endpoint and authenticated WHAM contracts may change. An
aggregate public status cannot diagnose an individual account or request.
