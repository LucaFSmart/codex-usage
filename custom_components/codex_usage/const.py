"""Constants for the Codex Usage integration."""

from typing import Final

from homeassistant.const import Platform

DOMAIN: Final = "codex_usage"
PLATFORMS: Final = [Platform.BINARY_SENSOR, Platform.SENSOR]

OAUTH_CLIENT_ID: Final = "app_EMoamEEZ73f0CkXaXp7hrann"
OAUTH_ISSUER: Final = "https://auth.openai.com"
DEVICE_CODE_URL: Final = f"{OAUTH_ISSUER}/api/accounts/deviceauth/usercode"
DEVICE_TOKEN_URL: Final = f"{OAUTH_ISSUER}/api/accounts/deviceauth/token"
DEVICE_VERIFICATION_URL: Final = f"{OAUTH_ISSUER}/codex/device"
OAUTH_TOKEN_URL: Final = f"{OAUTH_ISSUER}/oauth/token"
OAUTH_DEVICE_REDIRECT_URI: Final = f"{OAUTH_ISSUER}/deviceauth/callback"
USAGE_API_URL: Final = "https://chatgpt.com/backend-api/wham/usage"

DEFAULT_UPDATE_INTERVAL: Final = 300
MIN_UPDATE_INTERVAL: Final = 60
MAX_UPDATE_INTERVAL: Final = 3600

CONF_ACCESS_TOKEN: Final = "access_token"
CONF_REFRESH_TOKEN: Final = "refresh_token"
CONF_ID_TOKEN: Final = "id_token"
CONF_EXPIRES_AT: Final = "expires_at"
CONF_ACCOUNT_ID: Final = "account_id"
CONF_USER_ID: Final = "user_id"
CONF_EMAIL: Final = "email"
CONF_PLAN_TYPE: Final = "plan_type"
CONF_FEDRAMP: Final = "fedramp"
CONF_UPDATE_INTERVAL: Final = "update_interval"
