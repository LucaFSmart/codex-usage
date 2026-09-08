# Entity reference

Codex Usage creates one Home Assistant device for each configured account. The final entity ID depends on the account name and Home Assistant's registry; the stable key below is the suffix of the entity's unique ID. **Enabled** describes a new installation. Previously created entities keep their registry setting.

An enabled entity becomes `unknown` when its required value is absent. It becomes `unavailable` when the main usage coordinator has no usable response. Optional profile and reset-detail failures do not make healthy usage entities unavailable. Diagnostic timestamps remain available independently and are `unknown` until that source has succeeded.

## Main usage and account

| Key | Name | Unit / class | Enabled | Source and absence behavior |
| --- | --- | --- | --- | --- |
| `plan` | Plan | text | Yes | Main usage response; `unknown` when omitted. |
| `five_hour_usage` | 5-hour usage | `%`, measurement | Yes when reported, or retained for an existing entity | Main five-hour window; `unknown` if a formerly reported window disappears. |
| `five_hour_remaining` | 5-hour remaining | `%`, measurement | Yes when reported, or retained | Computed from the same window without treating unknown as zero. |
| `five_hour_reset` | 5-hour reset | timestamp | Yes when reported, or retained | Server-provided reset time; no locally predicted date. |
| `five_hour_budget` | 5-hour usage budget | `pp/h` | No | Remaining percentage points divided by time to reset, fixed to the successful observation. Suppressed for stale, failed or invalid windows. |
| `weekly_usage` | Weekly usage | `%`, measurement | Yes when reported, or retained | Main weekly window. |
| `weekly_remaining` | Weekly remaining | `%`, measurement | Yes when reported, or retained | Computed from the same window. |
| `weekly_reset` | Weekly reset | timestamp | Yes when reported, or retained | Server-provided reset time. |
| `weekly_budget` | Weekly usage budget | `pp/h` | No | Same budget rule as the five-hour entity. |
| `weekly_pace` | Weekly usage pace | `%`, measurement | Yes when weekly window exists, or retained | Used percentage minus elapsed-window percentage; `unknown` if duration/reset is missing or outside the window. |
| `available_reset_credits` | Available resets | `resets` | Yes | Explicit usage count has priority over reconciled hourly reset details. Missing is unknown; zero remains zero. |
| `limit_reached` | Rate limit reached | binary | Yes | On when a reported main/additional limit, credit control or spend control is reached. This does not claim every supported action is unavailable. Attributes list affected limits and, when explicitly reported, whether a fallback allowance remains available. |

## Credits and spend control

These entities are disabled by default because not every account reports them and most dashboards do not need them. Credit units are neither dollars nor OpenAI API credits.

| Key | Name | Unit / class | Source and absence behavior |
| --- | --- | --- | --- |
| `credit_balance` | Credit balance | `credits` | Main usage credit object; preserves zero and negative balances. |
| `credits_available` | Credits available | binary | Explicit provider flag; missing remains unknown. |
| `credits_unlimited` | Unlimited credits | binary | Explicit provider flag. |
| `credits_overage_limit_reached` | Credit overage limit reached | binary | Explicit provider blocker. |
| `spend_used` | Spend used | `credits` | Reported account/workspace spend control. |
| `spend_limit` | Spend limit | `credits` | Reported limit; hidden absolute values are not reconstructed. |
| `spend_remaining` | Spend remaining | `credits` | Reported remaining amount; hidden values are not reconstructed. |
| `spend_usage` | Spend usage | `%`, measurement | Reported percentage, including when absolute amounts are hidden. |
| `spend_reset` | Spend reset | timestamp | Server-provided time. |
| `spend_limit_reached` | Spend limit reached | binary | Reported spend-control state. |

## Aggregate profile statistics

All profile entities are disabled by default and become `unknown` if the optional profile source is disabled, unsupported or has never succeeded. A temporary profile error can retain the last value while source diagnostics identify its age.

| Key | Name | Unit / class |
| --- | --- | --- |
| `lifetime_tokens` | Lifetime tokens | `tokens`, total |
| `peak_daily_tokens` | Peak daily tokens | `tokens` |
| `current_streak_days` | Current streak | days, measurement |
| `longest_streak_days` | Longest streak | days |
| `total_threads` | Total threads | `threads`, total |
| `longest_running_turn` | Longest running turn | seconds, duration |
| `fast_mode_usage` | Fast mode usage | `%` |
| `total_skills_used` | Total skill uses | `uses`, total |
| `unique_skills_used` | Unique skills used | `skills`, total |
| `most_used_reasoning_effort` | Most used reasoning effort | text |
| `most_used_reasoning_effort_percentage` | Most used reasoning effort share | `%` |

`total` tolerates provider corrections without presenting them as a new monotonically increasing counter cycle. See the [0.7 upgrade notes](upgrading-to-0.7.md) before changing Recorder metadata manually.

## Source diagnostics

These timestamp sensors are disabled by default. They show the last successful observation, not the last attempt.

| Key | Name | Meaning |
| --- | --- | --- |
| `usage_last_success` | Last usage update | Main usage source last succeeded. |
| `profile_last_success` | Last profile update | Optional profile source last succeeded. |
| `reset_details_last_success` | Last reset-details update | Optional saved-reset details last succeeded. |
| `workspace_discovery_last_success` | Last workspace discovery | Workspace lookup last succeeded during setup or reauthentication. |

## Dynamic additional limits

For every reported additional feature window, the integration creates `usage`, `remaining` and `reset` sensors. A disabled `budget` sensor is also created when the provider supplies a valid duration. Their names contain the provider's feature label and duration; their unique IDs use the stable limit identifier and `primary` or `secondary` window. The dynamic `usage` sensor exposes the provider's nullable `allowed` and `limit_reached` status as attributes. When supplied, it also retains `normal_model_slug` as bounded display metadata; the integration never uses that field to select a model or infer entitlement. Entities remain registered if the feature later disappears so Recorder history and automations keep their identity. Missing values then become `unknown`.

OpenAI currently identifies Luna Reserve with the additional limit ID `base_model_inference` and quota alias `gpt-reserve`. Codex Usage displays that exact known alias as **Luna Reserve**. If its ordinary allowance is reached while this bucket is explicitly allowed, the aggregate binary sensor remains on because a rate limit really was reached; its `fallback_available: true` and `fallback_limit_id` attributes explain why supported Luna work may still continue.

## Card and entity registry

The bundled card uses an allowlisted WebSocket snapshot and can show optional values even when their HA entities are disabled. Card visibility, entity enablement and optional endpoint polling are separate controls. See [card configuration](card.md) and [privacy](privacy.md).
