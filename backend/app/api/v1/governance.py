"""Governance validation endpoints.

Evaluates onboarding submissions against a configurable set of governance
rules (naming conventions, alert ownership, signal selection requirements,
etc.) and returns a compliance score with any violations.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import structlog
from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from app.api.deps import AppSettings, DbSession
from app.schemas.common import ErrorResponse, GovernanceSeverity
from app.schemas.governance import (
    GovernanceResult,
    GovernanceValidateRequest,
    Violation,
)

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(tags=["governance"])


# -- Response schema for rule listing -------------------------------------


class GovernanceRuleDefinition(BaseModel):
    """Public representation of a governance rule."""

    rule_id: str = Field(description="Unique rule identifier (e.g. GOV-001)")
    description: str = Field(description="Human-readable rule description")
    severity: GovernanceSeverity = Field(
        description="HARD (blocking) or SOFT (advisory) or INFO"
    )


# -- Endpoints ------------------------------------------------------------


@router.post(
    "/validate",
    response_model=GovernanceResult,
    status_code=status.HTTP_200_OK,
    operation_id="validateGovernance",
    summary="Validate onboarding against governance rules",
    description=(
        "Evaluates the specified onboarding request against all registered "
        "governance rules. Returns a pass/fail verdict, compliance score, "
        "and any hard or soft violations discovered."
    ),
    responses={
        404: {
            "description": "Referenced onboarding request not found",
            "model": ErrorResponse,
        },
        422: {"description": "Validation error", "model": ErrorResponse},
    },
)
async def validate_governance(
    body: GovernanceValidateRequest,
    db: DbSession,
    settings: AppSettings,
) -> GovernanceResult:
    """Run governance validation for the given onboarding request."""
    logger.info(
        "governance_validation_requested",
        onboarding_id=str(body.onboarding_request_id),
        dry_run=body.dry_run,
    )

    # ----- Service call placeholder -----
    # In the full implementation this delegates to GovernanceService which
    # loads all BaseRule subclasses from app.engine.rules, evaluates each
    # against the onboarding data, and aggregates the result.
    # For now we return a synthetic "all clear" response.

    # Placeholder rule set
    rules_evaluated = _get_rule_definitions()
    hard_violations: list[Violation] = []
    soft_violations: list[Violation] = []
    info_notices: list[Violation] = []

    total_rules = len(rules_evaluated)
    passed = len(hard_violations) == 0
    # Score: 100 minus penalty for violations
    penalty_per_hard = 20
    penalty_per_soft = 5
    score = max(
        0.0,
        100.0
        - (len(hard_violations) * penalty_per_hard)
        - (len(soft_violations) * penalty_per_soft),
    )

    logger.info(
        "governance_validation_completed",
        onboarding_id=str(body.onboarding_request_id),
        passed=passed,
        score=score,
        hard_count=len(hard_violations),
        soft_count=len(soft_violations),
        info_count=len(info_notices),
    )

    return GovernanceResult(
        onboarding_request_id=body.onboarding_request_id,
        passed=passed,
        score=score,
        hard_violations=hard_violations,
        soft_violations=soft_violations,
        info_notices=info_notices,
        evaluated_rules_count=total_rules,
    )


@router.get(
    "/rules",
    response_model=list[GovernanceRuleDefinition],
    status_code=status.HTTP_200_OK,
    operation_id="listGovernanceRules",
    summary="List all governance rules",
    description=(
        "Returns the complete catalog of governance rules, including each "
        "rule's unique ID, human-readable description, and severity level."
    ),
)
async def list_governance_rules(
    settings: AppSettings,
) -> list[GovernanceRuleDefinition]:
    """Return all registered governance rules."""
    logger.debug("list_governance_rules")
    return _get_rule_definitions()


# -- Internal Helpers -----------------------------------------------------


def _get_rule_definitions() -> list[GovernanceRuleDefinition]:
    """Return the static catalog of governance rules.

    In the full implementation this dynamically inspects all registered
    BaseRule subclasses from ``app.engine.rules``.
    """
    return [
        GovernanceRuleDefinition(
            rule_id="GOV-001",
            description=(
                "Application code must follow the naming convention: "
                "alphanumeric characters, hyphens, and underscores only."
            ),
            severity=GovernanceSeverity.HARD,
        ),
        GovernanceRuleDefinition(
            rule_id="GOV-002",
            description=(
                "At least one telemetry signal (metrics, logs, traces, or "
                "profiling) must be enabled."
            ),
            severity=GovernanceSeverity.HARD,
        ),
        GovernanceRuleDefinition(
            rule_id="GOV-003",
            description="Alert owner email must be a valid corporate email address.",
            severity=GovernanceSeverity.HARD,
        ),
        GovernanceRuleDefinition(
            rule_id="GOV-004",
            description=(
                "Production environment must be included when any signal "
                "is enabled for staging."
            ),
            severity=GovernanceSeverity.SOFT,
        ),
        GovernanceRuleDefinition(
            rule_id="GOV-005",
            description=(
                "Applications on legacy hosting platforms (EC2, on-prem) "
                "should consider migration to containerised platforms."
            ),
            severity=GovernanceSeverity.INFO,
        ),
        GovernanceRuleDefinition(
            rule_id="GOV-006",
            description=(
                "Capacity check must show GREEN or YELLOW status before "
                "submission is allowed."
            ),
            severity=GovernanceSeverity.HARD,
        ),
        GovernanceRuleDefinition(
            rule_id="GOV-007",
            description="Portfolio assignment must match the CMDB record.",
            severity=GovernanceSeverity.SOFT,
        ),
    ]
