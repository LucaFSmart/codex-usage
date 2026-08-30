"""Repository metadata and translation consistency tests."""

import json
from pathlib import Path
from typing import Any

from PIL import Image

from custom_components.codex_usage.binary_sensor import BINARY_SENSORS
from custom_components.codex_usage.sensor import PROFILE_SENSORS, SENSORS

ROOT = Path(__file__).parents[1]
COMPONENT = ROOT / "custom_components" / "codex_usage"


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _leaf_paths(value: Any, prefix: tuple[str, ...] = ()) -> set[tuple[str, ...]]:
    if not isinstance(value, dict):
        return {prefix}
    return {path for key, child in value.items() for path in _leaf_paths(child, (*prefix, key))}


def test_translations_match_canonical_strings() -> None:
    english = _load_json(COMPONENT / "translations" / "en.json")
    german = _load_json(COMPONENT / "translations" / "de.json")

    assert _leaf_paths(german) == _leaf_paths(english)


def test_entity_icons_cover_static_entities() -> None:
    icons = _load_json(COMPONENT / "icons.json")["entity"]

    assert set(icons["sensor"]) == {item.translation_key for item in (*SENSORS, *PROFILE_SENSORS)}
    assert set(icons["binary_sensor"]) == {item.translation_key for item in BINARY_SENSORS}


def test_hacs_and_manifest_metadata() -> None:
    manifest = _load_json(COMPONENT / "manifest.json")
    hacs = _load_json(ROOT / "hacs.json")

    assert manifest["domain"] == "codex_usage"
    assert manifest["config_flow"] is True
    assert manifest["iot_class"] == "cloud_polling"
    assert manifest["version"] == "0.6.4"
    assert hacs["homeassistant"] == "2026.3.0"
    assert set(hacs) == {"homeassistant", "name"}


def test_brand_icon_contract() -> None:
    with Image.open(COMPONENT / "brand" / "icon.png") as icon:
        assert icon.size == (256, 256)
        assert icon.mode == "RGBA"
        assert icon.getchannel("A").getpixel((0, 0)) == 0
