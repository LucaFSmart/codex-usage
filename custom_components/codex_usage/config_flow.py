"""Config flow for Codex Usage."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigEntry, ConfigFlow, ConfigFlowResult, OptionsFlow
from homeassistant.core import callback
from homeassistant.helpers import aiohttp_client

from .api import (
    CodexApiClient,
    CodexApiError,
    CodexAuthenticationError,
    CodexConnectionError,
    CodexCredentials,
    DeviceAuthorizationPending,
    DeviceAuthorizationUnavailable,
    DeviceCode,
)
from .const import (
    CONF_UPDATE_INTERVAL,
    DEFAULT_UPDATE_INTERVAL,
    DOMAIN,
    MAX_UPDATE_INTERVAL,
    MIN_UPDATE_INTERVAL,
)
from .coordinator import credentials_to_entry_data


class CodexUsageConfigFlow(ConfigFlow, domain=DOMAIN):
    """Handle a Codex Usage config flow."""

    VERSION = 1

    def __init__(self) -> None:
        self._device_code: DeviceCode | None = None
        self._reauth_entry: ConfigEntry | None = None

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
            await self.async_set_unique_id(self._unique_id(result))
            self._abort_if_unique_id_configured()
            return self.async_create_entry(
                title=self._entry_title(result),
                data=credentials_to_entry_data(result),
                options={CONF_UPDATE_INTERVAL: DEFAULT_UPDATE_INTERVAL},
            )
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
                _, credentials = await self._client.async_get_usage(credentials)
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
            entry = self._reauth_entry or self._get_reauth_entry()
            await self.async_set_unique_id(self._unique_id(result))
            self._abort_if_unique_id_mismatch()
            return self.async_update_reload_and_abort(
                entry,
                data_updates=credentials_to_entry_data(result),
            )
        return result

    @staticmethod
    def _entry_title(credentials: CodexCredentials) -> str:
        plan = f" - {credentials.plan_type}" if credentials.plan_type else ""
        return f"Codex Usage ({credentials.account_id}{plan})"

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
