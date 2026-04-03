"""ApplicationMetadata model — CMDB-like application registry."""

from __future__ import annotations

import uuid

from sqlalchemy import Index, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class ApplicationMetadata(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Stores CMDB-style metadata about each application in the enterprise portfolio.

    This table is pre-populated from upstream CMDB syncs and serves as the
    reference catalog for the onboarding wizard auto-complete.
    """

    __tablename__ = "application_metadata"
    __table_args__ = (
        Index("ix_app_metadata_app_code", "app_code", unique=True),
        Index("ix_app_metadata_portfolio", "portfolio"),
    )

    app_name: Mapped[str] = mapped_column(String(255), nullable=False)
    app_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    portfolio: Mapped[str] = mapped_column(String(128), nullable=False)
    sub_portfolio: Mapped[str | None] = mapped_column(String(128), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_criticality: Mapped[str | None] = mapped_column(String(32), nullable=True)
    hosting_platform: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tech_stack: Mapped[str | None] = mapped_column(String(64), nullable=True)
    owner_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    owner_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    owner_team: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cost_center: Mapped[str | None] = mapped_column(String(64), nullable=True)
    environments: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    tags: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    cmdb_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    cmdb_sync_source: Mapped[str | None] = mapped_column(String(64), nullable=True)
    retired: Mapped[bool] = mapped_column(default=False, server_default="false")

    # FK-free reference to the latest onboarding request (if any)
    latest_onboarding_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True
    )

    def __repr__(self) -> str:
        return f"<ApplicationMetadata {self.app_code!r} ({self.app_name!r})>"
