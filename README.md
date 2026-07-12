# Codex Usage for Home Assistant

<img src="custom_components/codex_usage/brand/icon.png" alt="Codex Usage icon" width="128">

[![hacs_badge](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![Validate](https://github.com/LucaFSmart/codex-usage/actions/workflows/validate.yml/badge.svg)](https://github.com/LucaFSmart/codex-usage/actions/workflows/validate.yml)
[![GitHub Release](https://img.shields.io/github/v/release/LucaFSmart/codex-usage)](https://github.com/LucaFSmart/codex-usage/releases)
[![License](https://img.shields.io/github/license/LucaFSmart/codex-usage)](LICENSE)

`Codex Usage` is a custom Home Assistant integration that monitors the usage limits of Codex included with ChatGPT plans. It is installed through HACS as a custom repository and supports multiple ChatGPT workspaces.

Codex Usage is an independent implementation. Its initial product concept was inspired by [`trickv/hass-claude-usage`](https://github.com/trickv/hass-claude-usage) by [**trickv**](https://github.com/trickv). See [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md) for details.

> [!IMPORTANT]
> This is an independent community integration. It is not affiliated with or supported by OpenAI. The ChatGPT usage endpoint is used by the official open-source Codex client but is not documented as a stable public REST API, and this integration reuses the Codex CLI's public OAuth client ID rather than one issued to this project. OpenAI can change or restrict either at any time without notice.

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
- Five-hour usage, remaining allowance, and reset time when that window is returned
- Weekly usage, remaining allowance, reset time, and usage pace
- Duration-based window detection that supports weekly-only and reordered responses
- ChatGPT plan, credit balance, and spend controls when returned by OpenAI
- Available usage-limit reset credits (read-only; this integration never redeems them)
- Dynamically discovered model-, code-review-, feature-, and duration-specific limits
- English and German UI translations
- Configurable polling interval from 60 to 3,600 seconds
- Multiple accounts/workspaces

Entities unavailable for a particular plan are automatically marked unavailable. OpenAI does not return every rate-limit window, credit, or spending field for every plan. In particular, some plans currently return a weekly window without a separate five-hour window.

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
| Available usage resets | Sensor | Number of usage-limit reset credits currently available; read-only |
| Credit balance | Sensor | Remaining prepaid credits, when returned |
| Spend used / limit / remaining / usage / reset | Sensor | Workspace or individual spend control, when returned |
| Rate limit reached | Binary sensor | Any Codex rate limit currently blocking requests |
| Credits available / unlimited | Binary sensor | Credit status, when returned |
| Credit overage limit reached | Binary sensor | Whether OpenAI explicitly reports that the credit overage limit was reached |
| Spend limit reached | Binary sensor | Spend control currently blocking requests |

Additional per-feature limits (for example image generation), code-review limits, and unknown main-limit durations are discovered dynamically and added as extra sensors when OpenAI reports them. Dynamic windows are labelled by their actual duration rather than by their backend `primary` or `secondary` position.

The integration only reads usage data. It does not redeem available resets or perform any other account-changing API action.

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

The API contract is isolated in [`custom_components/codex_usage/api.py`](custom_components/codex_usage/api.py). Rate-limit windows are classified from `limit_window_seconds`, matching the current official Codex client's behavior, so their meaning does not depend on whether OpenAI places them in `primary_window` or `secondary_window`.

`chatgpt.com/backend-api/wham/usage` is undocumented and not a published, stable API, and authorization reuses the Codex CLI's public OAuth `client_id` rather than one issued specifically to this project — the same pattern other community Codex tools use, and something OpenAI neither documents nor explicitly prohibits for third parties. OpenAI could change or restrict this at any time without notice; there's no official endorsement or guarantee of long-term stability.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "Device-code login is disabled" during setup | Device login disabled for the account/workspace | Enable it in ChatGPT security settings, or ask a workspace administrator |
| "Unable to connect to OpenAI" | Outbound HTTPS blocked, or OpenAI temporarily unreachable | Check firewall/DNS to `auth.openai.com` and `chatgpt.com`, retry later |
| Integration shows "Reauthenticate" | The refresh token was revoked or expired | Click the notification and repeat the device-code flow |
| Some sensors are `unavailable` | OpenAI did not return that field or rate-limit window for your plan | Expected; not every plan reports a five-hour window, credits, or spend controls |

Diagnostics (**Settings → Devices & services → Codex Usage → Download diagnostics**) redact all tokens, account IDs, user IDs, and email addresses before download — safe to attach to a bug report.

## Development

```bash
python -m venv .venv
.venv/Scripts/activate        # Windows
pip install homeassistant==2026.7.2 pytest ruff
ruff format .
ruff check .
pytest
```

For Linux/macOS activation, use `source .venv/bin/activate`. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

`tests/` runs everywhere, including on Windows. [`tests_integration/`](tests_integration) additionally boots a real Home Assistant instance via `pytest-homeassistant-custom-component` to exercise config entry setup, entity creation, and unload; it needs POSIX-only modules, so it only runs in the `integration-smoke` CI job (Linux), not in local Windows `pytest` runs.

## License

MIT License. See [LICENSE](LICENSE).

See [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md) for upstream inspiration and trademark attribution.
