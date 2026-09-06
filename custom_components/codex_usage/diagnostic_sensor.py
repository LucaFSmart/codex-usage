"""Diagnostic timestamp sensors for independently refreshed sources."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime

from homeassistant.components.sensor import SensorDeviceClass, SensorEntity, SensorEntityDescription
from homeassistant.helpers.entity import EntityCategory

from . import CodexUsageConfigEntry
from .const import CONF_ACCOUNT_ID
from .coordinator import CodexUsageCoordinator
from .entity import CodexUsageEntity


@dataclass(frozen=True, kw_only=True)
class CodexSourceTimestampDescription(SensorEntityDescription):
    """Describe the last successful response for one data source."""

    source: str


SOURCE_TIMESTAMP_SENSORS: tuple[CodexSourceTimestampDescription, ...] = tuple(
    CodexSourceTimestampDescription(
        key=f"{source}_last_success",
        translation_key=f"{source}_last_success",
        source=source,
        device_class=SensorDeviceClass.TIMESTAMP,
        entity_category=EntityCategory.DIAGNOSTIC,
        entity_registry_enabled_default=False,
    )
    for source in ("usage", "profile", "reset_details", "workspace_discovery")
)


def source_timestamp_entities(
    coordinator: CodexUsageCoordinator, entry: CodexUsageConfigEntry
) -> list[CodexSourceTimestampSensor]:
    """Create the four fixed diagnostic source timestamps."""
    return [
        CodexSourceTimestampSensor(coordinator, entry, item) for item in SOURCE_TIMESTAMP_SENSORS
    ]


class CodexSourceTimestampSensor(CodexUsageEntity, SensorEntity):
    """Expose a source timestamp even while the core coordinator is unavailable."""

    entity_description: CodexSourceTimestampDescription

    def __init__(
        self,
        coordinator: CodexUsageCoordinator,
        entry: CodexUsageConfigEntry,
        description: CodexSourceTimestampDescription,
    ) -> None:
        super().__init__(coordinator, entry)
        self.entity_description = description
        identity = entry.unique_id or entry.data[CONF_ACCOUNT_ID]
        self._attr_unique_id = f"{identity}_{description.key}"

    @property
    def native_value(self) -> datetime | None:
        source = getattr(self.coordinator, "sources", {}).get(self.entity_description.source)
        return source.last_success if source is not None else None

    @property
    def available(self) -> bool:
        return True
