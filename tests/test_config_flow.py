"""Tests for workspace selection and config-entry storage."""

import asyncio
import base64
import json
import time
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, PropertyMock, patch

from custom_components.codex_usage import async_migrate_entry
from custom_components.codex_usage.api import (
    AvailableAccount,
    CodexCredentials,
    credentials_from_token_response,
)
from custom_components.codex_usage.config_flow import (
    CodexUsageConfigFlow,
    preserve_reauth_workspace,
    workspace_choices,
)
from custom_components.codex_usage.coordinator import credentials_to_entry_data


def test_options_offer_enabled_optional_sources_for_existing_entries():
    from custom_components.codex_usage.config_flow import CodexUsageOptionsFlow

    flow = CodexUsageOptionsFlow()
    flow.async_show_form = MagicMock(side_effect=lambda **kwargs: kwargs)
    with patch.object(CodexUsageOptionsFlow, "config_entry", new_callable=PropertyMock) as entry:
        entry.return_value = SimpleNamespace(options={})
        result = asyncio.run(flow.async_step_init())
    values = result["data_schema"]({})
    assert values == {"update_interval": 300, "fetch_profile": True, "fetch_reset_details": True}


def test_options_flow_uses_home_assistant_automatic_reload() -> None:
    from custom_components.codex_usage.config_flow import CodexUsageOptionsFlow

    assert CodexUsageOptionsFlow.automatic_reload is True


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


def test_reauth_accepts_a_newly_available_user_claim() -> None:
    async def exercise() -> tuple[object, AsyncMock]:
        credentials = CodexCredentials(
            access_token="access",
            refresh_token="refresh",
            id_token="id",
            expires_at=123.0,
            account_id="token-workspace",
            user_id="user",
        )
        entry = SimpleNamespace(
            data={"account_id": "configured-workspace", "user_id": None},
            unique_id="configured-workspace",
        )
        finish = AsyncMock(return_value={"type": "done"})
        flow = CodexUsageConfigFlow()
        flow._reauth_entry = entry
        flow._async_finish_workspace = finish
        flow.async_abort = MagicMock(return_value={"type": "abort"})
        client = SimpleNamespace(async_get_accounts=AsyncMock(return_value=()))
        with patch.object(CodexUsageConfigFlow, "_client", new_callable=PropertyMock) as api:
            api.return_value = client
            result = await flow._async_prepare_workspace(credentials, reauth=True)
        return result, finish

    result, finish = asyncio.run(exercise())

    assert result == {"type": "done"}
    passed_credentials = finish.await_args.args[0]
    assert passed_credentials.account_id == "configured-workspace"
    assert passed_credentials.user_id == "user"


def test_reauth_retains_a_previously_verified_user_claim_when_new_claim_is_missing() -> None:
    async def exercise() -> tuple[object, AsyncMock]:
        credentials = CodexCredentials(
            access_token="access",
            refresh_token="refresh",
            id_token="id",
            expires_at=123.0,
            account_id="token-workspace",
            user_id=None,
        )
        entry = SimpleNamespace(
            data={"account_id": "configured-workspace", "user_id": "user"},
            unique_id="configured-workspace:user",
        )
        finish = AsyncMock(return_value={"type": "done"})
        flow = CodexUsageConfigFlow()
        flow._reauth_entry = entry
        flow._async_finish_workspace = finish
        flow.async_abort = MagicMock(return_value={"type": "abort"})
        client = SimpleNamespace(async_get_accounts=AsyncMock(return_value=()))
        with patch.object(CodexUsageConfigFlow, "_client", new_callable=PropertyMock) as api:
            api.return_value = client
            result = await flow._async_prepare_workspace(credentials, reauth=True)
        return result, finish

    result, finish = asyncio.run(exercise())

    assert result == {"type": "done"}
    passed_credentials = finish.await_args.args[0]
    assert passed_credentials.account_id == "configured-workspace"
    assert passed_credentials.user_id == "user"


def test_reauth_still_rejects_a_different_verified_user() -> None:
    async def exercise() -> object:
        credentials = CodexCredentials(
            access_token="access",
            refresh_token="refresh",
            id_token="id",
            expires_at=123.0,
            account_id="token-workspace",
            user_id="different-user",
        )
        entry = SimpleNamespace(
            data={"account_id": "configured-workspace", "user_id": "verified-user"},
            unique_id="configured-workspace:verified-user",
        )
        flow = CodexUsageConfigFlow()
        flow._reauth_entry = entry
        flow._async_finish_workspace = AsyncMock(return_value={"type": "done"})
        flow.async_abort = MagicMock(return_value={"type": "abort", "reason": "wrong_account"})
        client = SimpleNamespace(async_get_accounts=AsyncMock(return_value=()))
        with patch.object(CodexUsageConfigFlow, "_client", new_callable=PropertyMock) as api:
            api.return_value = client
            return await flow._async_prepare_workspace(credentials, reauth=True)

    assert asyncio.run(exercise()) == {"type": "abort", "reason": "wrong_account"}


def test_reauth_requests_one_explicit_reload() -> None:
    async def exercise() -> tuple[object, MagicMock, MagicMock]:
        credentials = CodexCredentials(
            access_token="access",
            refresh_token="refresh",
            id_token="id",
            expires_at=123.0,
            account_id="configured-workspace",
            user_id="user",
        )
        entry = SimpleNamespace(
            data={"account_id": "configured-workspace", "user_id": "user"},
            unique_id="configured-workspace:user",
        )
        flow = CodexUsageConfigFlow()
        flow._reauth_entry = entry
        flow.async_set_unique_id = AsyncMock()
        flow._abort_if_unique_id_mismatch = MagicMock()
        update = MagicMock(return_value={"type": "done"})
        update_reload = MagicMock(return_value={"type": "reload"})
        flow.async_update_and_abort = update
        flow.async_update_reload_and_abort = update_reload
        client = SimpleNamespace(async_get_usage=AsyncMock(return_value=(None, credentials)))
        with patch.object(CodexUsageConfigFlow, "_client", new_callable=PropertyMock) as api:
            api.return_value = client
            result = await flow._async_finish_workspace(credentials, None, reauth=True)
        return result, update, update_reload

    result, update, update_reload = asyncio.run(exercise())

    assert result == {"type": "reload"}
    update.assert_not_called()
    update_reload.assert_called_once()


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
