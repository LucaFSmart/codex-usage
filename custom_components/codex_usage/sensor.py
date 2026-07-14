"""Sensor platform for Codex Usage."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from typing import Any

from homeassistant.components.sensor import (
    SensorDeviceClass,
    SensorEntity,
    SensorEntityDescription,
    SensorStateClass,
)
from homeassistant.const import PERCENTAGE, UnitOfTime
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import CodexUsageConfigEntry
from .api import CodexProfileStats, CodexUsageData, RateLimit, RateLimitWindow
from .const import CONF_ACCOUNT_ID
from .coordinator import CodexUsageCoordinator
from .entity import CodexUsageEntity


@dataclass(frozen=True, kw_only=True)
class CodexSensorDescription(SensorEntityDescription):
    """Describe a Codex Usage sensor."""

    value_fn: Callable[[CodexUsageData], Any]


@dataclass(frozen=True, kw_only=True)
class CodexProfileSensorDescription(SensorEntityDescription):
    """Describe an optional aggregate profile statistics sensor."""

    value_fn: Callable[[CodexProfileStats], Any]


def _weekly_pace(data: CodexUsageData) -> float | None:
    window = data.weekly_window
    if window is None or window.resets_at is None or window.window_minutes is None:
        return None
    total = timedelta(minutes=window.window_minutes).total_seconds()
    remaining = (window.resets_at - datetime.now(UTC)).total_seconds()
    elapsed_percent = ((total - remaining) / total) * 100
    return round(window.used_percent - elapsed_percent, 1)


SENSORS: tuple[CodexSensorDescription, ...] = (
    CodexSensorDescription(
        key="plan", translation_key="plan", value_fn=lambda data: data.plan_type
    ),
    CodexSensorDescription(
        key="five_hour_usage",
        translation_key="five_hour_usage",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        value_fn=lambda data: data.five_hour_window.used_percent if data.five_hour_window else None,
    ),
    CodexSensorDescription(
        key="five_hour_remaining",
        translation_key="five_hour_remaining",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        value_fn=lambda data: (
            data.five_hour_window.remaining_percent if data.five_hour_window else None
        ),
    ),
    CodexSensorDescription(
        key="five_hour_reset",
        translation_key="five_hour_reset",
        device_class=SensorDeviceClass.TIMESTAMP,
        value_fn=lambda data: data.five_hour_window.resets_at if data.five_hour_window else None,
    ),
    CodexSensorDescription(
        key="weekly_usage",
        translation_key="weekly_usage",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        value_fn=lambda data: data.weekly_window.used_percent if data.weekly_window else None,
    ),
    CodexSensorDescription(
        key="weekly_remaining",
        translation_key="weekly_remaining",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        value_fn=lambda data: data.weekly_window.remaining_percent if data.weekly_window else None,
    ),
    CodexSensorDescription(
        key="weekly_reset",
        translation_key="weekly_reset",
        device_class=SensorDeviceClass.TIMESTAMP,
        value_fn=lambda data: data.weekly_window.resets_at if data.weekly_window else None,
    ),
    CodexSensorDescription(
        key="weekly_pace",
        translation_key="weekly_pace",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
        value_fn=_weekly_pace,
    ),
    CodexSensorDescription(
        key="available_reset_credits",
        translation_key="available_reset_credits",
        native_unit_of_measurement="resets",
        value_fn=lambda data: data.available_reset_credits,
    ),
    CodexSensorDescription(
        key="credit_balance",
        translation_key="credit_balance",
        native_unit_of_measurement="credits",
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.credits.balance if data.credits else None,
    ),
    CodexSensorDescription(
        key="spend_used",
        translation_key="spend_used",
        native_unit_of_measurement="credits",
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.spend_limit.used if data.spend_limit else None,
    ),
    CodexSensorDescription(
        key="spend_limit",
        translation_key="spend_limit",
        native_unit_of_measurement="credits",
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.spend_limit.limit if data.spend_limit else None,
    ),
    CodexSensorDescription(
        key="spend_remaining",
        translation_key="spend_remaining",
        native_unit_of_measurement="credits",
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.spend_limit.remaining if data.spend_limit else None,
    ),
    CodexSensorDescription(
        key="spend_usage",
        translation_key="spend_usage",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.spend_limit.used_percent if data.spend_limit else None,
    ),
    CodexSensorDescription(
        key="spend_reset",
        translation_key="spend_reset",
        device_class=SensorDeviceClass.TIMESTAMP,
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.spend_limit.resets_at if data.spend_limit else None,
    ),
)

PROFILE_SENSORS: tuple[CodexProfileSensorDescription, ...] = (
    CodexProfileSensorDescription(
        key="lifetime_tokens",
        translation_key="lifetime_tokens",
        native_unit_of_measurement="tokens",
        state_class=SensorStateClass.TOTAL_INCREASING,
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.lifetime_tokens,
    ),
    CodexProfileSensorDescription(
        key="peak_daily_tokens",
        translation_key="peak_daily_tokens",
        native_unit_of_measurement="tokens",
        state_class=SensorStateClass.MEASUREMENT,
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.peak_daily_tokens,
    ),
    CodexProfileSensorDescription(
        key="current_streak_days",
        translation_key="current_streak_days",
        native_unit_of_measurement=UnitOfTime.DAYS,
        state_class=SensorStateClass.MEASUREMENT,
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.current_streak_days,
    ),
    CodexProfileSensorDescription(
        key="longest_streak_days",
        translation_key="longest_streak_days",
        native_unit_of_measurement=UnitOfTime.DAYS,
        state_class=SensorStateClass.MEASUREMENT,
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.longest_streak_days,
    ),
    CodexProfileSensorDescription(
        key="total_threads",
        translation_key="total_threads",
        native_unit_of_measurement="threads",
        state_class=SensorStateClass.TOTAL_INCREASING,
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.total_threads,
    ),
    CodexProfileSensorDescription(
        key="longest_running_turn",
        translation_key="longest_running_turn",
        native_unit_of_measurement=UnitOfTime.SECONDS,
        device_class=SensorDeviceClass.DURATION,
        state_class=SensorStateClass.MEASUREMENT,
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.longest_running_turn_sec,
    ),
    CodexProfileSensorDescription(
        key="fast_mode_usage",
        translation_key="fast_mode_usage",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.fast_mode_usage_percentage,
    ),
    CodexProfileSensorDescription(
        key="total_skills_used",
        translation_key="total_skills_used",
        native_unit_of_measurement="uses",
        state_class=SensorStateClass.TOTAL_INCREASING,
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.total_skills_used,
    ),
    CodexProfileSensorDescription(
        key="unique_skills_used",
        translation_key="unique_skills_used",
        native_unit_of_measurement="skills",
        state_class=SensorStateClass.MEASUREMENT,
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.unique_skills_used,
    ),
    CodexProfileSensorDescription(
        key="most_used_reasoning_effort",
        translation_key="most_used_reasoning_effort",
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.most_used_reasoning_effort,
    ),
    CodexProfileSensorDescription(
        key="most_used_reasoning_effort_percentage",
        translation_key="most_used_reasoning_effort_percentage",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.most_used_reasoning_effort_percentage,
    ),
)


def _static_sensor_descriptions(
    data: CodexUsageData, existing_unique_ids: set[str], identity: str
) -> tuple[CodexSensorDescription, ...]:
    """Keep legacy window entities but omit unreported windows for new entries."""
    result: list[CodexSensorDescription] = []
    for description in SENSORS:
        if description.key.startswith("five_hour_"):
            reported = data.five_hour_window is not None
        elif description.key.startswith("weekly_"):
            reported = data.weekly_window is not None
        else:
            reported = True
        if reported or f"{identity}_{description.key}" in existing_unique_ids:
            result.append(description)
    return tuple(result)


def _existing_additional_keys(
    existing_unique_ids: set[str], identity: str
) -> set[tuple[str, str, str]]:
    """Recover dynamic limit entity keys from the stable legacy unique-ID shape."""
    prefix = f"{identity}_"
    result: set[tuple[str, str, str]] = set()
    for unique_id in existing_unique_ids:
        if not unique_id.startswith(prefix):
            continue
        remainder = unique_id.removeprefix(prefix)
        for window_name in ("primary", "secondary"):
            marker = f"_{window_name}_"
            if marker not in remainder:
                continue
            limit_id, metric = remainder.rsplit(marker, maxsplit=1)
            if limit_id and metric in ("usage", "remaining", "reset"):
                result.add((limit_id, window_name, metric))
            break
    return result


async def async_setup_entry(
    hass: HomeAssistant,
    entry: CodexUsageConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Codex Usage sensors."""
    coordinator = entry.runtime_data
    identity = entry.unique_id or entry.data[CONF_ACCOUNT_ID]
    registry = er.async_get(hass)
    existing_unique_ids = {
        item.unique_id for item in er.async_entries_for_config_entry(registry, entry.entry_id)
    }
    descriptions = _static_sensor_descriptions(
        coordinator.data.usage, existing_unique_ids, identity
    )
    async_add_entities(CodexUsageSensor(coordinator, entry, item) for item in descriptions)
    async_add_entities(CodexProfileSensor(coordinator, entry, item) for item in PROFILE_SENSORS)

    known = _existing_additional_keys(existing_unique_ids, identity)
    if known:
        limit_names = {
            limit.limit_id: limit.name for limit in coordinator.data.usage.additional_limits
        }
        async_add_entities(
            CodexAdditionalLimitSensor(
                coordinator,
                entry,
                limit_id,
                limit_names.get(limit_id, limit_id.replace("_", " ").title()),
                window_name,
                metric,
            )
            for limit_id, window_name, metric in sorted(known)
        )

    def discover_additional_limits() -> None:
        entities: list[CodexAdditionalLimitSensor] = []
        for limit in coordinator.data.usage.additional_limits:
            for window_name, window in (("primary", limit.primary), ("secondary", limit.secondary)):
                if window is None:
                    continue
                for metric in ("usage", "remaining", "reset"):
                    key = (limit.limit_id, window_name, metric)
                    if key not in known:
                        known.add(key)
                        entities.append(
                            CodexAdditionalLimitSensor(
                                coordinator, entry, limit.limit_id, limit.name, window_name, metric
                            )
                        )
        if entities:
            async_add_entities(entities)

    discover_additional_limits()
    entry.async_on_unload(coordinator.async_add_listener(discover_additional_limits))


class CodexUsageSensor(CodexUsageEntity, SensorEntity):
    """A standard Codex Usage sensor."""

    entity_description: CodexSensorDescription

    def __init__(
        self,
        coordinator: CodexUsageCoordinator,
        entry: CodexUsageConfigEntry,
        description: CodexSensorDescription,
    ) -> None:
        super().__init__(coordinator, entry)
        self.entity_description = description
        identity = entry.unique_id or entry.data[CONF_ACCOUNT_ID]
        self._attr_unique_id = f"{identity}_{description.key}"

    @property
    def native_value(self) -> Any:
        return self.entity_description.value_fn(self.coordinator.data.usage)

    @property
    def available(self) -> bool:
        return super().available


class CodexAdditionalLimitSensor(CodexUsageEntity, SensorEntity):
    """A dynamically discovered additional Codex limit sensor."""

    def __init__(
        self,
        coordinator: CodexUsageCoordinator,
        entry: CodexUsageConfigEntry,
        limit_id: str,
        limit_name: str,
        window_name: str,
        metric: str,
    ) -> None:
        super().__init__(coordinator, entry)
        self._limit_id = limit_id
        self._window_name = window_name
        self._metric = metric
        window = self._window()
        window_label = window.duration_label if window else "Usage window"
        metric_label = {"usage": "usage", "remaining": "remaining", "reset": "reset"}[metric]
        self._attr_name = f"{limit_name} {window_label} {metric_label}"
        identity = entry.unique_id or entry.data[CONF_ACCOUNT_ID]
        self._attr_unique_id = f"{identity}_{limit_id}_{window_name}_{metric}"
        if metric == "reset":
            self._attr_device_class = SensorDeviceClass.TIMESTAMP
        else:
            self._attr_native_unit_of_measurement = PERCENTAGE
            self._attr_state_class = SensorStateClass.MEASUREMENT
            self._attr_suggested_display_precision = 0

    def _window(self) -> RateLimitWindow | None:
        limit: RateLimit | None = next(
            (
                item
                for item in self.coordinator.data.usage.additional_limits
                if item.limit_id == self._limit_id
            ),
            None,
        )
        return getattr(limit, self._window_name) if limit else None

    @property
    def native_value(self) -> datetime | float | Decimal | None:
        window = self._window()
        if window is None:
            return None
        if self._metric == "usage":
            return window.used_percent
        if self._metric == "remaining":
            return window.remaining_percent
        return window.resets_at

    @property
    def available(self) -> bool:
        return super().available


class CodexProfileSensor(CodexUsageEntity, SensorEntity):
    """An aggregate profile statistic fetched independently from usage limits."""

    entity_description: CodexProfileSensorDescription

    def __init__(
        self,
        coordinator: CodexUsageCoordinator,
        entry: CodexUsageConfigEntry,
        description: CodexProfileSensorDescription,
    ) -> None:
        super().__init__(coordinator, entry)
        self.entity_description = description
        identity = entry.unique_id or entry.data[CONF_ACCOUNT_ID]
        self._attr_unique_id = f"{identity}_{description.key}"

    @property
    def native_value(self) -> Any:
        profile = self.coordinator.data.profile
        return self.entity_description.value_fn(profile) if profile else None

    @property
    def available(self) -> bool:
        return super().available
