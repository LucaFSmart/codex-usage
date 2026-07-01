"""Data coordinator for Codex Usage."""

from __future__ import annotations

import logging
from dataclasses import asdict
from datetime import timedelta

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import (
    CodexApiClient,
    CodexApiError,
    CodexAuthenticationError,
    CodexConnectionError,
    CodexCredentials,
    CodexUsageData,
)
from .const import (
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
    DEFAULT_UPDATE_INTERVAL,
    DOMAIN,
)

_LOGGER = logging.getLogger(__name__)


def credentials_from_entry(entry: ConfigEntry) -> CodexCredentials:
    """Build API credentials from config entry data."""
    return CodexCredentials(
        access_token=entry.data[CONF_ACCESS_TOKEN],
        refresh_token=entry.data[CONF_REFRESH_TOKEN],
        id_token=entry.data[CONF_ID_TOKEN],
        expires_at=float(entry.data[CONF_EXPIRES_AT]),
        account_id=entry.data[CONF_ACCOUNT_ID],
        user_id=entry.data.get(CONF_USER_ID),
        email=entry.data.get(CONF_EMAIL),
        plan_type=entry.data.get(CONF_PLAN_TYPE),
        fedramp=bool(entry.data.get(CONF_FEDRAMP, False)),
    )


def credentials_to_entry_data(credentials: CodexCredentials) -> dict[str, object]:
    """Serialize credentials into config entry data."""
    values = asdict(credentials)
    return {
        CONF_ACCESS_TOKEN: values["access_token"],
        CONF_REFRESH_TOKEN: values["refresh_token"],
        CONF_ID_TOKEN: values["id_token"],
        CONF_EXPIRES_AT: values["expires_at"],
        CONF_ACCOUNT_ID: values["account_id"],
        CONF_USER_ID: values["user_id"],
        CONF_EMAIL: values["email"],
        CONF_PLAN_TYPE: values["plan_type"],
        CONF_FEDRAMP: values["fedramp"],
    }


class CodexUsageCoordinator(DataUpdateCoordinator[CodexUsageData]):
    """Fetch and normalize Codex usage data."""

    config_entry: ConfigEntry

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        client: CodexApiClient,
    ) -> None:
        self.client = client
        self.credentials = credentials_from_entry(entry)
        interval = entry.options.get(CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL)
        super().__init__(
            hass,
            logger=_LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=interval),
            config_entry=entry,
            always_update=False,
        )

    async def _async_update_data(self) -> CodexUsageData:
        try:
            data, credentials = await self.client.async_get_usage(self.credentials)
        except CodexAuthenticationError as err:
            raise ConfigEntryAuthFailed from err
        except (CodexConnectionError, CodexApiError) as err:
            raise UpdateFailed(str(err)) from err
        if credentials != self.credentials:
            self.credentials = credentials
            self.hass.config_entries.async_update_entry(
                self.config_entry,
                data={**self.config_entry.data, **credentials_to_entry_data(credentials)},
            )
        return data
