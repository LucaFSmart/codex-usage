"""Tests for usage and profile update scheduling."""

import asyncio
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from homeassistant.helpers.update_coordinator import UpdateFailed

from custom_components.codex_usage.api import (
    CodexAuthenticationError,
    CodexConnectionError,
    CodexCredentials,
    CodexHttpError,
    CodexProfileStats,
    ResetCredits,
    parse_usage,
)
from custom_components.codex_usage.coordinator import CodexUsageCoordinator
from custom_components.codex_usage.monitoring import initial_sources


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
        self.usage_calls = 0
        self.profile_calls = 0
        self.profile_result: CodexProfileStats | Exception = _profile(10)
        self.reset_calls = 0
        self.reset_result: ResetCredits | Exception = ResetCredits(1, 2, ())
        self.usage_result = parse_usage({"plan_type": "plus", "rate_limit": None})

    async def async_get_usage(self, credentials: CodexCredentials):
        self.usage_calls += 1
        if isinstance(self.usage_result, Exception):
            raise self.usage_result
        return self.usage_result, credentials

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
    coordinator.config_entry = SimpleNamespace(data={}, options={})
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
    coordinator._last_success = None
    coordinator.sources = initial_sources()
    coordinator._read_retry_at = None
    coordinator._usage_retry_at = None
    coordinator._profile_retry_at = None
    coordinator._reset_reconciled_context = None
    coordinator._reset_context_changed_at = None
    return coordinator


def test_disabled_optional_sources_skip_reads_and_keep_usage_reset_count():
    client = _FakeClient()
    client.usage_result = parse_usage({"rate_limit_reset_credits": {"available_count": 4}})
    coordinator = _coordinator(client)
    coordinator.config_entry.options = {"fetch_profile": False, "fetch_reset_details": False}
    data = asyncio.run(coordinator._async_update_data())
    assert (client.profile_calls, client.reset_calls) == (0, 0)
    assert data.profile is None and data.reset_credits is None
    assert data.reset_summary.available_count == 4
    assert coordinator.sources["profile"].state == "disabled"


def test_optional_429_does_not_stop_core_usage_reads():
    """A profile-endpoint 429 must not block the independently-fetched usage sensors."""
    from custom_components.codex_usage.api import CodexHttpError

    client = _FakeClient()
    until = datetime.now(UTC) + timedelta(days=3)
    client.profile_result = CodexHttpError(429, until)
    coordinator = _coordinator(client)
    data = asyncio.run(coordinator._async_update_data())
    assert data.usage is client.usage_result
    assert client.reset_calls == 0
    assert coordinator.sources["profile"].retry_at == until

    # Usage keeps updating on later cycles; only the rate-limited profile (and the
    # reset_details read that voluntarily defers to it) stay backed off.
    data = asyncio.run(coordinator._async_update_data())
    assert data.usage is client.usage_result
    assert client.usage_calls == 2
    assert client.profile_calls == 1
    assert client.reset_calls == 0


def test_usage_429_cooldown_blocks_subsequent_reads():
    """Unlike an optional-source 429, a core usage 429 must gate later cycles."""
    client = _FakeClient()
    until = datetime.now(UTC) + timedelta(days=1)
    client.usage_result = CodexHttpError(429, until)
    coordinator = _coordinator(client)

    with pytest.raises(UpdateFailed):
        asyncio.run(coordinator._async_update_data())
    assert coordinator.sources["usage"].error_code == "rate_limited"
    assert coordinator._read_retry_at == until

    with pytest.raises(UpdateFailed):
        asyncio.run(coordinator._async_update_data())
    # The retry gate short-circuits before the client is called again.
    assert client.usage_calls == 1


def test_reset_details_429_does_not_stop_core_usage_or_profile_reads():
    """A reset_details-endpoint 429 must not poison the core usage retry gate."""
    client = _FakeClient()
    until = datetime.now(UTC) + timedelta(days=1)
    client.reset_result = CodexHttpError(429, until)
    coordinator = _coordinator(client)

    data = asyncio.run(coordinator._async_update_data())
    assert data.usage is client.usage_result
    assert client.profile_calls == 1
    assert coordinator.sources["reset_details"].retry_at == until
    assert coordinator._read_retry_at is None

    data = asyncio.run(coordinator._async_update_data())
    assert data.usage is client.usage_result
    assert client.usage_calls == 2
    # Profile's own hourly cadence (unrelated to this test) keeps it at 1 call here too.
    assert client.profile_calls == 1
    assert client.reset_calls == 1


def test_usage_authentication_failure_raises_config_entry_auth_failed():
    from homeassistant.exceptions import ConfigEntryAuthFailed

    client = _FakeClient()
    client.usage_result = CodexAuthenticationError()
    coordinator = _coordinator(client)

    with pytest.raises(ConfigEntryAuthFailed):
        asyncio.run(coordinator._async_update_data())
    assert coordinator.sources["usage"].error_code == "authentication"


def test_rotated_usage_credentials_propagate_to_same_cycle_optional_fetches():
    """A token rotated by the usage fetch must reach the profile/reset fetches in the same cycle."""
    client = _FakeClient()
    rotated = CodexCredentials(
        access_token="rotated-access",
        refresh_token="rotated-refresh",
        id_token="id",
        expires_at=9_999_999_999,
        account_id="workspace-1",
    )
    usage_payload = client.usage_result

    async def async_get_usage(credentials: CodexCredentials):
        client.usage_calls += 1
        return usage_payload, rotated

    seen_profile_credentials = []
    seen_reset_credentials = []

    async def async_get_profile(credentials: CodexCredentials) -> CodexProfileStats:
        client.profile_calls += 1
        seen_profile_credentials.append(credentials)
        return client.profile_result

    async def async_get_reset_credits(credentials: CodexCredentials) -> ResetCredits:
        client.reset_calls += 1
        seen_reset_credentials.append(credentials)
        return client.reset_result

    client.async_get_usage = async_get_usage
    client.async_get_profile = async_get_profile
    client.async_get_reset_credits = async_get_reset_credits
    coordinator = _coordinator(client)

    asyncio.run(coordinator._async_update_data())

    assert coordinator.credentials == rotated
    assert seen_profile_credentials == [rotated]
    assert seen_reset_credentials == [rotated]


def test_optional_503_does_not_stop_other_endpoint():
    client = _FakeClient()
    client.profile_result = CodexHttpError(503, datetime.now(UTC) + timedelta(days=1))
    coordinator = _coordinator(client)
    asyncio.run(coordinator._async_update_data())
    asyncio.run(coordinator._async_update_data())
    assert client.profile_calls == 1
    assert client.reset_calls == 1
    assert client.usage_calls == 2


def test_usage_503_cooldown_keeps_http_error_cause():
    client = _FakeClient()
    client.usage_result = CodexHttpError(503, datetime.now(UTC) + timedelta(days=1))
    coordinator = _coordinator(client)

    with pytest.raises(UpdateFailed):
        asyncio.run(coordinator._async_update_data())
    attempted_at = coordinator.sources["usage"].last_attempt
    with pytest.raises(UpdateFailed):
        asyncio.run(coordinator._async_update_data())

    assert coordinator.sources["usage"].error_code == "http_error"
    assert coordinator.sources["usage"].last_attempt == attempted_at


@pytest.mark.parametrize(
    ("result_attribute", "source"),
    [("profile_result", "profile"), ("reset_result", "reset_details")],
)
def test_optional_authentication_failure_keeps_authentication_cause(
    result_attribute: str, source: str
):
    client = _FakeClient()
    setattr(client, result_attribute, CodexAuthenticationError())
    coordinator = _coordinator(client)

    data = asyncio.run(coordinator._async_update_data())

    assert data.usage is client.usage_result
    assert coordinator.sources[source].error_code == "authentication"


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


def test_core_failure_updates_live_source_and_retains_success_timestamp() -> None:
    client = _FakeClient()
    coordinator = _coordinator(client)
    with patch("custom_components.codex_usage.coordinator.monotonic", return_value=100.0):
        asyncio.run(coordinator._async_update_data())
    successful = coordinator.sources["usage"].last_success
    client.usage_result = CodexConnectionError()
    with pytest.raises(UpdateFailed):
        asyncio.run(coordinator._async_update_data())
    assert coordinator.sources["usage"].state == "error"
    assert coordinator.sources["usage"].error_code == "connection"
    assert coordinator.sources["usage"].last_success == successful


def test_changed_usage_context_suppresses_unreconciled_detail_expiry() -> None:
    client = _FakeClient()
    coordinator = _coordinator(client)
    client.usage_result = parse_usage({"rate_limit_reset_credits": {"available_count": 1}})
    with patch("custom_components.codex_usage.coordinator.monotonic", return_value=100.0):
        first = asyncio.run(coordinator._async_update_data())
    client.usage_result = parse_usage({"rate_limit_reset_credits": {"available_count": 2}})
    coordinator._reset_next_attempt = 10_000
    with patch("custom_components.codex_usage.coordinator.monotonic", return_value=200.0):
        second = asyncio.run(coordinator._async_update_data())
    assert first.reset_summary is not None
    assert second.reset_summary is not None
    assert second.reset_summary.available_count == 2
    assert second.reset_summary.details_consistent is False
    assert second.reset_summary.next_expiry is None


def test_successful_refresh_stores_one_canonical_budget_observation() -> None:
    client = _FakeClient()
    observed_at = datetime(2026, 9, 5, 12, tzinfo=UTC)
    client.usage_result = parse_usage(
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
    coordinator = _coordinator(client)

    with (
        patch("custom_components.codex_usage.coordinator.datetime") as datetime_mock,
        patch("custom_components.codex_usage.coordinator.monotonic", return_value=100.0),
    ):
        datetime_mock.now.return_value = observed_at
        data = asyncio.run(coordinator._async_update_data())

    assert data.budgets["weekly"].budget_pph == pytest.approx(0.25)
    assert data.budgets["weekly"].calculated_at == observed_at


def test_changed_window_tuple_replaces_budget_atomically() -> None:
    client = _FakeClient()
    first_at = datetime(2026, 9, 5, 12, tzinfo=UTC)
    second_at = first_at + timedelta(minutes=5)
    client.usage_result = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 82,
                    "limit_window_seconds": 604_800,
                    "reset_at": (first_at + timedelta(hours=72)).timestamp(),
                }
            }
        }
    )
    coordinator = _coordinator(client)

    with (
        patch("custom_components.codex_usage.coordinator.datetime") as datetime_mock,
        patch("custom_components.codex_usage.coordinator.monotonic", return_value=100.0),
    ):
        datetime_mock.now.return_value = first_at
        first = asyncio.run(coordinator._async_update_data())
        client.usage_result = parse_usage(
            {
                "rate_limit": {
                    "primary_window": {
                        "used_percent": 0,
                        "limit_window_seconds": 604_800,
                        "reset_at": (second_at + timedelta(days=7)).timestamp(),
                    }
                }
            }
        )
        datetime_mock.now.return_value = second_at
        second = asyncio.run(coordinator._async_update_data())

    assert first.budgets["weekly"].budget_pph == pytest.approx(0.25)
    assert second.budgets["weekly"].budget_pph == pytest.approx(100 / 168)
    assert second.budgets["weekly"].calculated_at == second_at
