"""Data coordinator for Codex Usage."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import asdict, dataclass, field, replace
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
    CodexHttpError,
    CodexOptionalEndpointUnavailable,
    CodexProfileStats,
    CodexProfileUnavailable,
    CodexUsageData,
    ResetCredits,
)
from .budget import UsageBudget, collect_usage_budgets
from .const import (
    CONF_ACCESS_TOKEN,
    CONF_ACCOUNT_ID,
    CONF_EMAIL,
    CONF_EXPIRES_AT,
    CONF_FEDRAMP,
    CONF_FETCH_PROFILE,
    CONF_FETCH_RESET_DETAILS,
    CONF_ID_TOKEN,
    CONF_PLAN_TYPE,
    CONF_REFRESH_TOKEN,
    CONF_UPDATE_INTERVAL,
    CONF_USER_ID,
    CONF_WORKSPACE_DISCOVERY,
    DEFAULT_UPDATE_INTERVAL,
    DOMAIN,
)
from .monitoring import (
    ResetSummary,
    SourceState,
    initial_sources,
    reset_context,
    reset_context_changed,
    reset_summary,
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
    reset_summary: ResetSummary | None = None
    budgets: dict[str, UsageBudget] = field(default_factory=dict)


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
        self.sources = initial_sources()
        self._read_retry_at: datetime | None = None
        self._usage_retry_at: datetime | None = None
        discovery = entry.data.get(CONF_WORKSPACE_DISCOVERY)
        if isinstance(discovery, str):
            try:
                discovered_at = datetime.fromisoformat(discovery)
            except ValueError:
                pass
            else:
                if discovered_at.tzinfo is not None:
                    self.sources["workspace_discovery"] = SourceState(
                        "ok", last_success=discovered_at, refresh_mode="on_auth"
                    )
        self._reset_reconciled_context: tuple | None = None
        self._reset_context_changed_at: datetime | None = None
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
        if not hasattr(self, "_request_lock"):
            self._request_lock = asyncio.Lock()
        async with self._request_lock:
            return await self._async_fetch_data()

    async def _async_fetch_data(self) -> CodexCoordinatorData:
        attempted_at = datetime.now(UTC)
        if not hasattr(self, "sources"):
            self.sources = initial_sources()
            self._reset_reconciled_context = None
            self._reset_context_changed_at = None
        interval = self.config_entry.options.get(CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL)
        self.client.on_credentials_refresh = self._persist_credentials
        for source, option, payload in (
            ("profile", CONF_FETCH_PROFILE, "_profile_data"),
            ("reset_details", CONF_FETCH_RESET_DETAILS, "_reset_credits"),
        ):
            if not self.config_entry.options.get(option, True):
                setattr(self, payload, None)
                self.sources[source] = SourceState("disabled", expected_interval_seconds=3600)
        deadlines = [
            value
            for value in (
                getattr(self, "_read_retry_at", None),
                getattr(self, "_usage_retry_at", None),
            )
            if value is not None and value > attempted_at
        ]
        if deadlines:
            previous = self.sources["usage"]
            self.sources["usage"] = SourceState(
                "error",
                previous.last_attempt,
                self._last_success,
                max(deadlines),
                "rate_limited",
                expected_interval_seconds=interval,
            )
            raise UpdateFailed("Waiting for the provider retry deadline")
        try:
            data, credentials = await self.client.async_get_usage(self.credentials)
        except CodexHttpError as err:
            deadline = max(err.retry_at, attempted_at + timedelta(seconds=interval))
            if err.status == 429:
                self._read_retry_at = deadline
            else:
                self._usage_retry_at = deadline
            self.sources["usage"] = SourceState(
                "error",
                attempted_at,
                self._last_success,
                deadline,
                "rate_limited" if err.status == 429 else "http_error",
                expected_interval_seconds=interval,
            )
            raise UpdateFailed(str(err)) from err
        except CodexAuthenticationError as err:
            self.sources["usage"] = SourceState(
                "error",
                attempted_at,
                self._last_success,
                error_code="authentication",
                expected_interval_seconds=interval,
            )
            raise ConfigEntryAuthFailed from err
        except (CodexConnectionError, CodexApiError) as err:
            code = "connection" if isinstance(err, CodexConnectionError) else "invalid_response"
            self.sources["usage"] = SourceState(
                "error",
                attempted_at,
                self._last_success,
                error_code=code,
                expected_interval_seconds=interval,
            )
            raise UpdateFailed("Unable to update Codex usage") from err
        self._persist_credentials(credentials)
        refreshed_at = attempted_at
        self._last_success = refreshed_at
        self.sources["usage"] = SourceState(
            "ok", refreshed_at, refreshed_at, expected_interval_seconds=interval
        )
        current_context = reset_context(data)
        if self._reset_reconciled_context is not None and reset_context_changed(
            self._reset_reconciled_context, current_context
        ):
            self._reset_context_changed_at = refreshed_at
        now = monotonic()
        if self.sources["profile"].state != "disabled" and now >= self._profile_next_attempt:
            try:
                self._profile_data = await self.client.async_get_profile(self.credentials)
            except CodexProfileUnavailable as err:
                self._profile_available = False
                self._profile_last_error = type(err).__name__
                self._profile_next_attempt = now + PROFILE_UPDATE_SECONDS
                self.sources["profile"] = SourceState(
                    "unsupported", refreshed_at, self._profile_last_success
                )
            except CodexHttpError as err:
                self._profile_last_error = type(err).__name__
                deadline = max(
                    err.retry_at, refreshed_at + timedelta(seconds=PROFILE_RETRY_SECONDS)
                )
                self._profile_next_attempt = now + (deadline - refreshed_at).total_seconds()
                self.sources["profile"] = SourceState(
                    "error",
                    refreshed_at,
                    self._profile_last_success,
                    deadline,
                    "rate_limited" if err.status == 429 else "http_error",
                    expected_interval_seconds=PROFILE_UPDATE_SECONDS,
                )
                if err.status == 429:
                    self._read_retry_at = deadline
            except (CodexAuthenticationError, CodexConnectionError, CodexApiError) as err:
                # Profile statistics are optional. A temporary failure must not make
                # the independently fetched limit sensors unavailable.
                self._profile_last_error = type(err).__name__
                self._profile_next_attempt = now + PROFILE_RETRY_SECONDS
                self.sources["profile"] = SourceState(
                    "error",
                    refreshed_at,
                    self._profile_last_success,
                    error_code="connection"
                    if isinstance(err, CodexConnectionError)
                    else "invalid_response",
                )
            else:
                self._profile_available = True
                self._profile_last_success = refreshed_at
                self._profile_last_error = None
                self._profile_next_attempt = now + PROFILE_UPDATE_SECONDS
                self.sources["profile"] = SourceState("ok", refreshed_at, refreshed_at)

        if (
            self.sources["reset_details"].state != "disabled"
            and now >= self._reset_next_attempt
            and not (getattr(self, "_read_retry_at", None) and self._read_retry_at > refreshed_at)
        ):
            try:
                self._reset_credits = await self.client.async_get_reset_credits(self.credentials)
            except CodexOptionalEndpointUnavailable as err:
                self._reset_available = False
                self._reset_last_error = type(err).__name__
                self._reset_next_attempt = now + PROFILE_UPDATE_SECONDS
                self.sources["reset_details"] = SourceState(
                    "unsupported", refreshed_at, self._reset_last_success
                )
            except CodexHttpError as err:
                self._reset_last_error = type(err).__name__
                deadline = max(
                    err.retry_at, refreshed_at + timedelta(seconds=PROFILE_RETRY_SECONDS)
                )
                self._reset_next_attempt = now + (deadline - refreshed_at).total_seconds()
                self.sources["reset_details"] = SourceState(
                    "error",
                    refreshed_at,
                    self._reset_last_success,
                    deadline,
                    "rate_limited" if err.status == 429 else "http_error",
                    expected_interval_seconds=PROFILE_UPDATE_SECONDS,
                )
                if err.status == 429:
                    self._read_retry_at = deadline
            except (CodexAuthenticationError, CodexConnectionError, CodexApiError) as err:
                self._reset_last_error = type(err).__name__
                self._reset_next_attempt = now + PROFILE_RETRY_SECONDS
                self.sources["reset_details"] = SourceState(
                    "error",
                    refreshed_at,
                    self._reset_last_success,
                    error_code="connection"
                    if isinstance(err, CodexConnectionError)
                    else "invalid_response",
                )
            else:
                self._reset_available = True
                self._reset_last_success = refreshed_at
                self._reset_last_error = None
                self._reset_next_attempt = now + PROFILE_UPDATE_SECONDS
                self.sources["reset_details"] = SourceState("ok", refreshed_at, refreshed_at)
                self._reset_reconciled_context = current_context

        for key, next_attempt in (
            ("profile", self._profile_next_attempt),
            ("reset_details", self._reset_next_attempt),
        ):
            source = self.sources[key]
            self.sources[key] = replace(
                source,
                expected_interval_seconds=PROFILE_UPDATE_SECONDS,
                retry_at=source.retry_at
                or (
                    refreshed_at + timedelta(seconds=max(0, next_attempt - now))
                    if source.state in ("error", "unsupported")
                    else None
                ),
            )
        summary = reset_summary(
            data,
            self._reset_credits,
            now=refreshed_at,
            usage_updated_at=refreshed_at,
            details_updated_at=self._reset_last_success,
            context_changed_at=self._reset_context_changed_at,
            details_enabled=self.config_entry.options.get(CONF_FETCH_RESET_DETAILS, True),
        )
        budgets = collect_usage_budgets(
            data,
            now=refreshed_at,
            last_success=refreshed_at,
            update_interval_seconds=interval,
            core_available=True,
        )

        return CodexCoordinatorData(
            usage=data,
            profile=self._profile_data,
            reset_credits=self._reset_credits,
            refreshed_at=refreshed_at,
            reset_summary=summary,
            budgets=budgets,
        )

    def _persist_credentials(self, credentials: CodexCredentials) -> None:
        """Save a rotated refresh token before another request can fail."""
        if credentials != self.credentials:
            if (credentials.account_id, credentials.user_id) != (
                self.credentials.account_id,
                self.credentials.user_id,
            ):
                raise CodexAuthenticationError("Refreshed identity does not match the entry")
            self.credentials = credentials
            self.hass.config_entries.async_update_entry(
                self.config_entry,
                data={**self.config_entry.data, **credentials_to_entry_data(credentials)},
            )
