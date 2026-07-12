"""Validate the copyable Lovelace dashboard examples."""

from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).parents[1]
DASHBOARDS = ROOT / "dashboards"

CARD_VARIABLES = {
    "codex_usage_compact.yaml": {
        "plan_entity",
        "five_hour_usage_entity",
        "five_hour_reset_entity",
        "weekly_usage_entity",
        "weekly_reset_entity",
        "rate_limit_entity",
    },
    "codex_usage_detailed.yaml": {
        "plan_entity",
        "five_hour_usage_entity",
        "five_hour_remaining_entity",
        "five_hour_reset_entity",
        "weekly_usage_entity",
        "weekly_remaining_entity",
        "weekly_reset_entity",
        "weekly_pace_entity",
        "available_reset_credits_entity",
        "credit_balance_entity",
        "spend_used_entity",
        "spend_limit_entity",
        "spend_remaining_entity",
        "spend_usage_entity",
        "spend_reset_entity",
        "lifetime_tokens_entity",
        "total_threads_entity",
        "current_streak_entity",
        "fast_mode_usage_entity",
        "reasoning_effort_entity",
        "reasoning_effort_share_entity",
        "rate_limit_entity",
        "credits_available_entity",
        "unlimited_credits_entity",
        "credit_overage_limit_reached_entity",
        "spend_limit_reached_entity",
    },
}


@pytest.mark.parametrize(("filename", "expected_variables"), CARD_VARIABLES.items())
def test_button_card_examples_are_self_contained(
    filename: str, expected_variables: set[str]
) -> None:
    """Each example is one card whose entity IDs are easy to replace."""
    path = DASHBOARDS / filename
    card = yaml.safe_load(path.read_text(encoding="utf-8"))

    assert card["type"] == "custom:button-card"
    assert set(card["variables"]) == expected_variables
    assert "triggers_update" not in card

    for entity_id in card["variables"].values():
        assert entity_id.startswith(("sensor.codex_usage_", "binary_sensor.codex_usage_"))


@pytest.mark.parametrize("filename", CARD_VARIABLES)
def test_button_card_examples_have_no_installation_specific_content(filename: str) -> None:
    """Published examples must not contain personal or local-only identifiers."""
    content = (DASHBOARDS / filename).read_text(encoding="utf-8")

    for prohibited in (
        "Luca",
        "info_codex_usage",
        "update.",
        "url_path",
        "button_card_templates",
        "triggers_update",
    ):
        assert prohibited not in content
