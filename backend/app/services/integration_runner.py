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

_WORKITEM_TARGETS = {"jira", "confluence", "servicenow"}


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
        if target in _WORKITEM_TARGETS:
            return await _run_workitem(db, started, cfg, target)
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


async def _run_workitem(
    db: AsyncSession, started: datetime, cfg, target: str
) -> dict[str, Any]:
    """Preview what each work-item target would create from staged artifacts.

    Counts all rows in ``artifacts`` grouped by the artifact_type that
    this target is responsible for:
      * jira       → EPIC, STORY, TASK (grouped by type)
      * confluence → auto-generated runbooks (grouped by portfolio of
        the owning onboarding request)
      * servicenow → CR + CTASK (grouped by artifact type)
    """
    from app.models.artifact import Artifact, ArtifactType
    from app.models.onboarding import OnboardingRequest

    now = datetime.now(timezone.utc)
    source = "mock" if cfg.use_mock else "success"
    category_label = "Type"
    categories: list[dict[str, Any]] = []
    items_processed = 0
    items_onboarded = 0
    message = ""

    if target == "jira":
        jira_types = (ArtifactType.EPIC, ArtifactType.STORY, ArtifactType.TASK)
        rows = (
            await db.execute(
                select(
                    Artifact.artifact_type,
                    func.count().label("total"),
                    func.sum(
                        cast(Artifact.external_id.isnot(None), Integer)
                    ).label("pushed"),
                )
                .where(Artifact.artifact_type.in_(jira_types))
                .group_by(Artifact.artifact_type)
            )
        ).all()
        for atype, total, pushed in rows:
            total_i = int(total or 0)
            pushed_i = int(pushed or 0)
            pct = 100.0 * pushed_i / total_i if total_i else 0.0
            label = getattr(atype, "value", str(atype)).upper()
            categories.append(
                {
                    "label": label,
                    "total": total_i,
                    "onboarded": pushed_i,
                    "pct": round(pct, 1),
                }
            )
            items_processed += total_i
            items_onboarded += pushed_i
        message = (
            f"{items_processed} Jira artifacts staged, "
            f"{items_onboarded} already pushed to Jira"
        )

    elif target == "confluence":
        category_label = "Portfolio"
        rows = (
            await db.execute(
                select(
                    OnboardingRequest.portfolio,
                    func.count().label("total"),
                )
                .where(OnboardingRequest.portfolio.isnot(None))
                .group_by(OnboardingRequest.portfolio)
            )
        ).all()
        for portfolio, total in rows:
            total_i = int(total or 0)
            categories.append(
                {
                    "label": portfolio or "—",
                    "total": total_i,
                    "onboarded": total_i,
                    "pct": 100.0,
                }
            )
            items_processed += total_i
            items_onboarded += total_i
        message = (
            f"{items_processed} onboardings would publish runbooks to "
            f"{len(categories)} portfolio spaces"
        )

    elif target == "servicenow":
        snow_types = (ArtifactType.CR, ArtifactType.CTASK)
        rows = (
            await db.execute(
                select(
                    Artifact.artifact_type,
                    func.count().label("total"),
                    func.sum(
                        cast(Artifact.external_id.isnot(None), Integer)
                    ).label("pushed"),
                )
                .where(Artifact.artifact_type.in_(snow_types))
                .group_by(Artifact.artifact_type)
            )
        ).all()
        for atype, total, pushed in rows:
            total_i = int(total or 0)
            pushed_i = int(pushed or 0)
            pct = 100.0 * pushed_i / total_i if total_i else 0.0
            label = getattr(atype, "value", str(atype)).upper()
            categories.append(
                {
                    "label": label,
                    "total": total_i,
                    "onboarded": pushed_i,
                    "pct": round(pct, 1),
                }
            )
            items_processed += total_i
            items_onboarded += pushed_i
        message = (
            f"{items_processed} ServiceNow artifacts staged "
            f"({items_onboarded} already pushed)"
        )

    # If no staged artifacts exist, synthesize a few categories so the UI
    # has something to show for a fresh clone.
    if not categories:
        if target == "jira":
            categories = [
                {"label": "EPIC", "total": 0, "onboarded": 0, "pct": 0.0},
                {"label": "STORY", "total": 0, "onboarded": 0, "pct": 0.0},
                {"label": "TASK", "total": 0, "onboarded": 0, "pct": 0.0},
            ]
            message = "No Jira artifacts staged yet — submit an onboarding to generate them."
        elif target == "confluence":
            categories = [
                {"label": "Runbooks", "total": 0, "onboarded": 0, "pct": 0.0},
            ]
            message = "No onboardings yet — submit one to create runbook pages."
        elif target == "servicenow":
            categories = [
                {"label": "CR", "total": 0, "onboarded": 0, "pct": 0.0},
                {"label": "CTASK", "total": 0, "onboarded": 0, "pct": 0.0},
            ]
            message = "No ServiceNow artifacts staged yet."

    return {
        "target": target,
        "ok": True,
        "status": source,
        "message": message,
        "started_at": started,
        "finished_at": now,
        "items_processed": items_processed,
        "items_onboarded": items_onboarded,
        "category_label": category_label,
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
