"""Shared entities for Codex Usage."""

from __future__ import annotations

from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from . import CodexUsageConfigEntry
from .const import CONF_ACCOUNT_ID, DOMAIN
from .coordinator import CodexUsageCoordinator
from .entry_title import safe_entry_title


def codex_device_info(entry: CodexUsageConfigEntry) -> DeviceInfo:
    """Return the device identity shared by all sensors of this account."""
    identity = entry.unique_id or entry.data[CONF_ACCOUNT_ID]
    return DeviceInfo(
        identifiers={(DOMAIN, identity)},
        name=safe_entry_title(entry),
        entry_type=DeviceEntryType.SERVICE,
        manufacturer="OpenAI",
    )


class CodexUsageEntity(CoordinatorEntity[CodexUsageCoordinator]):
    """Base class for Codex Usage entities."""

    _attr_has_entity_name = True

    def __init__(self, coordinator: CodexUsageCoordinator, entry: CodexUsageConfigEntry) -> None:
        super().__init__(coordinator)
        self._attr_device_info = codex_device_info(entry)
