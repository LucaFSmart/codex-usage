"""Provider retry deadlines must survive clock skew and scheduler bounds."""

from datetime import UTC, datetime, timedelta

import pytest

NOW = datetime(2026, 9, 5, 12, tzinfo=UTC)


def deadline(value, **overrides):
    from custom_components.codex_usage.retry import retry_deadline

    return retry_deadline(value, now=NOW, floor_seconds=60, **overrides)


@pytest.mark.parametrize(
    ("header", "seconds"),
    [("0", 60), ("20", 60), ("120", 120), (" 300 ", 300), ("90000000", 90000000)],
)
def test_delay_seconds_respect_floor_and_long_deadlines(header, seconds):
    assert deadline(header) == NOW + timedelta(seconds=seconds)


@pytest.mark.parametrize(
    "header", [None, "", "-1", "1.5", "no date", "Sat, 05 Sep 2026 11:00:00 GMT"]
)
def test_invalid_or_past_header_uses_normal_backoff(header):
    assert deadline(header) == NOW + timedelta(seconds=60)


def test_absolute_date_uses_valid_server_clock():
    assert deadline(
        "Sat, 05 Sep 2026 10:05:00 GMT", server_date="Sat, 05 Sep 2026 10:00:00 GMT"
    ) == NOW + timedelta(minutes=5)
    assert deadline("Sat, 05 Sep 2026 12:05:00 GMT", server_date="invalid") == NOW + timedelta(
        minutes=5
    )


def test_unrepresentably_long_delay_remains_in_the_future():
    assert deadline("9" * 5000) == datetime.max.replace(tzinfo=UTC)
