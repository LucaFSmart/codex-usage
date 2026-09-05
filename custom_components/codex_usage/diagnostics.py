"""Diagnostics support for Codex Usage."""

from __future__ import annotations

from typing import Any

from homeassistant.core import HomeAssistant

from . import CodexUsageConfigEntry
from .const import CONF_EXPIRES_AT, CONF_FEDRAMP, CONF_UPDATE_INTERVAL
from .monitoring import restriction_summary


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: CodexUsageConfigEntry
) -> dict[str, Any]:
    """Return token-free diagnostics for a config entry."""
    coordinator = entry.runtime_data
    return {
        "entry": {
            key: entry.data[key] for key in (CONF_EXPIRES_AT, CONF_FEDRAMP) if key in entry.data
        },
        "options": (
            {CONF_UPDATE_INTERVAL: entry.options[CONF_UPDATE_INTERVAL]}
            if CONF_UPDATE_INTERVAL in entry.options
            else {}
        ),
        "last_update_success": coordinator.last_update_success,
        "profile_available": coordinator.profile_available,
        "profile_last_success": coordinator.profile_last_success,
        "profile_last_error": coordinator.profile_last_error,
        "reset_available": coordinator.reset_available,
        "reset_last_success": coordinator.reset_last_success,
        "reset_last_error": coordinator.reset_last_error,
        "sources": {
            key: {
                "state": value.state,
                "last_attempt": value.last_attempt,
                "last_success": value.last_success,
                "retry_at": value.retry_at,
                "error_code": value.error_code,
                "refresh_mode": value.refresh_mode,
                "expected_interval_seconds": value.expected_interval_seconds,
            }
            for key, value in getattr(coordinator, "sources", {}).items()
        },
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
                    "source": "main" if limit is usage.main_limit else "additional",
                    "duration_minutes": window.window_minutes,
                    "used_percent": window.used_percent,
                    "resets_at": window.resets_at,
                    "reached": limit.limit_reached,
                }
            )
    reset_credits = data.reset_credits
    restriction = restriction_summary(usage)
    return {
        "plan": usage.plan_type,
        "limits": limits,
        "blocker_reason": usage.blocker_reason,
        "credit_available": usage.credits.has_credits if usage.credits else None,
        "spend_limit_reached": usage.spend_limit_reached,
        "reset_credit_count": reset_credits.available_count if reset_credits else None,
        "limit_summary": {
            "reached": restriction.reached,
            "reason": restriction.reason,
            "affected_limit_count": len(restriction.affected_limits),
            "affected_limits_truncated": restriction.affected_limits_truncated,
        },
        "duplicate_limit_ids": usage.duplicate_limit_ids,
        "conflicting_windows": usage.conflicting_windows,
        "reset_details_present": reset_credits.details_present if reset_credits else False,
        "reset_malformed_rows": reset_credits.malformed_rows if reset_credits else 0,
    }
