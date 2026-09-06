# Usage warnings

The optional [warning Blueprint](../blueprints/automation/codex_usage/usage_warning.yaml) warns at a configured consumed-usage percentage and remembers whether it already warned. It is not installed or activated automatically by HACS.

## Setup

1. Import the Blueprint into Home Assistant, or copy the YAML to `blueprints/automation/codex_usage/usage_warning.yaml` in your HA configuration and reload Blueprints.
2. Create a dedicated Toggle (`input_boolean`) helper. Do not force an `initial` value in YAML: Home Assistant restores its saved state on restart.
3. Create an automation from the Blueprint. Select a consumed-usage sensor with `%` unit, the helper, and your desired action.
4. Leave the default threshold 80 and recovery margin 5, or configure your own values.

Each automation needs its own helper, including separate weekly and five-hour warnings. A remaining-percentage sensor has the opposite meaning and must not be selected. Import from a version available in the repository; a local candidate is not a published import URL.

## Behavior

At 80% with the helper off, the action runs and then the helper turns on. It stays on at 90% or 78%. At 75% or lower it turns off, allowing the next crossing to warn again. The recovery threshold is clamped to zero. State changes, Home Assistant startup and a five-minute reconciliation tick evaluate the rule; `mode: single` prevents overlapping runs.

Unknown, unavailable, non-finite, out-of-range or non-percentage readings do not warn or clear the helper. A changed reset date or available-reset count alone does not rearm it. Actual observed usage recovery does, regardless of whether it followed an automatic, paid or banked reset.

If your action fails, the helper remains off, so a later evaluation may retry. There is a crash gap between a successful action and the helper update; external delivery is not guaranteed exactly once. If usage recovers and becomes high again entirely while HA is stopped or between polls, the automation cannot observe that recovery. Turn the helper off manually when you deliberately want to rearm it.

The Blueprint has no preset recipient or external service. Local tests use a counting action. Test your own chosen action through Home Assistant according to its service requirements.

OpenAI distinguishes [banked allowance resets](https://help.openai.com/en/articles/20001498-how-banked-codex-resets-work) from [paid instant resets](https://help.openai.com/en/articles/20001507-paid-weekly-work-and-codex-rate-limit-resets). The integration observes returned usage; it never purchases, redeems or infers a reset transaction.
