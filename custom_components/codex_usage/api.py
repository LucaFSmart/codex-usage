"""OpenAI authentication and Codex usage API client.

The HTTP contract in this module mirrors the official open-source Codex client.
Keeping it isolated makes backend changes easier to accommodate.
"""

from __future__ import annotations

import base64
import binascii
import json
import math
import time
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import Decimal, InvalidOperation
from typing import Any

import aiohttp

from .const import (
    ACCOUNTS_API_URL,
    DEVICE_CODE_URL,
    DEVICE_TOKEN_URL,
    DEVICE_VERIFICATION_URL,
    OAUTH_CLIENT_ID,
    OAUTH_DEVICE_REDIRECT_URI,
    OAUTH_TOKEN_URL,
    PROFILE_API_URL,
    RESET_CREDITS_API_URL,
    USAGE_API_URL,
)

REQUEST_TIMEOUT = aiohttp.ClientTimeout(total=20)
USER_AGENT = "HomeAssistant-CodexUsage/0.5.3"


class CodexApiError(Exception):
    """Base error raised by the Codex API client."""


class CodexAuthenticationError(CodexApiError):
    """Authentication failed and reauthentication is required."""


class CodexConnectionError(CodexApiError):
    """The OpenAI service could not be reached."""


class CodexProfileUnavailable(CodexApiError):
    """The optional profile statistics endpoint is unavailable."""


class CodexOptionalEndpointUnavailable(CodexApiError):
    """An optional read-only Codex endpoint is unavailable."""


class DeviceAuthorizationPending(CodexApiError):
    """The user has not completed device authorization yet."""


class DeviceAuthorizationUnavailable(CodexApiError):
    """Device authorization is disabled for this account or workspace."""


@dataclass(frozen=True, slots=True)
class DeviceCode:
    """Pending device authorization."""

    device_auth_id: str
    user_code: str
    interval: int
    verification_url: str = DEVICE_VERIFICATION_URL


@dataclass(frozen=True, slots=True)
class CodexCredentials:
    """Credentials stored by the Home Assistant config entry."""

    access_token: str
    refresh_token: str
    id_token: str
    expires_at: float
    account_id: str
    user_id: str | None = None
    email: str | None = None
    plan_type: str | None = None
    fedramp: bool = False


@dataclass(frozen=True, slots=True)
class RateLimitWindow:
    """One rolling rate-limit window."""

    used_percent: float
    window_minutes: int | None
    resets_at: datetime | None

    @property
    def remaining_percent(self) -> float:
        """Return the remaining percentage, clamped to 0..100."""
        return max(0.0, min(100.0, 100.0 - self.used_percent))

    @property
    def duration_key(self) -> str:
        """Return a stable identifier derived from the actual window duration."""
        if self.window_minutes is None:
            return "unknown"
        if _approximately(self.window_minutes, 5 * 60):
            return "five_hour"
        if _approximately(self.window_minutes, 7 * 24 * 60):
            return "weekly"
        return f"{self.window_minutes}m"

    @property
    def duration_label(self) -> str:
        """Return a concise human-readable label for this duration."""
        if self.duration_key == "five_hour":
            return "5-hour"
        if self.duration_key == "weekly":
            return "Weekly"
        if self.window_minutes is None:
            return "Unknown window"
        if self.window_minutes == 24 * 60:
            return "Daily"
        if self.window_minutes % (24 * 60) == 0:
            return f"{self.window_minutes // (24 * 60)}-day"
        if self.window_minutes % 60 == 0:
            return f"{self.window_minutes // 60}-hour"
        return f"{self.window_minutes}-minute"


@dataclass(frozen=True, slots=True)
class RateLimit:
    """A named Codex rate limit."""

    limit_id: str
    name: str
    allowed: bool | None
    limit_reached: bool | None
    primary: RateLimitWindow | None
    secondary: RateLimitWindow | None

    @property
    def windows(self) -> tuple[tuple[str, RateLimitWindow], ...]:
        """Return available backend windows in their original order."""
        return tuple(
            (position, window)
            for position, window in (
                ("primary", self.primary),
                ("secondary", self.secondary),
            )
            if window is not None
        )


@dataclass(frozen=True, slots=True)
class CreditStatus:
    """ChatGPT credit status."""

    has_credits: bool
    unlimited: bool
    balance: Decimal | None
    overage_limit_reached: bool | None


@dataclass(frozen=True, slots=True)
class SpendLimit:
    """Workspace or individual spend control."""

    source: str | None
    limit: Decimal | None
    used: Decimal | None
    remaining: Decimal | None
    used_percent: float | None
    remaining_percent: float | None
    resets_at: datetime | None


@dataclass(frozen=True, slots=True)
class CodexUsageData:
    """Normalized response returned to Home Assistant entities."""

    plan_type: str
    main_limit: RateLimit
    additional_limits: tuple[RateLimit, ...]
    credits: CreditStatus | None
    spend_limit: SpendLimit | None
    spend_limit_reached: bool | None
    blocker_reason: str | None
    available_reset_credits: int | None

    def _main_window(self, duration_key: str) -> RateLimitWindow | None:
        return next(
            (
                window
                for _, window in self.main_limit.windows
                if window.duration_key == duration_key
            ),
            None,
        )

    @property
    def five_hour_window(self) -> RateLimitWindow | None:
        """Return the five-hour window regardless of backend position."""
        return self._main_window("five_hour")

    @property
    def weekly_window(self) -> RateLimitWindow | None:
        """Return the weekly window regardless of backend position."""
        return self._main_window("weekly")


@dataclass(frozen=True, slots=True)
class CodexProfileStats:
    """Privacy-safe aggregate statistics from the Codex profile endpoint."""

    lifetime_tokens: int | None
    peak_daily_tokens: int | None
    current_streak_days: int | None
    longest_streak_days: int | None
    total_threads: int | None
    longest_running_turn_sec: int | None
    fast_mode_usage_percentage: float | None
    total_skills_used: int | None
    unique_skills_used: int | None
    most_used_reasoning_effort: str | None
    most_used_reasoning_effort_percentage: float | None


@dataclass(frozen=True, slots=True)
class AvailableAccount:
    """One ChatGPT workspace available to the authenticated user."""

    account_id: str
    name: str | None
    structure: str | None


@dataclass(frozen=True, slots=True)
class ResetCredit:
    """Privacy-safe read-only reset-credit metadata."""

    reset_type: str
    status: str
    granted_at: datetime | None
    expires_at: datetime | None


@dataclass(frozen=True, slots=True)
class ResetCredits:
    """Aggregated reset-credit status."""

    available_count: int
    total_earned_count: int | None
    credits: tuple[ResetCredit, ...]


def _decode_jwt_payload(token: str) -> dict[str, Any]:
    """Decode JWT claims without treating them as independently trusted input."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("invalid JWT")
        payload = parts[1] + "=" * (-len(parts[1]) % 4)
        decoded = base64.urlsafe_b64decode(payload.encode("ascii"))
        value = json.loads(decoded)
    except (ValueError, UnicodeDecodeError, json.JSONDecodeError, binascii.Error) as err:
        raise CodexAuthenticationError("OpenAI returned an invalid token") from err
    if not isinstance(value, dict):
        raise CodexAuthenticationError("OpenAI returned invalid token claims")
    return value


def _claims_from_tokens(id_token: str, access_token: str) -> dict[str, Any]:
    """Extract the same identity fields used by the official Codex client."""
    id_claims = _decode_jwt_payload(id_token)
    access_claims = _decode_jwt_payload(access_token)
    profile = id_claims.get("https://api.openai.com/profile") or {}
    auth = id_claims.get("https://api.openai.com/auth") or {}
    if not isinstance(profile, dict):
        profile = {}
    if not isinstance(auth, dict):
        auth = {}
    account_id = (
        access_claims.get("chatgpt_account_id")
        or id_claims.get("chatgpt_account_id")
        or auth.get("chatgpt_account_id")
    )
    if not account_id:
        raise CodexAuthenticationError("No ChatGPT workspace was present in the token")
    return {
        "account_id": str(account_id),
        "user_id": auth.get("chatgpt_user_id") or auth.get("user_id"),
        "email": id_claims.get("email") or profile.get("email"),
        "plan_type": auth.get("chatgpt_plan_type"),
        "fedramp": bool(auth.get("chatgpt_account_is_fedramp", False)),
        "expires_at": float(access_claims.get("exp", time.time() + 3600)),
    }


def credentials_from_token_response(
    payload: dict[str, Any], previous: CodexCredentials | None = None
) -> CodexCredentials:
    """Create credentials from an OAuth token or refresh response."""
    access_token = payload.get("access_token") or (previous.access_token if previous else None)
    refresh_token = payload.get("refresh_token") or (previous.refresh_token if previous else None)
    id_token = payload.get("id_token") or (previous.id_token if previous else None)
    if not all(
        isinstance(value, str) and value for value in (access_token, refresh_token, id_token)
    ):
        raise CodexAuthenticationError("OpenAI returned an incomplete token response")
    claims = _claims_from_tokens(id_token, access_token)
    return CodexCredentials(
        access_token=access_token,
        refresh_token=refresh_token,
        id_token=id_token,
        expires_at=claims["expires_at"],
        account_id=previous.account_id if previous else claims["account_id"],
        user_id=(
            str(claims["user_id"])
            if claims["user_id"]
            else (previous.user_id if previous else None)
        ),
        email=str(claims["email"]) if claims["email"] else None,
        plan_type=str(claims["plan_type"]) if claims["plan_type"] else None,
        fedramp=claims["fedramp"],
    )


def _timestamp(value: Any) -> datetime | None:
    try:
        return datetime.fromtimestamp(float(value), tz=UTC) if value is not None else None
    except ValueError, TypeError, OSError, OverflowError:
        return None


def _date_time(value: Any) -> datetime | None:
    """Parse an epoch or ISO timestamp without raising."""
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)
        except ValueError:
            return None
    return _timestamp(value)


def _decimal(value: Any) -> Decimal | None:
    try:
        result = Decimal(str(value)) if value is not None else None
    except InvalidOperation, ValueError:
        return None
    return result if result is None or result.is_finite() else None


def _float(value: Any) -> float | None:
    try:
        result = float(value) if value is not None else None
    except TypeError, ValueError:
        return None
    return result if result is None or math.isfinite(result) else None


def _approximately(value: int, expected: int) -> bool:
    """Match the official Codex client's five-percent duration tolerance."""
    return expected * 0.95 <= value <= expected * 1.05


def _non_negative_int(value: Any) -> int | None:
    """Return a backend integer count without accepting booleans or coercions."""
    return value if isinstance(value, int) and not isinstance(value, bool) and value >= 0 else None


def _positive_int(value: Any) -> int | None:
    """Return a positive backend integer without coercing booleans or strings."""
    return value if isinstance(value, int) and not isinstance(value, bool) and value > 0 else None


def _positive_seconds(value: Any) -> int | None:
    """Return a positive whole-second duration from compatible JSON numbers."""
    if isinstance(value, bool):
        return None
    result = _float(value)
    if result is None or result <= 0 or not result.is_integer():
        return None
    return int(result)


def _display_text(value: Any, *, max_length: int = 120) -> str | None:
    """Return a bounded backend label without coercing structured values."""
    if not isinstance(value, str):
        return None
    result = value.strip()
    return result if result and len(result) <= max_length else None


def _percentage(value: Any) -> float | None:
    """Return a finite percentage in the inclusive 0..100 range."""
    if isinstance(value, bool):
        return None
    result = _float(value)
    return result if result is not None and 0 <= result <= 100 else None


def _relative_seconds(value: Any) -> float | None:
    """Return a non-negative offset in seconds from a compatible JSON number."""
    if isinstance(value, bool):
        return None
    result = _float(value)
    return result if result is not None and result >= 0 else None


def _reset_time(payload: dict[str, Any]) -> datetime | None:
    """Return the reset time, preferring the absolute backend timestamp.

    Every reset payload carries `reset_at` next to `reset_after_seconds`. The
    relative value is the only usable source when the absolute one is missing
    or unparsable, so it keeps a reset sensor available instead of unknown.
    """
    resets_at = _timestamp(payload.get("reset_at"))
    if resets_at is not None:
        return resets_at
    offset = _relative_seconds(payload.get("reset_after_seconds"))
    return None if offset is None else datetime.now(UTC) + timedelta(seconds=offset)


def _window(payload: Any) -> RateLimitWindow | None:
    if not isinstance(payload, dict) or payload.get("used_percent") is None:
        return None
    seconds = payload.get("limit_window_seconds")
    seconds_value = _positive_seconds(seconds) if seconds is not None else None
    used_percent = _percentage(payload["used_percent"])
    if used_percent is None:
        return None
    minutes = (
        (seconds_value + 59) // 60 if seconds_value is not None and seconds_value > 0 else None
    )
    return RateLimitWindow(
        used_percent=used_percent,
        window_minutes=minutes,
        resets_at=_reset_time(payload),
    )


def _rate_limit(limit_id: str, name: str, payload: Any) -> RateLimit:
    details = payload if isinstance(payload, dict) else {}
    allowed = details.get("allowed") if isinstance(details.get("allowed"), bool) else None
    reported_reached = (
        details.get("limit_reached") if isinstance(details.get("limit_reached"), bool) else None
    )
    return RateLimit(
        limit_id=limit_id,
        name=name,
        allowed=allowed,
        limit_reached=True if allowed is False else reported_reached,
        primary=_window(details.get("primary_window")),
        secondary=_window(details.get("secondary_window")),
    )


def parse_usage(payload: dict[str, Any]) -> CodexUsageData:
    """Normalize the Codex usage response."""
    main = _rate_limit("codex", "Codex", payload.get("rate_limit"))
    additional: list[RateLimit] = []

    for position, window in main.windows:
        if window.duration_key in ("five_hour", "weekly"):
            continue
        duration_id = (
            f"unknown_{position}" if window.duration_key == "unknown" else window.duration_key
        )
        additional.append(
            RateLimit(
                limit_id=f"codex_{duration_id}",
                name="Codex",
                allowed=main.allowed,
                limit_reached=main.limit_reached,
                primary=window if position == "primary" else None,
                secondary=window if position == "secondary" else None,
            )
        )

    for item in payload.get("additional_rate_limits") or []:
        if not isinstance(item, dict):
            continue
        limit_id = (
            _display_text(item.get("metered_feature"), max_length=80)
            or _display_text(item.get("limit_name"), max_length=80)
            or "additional"
        )
        name = _display_text(item.get("limit_name")) or limit_id.replace("_", " ").title()
        additional.append(_rate_limit(limit_id, name, item.get("rate_limit")))

    # The current backend schema reports code review through
    # `additional_rate_limits`. This dedicated key is an older response shape
    # that is kept so accounts still served it do not lose the limit.
    code_review_payload = payload.get("code_review_rate_limit")
    if isinstance(code_review_payload, dict):
        details = code_review_payload.get("rate_limit", code_review_payload)
        additional.append(_rate_limit("code_review", "Code review", details))

    credits_payload = payload.get("credits")
    credits = None
    if isinstance(credits_payload, dict):
        credits = CreditStatus(
            has_credits=bool(credits_payload.get("has_credits", False)),
            unlimited=bool(credits_payload.get("unlimited", False)),
            balance=_decimal(credits_payload.get("balance")),
            overage_limit_reached=(
                credits_payload.get("overage_limit_reached")
                if isinstance(credits_payload.get("overage_limit_reached"), bool)
                else None
            ),
        )

    spend_payload = payload.get("spend_control")
    spend_limit = None
    spend_reached = None
    if isinstance(spend_payload, dict):
        spend_reached = (
            spend_payload.get("reached") if isinstance(spend_payload.get("reached"), bool) else None
        )
        item = spend_payload.get("individual_limit")
        if isinstance(item, dict):
            spend_limit = SpendLimit(
                source=_display_text(item.get("source"), max_length=80),
                limit=_decimal(item.get("limit")),
                used=_decimal(item.get("used")),
                remaining=_decimal(item.get("remaining")),
                used_percent=_percentage(item.get("used_percent")),
                remaining_percent=_percentage(item.get("remaining_percent")),
                resets_at=_reset_time(item),
            )

    reached = payload.get("rate_limit_reached_type")
    reached_type = reached.get("type") if isinstance(reached, dict) else None
    blocker_reason = _blocker_reason(reached_type)
    if blocker_reason is None and spend_reached is True:
        blocker_reason = "spend"
    if blocker_reason is None and credits is not None and credits.overage_limit_reached is True:
        blocker_reason = "credits"
    if blocker_reason is None and main.limit_reached is True:
        blocker_reason = "usage_limit"
    reset_credits_payload = payload.get("rate_limit_reset_credits")
    available_reset_credits = (
        _non_negative_int(reset_credits_payload.get("available_count"))
        if isinstance(reset_credits_payload, dict)
        else None
    )
    return CodexUsageData(
        plan_type=_display_text(payload.get("plan_type"), max_length=80) or "unknown",
        main_limit=main,
        additional_limits=tuple(additional),
        credits=credits,
        spend_limit=spend_limit,
        spend_limit_reached=spend_reached,
        blocker_reason=blocker_reason,
        available_reset_credits=available_reset_credits,
    )


def _blocker_reason(value: Any) -> str | None:
    """Map raw backend blocker strings to a safe stable enum."""
    if not isinstance(value, str) or not value:
        return None
    normalized = value.casefold()
    if "spend" in normalized:
        return "spend"
    if "credit" in normalized:
        return "credits"
    if "usage" in normalized or "rate_limit" in normalized or "rate-limit" in normalized:
        return "usage_limit"
    return "unknown"


def parse_accounts(payload: dict[str, Any]) -> tuple[AvailableAccount, ...]:
    """Normalize supported account-check response shapes."""
    raw_accounts = payload.get("accounts")
    candidates: list[tuple[str | None, Any]] = []
    if isinstance(raw_accounts, list):
        candidates.extend((None, item) for item in raw_accounts)
    elif isinstance(raw_accounts, dict):
        ordering = payload.get("account_ordering")
        ordered_keys: list[str] = []
        if isinstance(ordering, list):
            ordered_keys.extend(
                key for key in ordering if isinstance(key, str) and key in raw_accounts
            )
        ordered_keys.extend(str(key) for key in raw_accounts if str(key) not in ordered_keys)
        candidates.extend((key, raw_accounts[key]) for key in ordered_keys)

    accounts: list[AvailableAccount] = []
    seen: set[str] = set()
    for fallback_id, item in candidates:
        if not isinstance(item, dict):
            continue
        nested = item.get("account")
        if isinstance(nested, dict):
            item = nested
        account_id = item.get("id") or item.get("account_id") or fallback_id
        if not isinstance(account_id, str) or not account_id or account_id in seen:
            continue
        seen.add(account_id)
        name = item.get("name")
        structure = item.get("structure")
        accounts.append(
            AvailableAccount(
                account_id=account_id,
                name=name if isinstance(name, str) and name else None,
                structure=structure if isinstance(structure, str) and structure else None,
            )
        )
    return tuple(accounts)


def parse_reset_credits(payload: dict[str, Any]) -> ResetCredits:
    """Normalize reset-credit metadata and discard private descriptions and IDs."""
    available_count = _non_negative_int(payload.get("available_count")) or 0
    total_earned_count = _non_negative_int(payload.get("total_earned_count"))
    credits: list[ResetCredit] = []
    raw_credits = payload.get("credits")
    if isinstance(raw_credits, list):
        for item in raw_credits:
            if not isinstance(item, dict):
                continue
            reset_type = item.get("reset_type")
            status = item.get("status")
            if not isinstance(reset_type, str) or not isinstance(status, str):
                continue
            credits.append(
                ResetCredit(
                    reset_type=reset_type,
                    status=status,
                    granted_at=_date_time(item.get("granted_at")),
                    expires_at=_date_time(item.get("expires_at")),
                )
            )
    return ResetCredits(available_count, total_earned_count, tuple(credits))


def parse_profile(payload: dict[str, Any]) -> CodexProfileStats:
    """Normalize privacy-safe aggregate Codex profile statistics."""
    stats = payload.get("stats")
    values = stats if isinstance(stats, dict) else {}
    effort = values.get("most_used_reasoning_effort")
    return CodexProfileStats(
        lifetime_tokens=_non_negative_int(values.get("lifetime_tokens")),
        peak_daily_tokens=_non_negative_int(values.get("peak_daily_tokens")),
        current_streak_days=_non_negative_int(values.get("current_streak_days")),
        longest_streak_days=_non_negative_int(values.get("longest_streak_days")),
        total_threads=_non_negative_int(values.get("total_threads")),
        longest_running_turn_sec=_non_negative_int(values.get("longest_running_turn_sec")),
        fast_mode_usage_percentage=_percentage(values.get("fast_mode_usage_percentage")),
        total_skills_used=_non_negative_int(values.get("total_skills_used")),
        unique_skills_used=_non_negative_int(values.get("unique_skills_used")),
        most_used_reasoning_effort=(effort if isinstance(effort, str) and effort else None),
        most_used_reasoning_effort_percentage=_percentage(
            values.get("most_used_reasoning_effort_percentage")
        ),
    )


class CodexApiClient:
    """Async client for the OpenAI device flow and Codex usage endpoint."""

    def __init__(self, session: aiohttp.ClientSession) -> None:
        self._session = session

    async def async_request_device_code(self) -> DeviceCode:
        """Start device authorization."""
        try:
            async with self._session.post(
                DEVICE_CODE_URL,
                json={"client_id": OAUTH_CLIENT_ID},
                headers={"User-Agent": USER_AGENT},
                timeout=REQUEST_TIMEOUT,
            ) as response:
                if response.status in (403, 404):
                    raise DeviceAuthorizationUnavailable
                if response.status >= 400:
                    raise CodexApiError(f"Device authorization failed ({response.status})")
                payload = await self._async_decode_json(response)
        except DeviceAuthorizationUnavailable:
            raise
        except (aiohttp.ClientError, TimeoutError) as err:
            raise CodexConnectionError from err
        try:
            return DeviceCode(
                device_auth_id=str(payload["device_auth_id"]),
                user_code=str(payload.get("user_code") or payload["usercode"]),
                interval=max(1, int(payload.get("interval", 5))),
            )
        except (KeyError, TypeError, ValueError) as err:
            raise CodexApiError("OpenAI returned an invalid device code response") from err

    async def async_poll_device_code(self, code: DeviceCode) -> dict[str, str]:
        """Poll once for completion of a device authorization."""
        try:
            async with self._session.post(
                DEVICE_TOKEN_URL,
                json={"device_auth_id": code.device_auth_id, "user_code": code.user_code},
                headers={"User-Agent": USER_AGENT},
                timeout=REQUEST_TIMEOUT,
            ) as response:
                if response.status in (403, 404):
                    raise DeviceAuthorizationPending
                if response.status >= 400:
                    raise CodexAuthenticationError(
                        f"Device authorization failed ({response.status})"
                    )
                payload = await self._async_decode_json(response)
        except DeviceAuthorizationPending, CodexAuthenticationError:
            raise
        except (aiohttp.ClientError, TimeoutError) as err:
            raise CodexConnectionError from err
        required = ("authorization_code", "code_verifier")
        if not isinstance(payload, dict) or not all(payload.get(key) for key in required):
            raise CodexApiError("OpenAI returned an invalid authorization response")
        return payload

    async def async_exchange_device_code(self, payload: dict[str, str]) -> CodexCredentials:
        """Exchange a completed device code for OAuth tokens."""
        data = {
            "grant_type": "authorization_code",
            "code": payload["authorization_code"],
            "redirect_uri": OAUTH_DEVICE_REDIRECT_URI,
            "client_id": OAUTH_CLIENT_ID,
            "code_verifier": payload["code_verifier"],
        }
        try:
            async with self._session.post(
                OAUTH_TOKEN_URL,
                data=data,
                headers={"User-Agent": USER_AGENT},
                timeout=REQUEST_TIMEOUT,
            ) as response:
                if response.status >= 400:
                    raise CodexAuthenticationError(f"Token exchange failed ({response.status})")
                token_payload = await self._async_decode_json(response)
        except CodexAuthenticationError:
            raise
        except (aiohttp.ClientError, TimeoutError) as err:
            raise CodexConnectionError from err
        return credentials_from_token_response(token_payload)

    async def async_refresh_credentials(self, credentials: CodexCredentials) -> CodexCredentials:
        """Refresh ChatGPT OAuth credentials."""
        try:
            async with self._session.post(
                OAUTH_TOKEN_URL,
                json={
                    "client_id": OAUTH_CLIENT_ID,
                    "grant_type": "refresh_token",
                    "refresh_token": credentials.refresh_token,
                },
                headers={"User-Agent": USER_AGENT},
                timeout=REQUEST_TIMEOUT,
            ) as response:
                if response.status in (400, 401, 403):
                    raise CodexAuthenticationError("The OpenAI session can no longer be refreshed")
                if response.status >= 400:
                    raise CodexApiError(f"Token refresh failed ({response.status})")
                payload = await self._async_decode_json(response)
        except CodexAuthenticationError, CodexApiError:
            raise
        except (aiohttp.ClientError, TimeoutError) as err:
            raise CodexConnectionError from err
        return credentials_from_token_response(payload, credentials)

    async def async_get_usage(
        self, credentials: CodexCredentials
    ) -> tuple[CodexUsageData, CodexCredentials]:
        """Fetch current usage, refreshing credentials as needed."""
        current = credentials
        if current.expires_at <= time.time() + 300:
            current = await self.async_refresh_credentials(current)
        status, payload = await self._async_usage_request(current)
        if status == 401:
            current = await self.async_refresh_credentials(current)
            status, payload = await self._async_usage_request(current)
        if status in (401, 403):
            raise CodexAuthenticationError("OpenAI rejected the stored credentials")
        if status == 429:
            raise CodexApiError("OpenAI rate-limited the usage request")
        if status >= 400:
            raise CodexApiError(f"Codex usage request failed ({status})")
        if not isinstance(payload, dict):
            raise CodexApiError("OpenAI returned an invalid usage response")
        return parse_usage(payload), current

    async def async_get_profile(self, credentials: CodexCredentials) -> CodexProfileStats:
        """Fetch privacy-safe aggregate profile statistics without mutating account state."""
        headers = {
            "Authorization": f"Bearer {credentials.access_token}",
            "ChatGPT-Account-Id": credentials.account_id,
            "User-Agent": USER_AGENT,
            "Cache-Control": "no-store",
        }
        if credentials.fedramp:
            headers["X-OpenAI-Fedramp"] = "true"
        try:
            async with self._session.get(
                PROFILE_API_URL, headers=headers, timeout=REQUEST_TIMEOUT
            ) as response:
                if response.status in (403, 404):
                    raise CodexProfileUnavailable
                if response.status == 401:
                    raise CodexAuthenticationError("OpenAI rejected the profile request")
                if response.status == 429:
                    raise CodexApiError("OpenAI rate-limited the profile request")
                if response.status >= 400:
                    raise CodexApiError(f"Codex profile request failed ({response.status})")
                payload = await self._async_decode_json(response)
        except CodexProfileUnavailable, CodexAuthenticationError, CodexApiError:
            raise
        except (aiohttp.ClientError, TimeoutError) as err:
            raise CodexConnectionError from err
        if not isinstance(payload, dict):
            raise CodexApiError("OpenAI returned an invalid profile response")
        return parse_profile(payload)

    async def async_get_accounts(
        self, credentials: CodexCredentials
    ) -> tuple[AvailableAccount, ...]:
        """Fetch the workspaces available to the authenticated user."""
        payload = await self._async_readonly_request(ACCOUNTS_API_URL, credentials)
        return parse_accounts(payload)

    async def async_get_reset_credits(self, credentials: CodexCredentials) -> ResetCredits:
        """Fetch read-only reset-credit metadata."""
        payload = await self._async_readonly_request(RESET_CREDITS_API_URL, credentials)
        return parse_reset_credits(payload)

    async def _async_readonly_request(
        self, url: str, credentials: CodexCredentials
    ) -> dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {credentials.access_token}",
            "ChatGPT-Account-Id": credentials.account_id,
            "User-Agent": USER_AGENT,
            "Cache-Control": "no-store",
        }
        if credentials.fedramp:
            headers["X-OpenAI-Fedramp"] = "true"
        try:
            async with self._session.get(url, headers=headers, timeout=REQUEST_TIMEOUT) as response:
                if response.status in (403, 404):
                    raise CodexOptionalEndpointUnavailable
                if response.status == 401:
                    raise CodexAuthenticationError("OpenAI rejected the read-only request")
                if response.status == 429:
                    raise CodexApiError("OpenAI rate-limited the read-only request")
                if response.status >= 400:
                    raise CodexApiError(f"Codex read-only request failed ({response.status})")
                payload = await self._async_decode_json(response)
        except CodexOptionalEndpointUnavailable, CodexAuthenticationError, CodexApiError:
            raise
        except (aiohttp.ClientError, TimeoutError) as err:
            raise CodexConnectionError from err
        if not isinstance(payload, dict):
            raise CodexApiError("OpenAI returned an invalid read-only response")
        return payload

    async def _async_usage_request(self, credentials: CodexCredentials) -> tuple[int, Any]:
        headers = {
            "Authorization": f"Bearer {credentials.access_token}",
            "ChatGPT-Account-Id": credentials.account_id,
            "User-Agent": USER_AGENT,
        }
        if credentials.fedramp:
            headers["X-OpenAI-Fedramp"] = "true"
        try:
            async with self._session.get(
                USAGE_API_URL, headers=headers, timeout=REQUEST_TIMEOUT
            ) as response:
                status = response.status
                try:
                    payload = await response.json(content_type=None)
                except aiohttp.ContentTypeError, json.JSONDecodeError:
                    payload = None
                return status, payload
        except (aiohttp.ClientError, TimeoutError) as err:
            raise CodexConnectionError from err

    @staticmethod
    async def _async_decode_json(response: aiohttp.ClientResponse) -> Any:
        """Decode JSON without exposing its body in an exception."""
        try:
            return await response.json(content_type=None)
        except (aiohttp.ContentTypeError, json.JSONDecodeError, UnicodeDecodeError) as err:
            raise CodexApiError("OpenAI returned invalid JSON") from err
