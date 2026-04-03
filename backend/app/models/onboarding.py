"""OnboardingRequest model — the central aggregate for the wizard flow."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, Index, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


# ── Domain Enums ─────────────────────────────────────────────────────────


class HostingPlatform(str, enum.Enum):
    """Supported hosting platforms."""

    EKS = "eks"
    ECS = "ecs"
    EC2 = "ec2"
    LAMBDA = "lambda"
    ON_PREM = "on_prem"
    AZURE_AKS = "azure_aks"
    GKE = "gke"


class TechStack(str, enum.Enum):
    """Primary technology stacks."""

    JAVA_SPRING = "java_spring"
    JAVA_QUARKUS = "java_quarkus"
    PYTHON_FASTAPI = "python_fastapi"
    PYTHON_DJANGO = "python_django"
    NODEJS_EXPRESS = "nodejs_express"
    NODEJS_NESTJS = "nodejs_nestjs"
    DOTNET = "dotnet"
    GO = "go"
    RUST = "rust"


class OnboardingStatus(str, enum.Enum):
    """Lifecycle states of an onboarding request."""

    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    CAPACITY_CHECK = "capacity_check"
    SIMILARITY_SEARCH = "similarity_search"
    GOVERNANCE_REVIEW = "governance_review"
    ARTIFACTS_GENERATED = "artifacts_generated"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    PROVISIONING = "provisioning"
    COMPLETED = "completed"
    REJECTED = "rejected"
    CANCELLED = "cancelled"


# ── Model ────────────────────────────────────────────────────────────────


class OnboardingRequest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Central aggregate for an observability onboarding request.

    Owns one-to-many/one-to-one relationships with every child entity
    produced during the wizard flow.
    """

    __tablename__ = "onboarding_requests"
    __table_args__ = (
        Index("ix_onboarding_app_code", "app_code", unique=True),
        Index("ix_onboarding_status", "status"),
        Index("ix_onboarding_portfolio", "portfolio"),
    )

    # ── Identity ──────────────────────────────────────────────────────
    app_name: Mapped[str] = mapped_column(String(255), nullable=False)
    app_code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    portfolio: Mapped[str] = mapped_column(String(128), nullable=False)

    # ── Technical profile ─────────────────────────────────────────────
    hosting_platform: Mapped[HostingPlatform] = mapped_column(
        Enum(HostingPlatform, name="hosting_platform_enum", native_enum=False,
             values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )
    tech_stack: Mapped[TechStack] = mapped_column(
        Enum(TechStack, name="tech_stack_enum", native_enum=False,
             values_callable=lambda x: [e.value for e in x]),
        nullable=False,
    )

    # ── Status ────────────────────────────────────────────────────────
    status: Mapped[OnboardingStatus] = mapped_column(
        Enum(OnboardingStatus, name="onboarding_status_enum", native_enum=False,
             values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=OnboardingStatus.DRAFT,
        server_default="draft",
    )

    # ── Ownership ─────────────────────────────────────────────────────
    alert_owner_email: Mapped[str] = mapped_column(String(255), nullable=False)
    alert_owner_team: Mapped[str] = mapped_column(String(255), nullable=False)
    created_by: Mapped[str] = mapped_column(String(255), nullable=False)

    # ── Timestamps ────────────────────────────────────────────────────
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Notes ─────────────────────────────────────────────────────────
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────
    telemetry_scope: Mapped[TelemetryScope | None] = relationship(
        "TelemetryScope",
        back_populates="onboarding_request",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    capacity_assessment: Mapped[CapacityAssessment | None] = relationship(
        "CapacityAssessment",
        back_populates="onboarding_request",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    similarity_matches: Mapped[list[SimilarityMatch]] = relationship(
        "SimilarityMatch",
        back_populates="onboarding_request",
        cascade="all, delete-orphan",
        lazy="selectin",
        order_by="SimilarityMatch.rank",
    )
    artifacts: Mapped[list[Artifact]] = relationship(
        "Artifact",
        back_populates="onboarding_request",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    technical_config: Mapped[TechnicalConfig | None] = relationship(
        "TechnicalConfig",
        back_populates="onboarding_request",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    environment_readiness: Mapped[list[EnvironmentReadiness]] = relationship(
        "EnvironmentReadiness",
        back_populates="onboarding_request",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<OnboardingRequest {self.app_code!r} status={self.status.value!r}>"
        )


# Late imports to break circular references — these are populated by the
# individual model modules which import Base from models.base.
from app.models.artifact import Artifact  # noqa: E402
from app.models.capacity import CapacityAssessment  # noqa: E402
from app.models.similarity import SimilarityMatch  # noqa: E402
from app.models.telemetry import EnvironmentReadiness, TechnicalConfig, TelemetryScope  # noqa: E402
