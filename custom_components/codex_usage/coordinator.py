"""Data coordinator for Codex Usage."""

from __future__ import annotations

import logging
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from time import monotonic

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
    CodexOptionalEndpointUnavailable,
    CodexProfileStats,
    CodexProfileUnavailable,
    CodexUsageData,
    ResetCredits,
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

PROFILE_UPDATE_SECONDS = 60 * 60
PROFILE_RETRY_SECONDS = 15 * 60


@dataclass(frozen=True, slots=True)
class CodexCoordinatorData:
    """Combined data from the usage and optional profile endpoints."""

    usage: CodexUsageData
    profile: CodexProfileStats | None
    reset_credits: ResetCredits | None
    refreshed_at: datetime


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
        CONF_FEDRAMP: values["fedramp"],
    }


class CodexUsageCoordinator(DataUpdateCoordinator[CodexCoordinatorData]):
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
        self._profile_data: CodexProfileStats | None = None
        self._profile_next_attempt = 0.0
        self._profile_last_success: datetime | None = None
        self._profile_available: bool | None = None
        self._profile_last_error: str | None = None
        self._reset_credits: ResetCredits | None = None
        self._reset_next_attempt = 0.0
        self._reset_last_success: datetime | None = None
        self._reset_available: bool | None = None
        self._reset_last_error: str | None = None
        self._last_success: datetime | None = None
        interval = entry.options.get(CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL)
        super().__init__(
            hass,
            logger=_LOGGER,
            name=DOMAIN,
            update_interval=timedelta(seconds=interval),
            config_entry=entry,
            always_update=False,
        )

    @property
    def profile_available(self) -> bool | None:
        """Return whether the optional profile endpoint has succeeded."""
        return self._profile_available

    @property
    def profile_last_success(self) -> datetime | None:
        """Return the last successful profile update time."""
        return self._profile_last_success

    @property
    def profile_last_error(self) -> str | None:
        """Return the last profile error class without exposing response data."""
        return self._profile_last_error

    @property
    def reset_available(self) -> bool | None:
        """Return whether reset-credit metadata is available."""
        return self._reset_available

    @property
    def reset_last_success(self) -> datetime | None:
        """Return the last successful reset-metadata update time."""
        return self._reset_last_success

    @property
    def reset_last_error(self) -> str | None:
        """Return the last safe reset-metadata error class."""
        return self._reset_last_error

    @property
    def last_success(self) -> datetime | None:
        """Return the last successful core usage update."""
        return self._last_success

    async def _async_update_data(self) -> CodexCoordinatorData:
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
        refreshed_at = datetime.now(UTC)
        self._last_success = refreshed_at
        now = monotonic()
        if now >= self._profile_next_attempt:
            try:
                self._profile_data = await self.client.async_get_profile(self.credentials)
            except CodexProfileUnavailable as err:
                self._profile_available = False
                self._profile_last_error = type(err).__name__
                self._profile_next_attempt = now + PROFILE_UPDATE_SECONDS
            except (CodexAuthenticationError, CodexConnectionError, CodexApiError) as err:
                # Profile statistics are optional. A temporary failure must not make
                # the independently fetched limit sensors unavailable.
                self._profile_last_error = type(err).__name__
                self._profile_next_attempt = now + PROFILE_RETRY_SECONDS
            else:
                self._profile_available = True
                self._profile_last_success = datetime.now(UTC)
                self._profile_last_error = None
                self._profile_next_attempt = now + PROFILE_UPDATE_SECONDS

        if now >= self._reset_next_attempt:
            try:
                self._reset_credits = await self.client.async_get_reset_credits(self.credentials)
            except CodexOptionalEndpointUnavailable as err:
                self._reset_available = False
                self._reset_last_error = type(err).__name__
                self._reset_next_attempt = now + PROFILE_UPDATE_SECONDS
            except (CodexAuthenticationError, CodexConnectionError, CodexApiError) as err:
                self._reset_last_error = type(err).__name__
                self._reset_next_attempt = now + PROFILE_RETRY_SECONDS
            else:
                self._reset_available = True
                self._reset_last_success = datetime.now(UTC)
                self._reset_last_error = None
                self._reset_next_attempt = now + PROFILE_UPDATE_SECONDS

        return CodexCoordinatorData(
            usage=data,
            profile=self._profile_data,
            reset_credits=self._reset_credits,
            refreshed_at=refreshed_at,
        )
