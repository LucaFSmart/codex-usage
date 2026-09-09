"""Portable real-Home-Assistant setup and entity lifecycle checks."""

import asyncio
import functools
import shutil
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import MappingProxyType
from unittest.mock import patch

from homeassistant import auth, loader
from homeassistant.components import recorder
from homeassistant.components.recorder import statistics
from homeassistant.components.recorder.tasks import StatisticsTask
from homeassistant.config_entries import ConfigEntries, ConfigEntry, ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry, entity_registry, issue_registry, restore_state
from homeassistant.helpers.recorder import async_initialize_recorder
from homeassistant.setup import async_setup_component

from custom_components.codex_usage.api import (
    CodexConnectionError,
    CodexCredentials,
    ResetCredits,
    parse_usage,
)
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


def test_real_setup_creates_new_entities_and_unloads(tmp_path):
    async def scenario() -> None:
        hass = await _hass(tmp_path)
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
            assert await async_setup_component(hass, DOMAIN, {})
            await hass.config_entries.async_add(entry)
            if entry.state is ConfigEntryState.NOT_LOADED:
                assert await hass.config_entries.async_setup(entry.entry_id)
            await hass.async_block_till_done()

        registry = entity_registry.async_get(hass)
        entities = entity_registry.async_entries_for_config_entry(registry, entry.entry_id)
        unique_ids = {item.unique_id for item in entities}
        # Regression guard: catches an accidental add/remove of an entity.
        assert len(entities) == 37
        for suffix in (
            "_five_hour_budget",
            "_weekly_budget",
            "_usage_last_success",
            "_profile_last_success",
            "_reset_details_last_success",
            "_workspace_discovery_last_success",
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
        # Disabled-by-default entities: registered, but no live state.
        assert _state_for("_credits_available") is None
        assert _state_for("_spend_used") is None
        assert _state_for("_lifetime_tokens") is None
        assert _state_for("_total_threads") is None
        assert _state_for("_most_used_reasoning_effort") is None

        previous_coordinator = entry.runtime_data
        with (
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
            await hass.async_block_till_done()
        assert entry.runtime_data is not previous_coordinator
        assert entry.runtime_data.update_interval == timedelta(seconds=60)

        with patch(
            "custom_components.codex_usage.api.CodexApiClient.async_get_usage",
            side_effect=CodexConnectionError,
        ):
            await entry.runtime_data.async_request_refresh()
            await hass.async_block_till_done()
        assert entry.runtime_data.last_update_success is False
        assert hass.states.get(usage_entity.entity_id).state == "unavailable"

        assert await hass.config_entries.async_unload(entry.entry_id)
        await hass.async_block_till_done()
        assert entry.state.value == "not_loaded"
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
            await instance.async_block_till_done()
            now = datetime.now(UTC)
            start = now.replace(minute=(now.minute // 5) * 5, second=0, microsecond=0)
            instance.queue_task(StatisticsTask(start, False))
            await instance.async_block_till_done()

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
            await instance.async_block_till_done()
            issues = await instance.async_add_executor_job(statistics.validate_statistics, hass)
            assert any(
                issue.type == "state_class_removed"
                for issue in issues["sensor.codex_peak_daily_tokens"]
            )
        finally:
            await hass.async_stop(force=True)

    asyncio.run(scenario())
