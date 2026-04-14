"""Runner for `POST /api/v1/integrations/{target}/run`.

Dispatches to the right probe / sync service for each target and
returns a structured ``IntegrationRunResult`` with per-category
breakdown so the UI can render the pulled data inline.

Categories are per-portfolio for the data-plane targets (CMDB and the
6 coverage probes) and per-activity-bucket for Grafana RBAC. The
category label is conveyed on the response so the frontend renders
correct headings.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import structlog
from sqlalchemy import Integer, cast, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models.application import ApplicationMetadata
from app.models.coverage import (
    CmdbSyncRun,
    GrafanaRbacUsage,
    LgtmAppCoverage,
    SyntheticUrl,
)
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
from app.services.integration_service import resolve_integration

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

# Each coverage target also corresponds to a signal name in lgtm_app_coverage.
_TARGET_TO_SIGNAL: dict[str, str] = {
    "mimir": "metrics",
    "loki": "logs",
    "tempo": "traces",
    "pyroscope": "profiles",
    "faro": "faro",
    "blackbox": "synthetics",
}

_COVERAGE_PROBES = {
    "mimir": mimir_probe,
    "loki": loki_probe,
    "tempo": tempo_probe,
    "pyroscope": pyroscope_probe,
    "faro": faro_probe,
    "blackbox": blackbox_probe,
}


async def run_integration(
    db: AsyncSession, target: str
) -> dict[str, Any]:
    """Entry point — runs the probe/sync and returns a structured result."""
    started = datetime.now(timezone.utc)
    settings = get_settings()

    # Honour is_enabled — if the card is disabled, short-circuit.
    cfg = await resolve_integration(db, target)
    if not cfg.is_enabled:
        return _empty_result(
            target=target,
            started=started,
            status="failed",
            ok=False,
            message=f"Integration {target!r} is disabled. Enable it and try again.",
        )

    try:
        if target == "cmdb":
            return await _run_cmdb(db, started, cfg)
        if target == "grafana":
            return await _run_grafana(db, started, cfg)
        if target in _COVERAGE_PROBES:
            return await _run_coverage(db, started, cfg, target)
    except Exception as exc:  # noqa: BLE001
        logger.exception("integration_run_failed", target=target)
        return _empty_result(
            target=target,
            started=started,
            status="failed",
            ok=False,
            message=f"{type(exc).__name__}: {exc}",
        )

    return _empty_result(
        target=target,
        started=started,
        status="failed",
        ok=False,
        message=f"Unknown run target {target!r}",
    )


def _empty_result(
    *,
    target: str,
    started: datetime,
    status: str,
    ok: bool,
    message: str,
) -> dict[str, Any]:
    return {
        "target": target,
        "ok": ok,
        "status": status,
        "message": message,
        "started_at": started,
        "finished_at": datetime.now(timezone.utc),
        "items_processed": 0,
        "items_onboarded": 0,
        "category_label": "Portfolio",
        "categories": [],
    }


async def _run_cmdb(
    db: AsyncSession, started: datetime, cfg
) -> dict[str, Any]:
    result = await run_cmdb_sync(db)
    # Build per-portfolio breakdown from the catalog we just upserted.
    rows = (
        await db.execute(
            select(
                ApplicationMetadata.portfolio,
                func.count().label("total"),
            )
            .where(ApplicationMetadata.retired.is_(False))
            .group_by(ApplicationMetadata.portfolio)
            .order_by(ApplicationMetadata.portfolio)
        )
    ).all()
    categories = [
        {
            "label": (p or "—"),
            "total": int(total),
            "onboarded": int(total),  # for CMDB every row is "loaded"
            "pct": 100.0,
        }
        for p, total in rows
    ]
    total_apps = sum(c["total"] for c in categories)
    status = "mock" if cfg.use_mock else ("success" if result.status == "success" else "failed")
    return {
        "target": "cmdb",
        "ok": result.status == "success",
        "status": status,
        "message": (
            f"CMDB sync {result.status}: {result.apps_upserted} upserted, "
            f"{result.apps_retired} retired"
        ),
        "started_at": started,
        "finished_at": datetime.now(timezone.utc),
        "items_processed": total_apps,
        "items_onboarded": total_apps,
        "category_label": "Portfolio",
        "categories": categories,
    }


async def _run_coverage(
    db: AsyncSession, started: datetime, cfg, target: str
) -> dict[str, Any]:
    probe_fn = _COVERAGE_PROBES[target]
    settings = get_settings()
    probe_result = await probe_fn(db, settings)

    # Build per-portfolio breakdown from lgtm_app_coverage joined to CMDB.
    signal = _TARGET_TO_SIGNAL[target]
    rows = (
        await db.execute(
            select(
                ApplicationMetadata.portfolio,
                func.count().label("total"),
                func.sum(
                    cast(LgtmAppCoverage.is_onboarded, Integer)
                ).label("onboarded"),
            )
            .join(
                LgtmAppCoverage,
                (LgtmAppCoverage.app_code == ApplicationMetadata.app_code)
                & (LgtmAppCoverage.signal == signal),
                isouter=True,
            )
            .where(ApplicationMetadata.retired.is_(False))
            .group_by(ApplicationMetadata.portfolio)
            .order_by(ApplicationMetadata.portfolio)
        )
    ).all()
    categories = []
    for portfolio, total, onboarded in rows:
        total_i = int(total or 0)
        onboarded_i = int(onboarded or 0)
        pct = 100.0 * onboarded_i / total_i if total_i else 0.0
        categories.append(
            {
                "label": portfolio or "—",
                "total": total_i,
                "onboarded": onboarded_i,
                "pct": round(pct, 1),
            }
        )

    status = "mock" if cfg.use_mock else "success"
    return {
        "target": target,
        "ok": True,
        "status": status,
        "message": (
            f"{probe_result.apps_onboarded} of {probe_result.apps_total} apps "
            f"reporting {signal} via {probe_result.source}"
        ),
        "started_at": started,
        "finished_at": datetime.now(timezone.utc),
        "items_processed": probe_result.apps_total,
        "items_onboarded": probe_result.apps_onboarded,
        "category_label": "Portfolio",
        "categories": categories,
    }


async def _run_grafana(
    db: AsyncSession, started: datetime, cfg
) -> dict[str, Any]:
    settings = get_settings()
    probe_result = await grafana_rbac_probe(db, settings)

    # Per-portfolio breakdown of mapped teams.
    rows = (
        await db.execute(
            select(
                GrafanaRbacUsage.mapped_portfolio,
                func.count().label("total"),
                func.sum(
                    cast(GrafanaRbacUsage.active_users_30d > 0, Integer)
                ).label("active"),
            )
            .group_by(GrafanaRbacUsage.mapped_portfolio)
            .order_by(GrafanaRbacUsage.mapped_portfolio)
        )
    ).all()
    categories = []
    for portfolio, total, active in rows:
        total_i = int(total or 0)
        active_i = int(active or 0)
        pct = 100.0 * active_i / total_i if total_i else 0.0
        categories.append(
            {
                "label": portfolio or "Unmapped",
                "total": total_i,
                "onboarded": active_i,
                "pct": round(pct, 1),
            }
        )

    status = "mock" if cfg.use_mock else "success"
    return {
        "target": "grafana",
        "ok": True,
        "status": status,
        "message": (
            f"{probe_result.teams_upserted} teams upserted, "
            f"{probe_result.active_teams_30d} active in last 30 days"
        ),
        "started_at": started,
        "finished_at": datetime.now(timezone.utc),
        "items_processed": probe_result.teams_upserted,
        "items_onboarded": probe_result.active_teams_30d,
        "category_label": "Portfolio",
        "categories": categories,
    }
