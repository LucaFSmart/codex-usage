"""Allocation budgets use observed windows, never an invented reset schedule."""

from datetime import UTC, datetime, timedelta

import pytest

NOW = datetime(2026, 9, 5, 12, tzinfo=UTC)


def budget(**overrides):
    from custom_components.codex_usage.budget import usage_budget

    arguments = {
        "remaining_percent": 18,
        "window_minutes": 10080,
        "resets_at": NOW + timedelta(hours=72),
        "now": NOW,
        "last_success": NOW,
        "update_interval_seconds": 300,
        "core_available": True,
    }
    return usage_budget(**(arguments | overrides))


def test_three_day_allocation_and_zero_are_preserved():
    assert budget() == 0.25
    assert budget(remaining_percent=0) == 0
    assert budget(remaining_percent=100, resets_at=NOW + timedelta(seconds=30)) == 12000


@pytest.mark.parametrize("value", [None, -1, 101, float("nan"), float("inf"), True])
def test_invalid_remaining_has_no_budget(value):
    assert budget(remaining_percent=value) is None


@pytest.mark.parametrize("duration", [None, 0, -1, True])
def test_unknown_or_invalid_duration_has_no_budget(duration):
    assert budget(window_minutes=duration) is None


@pytest.mark.parametrize("reset", [None, NOW, NOW - timedelta(seconds=1), NOW + timedelta(days=8)])
def test_invalid_reset_has_no_budget(reset):
    assert budget(resets_at=reset) is None


def test_failure_and_stale_observation_suppress_budget():
    assert budget(core_available=False) is None
    assert budget(last_success=None) is None
    assert budget(last_success=NOW - timedelta(seconds=900)) == 0.25
    assert budget(last_success=NOW - timedelta(seconds=901)) is None
    assert budget(last_success=NOW - timedelta(seconds=2000), update_interval_seconds=1000) == 0.25
    assert budget(last_success=NOW - timedelta(seconds=2001), update_interval_seconds=1000) is None


def test_new_window_date_and_missing_date_are_adopted():
    assert budget(remaining_percent=100, resets_at=None) is None
    assert budget(remaining_percent=100, resets_at=NOW + timedelta(days=7)) == pytest.approx(
        100 / 168
    )
