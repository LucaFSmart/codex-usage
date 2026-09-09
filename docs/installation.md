# Installation and setup

Requires Home Assistant 2026.3.0 or newer and a ChatGPT account or workspace with Codex access. Allow outbound HTTPS to `auth.openai.com` and `chatgpt.com`. This integration uses the Codex device-code login; OpenAI Platform API keys are a different product.

## Install

In HACS, find **Codex Usage** under Integrations, install, and restart Home Assistant. If needed, add `https://github.com/LucaFSmart/codex-usage` as a custom repository of category **Integration**. For manual installation, copy `custom_components/codex_usage` into your Home Assistant configuration's `custom_components` directory and restart.

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
  - url: /codex_usage/frontend/codex-usage-card.js?v=0.7.0
    type: module
```

See [card configuration](card.md), [entity reference](entities.md), and [troubleshooting](troubleshooting.md). The optional warning Blueprint is imported separately; HACS does not activate it.
