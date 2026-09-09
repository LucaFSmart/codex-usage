"""Behavioral tests for shared monitoring rules with an explicit clock."""

from datetime import UTC, datetime, timedelta

import pytest

from custom_components.codex_usage import monitoring
from custom_components.codex_usage.api import parse_reset_credits, parse_usage

NOW = datetime(2026, 9, 5, 12, tzinfo=UTC)


def summary(count=None, detail_count=1, *, age=0, enabled=True, changed=None):
    usage = parse_usage({"rate_limit_reset_credits": {"available_count": count}})
    details = parse_reset_credits(
        {
            "available_count": detail_count,
            "total_earned_count": 8,
            "credits": [
                {
                    "reset_type": "unknown",
                    "status": "available",
                    "expires_at": (NOW + timedelta(days=1)).isoformat(),
                },
                {
                    "reset_type": "unknown",
                    "status": "used",
                    "expires_at": (NOW + timedelta(hours=1)).isoformat(),
                },
                {
                    "reset_type": "unknown",
                    "status": "available",
                    "expires_at": (NOW - timedelta(hours=1)).isoformat(),
                },
            ],
        }
    )
    return monitoring.reset_summary(
        usage,
        details,
        now=NOW,
        usage_updated_at=NOW,
        details_updated_at=NOW - timedelta(seconds=age),
        details_enabled=enabled,
        context_changed_at=changed,
    )


@pytest.mark.parametrize(
    ("count", "detail", "expected", "source", "consistent", "expiry"),
    [
        (4, 1, 4, "usage", False, False),
        (0, 1, 0, "usage", False, False),
        (None, 2, 2, "reset_details", None, True),
        (None, None, None, "none", None, False),
        (1, 1, 1, "usage", True, True),
    ],
)
def test_reset_priority(count, detail, expected, source, consistent, expiry):
    result = summary(count, detail)
    assert result.available_count == expected
    assert result.count_source == source
    assert result.details_consistent is consistent
    assert result.next_expiry == (NOW + timedelta(days=1) if expiry else None)


def test_detail_freshness_disable_and_context_order():
    assert summary(1, None).next_expiry is None
    assert summary(age=7200).available_count == 1
    stale = summary(age=7201)
    assert stale.available_count is None and stale.next_expiry is None
    assert stale.total_earned == 8 and stale.details_updated_at == NOW - timedelta(seconds=7201)
    disabled = summary(4, enabled=False)
    assert disabled.available_count == 4 and disabled.total_earned is None
    assert disabled.details_updated_at is None and not disabled.details_present
    assert summary(1, changed=NOW + timedelta(seconds=1)).next_expiry is None
    assert summary(1, changed=NOW).next_expiry is not None


def test_expiry_requires_an_explicit_matching_detail_count():
    assert summary(1, detail_count=None).next_expiry is None


@pytest.mark.parametrize(
    ("payload", "reached", "reason"),
    [
        ({}, None, "none"),
        ({"rate_limit": {"allowed": True}}, False, "none"),
        (
            {
                "rate_limit": {"limit_reached": False},
                "additional_rate_limits": [{"metered_feature": "image"}],
            },
            None,
            "none",
        ),
        (
            {
                "rate_limit": {"allowed": True},
                "additional_rate_limits": [
                    {"metered_feature": "image", "rate_limit": {"allowed": False}}
                ],
            },
            True,
            "additional_limit",
        ),
        ({"spend_limit_reached": True}, True, "spend"),
        ({"credits": {"overage_limit_reached": True}}, True, "credits"),
        ({"rate_limit": {"allowed": True, "limit_reached": True}}, True, "usage_limit"),
        ({"blocker_reason": "new unknown cause"}, True, "unknown"),
    ],
)
def test_aggregate_precedence(payload, reached, reason):
    result = monitoring.restriction_summary(parse_usage(payload))
    assert result.reached is reached
    assert result.reason == reason


def test_main_aliases_are_not_additional_statuses():
    usage = parse_usage({"rate_limit": {"allowed": False, "primary_window": {"used_percent": 12}}})
    assert len(monitoring.limit_statuses(usage)) == 1
    assert monitoring.restriction_summary(usage).affected_limits == ("codex",)


def test_luna_reserve_reports_fallback_without_clearing_the_regular_limit() -> None:
    usage = parse_usage(
        {
            "rate_limit": {"allowed": False, "limit_reached": True},
            "additional_rate_limits": [
                {
                    "metered_feature": "base_model_inference",
                    "limit_name": "gpt-reserve",
                    "normal_model_slug": "gpt-5.6-luna",
                    "rate_limit": {"allowed": True, "limit_reached": False},
                }
            ],
        }
    )

    result = monitoring.restriction_summary(usage)
    assert result.reached is True
    assert result.reason == "usage_limit"
    assert result.affected_limits == ("codex",)
    assert result.fallback_available is True
    assert result.fallback_limit_id == "base_model_inference"


def test_luna_reserve_absence_or_unknown_state_does_not_claim_fallback() -> None:
    absent = monitoring.restriction_summary(
        parse_usage({"rate_limit": {"allowed": False, "limit_reached": True}})
    )
    unknown = monitoring.restriction_summary(
        parse_usage(
            {
                "rate_limit": {"allowed": False, "limit_reached": True},
                "additional_rate_limits": [
                    {
                        "metered_feature": "base_model_inference",
                        "limit_name": "gpt-reserve",
                        "rate_limit": {},
                    }
                ],
            }
        )
    )

    assert absent.fallback_available is None
    assert absent.fallback_limit_id is None
    assert unknown.fallback_available is None
    assert unknown.fallback_limit_id == "base_model_inference"


def test_exhausted_luna_reserve_is_reported_as_unavailable() -> None:
    result = monitoring.restriction_summary(
        parse_usage(
            {
                "rate_limit": {"allowed": False, "limit_reached": True},
                "additional_rate_limits": [
                    {
                        "metered_feature": "base_model_inference",
                        "limit_name": "gpt-reserve",
                        "rate_limit": {"allowed": False, "limit_reached": True},
                    }
                ],
            }
        )
    )

    assert result.fallback_available is False
    assert result.fallback_limit_id == "base_model_inference"


def test_base_model_bucket_is_still_recognized_as_fallback_after_a_display_rename() -> None:
    """The provider's stable `metered_feature` id is authoritative, not the display label.

    A renamed `limit_name` must not silently and permanently disable the
    fallback signal — only the `base_model_inference` id is required.
    """
    result = monitoring.restriction_summary(
        parse_usage(
            {
                "rate_limit": {"allowed": False},
                "additional_rate_limits": [
                    {
                        "metered_feature": "base_model_inference",
                        "limit_name": "future-quota",
                        "rate_limit": {"allowed": True, "limit_reached": False},
                    }
                ],
            }
        )
    )

    assert result.fallback_available is True
    assert result.fallback_limit_id == "base_model_inference"


def test_real_codex_prefixed_additional_limit_is_not_treated_as_main_alias():
    usage = parse_usage(
        {
            "rate_limit": {"allowed": True},
            "additional_rate_limits": [
                {
                    "metered_feature": "codex_review",
                    "rate_limit": {"allowed": False},
                }
            ],
        }
    )
    statuses = monitoring.limit_statuses(usage)
    assert [item.id for item in statuses] == ["codex", "codex_review"]
    assert monitoring.restriction_summary(usage).affected_limits == ("codex_review",)


def test_sources_validate_safe_enums_and_derive_age():
    source = monitoring.SourceState(state="error", last_success=NOW, error_code="connection")
    assert source.stale(now=NOW + timedelta(seconds=901), threshold_seconds=900)
    assert not source.stale(now=NOW, threshold_seconds=900)
    with pytest.raises(ValueError):
        monitoring.SourceState(error_code="private server response")
    assert set(monitoring.initial_sources()) == {
        "usage",
        "profile",
        "reset_details",
        "workspace_discovery",
    }
    assert monitoring.initial_sources()["workspace_discovery"].refresh_mode == "on_auth"


def test_context_uses_reconciled_dates_and_tolerance():
    def context(seconds, count=1):
        return monitoring.reset_context(
            parse_usage(
                {
                    "rate_limit_reset_credits": {"available_count": count},
                    "rate_limit": {
                        "primary_window": {
                            "used_percent": 1,
                            "reset_at": (NOW + timedelta(seconds=seconds)).timestamp(),
                        }
                    },
                }
            )
        )

    baseline = context(100)
    assert not monitoring.reset_context_changed(baseline, context(160))
    assert monitoring.reset_context_changed(baseline, context(161))
    assert monitoring.reset_context_changed(baseline, context(100, 0))
