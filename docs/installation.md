# Installation and setup

Requires Home Assistant 2026.11.2 or newer for version 0.8.0 and a ChatGPT account or workspace with Codex access. Installations on older Home Assistant releases should stay on Codex Usage 0.7.7 until Home Assistant is upgraded. Allow outbound HTTPS to `auth.openai.com` and `chatgpt.com`. Public service status additionally uses `status.openai.com`; failure to reach it does not stop usage monitoring. This integration uses the Codex device-code login; OpenAI Platform API keys are a different product.

## Install

Open **Settings → Marketplace** and find **Codex Usage** under Integrations. It is in the default catalog; no custom repository or separate HACS installation is needed. Older Codex Usage releases through 0.7.7 continue to support HACS on Home Assistant 2026.3–2026.10. Existing HACS installations migrate automatically when Home Assistant upgrades to 2026.11; installed repositories and update entities carry over.

After updating an already loaded integration, restart Home Assistant and refresh the dashboard browser. The Marketplace can load a first installation with a config flow immediately; follow any restart repair shown by Home Assistant. For manual installation, copy `custom_components/codex_usage` into your Home Assistant configuration's `custom_components` directory and restart.

New versions are published as [GitHub releases](https://github.com/LucaFSmart/codex-usage/releases) and appear under **Settings → Updates** after catalog refresh. This can take several hours. See the [Marketplace release guide](https://contributors.home-assistant.io/marketplace/guides/releases/).

## Authorize

1. Open **Settings → Devices & services → Add integration → Codex Usage**.
2. Follow the displayed OpenAI authorization link and enter the one-time device code.
3. Return to Home Assistant and complete authorization.
4. Select the workspace when more than one is offered.

Device authorization must be enabled by the account or workspace administrator. An entry is tied to its selected workspace and user. Add another entry for a different identity; reauthentication preserves the existing one.

## Polling options

Usage updates every 300 seconds by default; the supported range is 60–3,600 seconds. Profile and reset details each normally update hourly. They can be disabled separately in the integration options and are enabled by default, including after upgrade. Disabling reset details does not hide an available-reset count reported by the main usage endpoint.

Provider cooldowns take precedence over these intervals and manual refresh. Unsupported optional endpoints are normal capabilities, and do not invalidate healthy usage data. Workspace discovery runs only during authorization; it is not an extra periodic request.

## Add the card

In a storage-managed dashboard, the integration registers its resource automatically after it loads. Add **Codex Usage Card** from the card picker, or use:

```yaml
type: custom:codex-usage-card
```

For YAML-managed resources, register the bundle manually:

```yaml
resources:
  - url: /codex_usage/frontend/codex-usage-card.js?v=0.8.0
    type: module
```

See [card configuration](card.md), [entity reference](entities.md), and [troubleshooting](troubleshooting.md). The optional warning Blueprint is imported separately; Marketplace/HACS does not activate it.
