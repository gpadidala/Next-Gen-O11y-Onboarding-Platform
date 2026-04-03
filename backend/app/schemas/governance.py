"""Pydantic schemas for the governance rules engine."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import GovernanceSeverity


class GovernanceValidateRequest(BaseModel):
    """Request to run governance validation on an onboarding submission."""

    model_config = ConfigDict(str_strip_whitespace=True)

    onboarding_request_id: UUID
    dry_run: bool = Field(
        default=False,
        description="When True, violations are returned but the request is not blocked.",
    )


class Violation(BaseModel):
    """A single governance rule violation."""

    rule_id: str = Field(
        description="Unique identifier for the governance rule.",
        examples=["GOV-001"],
    )
    severity: GovernanceSeverity
    message: str = Field(description="Human-readable explanation of the violation.")
    field: str | None = Field(
        default=None,
        description="Dot-path of the offending field, if applicable.",
        examples=["telemetry_scope.metrics.enabled"],
    )
    suggestion: str | None = Field(
        default=None,
        description="Actionable suggestion to resolve the violation.",
    )
    metadata: dict[str, Any] = Field(default_factory=dict)


class GovernanceResult(BaseModel):
    """Aggregate governance validation result."""

    model_config = ConfigDict(from_attributes=True)

    onboarding_request_id: UUID
    passed: bool = Field(
        description="True if no hard violations were found.",
    )
    score: float = Field(
        ge=0.0,
        le=100.0,
        description="Governance compliance score (100 = fully compliant).",
    )
    hard_violations: list[Violation] = Field(
        default_factory=list,
        description="Blocking violations that must be fixed before submission.",
    )
    soft_violations: list[Violation] = Field(
        default_factory=list,
        description="Advisory violations (warnings) that do not block submission.",
    )
    info_notices: list[Violation] = Field(
        default_factory=list,
        description="Informational notices for awareness.",
    )
    evaluated_rules_count: int = Field(
        ge=0,
        description="Total number of rules evaluated.",
    )
