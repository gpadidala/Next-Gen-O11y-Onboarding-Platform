"""Synthetics (Blackbox) endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import structlog
from fastapi import APIRouter, Query
from sqlalchemy import distinct, func, select

from app.api.deps import DbSession
from app.models.coverage import SyntheticUrl
from app.schemas.synthetics import (
    SyntheticsSummary,
    SyntheticUrlListResponse,
    SyntheticUrlRecord,
)

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(tags=["synthetics"])


@router.get(
    "/urls",
    response_model=SyntheticUrlListResponse,
    operation_id="listSyntheticUrls",
)
async def list_synthetic_urls(
    db: DbSession,
    app_code: str | None = None,
    module: str | None = None,
    is_active: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> SyntheticUrlListResponse:
    q = select(SyntheticUrl)
    if app_code is not None:
        q = q.where(SyntheticUrl.app_code == app_code)
    if module is not None:
        q = q.where(SyntheticUrl.module == module)
    if is_active is not None:
        q = q.where(SyntheticUrl.is_active.is_(is_active))

    total = (
        await db.execute(
            select(func.count()).select_from(q.subquery())
        )
    ).scalar_one()

    offset = (page - 1) * page_size
    rows = (
        await db.execute(
            q.order_by(SyntheticUrl.app_code, SyntheticUrl.url)
            .offset(offset)
            .limit(page_size)
        )
    ).scalars().all()
    return SyntheticUrlListResponse(
        items=[SyntheticUrlRecord.model_validate(r) for r in rows],
        total=int(total),
    )


@router.get(
    "/summary",
    response_model=SyntheticsSummary,
    operation_id="getSyntheticsSummary",
)
async def get_synthetics_summary(db: DbSession) -> SyntheticsSummary:
    thirty = datetime.now(timezone.utc) - timedelta(days=30)

    total_urls = (
        await db.execute(select(func.count()).select_from(SyntheticUrl))
    ).scalar_one()
    active_urls = (
        await db.execute(
            select(func.count())
            .select_from(SyntheticUrl)
            .where(SyntheticUrl.is_active.is_(True))
        )
    ).scalar_one()
    apps_covered = (
        await db.execute(
            select(func.count(distinct(SyntheticUrl.app_code)))
        )
    ).scalar_one()
    recent_success = (
        await db.execute(
            select(func.count())
            .select_from(SyntheticUrl)
            .where(SyntheticUrl.last_success_at >= thirty)
        )
    ).scalar_one()
    success_rate = (
        100.0 * int(recent_success) / int(active_urls) if active_urls else 0.0
    )
    return SyntheticsSummary(
        total_urls=int(total_urls),
        active_urls=int(active_urls),
        apps_covered=int(apps_covered),
        success_rate_30d=round(success_rate, 2),
    )
