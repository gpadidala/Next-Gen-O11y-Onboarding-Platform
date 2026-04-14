"""Coverage & Adoption endpoints — leadership rollups and app-level gaps."""

from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone

import structlog
from fastapi import APIRouter, Query, status
from sqlalchemy import and_, func, select

from app.api.deps import DbSession
from app.config import get_settings
from app.engine.coverage_engine import SIGNALS, compute_aggregates, rebuild_rollups
from app.models.application import ApplicationMetadata
from app.models.coverage import CoverageRollupSnapshot, LgtmAppCoverage
from app.models.onboarding import OnboardingRequest
from app.schemas.cmdb import CMDBAppRecord
from app.schemas.coverage import (
    AppCoverageDetail,
    CoverageGapsResponse,
    CoverageRefreshResponse,
    CoverageTrendPoint,
    LeadershipCoverageResponse,
    LgtmAppCoverageRecord,
    PortfolioCoverage,
    ScopeCoverage,
    SignalCoverage,
    VpCoverage,
)
from app.services.coverage.probes import run_all_probes

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(tags=["coverage"])


def _rollup_to_scope(
    row: CoverageRollupSnapshot, scope_type: str, scope_key: str
) -> ScopeCoverage:
    total = row.total_apps or 0
    per_signal = []
    signal_to_field = {
        "metrics": ("apps_onboarded_metrics", None, None),
        "logs": ("apps_onboarded_logs", None, None),
        "traces": ("apps_onboarded_traces", None, None),
        "profiles": ("apps_onboarded_profiles", None, None),
        "faro": ("apps_onboarded_faro", None, None),
        "synthetics": ("apps_onboarded_synthetics", None, None),
    }
    for sig, (attr, _v_name, _v_value) in signal_to_field.items():
        onboarded = getattr(row, attr) or 0
        pct = 100.0 * onboarded / total if total else 0.0
        per_signal.append(
            SignalCoverage(
                signal=sig,
                total_apps=total,
                onboarded=onboarded,
                coverage_pct=round(pct, 2),
            )
        )
    return ScopeCoverage(
        scope_type=scope_type,
        scope_key=scope_key,
        total_apps=total,
        apps_onboarded_any=row.apps_onboarded_any or 0,
        coverage_pct_any=round(row.coverage_pct_any or 0.0, 2),
        coverage_pct_full_stack=round(row.coverage_pct_full_stack or 0.0, 2),
        per_signal=per_signal,
    )


async def _latest_rollup_date(db) -> date | None:
    r = await db.execute(select(func.max(CoverageRollupSnapshot.snapshot_date)))
    return r.scalar_one_or_none()


async def _ensure_today_rollup(db) -> date:
    today = datetime.now(timezone.utc).date()
    existing = await db.execute(
        select(CoverageRollupSnapshot.id).where(
            CoverageRollupSnapshot.snapshot_date == today
        )
    )
    if existing.first() is None:
        await rebuild_rollups(db, get_settings(), snapshot_date=today)
    return today


@router.get(
    "/summary",
    response_model=LeadershipCoverageResponse,
    operation_id="getCoverageSummary",
    summary="Leadership coverage summary (global + portfolios + VPs)",
)
async def get_coverage_summary(db: DbSession) -> LeadershipCoverageResponse:
    snapshot_date = await _ensure_today_rollup(db)

    rows = (
        await db.execute(
            select(CoverageRollupSnapshot).where(
                CoverageRollupSnapshot.snapshot_date == snapshot_date
            )
        )
    ).scalars().all()

    global_row = next((r for r in rows if r.scope_type == "global"), None)
    global_scope = (
        _rollup_to_scope(global_row, "global", "__all__")
        if global_row
        else ScopeCoverage(scope_type="global", scope_key="__all__")
    )

    portfolio_rows = [r for r in rows if r.scope_type == "portfolio"]
    portfolios: list[PortfolioCoverage] = []
    # Need VP metadata for each portfolio.
    portfolio_vp_map: dict[str, tuple[str | None, str | None]] = {}
    meta_rows = (
        await db.execute(
            select(
                ApplicationMetadata.portfolio,
                ApplicationMetadata.vp_name,
                ApplicationMetadata.vp_email,
            )
            .where(ApplicationMetadata.retired.is_(False))
            .distinct()
        )
    ).all()
    for p, vp_name, vp_email in meta_rows:
        portfolio_vp_map.setdefault(p, (vp_name, vp_email))

    for r in portfolio_rows:
        scope = _rollup_to_scope(r, "portfolio", r.scope_key)
        vp_name, vp_email = portfolio_vp_map.get(r.scope_key, (None, None))
        portfolios.append(
            PortfolioCoverage(
                portfolio=r.scope_key,
                vp_name=vp_name,
                vp_email=vp_email,
                total_apps=scope.total_apps,
                onboarded=scope.apps_onboarded_any,
                gap=scope.total_apps - scope.apps_onboarded_any,
                coverage_pct_any=scope.coverage_pct_any,
                per_signal=scope.per_signal,
            )
        )
    portfolios.sort(key=lambda p: p.coverage_pct_any)

    vp_rows = [r for r in rows if r.scope_type == "vp"]
    vps: list[VpCoverage] = []
    # Map vp_email -> (vp_name, list of portfolios).
    vp_meta: dict[str, dict] = {}
    for p, vp_name, vp_email in meta_rows:
        if not vp_email:
            continue
        entry = vp_meta.setdefault(
            vp_email, {"vp_name": vp_name, "portfolios": set()}
        )
        entry["portfolios"].add(p)
    for r in vp_rows:
        scope = _rollup_to_scope(r, "vp", r.scope_key)
        meta = vp_meta.get(r.scope_key, {"vp_name": None, "portfolios": set()})
        vps.append(
            VpCoverage(
                vp_name=meta["vp_name"],
                vp_email=r.scope_key,
                portfolios=sorted(meta["portfolios"]),
                total_apps=scope.total_apps,
                onboarded=scope.apps_onboarded_any,
                coverage_pct_any=scope.coverage_pct_any,
                per_signal=scope.per_signal,
            )
        )
    vps.sort(key=lambda v: v.coverage_pct_any)

    return LeadershipCoverageResponse(
        snapshot_date=snapshot_date,
        global_scope=global_scope,
        portfolios=portfolios,
        vps=vps,
    )


@router.get(
    "/by-portfolio",
    response_model=list[PortfolioCoverage],
    operation_id="listPortfolioCoverage",
)
async def list_portfolio_coverage(db: DbSession) -> list[PortfolioCoverage]:
    summary = await get_coverage_summary(db)
    return summary.portfolios


@router.get(
    "/by-vp",
    response_model=list[VpCoverage],
    operation_id="listVpCoverage",
)
async def list_vp_coverage(db: DbSession) -> list[VpCoverage]:
    summary = await get_coverage_summary(db)
    return summary.vps


async def _rollup_by_scope(db, scope_type: str) -> list[ScopeCoverage]:
    snapshot_date = await _ensure_today_rollup(db)
    rows = (
        await db.execute(
            select(CoverageRollupSnapshot).where(
                and_(
                    CoverageRollupSnapshot.snapshot_date == snapshot_date,
                    CoverageRollupSnapshot.scope_type == scope_type,
                )
            )
        )
    ).scalars().all()
    scopes = [_rollup_to_scope(r, scope_type, r.scope_key) for r in rows]
    scopes.sort(key=lambda s: s.coverage_pct_any)
    return scopes


@router.get(
    "/by-manager",
    response_model=list[ScopeCoverage],
    operation_id="listManagerCoverage",
)
async def list_manager_coverage(db: DbSession) -> list[ScopeCoverage]:
    return await _rollup_by_scope(db, "manager")


@router.get(
    "/by-architect",
    response_model=list[ScopeCoverage],
    operation_id="listArchitectCoverage",
)
async def list_architect_coverage(db: DbSession) -> list[ScopeCoverage]:
    return await _rollup_by_scope(db, "architect")


@router.get(
    "/by-lob",
    response_model=list[ScopeCoverage],
    operation_id="listLobCoverage",
)
async def list_lob_coverage(db: DbSession) -> list[ScopeCoverage]:
    return await _rollup_by_scope(db, "lob")


@router.get(
    "/gaps",
    response_model=CoverageGapsResponse,
    operation_id="listCoverageGaps",
    summary="List apps with zero onboarded signals",
)
async def list_coverage_gaps(
    db: DbSession,
    portfolio: str | None = None,
    vp_email: str | None = None,
) -> CoverageGapsResponse:
    settings = get_settings()
    freshness = datetime.now(timezone.utc) - timedelta(
        hours=settings.COVERAGE_FRESHNESS_HOURS
    )

    onboarded_subq = (
        select(LgtmAppCoverage.app_code)
        .where(
            and_(
                LgtmAppCoverage.is_onboarded.is_(True),
                LgtmAppCoverage.last_sample_at.isnot(None),
                LgtmAppCoverage.last_sample_at >= freshness,
            )
        )
        .distinct()
        .subquery()
    )

    q = (
        select(ApplicationMetadata)
        .where(ApplicationMetadata.retired.is_(False))
        .where(ApplicationMetadata.app_code.not_in(select(onboarded_subq)))
    )
    if portfolio:
        q = q.where(ApplicationMetadata.portfolio == portfolio)
    if vp_email:
        q = q.where(ApplicationMetadata.vp_email == vp_email)

    rows = (await db.execute(q.order_by(ApplicationMetadata.portfolio, ApplicationMetadata.app_code))).scalars().all()
    return CoverageGapsResponse(
        items=[CMDBAppRecord.model_validate(r) for r in rows],
        total=len(rows),
    )


@router.get(
    "/app/{app_code}",
    response_model=AppCoverageDetail,
    operation_id="getAppCoverageDetail",
)
async def get_app_coverage_detail(app_code: str, db: DbSession) -> AppCoverageDetail:
    app = (
        await db.execute(
            select(ApplicationMetadata).where(ApplicationMetadata.app_code == app_code)
        )
    ).scalar_one_or_none()
    if app is None:
        from app.utils.exceptions import NotFoundError

        raise NotFoundError(detail=f"App {app_code!r} not found in CMDB.")

    coverage_rows = (
        await db.execute(
            select(LgtmAppCoverage).where(LgtmAppCoverage.app_code == app_code)
        )
    ).scalars().all()

    latest_onboarding = (
        await db.execute(
            select(OnboardingRequest.status)
            .where(OnboardingRequest.app_code == app_code)
            .order_by(OnboardingRequest.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()
    onboarding_status = (
        latest_onboarding.value
        if latest_onboarding is not None and hasattr(latest_onboarding, "value")
        else (str(latest_onboarding) if latest_onboarding else None)
    )

    return AppCoverageDetail(
        app_code=app.app_code,
        app_name=app.app_name,
        portfolio=app.portfolio,
        vp_name=app.vp_name,
        manager_name=app.manager_name,
        architect_name=app.architect_name,
        per_signal=[LgtmAppCoverageRecord.model_validate(r) for r in coverage_rows],
        onboarding_status=onboarding_status,
    )


@router.post(
    "/refresh",
    response_model=CoverageRefreshResponse,
    status_code=status.HTTP_202_ACCEPTED,
    operation_id="refreshCoverage",
    summary="Force re-run of all coverage probes and rebuild rollups",
)
async def refresh_coverage(db: DbSession) -> CoverageRefreshResponse:
    settings = get_settings()
    probe_results = await run_all_probes(db, settings)
    rows_written = await rebuild_rollups(db, settings)
    total_onboarded = sum(r.apps_onboarded for r in probe_results)
    return CoverageRefreshResponse(
        run_id=uuid.uuid4(),
        status="success",
        message=(
            f"{len(probe_results)} probes ran, "
            f"{total_onboarded} per-signal onboardings observed, "
            f"{rows_written} rollup rows written."
        ),
    )


@router.get(
    "/trends",
    response_model=list[CoverageTrendPoint],
    operation_id="getCoverageTrends",
    summary="Last 90 days of global coverage %",
)
async def get_coverage_trends(
    db: DbSession, days: int = Query(default=90, ge=1, le=365)
) -> list[CoverageTrendPoint]:
    cutoff = datetime.now(timezone.utc).date() - timedelta(days=days)
    rows = (
        await db.execute(
            select(CoverageRollupSnapshot)
            .where(
                and_(
                    CoverageRollupSnapshot.scope_type == "global",
                    CoverageRollupSnapshot.snapshot_date >= cutoff,
                )
            )
            .order_by(CoverageRollupSnapshot.snapshot_date)
        )
    ).scalars().all()
    return [
        CoverageTrendPoint(
            snapshot_date=r.snapshot_date,
            coverage_pct_any=round(r.coverage_pct_any or 0.0, 2),
            coverage_pct_full_stack=round(r.coverage_pct_full_stack or 0.0, 2),
        )
        for r in rows
    ]
