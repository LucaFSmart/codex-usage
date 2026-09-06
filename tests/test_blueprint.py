"""Execute the distributed warning Blueprint with local counting actions."""

import asyncio
from pathlib import Path

import pytest
from homeassistant import loader
from homeassistant.config_entries import ConfigEntries
from homeassistant.core import Context, HomeAssistant
from homeassistant.exceptions import HomeAssistantError
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers import device_registry, entity_registry, restore_state
from homeassistant.helpers.script import Script, async_validate_actions_config
from homeassistant.setup import async_setup_component
from homeassistant.util import yaml

BLUEPRINT = Path(__file__).parents[1] / "blueprints/automation/codex_usage/usage_warning.yaml"


async def setup_script(tmp_path, callback, *, hysteresis=5):
    hass = HomeAssistant(str(tmp_path))
    loader.async_setup(hass)
    hass.config_entries = ConfigEntries(hass, {})
    await hass.config_entries.async_initialize()
    if hasattr(device_registry, "async_setup"):
        device_registry.async_setup(hass)
    await device_registry.async_load(hass)
    await entity_registry.async_load(hass)
    await restore_state.async_load(hass)
    hass.services.async_register("codex_test", "count", callback)
    assert await async_setup_component(hass, "input_boolean", {"input_boolean": {"warned": {}}})
    document = yaml.load_yaml(str(BLUEPRINT))
    config = yaml.substitute(
        document,
        {
            "usage_sensor": "sensor.usage",
            "warning_threshold": 80,
            "hysteresis": hysteresis,
            "warning_state": "input_boolean.warned",
            "warning_action": [{"action": "codex_test.count"}],
        },
    )
    actions = await async_validate_actions_config(hass, cv.SCRIPT_SCHEMA(config["actions"]))
    script = Script(hass, actions, "Usage warning test", "automation")
    return hass, script, config["variables"]


def test_warning_hysteresis_runs_real_actions(tmp_path):
    async def scenario():
        calls = []

        async def count(call):
            calls.append(call.data)

        hass, script, variables = await setup_script(tmp_path, count)
        for value in [70, 80, 90, "unknown", 78, 75, 81]:
            hass.states.async_set("sensor.usage", str(value), {"unit_of_measurement": "%"})
            await script.async_run(variables, context=Context())
        assert len(calls) == 2
        assert hass.states.get("input_boolean.warned").state == "on"
        for value in ["unavailable", "nan", "inf", -1, 101]:
            hass.states.async_set("sensor.usage", str(value), {"unit_of_measurement": "%"})
            await script.async_run(variables, context=Context())
        assert len(calls) == 2
        assert hass.states.get("input_boolean.warned").state == "on"
        hass.states.async_set("sensor.usage", "0", {"unit_of_measurement": "credits"})
        await script.async_run(variables, context=Context())
        assert hass.states.get("input_boolean.warned").state == "on"
        await hass.async_stop()

    asyncio.run(scenario())


def test_failed_action_does_not_consume_warning_and_can_retry(tmp_path):
    async def scenario():
        attempts = []

        async def count(call):
            attempts.append(call.data)
            if len(attempts) == 1:
                raise HomeAssistantError("Expected test action failure")

        hass, script, variables = await setup_script(tmp_path, count)
        hass.states.async_set("sensor.usage", "85", {"unit_of_measurement": "%"})
        with pytest.raises(HomeAssistantError, match="Expected test action failure"):
            await script.async_run(variables, context=Context())
        assert hass.states.get("input_boolean.warned").state == "off"
        await script.async_run(variables, context=Context())
        assert len(attempts) == 2
        assert hass.states.get("input_boolean.warned").state == "on"
        await hass.async_stop()

    asyncio.run(scenario())


def test_restored_helper_and_shifted_reset_do_not_repeat_warning(tmp_path):
    async def scenario():
        calls = []

        async def count(call):
            calls.append(call.data)

        hass, script, variables = await setup_script(tmp_path, count)
        hass.states.async_set("sensor.usage", "85", {"unit_of_measurement": "%"})
        await script.async_run(variables, context=Context())
        await restore_state.async_get(hass).async_dump_states()
        await hass.async_stop()
        restored, script, variables = await setup_script(tmp_path, count)
        assert restored.states.get("input_boolean.warned").state == "on"
        restored.states.async_set(
            "sensor.usage",
            "85",
            {
                "unit_of_measurement": "%",
                "reset_at": "2026-09-15T12:00:00Z",
            },
        )
        await script.async_run(variables, context=Context())
        assert len(calls) == 1
        for value in [0, 81]:
            restored.states.async_set("sensor.usage", str(value), {"unit_of_measurement": "%"})
            await script.async_run(variables, context=Context())
        assert len(calls) == 2
        await restored.async_stop()

    asyncio.run(scenario())


def test_zero_hysteresis_does_not_toggle_at_the_warning_threshold(tmp_path):
    async def scenario():
        calls = []

        async def count(call):
            calls.append(call.data)

        hass, script, variables = await setup_script(tmp_path, count, hysteresis=0)
        hass.states.async_set("sensor.usage", "80", {"unit_of_measurement": "%"})
        await script.async_run(variables, context=Context())
        await script.async_run(variables, context=Context())
        assert len(calls) == 1
        assert hass.states.get("input_boolean.warned").state == "on"
        hass.states.async_set("sensor.usage", "79", {"unit_of_measurement": "%"})
        await script.async_run(variables, context=Context())
        assert hass.states.get("input_boolean.warned").state == "off"
        await hass.async_stop()

    asyncio.run(scenario())
