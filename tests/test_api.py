"""Tests for Codex response normalization."""

import asyncio
import base64
import json
import time
from datetime import UTC, datetime
from decimal import Decimal

import pytest

from custom_components.codex_usage.api import (
    CodexApiClient,
    CodexAuthenticationError,
    CodexCredentials,
    credentials_from_token_response,
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
        "User-Agent": "HomeAssistant-CodexUsage/0.3.2",
        "X-OpenAI-Fedramp": "true",
    }
