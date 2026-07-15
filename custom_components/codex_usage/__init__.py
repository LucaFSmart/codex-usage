"""Codex Usage Home Assistant integration."""

from __future__ import annotations

import asyncio
import logging
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import aiohttp_client
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .api import CodexApiClient
from .card_data import EVENT_CARD_DATA_UPDATED, async_register_card_data
from .card_registration import CodexUsageCardRegistration
from .const import (
    CONF_EMAIL,
    CONF_PLAN_TYPE,
    CONF_UPDATE_INTERVAL,
    DEFAULT_UPDATE_INTERVAL,
    DOMAIN,
    PLATFORMS,
)
from .coordinator import CodexUsageCoordinator
from .entry_title import has_legacy_generated_title

type CodexUsageConfigEntry = ConfigEntry[CodexUsageCoordinator]

_LOGGER = logging.getLogger(__name__)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the bundled card's internal read-only data command."""
    hass.data.setdefault(DOMAIN, {}).setdefault("entries", {})
    async_register_card_data(hass)
    return True


async def async_migrate_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Remove legacy identity claims while preserving stable entry identity."""
    if entry.version >= 3:
        return True
    data = dict(entry.data)
    data.pop(CONF_EMAIL, None)
    data.pop(CONF_PLAN_TYPE, None)
    changes: dict[str, Any] = {"data": data, "version": 3}
    if has_legacy_generated_title(entry):
        changes["title"] = "Codex Usage"
    hass.config_entries.async_update_entry(entry, **changes)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: CodexUsageConfigEntry) -> bool:
    """Set up Codex Usage from a config entry."""
    client = CodexApiClient(aiohttp_client.async_get_clientsession(hass))
    coordinator = CodexUsageCoordinator(hass, entry, client)
    await coordinator.async_config_entry_first_refresh()
    entry.runtime_data = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    domain_data: dict[str, Any] = hass.data.setdefault(DOMAIN, {})
    domain_data.setdefault("entries", {})[entry.entry_id] = (entry, coordinator)
    entry.async_on_unload(
        coordinator.async_add_listener(lambda: hass.bus.async_fire(EVENT_CARD_DATA_UPDATED))
    )
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))

    domain_data = hass.data.setdefault(DOMAIN, {})
    lifecycle_lock = domain_data.setdefault("lifecycle_lock", asyncio.Lock())
    async with lifecycle_lock:
        loaded_entry_ids: set[str] = domain_data.setdefault("loaded_entry_ids", set())
        registration = domain_data.get("registration")
        if registration is None:
            registration = domain_data["registration"] = CodexUsageCardRegistration(hass)
        loaded_entry_ids.add(entry.entry_id)
        if not registration.is_registered:
            try:
                await registration.async_register()
            except Exception:  # noqa: BLE001
                _LOGGER.warning("Unable to register the Codex Usage Lovelace card", exc_info=True)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: CodexUsageConfigEntry) -> bool:
    """Unload a Codex Usage config entry."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if not unloaded:
        return False

    domain_data: dict[str, Any] = hass.data.setdefault(DOMAIN, {})
    domain_data.setdefault("entries", {}).pop(entry.entry_id, None)
    lifecycle_lock = domain_data.setdefault("lifecycle_lock", asyncio.Lock())
    async with lifecycle_lock:
        loaded_entry_ids: set[str] = domain_data.setdefault("loaded_entry_ids", set())
        loaded_entry_ids.discard(entry.entry_id)
        registration = domain_data.get("registration")
        if not loaded_entry_ids and registration is not None:
            try:
                await registration.async_unregister()
            except Exception:  # noqa: BLE001
                _LOGGER.warning("Unable to unregister the Codex Usage Lovelace card", exc_info=True)
    return True


async def _async_update_listener(hass: HomeAssistant, entry: CodexUsageConfigEntry) -> None:
    """Apply an updated polling interval without reloading the integration."""
    interval = entry.options.get(CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL)
    entry.runtime_data.update_interval = timedelta(seconds=interval)
