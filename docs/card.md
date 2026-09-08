# Dashboard card

The card shows the account summary, main usage windows, named restrictions and available resets. Additional limits, credits, spend control, profile statistics and account details appear in the collapsible Details panel. Details start collapsed; `compact: false` starts them expanded.

Reported allowances may be shared by Codex and other eligible agentic surfaces. The card cannot attribute a percentage change to an app, model, task or conversation. A reached-limit callout reports the provider classification without claiming that every current or future action is blocked.

When OpenAI explicitly reports an allowed Luna Reserve bucket alongside exhausted regular usage, the card says that the fallback is available and uses critical rather than blocked styling. Reserve percentages and reset timing appear in **Additional limits**, subject to the normal section and per-value visibility settings. The section remains Automatic by default and the Details panel remains collapsed by default.

## Visibility

Each section has three modes: **Automatic** (`"auto"`), **Always show** (`true`), and **Hide** (`false`). In Automatic, missing optional values are omitted. Always show keeps one neutral placeholder if the whole section has no data. Hide removes the section; individual `values` settings can also hide specific metrics.

Standard five-hour and weekly rows retain their positions during temporary data loss and display an em dash. An unreported row is a placeholder, not a claim that the plan includes that allowance. Explicit section/value hides take precedence. Reported nonstandard windows are supported too.

Source details are hidden by default. Automatic sources shows actionable polling errors, stale retained data or a source still awaiting its first reading. Disabled/unsupported sources and the age of workspace discovery do not trigger a source warning. The main connection indication remains visible independently. Cached profile statistics receive a group-level historical indication.

```yaml
type: custom:codex-usage-card
account_mode: auto
compact: true
sections:
  limits: { visible: true, values: {} }
  additional_limits: { visible: "auto", values: {} }
  resets: { visible: "auto", values: {} }
  credits: { visible: "auto", values: {} }
  spending: { visible: "auto", values: {} }
  profile: { visible: "auto", values: {} }
  budget: { visible: "auto", values: {} }
  sources: { visible: false, values: {} }
```

Card visibility affects presentation. Enabling an entity affects Home Assistant's entity registry. Disabling an optional source affects HTTP requests and its payload. These are three different controls. More Info is available only for an enabled entity the viewer may access.

| Section key | Default | Contents |
| --- | --- | --- |
| `limits` | Show | Standard main usage windows |
| `additional_limits` | Automatic | Named feature windows |
| `resets` | Show | Relative and absolute window reset times |
| `pace` | Show | Elapsed-window comparison |
| `account` | Show | Plan, workspace and shortened entry selector |
| `credits` | Automatic | Credit balance and saved resets |
| `spending` | Automatic | Account/workspace spend control |
| `profile` | Automatic | Aggregate profile statistics |
| `budget` | Automatic | Valid observed usage budgets |
| `sources` | Hide | Polling lifecycle and freshness |
| `footer` | Show | Last update and integration version |

The visual editor exposes available per-value switches. YAML uses the normalized limit IDs or metric keys written by the editor; keep those IDs opaque rather than constructing them from plan names.

## Accounts and appearance

`account_mode` supports `auto`, `single`, and `all`. Use the editor for `selected_entry_id` and `included_entry_ids`; these are Home Assistant entry IDs. `allow_account_switching` controls switching. Existing saved values and Home Assistant `view_layout`, `layout_options`, `grid_options` and `visibility` are retained.

Color thresholds describe percentage **used**: the defaults are warning 75 and critical 90. Configure them with `thresholds.warning` and `thresholds.critical`. Semantic colors, `appearance.card_radius`, `appearance.spacing`, `stale_after_minutes`, and existing HA themes remain supported. The outer element is `ha-card` for card-mod. There is no free-form JavaScript configuration.

## Interpreting the values

- **Usage/remaining:** percentages of the reported included allowance. A named feature restriction does not make another healthy window exhausted. A reached included quota is not a promise that all ongoing work stopped.
- **Luna Reserve:** a separate, account-dependent fallback allowance for Luna. Its presence and status are accepted only when explicitly reported. A missing bucket is unknown, not unavailable. The card never infers Reserve from plan name, ordinary percentages, reset dates or a model slug.
- **Usage budget:** remaining percentage points divided by time until the reported reset. The sensor uses pp/h; the card displays pp/day for windows whose full duration is at least one day. For example, 18 points over 72 hours means 6 pp/day. It is an allocation guide, not an exhaustion forecast, prompt count or money balance. It disappears for stale/failed usage, invalid/reset windows, and immediately before reset.
- **Credit balance:** credits, including zero and negative values. Availability flags do not replace a known balance. Spend percentages may be present while an administrator hides absolute amounts. No currency or hidden invoice amount is reconstructed.
- **Available resets:** saved one-time allowance resets. Usage-sourced count takes precedence over hourly details, including an explicit zero. **Next known expiry** describes a saved reset, not the next rolling-window reset, and does not promise a complete ledger.

A full banked reset can change both five-hour and weekly reset dates. The card adopts dates returned by the next usage poll. Old expiry details may temporarily disappear until the hourly source catches up; this does not imply consumption or a locally changed reset count. See [OpenAI's banked-reset explanation](https://help.openai.com/en/articles/20001498-how-banked-codex-resets-work).

OpenAI's [Codex App Server reference](https://learn.chatgpt.com/docs/app-server) independently confirms that an available reset count is authoritative, that detail rows may be capped, and that `null` details differ from an empty fetched list. Codex Usage applies those semantics to the WHAM data it receives; it does not connect to App Server.

[Paid instant resets](https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets) are separate from saved resets and may leave the next weekly date temporarily absent until later activity. Automatic rolling-window resets are also provider events. The integration cannot identify the mechanism from a percentage drop, never increments/decrements the saved count from that drop, and exposes no purchase or redemption action.

Reported usage can be shared across supported agentic surfaces. This integration cannot attribute a percentage to one app, reconstruct token-level history, or separate activity that the backend aggregates. Window labels and availability follow received capabilities, not assumptions about a model or subscription name.

The browser updates relative times once per minute while connected. These ticks make no HTTP or WebSocket requests. Cached pre-0.7 cards can read the schema 1 envelope, but need a browser refresh to gain the new presentation rules.
