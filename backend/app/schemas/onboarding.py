"""Pydantic schemas for the Onboarding Request resource."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.common import (
    BaseResponse,
    CapacityStatus,
    HostingPlatform,
    OnboardingStatus,
    PaginationMeta,
    TechStack,
    TelemetrySignal,
)


# ── Nested / Embedded Schemas ────────────────────────────────────────────


class DependencySpec(BaseModel):
    """A single upstream/downstream dependency."""

    app_code: str
    app_name: str | None = None
    dependency_type: str = Field(
        description="'upstream' or 'downstream'",
        examples=["upstream"],
    )
    protocol: str | None = Field(
        default=None,
        description="Communication protocol (gRPC, REST, Kafka, etc.)",
    )


class SignalConfig(BaseModel):
    """Per-signal configuration selected by the user."""

    enabled: bool = False
    details: dict[str, Any] = Field(default_factory=dict)


class TelemetryScopeData(BaseModel):
    """Full telemetry scope selection."""

    metrics: SignalConfig = Field(default_factory=SignalConfig)
    logs: SignalConfig = Field(default_factory=SignalConfig)
    traces: SignalConfig = Field(default_factory=SignalConfig)
    profiling: SignalConfig = Field(default_factory=SignalConfig)


class EnvironmentReadinessData(BaseModel):
    """Per-environment readiness flag for a given signal."""

    environment: str = Field(examples=["dev", "staging", "production"])
    signal: TelemetrySignal
    ready: bool = False
    notes: str | None = None


class TechnicalConfigData(BaseModel):
    """Dynamic technical configuration blob."""

    config_data: dict[str, Any] = Field(default_factory=dict)
    generated_by: str | None = None
    config_version: str | None = None


# ── Request Schemas ──────────────────────────────────────────────────────


class OnboardingCreate(BaseModel):
    """Request body for creating a new onboarding request (Step 1 save)."""

    model_config = ConfigDict(str_strip_whitespace=True)

    app_name: str = Field(min_length=1, max_length=255)
    app_code: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    portfolio: str = Field(min_length=1, max_length=128)
    hosting_platform: HostingPlatform
    tech_stack: TechStack
    alert_owner_email: EmailStr
    alert_owner_team: str = Field(min_length=1, max_length=255)
    created_by: str = Field(min_length=1, max_length=255)
    notes: str | None = None


class OnboardingUpdate(BaseModel):
    """Partial update — all fields optional."""

    model_config = ConfigDict(str_strip_whitespace=True)

    app_name: str | None = Field(default=None, min_length=1, max_length=255)
    portfolio: str | None = Field(default=None, min_length=1, max_length=128)
    hosting_platform: HostingPlatform | None = None
    tech_stack: TechStack | None = None
    alert_owner_email: EmailStr | None = None
    alert_owner_team: str | None = Field(default=None, min_length=1, max_length=255)
    status: OnboardingStatus | None = None
    notes: str | None = None


class OnboardingSubmit(BaseModel):
    """Full submission payload including all nested data from every wizard step."""

    model_config = ConfigDict(str_strip_whitespace=True)

    # Step 1 — Identity
    app_name: str = Field(min_length=1, max_length=255)
    app_code: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    portfolio: str = Field(min_length=1, max_length=128)
    hosting_platform: HostingPlatform
    tech_stack: TechStack
    alert_owner_email: EmailStr
    alert_owner_team: str = Field(min_length=1, max_length=255)
    created_by: str = Field(min_length=1, max_length=255)
    notes: str | None = None

    # Step 2 — Telemetry scope
    telemetry_scope: TelemetryScopeData

    # Step 3 — Technical config
    technical_config: TechnicalConfigData | None = None

    # Dependencies
    dependencies: list[DependencySpec] = Field(default_factory=list)

    # Environment readiness
    environment_readiness: list[EnvironmentReadinessData] = Field(default_factory=list)


# ── Response Schemas ─────────────────────────────────────────────────────


class TelemetryScopeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    selected_signals: dict[str, Any]
    environment_matrix: dict[str, Any]


class TechnicalConfigResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    config_data: dict[str, Any]
    generated_by: str | None
    config_version: str | None


class EnvironmentReadinessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    environment: str
    signal: str
    ready: bool
    notes: str | None


class CapacityAssessmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    overall_status: CapacityStatus
    signal_results: dict[str, Any]
    recommendations: str | None
    can_proceed: bool
    escalation_required: bool
    assessed_at: datetime


class SimilarityMatchResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    rank: int
    matched_app_name: str
    matched_app_code: str
    score: float
    match_reasons: list[Any]
    exporters: list[Any]
    dashboards: list[Any]
    alert_rules: list[Any]
    playbooks: list[Any]
    pitfalls: list[Any]


class ArtifactSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    artifact_type: str
    external_id: str | None
    external_url: str | None
    status: str


class OnboardingResponse(BaseResponse):
    """Full onboarding request with all relationships."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    app_name: str
    app_code: str
    portfolio: str
    hosting_platform: HostingPlatform
    tech_stack: TechStack
    status: OnboardingStatus
    alert_owner_email: str
    alert_owner_team: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    submitted_at: datetime | None

    # Relationships (may be null if not yet populated)
    telemetry_scope: TelemetryScopeResponse | None = None
    technical_config: TechnicalConfigResponse | None = None
    capacity_assessment: CapacityAssessmentResponse | None = None
    similarity_matches: list[SimilarityMatchResponse] = Field(default_factory=list)
    artifacts: list[ArtifactSummaryResponse] = Field(default_factory=list)
    environment_readiness: list[EnvironmentReadinessResponse] = Field(default_factory=list)


class OnboardingListResponse(BaseResponse):
    """Paginated list of onboarding requests (without deep relationships)."""

    items: list[OnboardingResponse] = Field(default_factory=list)
    pagination: PaginationMeta
