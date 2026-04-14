"""CMDB full-sync service — pulls the catalog and upserts application_metadata.

``application_metadata`` has a single writer: this service. Everything
else treats it as read-only.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings, get_settings
from app.mcp.cmdb_client import CMDBAppPayload, CMDBClient
from app.models.application import ApplicationMetadata
from app.models.coverage import CmdbSyncRun

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


@dataclass
class SyncResult:
    run_id: str
    apps_upserted: int
    apps_retired: int
    status: str


def _build_client(settings: Settings) -> CMDBClient:
    return CMDBClient(
        base_url=settings.CMDB_BASE_URL,
        api_token=settings.CMDB_API_TOKEN.get_secret_value(),
        use_mock=settings.PROBE_USE_MOCK,
    )


async def _upsert_app(db: AsyncSession, payload: CMDBAppPayload) -> None:
    now = datetime.now(timezone.utc)
    values = {
        "app_code": payload.app_code,
        "app_name": payload.app_name,
        "portfolio": payload.portfolio,
        "sub_portfolio": payload.sub_portfolio,
        "description": payload.description,
        "business_criticality": payload.business_criticality,
        "hosting_platform": payload.hosting_platform,
        "tech_stack": payload.tech_stack,
        "vp_name": payload.vp_name,
        "vp_email": payload.vp_email,
        "director_name": payload.director_name,
        "manager_name": payload.manager_name,
        "manager_email": payload.manager_email,
        "architect_name": payload.architect_name,
        "architect_email": payload.architect_email,
        "product_owner": payload.product_owner,
        "lob": payload.lob,
        "region": payload.region,
        "owner_name": payload.owner_name,
        "owner_email": payload.owner_email,
        "owner_team": payload.owner_team,
        "cost_center": payload.cost_center,
        "environments": payload.environments,
        "tags": payload.tags,
        "cmdb_id": payload.cmdb_id,
        "cmdb_sync_source": payload.cmdb_sync_source,
        "cmdb_last_synced_at": now,
        "retired": payload.retired,
    }
    stmt = pg_insert(ApplicationMetadata).values(**values)
    stmt = stmt.on_conflict_do_update(
        index_elements=["app_code"],
        set_={
            k: stmt.excluded[k]
            for k in values
            if k != "app_code"
        },
    )
    await db.execute(stmt)


async def run_cmdb_sync(
    db: AsyncSession, settings: Settings | None = None
) -> SyncResult:
    """Pull the full CMDB snapshot and upsert rows into application_metadata.

    Writes one row into ``cmdb_sync_runs`` for the audit trail.
    """
    settings = settings or get_settings()
    now = datetime.now(timezone.utc)

    run = CmdbSyncRun(
        job_id="cmdb_full_sync",
        started_at=now,
        status="running",
    )
    db.add(run)
    await db.flush()
    run_id = str(run.id)

    client = _build_client(settings)

    upserted = 0
    seen_codes: set[str] = set()
    try:
        async for payload in client.list_applications(page_size=settings.CMDB_SYNC_PAGE_SIZE):
            await _upsert_app(db, payload)
            upserted += 1
            seen_codes.add(payload.app_code)

        # Mark apps that fell out of the CMDB as retired (soft delete).
        all_codes = (
            await db.execute(select(ApplicationMetadata.app_code))
        ).all()
        retired_count = 0
        for (code,) in all_codes:
            if code not in seen_codes:
                await db.execute(
                    pg_insert(ApplicationMetadata)
                    .values(
                        app_code=code,
                        app_name="",
                        portfolio="",
                        retired=True,
                    )
                    .on_conflict_do_update(
                        index_elements=["app_code"],
                        set_={"retired": True, "cmdb_last_synced_at": now},
                    )
                )
                retired_count += 1

        run.finished_at = datetime.now(timezone.utc)
        run.status = "success"
        run.apps_upserted = upserted
        run.apps_retired = retired_count
        await db.flush()
        logger.info(
            "cmdb_sync_success",
            run_id=run_id,
            upserted=upserted,
            retired=retired_count,
        )
        return SyncResult(
            run_id=run_id,
            apps_upserted=upserted,
            apps_retired=retired_count,
            status="success",
        )

    except Exception as exc:  # noqa: BLE001
        run.finished_at = datetime.now(timezone.utc)
        run.status = "failed"
        run.error_message = str(exc)
        await db.flush()
        logger.exception("cmdb_sync_failed", run_id=run_id)
        return SyncResult(
            run_id=run_id,
            apps_upserted=upserted,
            apps_retired=0,
            status="failed",
        )
