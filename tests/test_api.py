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
from custom_components.codex_usage.binary_sensor import _limit_reached


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
        "User-Agent": "HomeAssistant-CodexUsage/0.2.0",
        "X-OpenAI-Fedramp": "true",
    }
