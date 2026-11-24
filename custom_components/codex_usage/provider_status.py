"""Poll public Codex component status independently of account usage."""

from __future__ import annotations

import asyncio
import json
import logging
from collections.abc import Callable
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from aiohttp import ClientError, ClientTimeout, DummyCookieJar
from homeassistant.const import EVENT_HOMEASSISTANT_STOP
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import aiohttp_client

from .retry import retry_deadline

_LOGGER = logging.getLogger(__name__)
_STATUS_URL = "https://status.openai.com/"
_COMPONENTS_URL = f"{_STATUS_URL}api/v2/components.json"
_POLL_SECONDS = 300
_FRESH_SECONDS = 900
_REQUEST_TIMEOUT = ClientTimeout(total=10)
_MAX_RESPONSE_BYTES = 128 * 1024
_MAX_COMPONENTS = 256
_COMPONENT_NAMES = {
    "01JVCV8YSWZFRSM1G5CVP253SK": "Codex Web",
    "01KMP3KP5MGE23B80K1EK4S8PV": "Codex API",
    "01KMKFAMWKNQ84Z1766MV08ZDE": "Codex CLI",
    "01KMP3KP5M8X0EBTVW6KN327EE": "Codex VS Code Extension",
    "01KMKFAMWKQ81YWSE1Z18R6VHR": "Codex in ChatGPT Desktop",
}


class ProviderState(StrEnum):
    """Normalized status of the public Codex components."""

    OPERATIONAL = "operational"
    DEGRADED = "degraded"
    OUTAGE = "outage"
    MAINTENANCE = "maintenance"
    UNKNOWN = "unknown"


_STATUS_MAP = {
    "operational": ProviderState.OPERATIONAL,
    "degraded_performance": ProviderState.DEGRADED,
    "partial_outage": ProviderState.OUTAGE,
    "major_outage": ProviderState.OUTAGE,
    "under_maintenance": ProviderState.MAINTENANCE,
}
_UNKNOWN_COMPONENTS = (ProviderState.UNKNOWN,) * len(_COMPONENT_NAMES)


def _normalize_components(payload: object) -> tuple[ProviderState, ...]:
    """Keep one normalized state for each known public component."""
    components = payload.get("components") if isinstance(payload, dict) else None
    if not isinstance(components, list) or len(components) > _MAX_COMPONENTS:
        raise ValueError("Invalid public status component list")

    states: dict[str, ProviderState] = {}
    for component in components:
        if not isinstance(component, dict):
            continue
        component_id = component.get("id")
        if not isinstance(component_id, str) or component_id not in _COMPONENT_NAMES:
            continue
        status = component.get("status")
        states[component_id] = (
            _STATUS_MAP.get(status, ProviderState.UNKNOWN)
            if isinstance(status, str) and component_id not in states
            else ProviderState.UNKNOWN
        )
    return tuple(
        states.get(component_id, ProviderState.UNKNOWN) for component_id in _COMPONENT_NAMES
    )


def _aggregate_state(components: tuple[ProviderState, ...]) -> ProviderState:
    for state in (
        ProviderState.OUTAGE,
        ProviderState.DEGRADED,
        ProviderState.MAINTENANCE,
        ProviderState.UNKNOWN,
    ):
        if state in components:
            return state
    return ProviderState.OPERATIONAL


class ProviderStatusCoordinator:
    """Own a single public poll, freshness deadline and set of entity listeners."""

    def __init__(self, hass: HomeAssistant, on_update: Callable[[], None]) -> None:
        self._hass = hass
        self._loop = asyncio.get_running_loop()
        self._on_update = on_update
        self._listeners: set[Callable[[], None]] = set()
        self._stop_listener: Callable[[], None] | None = None
        self._poll_timer: asyncio.TimerHandle | None = None
        self._freshness_timer: asyncio.TimerHandle | None = None
        self._request: asyncio.Task[None] | None = None
        self._components = _UNKNOWN_COMPONENTS
        self._last_attempt: datetime | None = None
        self._last_success: datetime | None = None
        self._last_fetch_ok = False
        self._fresh_until: float | None = None

    @property
    def stale(self) -> bool:
        """Return whether the last successful observation has expired."""
        return self._fresh_until is not None and self._loop.time() >= self._fresh_until

    @property
    def available(self) -> bool:
        """Return whether the latest observation was successful and remains fresh."""
        return self._last_fetch_ok and not self.stale

    @property
    def state(self) -> ProviderState:
        """Aggregate the fresh states of the public Codex components."""
        return _aggregate_state(self._components) if self.available else ProviderState.UNKNOWN

    def card_payload(self) -> dict[str, Any]:
        """Return only the public, normalized fields consumed by the card."""
        available = self.available
        components = self._components if available else _UNKNOWN_COMPONENTS
        return {
            "state": _aggregate_state(components).value,
            "available": available,
            "last_success": self._last_success.isoformat() if self._last_success else None,
            "last_attempt": self._last_attempt.isoformat() if self._last_attempt else None,
            "stale": self.stale,
            "components": [
                {"id": component_id, "name": name, "state": state.value}
                for (component_id, name), state in zip(
                    _COMPONENT_NAMES.items(), components, strict=True
                )
            ],
            "url": _STATUS_URL,
        }

    @callback
    def async_start(self) -> None:
        """Begin polling after the first account's platforms have set up."""
        if self._stop_listener is not None:
            return
        self._stop_listener = self._hass.bus.async_listen_once(
            EVENT_HOMEASSISTANT_STOP, self._async_on_hass_stop
        )
        self._async_poll()

    @callback
    def _async_on_hass_stop(self, _event: Any) -> None:
        self._stop_listener = None
        self.async_stop()

    @callback
    def async_stop(self) -> None:
        """Cancel the in-flight request and every subscription owned by this poller."""
        if self._stop_listener is not None:
            self._stop_listener()
            self._stop_listener = None
        if self._poll_timer is not None:
            self._poll_timer.cancel()
            self._poll_timer = None
        if self._freshness_timer is not None:
            self._freshness_timer.cancel()
            self._freshness_timer = None
        if self._request is not None:
            self._request.cancel()
            self._request = None
        self._listeners.clear()

    @callback
    def async_add_listener(self, listener: Callable[[], None]) -> Callable[[], None]:
        """Subscribe to status changes until the entity unloads."""
        self._listeners.add(listener)
        return lambda: self._listeners.discard(listener)

    @callback
    def _async_notify(self) -> None:
        self._on_update()
        for listener in tuple(self._listeners):
            listener()

    @callback
    def _async_expire(self) -> None:
        self._freshness_timer = None
        self._fresh_until = self._loop.time()
        self._async_notify()

    @callback
    def _async_poll(self) -> None:
        self._poll_timer = None
        self._request = self._hass.async_create_background_task(
            self._async_refresh(), name="Codex provider status", eager_start=False
        )

    async def _async_refresh(self) -> None:
        self._last_attempt = datetime.now(UTC)
        delay = _POLL_SECONDS
        try:
            components, delay = await self._async_fetch()
        except (ClientError, TimeoutError, ValueError, RecursionError) as err:
            _LOGGER.debug("Could not refresh public Codex status (%s)", type(err).__name__)
            components = None
        finally:
            self._request = None

        self._last_fetch_ok = components is not None
        if components is not None:
            self._components = components
            self._last_success = datetime.now(UTC)
            self._fresh_until = self._loop.time() + _FRESH_SECONDS
            if self._freshness_timer is not None:
                self._freshness_timer.cancel()
            self._freshness_timer = self._loop.call_at(self._fresh_until, self._async_expire)

        self._poll_timer = self._loop.call_later(delay, self._async_poll)
        self._async_notify()

    async def _async_fetch(self) -> tuple[tuple[ProviderState, ...] | None, float]:
        # Reuse HA's TLS connector with a dedicated session that has no cookie or auth state.
        session = aiohttp_client.async_create_clientsession(
            self._hass,
            auto_cleanup=False,
            cookie_jar=DummyCookieJar(),
            trust_env=False,
        )
        try:
            async with session.get(
                _COMPONENTS_URL,
                allow_redirects=False,
                auto_decompress=False,
                headers={"Accept": "application/json", "Accept-Encoding": "identity"},
                middlewares=(),
                timeout=_REQUEST_TIMEOUT,
            ) as response:
                if response.status in (429, 503):
                    now = datetime.now(UTC)
                    deadline = retry_deadline(
                        response.headers.get("Retry-After"),
                        now=now,
                        floor_seconds=_POLL_SECONDS,
                        server_date=response.headers.get("Date"),
                    )
                    return None, (deadline - now).total_seconds()
                if response.status != 200:
                    return None, _POLL_SECONDS

                body = bytearray()
                async for chunk in response.content.iter_chunked(8192):
                    if len(body) + len(chunk) > _MAX_RESPONSE_BYTES:
                        raise ValueError("Public status response exceeds the size limit")
                    body.extend(chunk)
                return _normalize_components(json.loads(body)), _POLL_SECONDS
        finally:
            session.detach()
