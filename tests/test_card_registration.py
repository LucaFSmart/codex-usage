"""Tests for bundled Lovelace card registration."""

from __future__ import annotations

import asyncio
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock, call, patch

from custom_components.codex_usage import async_setup_entry, async_unload_entry
from custom_components.codex_usage.card_registration import CodexUsageCardRegistration
from custom_components.codex_usage.const import CARD_URL, CARD_VERSION, DOMAIN


def _resources(*items: dict[str, str]) -> MagicMock:
    resources = MagicMock()
    resources.async_get_info = AsyncMock()
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


def test_register_loads_stored_resources_before_inspection() -> None:
    resources = _resources()
    registration = CodexUsageCardRegistration(_hass(resources=resources))

    asyncio.run(registration.async_register())

    resources.async_get_info.assert_awaited_once_with()
    assert resources.method_calls.index(call.async_get_info()) < resources.method_calls.index(
        call.async_items()
    )


def test_register_consolidates_all_matching_resources() -> None:
    resources = _resources(
        {"id": "canonical", "url": f"{CARD_URL}?v=0.4.0", "res_type": "module"},
        {"id": "duplicate", "url": f"{CARD_URL}?v={CARD_VERSION}", "res_type": "module"},
        {"id": "other", "url": "/local/other-card.js", "res_type": "module"},
    )
    registration = CodexUsageCardRegistration(_hass(resources=resources))

    asyncio.run(registration.async_register())

    resources.async_update_item.assert_awaited_once_with(
        "canonical", {"res_type": "module", "url": f"{CARD_URL}?v={CARD_VERSION}"}
    )
    resources.async_delete_item.assert_awaited_once_with("duplicate")
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


def test_successful_registration_skips_all_work_on_next_call() -> None:
    resources = _resources()
    registration = CodexUsageCardRegistration(_hass(resources=resources))

    async def _async_register_twice() -> None:
        await registration.async_register()
        await registration.async_register()

    asyncio.run(_async_register_twice())

    assert registration.is_registered is True
    resources.async_get_info.assert_awaited_once()
    resources.async_create_item.assert_awaited_once()


def test_concurrent_registration_serializes_static_path_setup() -> None:
    hass = _hass(resource_mode="yaml")
    static_path_started = asyncio.Event()
    release_static_path = asyncio.Event()

    async def _async_register_static_paths(*_args: object) -> None:
        static_path_started.set()
        await release_static_path.wait()

    hass.http.async_register_static_paths.side_effect = _async_register_static_paths
    registration = CodexUsageCardRegistration(hass)

    async def _async_register_twice() -> None:
        first = asyncio.create_task(registration.async_register())
        await static_path_started.wait()
        second = asyncio.create_task(registration.async_register())
        await asyncio.sleep(0)
        assert hass.http.async_register_static_paths.await_count == 1
        release_static_path.set()
        await asyncio.gather(first, second)

    asyncio.run(_async_register_twice())

    hass.http.async_register_static_paths.assert_awaited_once()


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

    resources.async_get_info.assert_awaited_once_with()
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
    registration = MagicMock(
        is_registered=False,
        async_register=AsyncMock(),
        async_unregister=AsyncMock(),
    )

    async def _async_register() -> None:
        registration.is_registered = True

    registration.async_register.side_effect = _async_register

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


def test_concurrent_entry_setup_uses_shared_registration_for_each_entry() -> None:
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
        registration.is_registered = True

    registration = MagicMock(
        is_registered=False,
        async_register=AsyncMock(side_effect=_async_register),
    )

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


def test_registration_error_does_not_block_setup_and_next_entry_retries() -> None:
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
    registration = MagicMock(is_registered=False)

    async def _async_register() -> None:
        if registration.async_register.await_count == 1:
            raise RuntimeError("frontend unavailable")
        registration.is_registered = True

    registration.async_register = AsyncMock(side_effect=_async_register)

    with (
        patch("custom_components.codex_usage.aiohttp_client.async_get_clientsession"),
        patch("custom_components.codex_usage.CodexUsageCoordinator") as coordinator_cls,
        patch(
            "custom_components.codex_usage.CodexUsageCardRegistration",
            return_value=registration,
        ),
    ):
        coordinator_cls.return_value.async_config_entry_first_refresh = AsyncMock()
        first_result = asyncio.run(async_setup_entry(hass, entries[0]))
        second_result = asyncio.run(async_setup_entry(hass, entries[1]))

    assert first_result is True
    assert second_result is True
    assert hass.config_entries.async_forward_entry_setups.await_count == 2
    assert registration.async_register.await_count == 2
    assert hass.data[DOMAIN]["loaded_entry_ids"] == {"one", "two"}


def test_register_unregister_race_preserves_resource_for_new_entry() -> None:
    items = [{"id": "codex", "url": f"{CARD_URL}?v={CARD_VERSION}", "res_type": "module"}]
    resources = _resources()
    resources.async_items.side_effect = lambda: list(items)
    delete_started = asyncio.Event()
    release_delete = asyncio.Event()

    async def _async_delete_item(item_id: str) -> None:
        delete_started.set()
        await release_delete.wait()
        items[:] = [item for item in items if item["id"] != item_id]

    async def _async_create_item(item: dict[str, str]) -> None:
        items.append({"id": "recreated", **item})

    resources.async_delete_item.side_effect = _async_delete_item
    resources.async_create_item.side_effect = _async_create_item
    hass = _hass(resources=resources)
    hass.config_entries = SimpleNamespace(
        async_forward_entry_setups=AsyncMock(),
        async_unload_platforms=AsyncMock(return_value=True),
    )
    registration = CodexUsageCardRegistration(hass)
    old_entry, new_entry = [
        SimpleNamespace(
            entry_id=entry_id,
            runtime_data=None,
            async_on_unload=MagicMock(),
            add_update_listener=MagicMock(return_value=MagicMock()),
        )
        for entry_id in ("old", "new")
    ]

    async def _async_race() -> None:
        await registration.async_register()
        hass.data[DOMAIN] = {
            "registration": registration,
            "loaded_entry_ids": {"old"},
        }
        unload = asyncio.create_task(async_unload_entry(hass, old_entry))
        await delete_started.wait()
        setup = asyncio.create_task(async_setup_entry(hass, new_entry))
        await asyncio.sleep(0)
        release_delete.set()
        await asyncio.gather(unload, setup)

    with (
        patch("custom_components.codex_usage.aiohttp_client.async_get_clientsession"),
        patch("custom_components.codex_usage.CodexUsageCoordinator") as coordinator_cls,
    ):
        coordinator_cls.return_value.async_config_entry_first_refresh = AsyncMock()
        asyncio.run(_async_race())

    assert hass.data[DOMAIN]["loaded_entry_ids"] == {"new"}
    assert registration.is_registered is True
    assert any(CodexUsageCardRegistration._path(item["url"]) == CARD_URL for item in items)
