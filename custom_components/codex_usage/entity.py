"""Shared entities for Codex Usage."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from . import CodexUsageConfigEntry
from .const import CONF_ACCOUNT_ID, DOMAIN
from .coordinator import CodexUsageCoordinator


class CodexUsageEntity(CoordinatorEntity[CodexUsageCoordinator]):
    """Base class for Codex Usage entities."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: CodexUsageCoordinator, entry: CodexUsageConfigEntry) -> None:
        super().__init__(coordinator)
        account_id = entry.data[CONF_ACCOUNT_ID]
        identity = entry.unique_id or account_id
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, identity)},
            name=entry.title or "Codex Usage",
            entry_type=DeviceEntryType.SERVICE,
            manufacturer="OpenAI",
        )
