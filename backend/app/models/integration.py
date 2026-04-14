"""IntegrationConfig model — admin-editable read-path configuration.

One row per external system the platform reads from (CMDB, Mimir, Loki,
Tempo, Pyroscope, Faro, Grafana, Blackbox). Lets operators configure
base URLs / tokens / mock-mode from the Admin UI without redeploying.

Security note: ``auth_token`` is stored in plaintext for development
convenience. Production deployments should front this with Vault or
AWS Secrets Manager; the token is **never** returned in API responses
(see ``schemas.integration.IntegrationConfigRead``).
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Index, String, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class IntegrationConfig(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Read-path configuration for a single upstream integration target."""

    __tablename__ = "integration_configs"
    __table_args__ = (
        Index("ix_integration_configs_target", "target", unique=True),
    )

    # Target system key: "cmdb" | "mimir" | "loki" | "tempo" | "pyroscope"
    # | "faro" | "grafana" | "blackbox"
    target: Mapped[str] = mapped_column(String(32), nullable=False)
    display_name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    base_url: Mapped[str] = mapped_column(String(512), nullable=False)
    auth_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    auth_mode: Mapped[str] = mapped_column(
        String(32), nullable=False, default="bearer"
    )

    # When true, the probe/client uses deterministic in-process mock data
    # instead of issuing a real HTTP call to ``base_url``.
    use_mock: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    is_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )

    # Free-form per-target config: CMDB_FIELD_MAP, GRAFANA_USAGE_SOURCE,
    # GRAFANA_TEAM_APP_MAP_URL, Mimir tenant list, etc.
    extra_config: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Last connectivity check result.
    last_test_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_test_status: Mapped[str | None] = mapped_column(String(32), nullable=True)
    last_test_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<IntegrationConfig {self.target!r} base_url={self.base_url!r}>"
