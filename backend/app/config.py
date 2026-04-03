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
    CORS_ORIGINS_STR: str = "http://localhost:3000,http://localhost:5173"

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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Cached singleton accessor for application settings."""
    return Settings()
