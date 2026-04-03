"""Artifact generation and retrieval endpoints.

Generates Change Requests (CRs) and Jira artifacts (Epics, Stories, Tasks)
for approved onboarding requests and pushes them to external systems via
MCP integrations.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select

from app.api.deps import AppSettings, DbSession
from app.models.artifact import Artifact, ArtifactStatus, ArtifactType as ArtifactTypeORM
from app.models.onboarding import OnboardingRequest
from app.schemas.artifact import (
    ArtifactGenerateRequest,
    ArtifactPreviewResponse,
    ArtifactResponse,
)
from app.schemas.common import ErrorResponse

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(tags=["artifacts"])


# -- Helper: build RFC 7807 error -----------------------------------------


def _problem(
    *,
    status_code: int,
    title: str,
    detail: str,
    error_code: str = "INTERNAL_ERROR",
    instance: str | None = None,
) -> HTTPException:
    """Return an HTTPException whose body follows RFC 7807 Problem Details."""
    return HTTPException(
        status_code=status_code,
        detail={
            "type": "about:blank",
            "title": title,
            "status": status_code,
            "detail": detail,
            "error_code": error_code,
            "instance": instance,
            "timestamp": datetime.now(tz=timezone.utc).isoformat(),
        },
    )


async def _get_onboarding_or_404(
    db: DbSession,
    onboarding_id: uuid.UUID,
) -> OnboardingRequest:
    """Fetch an onboarding request by ID or raise 404."""
    stmt = select(OnboardingRequest).where(OnboardingRequest.id == onboarding_id)
    result = await db.execute(stmt)
    obj = result.scalar_one_or_none()
    if obj is None:
        raise _problem(
            status_code=status.HTTP_404_NOT_FOUND,
            title="Onboarding request not found",
            detail=f"No onboarding request exists with id '{onboarding_id}'.",
            error_code="NOT_FOUND",
            instance=f"/artifacts/{onboarding_id}",
        )
    return obj


# -- Endpoints ------------------------------------------------------------


@router.post(
    "/generate",
    response_model=list[ArtifactResponse],
    status_code=status.HTTP_201_CREATED,
    operation_id="generateArtifacts",
    summary="Generate CR and Jira artifacts",
    description=(
        "Generates Change Request and Jira artifacts (Epic, Stories, Tasks) "
        "for the specified onboarding request. The artifacts are persisted "
        "and, unless dry_run is set, pushed to the external systems via MCP."
    ),
    responses={
        404: {
            "description": "Referenced onboarding request not found",
            "model": ErrorResponse,
        },
        422: {"description": "Validation error", "model": ErrorResponse},
    },
)
async def generate_artifacts(
    body: ArtifactGenerateRequest,
    db: DbSession,
    settings: AppSettings,
) -> list[ArtifactResponse]:
    """Generate CR + Jira artifacts for an onboarding request."""
    logger.info(
        "artifact_generation_requested",
        onboarding_id=str(body.onboarding_request_id),
        artifact_types=[t.value for t in body.artifact_types],
    )

    # Verify the onboarding exists
    onboarding = await _get_onboarding_or_404(db, body.onboarding_request_id)

    # ----- Service call placeholder -----
    # In the full implementation this delegates to ArtifactService which
    # uses Jinja2 templates and MCP clients (Jira, ServiceNow) to create
    # real artifacts.  For now we generate draft artifact records.

    created_artifacts: list[Artifact] = []
    for art_type in body.artifact_types:
        artifact = Artifact(
            onboarding_request_id=body.onboarding_request_id,
            artifact_type=art_type.value,
            payload=_build_placeholder_payload(art_type.value, onboarding),
            status=ArtifactStatus.DRAFT,
        )
        db.add(artifact)
        created_artifacts.append(artifact)

    await db.flush()
    for artifact in created_artifacts:
        await db.refresh(artifact)

    logger.info(
        "artifacts_generated",
        onboarding_id=str(body.onboarding_request_id),
        count=len(created_artifacts),
        types=[a.artifact_type for a in created_artifacts],
    )

    return [ArtifactResponse.model_validate(a) for a in created_artifacts]


@router.post(
    "/preview",
    response_model=list[ArtifactPreviewResponse],
    status_code=status.HTTP_200_OK,
    operation_id="previewArtifacts",
    summary="Preview artifacts without creating in external systems",
    description=(
        "Generates a preview of what the CR and Jira artifacts would look "
        "like for the given onboarding request, without persisting them or "
        "pushing to external systems."
    ),
    responses={
        404: {
            "description": "Referenced onboarding request not found",
            "model": ErrorResponse,
        },
        422: {"description": "Validation error", "model": ErrorResponse},
    },
)
async def preview_artifacts(
    body: ArtifactGenerateRequest,
    db: DbSession,
    settings: AppSettings,
) -> list[ArtifactPreviewResponse]:
    """Preview artifacts without persisting or syncing externally."""
    logger.info(
        "artifact_preview_requested",
        onboarding_id=str(body.onboarding_request_id),
        artifact_types=[t.value for t in body.artifact_types],
    )

    onboarding = await _get_onboarding_or_404(db, body.onboarding_request_id)

    previews: list[ArtifactPreviewResponse] = []
    for art_type in body.artifact_types:
        payload = _build_placeholder_payload(art_type.value, onboarding)
        previews.append(
            ArtifactPreviewResponse(
                artifact_type=art_type,
                payload=payload,
                rendered_summary=_render_summary(art_type.value, onboarding),
                warnings=[],
            )
        )

    logger.info(
        "artifact_preview_completed",
        onboarding_id=str(body.onboarding_request_id),
        count=len(previews),
    )

    return previews


@router.get(
    "/{onboarding_id}",
    response_model=list[ArtifactResponse],
    status_code=status.HTTP_200_OK,
    operation_id="getArtifactsForOnboarding",
    summary="Get artifacts for an onboarding request",
    description=(
        "Returns all artifacts that have been generated for the specified "
        "onboarding request, including their sync status with external systems."
    ),
    responses={
        404: {
            "description": "Onboarding request not found or has no artifacts",
            "model": ErrorResponse,
        },
    },
)
async def get_artifacts(
    onboarding_id: uuid.UUID,
    db: DbSession,
) -> list[ArtifactResponse]:
    """Retrieve all artifacts for an onboarding request."""
    logger.debug("get_artifacts", onboarding_id=str(onboarding_id))

    # Verify the onboarding exists
    await _get_onboarding_or_404(db, onboarding_id)

    stmt = (
        select(Artifact)
        .where(Artifact.onboarding_request_id == onboarding_id)
        .order_by(Artifact.created_at.asc())
    )
    result = await db.execute(stmt)
    artifacts = result.scalars().all()

    return [ArtifactResponse.model_validate(a) for a in artifacts]


# -- Internal Helpers -----------------------------------------------------


def _build_placeholder_payload(
    artifact_type: str,
    onboarding: OnboardingRequest,
) -> dict[str, Any]:
    """Build a placeholder payload for the given artifact type.

    In production this is replaced by Jinja2 template rendering via
    ArtifactService.
    """
    base: dict[str, Any] = {
        "app_code": onboarding.app_code,
        "app_name": onboarding.app_name,
        "portfolio": onboarding.portfolio,
    }

    if artifact_type == "cr":
        return {
            **base,
            "title": f"Observability Onboarding - {onboarding.app_name}",
            "description": (
                f"Change request for onboarding {onboarding.app_name} "
                f"({onboarding.app_code}) to the observability platform."
            ),
            "risk_level": "low",
            "change_type": "standard",
        }
    elif artifact_type == "epic":
        return {
            **base,
            "summary": f"[O11y] Onboard {onboarding.app_name}",
            "description": (
                f"Epic for onboarding {onboarding.app_name} to observability."
            ),
        }
    elif artifact_type in ("story", "task", "ctask"):
        return {
            **base,
            "summary": f"[O11y] {artifact_type.upper()} - {onboarding.app_name}",
            "description": (
                f"{artifact_type.capitalize()} for {onboarding.app_name} onboarding."
            ),
        }
    return base


def _render_summary(
    artifact_type: str,
    onboarding: OnboardingRequest,
) -> str:
    """Render a human-readable preview summary."""
    return (
        f"[{artifact_type.upper()}] Observability onboarding for "
        f"{onboarding.app_name} ({onboarding.app_code})"
    )
