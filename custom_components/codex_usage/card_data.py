"""Privacy-safe internal data surface for the bundled dashboard card."""

from __future__ import annotations

from dataclasses import asdict
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

import voluptuous as vol
from homeassistant.auth.models import User
from homeassistant.auth.permissions.const import POLICY_READ
from homeassistant.components import websocket_api
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er

from .api import RateLimit, RateLimitWindow
from .budget import UsageBudget, budget_key, current_budget
from .const import CARD_VERSION, DOMAIN
from .entry_title import safe_entry_title
from .monitoring import limit_statuses, reset_summary, restriction_summary

CARD_DATA_COMMAND = f"{DOMAIN}/card_data"
EVENT_CARD_DATA_UPDATED = f"{DOMAIN}_card_data_updated"


def _iso(value: datetime | None) -> str | None:
    return value.astimezone(UTC).isoformat() if value else None


def _decimal_text(value: Decimal | None) -> str | None:
    return str(value) if value is not None else None


def _source_payload(value: Any) -> dict[str, Any]:
    return {
        "state": value.state,
        "last_attempt": _iso(value.last_attempt),
        "last_success": _iso(value.last_success),
        "retry_at": _iso(value.retry_at),
        "error_code": value.error_code,
        "refresh_mode": value.refresh_mode,
        "expected_interval_seconds": value.expected_interval_seconds,
    }


def _limit_payload(
    limit: RateLimit,
    position: str,
    window: RateLimitWindow,
    *,
    source: str,
    entity_id: str | None,
    budget: UsageBudget | None,
) -> dict[str, Any]:
    return {
        "id": f"{limit.limit_id}:{position}:{window.duration_key}",
        "name": limit.name,
        "source": source,
        "duration_seconds": window.window_minutes * 60 if window.window_minutes else None,
        "used_percent": window.used_percent,
        "remaining_percent": window.remaining_percent,
        "resets_at": _iso(window.resets_at),
        "reached": limit.limit_reached,
        "entity_id": entity_id,
        "budget_pph": budget.budget_pph if budget else None,
        "budget_calculated_at": _iso(budget.calculated_at) if budget else None,
    }


def _limits(
    usage: Any,
    entity_ids: dict[str, str],
    identity: str | None,
    *,
    coordinator: Any,
    now: datetime,
) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    main_window_ids: set[int] = set()
    for position, window in usage.main_limit.windows:
        main_window_ids.add(id(window))
        key = {
            "five_hour": "five_hour_usage",
            "weekly": "weekly_usage",
        }.get(window.duration_key)
        if identity and key:
            unique_id = f"{identity}_{key}"
        elif identity:
            duration_id = (
                f"unknown_{position}" if window.duration_key == "unknown" else window.duration_key
            )
            unique_id = f"{identity}_codex_{duration_id}_{position}_usage"
        else:
            unique_id = None
        result.append(
            _limit_payload(
                usage.main_limit,
                position,
                window,
                source="main",
                entity_id=entity_ids.get(unique_id) if unique_id else None,
                budget=current_budget(
                    coordinator,
                    budget_key(usage.main_limit, position, window, source="main"),
                    window,
                    now=now,
                ),
            )
        )
    for limit in usage.additional_limits:
        for position, window in limit.windows:
            if id(window) in main_window_ids:
                continue
            unique_id = f"{identity}_{limit.limit_id}_{position}_usage" if identity else None
            result.append(
                _limit_payload(
                    limit,
                    position,
                    window,
                    source="additional",
                    entity_id=entity_ids.get(unique_id) if unique_id else None,
                    budget=current_budget(
                        coordinator,
                        budget_key(limit, position, window, source="additional"),
                        window,
                        now=now,
                    ),
                )
            )
    return result


def _active_entity_ids(hass: HomeAssistant) -> dict[str, str]:
    """Return only enabled, currently loaded Codex Usage entities."""
    try:
        registry = er.async_get(hass)
        states = hass.states
    except AttributeError, KeyError, TypeError:
        return {}
    return {
        item.unique_id: item.entity_id
        for item in registry.entities.values()
        if item.platform == DOMAIN
        and item.disabled_by is None
        and states.get(item.entity_id) is not None
    }


def _user_can_read_entry(user: User, registry: Any, entry_id: str) -> bool:
    """Require access to every entity before returning an all-or-nothing account payload."""
    if user.is_admin or user.permissions.access_all_entities(POLICY_READ):
        return True
    try:
        entries = [
            item
            for item in registry.entities.values()
            if item.platform == DOMAIN and item.config_entry_id == entry_id
        ]
    except AttributeError, TypeError:
        return False
    return bool(entries) and all(
        user.permissions.check_entity(item.entity_id, POLICY_READ) for item in entries
    )


def _account_payload(
    entry: Any, coordinator: Any, entity_ids: dict[str, str], now: datetime
) -> dict[str, Any]:
    data = coordinator.data
    usage = data.usage
    credits = usage.credits
    spend = usage.spend_limit
    reset = data.reset_credits
    normalized_reset = getattr(data, "reset_summary", None) or reset_summary(
        usage,
        reset,
        now=now,
        usage_updated_at=getattr(coordinator, "last_success", None),
        details_updated_at=getattr(coordinator, "reset_last_success", now),
    )
    restriction = restriction_summary(usage)
    return {
        "id": entry.entry_id,
        "name": safe_entry_title(entry),
        "plan": usage.plan_type,
        "available": bool(coordinator.last_update_success),
        "updated_at": _iso(getattr(coordinator, "last_success", None)),
        "blocker": usage.blocker_reason,
        "limit_statuses": [
            {
                "id": item.id,
                "name": item.name,
                "source": item.source,
                "allowed": item.allowed,
                "reached": item.reached,
            }
            for item in limit_statuses(usage)
        ],
        "limit_summary": {
            "reached": restriction.reached,
            "reason": restriction.reason,
            "affected_limits": list(restriction.affected_limits),
            "affected_limits_truncated": restriction.affected_limits_truncated,
            **(
                {
                    "fallback_available": restriction.fallback_available,
                    "fallback_limit_id": restriction.fallback_limit_id,
                }
                if restriction.fallback_limit_id
                else {}
            ),
        },
        "sources": {
            key: _source_payload(value)
            for key, value in getattr(coordinator, "sources", {}).items()
        },
        "limits": _limits(
            usage,
            entity_ids,
            entry.unique_id or entry.data.get("account_id"),
            coordinator=coordinator,
            now=now,
        ),
        "credits": (
            {
                "balance": _decimal_text(credits.balance),
                "has_credits": credits.has_credits,
                "unlimited": credits.unlimited,
                "overage_reached": credits.overage_limit_reached,
            }
            if credits
            else None
        ),
        "spend": (
            {
                "source": spend.source,
                "limit": _decimal_text(spend.limit),
                "used": _decimal_text(spend.used),
                "remaining": _decimal_text(spend.remaining),
                "used_percent": spend.used_percent,
                "remaining_percent": spend.remaining_percent,
                "resets_at": _iso(spend.resets_at),
                "reached": usage.spend_limit_reached,
            }
            if spend
            else None
        ),
        "reset_credits": (
            {
                "available_count": normalized_reset.available_count,
                "total_earned": normalized_reset.total_earned,
                "next_expiry": _iso(normalized_reset.next_expiry),
                "count_source": normalized_reset.count_source,
                "count_updated_at": _iso(normalized_reset.count_updated_at),
                "details_consistent": normalized_reset.details_consistent,
                "details_present": normalized_reset.details_present,
                "details_updated_at": _iso(normalized_reset.details_updated_at),
            }
            if normalized_reset.available_count is not None
            or normalized_reset.total_earned is not None
            or normalized_reset.details_present
            else None
        ),
        "profile": asdict(data.profile) if data.profile else None,
    }


def build_card_snapshot(hass: HomeAssistant, user: User) -> dict[str, Any]:
    """Build a normalized snapshot without credentials or backend identities."""
    entries = hass.data.get(DOMAIN, {}).get("entries", {})
    entity_ids = _active_entity_ids(hass)
    try:
        registry = er.async_get(hass)
    except AttributeError, KeyError, TypeError:
        registry = None
    now = datetime.now(UTC)
    return {
        "schema_version": 1,
        "integration_version": CARD_VERSION,
        "generated_at": now.isoformat(),
        "accounts": [
            _account_payload(entry, coordinator, entity_ids, now)
            for entry, coordinator in entries.values()
            if coordinator.data is not None and _user_can_read_entry(user, registry, entry.entry_id)
        ],
    }


@websocket_api.websocket_command({vol.Required("type"): CARD_DATA_COMMAND})
@callback
def websocket_card_data(
    hass: HomeAssistant,
    connection: websocket_api.ActiveConnection,
    msg: dict[str, Any],
) -> None:
    """Return the card snapshot to an authenticated Home Assistant user."""
    connection.send_result(msg["id"], build_card_snapshot(hass, connection.user))


@callback
def async_register_card_data(hass: HomeAssistant) -> None:
    """Register the internal read-only card command once."""
    websocket_api.async_register_command(hass, websocket_card_data)
