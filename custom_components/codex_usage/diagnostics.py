"""Diagnostics support for Codex Usage."""

from __future__ import annotations

from dataclasses import asdict
from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.core import HomeAssistant

from . import CodexUsageConfigEntry
from .const import CONF_ACCESS_TOKEN, CONF_ID_TOKEN, CONF_REFRESH_TOKEN

TO_REDACT = {
    CONF_ACCESS_TOKEN,
    CONF_REFRESH_TOKEN,
    CONF_ID_TOKEN,
    "account_id",
    "user_id",
    "email",
}


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: CodexUsageConfigEntry
) -> dict[str, Any]:
    """Return token-free diagnostics for a config entry."""
    return {
        "entry": async_redact_data(dict(entry.data), TO_REDACT),
        "options": dict(entry.options),
        "last_update_success": entry.runtime_data.last_update_success,
        "data": asdict(entry.runtime_data.data) if entry.runtime_data.data else None,
    }
