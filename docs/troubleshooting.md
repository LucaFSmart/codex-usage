# Troubleshooting

## Card missing or still showing old behavior

Confirm the integration loaded successfully, then reload the browser and check dashboard resources. The 0.7 bundle URL is `/codex_usage/frontend/codex-usage-card.js?v=0.7.1`. Avoid duplicate resource entries. In YAML-managed dashboards add the module manually. A Repair appears when automatic resource registration actually fails in storage mode; it clears after successful registration or removal of the last loaded entry.

## Unknown values or missing optional sections

An em dash means unknown, not zero. Automatic sections hide values the account has not supplied. Use Always show for one representative placeholder, or enable source details temporarily in the card configuration. Sources are hidden by default.

Profile/reset details can be disabled in integration options. Some accounts do not support these endpoints; unsupported is not a usage failure. An enabled diagnostic entity does not enable an endpoint. An HA entity can remain disabled while the permitted card snapshot still displays its value.

## Usage unavailable or slow to refresh

Check network access and any HA reauthentication prompt. Usage failures retain last-success timestamps and last-known card values with a connection indication. Derived budgets are suppressed. Optional failures do not make healthy main usage unavailable; retained profile data is marked historical.

HTTP 429 pauses reads for that entry, including manual refresh. HTTP 503 can delay the affected endpoint. Retry-After deadlines are honored even if longer than the selected interval. Repeated refresh clicks do not bypass the provider's cooldown. Ordinary optional errors normally retry after 15 minutes; successful/unsupported optional reads are checked hourly.

## Reset count and expiry differ

Usage's explicit available count wins over hourly details. Conflicting or outdated details hide expiry instead of inventing consistency. A changed main reset date also invalidates expiry until a subsequent detail fetch reconciles the context. A detail list can be partial: its length is never the available count. Expiry passing does not locally decrement the reported count.

## Statistics changed after upgrade

See [upgrading to 0.7](upgrading-to-0.7.md). Historical sums are not recalculated. If Home Assistant reports a statistics metadata issue, inspect Developer Tools → Statistics and the affected sensor. Do not delete database rows to silence an issue.

## Warning not firing again

Check the selected sensor is consumed usage in `%`, the helper belongs only to that automation, and observed usage reached the recovery threshold. Unknown data and a new reset date do not clear the helper. Check the automation trace for a failed user action. See [warnings](automations.md).
