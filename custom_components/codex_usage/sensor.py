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
from homeassistant.const import PERCENTAGE
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import CodexUsageConfigEntry
from .api import CodexUsageData, RateLimit, RateLimitWindow
from .const import CONF_ACCOUNT_ID
from .coordinator import CodexUsageCoordinator
from .entity import CodexUsageEntity


@dataclass(frozen=True, kw_only=True)
class CodexSensorDescription(SensorEntityDescription):
    """Describe a Codex Usage sensor."""

    value_fn: Callable[[CodexUsageData], Any]


def _secondary_pace(data: CodexUsageData) -> float | None:
    window = data.main_limit.secondary
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
        value_fn=lambda data: (
            data.main_limit.primary.used_percent if data.main_limit.primary else None
        ),
    ),
    CodexSensorDescription(
        key="five_hour_remaining",
        translation_key="five_hour_remaining",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        value_fn=lambda data: (
            data.main_limit.primary.remaining_percent if data.main_limit.primary else None
        ),
    ),
    CodexSensorDescription(
        key="five_hour_reset",
        translation_key="five_hour_reset",
        device_class=SensorDeviceClass.TIMESTAMP,
        value_fn=lambda data: (
            data.main_limit.primary.resets_at if data.main_limit.primary else None
        ),
    ),
    CodexSensorDescription(
        key="weekly_usage",
        translation_key="weekly_usage",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        value_fn=lambda data: (
            data.main_limit.secondary.used_percent if data.main_limit.secondary else None
        ),
    ),
    CodexSensorDescription(
        key="weekly_remaining",
        translation_key="weekly_remaining",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=0,
        value_fn=lambda data: (
            data.main_limit.secondary.remaining_percent if data.main_limit.secondary else None
        ),
    ),
    CodexSensorDescription(
        key="weekly_reset",
        translation_key="weekly_reset",
        device_class=SensorDeviceClass.TIMESTAMP,
        value_fn=lambda data: (
            data.main_limit.secondary.resets_at if data.main_limit.secondary else None
        ),
    ),
    CodexSensorDescription(
        key="weekly_pace",
        translation_key="weekly_pace",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        suggested_display_precision=1,
        value_fn=_secondary_pace,
    ),
    CodexSensorDescription(
        key="credit_balance",
        translation_key="credit_balance",
        native_unit_of_measurement="credits",
        value_fn=lambda data: data.credits.balance if data.credits else None,
    ),
    CodexSensorDescription(
        key="spend_used",
        translation_key="spend_used",
        native_unit_of_measurement="credits",
        value_fn=lambda data: data.spend_limit.used if data.spend_limit else None,
    ),
    CodexSensorDescription(
        key="spend_limit",
        translation_key="spend_limit",
        native_unit_of_measurement="credits",
        value_fn=lambda data: data.spend_limit.limit if data.spend_limit else None,
    ),
    CodexSensorDescription(
        key="spend_remaining",
        translation_key="spend_remaining",
        native_unit_of_measurement="credits",
        value_fn=lambda data: data.spend_limit.remaining if data.spend_limit else None,
    ),
    CodexSensorDescription(
        key="spend_usage",
        translation_key="spend_usage",
        native_unit_of_measurement=PERCENTAGE,
        state_class=SensorStateClass.MEASUREMENT,
        value_fn=lambda data: data.spend_limit.used_percent if data.spend_limit else None,
    ),
    CodexSensorDescription(
        key="spend_reset",
        translation_key="spend_reset",
        device_class=SensorDeviceClass.TIMESTAMP,
        value_fn=lambda data: data.spend_limit.resets_at if data.spend_limit else None,
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: CodexUsageConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Set up Codex Usage sensors."""
    coordinator = entry.runtime_data
    async_add_entities(CodexUsageSensor(coordinator, entry, item) for item in SENSORS)

    known: set[tuple[str, str, str]] = set()

    def discover_additional_limits() -> None:
        entities: list[CodexAdditionalLimitSensor] = []
        for limit in coordinator.data.additional_limits:
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
        return self.entity_description.value_fn(self.coordinator.data)

    @property
    def available(self) -> bool:
        return super().available and self.native_value is not None


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
        window_label = "Short window" if window_name == "primary" else "Long window"
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
                for item in self.coordinator.data.additional_limits
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
        return super().available and self.native_value is not None
