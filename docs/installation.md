# Installation and setup

Requires Home Assistant 2026.3.0 or newer and a ChatGPT account or workspace with Codex access. This is the functionally tested compatibility floor; use the latest stable Home Assistant release for security updates. Allow outbound HTTPS to `auth.openai.com` and `chatgpt.com`. This integration uses the Codex device-code login; OpenAI Platform API keys are a different product.

## Install

On Home Assistant 2026.11 or newer, open **Settings → Marketplace** and find **Codex Usage** under Integrations. It is in the default catalog; no custom repository or separate HACS installation is needed. On Home Assistant 2026.3–2026.10, install it through HACS Integrations. Existing HACS installations migrate automatically when Home Assistant upgrades to 2026.11; installed repositories and update entities carry over.

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
  - url: /codex_usage/frontend/codex-usage-card.js?v=0.7.7
    type: module
```

See [card configuration](card.md), [entity reference](entities.md), and [troubleshooting](troubleshooting.md). The optional warning Blueprint is imported separately; Marketplace/HACS does not activate it.
