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
- Single-surface card design with a collapsible details panel and a visual editor
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

For dashboards managed entirely in YAML, add `/codex_usage/frontend/codex-usage-card.js?v=0.6.5` as a JavaScript module resource manually; Home Assistant only permits automatic resource management in storage mode.

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
compact: true            # false starts the details panel expanded
title: Codex Usage
show_unavailable_limits: false
sections:
  limits: { visible: true, values: {} }
  additional_limits: { visible: "auto", values: {} }
  resets: { visible: true, values: {} }
  pace: { visible: true, values: {} }
  account: { visible: true, values: {} }
  credits: { visible: "auto", values: {} }
  spending: { visible: "auto", values: {} }
  profile: { visible: "auto", values: {} }
  footer: { visible: true, values: {} }
thresholds:
  warning: 75
  critical: 90
colors:
  ok: "var(--codex-usage-ok-color, #25b7f3)"
  warning: "var(--codex-usage-warning-color, #ffb74d)"
  critical: "var(--codex-usage-critical-color, #ff5f6d)"
  blocked: "var(--codex-usage-blocked-color, #d32f49)"
  unknown: "var(--codex-usage-unknown-color, #9e9e9e)"
stale_after_minutes: 15
appearance:
  card_radius: 20
  spacing: 16
```

`visible: "auto"` shows a section only when the selected account actually reports that data (for example, `credits` stays hidden for an account with no credit balance); `visible: true`/`false` are unconditional. Thresholds are percent **used**; `warning`/`critical` at `75`/`90` correspond to `25%`/`10%` remaining.

With one configured account the card opens directly on it. With several accounts it shows account chips and initially selects the account with the most urgent state. Chip selection lasts only until the dashboard reloads; choose a fixed account in the editor for persistent selection.

Only fields actually reported for the selected workspace are shown by default. Unknown future limit windows receive a generic duration/name and remain visible. A metric opens Home Assistant's More Info dialog only when its enabled entity is available.

### Sections and layouts

- The status chip, most-constrained-limit callout, and the primary 5-hour/weekly limits are always visible, regardless of the details panel's state.
- `compact: true` (default) starts with the details panel collapsed, so the card opens on just the status chip, the most-constrained-limit callout, and the primary limits; `compact: false` starts it expanded. Either way, the card's own "Show details"/"Hide details" toggle lets the viewer expand or collapse it at any time, independent of the configured default.
- The details panel holds additional limits, credits, spend control, reset credits, profile stats, and account info. Each of these sections can be hidden entirely (`visible: false`), forced on (`visible: true`), or set to `visible: "auto"` to hide itself automatically when the selected account has no data for it.
- Every content group and its individual values can be hidden independently in the visual editor.
- The editor also controls included accounts, the fixed account, freshness threshold, semantic colors, and card dimensions.
- Home Assistant `view_layout`, `layout_options`, `grid_options`, and `visibility` fields are preserved.

For Sections dashboards the card requests 6 columns by default, supports a minimum of 3 and maximum of 12, and lets content determine its height.

### Themes, CSS variables, and card-mod

The outer element is a normal `ha-card`, so Home Assistant themes and card-mod selectors work as expected. The card accepts these theme variables:

```yaml
Codex Usage Theme:
  codex-usage-ok-color: "#25b7f3"
  codex-usage-warning-color: "#ffb74d"
  codex-usage-critical-color: "#ff5f6d"
  codex-usage-blocked-color: "#d32f49"
  codex-usage-unknown-color: "#9e9e9e"
  codex-usage-card-radius: 20px
  codex-usage-spacing: 16px
```

The supported CSS custom properties are:

| Variable | Purpose |
| --- | --- |
| `--codex-usage-ok-color` | Healthy status edge, chip, and progress fill |
| `--codex-usage-warning-color` | Low-remaining usage state |
| `--codex-usage-critical-color` | Critically low usage state |
| `--codex-usage-blocked-color` | Explicitly blocked state |
| `--codex-usage-unknown-color` | No displayable data |
| `--codex-usage-card-radius` | Outer card radius |
| `--codex-usage-spacing` | Card padding and content spacing |

The freshness banner (data may be outdated) always uses a fixed, non-themable
color — deliberately decoupled from the severity palette above, since a stale
but otherwise healthy account should never look alarming.

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

The card uses an authenticated Home Assistant WebSocket command,
`codex_usage/card_data`, that returns normalized display data with internal
config-entry selectors. Admins and users with global entity-read access can
see all configured accounts; a restricted user receives an account only when
Home Assistant grants read access to every entity belonging to that config
entry, including disabled entities. A data-free Home Assistant event tells the
card to reload after coordinator updates.

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
| Card is missing from the picker | Restart Home Assistant, hard-refresh the browser, and confirm `/codex_usage/frontend/codex-usage-card.js?v=0.6.5` exists under dashboard resources. |
| Card says data is stale | Confirm the integration itself updates successfully and compare `stale_after_minutes` with the configured polling interval. |

Diagnostics can be downloaded from **Settings → Devices & services → Codex Usage**. They exclude credentials and backend identities.

## Development

```bash
python -m venv .venv
.venv/Scripts/activate
pip install homeassistant==2026.8.3 pytest ruff
ruff format --check .
ruff check .
pytest

cd frontend
npm ci
npm run format:check
npm run lint
npm run typecheck
npm run audit
npm test
npm run test:coverage
npm run build
```

The real Home Assistant integration smoke test requires Linux (the Home
Assistant test runtime imports Unix-only modules). CI runs it on Ubuntu. To run
it locally on Linux:

```bash
pip install homeassistant==2026.8.3 pytest pytest-homeassistant-custom-component
pytest tests_integration/test_integration_smoke.py -v -o asyncio_mode=auto
```

The built JavaScript is committed under `custom_components/codex_usage/frontend`, so HACS installs the integration and card together. See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidance.

## License and acknowledgements

MIT License. See [LICENSE](LICENSE) and [ACKNOWLEDGEMENTS.md](ACKNOWLEDGEMENTS.md).
