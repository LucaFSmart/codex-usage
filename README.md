# Codex Usage for Home Assistant

<img src="custom_components/codex_usage/brand/icon.png" alt="Codex Usage icon" width="128">

`Codex Usage` is a custom Home Assistant integration that monitors the usage limits of Codex included with ChatGPT plans. It is designed for installation through HACS and supports multiple ChatGPT workspaces.

> [!IMPORTANT]
> This is an independent community integration. It is not affiliated with or supported by OpenAI. The ChatGPT usage endpoint is used by the official open-source Codex client but is not documented as a stable public REST API. OpenAI can change it without notice.

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

## Installation with HACS

Until this repository is accepted into the default HACS catalog:

1. Open HACS.
2. Select **Integrations**.
3. Open the three-dot menu and select **Custom repositories**.
4. Add this repository URL and select category **Integration**.
5. Search for **Codex Usage** and install it.
6. Restart Home Assistant.

Before publishing, create a GitHub release whose tag matches the manifest version.

## Manual installation

Copy `custom_components/codex_usage` into the `custom_components` directory of your Home Assistant configuration, then restart Home Assistant.

## Configuration

1. Go to **Settings → Devices & services → Add integration**.
2. Search for **Codex Usage**.
3. Start authorization.
4. Open the displayed OpenAI URL and enter the one-time code.
5. Return to Home Assistant, confirm completion, and submit.

If device login is disabled, enable it in ChatGPT security settings. Business, Enterprise, and Edu workspaces may require an administrator to enable it.

The default polling interval is five minutes. Lower intervals provide little practical benefit and increase the chance of server-side rate limiting.

## Dashboard

An example dashboard is available at `dashboards/codex_usage.yaml`. Entity IDs can include an account-specific suffix when more than one workspace is configured. Adjust the example IDs to match **Developer Tools → States** before importing it through the dashboard raw configuration editor.

## Security

Home Assistant stores access, refresh, and ID tokens in `.storage/core.config_entries`. Treat Home Assistant backups as sensitive because they include those tokens. The integration:

- never asks for or stores your ChatGPT password;
- never logs token values or API response bodies;
- sends tokens only to OpenAI endpoints over HTTPS;
- requests only the authentication granted to the official Codex OAuth client.

Removing the integration deletes its Home Assistant config entry. To revoke the OpenAI session immediately, also sign out/revoke Codex sessions in ChatGPT security settings.

## How it works

The implementation follows the official open-source Codex client:

- Device authorization: `auth.openai.com/api/accounts/deviceauth/*`
- OAuth refresh: `auth.openai.com/oauth/token`
- Usage: `chatgpt.com/backend-api/wham/usage`

The API contract is isolated in `custom_components/codex_usage/api.py`. If OpenAI changes the internal response, the Home Assistant entity code should not need to change.

## Development

```bash
python -m venv .venv
.venv/Scripts/activate        # Windows
pip install homeassistant==2026.6.4 pytest ruff
ruff check .
pytest
```

For Linux/macOS activation, use `source .venv/bin/activate`.

## Publishing checklist

- Run Ruff, pytest, HACS validation, and hassfest.
- Test fresh setup, token refresh, reauthentication, reload, and removal on Home Assistant 2026.6.
- Create a SemVer GitHub release matching `manifest.json`.
- Submit the public repository for inclusion in the HACS default catalog.

## License

MIT License. See [LICENSE](LICENSE).

See [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md) for upstream inspiration and trademark attribution.
