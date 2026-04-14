"""APScheduler wiring for CMDB / Coverage / Grafana RBAC pulls.

Started from FastAPI lifespan in ``app.main``. Each job opens a fresh
AsyncSession from the shared session factory, runs its work, commits,
and closes. Jobs never share sessions across invocations.
"""

from __future__ import annotations

from typing import Awaitable, Callable

import structlog
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from app.api import deps as db_deps
from app.config import get_settings
from app.engine.coverage_engine import rebuild_rollups
from app.services.cmdb_sync_service import run_cmdb_sync
from app.services.coverage.grafana_rbac_probe import grafana_rbac_probe
from app.services.coverage.probes import (
    blackbox_probe,
    faro_probe,
    loki_probe,
    mimir_probe,
    pyroscope_probe,
    tempo_probe,
)

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

_scheduler: AsyncIOScheduler | None = None


async def _run_with_db(
    job_id: str, fn: Callable[..., Awaitable], *args, **kwargs
) -> None:
    """Open a fresh DB session, run the job, commit, log result."""
    if db_deps._async_session_factory is None:
        logger.warning("scheduler_db_not_ready", job_id=job_id)
        return
    log = logger.bind(job_id=job_id)
    log.info("job_started")
    session = db_deps._async_session_factory()
    try:
        result = await fn(session, *args, **kwargs)
        await session.commit()
        log.info("job_finished", result=str(result))
    except Exception:
        await session.rollback()
        log.exception("job_failed")
    finally:
        await session.close()


# ── Job entry-points (thin wrappers that capture settings) ──────────────


async def _job_cmdb_full_sync() -> None:
    settings = get_settings()
    await _run_with_db("cmdb_full_sync", run_cmdb_sync, settings)


async def _job_coverage_metrics() -> None:
    settings = get_settings()
    await _run_with_db("coverage_metrics_pull", mimir_probe, settings)


async def _job_coverage_logs() -> None:
    settings = get_settings()
    await _run_with_db("coverage_logs_pull", loki_probe, settings)


async def _job_coverage_traces() -> None:
    settings = get_settings()
    await _run_with_db("coverage_traces_pull", tempo_probe, settings)


async def _job_coverage_profiles() -> None:
    settings = get_settings()
    await _run_with_db("coverage_profiles_pull", pyroscope_probe, settings)


async def _job_coverage_faro() -> None:
    settings = get_settings()
    await _run_with_db("coverage_faro_pull", faro_probe, settings)


async def _job_coverage_synthetics() -> None:
    settings = get_settings()
    await _run_with_db("coverage_synthetics_pull", blackbox_probe, settings)


async def _job_grafana_rbac() -> None:
    settings = get_settings()
    await _run_with_db("grafana_rbac_pull", grafana_rbac_probe, settings)


async def _job_coverage_rollup() -> None:
    settings = get_settings()
    await _run_with_db("coverage_rollup_build", rebuild_rollups, settings)


# ── Lifecycle ────────────────────────────────────────────────────────────


def start_scheduler() -> AsyncIOScheduler:
    global _scheduler  # noqa: PLW0603
    if _scheduler is not None:
        return _scheduler

    settings = get_settings()
    scheduler = AsyncIOScheduler(timezone="UTC")

    jobs = [
        ("cmdb_full_sync", _job_cmdb_full_sync, CronTrigger(hour="*/6")),
        (
            "coverage_metrics_pull",
            _job_coverage_metrics,
            CronTrigger(minute="*/15"),
        ),
        (
            "coverage_logs_pull",
            _job_coverage_logs,
            CronTrigger(minute="*/15"),
        ),
        (
            "coverage_traces_pull",
            _job_coverage_traces,
            CronTrigger(minute="*/15"),
        ),
        (
            "coverage_profiles_pull",
            _job_coverage_profiles,
            CronTrigger(minute="*/30"),
        ),
        (
            "coverage_faro_pull",
            _job_coverage_faro,
            CronTrigger(minute=0),
        ),
        (
            "coverage_synthetics_pull",
            _job_coverage_synthetics,
            CronTrigger(hour="*/2"),
        ),
        (
            "grafana_rbac_pull",
            _job_grafana_rbac,
            CronTrigger(minute=0),
        ),
        (
            "coverage_rollup_build",
            _job_coverage_rollup,
            CronTrigger(hour=2, minute=30),
        ),
    ]

    for job_id, fn, trigger in jobs:
        scheduler.add_job(
            fn,
            trigger=trigger,
            id=job_id,
            name=job_id,
            replace_existing=True,
            max_instances=1,
            misfire_grace_time=300,
        )

    scheduler.start()
    _scheduler = scheduler
    logger.info("scheduler_started", job_count=len(jobs))
    return scheduler


def shutdown_scheduler() -> None:
    global _scheduler  # noqa: PLW0603
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("scheduler_stopped")
