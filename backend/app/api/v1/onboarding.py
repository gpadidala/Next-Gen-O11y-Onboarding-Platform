"""Onboarding Request CRUD endpoints.

Provides full lifecycle management for observability onboarding requests:
create, read, update, delete (drafts only), list with filtering, and
submission for processing.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from app.api.deps import AppSettings, DbSession
from app.models.onboarding import OnboardingRequest, OnboardingStatus
from app.schemas.common import ErrorResponse, PaginationMeta
from app.schemas.onboarding import (
    OnboardingCreate,
    OnboardingListResponse,
    OnboardingResponse,
    OnboardingUpdate,
)
from app.utils.metrics import ONBOARDING_SUBMISSIONS

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(tags=["onboarding"])


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


# -- Service-layer helpers (inline until service classes are wired) -------


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
            instance=f"/onboardings/{onboarding_id}",
        )
    return obj


# -- Endpoints ------------------------------------------------------------


@router.post(
    "/",
    response_model=OnboardingResponse,
    status_code=status.HTTP_201_CREATED,
    operation_id="createOnboarding",
    summary="Create a new onboarding request",
    description=(
        "Creates a new observability onboarding request in DRAFT status. "
        "The request captures application identity, technical profile, and ownership."
    ),
    responses={
        409: {
            "description": "An onboarding request with this app_code already exists",
            "model": ErrorResponse,
        },
        422: {"description": "Validation error", "model": ErrorResponse},
    },
)
async def create_onboarding(
    body: OnboardingCreate,
    db: DbSession,
    settings: AppSettings,
) -> OnboardingResponse:
    """Create a new onboarding request."""
    logger.info("create_onboarding", app_code=body.app_code, created_by=body.created_by)

    # Check for duplicate app_code
    existing_stmt = select(OnboardingRequest).where(
        OnboardingRequest.app_code == body.app_code
    )
    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing is not None:
        raise _problem(
            status_code=status.HTTP_409_CONFLICT,
            title="Duplicate application code",
            detail=f"An onboarding request already exists for app_code '{body.app_code}'.",
            error_code="DUPLICATE_APP_CODE",
        )

    obj = OnboardingRequest(
        app_name=body.app_name,
        app_code=body.app_code,
        portfolio=body.portfolio,
        hosting_platform=body.hosting_platform.value,
        tech_stack=body.tech_stack.value,
        alert_owner_email=body.alert_owner_email,
        alert_owner_team=body.alert_owner_team,
        created_by=body.created_by,
        notes=body.notes,
        status=OnboardingStatus.DRAFT,
    )

    try:
        db.add(obj)
        await db.flush()
        await db.refresh(obj)
    except IntegrityError as exc:
        await db.rollback()
        logger.warning("create_onboarding_integrity_error", error=str(exc))
        raise _problem(
            status_code=status.HTTP_409_CONFLICT,
            title="Duplicate application code",
            detail=f"An onboarding request already exists for app_code '{body.app_code}'.",
            error_code="DUPLICATE_APP_CODE",
        ) from exc

    logger.info("onboarding_created", onboarding_id=str(obj.id), app_code=obj.app_code)
    return OnboardingResponse.model_validate(obj)


@router.get(
    "/",
    response_model=OnboardingListResponse,
    status_code=status.HTTP_200_OK,
    operation_id="listOnboardings",
    summary="List onboarding requests",
    description=(
        "Returns a paginated, filterable list of onboarding requests. "
        "Supports filtering by status and portfolio."
    ),
)
async def list_onboardings(
    db: DbSession,
    skip: int = Query(default=0, ge=0, description="Number of records to skip"),
    limit: int = Query(default=20, ge=1, le=100, description="Page size"),
    status_filter: OnboardingStatus | None = Query(
        default=None, alias="status", description="Filter by onboarding status"
    ),
    portfolio: str | None = Query(
        default=None, description="Filter by portfolio name"
    ),
) -> OnboardingListResponse:
    """List onboarding requests with optional filters."""
    logger.debug(
        "list_onboardings",
        skip=skip,
        limit=limit,
        status=status_filter,
        portfolio=portfolio,
    )

    base_query = select(OnboardingRequest)
    count_query = select(func.count()).select_from(OnboardingRequest)

    if status_filter is not None:
        base_query = base_query.where(OnboardingRequest.status == status_filter)
        count_query = count_query.where(OnboardingRequest.status == status_filter)

    if portfolio is not None:
        base_query = base_query.where(OnboardingRequest.portfolio == portfolio)
        count_query = count_query.where(OnboardingRequest.portfolio == portfolio)

    total: int = (await db.execute(count_query)).scalar_one()

    items_query = (
        base_query.order_by(OnboardingRequest.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await db.execute(items_query)
    items = [
        OnboardingResponse.model_validate(row) for row in result.scalars().all()
    ]

    page = (skip // limit) + 1 if limit > 0 else 1
    total_pages = (total + limit - 1) // limit if limit > 0 else 0

    return OnboardingListResponse(
        items=items,
        pagination=PaginationMeta(
            total=total,
            page=page,
            page_size=limit,
            total_pages=total_pages,
        ),
    )


@router.get(
    "/{onboarding_id}",
    response_model=OnboardingResponse,
    status_code=status.HTTP_200_OK,
    operation_id="getOnboarding",
    summary="Get an onboarding request by ID",
    description=(
        "Returns the full representation of a single onboarding request, "
        "including all nested relationships (telemetry scope, capacity "
        "assessment, similarity matches, artifacts, environment readiness)."
    ),
    responses={
        404: {
            "description": "Onboarding request not found",
            "model": ErrorResponse,
        },
    },
)
async def get_onboarding(
    onboarding_id: uuid.UUID,
    db: DbSession,
) -> OnboardingResponse:
    """Retrieve a single onboarding request."""
    logger.debug("get_onboarding", onboarding_id=str(onboarding_id))
    obj = await _get_onboarding_or_404(db, onboarding_id)
    return OnboardingResponse.model_validate(obj)


@router.put(
    "/{onboarding_id}",
    response_model=OnboardingResponse,
    status_code=status.HTTP_200_OK,
    operation_id="updateOnboarding",
    summary="Update a draft onboarding request",
    description=(
        "Partially updates a draft onboarding request. Only fields present in "
        "the request body are modified. Returns 400 if the request is not in "
        "DRAFT status."
    ),
    responses={
        400: {
            "description": "Onboarding is not in DRAFT status",
            "model": ErrorResponse,
        },
        404: {
            "description": "Onboarding request not found",
            "model": ErrorResponse,
        },
        422: {"description": "Validation error", "model": ErrorResponse},
    },
)
async def update_onboarding(
    onboarding_id: uuid.UUID,
    body: OnboardingUpdate,
    db: DbSession,
) -> OnboardingResponse:
    """Update a draft onboarding request."""
    logger.info("update_onboarding", onboarding_id=str(onboarding_id))
    obj = await _get_onboarding_or_404(db, onboarding_id)

    if obj.status != OnboardingStatus.DRAFT:
        raise _problem(
            status_code=status.HTTP_400_BAD_REQUEST,
            title="Cannot update non-draft onboarding",
            detail=(
                f"Onboarding '{onboarding_id}' is in '{obj.status.value}' status. "
                "Only DRAFT requests can be updated."
            ),
            error_code="INVALID_STATE",
            instance=f"/onboardings/{onboarding_id}",
        )

    update_data = body.model_dump(exclude_unset=True)
    for field_name, value in update_data.items():
        # Convert enum values for ORM columns that expect raw string values
        if hasattr(value, "value"):
            setattr(obj, field_name, value.value)
        else:
            setattr(obj, field_name, value)

    await db.flush()
    await db.refresh(obj)

    logger.info(
        "onboarding_updated",
        onboarding_id=str(obj.id),
        updated_fields=list(update_data.keys()),
    )
    return OnboardingResponse.model_validate(obj)


class SubmitResponse(BaseModel):
    """Response returned after submitting an onboarding for processing."""

    id: uuid.UUID
    status: str
    message: str
    submitted_at: datetime


@router.post(
    "/{onboarding_id}/submit",
    response_model=SubmitResponse,
    status_code=status.HTTP_200_OK,
    operation_id="submitOnboarding",
    summary="Submit an onboarding for processing",
    description=(
        "Transitions the onboarding request from DRAFT to IN_PROGRESS and "
        "triggers the validation pipeline (capacity check, similarity search, "
        "governance review, artifact generation)."
    ),
    responses={
        400: {
            "description": "Onboarding cannot be submitted (wrong state or validation failure)",
            "model": ErrorResponse,
        },
        404: {
            "description": "Onboarding request not found",
            "model": ErrorResponse,
        },
    },
)
async def submit_onboarding(
    onboarding_id: uuid.UUID,
    db: DbSession,
) -> SubmitResponse:
    """Submit an onboarding request for processing."""
    logger.info("submit_onboarding", onboarding_id=str(onboarding_id))
    obj = await _get_onboarding_or_404(db, onboarding_id)

    if obj.status != OnboardingStatus.DRAFT:
        raise _problem(
            status_code=status.HTTP_400_BAD_REQUEST,
            title="Cannot submit onboarding",
            detail=(
                f"Onboarding '{onboarding_id}' is in '{obj.status.value}' status. "
                "Only DRAFT requests can be submitted."
            ),
            error_code="INVALID_STATE",
            instance=f"/onboardings/{onboarding_id}/submit",
        )

    now = datetime.now(tz=timezone.utc)
    obj.status = OnboardingStatus.IN_PROGRESS
    obj.submitted_at = now

    await db.flush()
    await db.refresh(obj)

    ONBOARDING_SUBMISSIONS.labels(status="submitted").inc()
    logger.info(
        "onboarding_submitted",
        onboarding_id=str(obj.id),
        app_code=obj.app_code,
    )

    return SubmitResponse(
        id=obj.id,
        status=obj.status.value,
        message="Onboarding submitted successfully. Validation pipeline initiated.",
        submitted_at=now,
    )


@router.delete(
    "/{onboarding_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    operation_id="deleteOnboarding",
    summary="Delete a draft onboarding request",
    description=(
        "Permanently deletes a DRAFT onboarding request and all associated "
        "child records (telemetry scope, capacity assessment, similarity "
        "matches, artifacts, environment readiness). Returns 400 if the "
        "request is not in DRAFT status."
    ),
    responses={
        400: {
            "description": "Only DRAFT onboardings can be deleted",
        },
        404: {
            "description": "Onboarding request not found",
        },
    },
)
async def delete_onboarding(
    onboarding_id: uuid.UUID,
    db: DbSession,
) -> None:
    """Delete a draft onboarding request."""
    logger.info("delete_onboarding", onboarding_id=str(onboarding_id))
    obj = await _get_onboarding_or_404(db, onboarding_id)

    if obj.status != OnboardingStatus.DRAFT:
        raise _problem(
            status_code=status.HTTP_400_BAD_REQUEST,
            title="Cannot delete non-draft onboarding",
            detail=(
                f"Onboarding '{onboarding_id}' is in '{obj.status.value}' status. "
                "Only DRAFT requests can be deleted."
            ),
            error_code="INVALID_STATE",
            instance=f"/onboardings/{onboarding_id}",
        )

    await db.delete(obj)
    await db.flush()

    logger.info(
        "onboarding_deleted",
        onboarding_id=str(onboarding_id),
        app_code=obj.app_code,
    )
    # 204 No Content - FastAPI handles the empty response automatically
