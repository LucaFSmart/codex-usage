# Upgrading to 0.7

Back up Home Assistant before updating. Install the integration and bundled card together, restart HA, then refresh the dashboard browser. Update manually managed resources to `?v=0.7.1`. An old cached card still reads schema 1 but retains its older rendering behavior until refreshed.

Existing config entries, workspace/user identity, sensor unique IDs, entity IDs, user names and saved card hides remain associated with the same data. Another workspace requires another entry. The new timestamp and budget entities are disabled by default; enable the ones you want in Settings → Devices & services → Entities.

Profile and reset-detail requests default to enabled, including for existing entries. Turning them off in options reloads the entry and hides that source's cached payload. The usage endpoint can still supply the available-reset count. Optional source details in the card default to hidden, and Details stays collapsed unless you previously selected `compact: false`.

## Changed interpretation

- Missing reset counts and credit flags remain unknown. Explicit zero, false and negative credit balances are preserved.
- Available resets follow a common source priority in sensors and card. Next known expiry is an incomplete, optionally stale detail; shifted reset dates are adopted from the server, and no reset use or new grant is inferred.
- Feature restrictions remain visible in the summary without painting every main window exhausted. Included-quota exhaustion does not assert that every ongoing task has stopped.
- Budget is percentage points per hour/day, not money or a measured usage rate. It uses the same observation in sensors/card and is suppressed if that observation is invalid or stale.

## Recorder metadata

Lifetime token, thread and skill totals use `total` so downward provider corrections are not interpreted as new counter cycles. Peak/longest and aggregate share statistics no longer claim an instantaneous measurement state class. Current streak and current usage/remaining/pace retain their measurement semantics. Credit/spend amounts remain without a state class; budgets and timestamps have none.

Existing historical statistics are not rewritten. Removing a state class may leave a Home Assistant statistics issue for older recorded metadata; inspect it in Developer Tools → Statistics and retain historical data unless you deliberately choose otherwise. A code rollback does not automatically reverse metadata or new statistics. See the candidate's [verification record](verification-0.7.md) for actual tested versions and outstanding publication gates.

## Optional warning Blueprint

Import it separately and give each automation a dedicated restored Toggle helper. Existing automations are not modified. Read the [warning guide](automations.md) for hysteresis, retry/crash behavior and recoveries missed while HA is down.

## Rollback

Restore the previous component and matching card bundle, then restart/reload. New optional registry entities may remain disabled or unavailable; remove them deliberately only if no longer needed. Preserve existing IDs. Recorder history, statistics metadata and backups have their own lifecycle and are not automatically reverted by code rollback.
