"""Pure, privacy-safe monitoring normalization shared by all consumers."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Literal

from .api import CodexUsageData, RateLimit, ResetCredits

SourceName = Literal["usage", "profile", "reset_details", "workspace_discovery"]
SourceStatus = Literal["ok", "error", "unsupported", "disabled", "never"]


@dataclass(frozen=True, slots=True)
class SourceState:
    state: SourceStatus = "never"
    last_attempt: datetime | None = None
    last_success: datetime | None = None
    retry_at: datetime | None = None
    error_code: str | None = None
    refresh_mode: Literal["poll", "on_auth"] = "poll"
    expected_interval_seconds: int | None = None

    def __post_init__(self) -> None:
        if self.state not in {"ok", "error", "unsupported", "disabled", "never"}:
            raise ValueError("invalid source state")
        if self.error_code not in {
            None,
            "rate_limited",
            "connection",
            "authentication",
            "invalid_response",
            "http_error",
        }:
            raise ValueError("invalid error code")

    def stale(self, *, now: datetime, threshold_seconds: float) -> bool:
        return (
            self.last_success is not None
            and (now - self.last_success).total_seconds() > threshold_seconds
        )


def initial_sources() -> dict[SourceName, SourceState]:
    return {
        "usage": SourceState(),
        "profile": SourceState(),
        "reset_details": SourceState(),
        "workspace_discovery": SourceState(refresh_mode="on_auth"),
    }


@dataclass(frozen=True, slots=True)
class LimitStatus:
    id: str
    name: str
    source: Literal["main", "additional"]
    allowed: bool | None
    reached: bool | None


@dataclass(frozen=True, slots=True)
class RestrictionSummary:
    reached: bool | None
    reason: str
    affected_limits: tuple[str, ...]
    affected_limits_truncated: bool = False


def _restricted(limit: RateLimit) -> bool | None:
    if limit.allowed is False or limit.limit_reached is True:
        return True
    if limit.limit_reached is False or limit.allowed is True:
        return False
    return None


def limit_statuses(usage: CodexUsageData) -> tuple[LimitStatus, ...]:
    main_window_ids = {id(window) for _, window in usage.main_limit.windows}
    values = [
        LimitStatus(
            "codex",
            usage.main_limit.name[:120],
            "main",
            usage.main_limit.allowed,
            _restricted(usage.main_limit),
        )
    ]
    values.extend(
        LimitStatus(x.limit_id, x.name[:120], "additional", x.allowed, _restricted(x))
        for x in usage.additional_limits
        if not any(id(window) in main_window_ids for _, window in x.windows)
    )
    return tuple(values)


def restriction_summary(usage: CodexUsageData) -> RestrictionSummary:
    statuses = limit_statuses(usage)
    affected = sorted({x.id for x in statuses if x.reached is True})
    explicit_reason = usage.blocker_reason
    reason = "none"
    if usage.spend_limit_reached is True or explicit_reason == "spend":
        reason = "spend"
    elif (
        usage.credits
        and usage.credits.overage_limit_reached is True
        or explicit_reason == "credits"
    ):
        reason = "credits"
    elif statuses[0].reached is True or explicit_reason == "usage_limit":
        reason = "usage_limit"
    elif any(x.reached is True for x in statuses[1:]):
        reason = "additional_limit"
    elif explicit_reason:
        reason = "unknown"
    reached = (
        True if reason != "none" else (False if all(x.reached is False for x in statuses) else None)
    )
    return RestrictionSummary(reached, reason, tuple(affected[:50]), len(affected) > 50)


@dataclass(frozen=True, slots=True)
class ResetSummary:
    available_count: int | None
    count_source: str
    count_updated_at: datetime | None
    total_earned: int | None
    next_expiry: datetime | None
    details_consistent: bool | None
    details_updated_at: datetime | None
    details_present: bool


def reset_summary(
    usage: CodexUsageData,
    details: ResetCredits | None,
    *,
    now: datetime,
    usage_updated_at: datetime | None,
    details_updated_at: datetime | None,
    details_enabled: bool = True,
    context_changed_at: datetime | None = None,
) -> ResetSummary:
    visible = details if details_enabled else None
    fresh = bool(
        visible and details_updated_at and (now - details_updated_at).total_seconds() <= 7200
    )
    if usage.available_reset_credits is not None:
        count, source, updated = usage.available_reset_credits, "usage", usage_updated_at
    elif fresh and visible and visible.available_count is not None:
        count, source, updated = visible.available_count, "reset_details", details_updated_at
    else:
        count, source, updated = None, "none", None
    consistent = None
    if (
        usage.available_reset_credits is not None
        and fresh
        and visible
        and visible.available_count is not None
    ):
        consistent = usage.available_reset_credits == visible.available_count
    reconciled = not context_changed_at or bool(
        details_updated_at and details_updated_at >= context_changed_at
    )
    expiry = None
    counts_match = bool(
        visible and visible.available_count is not None and visible.available_count == count
    )
    if fresh and visible and count and counts_match and reconciled:
        expiry = min(
            (
                x.expires_at
                for x in visible.credits
                if x.status == "available" and x.expires_at and x.expires_at > now
            ),
            default=None,
        )
    return ResetSummary(
        count,
        source,
        updated,
        visible.total_earned_count if visible else None,
        expiry,
        consistent,
        details_updated_at if visible else None,
        bool(visible and visible.details_present),
    )


def reset_context(usage: CodexUsageData) -> tuple[int | None, datetime | None, datetime | None]:
    return (
        usage.available_reset_credits,
        usage.main_limit.primary.resets_at if usage.main_limit.primary else None,
        usage.main_limit.secondary.resets_at if usage.main_limit.secondary else None,
    )


def reset_context_changed(old: tuple, new: tuple) -> bool:
    if old[0] != new[0]:
        return True
    return any(
        (a is None) != (b is None) or (a and b and abs((a - b).total_seconds()) > 60)
        for a, b in zip(old[1:], new[1:], strict=True)
    )
