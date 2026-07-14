"""Diagnostics support for Codex Usage."""

from __future__ import annotations

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
    coordinator = entry.runtime_data
    return {
        "entry": async_redact_data(dict(entry.data), TO_REDACT),
        "options": dict(entry.options),
        "last_update_success": coordinator.last_update_success,
        "profile_available": coordinator.profile_available,
        "profile_last_success": coordinator.profile_last_success,
        "profile_last_error": coordinator.profile_last_error,
        "reset_available": coordinator.reset_available,
        "reset_last_success": coordinator.reset_last_success,
        "reset_last_error": coordinator.reset_last_error,
        "data": _safe_data(coordinator.data) if coordinator.data else None,
    }


def _safe_data(data: Any) -> dict[str, Any]:
    """Return an allowlisted diagnostic summary without private backend records."""
    usage = data.usage
    limits: list[dict[str, Any]] = []
    for limit in (usage.main_limit, *usage.additional_limits):
        for _, window in limit.windows:
            limits.append(
                {
                    "id": limit.limit_id,
                    "name": limit.name,
                    "duration_minutes": window.window_minutes,
                    "used_percent": window.used_percent,
                    "resets_at": window.resets_at,
                    "reached": limit.limit_reached,
                }
            )
    reset_credits = data.reset_credits
    return {
        "plan": usage.plan_type,
        "limits": limits,
        "blocker_reason": usage.blocker_reason,
        "credit_available": usage.credits.has_credits if usage.credits else None,
        "spend_limit_reached": usage.spend_limit_reached,
        "reset_credit_count": reset_credits.available_count if reset_credits else None,
    }
