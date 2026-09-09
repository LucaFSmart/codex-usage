"""Safe HTTP Retry-After interpretation, independent of request scheduling."""

from datetime import UTC, datetime, timedelta
from email.utils import parsedate_to_datetime


def _http_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        result = parsedate_to_datetime(value)
        return result.astimezone(UTC) if result.tzinfo else result.replace(tzinfo=UTC)
    except TypeError, ValueError, OverflowError:
        return None


def retry_deadline(
    value: str | None,
    *,
    now: datetime,
    floor_seconds: float,
    server_date: str | None = None,
) -> datetime:
    """Return a deadline no earlier than either the provider delay or local floor.

    Absolute headers use the server clock where available. A delay beyond the
    datetime range is represented by its last instant, not a short retry cycle.
    """
    seconds = max(0, floor_seconds)
    if value:
        value = value.strip()
        if value.isascii() and value.isdecimal():
            significant = value.lstrip("0") or "0"
            if len(significant) > 12:
                return datetime.max.replace(tzinfo=UTC)
            seconds = max(seconds, int(significant))
        elif (retry_at := _http_date(value)) is not None:
            seconds = max(seconds, (retry_at - (_http_date(server_date) or now)).total_seconds())
    try:
        return now + timedelta(seconds=seconds)
    except OverflowError:
        return datetime.max.replace(tzinfo=UTC)
