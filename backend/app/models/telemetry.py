"""Telemetry-related models — scope, technical config, environment readiness."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class TelemetryScope(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Captures which telemetry signals the user selected and per-signal details.

    The ``selected_signals`` JSON column holds a structure such as::

        {
            "metrics": {"enabled": true, "details": {...}},
            "logs":    {"enabled": true, "details": {...}},
            "traces":  {"enabled": false},
            "profiling": {"enabled": false}
        }
    """

    __tablename__ = "telemetry_scopes"

    onboarding_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("onboarding_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    selected_signals: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    environment_matrix: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    # Relationship back to parent
    onboarding_request: Mapped[OnboardingRequest] = relationship(
        "OnboardingRequest",
        back_populates="telemetry_scope",
    )

    def __repr__(self) -> str:
        return f"<TelemetryScope request={self.onboarding_request_id!s}>"


class TechnicalConfig(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Dynamic technical configuration built from wizard answers.

    The ``config_data`` JSON stores exporters, scrape configs, pipeline
    definitions, etc. that vary depending on hosting_platform + tech_stack.
    """

    __tablename__ = "technical_configs"

    onboarding_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("onboarding_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    config_data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    generated_by: Mapped[str | None] = mapped_column(String(64), nullable=True)
    config_version: Mapped[str | None] = mapped_column(String(32), nullable=True)

    onboarding_request: Mapped[OnboardingRequest] = relationship(
        "OnboardingRequest",
        back_populates="technical_config",
    )

    def __repr__(self) -> str:
        return f"<TechnicalConfig request={self.onboarding_request_id!s}>"


class EnvironmentReadiness(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Per-environment, per-signal readiness flags (one row per env/signal pair).

    Example: environment="staging", signal="metrics", ready=True.
    """

    __tablename__ = "environment_readiness"

    onboarding_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("onboarding_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    environment: Mapped[str] = mapped_column(String(64), nullable=False)
    signal: Mapped[str] = mapped_column(String(64), nullable=False)
    ready: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(String(512), nullable=True)

    onboarding_request: Mapped[OnboardingRequest] = relationship(
        "OnboardingRequest",
        back_populates="environment_readiness",
    )

    def __repr__(self) -> str:
        return (
            f"<EnvironmentReadiness env={self.environment!r} "
            f"signal={self.signal!r} ready={self.ready}>"
        )


# Resolve forward reference
from app.models.onboarding import OnboardingRequest  # noqa: E402
