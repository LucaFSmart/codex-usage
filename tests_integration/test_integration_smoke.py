"""Full-stack smoke test: setup, entity creation, and unload inside real Home Assistant.

Runs only in CI (Linux, `integration-smoke` job in validate.yml). Excluded from the
default `tests/` path because pytest-homeassistant-custom-component requires POSIX
modules (fcntl, resource) unavailable on Windows dev machines.
"""

from unittest.mock import patch

from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.codex_usage.api import (
    CodexCredentials,
    CodexUsageData,
    CreditStatus,
    RateLimit,
    RateLimitWindow,
)
from custom_components.codex_usage.const import (
    CONF_ACCESS_TOKEN,
    CONF_ACCOUNT_ID,
    CONF_EMAIL,
    CONF_EXPIRES_AT,
    CONF_FEDRAMP,
    CONF_ID_TOKEN,
    CONF_PLAN_TYPE,
    CONF_REFRESH_TOKEN,
    CONF_UPDATE_INTERVAL,
    CONF_USER_ID,
    DOMAIN,
)

pytest_plugins = "pytest_homeassistant_custom_component"


def _fake_usage() -> CodexUsageData:
    return CodexUsageData(
        plan_type="plus",
        main_limit=RateLimit(
            limit_id="codex",
            name="Codex",
            allowed=True,
            limit_reached=False,
            primary=RateLimitWindow(used_percent=25.0, window_minutes=300, resets_at=None),
            secondary=RateLimitWindow(used_percent=40.0, window_minutes=10080, resets_at=None),
        ),
        additional_limits=(),
        credits=CreditStatus(has_credits=True, unlimited=False, balance=None),
        spend_limit=None,
        spend_limit_reached=False,
        rate_limit_reached_type=None,
    )


def _fake_credentials() -> CodexCredentials:
    return CodexCredentials(
        access_token="access",
        refresh_token="refresh",
        id_token="id",
        expires_at=9_999_999_999.0,
        account_id="workspace-1",
        user_id="user-1",
        email="user@example.com",
        plan_type="plus",
        fedramp=False,
    )


async def test_full_setup_creates_entities_and_unloads(hass, enable_custom_integrations):
    entry = MockConfigEntry(
        domain=DOMAIN,
        data={
            CONF_ACCESS_TOKEN: "access",
            CONF_REFRESH_TOKEN: "refresh",
            CONF_ID_TOKEN: "id",
            CONF_EXPIRES_AT: 9_999_999_999.0,
            CONF_ACCOUNT_ID: "workspace-1",
            CONF_USER_ID: "user-1",
            CONF_EMAIL: "user@example.com",
            CONF_PLAN_TYPE: "plus",
            CONF_FEDRAMP: False,
        },
        options={CONF_UPDATE_INTERVAL: 300},
        unique_id="workspace-1:user-1",
    )
    entry.add_to_hass(hass)

    with patch(
        "custom_components.codex_usage.api.CodexApiClient.async_get_usage",
        return_value=(_fake_usage(), _fake_credentials()),
    ):
        assert await hass.config_entries.async_setup(entry.entry_id)
        await hass.async_block_till_done()

    assert entry.state.value == "loaded"

    from homeassistant.helpers import entity_registry as er

    registry = er.async_get(hass)
    entities = er.async_entries_for_config_entry(registry, entry.entry_id)
    assert len(entities) == 18

    def _state_for(suffix: str) -> str:
        entity = next(e for e in entities if e.unique_id.endswith(suffix))
        return hass.states.get(entity.entity_id).state

    assert _state_for("_plan") == "plus"
    assert _state_for("_five_hour_usage") == "25.0"
    assert _state_for("_weekly_usage") == "40.0"
    assert _state_for("_limit_reached") == "off"
    assert _state_for("_credits_available") == "on"
    assert _state_for("_spend_used") == "unavailable"

    assert await hass.config_entries.async_unload(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state.value == "not_loaded"
