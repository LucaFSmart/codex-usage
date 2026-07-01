# Codex Usage for Home Assistant

<img src="custom_components/codex_usage/brand/icon.png" alt="Codex Usage icon" width="128">

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![Validate](https://github.com/LucaFSmart/codex-usage/actions/workflows/validate.yml/badge.svg)](https://github.com/LucaFSmart/codex-usage/actions/workflows/validate.yml)
[![GitHub Release](https://img.shields.io/github/v/release/LucaFSmart/codex-usage)](https://github.com/LucaFSmart/codex-usage/releases)
[![License](https://img.shields.io/github/license/LucaFSmart/codex-usage)](LICENSE)

`Codex Usage` is a custom Home Assistant integration that monitors the usage limits of Codex included with ChatGPT plans. It is installed through HACS as a custom repository and supports multiple ChatGPT workspaces.

> [!IMPORTANT]
> This is an independent community integration. It is not affiliated with or supported by OpenAI. The ChatGPT usage endpoint is used by the official open-source Codex client but is not documented as a stable public REST API. OpenAI can change it without notice.

## Table of contents

- [Features](#features)
- [Requirements](#requirements)
- [Installation](#installation)
- [Configuration](#configuration)
- [Entities](#entities)
- [Dashboard](#dashboard)
- [Security](#security)
- [How it works](#how-it-works)
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

- Home Assistant **2026.6.0 or newer**
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
- requests only the authentication granted to the official Codex OAuth client.

Removing the integration deletes its Home Assistant config entry. To revoke the OpenAI session immediately, also sign out/revoke Codex sessions in ChatGPT security settings.

See [SECURITY.md](SECURITY.md) for how to report a vulnerability.

## How it works

The implementation follows the official open-source Codex client:

- Device authorization: `auth.openai.com/api/accounts/deviceauth/*`
- OAuth refresh: `auth.openai.com/oauth/token`
- Usage: `chatgpt.com/backend-api/wham/usage`

The API contract is isolated in [`custom_components/codex_usage/api.py`](custom_components/codex_usage/api.py). If OpenAI changes the internal response, the Home Assistant entity code should not need to change.

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

## License

MIT License. See [LICENSE](LICENSE).

See [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md) for upstream inspiration and trademark attribution.
