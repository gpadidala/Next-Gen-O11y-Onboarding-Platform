"""Capacity assessment endpoints.

Provides infrastructure capacity evaluation against the Grafana LGTM stack
to determine whether the platform can accommodate a new onboarding.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import structlog
from fastapi import APIRouter, status
from pydantic import BaseModel, Field

from app.api.deps import AppSettings, DbSession
from app.schemas.capacity import (
    CapacityCheckRequest,
    CapacityCheckResponse,
    SignalCapacity,
)
from app.schemas.common import CapacityStatus, ErrorResponse, TelemetrySignal
from app.utils.metrics import CAPACITY_CHECKS

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(tags=["capacity"])


# -- Response schema for the status overview ------------------------------


class CapacityStatusOverview(BaseModel):
    """Current LGTM capacity overview (no projection / no specific app)."""

    overall_status: CapacityStatus
    signals: dict[str, SignalCapacity] = Field(
        default_factory=dict,
        description="Current utilisation keyed by signal name.",
    )
    last_refreshed: datetime


# -- Endpoints ------------------------------------------------------------


@router.post(
    "/check",
    response_model=CapacityCheckResponse,
    status_code=status.HTTP_200_OK,
    operation_id="runCapacityCheck",
    summary="Run a capacity assessment",
    description=(
        "Evaluates infrastructure capacity across all requested telemetry "
        "signals for a specific onboarding request. Returns per-signal "
        "utilisation, projected load, and a go / no-go recommendation."
    ),
    responses={
        404: {
            "description": "Referenced onboarding request not found",
            "model": ErrorResponse,
        },
        422: {"description": "Validation error", "model": ErrorResponse},
    },
)
async def run_capacity_check(
    body: CapacityCheckRequest,
    db: DbSession,
    settings: AppSettings,
) -> CapacityCheckResponse:
    """Run a capacity assessment for the given onboarding request."""
    logger.info(
        "capacity_check_requested",
        onboarding_id=str(body.onboarding_request_id),
        signals=[s.value for s in body.signals],
    )

    # ----- Service call placeholder -----
    # In the full implementation this delegates to CapacityService which
    # queries Grafana MCP endpoints for real-time utilisation data.  For
    # now we return a synthetic response so the API contract is exercisable.

    signal_results: dict[str, SignalCapacity] = {}
    for sig in body.signals:
        signal_results[sig.value] = SignalCapacity(
            signal=sig,
            status=CapacityStatus.GREEN,
            current_utilization_pct=45.0,
            projected_utilization_pct=52.0,
            headroom_pct=48.0,
            message=f"{sig.value} capacity is within healthy limits.",
            details={},
        )

    overall = CapacityStatus.GREEN
    can_proceed = True
    escalation = False

    # Determine aggregate status from individual signals
    statuses = [s.status for s in signal_results.values()]
    if CapacityStatus.RED in statuses:
        overall = CapacityStatus.RED
        can_proceed = False
        escalation = True
    elif CapacityStatus.YELLOW in statuses:
        overall = CapacityStatus.YELLOW

    CAPACITY_CHECKS.labels(overall_status=overall.value).inc()

    logger.info(
        "capacity_check_completed",
        onboarding_id=str(body.onboarding_request_id),
        overall_status=overall.value,
        can_proceed=can_proceed,
    )

    return CapacityCheckResponse(
        onboarding_request_id=body.onboarding_request_id,
        overall_status=overall,
        signals=signal_results,
        recommendations=[],
        can_proceed=can_proceed,
        escalation_required=escalation,
    )


@router.get(
    "/status",
    response_model=CapacityStatusOverview,
    status_code=status.HTTP_200_OK,
    operation_id="getCapacityStatus",
    summary="Current LGTM capacity overview",
    description=(
        "Returns the current infrastructure utilisation across all "
        "telemetry signal backends without projecting additional load."
    ),
)
async def get_capacity_status(
    db: DbSession,
    settings: AppSettings,
) -> CapacityStatusOverview:
    """Get the current LGTM stack capacity overview."""
    logger.debug("capacity_status_requested")

    # Placeholder - in production, CapacityService queries live Grafana data
    signals: dict[str, SignalCapacity] = {}
    for sig in TelemetrySignal:
        signals[sig.value] = SignalCapacity(
            signal=sig,
            status=CapacityStatus.GREEN,
            current_utilization_pct=40.0,
            projected_utilization_pct=40.0,
            headroom_pct=60.0,
            message=f"{sig.value} backend is healthy.",
            details={},
        )

    return CapacityStatusOverview(
        overall_status=CapacityStatus.GREEN,
        signals=signals,
        last_refreshed=datetime.now(tz=timezone.utc),
    )
