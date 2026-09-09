# OpenAI documentation recheck for Codex Usage 0.7

Reviewed: 2026-09-05. Application baseline remains 0.6.5; planning commits end at `ec0f988` before this review. Scope: official product usage/reset/credit guidance, pricing, authentication, App Server, enterprise reporting, model documentation and their implications for this repository.

## Result

Keep architecture A and the three-block 0.7 delivery. Tighten credit presentation, limit wording and reset transitions. No reviewed source establishes a mandatory replacement of the four current WHAM reads. Publicly documented alternative APIs remain separate integrations with different transport/access requirements.

This is a documentation and source-code audit, not a live validation against an eligible account. Retrieval metadata differs across search and opened pages; this report records current content without claiming that every finding was introduced today.

## 1. Shared usage must not be described as Codex-only activity

The plan guide describes shared allowances across Codex and other supported agentic products. It also distinguishes regular Chat Voice and ordinary ChatGPT limits from agentic task usage. [Plan guide](https://help.openai.com/en/articles/11369540).

Repository consequence: describe the integration as monitoring reported Codex/agentic allowances. A percentage change does not identify which app, model or task used it. Preserve the project name and entity IDs. Add a help sentence rather than inventing per-surface sensors or renaming the integration. Do not sum account views or turn optional profile token aggregates into an attributed spending report.

## 2. Credit units and negative balances need explicit handling

OpenAI distinguishes usage credits from the dollar-denominated wallet and documents that concurrent work can leave a credit balance below zero. [Credit guide](https://help.openai.com/en/articles/12642688).

Current code evidence:

- `api.py::_decimal` already preserves finite signed amounts.
- `sensor.py` assigns credit units to balance and spend amounts.
- `frontend/src/format.ts::formatUsd` prepends a dollar sign.
- `renderCreditsRows` calls it and replaces the amount with Unavailable when `has_credits` is false.

0.7 action: format these contract fields as credits, preserve a signed numeric balance, and separate a balance from availability flags. A known `-3.5` must appear as a negative credit balance even if `has_credits=false`; valid zero is visible. A missing amount is unknown. Do not infer a currency from locale, a plan price, or an administrator's USD billing agreement. Only explicitly documented currency-valued fields can use currency formatting.

This strengthens an existing 0.7 task; it does not require a new balance entity. Include tests for negative/zero/unknown balances and locale formatting. Preserve finite validation, precision and existing nullable-flag corrections.

## 3. A reached quota is not proof that every action has stopped

The plan/pricing guidance permits ongoing work to continue subject to applicable limits and describes credits as an additional usage route. [Plan guide](https://help.openai.com/en/articles/11369540), [pricing](https://learn.chatgpt.com/docs/pricing).

Current localized callouts say usage is blocked. Keep the binary sensor's established meaning of a reported limit being reached, but use precise UI text such as Included usage limit reached or Code review limit reached. Do not promise that all work must have stopped, that credits definitely allow continuation, or that a zero credit balance blocks unused included allowance. Explicit backend restrictions retain their cause and severity.

Do not introduce a new inferred can-use-Codex boolean; the current response cannot prove it.

## 4. Paid instant resets are distinct from saved resets

The paid-reset article describes an immediate reset whose next weekly period begins with the first subsequent Work/Codex request. It is not a saved reset or credit top-up. [Paid-reset guidance](https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets).

0.7 action: retain backend dates as authoritative, including a temporarily missing date after an external reset. Never calculate the next date from payment time or monitor a checkout flow. Add a test for restored usage with no reset date, followed by a response supplying a new date. The integration must not increment the banked-reset count because an immediate reset occurred.

The previously incorporated banked-reset rules remain in the design; the different reset mechanisms cannot be identified reliably from a consumption drop alone.

## 5. Capability-specific windows and tool usage

Pricing documents feature-specific limits, flexible credit billing without fixed windows, GitHub-specific Code Review accounting, and Codex image generation using general allowances. It distinguishes local reviews from GitHub reviews. [Pricing](https://learn.chatgpt.com/docs/pricing).

0.7 action: keep dynamic windows, do not derive capabilities from plan labels, and use Code review as the real example for additional limits. Mark the earlier image-generation restriction mockup as a synthetic stress case, not proof of a separate image quota. Do not imply that ordinary ChatGPT image or voice banners are monitored by this integration. Explain that some accounts may primarily expose credit/spend controls; neutral fixed core placeholders are not evidence of an entitlement.

README's claim to support any future window must be limited to the implemented response shape: supported primary/secondary windows and bounded additional limits. Unknown schemas remain best effort.

## 6. Enterprise visibility and history are not interchangeable with WHAM data

Enterprise usage pages can expose percentages without absolute amounts according to administrator settings. Their chat totals may omit some associated work; current and historical views can update at different times. [Personal Analytics and usage guide](https://help.openai.com/en/articles/20001478).

0.7 action: treat a valid percentage-only spend response as useful, not a failed source. Do not reconstruct hidden monetary amounts from percentages or apply one source timestamp to unrelated histories. Diagnostics must not bypass omitted fields. Retain the decision to defer per-chat/model history, own charts and daily-data adapters; a screenshot of an official app is not evidence of a compatible public endpoint.

## 7. Reset-detail presence and completeness

The App Server reference distinguishes a missing reset-detail list from an empty list and allows capped rows; its count is authoritative. It also documents rate-limit reads/notifications and optional token summaries/day buckets. [App Server](https://learn.chatgpt.com/docs/app-server).

This is RPC documentation, not a new WHAM JSON contract. Our raw HTTP parser should preserve whether a `credits` list was actually supplied instead of collapsing missing/null/empty lists into one indistinguishable tuple. Derive that flag from the received shape only. Never infer count or completeness from list length. Test these shapes using explicitly synthetic HTTP fixtures; do not copy camelCase RPC fields into WHAM parsing without response evidence.

The actual older CLI compatibility gap has not been retested in this documentation pass. Do not change its prior spike result to success simply because the docs expose the RPC method.

## 8. Enterprise Analytics authentication: official sources conflict

The Learn Analytics overview still says Platform organization API key. [Analytics overview](https://learn.chatgpt.com/docs/enterprise/analytics-api).

The Admin-key guide instead documents workspace-scoped Admin keys, `codex.enterprise.analytics.read`, and the separate `https://api.chatgpt.com/v1` administration surface. Platform keys are not interchangeable with those credentials. [Admin keys](https://help.openai.com/en/articles/20001407).

The linked [Admin API reference](https://chatgpt.com/public/admin/api-reference) returned only a page title through the research tool, so exact Analytics routes and schemas were not verified. Prefer the dedicated provisioning guidance for credential-category planning, but mark the overview mismatch unresolved. Do not repeat the earlier audit's organization-key statement as settled guidance. A future enterprise adapter needs a verified reference, least-privilege test access, and its own contract work. It is not part of 0.7.

## 9. Authentication alternatives do not require a 0.7 migration

Device-code login remains documented for headless use and may require user/admin enablement. [Authentication](https://learn.chatgpt.com/docs/auth).

Workspace access tokens are documented for supported Business/Enterprise local automation and App Server use. [Access tokens](https://learn.chatgpt.com/docs/enterprise/access-tokens).

Neither page establishes that such a token is a drop-in credential for this integration's four WHAM requests. Keep device authentication and immutable workspace identity for 0.7. Do not add a token field or substitute an Admin/API key without a separate validated contract. No new login grant is required by the reviewed material.

## 10. Astra API changes do not belong in this quota monitor

The [Astra model page](https://developers.openai.com/api/docs/models/gpt-6-astra) and [API changelog](https://developers.openai.com/api/docs/changelog) describe model/API behavior. This project sends no inference requests. Model prices, context sizes and reasoning controls therefore do not justify a hardcoded model matrix, price multiplier or new inference endpoint here.

The model page's generic endpoint navigation is not evidence that every listed route supports the model. This review makes no new endpoint-compatibility claim from that list.

## Delivery changes and effort

| Change | Location | Scope |
| --- | --- | --- |
| Accurate usage scope and supported-shape wording | README now; detailed guide in block 3 | Documentation |
| Credit formatting, signed balances, precise quota labels | Card data/format/view model/translations in block 1 | Existing correctness work tightened |
| Percentage-only enterprise data and delayed reset date | Parser/card fixtures in block 1; budget fixtures in block 3 | Edge cases added |
| Reset detail-list presence | API/reset summary in block 1 | Small additive data contract |
| Analytics contradiction and separate credentials | Research record now | Future adapter stays deferred |

The additional signed-balance, wording, detail-presence and transition fixtures are estimated at **3–6 hours beyond the already scoped work**. Together with the banked-reset addition of 2–4 hours, reserve use is **5–10 hours**. Base estimate becomes **67–110 hours** if those additions are counted explicitly. The previously stated contingency envelope of **78–125 hours** remains the planning envelope, with correspondingly less remaining reserve; do not add another 25% silently. Re-estimate after block 1.

## Verification boundaries

Pages were opened, not assessed from search snippets alone. Conclusions separate official semantics, observed repository behavior and proposed changes. README updates describe current scope without advertising unimplemented 0.7 options. Documentation diff/links/fences are checked; runtime tests are not rerun for documentation-only changes. Application code, credentials and external accounts are untouched.

## 2026-09-06 addendum

OpenAI's current [Codex App Server reference](https://learn.chatgpt.com/docs/app-server) now specifies `rateLimitsByLimitId`, `rateLimitResetCredits`, `account/rateLimits/updated`, and `account/usage/read` with nullable summary values and daily token buckets. This confirms that a daily-data adapter is technically definable. It does not make App Server a suitable mandatory Home Assistant dependency: the App Server command and its WebSocket transport are still experimental, the Codex executable is not supplied by HACS, and externally managed ChatGPT-token login is also experimental.

The recommended future shape is therefore an optional, separately configured JSON-RPC adapter or sidecar. It should prioritize `rateLimitsByLimitId`, reconcile notifications with full reads, preserve `null` versus empty reset details, and model daily values by their reported date. The existing WHAM transport remains the 0.7 default. Current-schema compatibility fixes for `spend_control_reached` and scalar or object `rate_limit_reached_type` are covered by parser regressions without mixing camelCase App Server payloads into the WHAM parser.

The same reference now documents `account/rateLimitResetCredit/consume`, `account/sendAddCreditsNudgeEmail`, and `account/workspaceMessages/read`. The first two perform external actions and remain outside the integration's read-only contract. Workspace messages are read-only but are service announcements rather than usage telemetry; adding them would create new message-retention, redaction and notification behavior with little benefit to the core quota card. They are therefore deferred rather than folded into the 0.7 polling coordinator.

## 2026-09-08 Luna Reserve addendum

OpenAI now documents [Luna Reserve](https://help.openai.com/en/articles/20001499-luna-reserve-in-codex-and-chatgpt-work) as a separate, limited fallback allowance for selected personal accounts. Regular usage can be exhausted while supported work continues with Luna; Reserve neither restores regular usage nor unlocks the more capable models.

The official Codex change [5037919](https://github.com/openai/codex/commit/50379197779be0e5afcbddb014a34cd1fc08af53) forwards `/wham/usage`'s optional `normal_model_slug` for additional quotas and identifies the Reserve quota as `base_model_inference` with the alias `gpt-reserve`. The client maps that alias to the human label **Luna Reserve**. Codex Usage now mirrors that bounded display mapping, retains the optional slug as metadata, and continues to generate window sensors through the existing dynamic additional-limit path.

The companion capability change [577a4fc](https://github.com/openai/codex/commit/577a4fcd065e07fab24db2d208d825c67558b8a5) makes `supportsLunaReserve` an explicit statement that a client can perform automatic Reserve fallback. Only eligible ChatGPT sessions then send `x-openai-codex-luna-reserve: 1`; `ordinaryUsageAllowed` is returned only after account/user validation. Codex Usage does not switch request models, so it must not send this capability header merely to discover extra telemetry. The existing exact-header request test protects that boundary.

The public App Server page had not yet incorporated `supportsLunaReserve`, `ordinaryUsageAllowed`, or `normalModelSlug` when rechecked. Current implementation evidence therefore comes from the official client commits and Help Center article. A missing Reserve bucket remains unknown. When an ordinary limit is reached and a returned Reserve bucket is explicitly allowed, the card reports the fallback and downgrades aggregate presentation from blocked to critical; the `limit_reached` entity stays on because the ordinary limit was genuinely reached.

## 2026-09-09 reset-timing clarification

OpenAI's updated [Astra usage guide](https://help.openai.com/en/articles/20001516-managing-usage-with-gpt-6-astra-in-work-and-codex) now says that a **purchased instant reset** restores allowance immediately, while its new weekly period starts with the first subsequent Work or Codex request and resets automatically seven days after that request. The dedicated [paid-reset guide](https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets) states the same rule. The separate [banked-reset guide](https://help.openai.com/en/articles/20001498-how-banked-codex-resets-work) still documents refreshed five-hour and weekly windows plus a changed weekly date, without explicitly assigning the same first-request trigger to banked resets. Repository copy therefore keeps these mechanisms distinct.

No parser special case is required. A restored weekly window can temporarily carry usage and duration without `reset_at`; reset, pace and budget then remain unknown. The next valid server-reported date is adopted on a later poll. A regression test now locks this transition without deriving a period start from purchase, reset-credit consumption or local time.
