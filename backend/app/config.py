"""Application configuration via Pydantic Settings.

All values are loaded from environment variables (or a .env file).
"""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the Observability Onboarding Platform."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────
    APP_ENV: Literal["development", "staging", "production"] = "development"
    APP_DEBUG: bool = False
    APP_VERSION: str = "1.0.0"
    SECRET_KEY: SecretStr = SecretStr("change-me-in-production")

    # ── Database ─────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/o11y_onboarding"
    DATABASE_POOL_SIZE: int = Field(default=10, ge=1, le=100)
    DATABASE_MAX_OVERFLOW: int = Field(default=20, ge=0, le=200)

    # ── MCP Integrations ─────────────────────────────────────────────────
    GRAFANA_MCP_URL: str = "http://localhost:8100"
    GRAFANA_MCP_API_KEY: SecretStr = SecretStr("")

    CONFLUENCE_MCP_URL: str = "http://localhost:8101"
    CONFLUENCE_MCP_API_KEY: SecretStr = SecretStr("")

    JIRA_MCP_URL: str = "http://localhost:8102"
    JIRA_MCP_API_KEY: SecretStr = SecretStr("")

    SERVICENOW_MCP_URL: str = "http://localhost:8103"
    SERVICENOW_MCP_API_KEY: SecretStr = SecretStr("")

    # ── AI / Embeddings ──────────────────────────────────────────────────
    OPENAI_API_KEY: SecretStr = SecretStr("")
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = Field(default=1536, ge=256, le=3072)

    # ── CORS ─────────────────────────────────────────────────────────────
    # Store as a plain string; split into list via the property below.
    # This avoids Pydantic Settings trying to JSON-parse a comma-separated value.
    CORS_ORIGINS_STR: str = (
        "http://localhost:3000,http://localhost:3001,http://localhost:3002,"
        "http://localhost:5173,http://localhost:5174"
    )

    @property
    def CORS_ORIGINS(self) -> list[str]:
        """Return CORS origins as a list from the comma-separated env string."""
        return [o.strip() for o in self.CORS_ORIGINS_STR.split(",") if o.strip()]

    # ── Logging ──────────────────────────────────────────────────────────
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"
    LOG_FORMAT: Literal["json", "console"] = "json"

    # ── SMTP / Notifications ─────────────────────────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: SecretStr = SecretStr("")
    SMTP_USE_TLS: bool = True
    SMTP_FROM_EMAIL: str = "noreply@observability-platform.io"

    SLACK_WEBHOOK_URL: str = ""

    # ── CMDB (v2 — Coverage & Adoption) ──────────────────────────────────
    # Defaults are intentionally empty so the app boots without any real
    # LGTM / CMDB prerequisites. Operators configure these at runtime via
    # the Integrations admin page; mock mode keeps the stack usable until
    # they do.
    CMDB_BASE_URL: str = ""
    CMDB_API_TOKEN: SecretStr = SecretStr("")
    CMDB_SYNC_PAGE_SIZE: int = Field(default=500, ge=10, le=5000)
    CMDB_SYNC_ENABLED: bool = True

    # ── LGTM probe endpoints (v2) ────────────────────────────────────────
    GRAFANA_BASE_URL: str = ""
    GRAFANA_API_TOKEN: SecretStr = SecretStr("")
    GRAFANA_USAGE_SOURCE: Literal["api", "mimir"] = "api"
    GRAFANA_TEAM_APP_MAP_URL: str = ""

    MIMIR_BASE_URL: str = ""
    LOKI_BASE_URL: str = ""
    TEMPO_BASE_URL: str = ""
    PYROSCOPE_BASE_URL: str = ""
    FARO_BASE_URL: str = ""
    BLACKBOX_CONFIG_URL: str = ""

    COVERAGE_FRESHNESS_HOURS: int = Field(default=24, ge=1, le=168)
    SCHEDULER_ENABLED: bool = True
    # When true, probes use deterministic in-process fake data instead of
    # real HTTP calls. Defaults to True in development so the stack runs
    # end-to-end without needing real Mimir/Loki/Tempo/etc.
    PROBE_USE_MOCK: bool = True


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached singleton accessor for application settings."""
    return Settings()
