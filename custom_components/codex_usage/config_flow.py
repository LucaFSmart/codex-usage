"""Config flow for Codex Usage."""

from __future__ import annotations

from dataclasses import replace
from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers import aiohttp_client

from .api import (
    AvailableAccount,
    CodexApiClient,
    CodexApiError,
    CodexAuthenticationError,
    CodexConnectionError,
    CodexCredentials,
    CodexOptionalEndpointUnavailable,
    DeviceAuthorizationPending,
    DeviceAuthorizationUnavailable,
    DeviceCode,
)
from .const import (
    CONF_ACCOUNT_ID,
    CONF_UPDATE_INTERVAL,
    DEFAULT_UPDATE_INTERVAL,
    DOMAIN,
    MAX_UPDATE_INTERVAL,
    MIN_UPDATE_INTERVAL,
)
from .coordinator import credentials_to_entry_data


def workspace_choices(accounts: tuple[AvailableAccount, ...]) -> dict[str, str]:
    """Build private-value, user-friendly workspace selector choices."""
    choices: dict[str, str] = {}
    for index, account in enumerate(accounts, start=1):
        label = account.name or f"Workspace {index}"
        if account.structure:
            label = f"{label} · {account.structure}"
        choices[account.account_id] = label
    return choices


def preserve_reauth_workspace(credentials: CodexCredentials, account_id: str) -> CodexCredentials:
    """Keep the configured workspace even when account discovery is unavailable."""
    return replace(credentials, account_id=account_id)


class CodexUsageConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a Codex Usage config flow."""

    VERSION = 2

    def __init__(self) -> None:
        self._device_code: DeviceCode | None = None
        self._reauth_entry: ConfigEntry | None = None
        self._workspace_credentials: CodexCredentials | None = None
        self._workspace_accounts: tuple[AvailableAccount, ...] = ()
        self._workspace_reauth = False

    @property
    def _client(self) -> CodexApiClient:
        return CodexApiClient(aiohttp_client.async_get_clientsession(self.hass))

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Start device authorization."""
        if user_input is None:
            return self.async_show_form(step_id="user", data_schema=vol.Schema({}))
        return await self._async_start_device_flow("device")

    async def _async_start_device_flow(self, next_step: str) -> ConfigFlowResult:
        errors: dict[str, str] = {}
        try:
            self._device_code = await self._client.async_request_device_code()
        except DeviceAuthorizationUnavailable:
            errors["base"] = "device_auth_disabled"
        except CodexConnectionError:
            errors["base"] = "cannot_connect"
        except CodexApiError:
            errors["base"] = "unknown"
        if errors:
            return self.async_show_form(step_id="user", data_schema=vol.Schema({}), errors=errors)
        return await getattr(self, f"async_step_{next_step}")()

    async def async_step_device(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Complete device authorization."""
        result = await self._async_device_form("device", user_input)
        if isinstance(result, CodexCredentials):
            return await self._async_prepare_workspace(result, reauth=False)
        return result

    async def _async_device_form(
        self, step_id: str, user_input: dict[str, Any] | None
    ) -> ConfigFlowResult | CodexCredentials:
        if self._device_code is None:
            return self.async_abort(reason="device_flow_expired")
        errors: dict[str, str] = {}
        if user_input is not None:
            try:
                authorization = await self._client.async_poll_device_code(self._device_code)
                credentials = await self._client.async_exchange_device_code(authorization)
                return credentials
            except DeviceAuthorizationPending:
                errors["base"] = "authorization_pending"
            except CodexConnectionError:
                errors["base"] = "cannot_connect"
            except CodexAuthenticationError:
                errors["base"] = "invalid_auth"
            except CodexApiError:
                errors["base"] = "unknown"
        return self.async_show_form(
            step_id=step_id,
            data_schema=vol.Schema({vol.Required("confirm", default=False): bool}),
            description_placeholders={
                "verification_url": self._device_code.verification_url,
                "user_code": self._device_code.user_code,
            },
            errors=errors,
        )

    async def async_step_reauth(self, entry_data: dict[str, Any]) -> ConfigFlowResult:
        """Start reauthentication."""
        self._reauth_entry = self._get_reauth_entry()
        try:
            self._device_code = await self._client.async_request_device_code()
        except DeviceAuthorizationUnavailable:
            return self.async_abort(reason="device_auth_disabled")
        except CodexConnectionError, CodexApiError:
            return self.async_abort(reason="cannot_connect")
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Finish reauthentication."""
        result = await self._async_device_form("reauth_confirm", user_input)
        if isinstance(result, CodexCredentials):
            return await self._async_prepare_workspace(result, reauth=True)
        return result

    async def _async_prepare_workspace(
        self, credentials: CodexCredentials, *, reauth: bool
    ) -> ConfigFlowResult:
        """Discover, choose, and validate an accessible workspace."""
        try:
            accounts = await self._client.async_get_accounts(credentials)
        except CodexOptionalEndpointUnavailable, CodexConnectionError, CodexApiError:
            accounts = ()

        if reauth:
            entry = self._reauth_entry or self._get_reauth_entry()
            existing_account = entry.data.get(CONF_ACCOUNT_ID)
            matching = next(
                (account for account in accounts if account.account_id == existing_account), None
            )
            if isinstance(existing_account, str) and existing_account:
                return await self._async_finish_workspace(
                    preserve_reauth_workspace(credentials, existing_account),
                    matching.name if matching else None,
                    reauth=True,
                )

        if len(accounts) <= 1:
            account = accounts[0] if accounts else None
            selected = (
                replace(credentials, account_id=account.account_id) if account else credentials
            )
            return await self._async_finish_workspace(
                selected, account.name if account else None, reauth=reauth
            )

        self._workspace_credentials = credentials
        self._workspace_accounts = accounts
        self._workspace_reauth = reauth
        return await self.async_step_workspace()

    async def async_step_workspace(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Select one of multiple accessible workspaces."""
        choices = workspace_choices(self._workspace_accounts)
        if user_input is None:
            return self.async_show_form(
                step_id="workspace",
                data_schema=vol.Schema({vol.Required(CONF_ACCOUNT_ID): vol.In(choices)}),
            )
        credentials = self._workspace_credentials
        selected_id = user_input.get(CONF_ACCOUNT_ID)
        account = next(
            (item for item in self._workspace_accounts if item.account_id == selected_id), None
        )
        if credentials is None or account is None:
            return self.async_abort(reason="device_flow_expired")
        return await self._async_finish_workspace(
            replace(credentials, account_id=account.account_id),
            account.name,
            reauth=self._workspace_reauth,
        )

    async def _async_finish_workspace(
        self, credentials: CodexCredentials, name: str | None, *, reauth: bool
    ) -> ConfigFlowResult:
        """Validate the selected workspace and create or update the entry."""
        try:
            _, credentials = await self._client.async_get_usage(credentials)
        except CodexConnectionError:
            return self.async_abort(reason="cannot_connect")
        except CodexAuthenticationError:
            return self.async_abort(reason="invalid_auth")
        except CodexApiError:
            return self.async_abort(reason="unknown")

        await self.async_set_unique_id(self._unique_id(credentials))
        if reauth:
            entry = self._reauth_entry or self._get_reauth_entry()
            self._abort_if_unique_id_mismatch()
            return self.async_update_reload_and_abort(
                entry, data_updates=credentials_to_entry_data(credentials)
            )
        self._abort_if_unique_id_configured()
        title = name or "Codex Usage"
        return self.async_create_entry(
            title=title,
            data=credentials_to_entry_data(credentials),
            options={CONF_UPDATE_INTERVAL: DEFAULT_UPDATE_INTERVAL},
        )

    @staticmethod
    def _unique_id(credentials: CodexCredentials) -> str:
        """Distinguish users that share one ChatGPT workspace."""
        if credentials.user_id:
            return f"{credentials.account_id}:{credentials.user_id}"
        return credentials.account_id

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> OptionsFlow:
        return CodexUsageOptionsFlow()


class CodexUsageOptionsFlow(OptionsFlow):
    """Handle Codex Usage options."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        interval = self.config_entry.options.get(CONF_UPDATE_INTERVAL, DEFAULT_UPDATE_INTERVAL)
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_UPDATE_INTERVAL, default=interval): vol.All(
                        int, vol.Range(min=MIN_UPDATE_INTERVAL, max=MAX_UPDATE_INTERVAL)
                    )
                }
            ),
        )
