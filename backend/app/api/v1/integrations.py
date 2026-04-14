"""Integration admin endpoints.

- ``GET /integrations`` — list all configured targets (tokens masked).
- ``GET /integrations/{target}`` — fetch one.
- ``PUT /integrations/{target}`` — partial update (base_url, token, mock, etc.).
- ``POST /integrations/{target}/test`` — probe the target and record result.
- ``POST /integrations/seed`` — re-seed missing defaults (idempotent).
"""

from __future__ import annotations

import structlog
from fastapi import APIRouter, status
from sqlalchemy import select

from app.api.deps import DbSession
from app.models.integration import IntegrationConfig
from app.schemas.integration import (
    INTEGRATION_TARGETS,
    IntegrationConfigRead,
    IntegrationConfigUpdate,
    IntegrationRunResult,
    IntegrationTestResult,
)
from app.services.integration_runner import run_integration
from app.services.integration_service import (
    seed_defaults_if_empty,
    test_integration,
    update_integration,
)
from app.utils.exceptions import NotFoundError

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)

router = APIRouter(tags=["integrations"])


@router.get(
    "/",
    response_model=list[IntegrationConfigRead],
    operation_id="listIntegrations",
    summary="List all integration targets",
)
async def list_integrations(db: DbSession) -> list[IntegrationConfigRead]:
    rows = (
        await db.execute(select(IntegrationConfig).order_by(IntegrationConfig.target))
    ).scalars().all()
    return [IntegrationConfigRead.from_orm_row(r) for r in rows]


@router.get(
    "/{target}",
    response_model=IntegrationConfigRead,
    operation_id="getIntegration",
)
async def get_integration(target: str, db: DbSession) -> IntegrationConfigRead:
    row = (
        await db.execute(
            select(IntegrationConfig).where(IntegrationConfig.target == target)
        )
    ).scalar_one_or_none()
    if row is None:
        raise NotFoundError(detail=f"Integration {target!r} not found.")
    return IntegrationConfigRead.from_orm_row(row)


@router.put(
    "/{target}",
    response_model=IntegrationConfigRead,
    operation_id="updateIntegration",
    summary="Update an integration's base URL / token / mock flag",
)
async def update_integration_endpoint(
    target: str, payload: IntegrationConfigUpdate, db: DbSession
) -> IntegrationConfigRead:
    if target not in INTEGRATION_TARGETS:
        raise NotFoundError(detail=f"Unknown target {target!r}.")
    try:
        row = await update_integration(
            db, target, payload=payload.model_dump(exclude_unset=True)
        )
    except LookupError as exc:
        raise NotFoundError(detail=str(exc)) from exc
    return IntegrationConfigRead.from_orm_row(row)


@router.post(
    "/{target}/test",
    response_model=IntegrationTestResult,
    status_code=status.HTTP_200_OK,
    operation_id="testIntegration",
    summary="Run a connectivity test against a target",
)
async def test_integration_endpoint(
    target: str, db: DbSession
) -> IntegrationTestResult:
    try:
        result = await test_integration(db, target)
    except LookupError as exc:
        raise NotFoundError(detail=str(exc)) from exc
    return IntegrationTestResult(**result)


@router.post(
    "/{target}/run",
    response_model=IntegrationRunResult,
    status_code=status.HTTP_200_OK,
    operation_id="runIntegration",
    summary="Run the probe/sync for this target and return a categorized result",
)
async def run_integration_endpoint(
    target: str, db: DbSession
) -> IntegrationRunResult:
    if target not in INTEGRATION_TARGETS:
        raise NotFoundError(detail=f"Unknown target {target!r}.")
    result = await run_integration(db, target)
    return IntegrationRunResult(**result)


@router.post(
    "/seed",
    operation_id="seedIntegrationDefaults",
    summary="Seed any missing default integration rows (idempotent)",
)
async def seed_integrations(db: DbSession) -> dict:
    inserted = await seed_defaults_if_empty(db)
    return {"inserted": inserted}
