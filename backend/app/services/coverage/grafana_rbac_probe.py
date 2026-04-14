"""Grafana RBAC usage probe — populates ``grafana_rbac_usage``.

Mock-mode generates one team per CMDB app plus 10 "org-wide" teams not
mapped to any app, so the UI can show the mapped-vs-unmapped coverage.
"""

from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models.application import ApplicationMetadata
from app.models.coverage import GrafanaRbacUsage

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


@dataclass
class GrafanaRbacProbeResult:
    teams_upserted: int
    active_teams_30d: int


def _stable_int(seed: str, max_val: int) -> int:
    h = hashlib.sha1(seed.encode()).hexdigest()
    return int(h[:8], 16) % max_val


async def grafana_rbac_probe(
    db: AsyncSession, settings: Settings
) -> GrafanaRbacProbeResult:
    now = datetime.now(timezone.utc)

    result = await db.execute(
        select(
            ApplicationMetadata.app_code, ApplicationMetadata.portfolio
        ).where(ApplicationMetadata.retired.is_(False))
    )
    apps = result.all()
    if not apps:
        return GrafanaRbacProbeResult(teams_upserted=0, active_teams_30d=0)

    upserted = 0
    active_30d = 0
    org_id = 1

    # Mapped teams — one per app.
    for team_idx, (app_code, portfolio) in enumerate(apps, start=100):
        seed = f"grafana:{app_code}"
        rng = random.Random(seed)
        member_count = rng.randint(2, 25)
        active_users = rng.randint(0, member_count)
        dashboard_count = rng.randint(0, 30)
        views_30d = rng.randint(0, 5000) if active_users > 0 else 0
        last_activity = (
            now - timedelta(days=rng.randint(0, 40)) if active_users > 0 else None
        )
        is_active = bool(active_users > 0 and (last_activity and (now - last_activity).days <= 30))
        if is_active:
            active_30d += 1

        stmt = pg_insert(GrafanaRbacUsage).values(
            org_id=org_id,
            team_id=team_idx,
            team_name=app_code,
            mapped_app_code=app_code,
            mapped_portfolio=portfolio,
            member_count=member_count,
            active_users_30d=active_users,
            dashboard_count=dashboard_count,
            dashboard_views_30d=views_30d,
            last_activity_at=last_activity,
            collected_at=now,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["org_id", "team_id"],
            set_={
                "team_name": stmt.excluded.team_name,
                "mapped_app_code": stmt.excluded.mapped_app_code,
                "mapped_portfolio": stmt.excluded.mapped_portfolio,
                "member_count": stmt.excluded.member_count,
                "active_users_30d": stmt.excluded.active_users_30d,
                "dashboard_count": stmt.excluded.dashboard_count,
                "dashboard_views_30d": stmt.excluded.dashboard_views_30d,
                "last_activity_at": stmt.excluded.last_activity_at,
                "collected_at": stmt.excluded.collected_at,
                "updated_at": now,
            },
        )
        await db.execute(stmt)
        upserted += 1

    # A few unmapped "platform" teams to show team_coverage_pct < 100.
    for i in range(10):
        rng = random.Random(f"platform:{i}")
        team_idx = 1000 + i
        member_count = rng.randint(3, 15)
        active_users = rng.randint(0, member_count)
        is_active = active_users > 0
        if is_active:
            active_30d += 1
        stmt = pg_insert(GrafanaRbacUsage).values(
            org_id=org_id,
            team_id=team_idx,
            team_name=f"platform-team-{i}",
            mapped_app_code=None,
            mapped_portfolio=None,
            member_count=member_count,
            active_users_30d=active_users,
            dashboard_count=rng.randint(0, 20),
            dashboard_views_30d=rng.randint(0, 2000),
            last_activity_at=now - timedelta(days=rng.randint(0, 60))
            if is_active
            else None,
            collected_at=now,
        )
        stmt = stmt.on_conflict_do_update(
            index_elements=["org_id", "team_id"],
            set_={
                "team_name": stmt.excluded.team_name,
                "member_count": stmt.excluded.member_count,
                "active_users_30d": stmt.excluded.active_users_30d,
                "dashboard_count": stmt.excluded.dashboard_count,
                "dashboard_views_30d": stmt.excluded.dashboard_views_30d,
                "last_activity_at": stmt.excluded.last_activity_at,
                "collected_at": stmt.excluded.collected_at,
                "updated_at": now,
            },
        )
        await db.execute(stmt)
        upserted += 1

    return GrafanaRbacProbeResult(teams_upserted=upserted, active_teams_30d=active_30d)
