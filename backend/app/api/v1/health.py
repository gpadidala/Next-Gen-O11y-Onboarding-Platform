"""Health and readiness probes for the Observability Onboarding Platform.

Endpoints:
    GET /health  - Liveness probe.
    GET /ready   - Readiness probe (DB + MCP connectivity).
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import structlog
from fastapi import APIRouter, status
from pydantic import BaseModel, Field
from sqlalchemy import text

from app.api.deps import AppSettings, DbSession

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(tags=["health"])


# -- Response Schemas -----------------------------------------------------


class HealthResponse(BaseModel):
    """Liveness probe response."""

    status: str = Field(description="Service health status")
    version: str = Field(description="Application version")
    timestamp: datetime = Field(description="Current server time (UTC)")


class MCPConnectivity(BaseModel):
    """Connectivity status for each MCP integration."""

    grafana: bool = False
    confluence: bool = False
    jira: bool = False


class ReadinessResponse(BaseModel):
    """Readiness probe response with dependency checks."""

    status: str = Field(description="Overall readiness status")
    db: bool = Field(description="Database connectivity")
    mcp: MCPConnectivity = Field(default_factory=MCPConnectivity)


# -- Endpoints ------------------------------------------------------------


@router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    operation_id="healthCheck",
    summary="Liveness probe",
    description=(
        "Returns the current health status of the service. "
        "Use this endpoint for Kubernetes liveness probes."
    ),
)
async def health_check(settings: AppSettings) -> HealthResponse:
    """Return basic liveness information."""
    logger.debug("health_check_called")
    return HealthResponse(
        status="healthy",
        version=settings.APP_VERSION,
        timestamp=datetime.now(tz=timezone.utc),
    )


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    status_code=status.HTTP_200_OK,
    operation_id="readinessCheck",
    summary="Readiness probe",
    description=(
        "Checks connectivity to the database and MCP integrations. "
        "Use this endpoint for Kubernetes readiness probes."
    ),
    responses={
        503: {
            "description": "One or more dependencies are unavailable",
            "content": {
                "application/json": {
                    "example": {
                        "status": "degraded",
                        "db": False,
                        "mcp": {
                            "grafana": False,
                            "confluence": False,
                            "jira": False,
                        },
                    }
                }
            },
        }
    },
)
async def readiness_check(
    db: DbSession,
    settings: AppSettings,
) -> ReadinessResponse:
    """Check database and MCP connectivity."""
    db_ok = await _check_db(db)
    mcp_status = await _check_mcp(settings)

    all_ok = db_ok and any(
        [mcp_status.grafana, mcp_status.confluence, mcp_status.jira]
    )
    overall = "ready" if all_ok else "degraded"

    logger.info(
        "readiness_check",
        db=db_ok,
        grafana=mcp_status.grafana,
        confluence=mcp_status.confluence,
        jira=mcp_status.jira,
        overall=overall,
    )

    return ReadinessResponse(status=overall, db=db_ok, mcp=mcp_status)


# -- Internal Helpers -----------------------------------------------------


async def _check_db(db: DbSession) -> bool:
    """Execute a lightweight query to verify database connectivity."""
    try:
        await db.execute(text("SELECT 1"))
        return True
    except Exception:
        logger.warning("db_health_check_failed", exc_info=True)
        return False


async def _check_mcp(settings: AppSettings) -> MCPConnectivity:
    """Probe each MCP endpoint with a simple connectivity test.

    In a production implementation this would issue a real HTTP HEAD / ping
    request.  For now we consider an MCP reachable when its URL is configured
    and non-empty.
    """
    return MCPConnectivity(
        grafana=bool(settings.GRAFANA_MCP_URL),
        confluence=bool(settings.CONFLUENCE_MCP_URL),
        jira=bool(settings.JIRA_MCP_URL),
    )
