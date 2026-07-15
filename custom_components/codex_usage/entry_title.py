"""Privacy-safe config-entry titles shared by devices and the bundled card."""

from __future__ import annotations

from typing import Any


def safe_entry_title(entry: Any) -> str:
    """Return a user title without exposing legacy workspace identifiers."""
    title = entry.title if isinstance(getattr(entry, "title", None), str) else ""
    if not title or has_legacy_generated_title(entry):
        return "Codex Usage"
    return title


def has_legacy_generated_title(entry: Any) -> bool:
    """Return whether Home Assistant stored the pre-0.5 generated title."""
    title = entry.title if isinstance(getattr(entry, "title", None), str) else ""
    data = entry.data if isinstance(getattr(entry, "data", None), dict) else {}
    account_id = data.get("account_id")
    if not isinstance(account_id, str) or not account_id:
        return False
    return title.startswith(f"Codex Usage ({account_id} - ") and title.endswith(")")
