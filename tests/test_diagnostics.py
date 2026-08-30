"""Tests for privacy-safe diagnostics."""

import asyncio
from types import SimpleNamespace

from custom_components.codex_usage.api import ResetCredit, ResetCredits, parse_usage
from custom_components.codex_usage.diagnostics import async_get_config_entry_diagnostics


def test_diagnostics_use_safe_allowlist() -> None:
    usage = parse_usage(
        {
            "plan_type": "plus",
            "rate_limit": {
                "primary_window": {
                    "used_percent": 27,
                    "limit_window_seconds": 604_800,
                    "reset_at": 1_800_000_000,
                }
            },
            "credits": {"balance": "12.50", "has_credits": True},
        }
    )
    reset = ResetCredits(
        1,
        2,
        (ResetCredit("weekly", "available", None, None),),
    )
    coordinator = SimpleNamespace(
        last_update_success=True,
        profile_available=False,
        profile_last_success=None,
        profile_last_error="CodexProfileUnavailable",
        reset_available=True,
        reset_last_success=None,
        reset_last_error=None,
        data=SimpleNamespace(usage=usage, profile=None, reset_credits=reset),
    )
    entry = SimpleNamespace(
        data={
            "access_token": "secret",
            "refresh_token": "secret",
            "id_token": "secret",
            "account_id": "private-account",
            "user_id": "private-user",
            "expires_at": 1_800_000_000,
            "fedramp": False,
            "future_sensitive_field": "future-entry-secret",
        },
        options={
            "update_interval": 300,
            "future_sensitive_option": "future-option-secret",
        },
        runtime_data=coordinator,
    )

    diagnostics = asyncio.run(async_get_config_entry_diagnostics(None, entry))  # type: ignore[arg-type]

    assert diagnostics["data"] == {
        "plan": "plus",
        "limits": [
            {
                "id": "codex",
                "name": "Codex",
                "duration_minutes": 10_080,
                "used_percent": 27.0,
                "resets_at": usage.weekly_window.resets_at,
                "reached": None,
            }
        ],
        "blocker_reason": None,
        "credit_available": True,
        "spend_limit_reached": None,
        "reset_credit_count": 1,
    }
    assert diagnostics["entry"] == {"expires_at": 1_800_000_000, "fedramp": False}
    assert diagnostics["options"] == {"update_interval": 300}
    rendered = repr(diagnostics)
    assert "secret" not in rendered
    assert "private-account" not in rendered
    assert "private-user" not in rendered
    assert "future-entry-secret" not in rendered
    assert "future-option-secret" not in rendered
    assert "weekly" not in rendered
