# OpenAI documentation recheck for 0.7.4

Reviewed: 2026-10-04. This review supersedes the September research records for current product guidance; those records retain their historical context. It compares official documentation with the integration's current implementation, not production purchases or reset redemption.

## Findings and repository consequences

- [Pricing](https://learn.chatgpt.com/docs/pricing) confirms shared Work/Codex usage and plan-dependent participation of other agentic features. README now uses this conditional wording instead of implying that every named product already participates on every plan. Account-level observations cannot identify a consuming app or model.
- The same source documents Pro without a fixed five-hour limit and Enterprise/Edu flexible pricing without fixed rate limits. No plan-name matrix is added. Missing windows stay absent; registered main-window entities become unavailable when their window disappears. Entity documentation now matches that behavior.
- [What's new](https://learn.chatgpt.com/docs/whats-new) and [Models](https://learn.chatgpt.com/docs/models) cover GPT-6 Sol/Luna, GPT-6.1 Sol, Astra Ultrafast and the October 14 GPT-5.5 retirement. This passive monitor selects no models and calculates no token-price estimates, so those changes require no model migrations or hard-coded multipliers here.
- [Workspace usage controls](https://learn.chatgpt.com/docs/enterprise/usage-limits) apply to eligible activity under the workspace plan; they do not describe all Codex usage or Platform API billing. Credit/spend fields remain provider observations. The integration does not reconstruct hidden currency amounts or infer entitlement.
- [Sign in with ChatGPT](https://learn.chatgpt.com/docs/sign-in-with-chatgpt) adds a separate partner-app authorization and usage-control surface. Its presence does not establish a replacement contract for this integration's Codex device flow.
- [App Server](https://learn.chatgpt.com/docs/app-server) documents a separate RPC transport and account usage operations. It does not turn the authenticated WHAM HTTP endpoints into a stable public API. RPC response fields are not mixed into the HTTP parser, and App Server is not installed or contacted.
- The current [banked-reset guide](https://help.openai.com/en/articles/20001498-how-banked-codex-resets-work) and [paid-reset guide](https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets) retain the distinction between saved one-time resets and immediate purchases. Purchased resets start their new weekly period with subsequent Work/Codex activity. Existing server-date reconciliation remains appropriate; no purchase or redemption operation is added.

## Implementation review

The review reproduced and corrected source-state, malformed-response and frontend lifecycle defects. Regression tests exercise the actual failure conditions. The [release verification record](../verification-0.7.md) identifies the test environments and publication gates.

Luna Reserve metadata and saved-reset reconciliation remain based on supported provider response shapes. Marketing/model announcements alone do not justify changing the observed `base_model_inference` contract. A usage drop does not identify a purchase or redemption; only provider-reported dates determine reset, pace and budget values.

## Remaining limits

The HTTP source is undocumented as a stable third-party API. Current documents and sanitized fixtures cannot guarantee future schema compatibility or prove every plan's live response. Historical research statements about experimental interfaces apply to their dated snapshots; follow the linked current official references for current interface maturity and eligibility.
