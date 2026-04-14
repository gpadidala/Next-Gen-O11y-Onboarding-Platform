"""CMDB endpoints — catalog listing and sync triggers."""

from __future__ import annotations

import uuid

import structlog
from fastapi import APIRouter, BackgroundTasks, Query, status
from sqlalchemy import func, select

from app.api.deps import DbSession
from app.models.application import ApplicationMetadata
from app.models.coverage import CmdbSyncRun
from app.schemas.cmdb import (
    CMDBAppListResponse,
    CMDBAppRecord,
    CMDBSyncRunResponse,
    CMDBSyncTriggerResponse,
)
from app.services.cmdb_sync_service import run_cmdb_sync

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(tags=["cmdb"])


@router.post(
    "/sync",
    response_model=CMDBSyncTriggerResponse,
    status_code=status.HTTP_202_ACCEPTED,
    operation_id="triggerCmdbSync",
    summary="Trigger a full CMDB sync",
)
async def trigger_cmdb_sync(
    db: DbSession, background_tasks: BackgroundTasks
) -> CMDBSyncTriggerResponse:
    """Run the CMDB sync inline (the work is small in mock mode)."""
    result = await run_cmdb_sync(db)
    return CMDBSyncTriggerResponse(
        run_id=uuid.UUID(result.run_id),
        status=result.status,
        message=(
            f"{result.apps_upserted} apps upserted, "
            f"{result.apps_retired} retired."
        ),
    )


@router.get(
    "/sync/runs",
    response_model=list[CMDBSyncRunResponse],
    operation_id="listCmdbSyncRuns",
    summary="List recent CMDB sync runs",
)
async def list_cmdb_sync_runs(db: DbSession) -> list[CMDBSyncRunResponse]:
    result = await db.execute(
        select(CmdbSyncRun).order_by(CmdbSyncRun.started_at.desc()).limit(50)
    )
    rows = result.scalars().all()
    return [CMDBSyncRunResponse.model_validate(r) for r in rows]


@router.get(
    "/apps",
    response_model=CMDBAppListResponse,
    operation_id="listCmdbApps",
    summary="List CMDB applications (paginated)",
)
async def list_cmdb_apps(
    db: DbSession,
    portfolio: str | None = None,
    vp_email: str | None = None,
    architect_email: str | None = None,
    app_code: str | None = None,
    retired: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> CMDBAppListResponse:
    conditions = [ApplicationMetadata.retired.is_(retired)]
    if portfolio is not None:
        conditions.append(ApplicationMetadata.portfolio == portfolio)
    if vp_email is not None:
        conditions.append(ApplicationMetadata.vp_email == vp_email)
    if architect_email is not None:
        conditions.append(ApplicationMetadata.architect_email == architect_email)
    if app_code is not None:
        conditions.append(ApplicationMetadata.app_code == app_code)

    base = select(ApplicationMetadata).where(*conditions)
    total = (
        await db.execute(
            select(func.count()).select_from(base.subquery())
        )
    ).scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        base.order_by(ApplicationMetadata.app_code).offset(offset).limit(page_size)
    )
    rows = result.scalars().all()
    return CMDBAppListResponse(
        items=[CMDBAppRecord.model_validate(r) for r in rows],
        total=total,
        page=page,
        page_size=page_size,
    )
