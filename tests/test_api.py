"""Tests for Codex response normalization."""

import asyncio
import base64
import json
import time
from dataclasses import fields
from datetime import UTC, datetime, timedelta
from decimal import Decimal

import pytest

from custom_components.codex_usage.api import (
    AvailableAccount,
    CodexApiClient,
    CodexAuthenticationError,
    CodexCredentials,
    CodexOptionalEndpointUnavailable,
    CodexProfileUnavailable,
    ResetCredits,
    credentials_from_token_response,
    parse_accounts,
    parse_profile,
    parse_reset_credits,
    parse_usage,
)
from custom_components.codex_usage.binary_sensor import BINARY_SENSORS, _limit_reached
from custom_components.codex_usage.sensor import SENSORS


def _jwt(payload: dict[str, object]) -> str:
    encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=").decode()
    return f"header.{encoded}.signature"


class _FakeResponse:
    def __init__(self, status: int, payload: object) -> None:
        self.status = status
        self._payload = payload

    async def __aenter__(self) -> _FakeResponse:
        return self

    async def __aexit__(self, *args: object) -> None:
        return None

    async def json(self, *, content_type: str | None = None) -> object:
        return self._payload


class _FakeSession:
    def __init__(self, response: _FakeResponse) -> None:
        self.response = response
        self.last_url: str | None = None
        self.last_headers: dict[str, str] | None = None

    def get(self, url: str, **kwargs: object) -> _FakeResponse:
        self.last_url = url
        self.last_headers = kwargs.get("headers")  # type: ignore[assignment]
        return self.response


def test_parse_full_usage_response() -> None:
    payload = {
        "plan_type": "plus",
        "rate_limit": {
            "allowed": True,
            "limit_reached": False,
            "primary_window": {
                "used_percent": 25,
                "limit_window_seconds": 18_001,
                "reset_after_seconds": 100,
                "reset_at": 1_800_000_000,
            },
            "secondary_window": {
                "used_percent": 40,
                "limit_window_seconds": 604_800,
                "reset_after_seconds": 200,
                "reset_at": 1_800_086_400,
            },
        },
        "credits": {"has_credits": True, "unlimited": False, "balance": "12.50"},
        "spend_control": {
            "reached": False,
            "individual_limit": {
                "source": "user",
                "limit": "100",
                "used": "25",
                "remaining": "75",
                "used_percent": 25,
                "remaining_percent": 75,
                "reset_at": 1_800_000_000,
            },
        },
        "additional_rate_limits": [
            {
                "limit_name": "Image generation",
                "metered_feature": "image_generation",
                "rate_limit": {
                    "allowed": True,
                    "limit_reached": False,
                    "primary_window": {
                        "used_percent": 10,
                        "limit_window_seconds": 3600,
                        "reset_after_seconds": 10,
                        "reset_at": 1_800_000_000,
                    },
                },
            }
        ],
    }

    data = parse_usage(payload)

    assert data.plan_type == "plus"
    assert data.main_limit.primary is not None
    assert data.main_limit.primary.used_percent == 25
    assert data.main_limit.primary.remaining_percent == 75
    assert data.main_limit.primary.window_minutes == 301
    assert data.main_limit.primary.resets_at == datetime.fromtimestamp(1_800_000_000, tz=UTC)
    assert data.main_limit.secondary is not None
    assert data.main_limit.secondary.window_minutes == 10_080
    assert data.credits is not None
    assert data.credits.balance == Decimal("12.50")
    assert data.spend_limit is not None
    assert data.spend_limit.remaining == Decimal("75")
    assert data.additional_limits[0].limit_id == "image_generation"


def test_parse_sparse_usage_response() -> None:
    data = parse_usage({"plan_type": "free", "rate_limit": None})

    assert data.plan_type == "free"
    assert data.main_limit.primary is None
    assert data.main_limit.secondary is None
    assert data.additional_limits == ()
    assert data.credits is None
    assert data.spend_limit is None


@pytest.mark.parametrize(
    "plan",
    [
        "guest",
        "free",
        "go",
        "plus",
        "pro",
        "prolite",
        "free_workspace",
        "team",
        "self_serve_business_usage_based",
        "business",
        "enterprise_cbp_usage_based",
        "education",
        "quorum",
        "k12",
        "enterprise",
        "edu",
        "unknown",
        "future-plan",
    ],
)
def test_plan_labels_never_control_reported_capabilities(plan: str) -> None:
    data = parse_usage(
        {
            "plan_type": plan,
            "rate_limit": {
                "primary_window": {
                    "used_percent": 23,
                    "limit_window_seconds": 2_592_000,
                }
            },
        }
    )

    assert data.plan_type == plan
    assert data.main_limit.primary is not None
    assert data.main_limit.primary.window_minutes == 43_200
    assert data.additional_limits[0].limit_id == "codex_43200m"


def test_weekly_only_primary_window_is_resolved_by_duration() -> None:
    data = parse_usage(
        {
            "plan_type": "plus",
            "rate_limit": {
                "allowed": True,
                "limit_reached": False,
                "primary_window": {
                    "used_percent": 17,
                    "limit_window_seconds": 604_800,
                    "reset_at": 1_800_000_000,
                },
                "secondary_window": None,
            },
        }
    )

    assert data.five_hour_window is None
    assert data.weekly_window is not None
    assert data.weekly_window.used_percent == 17
    assert data.weekly_window.duration_key == "weekly"


def test_windows_are_resolved_independently_of_backend_position() -> None:
    data = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 40,
                    "limit_window_seconds": 604_800,
                },
                "secondary_window": {
                    "used_percent": 25,
                    "limit_window_seconds": 18_001,
                },
            }
        }
    )

    assert data.five_hour_window is not None
    assert data.five_hour_window.used_percent == 25
    assert data.weekly_window is not None
    assert data.weekly_window.used_percent == 40


def test_parse_new_read_only_usage_fields_and_unknown_windows() -> None:
    data = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 12,
                    "limit_window_seconds": 86_400,
                }
            },
            "code_review_rate_limit": {
                "allowed": True,
                "limit_reached": False,
                "primary_window": {
                    "used_percent": 8,
                    "limit_window_seconds": 604_800,
                },
            },
            "credits": {
                "has_credits": True,
                "unlimited": False,
                "balance": "5",
                "overage_limit_reached": True,
            },
            "rate_limit_reset_credits": {"available_count": 2},
        }
    )

    assert data.available_reset_credits == 2
    assert data.credits is not None
    assert data.credits.overage_limit_reached is True
    assert {limit.limit_id for limit in data.additional_limits} == {
        "codex_1440m",
        "code_review",
    }
    code_review = next(limit for limit in data.additional_limits if limit.limit_id == "code_review")
    assert code_review.name == "Code review"
    assert code_review.primary is not None
    assert code_review.primary.duration_key == "weekly"
    unknown = next(limit for limit in data.additional_limits if limit.limit_id == "codex_1440m")
    assert unknown.primary is not None
    assert unknown.primary.duration_label == "Daily"


def test_static_entities_use_resolved_windows_and_new_read_only_fields() -> None:
    data = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 17,
                    "limit_window_seconds": 604_800,
                    "reset_at": 1_800_000_000,
                }
            },
            "credits": {
                "has_credits": True,
                "unlimited": False,
                "overage_limit_reached": False,
            },
            "rate_limit_reset_credits": {"available_count": 3},
        }
    )
    sensors = {description.key: description for description in SENSORS}
    binary_sensors = {description.key: description for description in BINARY_SENSORS}

    assert sensors["five_hour_usage"].value_fn(data) is None
    assert sensors["weekly_usage"].value_fn(data) == 17
    assert sensors["available_reset_credits"].value_fn(data) == 3
    assert binary_sensors["credits_overage_limit_reached"].value_fn(data) is False


@pytest.mark.parametrize("value", [-1, 1.5, True, "invalid", None])
def test_invalid_reset_credit_counts_are_unavailable(value: object) -> None:
    data = parse_usage({"rate_limit_reset_credits": {"available_count": value}})

    assert data.available_reset_credits is None


def test_parse_invalid_optional_numbers_as_unavailable() -> None:
    data = parse_usage(
        {
            "plan_type": "business",
            "spend_control": {
                "reached": False,
                "individual_limit": {
                    "limit": "invalid",
                    "used": None,
                    "remaining": "20",
                    "used_percent": "invalid",
                    "remaining_percent": 20,
                },
            },
        }
    )

    assert data.spend_limit is not None
    assert data.spend_limit.limit is None
    assert data.spend_limit.used_percent is None
    assert data.spend_limit.remaining_percent == 20


def test_malformed_display_labels_never_stringify_raw_backend_objects() -> None:
    data = parse_usage(
        {
            "plan_type": {"private": "plan"},
            "additional_rate_limits": [
                {
                    "metered_feature": {"private": "id"},
                    "limit_name": {"private": "name"},
                    "rate_limit": {
                        "primary_window": {
                            "used_percent": 10,
                            "limit_window_seconds": 604_800,
                        }
                    },
                }
            ],
            "spend_control": {"individual_limit": {"source": {"private": "scope"}, "limit": "10"}},
        }
    )

    assert data.plan_type == "unknown"
    assert data.additional_limits[0].limit_id == "additional"
    assert data.additional_limits[0].name == "Additional"
    assert data.spend_limit is not None and data.spend_limit.source is None
    assert "private" not in repr(data)


def test_parse_non_finite_numbers_as_unavailable() -> None:
    data = parse_usage(
        {
            "credits": {"has_credits": True, "unlimited": False, "balance": "NaN"},
            "rate_limit": {
                "primary_window": {
                    "used_percent": "Infinity",
                    "limit_window_seconds": 300,
                    "reset_at": 1_800_000_000,
                }
            },
        }
    )

    assert data.credits is not None
    assert data.credits.balance is None
    assert data.main_limit.primary is None


@pytest.mark.parametrize("value", [-1, 101, True, "Infinity", "NaN"])
def test_rate_limit_percentages_are_bounded(value: object) -> None:
    data = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": value,
                    "limit_window_seconds": 604_800,
                }
            }
        }
    )

    assert data.main_limit.primary is None


def test_unknown_duration_main_window_is_preserved() -> None:
    data = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 42,
                    "limit_window_seconds": None,
                }
            }
        }
    )

    assert data.main_limit.primary is not None
    assert data.main_limit.primary.duration_key == "unknown"
    assert any(limit.limit_id == "codex_unknown_primary" for limit in data.additional_limits)


@pytest.mark.parametrize("duration", [-1, 0, "invalid", float("inf")])
def test_invalid_window_duration_keeps_valid_usage(duration: object) -> None:
    data = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 42,
                    "limit_window_seconds": duration,
                }
            }
        }
    )

    assert data.main_limit.primary is not None
    assert data.main_limit.primary.used_percent == 42
    assert data.main_limit.primary.window_minutes is None


def test_integral_float_window_duration_is_accepted() -> None:
    data = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 42,
                    "limit_window_seconds": 604_800.0,
                }
            }
        }
    )

    assert data.weekly_window is not None


@pytest.mark.parametrize("reset_at", [float("inf"), float("-inf"), 10**100])
def test_invalid_reset_timestamp_is_ignored(reset_at: object) -> None:
    data = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 42,
                    "limit_window_seconds": 604_800,
                    "reset_at": reset_at,
                }
            }
        }
    )

    assert data.weekly_window is not None
    assert data.weekly_window.resets_at is None


def test_window_reset_falls_back_to_relative_seconds() -> None:
    before = datetime.now(UTC)
    data = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 42,
                    "limit_window_seconds": 604_800,
                    "reset_after_seconds": 3_600,
                }
            }
        }
    )

    assert data.weekly_window is not None
    assert data.weekly_window.resets_at is not None
    assert before + timedelta(seconds=3_600) <= data.weekly_window.resets_at
    assert data.weekly_window.resets_at <= datetime.now(UTC) + timedelta(seconds=3_600)


def test_absolute_reset_timestamp_wins_over_relative_seconds() -> None:
    data = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 42,
                    "limit_window_seconds": 604_800,
                    "reset_at": 1_800_000_000,
                    "reset_after_seconds": 3_600,
                }
            }
        }
    )

    assert data.weekly_window is not None
    assert data.weekly_window.resets_at == datetime.fromtimestamp(1_800_000_000, tz=UTC)


@pytest.mark.parametrize(
    "reset_after_seconds", [True, -1, None, float("inf"), "not-a-number", {"seconds": 60}]
)
def test_invalid_relative_reset_offsets_are_ignored(reset_after_seconds: object) -> None:
    data = parse_usage(
        {
            "rate_limit": {
                "primary_window": {
                    "used_percent": 42,
                    "limit_window_seconds": 604_800,
                    "reset_after_seconds": reset_after_seconds,
                }
            }
        }
    )

    assert data.weekly_window is not None
    assert data.weekly_window.resets_at is None


def test_spend_limit_reset_falls_back_to_relative_seconds() -> None:
    before = datetime.now(UTC)
    data = parse_usage(
        {
            "rate_limit": {"allowed": True, "limit_reached": False},
            "spend_control": {
                "reached": False,
                "individual_limit": {
                    "source": "user",
                    "limit": "100",
                    "used": "25",
                    "remaining": "75",
                    "used_percent": 25,
                    "remaining_percent": 75,
                    "reset_after_seconds": 900,
                },
            },
        }
    )

    assert data.spend_limit is not None
    assert data.spend_limit.resets_at is not None
    assert before + timedelta(seconds=900) <= data.spend_limit.resets_at
    assert data.spend_limit.resets_at <= datetime.now(UTC) + timedelta(seconds=900)


def test_allowed_false_sets_safe_blocker_reason() -> None:
    data = parse_usage(
        {
            "rate_limit": {"allowed": False, "limit_reached": False},
            "rate_limit_reached_type": {"type": "workspace_spend_limit_reached"},
        }
    )

    assert _limit_reached(data) is True
    assert data.blocker_reason == "spend"


def test_explicit_spend_limit_signal_sets_safe_blocker_reason() -> None:
    data = parse_usage({"spend_control": {"reached": True}})

    assert data.blocker_reason == "spend"


def test_explicit_credit_limit_signal_sets_safe_blocker_reason() -> None:
    data = parse_usage(
        {
            "credits": {
                "has_credits": True,
                "unlimited": False,
                "overage_limit_reached": True,
            }
        }
    )

    assert data.blocker_reason == "credits"


def test_parse_accounts_accepts_list_and_map_shapes() -> None:
    list_result = parse_accounts(
        {
            "accounts": [
                {"id": "workspace-a", "name": "Alpha", "structure": "personal"},
                {"account_id": "workspace-b", "name": "Beta", "structure": "workspace"},
            ]
        }
    )
    map_result = parse_accounts(
        {"accounts": {"workspace-c": {"name": "Gamma", "structure": "business"}}}
    )

    assert list_result == (
        AvailableAccount("workspace-a", "Alpha", "personal"),
        AvailableAccount("workspace-b", "Beta", "workspace"),
    )
    assert map_result == (AvailableAccount("workspace-c", "Gamma", "business"),)


def test_parse_accounts_accepts_nested_map_and_backend_ordering() -> None:
    result = parse_accounts(
        {
            "accounts": {
                "lookup-a": {
                    "account": {
                        "account_id": "workspace-a",
                        "name": "Alpha",
                        "structure": "personal",
                        "profile_picture_url": "https://example.invalid/private.png",
                    }
                },
                "lookup-b": {
                    "account": {
                        "account_id": "workspace-b",
                        "name": "Beta",
                        "structure": "business",
                    }
                },
            },
            "account_ordering": ["lookup-b", "lookup-a"],
        }
    )

    assert result == (
        AvailableAccount("workspace-b", "Beta", "business"),
        AvailableAccount("workspace-a", "Alpha", "personal"),
    )
    assert "profile_picture" not in repr(result)


def test_parse_reset_credits_discards_private_fields() -> None:
    result = parse_reset_credits(
        {
            "available_count": 1,
            "total_earned_count": 2,
            "credits": [
                {
                    "id": "private-credit-id",
                    "reset_type": "weekly",
                    "status": "available",
                    "granted_at": "2026-07-01T00:00:00Z",
                    "expires_at": "2026-08-01T00:00:00Z",
                    "title": "Private title",
                    "description": "Private description",
                }
            ],
        }
    )

    assert isinstance(result, ResetCredits)
    assert result.available_count == 1
    assert result.total_earned_count == 2
    assert result.credits[0].reset_type == "weekly"
    assert result.credits[0].expires_at == datetime(2026, 8, 1, tzinfo=UTC)
    assert set(result.credits[0].__dataclass_fields__) == {
        "reset_type",
        "status",
        "granted_at",
        "expires_at",
    }


def test_credentials_extract_workspace_and_user() -> None:
    expires_at = int(time.time()) + 3600
    credentials = credentials_from_token_response(
        {
            "access_token": _jwt({"chatgpt_account_id": "workspace-1", "exp": expires_at}),
            "refresh_token": "refresh",
            "id_token": _jwt(
                {
                    "email": "user@example.com",
                    "https://api.openai.com/auth": {
                        "chatgpt_user_id": "user-1",
                        "chatgpt_plan_type": "plus",
                    },
                }
            ),
        }
    )

    assert credentials.account_id == "workspace-1"
    assert credentials.user_id == "user-1"
    assert credentials.email == "user@example.com"
    assert credentials.plan_type == "plus"
    assert credentials.expires_at == expires_at


def test_credentials_reject_missing_workspace() -> None:
    with pytest.raises(CodexAuthenticationError):
        credentials_from_token_response(
            {
                "access_token": _jwt({"exp": int(time.time()) + 3600}),
                "refresh_token": "refresh",
                "id_token": _jwt({"email": "user@example.com"}),
            }
        )


def test_missing_limit_state_stays_unavailable() -> None:
    data = parse_usage({"plan_type": "free", "rate_limit": None})
    assert _limit_reached(data) is None


def test_explicit_limit_state_is_reported() -> None:
    data = parse_usage(
        {
            "rate_limit": {"allowed": False, "limit_reached": True},
            "rate_limit_reached_type": {"type": "rate_limit_reached"},
        }
    )
    assert _limit_reached(data) is True


def test_additional_limit_state_is_included_in_overall_status() -> None:
    data = parse_usage(
        {
            "rate_limit": {"limit_reached": False},
            "code_review_rate_limit": {"limit_reached": True},
        }
    )

    assert _limit_reached(data) is True


def test_usage_request_sends_workspace_and_fedramp_headers() -> None:
    session = _FakeSession(_FakeResponse(200, {"plan_type": "enterprise"}))
    credentials = CodexCredentials(
        access_token="access-token",
        refresh_token="refresh-token",
        id_token="id-token",
        expires_at=time.time() + 3600,
        account_id="workspace-1",
        fedramp=True,
    )

    data, returned_credentials = asyncio.run(
        CodexApiClient(session).async_get_usage(credentials)  # type: ignore[arg-type]
    )

    assert data.plan_type == "enterprise"
    assert returned_credentials is credentials
    assert session.last_headers == {
        "Authorization": "Bearer access-token",
        "ChatGPT-Account-Id": "workspace-1",
        "User-Agent": "HomeAssistant-CodexUsage/0.5.3",
        "X-OpenAI-Fedramp": "true",
    }


def test_parse_profile_keeps_only_supported_aggregate_statistics() -> None:
    data = parse_profile(
        {
            "profile": {
                "display_name": "Private name",
                "username": "private-user",
                "profile_picture_url": "https://example.invalid/private.png",
            },
            "stats": {
                "lifetime_tokens": 2_863_467_305,
                "peak_daily_tokens": 138_574_029,
                "current_streak_days": 1,
                "longest_streak_days": 9,
                "total_threads": 340,
                "longest_running_turn_sec": 4_235,
                "fast_mode_usage_percentage": 12.5,
                "total_skills_used": 558,
                "unique_skills_used": 42,
                "most_used_reasoning_effort": "high",
                "most_used_reasoning_effort_percentage": 84.7,
                "daily_usage_buckets": [{"date": "private"}],
                "weekly_usage_buckets": [{"week": "private"}],
                "top_invocations": [{"name": "private invocation"}],
            },
        }
    )

    assert data.lifetime_tokens == 2_863_467_305
    assert data.peak_daily_tokens == 138_574_029
    assert data.current_streak_days == 1
    assert data.longest_streak_days == 9
    assert data.total_threads == 340
    assert data.longest_running_turn_sec == 4_235
    assert data.fast_mode_usage_percentage == 12.5
    assert data.total_skills_used == 558
    assert data.unique_skills_used == 42
    assert data.most_used_reasoning_effort == "high"
    assert data.most_used_reasoning_effort_percentage == 84.7
    assert set(data.__dataclass_fields__) == {
        "lifetime_tokens",
        "peak_daily_tokens",
        "current_streak_days",
        "longest_streak_days",
        "total_threads",
        "longest_running_turn_sec",
        "fast_mode_usage_percentage",
        "total_skills_used",
        "unique_skills_used",
        "most_used_reasoning_effort",
        "most_used_reasoning_effort_percentage",
    }


def test_parse_profile_rejects_malformed_optional_statistics() -> None:
    data = parse_profile(
        {
            "stats": {
                "lifetime_tokens": -1,
                "peak_daily_tokens": True,
                "current_streak_days": 1.5,
                "longest_streak_days": "9",
                "total_threads": None,
                "longest_running_turn_sec": -10,
                "fast_mode_usage_percentage": "NaN",
                "total_skills_used": -2,
                "unique_skills_used": False,
                "most_used_reasoning_effort": "",
                "most_used_reasoning_effort_percentage": 101,
            }
        }
    )

    assert all(getattr(data, field.name) is None for field in fields(data))


def test_profile_request_sends_workspace_and_fedramp_headers() -> None:
    session = _FakeSession(_FakeResponse(200, {"stats": {"total_threads": 10}}))
    credentials = CodexCredentials(
        access_token="access-token",
        refresh_token="refresh-token",
        id_token="id-token",
        expires_at=time.time() + 3600,
        account_id="workspace-1",
        fedramp=True,
    )

    data = asyncio.run(CodexApiClient(session).async_get_profile(credentials))  # type: ignore[arg-type]

    assert data.total_threads == 10
    assert session.last_url == "https://chatgpt.com/backend-api/wham/profiles/me"
    assert session.last_headers == {
        "Authorization": "Bearer access-token",
        "ChatGPT-Account-Id": "workspace-1",
        "User-Agent": "HomeAssistant-CodexUsage/0.5.3",
        "X-OpenAI-Fedramp": "true",
        "Cache-Control": "no-store",
    }


def test_account_request_uses_read_only_endpoint() -> None:
    session = _FakeSession(
        _FakeResponse(200, {"accounts": [{"id": "workspace-1", "name": "Alpha"}]})
    )
    credentials = CodexCredentials(
        access_token="access-token",
        refresh_token="refresh-token",
        id_token="id-token",
        expires_at=time.time() + 3600,
        account_id="workspace-1",
    )

    accounts = asyncio.run(CodexApiClient(session).async_get_accounts(credentials))  # type: ignore[arg-type]

    assert accounts == (AvailableAccount("workspace-1", "Alpha", None),)
    assert session.last_url == "https://chatgpt.com/backend-api/wham/accounts/check"
    assert session.last_headers == {
        "Authorization": "Bearer access-token",
        "ChatGPT-Account-Id": "workspace-1",
        "User-Agent": "HomeAssistant-CodexUsage/0.5.3",
        "Cache-Control": "no-store",
    }


def test_reset_credit_request_uses_read_only_endpoint() -> None:
    session = _FakeSession(_FakeResponse(200, {"available_count": 2, "credits": []}))
    credentials = CodexCredentials(
        access_token="access-token",
        refresh_token="refresh-token",
        id_token="id-token",
        expires_at=time.time() + 3600,
        account_id="workspace-1",
    )

    result = asyncio.run(CodexApiClient(session).async_get_reset_credits(credentials))  # type: ignore[arg-type]

    assert result.available_count == 2
    assert session.last_url.endswith("/wham/rate-limit-reset-credits")


@pytest.mark.parametrize("method", ["async_get_accounts", "async_get_reset_credits"])
def test_optional_read_endpoints_report_unavailable(method: str) -> None:
    session = _FakeSession(_FakeResponse(404, {"detail": "not available"}))
    credentials = CodexCredentials(
        access_token="access-token",
        refresh_token="refresh-token",
        id_token="id-token",
        expires_at=time.time() + 3600,
        account_id="workspace-1",
    )

    with pytest.raises(CodexOptionalEndpointUnavailable):
        asyncio.run(getattr(CodexApiClient(session), method)(credentials))  # type: ignore[arg-type]


@pytest.mark.parametrize("status", [403, 404])
def test_profile_request_reports_unavailable_endpoint(status: int) -> None:
    session = _FakeSession(_FakeResponse(status, {"detail": "disabled"}))
    credentials = CodexCredentials(
        access_token="access-token",
        refresh_token="refresh-token",
        id_token="id-token",
        expires_at=time.time() + 3600,
        account_id="workspace-1",
    )

    with pytest.raises(CodexProfileUnavailable):
        asyncio.run(CodexApiClient(session).async_get_profile(credentials))  # type: ignore[arg-type]
