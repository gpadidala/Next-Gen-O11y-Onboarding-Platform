"""Portfolio endpoints.

Serves the Retail Portfolios view by joining ``application_metadata``
against ``lgtm_app_coverage`` at request time. Every app is projected
into a 6-pillar shape (M/L/T/P/R/E) where each pillar is 100 (signal
actively ingesting) or 0 (not onboarded), so the existing React UI
renders unchanged against live CMDB-backed data.
"""

from __future__ import annotations

from typing import Any

import structlog
from fastapi import APIRouter
from sqlalchemy import select

from app.api.deps import DbSession
from app.models.application import ApplicationMetadata
from app.models.coverage import LgtmAppCoverage
from app.utils.exceptions import NotFoundError

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(tags=["portfolios"])


# Static per-portfolio cosmetic mapping. Keys are lower-cased portfolio
# names from the CMDB. Unknown portfolios fall back to ``_DEFAULT``.
_PORTFOLIO_COSMETICS: dict[str, dict[str, str]] = {
    "digital banking": {
        "icon": "🏦",
        "accent": "#6366f1",
        "short": "Digital",
        "description": (
            "Customer-facing digital banking surfaces — mobile app, web "
            "portal, account dashboards, and transfers."
        ),
    },
    "payments rails": {
        "icon": "💳",
        "accent": "#059669",
        "short": "Payments",
        "description": (
            "End-to-end payments infrastructure — card rails, wire "
            "transfers, ACH, fraud scoring."
        ),
    },
    "wealth platform": {
        "icon": "📈",
        "accent": "#D97706",
        "short": "Wealth",
        "description": (
            "Wealth management — brokerage, portfolio analytics, "
            "advisor workbench, tax lots."
        ),
    },
}
_DEFAULT_COSMETICS = {
    "icon": "📦",
    "accent": "#64748b",
    "short": "—",
    "description": "Portfolio from CMDB sync.",
}


def _slugify(name: str) -> str:
    return "".join(c if c.isalnum() else "-" for c in name.lower()).strip("-")


def _tier_from_criticality(crit: str | None) -> int:
    mapping = {"tier_1": 1, "tier_2": 2, "tier_3": 3, "tier_4": 3}
    return mapping.get((crit or "").lower(), 3)


# Map LGTM signals → pillar keys used by the React UI.
# M=Metrics, L=Logs, T=Traces, P=Profiles, R=RUM (Faro), E=Events (Synthetics).
_SIGNAL_TO_PILLAR: dict[str, str] = {
    "metrics": "M",
    "logs": "L",
    "traces": "T",
    "profiles": "P",
    "faro": "R",
    "synthetics": "E",
}


async def _build_pillar_map(
    db, app_codes: list[str]
) -> dict[str, dict[str, int]]:
    """For a given set of app_codes, return ``{app_code: {M,L,T,P,R,E}}``."""
    if not app_codes:
        return {}
    rows = (
        await db.execute(
            select(
                LgtmAppCoverage.app_code,
                LgtmAppCoverage.signal,
                LgtmAppCoverage.is_onboarded,
            ).where(LgtmAppCoverage.app_code.in_(app_codes))
        )
    ).all()
    out: dict[str, dict[str, int]] = {}
    for code, signal, onboarded in rows:
        pillar = _SIGNAL_TO_PILLAR.get(signal)
        if not pillar:
            continue
        bucket = out.setdefault(code, {k: 0 for k in ("M", "L", "T", "P", "R", "E")})
        bucket[pillar] = 100 if onboarded else 0
    # Backfill any apps with no coverage rows at all → zeros.
    for code in app_codes:
        out.setdefault(code, {k: 0 for k in ("M", "L", "T", "P", "R", "E")})
    return out


def _app_to_view(app: ApplicationMetadata, pillars: dict[str, int]) -> dict[str, Any]:
    return {
        "id": app.app_code,
        "name": app.app_name,
        "team": app.owner_team or app.manager_name or "—",
        "tech": app.tech_stack or "—",
        "tier": _tier_from_criticality(app.business_criticality),
        "pillars": pillars,
    }


@router.get(
    "/",
    operation_id="listPortfoliosView",
    summary="CMDB-backed Retail Portfolios view",
)
async def list_portfolios_view(db: DbSession) -> list[dict[str, Any]]:
    rows = (
        await db.execute(
            select(ApplicationMetadata)
            .where(ApplicationMetadata.retired.is_(False))
            .order_by(ApplicationMetadata.portfolio, ApplicationMetadata.app_code)
        )
    ).scalars().all()

    app_codes = [r.app_code for r in rows]
    pillar_map = await _build_pillar_map(db, app_codes)

    # Group by portfolio.
    grouped: dict[str, list[ApplicationMetadata]] = {}
    for app in rows:
        grouped.setdefault(app.portfolio, []).append(app)

    result = []
    for portfolio_name in sorted(grouped):
        apps = grouped[portfolio_name]
        cosmetics = _PORTFOLIO_COSMETICS.get(
            portfolio_name.lower(), _DEFAULT_COSMETICS
        )
        owner = apps[0].vp_name or apps[0].director_name or "—"
        result.append(
            {
                "id": _slugify(portfolio_name),
                "name": portfolio_name,
                "shortName": cosmetics["short"],
                "description": cosmetics["description"],
                "icon": cosmetics["icon"],
                "accent": cosmetics["accent"],
                "owner": owner,
                "apps": [_app_to_view(a, pillar_map[a.app_code]) for a in apps],
            }
        )
    return result


@router.get(
    "/{portfolio_id}",
    operation_id="getPortfolioView",
    summary="Single portfolio with apps + pillar coverage",
)
async def get_portfolio_view(
    portfolio_id: str, db: DbSession
) -> dict[str, Any]:
    # Fetch all and match slugs so we don't have to store the slug.
    all_portfolios = await list_portfolios_view(db)
    match = next((p for p in all_portfolios if p["id"] == portfolio_id), None)
    if match is None:
        raise NotFoundError(detail=f"Portfolio {portfolio_id!r} not found.")
    return match
