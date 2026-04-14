"""Coverage engine — reconciles CMDB against LGTM ingestion (deterministic joins).

No LLMs. Pure SQL-backed aggregation and rollup.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone

import structlog
from sqlalchemy import and_, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import Settings
from app.models.application import ApplicationMetadata
from app.models.coverage import CoverageRollupSnapshot, LgtmAppCoverage

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

SIGNALS: list[str] = ["metrics", "logs", "traces", "profiles", "faro", "synthetics"]
FULL_STACK_SIGNALS: set[str] = {"metrics", "logs", "traces"}


@dataclass
class RollupAggregates:
    total_apps: int
    onboarded_any: int
    onboarded_per_signal: dict[str, int]
    onboarded_full_stack: int


def _freshness_threshold(settings: Settings) -> datetime:
    hours = settings.COVERAGE_FRESHNESS_HOURS
    return datetime.now(timezone.utc) - timedelta(hours=hours)


async def _fresh_coverage_subquery(settings: Settings):
    """Return a base select over fresh, onboarded coverage rows."""
    threshold = _freshness_threshold(settings)
    return select(LgtmAppCoverage.app_code, LgtmAppCoverage.signal).where(
        and_(
            LgtmAppCoverage.is_onboarded.is_(True),
            LgtmAppCoverage.last_sample_at.isnot(None),
            LgtmAppCoverage.last_sample_at >= threshold,
        )
    )


async def compute_aggregates(
    db: AsyncSession,
    settings: Settings,
    *,
    portfolio: str | None = None,
    vp_email: str | None = None,
    manager_email: str | None = None,
    architect_email: str | None = None,
    lob: str | None = None,
) -> RollupAggregates:
    """Compute (total_apps, onboarded_any, per_signal, full_stack) for a scope filter."""
    app_query = select(ApplicationMetadata.app_code).where(
        ApplicationMetadata.retired.is_(False)
    )
    if portfolio is not None:
        app_query = app_query.where(ApplicationMetadata.portfolio == portfolio)
    if vp_email is not None:
        app_query = app_query.where(ApplicationMetadata.vp_email == vp_email)
    if manager_email is not None:
        app_query = app_query.where(
            ApplicationMetadata.manager_email == manager_email
        )
    if architect_email is not None:
        app_query = app_query.where(
            ApplicationMetadata.architect_email == architect_email
        )
    if lob is not None:
        app_query = app_query.where(ApplicationMetadata.lob == lob)

    result = await db.execute(app_query)
    app_codes = [row[0] for row in result.all()]
    total = len(app_codes)
    if total == 0:
        return RollupAggregates(
            total_apps=0,
            onboarded_any=0,
            onboarded_per_signal={s: 0 for s in SIGNALS},
            onboarded_full_stack=0,
        )

    threshold = _freshness_threshold(settings)
    coverage_q = select(
        LgtmAppCoverage.app_code, LgtmAppCoverage.signal
    ).where(
        and_(
            LgtmAppCoverage.app_code.in_(app_codes),
            LgtmAppCoverage.is_onboarded.is_(True),
            LgtmAppCoverage.last_sample_at.isnot(None),
            LgtmAppCoverage.last_sample_at >= threshold,
        )
    )
    coverage_rows = (await db.execute(coverage_q)).all()

    per_app_signals: dict[str, set[str]] = {}
    for code, signal in coverage_rows:
        per_app_signals.setdefault(code, set()).add(signal)

    per_signal_counts: dict[str, int] = {s: 0 for s in SIGNALS}
    onboarded_any = 0
    full_stack = 0
    for code, signals in per_app_signals.items():
        if not signals:
            continue
        onboarded_any += 1
        for s in signals:
            if s in per_signal_counts:
                per_signal_counts[s] += 1
        if FULL_STACK_SIGNALS.issubset(signals):
            full_stack += 1

    return RollupAggregates(
        total_apps=total,
        onboarded_any=onboarded_any,
        onboarded_per_signal=per_signal_counts,
        onboarded_full_stack=full_stack,
    )


async def _upsert_rollup_row(
    db: AsyncSession,
    *,
    snapshot_date: date,
    scope_type: str,
    scope_key: str,
    agg: RollupAggregates,
) -> None:
    coverage_any = (
        100.0 * agg.onboarded_any / agg.total_apps if agg.total_apps else 0.0
    )
    coverage_fs = (
        100.0 * agg.onboarded_full_stack / agg.total_apps
        if agg.total_apps
        else 0.0
    )
    values = {
        "snapshot_date": snapshot_date,
        "scope_type": scope_type,
        "scope_key": scope_key,
        "total_apps": agg.total_apps,
        "apps_onboarded_any": agg.onboarded_any,
        "apps_onboarded_metrics": agg.onboarded_per_signal["metrics"],
        "apps_onboarded_logs": agg.onboarded_per_signal["logs"],
        "apps_onboarded_traces": agg.onboarded_per_signal["traces"],
        "apps_onboarded_profiles": agg.onboarded_per_signal["profiles"],
        "apps_onboarded_faro": agg.onboarded_per_signal["faro"],
        "apps_onboarded_synthetics": agg.onboarded_per_signal["synthetics"],
        "coverage_pct_any": coverage_any,
        "coverage_pct_full_stack": coverage_fs,
    }
    stmt = pg_insert(CoverageRollupSnapshot).values(**values)
    stmt = stmt.on_conflict_do_update(
        index_elements=["snapshot_date", "scope_type", "scope_key"],
        set_={
            k: stmt.excluded[k]
            for k in values
            if k not in ("snapshot_date", "scope_type", "scope_key")
        },
    )
    await db.execute(stmt)


async def rebuild_rollups(
    db: AsyncSession, settings: Settings, *, snapshot_date: date | None = None
) -> int:
    """Rebuild coverage_rollup_snapshots for today across all scopes.

    Returns the number of rollup rows written.
    """
    snapshot_date = snapshot_date or datetime.now(timezone.utc).date()
    count = 0

    # Global.
    global_agg = await compute_aggregates(db, settings)
    await _upsert_rollup_row(
        db,
        snapshot_date=snapshot_date,
        scope_type="global",
        scope_key="__all__",
        agg=global_agg,
    )
    count += 1

    # Per portfolio.
    portfolios = (
        await db.execute(
            select(ApplicationMetadata.portfolio)
            .where(ApplicationMetadata.retired.is_(False))
            .distinct()
        )
    ).all()
    for (portfolio,) in portfolios:
        if not portfolio:
            continue
        agg = await compute_aggregates(db, settings, portfolio=portfolio)
        await _upsert_rollup_row(
            db,
            snapshot_date=snapshot_date,
            scope_type="portfolio",
            scope_key=portfolio,
            agg=agg,
        )
        count += 1

    # Per VP.
    vps = (
        await db.execute(
            select(ApplicationMetadata.vp_email)
            .where(
                and_(
                    ApplicationMetadata.retired.is_(False),
                    ApplicationMetadata.vp_email.isnot(None),
                )
            )
            .distinct()
        )
    ).all()
    for (vp_email,) in vps:
        if not vp_email:
            continue
        agg = await compute_aggregates(db, settings, vp_email=vp_email)
        await _upsert_rollup_row(
            db,
            snapshot_date=snapshot_date,
            scope_type="vp",
            scope_key=vp_email,
            agg=agg,
        )
        count += 1

    # Per manager.
    managers = (
        await db.execute(
            select(ApplicationMetadata.manager_email)
            .where(
                and_(
                    ApplicationMetadata.retired.is_(False),
                    ApplicationMetadata.manager_email.isnot(None),
                )
            )
            .distinct()
        )
    ).all()
    for (m_email,) in managers:
        if not m_email:
            continue
        agg = await compute_aggregates(db, settings, manager_email=m_email)
        await _upsert_rollup_row(
            db,
            snapshot_date=snapshot_date,
            scope_type="manager",
            scope_key=m_email,
            agg=agg,
        )
        count += 1

    # Per architect.
    architects = (
        await db.execute(
            select(ApplicationMetadata.architect_email)
            .where(
                and_(
                    ApplicationMetadata.retired.is_(False),
                    ApplicationMetadata.architect_email.isnot(None),
                )
            )
            .distinct()
        )
    ).all()
    for (a_email,) in architects:
        if not a_email:
            continue
        agg = await compute_aggregates(db, settings, architect_email=a_email)
        await _upsert_rollup_row(
            db,
            snapshot_date=snapshot_date,
            scope_type="architect",
            scope_key=a_email,
            agg=agg,
        )
        count += 1

    # Per LOB.
    lobs = (
        await db.execute(
            select(ApplicationMetadata.lob)
            .where(
                and_(
                    ApplicationMetadata.retired.is_(False),
                    ApplicationMetadata.lob.isnot(None),
                )
            )
            .distinct()
        )
    ).all()
    for (lob_val,) in lobs:
        if not lob_val:
            continue
        agg = await compute_aggregates(db, settings, lob=lob_val)
        await _upsert_rollup_row(
            db,
            snapshot_date=snapshot_date,
            scope_type="lob",
            scope_key=lob_val,
            agg=agg,
        )
        count += 1

    logger.info("coverage_rollups_rebuilt", rows=count, snapshot_date=str(snapshot_date))
    return count
