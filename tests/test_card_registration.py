"""Tests for bundled Lovelace card registration."""

from __future__ import annotations

import asyncio
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, patch

from custom_components.codex_usage import async_setup_entry, async_unload_entry
from custom_components.codex_usage.card_registration import CodexUsageCardRegistration
from custom_components.codex_usage.const import CARD_URL, CARD_VERSION, DOMAIN


def _resources(*items: dict[str, str]) -> MagicMock:
    resources = MagicMock()
    resources.async_items.return_value = list(items)
    resources.async_create_item = AsyncMock()
    resources.async_update_item = AsyncMock()
    resources.async_delete_item = AsyncMock()
    return resources


def _hass(
    *,
    resource_mode: str | None = "storage",
    mode: str | None = None,
    resources: MagicMock | None = None,
) -> SimpleNamespace:
    lovelace = SimpleNamespace(resources=resources or _resources())
    if resource_mode is not None:
        lovelace.resource_mode = resource_mode
    if mode is not None:
        lovelace.mode = mode
    return SimpleNamespace(
        data={"lovelace": lovelace},
        http=SimpleNamespace(async_register_static_paths=AsyncMock()),
    )


def test_registers_static_path_and_creates_missing_resource() -> None:
    hass = _hass()
    registration = CodexUsageCardRegistration(hass)

    asyncio.run(registration.async_register())

    static_paths = hass.http.async_register_static_paths.await_args.args[0]
    assert len(static_paths) == 1
    static_path = static_paths[0]
    assert static_path.url_path == CARD_URL
    assert Path(static_path.path) == (
        Path(__file__).parents[1]
        / "custom_components"
        / "codex_usage"
        / "frontend"
        / "codex-usage-card.js"
    )
    assert static_path.cache_headers is False
    hass.data["lovelace"].resources.async_create_item.assert_awaited_once_with(
        {"res_type": "module", "url": f"{CARD_URL}?v={CARD_VERSION}"}
    )


def test_updates_stale_resource_version_without_creating_duplicate() -> None:
    resources = _resources({"id": "codex", "url": f"{CARD_URL}?v=0.4.0", "res_type": "module"})
    registration = CodexUsageCardRegistration(_hass(resources=resources))

    asyncio.run(registration.async_register())

    resources.async_update_item.assert_awaited_once_with(
        "codex", {"res_type": "module", "url": f"{CARD_URL}?v={CARD_VERSION}"}
    )
    resources.async_create_item.assert_not_awaited()


def test_current_resource_is_a_noop_and_duplicates_are_not_created() -> None:
    resources = _resources(
        {"id": "codex", "url": f"{CARD_URL}?v={CARD_VERSION}", "res_type": "module"}
    )
    registration = CodexUsageCardRegistration(_hass(resources=resources))

    asyncio.run(registration.async_register())

    resources.async_create_item.assert_not_awaited()
    resources.async_update_item.assert_not_awaited()


def test_repeated_registration_registers_static_path_only_once() -> None:
    resources = _resources()
    hass = _hass(resources=resources)
    registration = CodexUsageCardRegistration(hass)

    asyncio.run(registration.async_register())
    resources.async_items.return_value = [
        {"id": "codex", "url": f"{CARD_URL}?v={CARD_VERSION}", "res_type": "module"}
    ]
    asyncio.run(registration.async_register())

    hass.http.async_register_static_paths.assert_awaited_once()
    resources.async_create_item.assert_awaited_once()


def test_yaml_resource_mode_skips_resource_mutation() -> None:
    resources = _resources()
    registration = CodexUsageCardRegistration(_hass(resource_mode="yaml", resources=resources))

    asyncio.run(registration.async_register())

    resources.async_create_item.assert_not_awaited()
    resources.async_update_item.assert_not_awaited()


def test_legacy_mode_field_supports_storage_and_yaml() -> None:
    storage_resources = _resources()
    yaml_resources = _resources()

    asyncio.run(
        CodexUsageCardRegistration(
            _hass(resource_mode=None, mode="storage", resources=storage_resources)
        ).async_register()
    )
    asyncio.run(
        CodexUsageCardRegistration(
            _hass(resource_mode=None, mode="yaml", resources=yaml_resources)
        ).async_register()
    )

    storage_resources.async_create_item.assert_awaited_once()
    yaml_resources.async_create_item.assert_not_awaited()


def test_missing_http_or_lovelace_does_not_raise() -> None:
    missing_http = SimpleNamespace(data={"lovelace": SimpleNamespace(resource_mode="storage")})
    missing_lovelace = SimpleNamespace(
        data={}, http=SimpleNamespace(async_register_static_paths=AsyncMock())
    )

    asyncio.run(CodexUsageCardRegistration(missing_http).async_register())
    asyncio.run(CodexUsageCardRegistration(missing_lovelace).async_register())


def test_unregister_deletes_only_resources_matching_card_path() -> None:
    resources = _resources(
        {"id": "current", "url": f"{CARD_URL}?v={CARD_VERSION}"},
        {"id": "stale", "url": f"{CARD_URL}?v=0.4.0"},
        {"id": "other", "url": "/local/other-card.js?v=0.4.0"},
    )
    registration = CodexUsageCardRegistration(_hass(resources=resources))

    asyncio.run(registration.async_unregister())

    assert resources.async_delete_item.await_count == 2
    resources.async_delete_item.assert_any_await("current")
    resources.async_delete_item.assert_any_await("stale")


def test_two_entries_share_registration_until_final_unload() -> None:
    hass = SimpleNamespace(
        data={},
        config_entries=SimpleNamespace(
            async_forward_entry_setups=AsyncMock(),
            async_unload_platforms=AsyncMock(return_value=True),
        ),
    )
    entries = [
        SimpleNamespace(
            entry_id=entry_id,
            runtime_data=None,
            async_on_unload=MagicMock(),
            add_update_listener=MagicMock(return_value=MagicMock()),
        )
        for entry_id in ("one", "two")
    ]
    registration = MagicMock(async_register=AsyncMock(), async_unregister=AsyncMock())

    with (
        patch("custom_components.codex_usage.aiohttp_client.async_get_clientsession"),
        patch("custom_components.codex_usage.CodexUsageCoordinator") as coordinator_cls,
        patch(
            "custom_components.codex_usage.CodexUsageCardRegistration", return_value=registration
        ) as registration_cls,
    ):
        coordinator_cls.return_value.async_config_entry_first_refresh = AsyncMock()
        asyncio.run(async_setup_entry(hass, entries[0]))
        asyncio.run(async_setup_entry(hass, entries[1]))
        first_unload = asyncio.run(async_unload_entry(hass, entries[0]))
        final_unload = asyncio.run(async_unload_entry(hass, entries[1]))

    assert first_unload is True
    assert final_unload is True
    registration_cls.assert_called_once_with(hass)
    registration.async_register.assert_awaited_once()
    registration.async_unregister.assert_awaited_once()
    assert hass.data[DOMAIN]["loaded_entry_ids"] == set()


def test_concurrent_entry_setup_registers_card_only_once() -> None:
    hass = SimpleNamespace(
        data={},
        config_entries=SimpleNamespace(async_forward_entry_setups=AsyncMock()),
    )
    entries = [
        SimpleNamespace(
            entry_id=entry_id,
            runtime_data=None,
            async_on_unload=MagicMock(),
            add_update_listener=MagicMock(return_value=MagicMock()),
        )
        for entry_id in ("one", "two")
    ]
    register_started = asyncio.Event()
    release_registration = asyncio.Event()

    async def _async_register() -> None:
        register_started.set()
        await release_registration.wait()

    registration = MagicMock(async_register=AsyncMock(side_effect=_async_register))

    async def _async_setup_both() -> None:
        first_setup = asyncio.create_task(async_setup_entry(hass, entries[0]))
        await register_started.wait()
        second_setup = asyncio.create_task(async_setup_entry(hass, entries[1]))
        await asyncio.sleep(0)
        release_registration.set()
        await asyncio.gather(first_setup, second_setup)

    with (
        patch("custom_components.codex_usage.aiohttp_client.async_get_clientsession"),
        patch("custom_components.codex_usage.CodexUsageCoordinator") as coordinator_cls,
        patch(
            "custom_components.codex_usage.CodexUsageCardRegistration", return_value=registration
        ),
    ):
        coordinator_cls.return_value.async_config_entry_first_refresh = AsyncMock()
        asyncio.run(_async_setup_both())

    registration.async_register.assert_awaited_once()
    assert hass.data[DOMAIN]["loaded_entry_ids"] == {"one", "two"}


def test_registration_error_does_not_block_entry_setup() -> None:
    hass = SimpleNamespace(
        data={},
        config_entries=SimpleNamespace(async_forward_entry_setups=AsyncMock()),
    )
    entry = SimpleNamespace(
        entry_id="one",
        runtime_data=None,
        async_on_unload=MagicMock(),
        add_update_listener=MagicMock(return_value=MagicMock()),
    )
    registration = MagicMock(
        async_register=AsyncMock(side_effect=RuntimeError("frontend unavailable"))
    )

    with (
        patch("custom_components.codex_usage.aiohttp_client.async_get_clientsession"),
        patch("custom_components.codex_usage.CodexUsageCoordinator") as coordinator_cls,
        patch(
            "custom_components.codex_usage.CodexUsageCardRegistration",
            return_value=registration,
        ),
    ):
        coordinator_cls.return_value.async_config_entry_first_refresh = AsyncMock()
        result = asyncio.run(async_setup_entry(hass, entry))

    assert result is True
    hass.config_entries.async_forward_entry_setups.assert_awaited_once()
    assert hass.data[DOMAIN]["loaded_entry_ids"] == {"one"}
