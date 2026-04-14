"""Grafana RBAC usage endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import structlog
from fastapi import APIRouter, Query
from sqlalchemy import and_, distinct, func, select

from app.api.deps import DbSession
from app.models.application import ApplicationMetadata
from app.models.coverage import GrafanaRbacUsage
from app.schemas.grafana_usage import (
    GrafanaTeamListResponse,
    GrafanaTeamUsage,
    GrafanaUsageCoverageResponse,
    GrafanaUsageSummary,
)

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(tags=["grafana-usage"])


@router.get(
    "/summary",
    response_model=GrafanaUsageSummary,
    operation_id="getGrafanaUsageSummary",
)
async def get_grafana_usage_summary(db: DbSession) -> GrafanaUsageSummary:
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

    totals = (
        await db.execute(
            select(
                func.count(distinct(GrafanaRbacUsage.org_id)).label("orgs"),
                func.count(GrafanaRbacUsage.team_id).label("teams"),
                func.coalesce(func.sum(GrafanaRbacUsage.member_count), 0).label(
                    "members"
                ),
                func.coalesce(func.sum(GrafanaRbacUsage.active_users_30d), 0).label(
                    "active_users"
                ),
                func.coalesce(func.sum(GrafanaRbacUsage.dashboard_count), 0).label(
                    "dashboards"
                ),
                func.coalesce(
                    func.sum(GrafanaRbacUsage.dashboard_views_30d), 0
                ).label("views"),
            )
        )
    ).one()

    active_teams = (
        await db.execute(
            select(func.count()).select_from(
                select(GrafanaRbacUsage)
                .where(
                    and_(
                        GrafanaRbacUsage.last_activity_at.isnot(None),
                        GrafanaRbacUsage.last_activity_at >= thirty_days_ago,
                    )
                )
                .subquery()
            )
        )
    ).scalar_one()

    total_teams = int(totals.teams or 0)
    adoption_pct = 100.0 * active_teams / total_teams if total_teams else 0.0

    return GrafanaUsageSummary(
        total_orgs=int(totals.orgs or 0),
        total_teams=total_teams,
        active_teams_30d=int(active_teams),
        total_users=int(totals.members or 0),
        active_users_30d=int(totals.active_users or 0),
        total_dashboards=int(totals.dashboards or 0),
        dashboards_viewed_30d=int(totals.views or 0),
        team_adoption_pct=round(adoption_pct, 2),
    )


@router.get(
    "/teams",
    response_model=GrafanaTeamListResponse,
    operation_id="listGrafanaTeams",
)
async def list_grafana_teams(
    db: DbSession,
    org_id: int | None = None,
    portfolio: str | None = None,
    active_only: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
) -> GrafanaTeamListResponse:
    conds = []
    if org_id is not None:
        conds.append(GrafanaRbacUsage.org_id == org_id)
    if portfolio is not None:
        conds.append(GrafanaRbacUsage.mapped_portfolio == portfolio)
    if active_only:
        thirty = datetime.now(timezone.utc) - timedelta(days=30)
        conds.append(GrafanaRbacUsage.last_activity_at >= thirty)

    base = select(GrafanaRbacUsage).where(and_(*conds)) if conds else select(GrafanaRbacUsage)
    total = (
        await db.execute(
            select(func.count()).select_from(base.subquery())
        )
    ).scalar_one()

    offset = (page - 1) * page_size
    rows = (
        await db.execute(
            base.order_by(GrafanaRbacUsage.team_name).offset(offset).limit(page_size)
        )
    ).scalars().all()
    return GrafanaTeamListResponse(
        items=[GrafanaTeamUsage.model_validate(r) for r in rows],
        total=int(total),
        page=page,
        page_size=page_size,
    )


@router.get(
    "/coverage",
    response_model=GrafanaUsageCoverageResponse,
    operation_id="getGrafanaAdoptionCoverage",
)
async def get_grafana_adoption_coverage(
    db: DbSession,
) -> GrafanaUsageCoverageResponse:
    total_apps = (
        await db.execute(
            select(func.count()).select_from(
                select(ApplicationMetadata)
                .where(ApplicationMetadata.retired.is_(False))
                .subquery()
            )
        )
    ).scalar_one()

    mapped = (
        await db.execute(
            select(distinct(GrafanaRbacUsage.mapped_app_code)).where(
                GrafanaRbacUsage.mapped_app_code.isnot(None)
            )
        )
    ).all()
    mapped_codes = {m[0] for m in mapped if m[0]}

    all_app_codes = (
        await db.execute(
            select(ApplicationMetadata.app_code).where(
                ApplicationMetadata.retired.is_(False)
            )
        )
    ).all()
    unmapped = sorted({a[0] for a in all_app_codes} - mapped_codes)

    coverage_pct = 100.0 * len(mapped_codes) / total_apps if total_apps else 0.0
    return GrafanaUsageCoverageResponse(
        total_cmdb_apps=int(total_apps),
        apps_with_mapped_team=len(mapped_codes & {a[0] for a in all_app_codes}),
        team_coverage_pct=round(coverage_pct, 2),
        unmapped_app_codes=unmapped[:500],
    )
