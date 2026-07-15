"""Tests for usage and profile update scheduling."""

import asyncio
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import patch

from custom_components.codex_usage.api import (
    CodexConnectionError,
    CodexCredentials,
    CodexProfileStats,
    ResetCredits,
    parse_usage,
)
from custom_components.codex_usage.coordinator import CodexUsageCoordinator


def _credentials() -> CodexCredentials:
    return CodexCredentials(
        access_token="access",
        refresh_token="refresh",
        id_token="id",
        expires_at=9_999_999_999,
        account_id="workspace-1",
    )


def _profile(total_threads: int) -> CodexProfileStats:
    return CodexProfileStats(
        lifetime_tokens=100,
        peak_daily_tokens=50,
        current_streak_days=1,
        longest_streak_days=2,
        total_threads=total_threads,
        longest_running_turn_sec=60,
        fast_mode_usage_percentage=0,
        total_skills_used=10,
        unique_skills_used=3,
        most_used_reasoning_effort="high",
        most_used_reasoning_effort_percentage=80,
    )


class _FakeClient:
    def __init__(self) -> None:
        self.profile_calls = 0
        self.profile_result: CodexProfileStats | Exception = _profile(10)
        self.reset_calls = 0
        self.reset_result: ResetCredits | Exception = ResetCredits(1, 2, ())

    async def async_get_usage(self, credentials: CodexCredentials):
        return parse_usage({"plan_type": "plus", "rate_limit": None}), credentials

    async def async_get_profile(self, credentials: CodexCredentials) -> CodexProfileStats:
        self.profile_calls += 1
        if isinstance(self.profile_result, Exception):
            raise self.profile_result
        return self.profile_result

    async def async_get_reset_credits(self, credentials: CodexCredentials) -> ResetCredits:
        self.reset_calls += 1
        if isinstance(self.reset_result, Exception):
            raise self.reset_result
        return self.reset_result


def _coordinator(client: _FakeClient) -> CodexUsageCoordinator:
    coordinator = object.__new__(CodexUsageCoordinator)
    coordinator.client = client  # type: ignore[assignment]
    coordinator.credentials = _credentials()
    coordinator.config_entry = SimpleNamespace(data={})
    coordinator.hass = SimpleNamespace(
        config_entries=SimpleNamespace(async_update_entry=lambda *args, **kwargs: None)
    )
    coordinator._profile_data = None
    coordinator._profile_next_attempt = 0.0
    coordinator._profile_last_success = None
    coordinator._profile_available = None
    coordinator._profile_last_error = None
    coordinator._reset_credits = None
    coordinator._reset_next_attempt = 0.0
    coordinator._reset_last_success = None
    coordinator._reset_available = None
    coordinator._reset_last_error = None
    return coordinator


def test_profile_is_fetched_at_start_and_then_hourly() -> None:
    client = _FakeClient()
    coordinator = _coordinator(client)

    with patch("custom_components.codex_usage.coordinator.monotonic", return_value=100.0):
        first = asyncio.run(coordinator._async_update_data())
    with patch("custom_components.codex_usage.coordinator.monotonic", return_value=200.0):
        second = asyncio.run(coordinator._async_update_data())
    client.profile_result = _profile(11)
    with patch("custom_components.codex_usage.coordinator.monotonic", return_value=3_701.0):
        third = asyncio.run(coordinator._async_update_data())

    assert first.profile is not None and first.profile.total_threads == 10
    assert second.profile is first.profile
    assert third.profile is not None and third.profile.total_threads == 11
    assert third.usage.plan_type == "plus"
    assert client.profile_calls == 2


def test_profile_failure_keeps_usage_and_last_successful_profile() -> None:
    client = _FakeClient()
    coordinator = _coordinator(client)

    with patch("custom_components.codex_usage.coordinator.monotonic", return_value=100.0):
        first = asyncio.run(coordinator._async_update_data())
    client.profile_result = CodexConnectionError()
    with patch("custom_components.codex_usage.coordinator.monotonic", return_value=3_701.0):
        second = asyncio.run(coordinator._async_update_data())

    assert second.usage.plan_type == "plus"
    assert second.profile is first.profile
    assert coordinator.profile_available is True
    assert coordinator.profile_last_error == "CodexConnectionError"
    assert coordinator._profile_next_attempt == 4_601.0


def test_reset_metadata_is_fetched_at_start_and_then_hourly() -> None:
    client = _FakeClient()
    coordinator = _coordinator(client)

    with patch("custom_components.codex_usage.coordinator.monotonic", return_value=100.0):
        first = asyncio.run(coordinator._async_update_data())
    with patch("custom_components.codex_usage.coordinator.monotonic", return_value=200.0):
        second = asyncio.run(coordinator._async_update_data())
    client.reset_result = ResetCredits(3, 4, ())
    with patch("custom_components.codex_usage.coordinator.monotonic", return_value=3_701.0):
        third = asyncio.run(coordinator._async_update_data())

    assert first.reset_credits is not None and first.reset_credits.available_count == 1
    assert second.reset_credits is first.reset_credits
    assert third.reset_credits is not None and third.reset_credits.available_count == 3
    assert client.reset_calls == 2


def test_reset_failure_keeps_usage_and_last_successful_metadata() -> None:
    client = _FakeClient()
    coordinator = _coordinator(client)

    with patch("custom_components.codex_usage.coordinator.monotonic", return_value=100.0):
        first = asyncio.run(coordinator._async_update_data())
    client.reset_result = CodexConnectionError()
    with patch("custom_components.codex_usage.coordinator.monotonic", return_value=3_701.0):
        second = asyncio.run(coordinator._async_update_data())

    assert second.reset_credits is first.reset_credits
    assert coordinator.reset_available is True
    assert coordinator.reset_last_error == "CodexConnectionError"
    assert coordinator._reset_next_attempt == 4_601.0


def test_identical_usage_refreshes_still_produce_fresh_coordinator_data() -> None:
    client = _FakeClient()
    coordinator = _coordinator(client)
    coordinator._profile_next_attempt = 10_000.0
    coordinator._reset_next_attempt = 10_000.0
    first_time = datetime(2026, 7, 15, 8, 0, tzinfo=UTC)
    second_time = datetime(2026, 7, 15, 8, 5, tzinfo=UTC)

    with (
        patch("custom_components.codex_usage.coordinator.monotonic", return_value=100.0),
        patch("custom_components.codex_usage.coordinator.datetime") as datetime_mock,
    ):
        datetime_mock.now.side_effect = [first_time, second_time]
        first = asyncio.run(coordinator._async_update_data())
        second = asyncio.run(coordinator._async_update_data())

    assert first.refreshed_at == first_time
    assert second.refreshed_at == second_time
    assert first != second
