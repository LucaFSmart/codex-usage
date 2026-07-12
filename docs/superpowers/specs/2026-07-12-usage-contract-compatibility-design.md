# Usage Contract Compatibility Design

## Goal

Restore correct five-hour and weekly Codex usage reporting across old and new
OpenAI response shapes, while safely exposing newly useful read-only data and
preserving existing Home Assistant entity identities.

## Scope

The integration remains read-only. It will not call the reset-credit consume
endpoint or add buttons, services, or other account-mutating actions.

The implementation will:

- classify rate-limit windows by `limit_window_seconds` instead of assuming
  that `primary_window` is always five hours and `secondary_window` is always
  one week;
- preserve the existing entity keys and unique IDs for the five-hour and
  weekly usage, remaining, reset, and weekly pace sensors;
- keep an absent five-hour or weekly window unavailable without assigning a
  different duration to the wrong sensor;
- expose unrecognized durations as dynamically discovered read-only windows;
- parse `code_review_rate_limit` as a named additional rate limit when present;
- expose `rate_limit_reset_credits.available_count` as a read-only sensor;
- expose `credits.overage_limit_reached` as an optional binary sensor;
- retain current support for credits, spend controls, reached-state details,
  and `additional_rate_limits`;
- update the README, example dashboard, translations, icons, changelog, and
  integration version.

The implementation will not expose `promo`, `referral_beacon`, or approximate
message ranges. Their semantics are either promotional, account-specific, or
not used by the current official Codex client as stable user-facing usage
metrics.

## Architecture

### Normalized windows

`RateLimitWindow` remains the normalized representation of one backend
window. A duration classifier maps windows within a five-percent tolerance of
five hours and seven days to stable categories. The tolerance matches the
official Codex client's duration-label behavior and accommodates minor backend
rounding such as 18,001 seconds.

`CodexUsageData` exposes resolved `five_hour_window` and `weekly_window`
properties. Resolution searches both primary and secondary windows, so window
position no longer determines meaning. A window may satisfy at most one known
category.

Unknown main-limit durations are added to a dynamic limit collection rather
than silently discarded. Existing `additional_rate_limits` remain dynamic,
but their entity names use duration-based labels instead of positional labels.

### New read-only fields

`CreditStatus` gains an optional `overage_limit_reached` field.
`CodexUsageData` gains an optional non-negative reset-credit count parsed from
`rate_limit_reset_credits.available_count`.

When `code_review_rate_limit` is a rate-limit object, it is normalized under a
stable `code_review` identifier and displayed through the same dynamic entity
path as other additional limits. Null or malformed values are ignored.

### Home Assistant entities

Existing static sensor keys remain unchanged. Their value functions read the
resolved five-hour or weekly windows. Weekly pace uses the resolved weekly
window.

One static sensor reports available usage resets. One static binary sensor
reports whether the credit overage limit was explicitly reached. Both remain
unavailable when their source fields are absent or invalid.

Dynamic sensor unique IDs include the limit identifier, a stable duration
identifier, and the metric. Existing additional-limit entities based on
`primary` and `secondary` retain compatibility where possible: known existing
additional windows keep their positional identifier, while their display name
uses the duration. Newly discovered main-limit unknown windows use a duration
identifier. No automatic entity-registry deletion or migration is performed.

## Error Handling and Compatibility

- Missing, null, malformed, negative, zero, and non-finite numeric fields do
  not create misleading sensor values.
- Duplicate windows of the same known duration use the first valid backend
  window in primary-then-secondary order.
- A weekly-only response populates only weekly entities.
- The legacy five-hour-primary/week-secondary response remains supported.
- HTTP authentication, refresh, timeout, rate-limit, and redaction behavior
  remains unchanged.
- Diagnostics include only normalized values and continue redacting identity
  and token data.

## Testing

Test-driven changes will cover:

- legacy five-hour primary and weekly secondary windows;
- weekly-only primary window, reproducing the live regression;
- reversed positions and slightly rounded durations;
- missing and unknown durations;
- dynamic unknown main windows and duration labels;
- optional code-review limits;
- reset-credit counts, including zero and malformed values;
- optional overage-limit state;
- translation/icon metadata consistency;
- the complete unit and integration test suites, formatting, and linting.

## Release and Documentation

The manifest version will receive a minor release bump because the update adds
new entities while preserving existing ones. The changelog will describe the
backend-shape compatibility fix and new read-only entities. The README and
example dashboard will document duration-based classification, unavailable
windows, reset-credit visibility, and code-review/additional limits without
claiming that the undocumented endpoint is stable.
