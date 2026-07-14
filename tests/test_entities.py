"""Tests for entity availability and defaults."""

from types import SimpleNamespace

from custom_components.codex_usage.api import parse_usage
from custom_components.codex_usage.binary_sensor import BINARY_SENSORS
from custom_components.codex_usage.sensor import (
    PROFILE_SENSORS,
    SENSORS,
    CodexUsageSensor,
    _existing_additional_keys,
    _static_sensor_descriptions,
)


def test_missing_optional_value_is_unknown_without_making_entity_unavailable() -> None:
    descriptions = {description.key: description for description in SENSORS}
    entity = object.__new__(CodexUsageSensor)
    entity.coordinator = SimpleNamespace(
        last_update_success=True,
        data=SimpleNamespace(usage=parse_usage({"plan_type": "plus"})),
    )
    entity.entity_description = descriptions["five_hour_usage"]

    assert entity.native_value is None
    assert entity.available is True


def test_optional_detail_entities_are_disabled_by_default() -> None:
    sensors = {description.key: description for description in SENSORS}
    binary_sensors = {description.key: description for description in BINARY_SENSORS}

    for key in ("credit_balance", "spend_used", "spend_limit", "spend_remaining", "spend_usage"):
        assert sensors[key].entity_registry_enabled_default is False
    assert all(
        description.entity_registry_enabled_default is False for description in PROFILE_SENSORS
    )
    for key in (
        "credits_available",
        "credits_unlimited",
        "credits_overage_limit_reached",
        "spend_limit_reached",
    ):
        assert binary_sensors[key].entity_registry_enabled_default is False

    assert sensors["weekly_usage"].entity_registry_enabled_default is True
    assert binary_sensors["limit_reached"].entity_registry_enabled_default is True


def test_new_entries_create_only_reported_static_limit_windows() -> None:
    usage = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 20,
                    "limit_window_seconds": 604_800,
                }
            }
        }
    )

    keys = {item.key for item in _static_sensor_descriptions(usage, set(), "identity")}

    assert "weekly_usage" in keys
    assert "five_hour_usage" not in keys


def test_existing_registry_window_entities_are_preserved() -> None:
    usage = parse_usage({"rate_limit": None})

    keys = {
        item.key
        for item in _static_sensor_descriptions(usage, {"identity_five_hour_usage"}, "identity")
    }

    assert "five_hour_usage" in keys


def test_existing_dynamic_limit_entities_are_recovered_from_unique_ids() -> None:
    keys = _existing_additional_keys(
        {
            "identity_code_review_primary_usage",
            "identity_image_generation_secondary_reset",
            "identity_weekly_usage",
            "other_code_review_primary_usage",
        },
        "identity",
    )

    assert keys == {
        ("code_review", "primary", "usage"),
        ("image_generation", "secondary", "reset"),
    }
