"""Tests for the token-free internal card snapshot."""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import patch

from custom_components.codex_usage.api import CodexProfileStats, ResetCredits, parse_usage
from custom_components.codex_usage.card_data import build_card_snapshot
from custom_components.codex_usage.const import DOMAIN


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

    snapshot = build_card_snapshot(hass)

    assert snapshot["schema_version"] == 1
    assert snapshot["integration_version"] == "0.5.0"
    assert snapshot["accounts"] == [
        {
            "id": "entry-a",
            "name": "Luca",
            "plan": "plus",
            "available": True,
            "updated_at": "2026-07-15T08:30:00+00:00",
            "blocker": None,
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

    limits = build_card_snapshot(hass)["accounts"][0]["limits"]

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
        limits = build_card_snapshot(hass)["accounts"][0]["limits"]

    assert limits[0]["entity_id"] == "sensor.weekly"
