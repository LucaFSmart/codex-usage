# Codex Usage for Home Assistant

<img src="custom_components/codex_usage/brand/icon.png" alt="Codex Usage icon" width="128">

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![Validate](https://github.com/LucaFSmart/codex-usage/actions/workflows/validate.yml/badge.svg)](https://github.com/LucaFSmart/codex-usage/actions/workflows/validate.yml)
[![GitHub Release](https://img.shields.io/github/v/release/LucaFSmart/codex-usage)](https://github.com/LucaFSmart/codex-usage/releases)
[![License](https://img.shields.io/github/license/LucaFSmart/codex-usage)](LICENSE)

`Codex Usage` is a custom Home Assistant integration that monitors the usage limits of Codex included with ChatGPT plans. It is installed through HACS as a custom repository and supports multiple ChatGPT workspaces.

Its structure and idea started as an adaptation of [`trickv/hass-claude-usage`](https://github.com/trickv/hass-claude-usage) by [**trickv**](https://github.com/trickv), retargeted from Claude to OpenAI Codex/ChatGPT. See [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md) for the full credit.

> [!IMPORTANT]
> This is an independent community integration, not affiliated with or supported by OpenAI. It talks to an undocumented, internal ChatGPT endpoint and authenticates using the Codex CLI's public OAuth client ID rather than a client registered for this project. This sits in a legal gray area under OpenAI's Terms of Use, not something OpenAI has reviewed or endorsed — read [Terms of Service considerations](#terms-of-service-considerations) before connecting your account.

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Entities](#entities)
- [Dashboard](#dashboard)
- [Security](#security)
- [How it works](#how-it-works)
- [Terms of Service considerations](#terms-of-service-considerations)
- [Troubleshooting](#troubleshooting)
- [Development](#development)
- [License](#license)

## Features

- Secure ChatGPT device-code login; no password or copied browser cookies
- Automatic OAuth token refresh and Home Assistant reauthentication
- Five-hour usage, remaining allowance, and reset time
- Weekly usage, remaining allowance, reset time, and usage pace
- ChatGPT plan, credit balance, and spend controls when returned by OpenAI
- Dynamically discovered model- or feature-specific Codex limits
- English and German UI translations
- Configurable polling interval from 60 to 3,600 seconds
- Multiple accounts/workspaces

Entities unavailable for a particular plan are automatically marked unavailable. OpenAI does not return every credit or spending field for every plan.

## Requirements

- Home Assistant **2026.3.0 or newer** (the first release that requires Python 3.14, needed for this integration's syntax)
- A ChatGPT account with Codex access
- Device-code login enabled under ChatGPT security settings, or enabled by the workspace administrator
- Outbound HTTPS access from Home Assistant to `auth.openai.com` and `chatgpt.com`

API-key billing is not supported by this integration. API-key usage belongs to the OpenAI Platform usage and cost APIs and does not use the ChatGPT five-hour/weekly Codex limits.

## Installation

### HACS (recommended)

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=LucaFSmart&repository=codex-usage&category=integration)

This repository is not yet in the HACS default catalog, so add it as a custom repository:

1. Open HACS.
2. Select **Integrations**.
3. Open the three-dot menu and select **Custom repositories**.
4. Add `https://github.com/LucaFSmart/codex-usage` and select category **Integration** (or use the badge above to do this automatically).
5. Search for **Codex Usage** and install it.
6. Restart Home Assistant.

### Manual installation

Copy `custom_components/codex_usage` into the `custom_components` directory of your Home Assistant configuration, then restart Home Assistant.

## Configuration

1. Go to **Settings → Devices & services → Add integration**.
2. Search for **Codex Usage**.
3. Start authorization.
4. Open the displayed OpenAI URL and enter the one-time code.
5. Return to Home Assistant, confirm completion, and submit.

If device login is disabled, enable it in ChatGPT security settings. Business, Enterprise, and Edu workspaces may require an administrator to enable it.

The default polling interval is five minutes. Lower intervals provide little practical benefit and increase the chance of server-side rate limiting. Change it any time under the integration's **Configure** option.

## Entities

Each configured ChatGPT workspace creates one device with the following entities:

| Entity | Type | Description |
| --- | --- | --- |
| Plan | Sensor | Current ChatGPT plan type |
| 5-hour usage / remaining / reset | Sensor | Rolling five-hour Codex rate limit |
| Weekly usage / remaining / reset / pace | Sensor | Rolling weekly Codex rate limit and projected pace |
| Credit balance | Sensor | Remaining prepaid credits, when returned |
| Spend used / limit / remaining / usage / reset | Sensor | Workspace or individual spend control, when returned |
| Rate limit reached | Binary sensor | Any Codex rate limit currently blocking requests |
| Credits available / unlimited | Binary sensor | Credit status, when returned |
| Spend limit reached | Binary sensor | Spend control currently blocking requests |

Additional per-feature limits (for example image generation) are discovered dynamically and added as extra sensors when OpenAI reports them.

## Dashboard

An example dashboard is available at [`dashboards/codex_usage.yaml`](dashboards/codex_usage.yaml). Entity IDs can include an account-specific suffix when more than one workspace is configured. Adjust the example IDs to match **Developer Tools → States** before importing it through the dashboard raw configuration editor.

## Security

Home Assistant stores access, refresh, and ID tokens in `.storage/core.config_entries`. Treat Home Assistant backups as sensitive because they include those tokens. The integration:

- never asks for or stores your ChatGPT password;
- never logs token values or API response bodies;
- sends tokens only to OpenAI endpoints over HTTPS;
- requests only the authentication granted to the official Codex OAuth client;
- never uses your email address as the device, entity, or config entry name — only the opaque OpenAI workspace ID (`account_id`) is shown, so screenshots and shared dashboards don't leak it.

Removing the integration deletes its Home Assistant config entry. To revoke the OpenAI session immediately, also sign out/revoke Codex sessions in ChatGPT security settings.

See [SECURITY.md](SECURITY.md) for how to report a vulnerability.

## How it works

The implementation follows the official open-source Codex client:

- Device authorization: `auth.openai.com/api/accounts/deviceauth/*`
- OAuth refresh: `auth.openai.com/oauth/token`
- Usage: `chatgpt.com/backend-api/wham/usage`

The API contract is isolated in [`custom_components/codex_usage/api.py`](custom_components/codex_usage/api.py). If OpenAI changes the internal response, the Home Assistant entity code should not need to change.

## Terms of Service considerations

This integration is not "reverse engineered" in the traditional sense of decompiling software or sniffing network traffic: every URL, payload shape, and the OAuth `client_id` it uses come directly from OpenAI's own open-source [`openai/codex`](https://github.com/openai/codex) client. Still, read this before connecting your ChatGPT account:

- **Undocumented endpoint.** `chatgpt.com/backend-api/wham/usage` is an internal API used by OpenAI's own clients, not a published, stable public API. OpenAI's Terms of Use restrict "automatically or programmatically extracting data ... from its Services," and this integration polls that endpoint on a schedule. Whether that clause is meant to cover a user reading their own account's usage numbers (as opposed to bulk-scraping ChatGPT output/content) is untested and, as far as we know, has never been clarified by OpenAI.
- **Shared OAuth client ID, not one issued to this project.** Authorization uses the same public `client_id` (`app_EMoamEEZ73f0CkXaXp7hrann`) the official Codex CLI uses. OpenAI does not document a process for third-party tools to register their own client ID for this flow. Reusing the CLI's client ID is a known, discussed practice — other third-party tools do the same, and it is openly discussed in [OpenAI's own developer community](https://community.openai.com/t/best-practice-for-clientid-when-using-codex-oauth/1371778) without an official OpenAI answer either permitting or forbidding it.
- **No official review or endorsement.** OpenAI has not reviewed, authorized, or endorsed this integration in any way. Nothing here guarantees this pattern stays tolerated; OpenAI can change, rate-limit, or block the endpoint, or take action against accounts that access it through non-official clients, at its sole discretion and without notice.
- **The risk lands on your ChatGPT account, not just this code.** If OpenAI does enforce against this pattern, the realistic consequence is action against the connecting account (throttling, session revocation, or in an extreme case a suspension) — not merely "the integration stops working."

Use this integration at your own risk and judgment. If this gray area is not acceptable to you, do not connect your account.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "Device-code login is disabled" during setup | Device login disabled for the account/workspace | Enable it in ChatGPT security settings, or ask a workspace administrator |
| "Unable to connect to OpenAI" | Outbound HTTPS blocked, or OpenAI temporarily unreachable | Check firewall/DNS to `auth.openai.com` and `chatgpt.com`, retry later |
| Integration shows "Reauthenticate" | The refresh token was revoked or expired | Click the notification and repeat the device-code flow |
| Some sensors are `unavailable` | OpenAI did not return that field for your plan | Expected; not every plan reports credits or spend controls |

Diagnostics (**Settings → Devices & services → Codex Usage → Download diagnostics**) redact all tokens, account IDs, user IDs, and email addresses before download — safe to attach to a bug report.

## Development

```bash
python -m venv .venv
.venv/Scripts/activate        # Windows
pip install homeassistant==2026.6.4 pytest ruff
ruff format .
ruff check .
pytest
```

For Linux/macOS activation, use `source .venv/bin/activate`. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

`tests/` runs everywhere, including on Windows. [`tests_integration/`](tests_integration) additionally boots a real Home Assistant instance via `pytest-homeassistant-custom-component` to exercise config entry setup, entity creation, and unload; it needs POSIX-only modules, so it only runs in the `integration-smoke` CI job (Linux), not in local Windows `pytest` runs.

## License

MIT License. See [LICENSE](LICENSE).

See [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md) for upstream inspiration and trademark attribution.
