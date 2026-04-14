"""V1 API router aggregator.

Collects all sub-routers and mounts them under their respective prefixes.
This module is imported by :mod:`app.main` and included under ``/api/v1``.
"""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import (
    artifacts,
    capacity,
    cmdb,
    coverage,
    governance,
    grafana_usage,
    health,
    integrations,
    lookup,
    onboarding,
    portfolios,
    similarity,
    synthetics,
)

router = APIRouter()

router.include_router(health.router)
router.include_router(onboarding.router, prefix="/onboardings")
router.include_router(capacity.router, prefix="/capacity")
router.include_router(similarity.router, prefix="/similarity")
router.include_router(artifacts.router, prefix="/artifacts")
router.include_router(governance.router, prefix="/governance")
router.include_router(lookup.router, prefix="/lookup")
# v2 Coverage & Adoption
router.include_router(cmdb.router, prefix="/cmdb")
router.include_router(coverage.router, prefix="/coverage")
router.include_router(grafana_usage.router, prefix="/grafana-usage")
router.include_router(synthetics.router, prefix="/synthetics")
router.include_router(integrations.router, prefix="/integrations")
router.include_router(portfolios.router, prefix="/portfolios")
