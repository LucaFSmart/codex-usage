# Privacy and data handling

Codex Usage is an independent community integration using backend endpoints that are not a stable public third-party API. It is not affiliated with or supported by OpenAI.

## Provider support and terms

The current device-login implementation uses the public OAuth client identifier used by the official Codex client. That identifier is public application metadata, not an API key or client secret. The integration then polls undocumented ChatGPT usage endpoints. Neither the availability of those endpoints nor the open-source Codex client establishes permission for every third-party use.

OpenAI now documents a separate [open-source client registration flow](https://developers.openai.com/siwc/token-sharing-open-source/sign-in) and [Sign in with ChatGPT terms](https://openai.com/policies/sign-in-with-chatgpt-terms/). This integration has not implemented that registration flow. Its applicability to the existing Codex device-login and usage endpoints is unresolved; this project does not claim OpenAI approval or legal compliance. Review the terms applicable to your account before authorizing. Undocumented access can change or stop working, and a disclaimer does not grant provider permission.

## Local credentials and data

Authorization stores access/refresh tokens and account identity in the Home Assistant config entry. Home Assistant needs these credentials to poll and refresh authorization. Protect the HA configuration and backups as you would other integration credentials. Device login does not require copying browser cookies or entering a password into this integration.

The integration reads account-level usage, optional profile aggregates, optional saved-reset details and workspace discovery during setup/reauthentication. Reported allowance changes cannot be assigned to a particular eligible agent surface, model, task or conversation. It does not send prompts, conversations or code; purchase credits; redeem resets; change account limits; or select notification recipients.

Version 0.7 reads authenticated ChatGPT WHAM HTTP endpoints. OpenAI now documents a separate Codex App Server JSON-RPC interface for rate limits, earned resets and token-usage summaries. App Server is not contacted, installed or required by this integration.

Usage/profile/reset caches and polling source states are memory-only. Restart clears them until a real fetch succeeds. Only successful workspace-discovery time is persisted as additional entry metadata; it does not indicate continuous account availability. HA may independently record enabled sensor states under your Recorder configuration.

The card uses an authenticated HA WebSocket and Home Assistant entry IDs. Private account data is withheld if the viewer lacks read access to any associated private-data entity. The independent public provider-status sensor is excluded from this account-data permission gate; it contains no private account information. Payload fields are explicitly allowlisted; credential and backend account/user IDs are excluded. Dynamic limit labels are provider-supplied and rendered as text.

Diagnostics contain safe source states, configured request options, normalized status and structural counters. They omit raw responses, arbitrary error strings, unknown provider fields, credentials and backend identities. Review any additional logs/screenshots yourself before sharing; account labels shown in the UI can still be personal information.

There is no external telemetry service, separate history database or per-credit transaction ledger. Removing an entry removes its configuration through HA. Existing Recorder history and backups follow HA's retention rules and are not erased by this integration.

## Public service status (0.8)

The integration polls `https://status.openai.com/api/v2/components.json` once
per Home Assistant instance while Codex Usage accounts are loaded, normally
every five minutes. Requests contain no OpenAI credentials, account IDs,
conversation data or code. The endpoint receives ordinary network metadata,
such as the source IP, as with any HTTPS request.

Only five known public Codex component IDs, fixed display names and normalized
states are retained. Requests have a size limit, timeout and no redirects.
Status data is memory-only, uses local fetch time for freshness, and stops
polling when the last account unloads. Public status cannot establish why a
particular authenticated usage request failed.

The card's read-only update subscription emits empty invalidation events to
authenticated Home Assistant viewers. Actual account snapshots are separately
filtered by the existing per-account entity permissions.
