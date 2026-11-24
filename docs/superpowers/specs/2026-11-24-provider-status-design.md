# Codex provider status and GitHub maintenance

User requested detailed GitHub problem review, necessary fixes, and explicitly
selected direct implementation of a card notice and status entity.

## Design

The user explicitly selected HA 2026.11.2 as the new minimum; older installations
remain on 0.7.7. Preserve all existing usage semantics, account identities
and card schema 1. Add an optional top-level provider_status object to card data.
Use one independent shared public-status coordinator per HA instance, shared by
loaded Codex Usage entries. It polls https://status.openai.com/api/v2/components.json
with no credentials or account IDs, every 5 minutes. Freshness comes from local
successful fetch time, not provider component updated_at (which is change time).
A failed status request must not fail account setup/usage or erase usage data.
Remove listeners and polling when the last account unloads.

Scope five official Codex components by stable IDs verified against the public
status page: Web 01JVCV8YSWZFRSM1G5CVP253SK,
API 01KMP3KP5MGE23B80K1EK4S8PV, CLI 01KMKFAMWKNQ84Z1766MV08ZDE,
VS Code 01KMP3KP5M8X0EBTVW6KN327EE and Codex in ChatGPT Desktop
01KMKFAMWKQ81YWSE1Z18R6VHR. Other ChatGPT and Platform API components are
not automatically classified as Codex outages.

Top-level card contract (optional for backward compatibility):
provider_status: {state: operational|degraded|outage|maintenance|unknown,
available: boolean, last_success: ISO8601|null, last_attempt: ISO8601|null,
stale: boolean, components: [{id: knownID, name: fixed public name,
state: same normalized enum}], url: https://status.openai.com/}.

Recognize operational, degraded_performance, partial_outage, major_outage and
under_maintenance defensively; new values stay unknown. Missing/malformed relevant
components must never produce an all-operational result. Known positive disruption
may still be displayed if another component is unknown. Unknown/failed/stale data
must not show green. Set stale after 15 minutes without successful fetch. Honor
Retry-After for 429/503. Bound response size and list lengths, time out requests,
disable redirects and never pass API/session headers to the status endpoint.
No incident title/details: observed incident payloads lack component associations.

Expose one enabled-by-default provider_status sensor per account, backed by the
shared status coordinator, associated with the existing device and independent
of the usage coordinator's availability. Fresh known status gets an enum state;
fetch failures/staleness make the entity unavailable. Card has a separate compact
provider row for operational/unknown and a prominent notice for known disruptions,
with the constant official status link and English/German labels. The source's
unknown or incident status never changes account quota/blocker calculations.

## Approaches

Chosen: shared independent public component poller plus entity/card surface.
Reusing a separately configured HA service would introduce a setup dependency;
the summary endpoint omits Codex and the unresolved-incidents route returns 404.
A global OpenAI banner would conflate Platform API/ChatGPT with Codex.

## GitHub maintenance

Upgrade minimum certifi to 2026.11.20 for alert 262; HA's constraint allows it.
Upgrade minimum Ruff to 0.17.6 and pytest to 9.2.0 with reproducible locks.
Use reviewed CodeQL 4.39.4 / setup-python 7.1.0 action SHAs. Replace the old HA 2026.3.0 test environment under the explicit user decision.
Both current and minimum locks must have zero known audit findings; do not
dismiss or ignore vulnerabilities.
Close superseded dependency PRs only after equivalent changes merge and CI passes.

## Validation and release

Backend regression tests: component mapping, missing/unknown/duplicate data,
staleness, no credentials, HTTP errors/timeouts/redirects/Retry-After, singleton
multi-account lifecycle, status failure isolation and card allowlist.
Frontend tests: optional backward compatibility, fixed link, localization,
normal/incident/unknown/stale renders without affecting usage. Browser checks
cover narrow cards, light/dark, account switching and status notice visibility.
Run full local suites and both current and minimum Linux HA runtime targets, audits, reproducible
locks, HACS/hassfest and CodeQL. Publish version 0.8.0 after merged commit checks;
set minimum HA 2026.11.2. Record exact remaining alerts and validation limits.

Desktop is included explicitly because the official component is named Codex in
ChatGPT Desktop, even though the public page groups it under ChatGPT.

## Review corrections

Authenticated viewers receive data-less update invalidations through the
integration command `codex_usage/subscribe_updates`, with normal subscription
acknowledgment and unsubscribe behavior. Account snapshots remain separately
permission-filtered. This avoids relying on custom `subscribe_events`, which
Home Assistant restricts for ordinary non-admin users.

The initial public poll is a background task, like later polls, so a public
endpoint timeout does not hold up Home Assistant startup. Frontend validity is
anchored when a snapshot is received using server snapshot age and monotonic
elapsed time; an invalid or future-at-receipt observation cannot become fresh
later merely because a browser clock catches up. These are release gates with
focused regression coverage.

For browsers whose monotonic clock pauses during device sleep, a parallel
wall-clock deadline is set once at receipt. Expiration of either deadline
permanently neutralizes that observation until a new snapshot arrives; rolling
the wall clock back cannot revive it. This is exercised with simulated sleep
and rollback, rather than claiming a real production outage or sleep test.
