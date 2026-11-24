"""Tests for the shared public Codex status feed."""

import asyncio
import json
from collections.abc import Callable
from contextlib import asynccontextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from aiohttp import ClientConnectionError, DummyCookieJar

from custom_components.codex_usage.provider_status import ProviderStatusCoordinator

WEB = "01JVCV8YSWZFRSM1G5CVP253SK"
API = "01KMP3KP5MGE23B80K1EK4S8PV"
CLI = "01KMKFAMWKNQ84Z1766MV08ZDE"
VSCODE = "01KMP3KP5M8X0EBTVW6KN327EE"
DESKTOP = "01KMKFAMWKQ81YWSE1Z18R6VHR"


@dataclass
class _Timer:
    deadline: float
    callback: Callable[[], None]
    cancelled: bool = False

    def cancel(self) -> None:
        self.cancelled = True


class _Clock:
    def __init__(self) -> None:
        self.now = 0
        self.timers: list[_Timer] = []

    def time(self) -> float:
        return self.now

    def call_at(self, deadline, callback) -> _Timer:
        timer = _Timer(deadline, callback)
        self.timers.append(timer)
        return timer

    def call_later(self, delay, callback) -> _Timer:
        return self.call_at(self.now + delay, callback)

    def advance_to(self, target) -> None:
        self.now = target
        for timer in sorted(self.timers, key=lambda timer: timer.deadline):
            if not timer.cancelled and timer.deadline <= target:
                timer.cancel()
                timer.callback()


def _runtime():
    tasks = []
    clock = _Clock()

    def create_task(coro, name, *, eager_start):
        task = asyncio.create_task(coro, name=name, eager_start=eager_start)
        tasks.append(task)
        return task

    hass = SimpleNamespace(
        bus=SimpleNamespace(async_listen_once=MagicMock(return_value=MagicMock())),
        async_create_background_task=create_task,
    )
    changed = MagicMock()
    coordinator = ProviderStatusCoordinator(hass, changed)
    coordinator._loop = clock
    return coordinator, clock, tasks, changed


def _components():
    return [
        {
            "id": component_id,
            "status": "operational",
            "name": "untrusted provider name",
            "description": "untrusted provider details",
            "updated_at": "1999-01-01T00:00:00+00:00",
        }
        for component_id in (WEB, API, CLI, VSCODE, DESKTOP)
    ]


@asynccontextmanager
async def _response(*, payload=None, body=None, status=200, headers=None):
    async def iter_chunked(size):
        data = body if body is not None else json.dumps(payload).encode()
        for start in range(0, len(data), size):
            yield data[start : start + size]

    yield SimpleNamespace(
        status=status, headers=headers or {}, content=SimpleNamespace(iter_chunked=iter_chunked)
    )


@pytest.mark.parametrize(
    ("web_status", "expected"),
    [
        ("operational", "operational"),
        ("degraded_performance", "degraded"),
        ("partial_outage", "outage"),
        ("major_outage", "outage"),
        ("under_maintenance", "maintenance"),
        ("upcoming_status", "unknown"),
        (["operational"], "unknown"),
        (None, "unknown"),
    ],
)
def test_public_fetch_normalizes_and_allows_only_known_fields(web_status, expected):
    async def scenario():
        coordinator, _, tasks, _ = _runtime()
        components = _components()
        components[0]["status"] = web_status
        components.append({"id": "unrelated", "name": "Codex Web", "status": "major_outage"})
        with patch("homeassistant.helpers.aiohttp_client.async_create_clientsession") as factory:
            session = factory.return_value
            session.get.return_value = _response(payload={"components": components, "secret": ""})
            coordinator.async_start()
            await tasks[-1]
        coordinator.async_stop()

        args, kwargs = session.get.call_args
        assert args == ("https://status.openai.com/api/v2/components.json",)
        assert kwargs["allow_redirects"] is False
        assert kwargs["timeout"].total == 10
        assert kwargs["headers"] == {"Accept": "application/json", "Accept-Encoding": "identity"}
        assert set(kwargs) == {
            "allow_redirects",
            "auto_decompress",
            "headers",
            "middlewares",
            "timeout",
        }
        assert isinstance(factory.call_args.kwargs["cookie_jar"], DummyCookieJar)
        assert factory.call_args.kwargs["trust_env"] is False
        session.detach.assert_called_once()

        payload = coordinator.card_payload()
        observed = datetime.fromisoformat(payload["last_success"])
        attempted = datetime.fromisoformat(payload["last_attempt"])
        assert attempted <= observed <= datetime.now(UTC)
        assert observed.year != 1999
        assert payload == {
            "state": expected,
            "available": True,
            "last_success": observed.isoformat(),
            "last_attempt": attempted.isoformat(),
            "stale": False,
            "components": [
                {"id": WEB, "name": "Codex Web", "state": expected},
                {"id": API, "name": "Codex API", "state": "operational"},
                {"id": CLI, "name": "Codex CLI", "state": "operational"},
                {"id": VSCODE, "name": "Codex VS Code Extension", "state": "operational"},
                {"id": DESKTOP, "name": "Codex in ChatGPT Desktop", "state": "operational"},
            ],
            "url": "https://status.openai.com/",
        }

    asyncio.run(scenario())


@pytest.mark.parametrize("duplicate", [False, True])
def test_incomplete_or_ambiguous_components_never_report_operational(duplicate):
    async def scenario():
        coordinator, clock, tasks, _ = _runtime()
        components = _components()
        if duplicate:
            components.insert(0, {"id": WEB, "status": "major_outage"})
        else:
            components.pop(0)
        with patch("homeassistant.helpers.aiohttp_client.async_create_clientsession") as factory:
            session = factory.return_value
            session.get.return_value = _response(payload={"components": components})
            coordinator.async_start()
            await tasks[-1]
            assert coordinator.state == "unknown"
            assert coordinator.card_payload()["components"][0]["state"] == "unknown"

            next(component for component in components if component["id"] == DESKTOP)["status"] = (
                "major_outage"
            )
            session.get.return_value = _response(payload={"components": components})
            clock.advance_to(300)
            await tasks[-1]
            assert coordinator.state == "outage"
        coordinator.async_stop()

    asyncio.run(scenario())


@pytest.mark.parametrize(
    ("response", "error"),
    [
        ({"status": 302, "headers": {"Location": "https://example.invalid/"}}, None),
        ({"status": 403}, None),
        ({"payload": {"unexpected": []}}, None),
        ({"payload": {"components": [{}] * 257}}, None),
        ({"body": b" " * (128 * 1024 + 1)}, None),
        ({"body": b"[" * 40_000}, None),
        ({"body": b"broken JSON"}, None),
        (None, ClientConnectionError),
        (None, TimeoutError),
    ],
)
def test_failed_or_unbounded_fetch_is_unknown_and_unavailable(response, error):
    async def scenario():
        coordinator, clock, tasks, changed = _runtime()
        with patch("homeassistant.helpers.aiohttp_client.async_create_clientsession") as factory:
            get = factory.return_value.get
            get.return_value = _response(payload={"components": _components()})
            coordinator.async_start()
            await tasks[-1]
            previous_success = coordinator.card_payload()["last_success"]

            if response is None:
                get.side_effect = error
            else:
                get.return_value = _response(**response)
            clock.advance_to(300)
            await tasks[-1]
            assert get.call_count == 2
        coordinator.async_stop()

        status = coordinator.card_payload()
        assert status["available"] is False
        assert status["state"] == "unknown"
        assert status["last_success"] == previous_success
        assert all(component["state"] == "unknown" for component in status["components"])
        assert changed.call_count == 2

    asyncio.run(scenario())


@pytest.mark.parametrize(
    ("code", "headers"),
    [
        (429, {"Retry-After": "1200"}),
        (
            503,
            {
                "Date": "Tue, 24 Nov 2026 00:00:00 GMT",
                "Retry-After": "Tue, 24 Nov 2026 00:20:00 GMT",
            },
        ),
    ],
)
def test_retry_after_delays_polling_without_delaying_stale_notification(code, headers):
    async def scenario():
        coordinator, clock, tasks, changed = _runtime()
        sensor_updated = MagicMock()
        remove_listener = coordinator.async_add_listener(sensor_updated)
        with patch("homeassistant.helpers.aiohttp_client.async_create_clientsession") as factory:
            get = factory.return_value.get
            get.return_value = _response(payload={"components": _components()})
            coordinator.async_start()
            await tasks[-1]
            assert coordinator.state == "operational"
            clock.advance_to(299)
            get.assert_called_once()

            get.return_value = _response(status=code, headers=headers)
            clock.advance_to(300)
            await tasks[-1]
            clock.advance_to(899)
            assert coordinator.stale is False
            clock.advance_to(900)
            assert coordinator.stale is True
            assert coordinator.state == "unknown"
            assert changed.call_count == 3
            assert sensor_updated.call_count == 3

            remove_listener()
            clock.advance_to(1499)
            assert get.call_count == 2
            get.return_value = _response(payload={"components": _components()})
            clock.advance_to(1500)
            await tasks[-1]
            assert coordinator.available is True
            assert coordinator.stale is False
            assert sensor_updated.call_count == 3

            coordinator.async_stop()
            clock.advance_to(3000)
            assert get.call_count == 3
            assert changed.call_count == 4

    asyncio.run(scenario())


def test_stop_cancels_an_in_flight_request_without_refreshing_again():
    async def scenario():
        coordinator, clock, tasks, changed = _runtime()
        entered = asyncio.Event()

        @asynccontextmanager
        async def pending_response():
            entered.set()
            await asyncio.Future()
            yield

        with patch("homeassistant.helpers.aiohttp_client.async_create_clientsession") as factory:
            session = factory.return_value
            session.get.return_value = pending_response()
            coordinator.async_start()
            await entered.wait()
            coordinator.async_stop()
            with pytest.raises(asyncio.CancelledError):
                await tasks[-1]
            clock.advance_to(1000)
            session.get.assert_called_once()
            session.detach.assert_called_once()
        changed.assert_not_called()

    asyncio.run(scenario())
