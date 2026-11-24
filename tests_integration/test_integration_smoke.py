"""Portable real-Home-Assistant setup and entity lifecycle checks."""

import asyncio
import functools
import json
import logging
import shutil
from contextlib import asynccontextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import MappingProxyType, SimpleNamespace
from unittest.mock import patch

from aiohttp import ClientConnectionError, ClientSession
from homeassistant import auth, loader
from homeassistant.auth.const import GROUP_ID_READ_ONLY
from homeassistant.components import recorder, websocket_api
from homeassistant.components.recorder import statistics
from homeassistant.components.recorder.core import Recorder
from homeassistant.components.recorder.tasks import StatisticsTask, SynchronizeTask
from homeassistant.components.websocket_api.http import WebSocketAdapter
from homeassistant.config_entries import ConfigEntries, ConfigEntry, ConfigEntryState
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import (
    device_registry,
    entity_registry,
    frame,
    issue_registry,
    restore_state,
)
from homeassistant.helpers.recorder import async_initialize_recorder
from homeassistant.setup import async_setup_component

from custom_components.codex_usage import async_setup as async_setup_codex_usage
from custom_components.codex_usage.api import (
    CodexConnectionError,
    CodexCredentials,
    ResetCredits,
    parse_usage,
)
from custom_components.codex_usage.card_data import EVENT_CARD_DATA_UPDATED, build_card_snapshot
from custom_components.codex_usage.const import (
    CONF_ACCESS_TOKEN,
    CONF_ACCOUNT_ID,
    CONF_EXPIRES_AT,
    CONF_FEDRAMP,
    CONF_ID_TOKEN,
    CONF_REFRESH_TOKEN,
    CONF_UPDATE_INTERVAL,
    CONF_USER_ID,
    DOMAIN,
)
from custom_components.codex_usage.repairs import (
    ISSUE_ID,
    registration_failed,
    registration_recovered,
)
from custom_components.codex_usage.sensor import PROFILE_SENSORS

ROOT = Path(__file__).parents[1]


@asynccontextmanager
async def _provider_response(web_status, *, before_read=None):
    async def iter_chunked(_size):
        if before_read is not None:
            await before_read()
        yield json.dumps(
            {
                "components": [
                    {"id": component_id, "status": status}
                    for component_id, status in (
                        ("01JVCV8YSWZFRSM1G5CVP253SK", web_status),
                        ("01KMP3KP5MGE23B80K1EK4S8PV", "operational"),
                        ("01KMKFAMWKNQ84Z1766MV08ZDE", "operational"),
                        ("01KMP3KP5M8X0EBTVW6KN327EE", "operational"),
                        ("01KMKFAMWKQ81YWSE1Z18R6VHR", "operational"),
                    )
                ]
            }
        ).encode()

    yield SimpleNamespace(
        status=200,
        content=SimpleNamespace(iter_chunked=iter_chunked),
    )


def _credentials() -> CodexCredentials:
    return CodexCredentials(
        access_token="access",
        refresh_token="refresh",
        id_token="id",
        expires_at=9_999_999_999,
        account_id="workspace-1",
        user_id="user-1",
    )


async def _hass(tmp_path: Path) -> HomeAssistant:
    component_target = tmp_path / "custom_components" / DOMAIN
    shutil.copytree(ROOT / "custom_components" / DOMAIN, component_target)
    hass = HomeAssistant(str(tmp_path))
    frame.async_setup(hass)
    loader.async_setup(hass)
    hass.config_entries = ConfigEntries(hass, {})
    await hass.config_entries.async_initialize()
    if hasattr(device_registry, "async_setup"):
        device_registry.async_setup(hass)
    await device_registry.async_load(hass)
    await entity_registry.async_load(hass)
    await restore_state.async_load(hass)
    hass.auth = await auth.auth_manager_from_config(hass, [], [])
    return hass


async def _wait_for_recorder(hass: HomeAssistant, instance: Recorder) -> None:
    """Wait until every recorder task queued before this call is committed."""
    future = hass.loop.create_future()
    instance.queue_task(SynchronizeTask(future))
    await future


def test_real_setup_creates_new_entities_and_unloads(tmp_path):
    async def scenario() -> None:
        hass = await _hass(tmp_path)
        status_request_started = asyncio.Event()
        release_status_request = asyncio.Event()

        async def block_then_fail_status() -> None:
            status_request_started.set()
            await release_status_request.wait()
            raise ClientConnectionError

        outage_observed = asyncio.Event()

        @callback
        def listen_for_outage(_event) -> None:
            provider = hass.data[DOMAIN].get("provider_status")
            if provider is not None and provider.state == "outage":
                outage_observed.set()

        unsubscribe_outage = hass.bus.async_listen(EVENT_CARD_DATA_UPDATED, listen_for_outage)
        observed_at = datetime.now(UTC)
        usage = parse_usage(
            {
                "plan_type": "plus",
                "rate_limit": {
                    "allowed": True,
                    "limit_reached": False,
                    "primary_window": {
                        "used_percent": 25,
                        "limit_window_seconds": 18_000,
                        "reset_at": (observed_at + timedelta(hours=2)).timestamp(),
                    },
                    "secondary_window": {
                        "used_percent": 40,
                        "limit_window_seconds": 604_800,
                        "reset_at": (observed_at + timedelta(days=4)).timestamp(),
                    },
                },
                "rate_limit_reset_credits": {"available_count": 2},
            }
        )
        entry = ConfigEntry(
            version=3,
            minor_version=1,
            domain=DOMAIN,
            title="Runtime account",
            data={
                CONF_ACCESS_TOKEN: "access",
                CONF_REFRESH_TOKEN: "refresh",
                CONF_ID_TOKEN: "id",
                CONF_EXPIRES_AT: 9_999_999_999,
                CONF_ACCOUNT_ID: "workspace-1",
                CONF_USER_ID: "user-1",
                CONF_FEDRAMP: False,
            },
            options={CONF_UPDATE_INTERVAL: 300},
            source="user",
            unique_id="workspace-1:user-1",
            discovery_keys=MappingProxyType({}),
            subentries_data=(),
        )
        with (
            patch.object(
                ClientSession,
                "get",
                return_value=_provider_response("operational", before_read=block_then_fail_status),
            ) as status_request,
            patch(
                "custom_components.codex_usage.api.CodexApiClient.async_get_usage",
                return_value=(parse_usage({"plan_type": "plus"}), _credentials()),
            ) as usage_request,
            patch(
                "custom_components.codex_usage.api.CodexApiClient.async_get_profile",
                return_value=None,
            ),
            patch(
                "custom_components.codex_usage.api.CodexApiClient.async_get_reset_credits",
                return_value=ResetCredits(None, None, ()),
            ),
            patch(
                "custom_components.codex_usage.card_registration.CodexUsageCardRegistration.async_register",
                return_value=None,
            ),
        ):
            assert await async_setup_component(hass, DOMAIN, {})
            await hass.config_entries.async_add(entry)
            if entry.state is ConfigEntryState.NOT_LOADED:
                assert await hass.config_entries.async_setup(entry.entry_id)
            await asyncio.wait_for(status_request_started.wait(), 5)
            status_poll_ended = asyncio.Event()
            unsubscribe_poll = hass.data[DOMAIN]["provider_status"].async_add_listener(
                status_poll_ended.set
            )
            try:
                await asyncio.wait_for(hass.async_block_till_done(), 2)
                assert entry.state is ConfigEntryState.LOADED
                assert not status_poll_ended.is_set()
            finally:
                release_status_request.set()
                await asyncio.wait_for(status_poll_ended.wait(), 5)
                unsubscribe_poll()
            status_request.assert_called_once()

            registry = entity_registry.async_get(hass)
            initial_entities = entity_registry.async_entries_for_config_entry(
                registry, entry.entry_id
            )
            assert not any(
                item.unique_id.endswith(("_five_hour_usage", "_weekly_usage"))
                for item in initial_entities
            )
            usage_request.return_value = (usage, _credentials())
            await entry.runtime_data.async_refresh()
            await hass.async_block_till_done()
            first_count = len(
                entity_registry.async_entries_for_config_entry(registry, entry.entry_id)
            )
            await entry.runtime_data.async_refresh()
            await hass.async_block_till_done()
            assert (
                len(entity_registry.async_entries_for_config_entry(registry, entry.entry_id))
                == first_count
            )

        registry = entity_registry.async_get(hass)
        entities = entity_registry.async_entries_for_config_entry(registry, entry.entry_id)
        unique_ids = {item.unique_id for item in entities}
        # Regression guard: catches an accidental add/remove of an entity.
        assert len(entities) == 38
        for suffix in (
            "_five_hour_budget",
            "_weekly_budget",
            "_usage_last_success",
            "_profile_last_success",
            "_reset_details_last_success",
            "_workspace_discovery_last_success",
            "_provider_status",
        ):
            assert any(unique_id.endswith(suffix) for unique_id in unique_ids)
        usage_entity = next(
            item for item in entities if item.unique_id.endswith("_five_hour_usage")
        )
        assert hass.states.get(usage_entity.entity_id).state == "25.0"
        budget_entity = next(
            item for item in entities if item.unique_id.endswith("_five_hour_budget")
        )
        assert hass.states.get(budget_entity.entity_id) is None

        def _state_for(suffix: str) -> str | None:
            item = next(e for e in entities if e.unique_id.endswith(suffix))
            state = hass.states.get(item.entity_id)
            return state.state if state else None

        assert _state_for("_limit_reached") == "off"
        assert _state_for("_provider_status") == "unavailable"
        # Disabled-by-default entities: registered, but no live state.
        assert _state_for("_credits_available") is None
        assert _state_for("_spend_used") is None
        assert _state_for("_lifetime_tokens") is None
        assert _state_for("_total_threads") is None
        assert _state_for("_most_used_reasoning_effort") is None

        weekly_usage = next(item for item in entities if item.unique_id.endswith("_weekly_usage"))
        registry.async_update_entity(
            weekly_usage.entity_id, disabled_by=entity_registry.RegistryEntryDisabler.USER
        )

        previous_coordinator = entry.runtime_data
        with (
            patch.object(
                ClientSession,
                "get",
                return_value=_provider_response("major_outage"),
            ),
            patch(
                "custom_components.codex_usage.api.CodexApiClient.async_get_usage",
                return_value=(usage, _credentials()),
            ),
            patch(
                "custom_components.codex_usage.api.CodexApiClient.async_get_profile",
                return_value=None,
            ),
            patch(
                "custom_components.codex_usage.api.CodexApiClient.async_get_reset_credits",
                return_value=ResetCredits(None, None, ()),
            ),
            patch(
                "custom_components.codex_usage.card_registration.CodexUsageCardRegistration.async_register",
                return_value=None,
            ),
        ):
            options_flow = await hass.config_entries.options.async_init(entry.entry_id)
            await hass.config_entries.options.async_configure(
                options_flow["flow_id"], {CONF_UPDATE_INTERVAL: 60}
            )
            await asyncio.wait_for(outage_observed.wait(), 5)
            unsubscribe_outage()
            await hass.async_block_till_done()
        assert entry.runtime_data is not previous_coordinator
        assert entry.runtime_data.update_interval == timedelta(seconds=60)
        assert (
            registry.async_get(weekly_usage.entity_id).disabled_by
            is entity_registry.RegistryEntryDisabler.USER
        )
        assert hass.states.get(weekly_usage.entity_id) is None
        provider_entity = next(
            item for item in entities if item.unique_id.endswith("_provider_status")
        )
        assert provider_entity.device_id == usage_entity.device_id
        assert provider_entity.disabled_by is None
        assert _state_for("_provider_status") == "outage"

        with patch(
            "custom_components.codex_usage.api.CodexApiClient.async_get_usage",
            side_effect=CodexConnectionError,
        ):
            await entry.runtime_data.async_request_refresh()
            await hass.async_block_till_done()
        assert entry.runtime_data.last_update_success is False
        assert hass.states.get(usage_entity.entity_id).state == "unavailable"
        assert _state_for("_provider_status") == "outage"
        snapshot = build_card_snapshot(hass, SimpleNamespace(is_admin=True))
        assert snapshot["provider_status"]["state"] == "outage"
        assert snapshot["accounts"][0]["available"] is False
        assert snapshot["accounts"][0]["blocker"] is None

        assert await hass.config_entries.async_unload(entry.entry_id)
        await hass.async_block_till_done()
        assert entry.state.value == "not_loaded"
        restored = hass.states.get(provider_entity.entity_id)
        assert restored.state == "unavailable"
        assert restored.attributes["restored"] is True
        assert "provider_status" not in hass.data[DOMAIN]
        assert "provider_status" not in build_card_snapshot(hass, SimpleNamespace(is_admin=True))
        await hass.async_stop(force=True)

    asyncio.run(scenario())


def test_non_admin_can_subscribe_to_empty_card_updates_and_unsubscribe(tmp_path):
    async def scenario() -> None:
        hass = await _hass(tmp_path)
        try:
            websocket_api.commands.async_register_commands(
                hass, websocket_api.async_register_command
            )
            assert await async_setup_codex_usage(hass, {})
            await hass.auth.async_create_user("Owner")
            viewer = await hass.auth.async_create_user(
                "Dashboard reader", group_ids=[GROUP_ID_READ_ONLY]
            )
            assert not viewer.is_admin

            messages = []
            connection = websocket_api.ActiveConnection(
                WebSocketAdapter(logging.getLogger(__name__), {"connid": "test"}),
                hass,
                lambda message: messages.append(
                    message if isinstance(message, dict) else json.loads(message)
                ),
                viewer,
                None,
                None,
            )
            connection.async_handle(
                {"id": 1, "type": "subscribe_events", "event_type": EVENT_CARD_DATA_UPDATED}
            )
            assert messages.pop()["error"]["code"] == "unauthorized"

            connection.async_handle({"id": 2, "type": "codex_usage/subscribe_updates"})
            assert messages.pop() == {"id": 2, "type": "result", "success": True, "result": None}

            hass.bus.async_fire(EVENT_CARD_DATA_UPDATED, {"account_id": "private"})
            await hass.async_block_till_done()
            assert messages.pop() == {"id": 2, "type": "event", "event": {}}

            connection.async_handle({"id": 3, "type": "unsubscribe_events", "subscription": 2})
            assert messages.pop() == {"id": 3, "type": "result", "success": True, "result": None}
            hass.bus.async_fire(EVENT_CARD_DATA_UPDATED)
            await hass.async_block_till_done()
            assert messages == []
            assert EVENT_CARD_DATA_UPDATED not in hass.bus.async_listeners()

            connection.async_handle({"id": 4, "type": "codex_usage/subscribe_updates"})
            assert messages.pop()["success"] is True
            assert hass.bus.async_listeners()[EVENT_CARD_DATA_UPDATED] == 1
            connection.async_handle_close()
            assert EVENT_CARD_DATA_UPDATED not in hass.bus.async_listeners()
        finally:
            await hass.async_stop(force=True)

    asyncio.run(scenario())


def test_real_issue_registry_records_and_clears_card_repair(tmp_path):
    async def scenario() -> None:
        hass = await _hass(tmp_path)
        registry = issue_registry.async_get(hass)

        registration_failed(hass)
        issue = registry.async_get_issue(DOMAIN, ISSUE_ID)
        assert issue is not None
        assert issue.translation_key == ISSUE_ID
        assert issue.severity.value == "warning"

        registration_recovered(hass)
        assert registry.async_get_issue(DOMAIN, ISSUE_ID) is None
        await hass.async_stop(force=True)

    asyncio.run(scenario())


def test_real_recorder_accepts_total_and_reports_removed_measurement_metadata(tmp_path):
    async def scenario() -> None:
        hass = await _hass(tmp_path)
        async_initialize_recorder(hass)
        database = (tmp_path / "home-assistant.db").as_posix()
        try:
            assert await async_setup_component(hass, "sensor", {})
            assert await async_setup_component(
                hass,
                "recorder",
                {
                    "recorder": {
                        "db_url": f"sqlite:///{database}",
                        "auto_purge": False,
                        "commit_interval": 0,
                    }
                },
            )
            await hass.async_start()
            instance = recorder.get_instance(hass)
            await hass.async_block_till_done()
            await _wait_for_recorder(hass, instance)
            descriptions = {item.key: item for item in PROFILE_SENSORS}
            assert descriptions["lifetime_tokens"].state_class.value == "total"
            assert descriptions["peak_daily_tokens"].state_class is None

            hass.states.async_set(
                "sensor.codex_lifetime_tokens",
                "100",
                {"state_class": "total", "unit_of_measurement": "tokens"},
            )
            # Seed the metadata shape created by a pre-0.7 measurement entity.
            hass.states.async_set(
                "sensor.codex_peak_daily_tokens",
                "50",
                {"state_class": "measurement", "unit_of_measurement": "tokens"},
            )
            await hass.async_block_till_done()
            await _wait_for_recorder(hass, instance)
            now = datetime.now(UTC)
            start = now.replace(minute=(now.minute // 5) * 5, second=0, microsecond=0)
            instance.queue_task(StatisticsTask(start, False))
            await _wait_for_recorder(hass, instance)

            metadata = await instance.async_add_executor_job(
                functools.partial(
                    statistics.get_metadata,
                    hass,
                    statistic_ids={
                        "sensor.codex_lifetime_tokens",
                        "sensor.codex_peak_daily_tokens",
                    },
                )
            )
            assert metadata["sensor.codex_lifetime_tokens"][1]["has_sum"] is True
            assert metadata["sensor.codex_lifetime_tokens"][1]["has_mean"] is False
            assert metadata["sensor.codex_peak_daily_tokens"][1]["has_mean"] is True

            # The 0.7 entity no longer advertises measurement for this peak value.
            hass.states.async_set(
                "sensor.codex_peak_daily_tokens",
                "51",
                {"unit_of_measurement": "tokens"},
            )
            await hass.async_block_till_done()
            await _wait_for_recorder(hass, instance)
            issues = await instance.async_add_executor_job(statistics.validate_statistics, hass)
            assert any(
                issue.type == "state_class_removed"
                for issue in issues["sensor.codex_peak_daily_tokens"]
            )
        finally:
            await hass.async_stop(force=True)

    asyncio.run(scenario())
