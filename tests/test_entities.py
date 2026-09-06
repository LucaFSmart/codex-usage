"""Tests for entity availability and defaults."""

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch

from homeassistant.components.sensor import SensorDeviceClass, SensorStateClass

from custom_components.codex_usage.api import parse_usage
from custom_components.codex_usage.binary_sensor import BINARY_SENSORS
from custom_components.codex_usage.entity import CodexUsageEntity
from custom_components.codex_usage.monitoring import SourceState
from custom_components.codex_usage.sensor import (
    PROFILE_SENSORS,
    SENSORS,
    CodexAdditionalLimitSensor,
    CodexUsageSensor,
    _existing_additional_keys,
    _static_sensor_descriptions,
    _weekly_pace,
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


def test_reset_sensor_reads_the_shared_coordinator_summary() -> None:
    descriptions = {description.key: description for description in SENSORS}
    entity = object.__new__(CodexUsageSensor)
    entity.coordinator = SimpleNamespace(
        data=SimpleNamespace(
            usage=parse_usage({"rate_limit_reset_credits": {"available_count": 4}}),
            reset_summary=SimpleNamespace(available_count=4),
        )
    )
    entity.entity_description = descriptions["available_reset_credits"]
    assert entity.native_value == 4


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
            "identity_feature_primary_name_secondary_budget",
        },
        "identity",
    )

    assert keys == {
        ("code_review", "primary", "usage"),
        ("image_generation", "secondary", "reset"),
        ("feature_primary_name", "secondary", "budget"),
    }


def test_profile_state_classes_match_recorder_targets() -> None:
    values = {item.key: item.state_class for item in PROFILE_SENSORS}
    assert values["current_streak_days"] is SensorStateClass.MEASUREMENT
    for key in ("lifetime_tokens", "total_threads", "total_skills_used", "unique_skills_used"):
        assert values[key] is SensorStateClass.TOTAL
    for key in (
        "peak_daily_tokens",
        "longest_streak_days",
        "longest_running_turn",
        "fast_mode_usage",
        "most_used_reasoning_effort_percentage",
    ):
        assert values[key] is None


def test_dynamic_limit_name_uses_translation_key_and_neutral_duration_placeholder() -> None:
    usage = parse_usage(
        {
            "additional_rate_limits": [
                {
                    "metered_feature": "image_generation",
                    "limit_name": "Images",
                    "rate_limit": {
                        "primary_window": {
                            "used_percent": 20,
                            "limit_window_seconds": 5400,
                        }
                    },
                }
            ]
        }
    )
    coordinator = SimpleNamespace(data=SimpleNamespace(usage=usage))
    entry = SimpleNamespace(unique_id="identity", data={"account_id": "account"})

    def initialize(entity, coordinator, entry):
        entity.coordinator = coordinator

    with patch.object(CodexUsageEntity, "__init__", new=initialize):
        entity = CodexAdditionalLimitSensor(
            coordinator, entry, "image_generation", "Images", "primary", "usage"
        )
    assert entity._attr_translation_key == "dynamic_limit_usage"
    assert entity._attr_translation_placeholders == {"limit_name": "Images", "duration": "90 min"}


def test_weekly_pace_is_unknown_when_reset_is_outside_window() -> None:
    now = datetime(2026, 7, 15, 8, 0, tzinfo=UTC)
    data = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 20,
                    "limit_window_seconds": 604_800,
                    "reset_at": (now + timedelta(days=8)).timestamp(),
                }
            }
        }
    )

    with patch("custom_components.codex_usage.sensor.datetime") as datetime_mock:
        datetime_mock.now.return_value = now
        assert _weekly_pace(data) is None


def test_budget_entities_are_disabled_diagnostics_without_state_class() -> None:
    descriptions = {description.key: description for description in SENSORS}
    for key in ("five_hour_budget", "weekly_budget"):
        description = descriptions[key]
        assert description.entity_registry_enabled_default is False
        assert description.native_unit_of_measurement == "pp/h"
        assert description.state_class is None
        assert description.device_class is None


def test_budget_sensor_uses_cached_observation_until_it_becomes_invalid() -> None:
    from custom_components.codex_usage.budget import UsageBudget

    descriptions = {description.key: description for description in SENSORS}
    observed_at = datetime(2026, 9, 5, 12, tzinfo=UTC)
    usage = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 82,
                    "limit_window_seconds": 604_800,
                    "reset_at": (observed_at + timedelta(hours=72)).timestamp(),
                }
            }
        }
    )
    entity = object.__new__(CodexUsageSensor)
    entity.coordinator = SimpleNamespace(
        last_update_success=True,
        last_success=observed_at,
        update_interval=timedelta(minutes=5),
        data=SimpleNamespace(
            usage=usage,
            budgets={"weekly": UsageBudget(123.0, observed_at)},
        ),
    )
    entity.entity_description = descriptions["weekly_budget"]

    with patch("custom_components.codex_usage.sensor.datetime") as datetime_mock:
        datetime_mock.now.return_value = observed_at + timedelta(minutes=10)
        assert entity.native_value == 123.0
        datetime_mock.now.return_value = observed_at + timedelta(hours=73)
        assert entity.native_value is None
    entity.coordinator.last_update_success = False
    assert entity.native_value is None


def test_source_timestamps_remain_available_after_core_failure() -> None:
    from custom_components.codex_usage.diagnostic_sensor import (
        SOURCE_TIMESTAMP_SENSORS,
        CodexSourceTimestampSensor,
    )

    successful = datetime(2026, 9, 5, 12, tzinfo=UTC)
    descriptions = {item.key: item for item in SOURCE_TIMESTAMP_SENSORS}
    assert set(descriptions) == {
        "usage_last_success",
        "profile_last_success",
        "reset_details_last_success",
        "workspace_discovery_last_success",
    }
    assert all(item.entity_registry_enabled_default is False for item in descriptions.values())
    assert all(item.device_class is SensorDeviceClass.TIMESTAMP for item in descriptions.values())
    coordinator = SimpleNamespace(
        last_update_success=False,
        sources={"usage": SourceState("error", last_success=successful)},
    )
    entity = object.__new__(CodexSourceTimestampSensor)
    entity.coordinator = coordinator
    entity.entity_description = descriptions["usage_last_success"]

    assert entity.native_value == successful
    assert entity.available is True
