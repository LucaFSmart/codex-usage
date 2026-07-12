"""Register the bundled Codex Usage Lovelace card."""

from __future__ import annotations

import asyncio
from pathlib import Path

from homeassistant.components.http import StaticPathConfig
from homeassistant.components.lovelace import MODE_STORAGE
from homeassistant.core import HomeAssistant

from .const import CARD_URL, CARD_VERSION

_BUNDLE_PATH = Path(__file__).parent / "frontend" / "codex-usage-card.js"


class CodexUsageCardRegistration:
    """Manage the bundled card's static path and Lovelace resource."""

    def __init__(self, hass: HomeAssistant) -> None:
        """Initialize card registration."""
        self.hass = hass
        self.lovelace = hass.data.get("lovelace")
        self._static_path_registered = False
        self._registration_lock = asyncio.Lock()
        self._registered = False

    @property
    def is_registered(self) -> bool:
        """Return whether registration completed successfully."""
        return self._registered

    async def async_register(self) -> None:
        """Register the static path and upsert the storage resource."""
        async with self._registration_lock:
            if self._registered:
                return
            await self._async_register_static_path()
            if self._storage_resources_supported():
                await self._async_upsert_resource()
            self._registered = True

    async def async_unregister(self) -> None:
        """Remove all resources that point to the bundled card."""
        async with self._registration_lock:
            if self._storage_resources_supported():
                await self.lovelace.resources.async_get_info()
                for item in list(self.lovelace.resources.async_items()):
                    if self._path(item["url"]) == CARD_URL:
                        await self.lovelace.resources.async_delete_item(item["id"])
            self._registered = False

    async def _async_register_static_path(self) -> None:
        """Expose the bundled JavaScript through Home Assistant HTTP."""
        http = getattr(self.hass, "http", None)
        if http is None or self._static_path_registered:
            return
        await http.async_register_static_paths(
            [StaticPathConfig(CARD_URL, str(_BUNDLE_PATH), cache_headers=False)]
        )
        self._static_path_registered = True

    def _storage_resources_supported(self) -> bool:
        """Return whether Lovelace resources can be changed through storage."""
        if self.lovelace is None or getattr(self.lovelace, "resources", None) is None:
            return False
        mode = getattr(
            self.lovelace,
            "resource_mode",
            getattr(self.lovelace, "mode", None),
        )
        return mode == MODE_STORAGE

    async def _async_upsert_resource(self) -> None:
        """Create the card resource or update its version in place."""
        await self.lovelace.resources.async_get_info()
        resource = {"res_type": "module", "url": f"{CARD_URL}?v={CARD_VERSION}"}
        matches = [
            item
            for item in self.lovelace.resources.async_items()
            if self._path(item["url"]) == CARD_URL
        ]
        if not matches:
            await self.lovelace.resources.async_create_item(resource)
            return

        canonical, *duplicates = matches
        if canonical.get("url") != resource["url"] or canonical.get("res_type") != "module":
            await self.lovelace.resources.async_update_item(canonical["id"], resource)
        for duplicate in duplicates:
            await self.lovelace.resources.async_delete_item(duplicate["id"])

    @staticmethod
    def _path(url: str) -> str:
        """Return a resource URL without its query string."""
        return url.split("?", maxsplit=1)[0]
