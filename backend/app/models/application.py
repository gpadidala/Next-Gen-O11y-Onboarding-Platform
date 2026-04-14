"""ApplicationMetadata model — CMDB-synced source of truth."""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ApplicationMetadata(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Stores CMDB-style metadata about each application in the enterprise portfolio.

    This table is pre-populated from upstream CMDB syncs and serves as the
    reference catalog for the onboarding wizard auto-complete AND the
    source of truth for Coverage & Adoption reconciliation.
    """

    __tablename__ = "application_metadata"
    __table_args__ = (
        Index("ix_app_metadata_app_code", "app_code", unique=True),
        Index("ix_app_metadata_portfolio", "portfolio"),
        Index("ix_app_metadata_vp_email", "vp_email"),
        Index("ix_app_metadata_architect_email", "architect_email"),
    )

    app_name: Mapped[str] = mapped_column(String(255), nullable=False)
    app_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    portfolio: Mapped[str] = mapped_column(String(128), nullable=False)
    sub_portfolio: Mapped[str | None] = mapped_column(String(128), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_criticality: Mapped[str | None] = mapped_column(String(32), nullable=True)
    hosting_platform: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tech_stack: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # ── Leadership hierarchy (v2) ────────────────────────────────────────
    vp_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    vp_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    director_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    manager_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    manager_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    architect_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    architect_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    product_owner: Mapped[str | None] = mapped_column(String(255), nullable=True)
    lob: Mapped[str | None] = mapped_column(String(128), nullable=True)
    region: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # ── On-call / ownership ──────────────────────────────────────────────
    owner_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    owner_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    owner_team: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cost_center: Mapped[str | None] = mapped_column(String(64), nullable=True)

    environments: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    tags: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # ── CMDB sync tracking ───────────────────────────────────────────────
    cmdb_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    cmdb_sync_source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    cmdb_last_synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    retired: Mapped[bool] = mapped_column(default=False, server_default="false")

    # FK-free reference to the latest onboarding request (if any)
    latest_onboarding_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<ApplicationMetadata {self.app_code!r} ({self.app_name!r})>"
