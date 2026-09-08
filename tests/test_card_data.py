"""Tests for the token-free internal card snapshot."""

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import Mock, patch

from custom_components.codex_usage.api import CodexProfileStats, ResetCredits, parse_usage
from custom_components.codex_usage.budget import UsageBudget
from custom_components.codex_usage.card_data import build_card_snapshot, websocket_card_data
from custom_components.codex_usage.const import DOMAIN

ADMIN_USER = SimpleNamespace(is_admin=True, permissions=SimpleNamespace())


def _restricted_user(*allowed_entity_ids: str) -> SimpleNamespace:
    allowed = set(allowed_entity_ids)
    return SimpleNamespace(
        is_admin=False,
        permissions=SimpleNamespace(
            access_all_entities=lambda _policy: False,
            check_entity=lambda entity_id, _policy: entity_id in allowed,
        ),
    )


def test_card_snapshot_contains_only_display_safe_normalized_data() -> None:
    usage = parse_usage(
        {
            "plan_type": "plus",
            "rate_limit": {
                "allowed": True,
                "limit_reached": False,
                "primary_window": {
                    "used_percent": 27,
                    "limit_window_seconds": 604_800,
                    "reset_at": 1_800_000_000,
                },
            },
            "credits": {"has_credits": True, "unlimited": False, "balance": "12.50"},
        }
    )
    profile = CodexProfileStats(100, 50, 1, 2, 3, 60, 12.5, 10, 4, "high", 80)
    coordinator = SimpleNamespace(
        data=SimpleNamespace(
            usage=usage,
            profile=profile,
            reset_credits=ResetCredits(1, 2, ()),
        ),
        last_update_success=True,
        last_success=datetime(2026, 7, 15, 8, 30, tzinfo=UTC),
    )
    entry = SimpleNamespace(entry_id="entry-a", title="Luca", unique_id=None, data={})
    hass = SimpleNamespace(data={DOMAIN: {"entries": {"entry-a": (entry, coordinator)}}})

    snapshot = build_card_snapshot(hass, ADMIN_USER)

    assert snapshot["schema_version"] == 1
    assert snapshot["integration_version"] == "0.7.0"
    assert snapshot["accounts"] == [
        {
            "id": "entry-a",
            "name": "Luca",
            "plan": "plus",
            "available": True,
            "updated_at": "2026-07-15T08:30:00+00:00",
            "blocker": None,
            "limit_statuses": [
                {
                    "id": "codex",
                    "name": "Codex",
                    "source": "main",
                    "allowed": True,
                    "reached": False,
                }
            ],
            "limit_summary": {
                "reached": False,
                "reason": "none",
                "affected_limits": [],
                "affected_limits_truncated": False,
            },
            "sources": {},
            "limits": [
                {
                    "id": "codex:primary:weekly",
                    "name": "Codex",
                    "source": "main",
                    "duration_seconds": 604_800,
                    "used_percent": 27.0,
                    "remaining_percent": 73.0,
                    "resets_at": usage.weekly_window.resets_at.isoformat(),
                    "reached": False,
                    "entity_id": None,
                    "budget_pph": None,
                    "budget_calculated_at": None,
                }
            ],
            "credits": {
                "balance": "12.50",
                "has_credits": True,
                "unlimited": False,
                "overage_reached": None,
            },
            "spend": None,
            "reset_credits": {
                "available_count": 1,
                "total_earned": 2,
                "next_expiry": None,
                "count_source": "reset_details",
                "count_updated_at": snapshot["generated_at"],
                "details_consistent": None,
                "details_present": True,
                "details_updated_at": snapshot["generated_at"],
            },
            "profile": {
                "lifetime_tokens": 100,
                "peak_daily_tokens": 50,
                "current_streak_days": 1,
                "longest_streak_days": 2,
                "total_threads": 3,
                "longest_running_turn_sec": 60,
                "fast_mode_usage_percentage": 12.5,
                "total_skills_used": 10,
                "unique_skills_used": 4,
                "most_used_reasoning_effort": "high",
                "most_used_reasoning_effort_percentage": 80,
            },
        }
    ]
    rendered = repr(snapshot)
    assert "private" not in rendered
    assert "access_token" not in rendered


def test_card_snapshot_shows_reset_credits_row_when_fetched_but_empty() -> None:
    """A successfully fetched but empty reset-credits response must still show a row.

    Regression test: the row must not silently disappear just because the
    endpoint reported no earned/available counts for this account.
    """
    usage = parse_usage({"rate_limit": None})
    coordinator = SimpleNamespace(
        data=SimpleNamespace(usage=usage, profile=None, reset_credits=ResetCredits(None, None, ())),
        last_update_success=True,
        last_success=datetime(2026, 7, 15, 8, 30, tzinfo=UTC),
        reset_last_success=datetime(2026, 7, 15, 8, 30, tzinfo=UTC),
    )
    entry = SimpleNamespace(entry_id="entry-a", title="Codex Usage", unique_id=None, data={})
    hass = SimpleNamespace(data={DOMAIN: {"entries": {"entry-a": (entry, coordinator)}}})

    reset_credits = build_card_snapshot(hass, ADMIN_USER)["accounts"][0]["reset_credits"]

    assert reset_credits is not None
    assert reset_credits["available_count"] is None
    assert reset_credits["total_earned"] is None
    assert reset_credits["details_present"] is True


def test_card_snapshot_exposes_luna_reserve_as_an_available_fallback() -> None:
    usage = parse_usage(
        {
            "rate_limit": {"allowed": False, "limit_reached": True},
            "additional_rate_limits": [
                {
                    "metered_feature": "base_model_inference",
                    "limit_name": "gpt-reserve",
                    "normal_model_slug": "gpt-5.6-luna",
                    "rate_limit": {
                        "allowed": True,
                        "limit_reached": False,
                        "primary_window": {
                            "used_percent": 20,
                            "limit_window_seconds": 18_000,
                        },
                    },
                }
            ],
        }
    )
    coordinator = SimpleNamespace(
        data=SimpleNamespace(usage=usage, profile=None, reset_credits=None, budgets={}),
        last_update_success=True,
        last_success=datetime(2026, 7, 15, 8, 30, tzinfo=UTC),
        sources={},
    )
    entry = SimpleNamespace(entry_id="entry-a", title="Codex Usage", unique_id=None, data={})
    hass = SimpleNamespace(data={DOMAIN: {"entries": {"entry-a": (entry, coordinator)}}})

    account = build_card_snapshot(hass, ADMIN_USER)["accounts"][0]

    reserve = next(item for item in account["limit_statuses"] if item["name"] == "Luna Reserve")
    assert "normal_model_slug" not in reserve
    assert account["limit_summary"] == {
        "reached": True,
        "reason": "usage_limit",
        "affected_limits": ["codex"],
        "affected_limits_truncated": False,
        "fallback_available": True,
        "fallback_limit_id": "base_model_inference",
    }


def test_card_snapshot_preserves_unknown_windows_without_duplicates() -> None:
    usage = parse_usage(
        {"rate_limit": {"primary_window": {"used_percent": 10, "reset_at": 1_800_000_000}}}
    )
    coordinator = SimpleNamespace(
        data=SimpleNamespace(usage=usage, profile=None, reset_credits=None),
        last_update_success=True,
        last_success=None,
    )
    entry = SimpleNamespace(entry_id="entry-a", title="Codex Usage", unique_id=None, data={})
    hass = SimpleNamespace(data={DOMAIN: {"entries": {"entry-a": (entry, coordinator)}}})

    limits = build_card_snapshot(hass, ADMIN_USER)["accounts"][0]["limits"]

    assert len(limits) == 1
    assert limits[0]["id"] == "codex:primary:unknown"
    assert limits[0]["duration_seconds"] is None


def test_card_snapshot_links_only_enabled_loaded_entities() -> None:
    usage = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 10,
                    "limit_window_seconds": 604_800,
                }
            }
        }
    )
    coordinator = SimpleNamespace(
        data=SimpleNamespace(usage=usage, profile=None, reset_credits=None),
        last_update_success=True,
        last_success=None,
    )
    entry = SimpleNamespace(entry_id="entry-a", title="Codex Usage", unique_id="identity", data={})
    registry = SimpleNamespace(
        entities={
            "sensor.weekly": SimpleNamespace(
                unique_id="identity_weekly_usage",
                entity_id="sensor.weekly",
                platform=DOMAIN,
                disabled_by=None,
            ),
            "sensor.disabled": SimpleNamespace(
                unique_id="identity_five_hour_usage",
                entity_id="sensor.disabled",
                platform=DOMAIN,
                disabled_by="integration",
            ),
        }
    )
    hass = SimpleNamespace(
        data={DOMAIN: {"entries": {"entry-a": (entry, coordinator)}}},
        states={"sensor.weekly": object()},
    )

    with patch("custom_components.codex_usage.card_data.er.async_get", return_value=registry):
        limits = build_card_snapshot(hass, ADMIN_USER)["accounts"][0]["limits"]

    assert limits[0]["entity_id"] == "sensor.weekly"


def test_card_snapshot_never_exposes_legacy_generated_account_title() -> None:
    usage = parse_usage({"plan_type": "plus"})
    coordinator = SimpleNamespace(
        data=SimpleNamespace(usage=usage, profile=None, reset_credits=None),
        last_update_success=True,
        last_success=None,
    )
    entry = SimpleNamespace(
        entry_id="entry-a",
        title="Codex Usage (4657ca9f-b1ec-47d8-b82a-de968c0d5362 - Plus)",
        unique_id=None,
        data={"account_id": "4657ca9f-b1ec-47d8-b82a-de968c0d5362"},
    )
    hass = SimpleNamespace(data={DOMAIN: {"entries": {"entry-a": (entry, coordinator)}}})

    account = build_card_snapshot(hass, ADMIN_USER)["accounts"][0]

    assert account["name"] == "Codex Usage"
    assert "4657ca9f" not in repr(account)


def test_card_snapshot_filters_entries_by_all_entity_read_permissions() -> None:
    usage = parse_usage({"plan_type": "plus"})
    coordinator = SimpleNamespace(
        data=SimpleNamespace(usage=usage, profile=None, reset_credits=None),
        last_update_success=True,
        last_success=None,
    )
    entry_a = SimpleNamespace(entry_id="entry-a", title="Alpha", unique_id=None, data={})
    entry_b = SimpleNamespace(entry_id="entry-b", title="Beta", unique_id=None, data={})
    registry = SimpleNamespace(
        entities={
            "sensor.alpha": SimpleNamespace(
                entity_id="sensor.alpha",
                unique_id="alpha_plan",
                platform=DOMAIN,
                config_entry_id="entry-a",
                disabled_by=None,
            ),
            "sensor.alpha_private": SimpleNamespace(
                entity_id="sensor.alpha_private",
                unique_id="alpha_credit_balance",
                platform=DOMAIN,
                config_entry_id="entry-a",
                disabled_by="integration",
            ),
            "sensor.beta": SimpleNamespace(
                entity_id="sensor.beta",
                unique_id="beta_plan",
                platform=DOMAIN,
                config_entry_id="entry-b",
                disabled_by=None,
            ),
        }
    )
    hass = SimpleNamespace(
        data={
            DOMAIN: {
                "entries": {
                    "entry-a": (entry_a, coordinator),
                    "entry-b": (entry_b, coordinator),
                }
            }
        },
        states={},
    )

    with patch("custom_components.codex_usage.card_data.er.async_get", return_value=registry):
        partial = build_card_snapshot(hass, _restricted_user("sensor.alpha"))
        beta_only = build_card_snapshot(hass, _restricted_user("sensor.beta"))

    assert partial["accounts"] == []
    assert [account["id"] for account in beta_only["accounts"]] == ["entry-b"]


def test_card_snapshot_fails_closed_without_registry_evidence() -> None:
    usage = parse_usage({"plan_type": "plus"})
    coordinator = SimpleNamespace(
        data=SimpleNamespace(usage=usage, profile=None, reset_credits=None),
        last_update_success=True,
        last_success=None,
    )
    entry = SimpleNamespace(entry_id="entry-a", title="Alpha", unique_id=None, data={})
    hass = SimpleNamespace(data={DOMAIN: {"entries": {"entry-a": (entry, coordinator)}}}, states={})

    with patch(
        "custom_components.codex_usage.card_data.er.async_get",
        return_value=SimpleNamespace(entities={}),
    ):
        snapshot = build_card_snapshot(hass, _restricted_user())

    assert snapshot["accounts"] == []


def test_websocket_handler_passes_the_authenticated_user() -> None:
    hass = SimpleNamespace()
    user = _restricted_user()
    connection = SimpleNamespace(user=user, send_result=Mock())
    snapshot = {"accounts": []}

    with patch(
        "custom_components.codex_usage.card_data.build_card_snapshot", return_value=snapshot
    ) as builder:
        websocket_card_data(hass, connection, {"id": 7})

    builder.assert_called_once_with(hass, user)
    connection.send_result.assert_called_once_with(7, snapshot)


def test_card_serializes_the_cached_budget_without_recalculating_it() -> None:
    observed_at = datetime(2026, 9, 5, 12, tzinfo=UTC)
    usage = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 82,
                    "limit_window_seconds": 604_800,
                    "reset_at": (observed_at + timedelta(hours=72)).timestamp(),
                }
            }
        }
    )
    coordinator = SimpleNamespace(
        data=SimpleNamespace(
            usage=usage,
            profile=None,
            reset_credits=None,
            budgets={"weekly": UsageBudget(123.0, observed_at)},
        ),
        last_update_success=True,
        last_success=observed_at,
        update_interval=timedelta(minutes=5),
        sources={},
    )
    entry = SimpleNamespace(entry_id="entry-a", title="Alpha", unique_id="identity", data={})
    hass = SimpleNamespace(data={DOMAIN: {"entries": {"entry-a": (entry, coordinator)}}})

    with patch("custom_components.codex_usage.card_data.datetime") as datetime_mock:
        datetime_mock.now.return_value = observed_at + timedelta(minutes=10)
        limit = build_card_snapshot(hass, ADMIN_USER)["accounts"][0]["limits"][0]

    assert limit["budget_pph"] == 123.0
    assert limit["budget_calculated_at"] == observed_at.isoformat()


def test_card_suppresses_cached_budget_during_core_failure() -> None:
    observed_at = datetime(2026, 9, 5, 12, tzinfo=UTC)
    usage = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 82,
                    "limit_window_seconds": 604_800,
                    "reset_at": (observed_at + timedelta(hours=72)).timestamp(),
                }
            }
        }
    )
    coordinator = SimpleNamespace(
        data=SimpleNamespace(
            usage=usage,
            profile=None,
            reset_credits=None,
            budgets={"weekly": UsageBudget(0.25, observed_at)},
        ),
        last_update_success=False,
        last_success=observed_at,
        update_interval=timedelta(minutes=5),
        sources={},
    )
    entry = SimpleNamespace(entry_id="entry-a", title="Alpha", unique_id="identity", data={})
    hass = SimpleNamespace(data={DOMAIN: {"entries": {"entry-a": (entry, coordinator)}}})

    with patch("custom_components.codex_usage.card_data.datetime") as datetime_mock:
        datetime_mock.now.return_value = observed_at + timedelta(minutes=1)
        limit = build_card_snapshot(hass, ADMIN_USER)["accounts"][0]["limits"][0]

    assert limit["budget_pph"] is None
    assert limit["budget_calculated_at"] is None
