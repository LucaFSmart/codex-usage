"""Pure allocation budgets, expressed in percentage points per hour."""

from dataclasses import dataclass
from datetime import datetime
from math import isfinite
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .api import CodexUsageData, RateLimit, RateLimitWindow


@dataclass(frozen=True, slots=True)
class UsageBudget:
    """One canonical budget observed with a successful usage response."""

    budget_pph: float
    calculated_at: datetime


def usage_budget(
    *,
    remaining_percent: float | None,
    window_minutes: int | None,
    resets_at: datetime | None,
    now: datetime,
    last_success: datetime | None,
    update_interval_seconds: float,
    core_available: bool,
) -> float | None:
    """Allocate remaining points over the observed time until the next reset.

    Call at the observation time for the canonical value. Consumers must stop
    presenting a cached result once its source is stale or its reset has passed.
    """
    if (
        not core_available
        or last_success is None
        or resets_at is None
        or type(remaining_percent) not in (int, float)
        or not isfinite(remaining_percent)
        or not 0 <= remaining_percent <= 100
        or type(window_minutes) is not int
        or window_minutes <= 0
    ):
        return None
    age = (now - last_success).total_seconds()
    remaining_seconds = (resets_at - now).total_seconds()
    if (
        age > max(900, 2 * update_interval_seconds)
        or not 0 < remaining_seconds <= window_minutes * 60
    ):
        return None
    return remaining_percent / (remaining_seconds / 3600)


def budget_key(limit: RateLimit, position: str, window: RateLimitWindow, *, source: str) -> str:
    """Return the stable entity stem for a reported limit window."""
    if source == "main" and window.duration_key in ("five_hour", "weekly"):
        return window.duration_key
    if source == "main":
        duration_id = (
            f"unknown_{position}" if window.duration_key == "unknown" else window.duration_key
        )
        return f"codex_{duration_id}_{position}"
    return f"{limit.limit_id}_{position}"


def collect_usage_budgets(
    usage: CodexUsageData,
    *,
    now: datetime,
    last_success: datetime | None,
    update_interval_seconds: float,
    core_available: bool,
) -> dict[str, UsageBudget]:
    """Calculate each valid window budget once for a coordinator observation."""
    result: dict[str, UsageBudget] = {}
    main_window_ids: set[int] = set()
    for position, window in usage.main_limit.windows:
        main_window_ids.add(id(window))
        value = usage_budget(
            remaining_percent=window.remaining_percent,
            window_minutes=window.window_minutes,
            resets_at=window.resets_at,
            now=now,
            last_success=last_success,
            update_interval_seconds=update_interval_seconds,
            core_available=core_available,
        )
        if value is not None:
            result[budget_key(usage.main_limit, position, window, source="main")] = UsageBudget(
                value, now
            )
    for limit in usage.additional_limits:
        for position, window in limit.windows:
            if id(window) in main_window_ids:
                continue
            value = usage_budget(
                remaining_percent=window.remaining_percent,
                window_minutes=window.window_minutes,
                resets_at=window.resets_at,
                now=now,
                last_success=last_success,
                update_interval_seconds=update_interval_seconds,
                core_available=core_available,
            )
            if value is not None:
                result[budget_key(limit, position, window, source="additional")] = UsageBudget(
                    value, now
                )
    return result


def cached_budget_is_valid(
    window: RateLimitWindow | None,
    *,
    now: datetime,
    last_success: datetime | None,
    update_interval_seconds: float,
    core_available: bool,
) -> bool:
    """Check whether a cached observation may still be presented."""
    if window is None:
        return False
    return (
        usage_budget(
            remaining_percent=window.remaining_percent,
            window_minutes=window.window_minutes,
            resets_at=window.resets_at,
            now=now,
            last_success=last_success,
            update_interval_seconds=update_interval_seconds,
            core_available=core_available,
        )
        is not None
    )
