# Codex Usage for Home Assistant

<img src="custom_components/codex_usage/brand/icon.png" alt="Codex Usage icon" width="128">

[![HACS](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![Validate](https://github.com/LucaFSmart/codex-usage/actions/workflows/validate.yml/badge.svg)](https://github.com/LucaFSmart/codex-usage/actions/workflows/validate.yml)
[![GitHub Release](https://img.shields.io/github/v/release/LucaFSmart/codex-usage)](https://github.com/LucaFSmart/codex-usage/releases)
[![License](https://img.shields.io/github/license/LucaFSmart/codex-usage)](LICENSE)

Codex Usage is a read-only Home Assistant integration for the Codex limits included with ChatGPT plans. It supports multiple workspaces, dynamic limit windows, optional account statistics, and includes its own modern dashboard card.

> [!IMPORTANT]
> This independent community project is not affiliated with or supported by OpenAI. The ChatGPT backend endpoints and the public Codex OAuth client used by the official open-source Codex client are not documented as stable third-party APIs. They may change or become restricted without notice.

## Features

- Secure OpenAI device-code login without passwords or copied browser cookies
- Automatic token refresh and Home Assistant reauthentication
- Capability-based parsing independent of plan names
- Any reported rolling, weekly, monthly, feature-specific, or future limit window
- Remaining allowance, reset time, safe blocker status, and plausible usage pace
- Optional credit, spend-control, reset-credit, and aggregate profile data
- Workspace selection during setup and multiple separately configured accounts
- Bundled `custom:codex-usage-card` with automatic multi-account overview
- Adaptive, compact, and detailed card layouts with a visual editor
- English and German integration and card UI, with English fallback
- Privacy-safe diagnostics and browser snapshots
- Configurable usage polling from 60 to 3,600 seconds

The integration never redeems reset credits, changes limits, purchases credits, or modifies an account.

## Requirements

- Home Assistant 2026.3.0 or newer
- A ChatGPT account or workspace with Codex access
- Device-code login enabled by the user or workspace administrator
- Outbound HTTPS to `auth.openai.com` and `chatgpt.com`

API-key billing is a separate OpenAI Platform product and is not supported here.

## Installation

### HACS

[![Open your Home Assistant instance and open a repository inside HACS.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=LucaFSmart&repository=codex-usage&category=integration)

Until the repository appears in the default HACS catalog:

1. Open **HACS → Integrations**.
2. Select **Custom repositories** from the three-dot menu.
3. Add `https://github.com/LucaFSmart/codex-usage` as category **Integration**.
4. Install **Codex Usage** and restart Home Assistant.

Once catalog review is complete, it will appear in normal HACS search. Existing custom-repository installations keep receiving updates from the same repository and require no reinstall or configuration change.

### Manual

Copy `custom_components/codex_usage` into the `custom_components` directory of the Home Assistant configuration and restart Home Assistant.

## Configuration

1. Open **Settings → Devices & services → Add integration**.
2. Search for **Codex Usage**.
3. Start authorization, open the displayed OpenAI URL, and enter the one-time code.
4. Return to Home Assistant and confirm completion.
5. If the account exposes several workspaces, select the one this config entry should monitor.

Add the integration again for another workspace or account. Each config entry keeps its selected workspace during refresh and reauthentication.

Usage is refreshed every five minutes by default. Profile and reset-credit metadata are fetched independently no more than once per hour. An optional endpoint failure does not make otherwise healthy limits unavailable.

## Dashboard card

The card bundle and Lovelace resource are registered automatically when the integration loads. In dashboard edit mode select **Add card**, search for **Codex Usage Card**, and configure it in the visual editor.

For dashboards managed entirely in YAML, add `/codex_usage/frontend/codex-usage-card.js?v=0.6.0` as a JavaScript module resource manually; Home Assistant only permits automatic resource management in storage mode.

Minimal YAML:

```yaml
type: custom:codex-usage-card
```

Full configuration example:

```yaml
type: custom:codex-usage-card
account_mode: auto       # auto | single | all
selected_entry_id: ""    # set through the editor for a fixed account
included_entry_ids: []
allow_account_switching: true
display_mode: adaptive   # adaptive | compact | detailed
title: Codex Usage
show_unavailable_limits: false
sections:
  limits: { visible: true, values: {} }
  resets: { visible: true, values: {} }
  pace: { visible: true, values: {} }
  credits: { visible: true, values: {} }
  spending: { visible: true, values: {} }
  profile: { visible: true, values: {} }
  footer: { visible: true, values: {} }
thresholds:
  elevated: 60
  critical: 85
colors:
  normal: "var(--codex-usage-normal-color, #25b7f3)"
  elevated: "var(--codex-usage-elevated-color, #ffb74d)"
  critical: "var(--codex-usage-critical-color, #ff5f6d)"
  blocked: "var(--codex-usage-blocked-color, #d32f49)"
  stale: "var(--codex-usage-stale-color, #78909c)"
  missing: "var(--codex-usage-missing-color, #9e9e9e)"
stale_after_minutes: 15
appearance:
  card_radius: 20
  panel_radius: 14
  spacing: 16
```

With one configured account the card opens directly on it. With several accounts it shows account chips and initially selects the account with the most urgent state. Chip selection lasts only until the dashboard reloads; choose a fixed account in the editor for persistent selection.

Only fields actually reported for the selected workspace are shown by default. Unknown future limit windows receive a generic duration/name and remain visible. A metric opens Home Assistant's More Info dialog only when its enabled entity is available.

### Sections and layouts

- `adaptive` is the recommended default and changes density with available width.
- `compact` shows the status and limit essentials without detail panels.
- `adaptive` adds concise credit, reset-credit, spending, and profile summaries when reported.
- `detailed` expands spending, reset-credit, and every supported profile aggregate.
- Every content group and its individual values can be hidden independently in the visual editor.
- The editor also controls included accounts, the fixed account, freshness threshold, semantic colors, and card dimensions.
- Home Assistant `view_layout`, `layout_options`, `grid_options`, and `visibility` fields are preserved.

For Sections dashboards the card requests 6 columns by default, supports a minimum of 3 and maximum of 12, and lets content determine its height.

### Themes, CSS variables, and card-mod

The outer element is a normal `ha-card`, so Home Assistant themes and card-mod selectors work as expected. The card accepts these theme variables:

```yaml
Codex Usage Theme:
  codex-usage-normal-color: "#25b7f3"
  codex-usage-elevated-color: "#ffb74d"
  codex-usage-critical-color: "#ff5f6d"
  codex-usage-blocked-color: "#d32f49"
  codex-usage-stale-color: "#78909c"
  codex-usage-missing-color: "#9e9e9e"
  codex-usage-card-radius: 20px
  codex-usage-panel-radius: 14px
  codex-usage-spacing: 16px
```

The supported CSS custom properties are:

| Variable | Purpose |
| --- | --- |
| `--codex-usage-normal-color` | Healthy ambient edge and progress |
| `--codex-usage-elevated-color` | Elevated usage state |
| `--codex-usage-critical-color` | Critical usage state |
| `--codex-usage-blocked-color` | Explicitly blocked state |
| `--codex-usage-stale-color` | Old or unreachable snapshot |
| `--codex-usage-missing-color` | No displayable data |
| `--codex-usage-card-radius` | Outer card radius |
| `--codex-usage-panel-radius` | Inner panel radius |
| `--codex-usage-spacing` | Card and grid spacing |

There is intentionally no free-form CSS or JavaScript configuration field. card-mod can style the outer `ha-card` without weakening the card's configuration boundary.

## Plans and limit windows

Runtime behavior is based on fields actually returned by the account, never a hard-coded plan matrix. Current labels including Guest, Free, Go, Plus, Pro, Pro Lite, Team, Business, Enterprise, Education, Edu, K-12, Quorum, workspace and usage-based variants are formatted for display but do not enable or disable features.

- Plus has been verified against a current live response.
- Other known plan shapes are covered with sanitized contract fixtures.
- Unknown future plan labels and windows are handled on a best-effort basis.

OpenAI may report only a weekly limit, multiple rolling windows, a monthly control, or workspace-specific extras. Missing optional functions are normal and remain hidden in the card unless `show_unavailable_limits` is enabled. Existing legacy entities keep their unique IDs and recorder history; a missing optional value is `unknown` while the coordinator itself remains reachable.

Optional profile, credit, and spending detail entities are disabled by default for new installations. Enable any of them under the device's **Entities** page if they are needed in automations; the bundled card receives the same safe aggregate data independently of entity enablement.

## Privacy and security

Home Assistant stores OAuth tokens in `.storage/core.config_entries`; backups containing that file are sensitive. The integration:

- never requests or stores a ChatGPT password;
- never logs tokens or raw API response bodies;
- sends credentials only to OpenAI HTTPS endpoints;
- uses the selected workspace name for the Home Assistant device instead of exposing the backend account ID;
- migrates the exact legacy generated `Codex Usage (<workspace ID> - <plan>)` title to `Codex Usage` while preserving user-defined names;
- does not expose tokens, account/user IDs, email, roles, profile images, reset-credit IDs, or raw blocker messages to the card;
- provides diagnostics from an explicit safe allowlist only.

The card uses an authenticated Home Assistant WebSocket command, `codex_usage/card_data`, that returns normalized display data with internal config-entry selectors. A data-free Home Assistant event tells the card to reload after coordinator updates.

Removing the integration removes its Home Assistant config entry. To revoke the OpenAI session immediately, also revoke the corresponding session in ChatGPT security settings. See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Read-only endpoints

The current data contract uses these GET endpoints:

- `/backend-api/wham/usage`
- `/backend-api/wham/profiles/me`
- `/backend-api/wham/accounts/check`
- `/backend-api/wham/rate-limit-reset-credits`

Accounts check is used during setup or reauthentication. Profile and reset-credit metadata use the slower isolated refresh schedule. OAuth device authorization and token refresh are the only POST requests.

## Troubleshooting

| Symptom | Explanation / action |
| --- | --- |
| Device-code login is disabled | Enable it in ChatGPT security settings or ask the workspace administrator. |
| Unable to connect | Check DNS/firewall access to `auth.openai.com` and `chatgpt.com`, then retry. |
| Reauthentication requested | Repeat the device-code flow; the workspace selection is retained. |
| A former 5-hour entity is `unknown` | The current response does not report that window. Weekly data is never relabeled as five-hour data. |
| Optional data is absent | The account did not report that capability, or its isolated endpoint failed temporarily. Limits continue updating. |
| Card is missing from the picker | Restart Home Assistant, hard-refresh the browser, and confirm `/codex_usage/frontend/codex-usage-card.js?v=0.6.0` exists under dashboard resources. |
| Card says data is stale | Confirm the integration itself updates successfully and compare `stale_after_minutes` with the configured polling interval. |

Diagnostics can be downloaded from **Settings → Devices & services → Codex Usage**. They exclude credentials and backend identities.

## Development

```bash
python -m venv .venv
.venv/Scripts/activate
pip install homeassistant==2026.7.3 pytest ruff
ruff format --check .
ruff check .
pytest

cd frontend
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run build
```

The built JavaScript is committed under `custom_components/codex_usage/frontend`, so HACS installs the integration and card together. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance.

## License and acknowledgements

MIT License. See [LICENSE](LICENSE) and [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md).
