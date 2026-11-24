# Upgrading to Codex Usage 0.8

**Upgrade Home Assistant to 2026.11.2 or newer before installing 0.8.0.**
Older Home Assistant installations should remain on Codex Usage 0.7.7. The
Marketplace uses this release's minimum in `hacs.json` to select compatible
versions. No account reauthentication is required merely for this upgrade.

After installing, restart Home Assistant and refresh your dashboard browser.
The integration and card ship together. If dashboard resources are managed
manually, update the URL to `/codex_usage/frontend/codex-usage-card.js?v=0.8.0`.
Existing account and entity identities are preserved, with one new public
provider-status sensor per account. Recorder history follows your HA settings.

The card displays public Codex service status separately from your account's
usage and connection state. Allow HTTPS to `status.openai.com` to receive it.
If that public endpoint is unavailable, usage monitoring continues normally.
Read the [release notes](release-notes-0.8.md) for details.
