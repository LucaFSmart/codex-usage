# Privacy and data handling

Codex Usage is an independent community integration using backend endpoints that are not a stable public third-party API. It is not affiliated with or supported by OpenAI.

Authorization stores access/refresh tokens and account identity in the Home Assistant config entry. Home Assistant needs these credentials to poll and refresh authorization. Protect the HA configuration and backups as you would other integration credentials. Device login does not require copying browser cookies or entering a password into this integration.

The integration reads account-level usage, optional profile aggregates, optional saved-reset details and workspace discovery during setup/reauthentication. Reported allowance changes cannot be assigned to a particular eligible agent surface, model, task or conversation. It does not send prompts, conversations or code; purchase credits; redeem resets; change account limits; or select notification recipients.

Version 0.7 reads authenticated ChatGPT WHAM HTTP endpoints. OpenAI now documents a separate Codex App Server JSON-RPC interface for rate limits, earned resets and token-usage summaries. App Server is not contacted, installed or required by this integration.

Usage/profile/reset caches and polling source states are memory-only. Restart clears them until a real fetch succeeds. Only successful workspace-discovery time is persisted as additional entry metadata; it does not indicate continuous account availability. HA may independently record enabled sensor states under your Recorder configuration.

The card uses an authenticated HA WebSocket and Home Assistant entry IDs. Entry data is withheld if the viewer lacks read access to any associated entry entity. Payload fields are explicitly allowlisted; credential and backend account/user IDs are excluded. Dynamic limit labels are provider-supplied and rendered as text.

Diagnostics contain safe source states, configured request options, normalized status and structural counters. They omit raw responses, arbitrary error strings, unknown provider fields, credentials and backend identities. Review any additional logs/screenshots yourself before sharing; account labels shown in the UI can still be personal information.

There is no external telemetry service, separate history database or per-credit transaction ledger. Removing an entry removes its configuration through HA. Existing Recorder history and backups follow HA's retention rules and are not erased by this integration.
