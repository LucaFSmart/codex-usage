"""Binary sensor platform for Codex Usage."""

from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass

from homeassistant.components.binary_sensor import (
    BinarySensorEntity,
    BinarySensorEntityDescription,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import CodexUsageConfigEntry
from .api import CodexUsageData
from .const import CONF_ACCOUNT_ID
from .coordinator import CodexUsageCoordinator
from .entity import CodexUsageEntity
from .monitoring import restriction_summary


@dataclass(frozen=True, kw_only=True)
class CodexBinarySensorDescription(BinarySensorEntityDescription):
    value_fn: Callable[[CodexUsageData], bool | None]


def _limit_reached(data: CodexUsageData) -> bool | None:
    """Return an explicit limit state without inventing data when absent."""
    return restriction_summary(data).reached


BINARY_SENSORS: tuple[CodexBinarySensorDescription, ...] = (
    CodexBinarySensorDescription(
        key="limit_reached",
        translation_key="limit_reached",
        value_fn=_limit_reached,
    ),
    CodexBinarySensorDescription(
        key="credits_available",
        translation_key="credits_available",
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.credits.has_credits if data.credits else None,
    ),
    CodexBinarySensorDescription(
        key="credits_unlimited",
        translation_key="credits_unlimited",
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.credits.unlimited if data.credits else None,
    ),
    CodexBinarySensorDescription(
        key="credits_overage_limit_reached",
        translation_key="credits_overage_limit_reached",
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.credits.overage_limit_reached if data.credits else None,
    ),
    CodexBinarySensorDescription(
        key="spend_limit_reached",
        translation_key="spend_limit_reached",
        entity_registry_enabled_default=False,
        value_fn=lambda data: data.spend_limit_reached,
    ),
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: CodexUsageConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator = entry.runtime_data
    async_add_entities(
        CodexUsageBinarySensor(coordinator, entry, description) for description in BINARY_SENSORS
    )


class CodexUsageBinarySensor(CodexUsageEntity, BinarySensorEntity):
    entity_description: CodexBinarySensorDescription

    def __init__(
        self,
        coordinator: CodexUsageCoordinator,
        entry: CodexUsageConfigEntry,
        description: CodexBinarySensorDescription,
    ) -> None:
        super().__init__(coordinator, entry)
        self.entity_description = description
        identity = entry.unique_id or entry.data[CONF_ACCOUNT_ID]
        self._attr_unique_id = f"{identity}_{description.key}"

    @property
    def is_on(self) -> bool | None:
        return self.entity_description.value_fn(self.coordinator.data.usage)

    @property
    def extra_state_attributes(self) -> dict[str, object] | None:
        if self.entity_description.key != "limit_reached":
            return None
        value = restriction_summary(self.coordinator.data.usage)
        return {
            "reason": value.reason,
            "affected_limits": list(value.affected_limits),
            "affected_limits_truncated": value.affected_limits_truncated,
        }

    @property
    def available(self) -> bool:
        return super().available
