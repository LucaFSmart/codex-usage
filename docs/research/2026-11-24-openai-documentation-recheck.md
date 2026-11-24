# OpenAI documentation and compatibility review — November 24, 2026

This review updates the October provider review. It covers Codex Usage, the
read-only ChatGPT allowance monitor in this repository. Home Assistant's built-in
OpenAI conversation integration is a separate API-billed service and does not
provide the usage contract parsed here.

## Current provider guidance

- [Pricing](https://learn.chatgpt.com/docs/pricing) and the
  [changelog](https://learn.chatgpt.com/docs/changelog) now cover GPT-6.2 Astra and
  Sol. Fast and Ultrafast factors vary by model and by included versus purchased
  usage. The monitor already reads provider percentages, so applying those
  factors locally would count them again. No model selection or token-price
  calculation is added. Shared agentic allowances remain plan-dependent; API-key
  billing is separate.
- Pro currently has no fixed five-hour limit. Enterprise/Edu flexible pricing
  has no fixed rate limits. Continue discovering windows from responses rather
  than inventing a plan matrix. The provider's current usage dashboard remains
  authoritative for an individual account.
- [Authentication](https://learn.chatgpt.com/docs/auth) still documents ChatGPT
  device authorization for headless login. Enterprise Codex access tokens are a
  distinct automation credential, not a required replacement for personal
  device login. The existing flow, token refresh and administrator-controlled
  device authorization remain appropriate.
- The renamed [reset guide](https://help.openai.com/en/articles/20001498-how-resets-work-in-codex)
  distinguishes saved banked resets, automatic promotional resets and purchased
  instant resets. An automatic reset is not added to the banked balance and need
  not affect every account or allowance. A decrease in usage is therefore not
  evidence of a purchase or banked redemption. Keep count/expiry reconciliation
  based on provider data.
- [Paid-reset guidance](https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets)
  still starts the new weekly period with the first subsequent Work/Codex
  request. Do not calculate it from purchase time. Reset eligibility, offers and
  redemption thresholds belong to the provider UI; this integration performs
  none of those operations.
- [App Server](https://learn.chatgpt.com/docs/app-server) remains a separate RPC
  interface. Its account methods do not establish a stable third-party contract
  for authenticated WHAM HTTP endpoints. A transport migration would require a
  separate service, authentication and lifecycle design; it is not needed for
  the working monitor.

## Source contract and confirmed correction

Reviewed official `openai/codex` source at commit
`8b096dce07b94aa4428ca310b871e5a873c8d2a2`:

- [Device login](https://github.com/openai/codex/blob/8b096dce07b94aa4428ca310b871e5a873c8d2a2/codex-rs/login/src/device_code_auth.rs)
  retains the device authorization routes, polling and 15-minute lifetime.
- [Backend client](https://github.com/openai/codex/blob/8b096dce07b94aa4428ca310b871e5a873c8d2a2/codex-rs/backend-client/src/client.rs),
  [types](https://github.com/openai/codex/blob/8b096dce07b94aa4428ca310b871e5a873c8d2a2/codex-rs/backend-client/src/types.rs)
  and [usage/reset requests](https://github.com/openai/codex/blob/8b096dce07b94aa4428ca310b871e5a873c8d2a2/codex-rs/backend-client/src/client/rate_limit_resets.rs)
  retain the usage, profile, accounts and reset-credit paths used here. Existing
  parsing handles additional limits, optional profile fields and the object
  form of reached-type reasons. New plan strings pass through without assigning
  entitlements.
- Ordinary included-usage permission comes from `rate_limit.allowed`; it is
  already preserved separately from Reserve. Passive readers must continue to
  omit `x-openai-codex-luna-reserve`. Optional upsell payloads and backend
  account/user IDs remain outside the card and diagnostic allowlists.
- Account discovery exposed a real gap: `can_access_with_session: false` and
  `is_deactivated: true` were ignored. The parser now excludes those entries.
  For map responses, session access is on the wrapper and deactivation on its
  nested account. Older responses with absent or non-boolean flags remain
  accepted. Four regression cases failed before the correction and passed
  afterward; sixteen additional cases protect strict boolean handling. Usage
  validation still runs before a selected workspace is saved.

The [HA DeviceInfo migration](https://contributors.home-assistant.io/blog/2026/11/19/device-info-mapping/)
was also checked. Production code constructs `DeviceInfo` with keyword fields
and does not use the deprecated mapping operations. It needs no rewrite and
retains compatibility with the existing minimum.

## Dependencies and validation

The current Python CI target advances to Home Assistant 2026.11.2 with Ruff
0.17.6 and uv 0.13.6. The tests do not use the custom-component harness, whose
newest published version still pins HA 2026.10.4; remove that unused harness
instead of overriding its HA requirement. HA 2026.11.2 pins Pillow 13.0.0, so
the old test-only override is removed too. The HA 2026.3.0 minimum lane stays
unchanged. See [test environment instructions](../../requirements/README.md).

Frontend updates: Playwright 1.65.1, Vitest/coverage 5.1.1, ESLint 10.15.0,
Prettier 3.10.1, typescript-eslint 8.74.0 and Vite 8.3.8. TypeScript remains
6.0.3 because the parser's declared peer range is below 6.1. Lit stays 3.3.3.
The bundled JavaScript is rebuilt from the existing card source.

Local checks on Windows/Python 3.14.10, with the existing HA 2026.8.3 environment:

- 350 Python unit tests and three real-HA integration smoke tests pass.
- Ruff 0.17.6 formatting and lint pass. Five existing upstream deprecation
  warnings remain in the local HA HTTP/backoff dependencies.
- Frontend formatting, lint, type checking, 159 unit tests, coverage gates and
  production build pass. A second build produces a byte-identical bundle.
- Both Python locks reproduce byte-for-byte with uv 0.13.6 using the CI target
  platform and Python version.
- All 32 Chromium browser tests pass on the local harness at
  `http://127.0.0.1:4173/visual/`, including light/dark layouts at 320–1200px,
  narrow desktop cards, account switching, details and keyboard/accessibility
  behavior. Browser plugin not available: the existing Playwright suite was
  used. Lit's development-mode warning is expected in this Vite harness.
- The strict hash-locked Python audit and npm audit report no known
  vulnerabilities in the current development environments. The unchanged old
  minimum environment retains its previously documented advisory limitations.

The production check used the existing HA MCP connection: HA 2026.11.2 runs
released Codex Usage 0.7.6 with a loaded entry and successful usage/profile/reset
sources. The system log contains one generic usage-fetch error at 12:07:55 CET;
successful updates resumed by 12:12 and the final diagnostics show a successful
12:47:55 update. The retained message has no exception details, so its cause
cannot be established; it does not demonstrate a persistent schema failure. This is
evidence about the released installation, not a deployment of this patch.
Chrome was absent from the available browser inventory, so no live dashboard
visual claim is made. No production settings, credentials, devices or purchases
were changed. Release 0.7.7 publication and Linux CI are tracked in the
[release verification record](../verification-0.7.md), separately from these
local and production observations.

## Marketplace release

Codex Usage is present in the shared `hacs/default` integration catalog.
Home Assistant 2026.11's built-in [Marketplace](https://contributors.home-assistant.io/marketplace/how-it-works/)
uses that catalog, `hacs.json` and the HACS action. No separate catalog submission
is needed. Release 0.7.7 adds the `computers_network.cloud_developer_tools`
category and updates installation guidance; older supported installations keep
using HACS. A published GitHub release must match the manifest version; a tag
alone is insufficient. See the [release guide](https://contributors.home-assistant.io/marketplace/guides/releases/).
