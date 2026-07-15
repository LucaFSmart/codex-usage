"""Tests for workspace selection and config-entry storage."""

import asyncio
import base64
import json
import time
from types import SimpleNamespace
from unittest.mock import MagicMock

from custom_components.codex_usage import async_migrate_entry
from custom_components.codex_usage.api import (
    AvailableAccount,
    CodexCredentials,
    credentials_from_token_response,
)
from custom_components.codex_usage.config_flow import (
    preserve_reauth_workspace,
    workspace_choices,
)
from custom_components.codex_usage.coordinator import credentials_to_entry_data


def _jwt(payload: dict[str, object]) -> str:
    encoded = base64.urlsafe_b64encode(json.dumps(payload).encode()).rstrip(b"=").decode()
    return f"header.{encoded}.signature"


def test_refresh_preserves_explicitly_selected_workspace() -> None:
    previous = CodexCredentials(
        access_token="old-access",
        refresh_token="old-refresh",
        id_token="old-id",
        expires_at=time.time() - 1,
        account_id="selected-workspace",
        user_id="user-1",
    )

    refreshed = credentials_from_token_response(
        {
            "access_token": _jwt(
                {"chatgpt_account_id": "token-default", "exp": int(time.time()) + 3600}
            ),
            "refresh_token": "new-refresh",
            "id_token": _jwt({"https://api.openai.com/auth": {"chatgpt_user_id": "user-1"}}),
        },
        previous,
    )

    assert refreshed.account_id == "selected-workspace"


def test_config_entry_storage_omits_email_and_claim_plan() -> None:
    credentials = CodexCredentials(
        access_token="access",
        refresh_token="refresh",
        id_token="id",
        expires_at=123.0,
        account_id="workspace",
        user_id="user",
        email="private@example.com",
        plan_type="plus",
    )

    data = credentials_to_entry_data(credentials)

    assert "email" not in data
    assert "plan_type" not in data


def test_workspace_choices_use_names_without_exposing_ids_as_labels() -> None:
    choices = workspace_choices(
        (
            AvailableAccount("private-id-a", "Alpha", "personal"),
            AvailableAccount("private-id-b", None, "business"),
        )
    )

    assert choices == {
        "private-id-a": "Alpha · personal",
        "private-id-b": "Workspace 2 · business",
    }


def test_reauth_preserves_workspace_when_account_discovery_is_unavailable() -> None:
    credentials = CodexCredentials(
        access_token="access",
        refresh_token="refresh",
        id_token="id",
        expires_at=123.0,
        account_id="token-default",
        user_id="user",
    )

    preserved = preserve_reauth_workspace(credentials, "configured-workspace")

    assert preserved.account_id == "configured-workspace"
    assert credentials.account_id == "token-default"


def test_migration_removes_legacy_identity_claims() -> None:
    hass = SimpleNamespace(config_entries=SimpleNamespace(async_update_entry=MagicMock()))
    entry = SimpleNamespace(
        version=1,
        data={
            "account_id": "workspace",
            "email": "private@example.com",
            "plan_type": "plus",
            "access_token": "token",
        },
    )

    assert asyncio.run(async_migrate_entry(hass, entry)) is True
    hass.config_entries.async_update_entry.assert_called_once_with(
        entry,
        data={"account_id": "workspace", "access_token": "token"},
        version=3,
    )


def test_migration_replaces_exact_legacy_generated_title() -> None:
    hass = SimpleNamespace(config_entries=SimpleNamespace(async_update_entry=MagicMock()))
    entry = SimpleNamespace(
        version=2,
        title="Codex Usage (4657ca9f-b1ec-47d8-b82a-de968c0d5362 - Plus)",
        data={"account_id": "4657ca9f-b1ec-47d8-b82a-de968c0d5362"},
    )

    assert asyncio.run(async_migrate_entry(hass, entry)) is True
    hass.config_entries.async_update_entry.assert_called_once_with(
        entry,
        data={"account_id": "4657ca9f-b1ec-47d8-b82a-de968c0d5362"},
        title="Codex Usage",
        version=3,
    )


def test_migration_preserves_user_defined_title() -> None:
    hass = SimpleNamespace(config_entries=SimpleNamespace(async_update_entry=MagicMock()))
    entry = SimpleNamespace(
        version=2,
        title="Luca Arbeit",
        data={"account_id": "workspace"},
    )

    assert asyncio.run(async_migrate_entry(hass, entry)) is True
    hass.config_entries.async_update_entry.assert_called_once_with(
        entry,
        data={"account_id": "workspace"},
        version=3,
    )


def test_migration_preserves_user_title_that_only_resembles_legacy_format() -> None:
    hass = SimpleNamespace(config_entries=SimpleNamespace(async_update_entry=MagicMock()))
    entry = SimpleNamespace(
        version=2,
        title="Codex Usage (Work - Plus)",
        data={"account_id": "workspace"},
    )

    assert asyncio.run(async_migrate_entry(hass, entry)) is True
    hass.config_entries.async_update_entry.assert_called_once_with(
        entry,
        data={"account_id": "workspace"},
        version=3,
    )
