"""Shared enums, base schemas, pagination, and RFC 7807 error response."""

from __future__ import annotations

import enum
from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ── Shared Enums ─────────────────────────────────────────────────────────


class HostingPlatform(str, enum.Enum):
    EKS = "eks"
    ECS = "ecs"
    EC2 = "ec2"
    LAMBDA = "lambda"
    ON_PREM = "on_prem"
    AZURE_AKS = "azure_aks"
    GKE = "gke"


class TechStack(str, enum.Enum):
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


class TelemetrySignal(str, enum.Enum):
    METRICS = "metrics"
    LOGS = "logs"
    TRACES = "traces"
    PROFILING = "profiling"


class CapacityStatus(str, enum.Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"
    UNKNOWN = "unknown"


class ArtifactType(str, enum.Enum):
    CR = "cr"
    EPIC = "epic"
    STORY = "story"
    TASK = "task"
    CTASK = "ctask"


class GovernanceSeverity(str, enum.Enum):
    HARD = "hard"
    SOFT = "soft"
    INFO = "info"


# ── Base Schemas ─────────────────────────────────────────────────────────


class BaseResponse(BaseModel):
    """Envelope for all successful API responses."""

    model_config = ConfigDict(from_attributes=True)

    success: bool = True
    message: str = "OK"


class PaginationMeta(BaseModel):
    """Pagination metadata included in list responses."""

    total: int = Field(ge=0, description="Total number of records")
    page: int = Field(ge=1, description="Current page number (1-based)")
    page_size: int = Field(ge=1, le=100, description="Records per page")
    total_pages: int = Field(ge=0, description="Total pages available")


class ErrorDetail(BaseModel):
    """A single error detail entry."""

    field: str | None = None
    message: str
    code: str | None = None


class ErrorResponse(BaseModel):
    """RFC 7807 Problem Details -inspired error response.

    See https://www.rfc-editor.org/rfc/rfc7807.
    """

    type: str = Field(
        default="about:blank",
        description="A URI reference identifying the problem type.",
    )
    title: str = Field(description="A short, human-readable summary.")
    status: int = Field(description="HTTP status code.")
    detail: str | None = Field(default=None, description="Explanation specific to this occurrence.")
    instance: str | None = Field(
        default=None,
        description="A URI reference identifying the specific occurrence.",
    )
    errors: list[ErrorDetail] = Field(
        default_factory=list,
        description="Structured sub-errors for validation failures.",
    )
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    trace_id: str | None = Field(
        default=None,
        description="Distributed tracing correlation ID.",
    )
