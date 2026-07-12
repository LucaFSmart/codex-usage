"""Codex Usage Home Assistant integration."""

from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers import aiohttp_client

from .api import CodexApiClient
from .card_registration import CodexUsageCardRegistration
from .const import CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL, DOMAIN, PLATFORMS
from .coordinator import CodexUsageCoordinator

type CodexUsageConfigEntry = ConfigEntry[CodexUsageCoordinator]

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(hass: HomeAssistant, entry: CodexUsageConfigEntry) -> bool:
    """Set up Codex Usage from a config entry."""
    client = CodexApiClient(aiohttp_client.async_get_clientsession(hass))
    coordinator = CodexUsageCoordinator(hass, entry, client)
    await coordinator.async_config_entry_first_refresh()
    entry.runtime_data = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    entry.async_on_unload(entry.add_update_listener(_async_update_listener))

    domain_data: dict[str, Any] = hass.data.setdefault(DOMAIN, {})
    loaded_entry_ids: set[str] = domain_data.setdefault("loaded_entry_ids", set())
    registration = domain_data.get("registration")
    if registration is None:
        registration = domain_data["registration"] = CodexUsageCardRegistration(hass)
    loaded_entry_ids.add(entry.entry_id)
    if len(loaded_entry_ids) == 1:
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

    domain_data = hass.data.get(DOMAIN, {})
    loaded_entry_ids = domain_data.get("loaded_entry_ids", set())
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
