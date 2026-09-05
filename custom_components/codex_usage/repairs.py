"""One integration-wide Repair for automatic card resource registration."""

from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir

from .const import DOMAIN

ISSUE_ID = "card_registration_failed"


def registration_failed(hass: HomeAssistant) -> None:
    """Create or update the single issue; no account data is included."""
    ir.async_create_issue(
        hass,
        DOMAIN,
        ISSUE_ID,
        is_fixable=False,
        is_persistent=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key=ISSUE_ID,
    )


def registration_recovered(hass: HomeAssistant) -> None:
    """Clear the issue after success or the last loaded entry is removed."""
    ir.async_delete_issue(hass, DOMAIN, ISSUE_ID)
