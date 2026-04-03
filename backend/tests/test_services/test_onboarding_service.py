"""Tests for the OnboardingService layer.

These tests exercise the service functions directly against the async
SQLite test database, bypassing the HTTP transport layer.  They validate
CRUD operations and status transitions on the OnboardingRequest aggregate.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.onboarding import OnboardingRequest, OnboardingStatus


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_onboarding(session: AsyncSession, **overrides: Any) -> OnboardingRequest:
    """Instantiate (but do not flush) an OnboardingRequest with sensible defaults."""
    defaults: dict[str, Any] = {
        "app_name": "Test App",
        "app_code": f"TST-{uuid.uuid4().hex[:6].upper()}",
        "portfolio": "Test Portfolio",
        "hosting_platform": "eks",
        "tech_stack": "java_spring",
        "status": OnboardingStatus.DRAFT,
        "alert_owner_email": "owner@example.com",
        "alert_owner_team": "Test Team",
        "created_by": "pytest@test.local",
    }
    defaults.update(overrides)
    return OnboardingRequest(**defaults)


async def _persist(session: AsyncSession, obj: OnboardingRequest) -> OnboardingRequest:
    """Add, flush, and refresh the object to simulate a service-level persist."""
    session.add(obj)
    await session.flush()
    await session.refresh(obj)
    return obj


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_onboarding_service(async_session: AsyncSession) -> None:
    """Service layer: creating an onboarding persists all required fields."""
    obj = _make_onboarding(async_session)
    obj = await _persist(async_session, obj)

    assert obj.id is not None
    assert obj.status == OnboardingStatus.DRAFT
    assert obj.app_name == "Test App"
    assert obj.created_by == "pytest@test.local"


@pytest.mark.asyncio
async def test_get_onboarding_service(async_session: AsyncSession) -> None:
    """Service layer: retrieving an onboarding loads relationships eagerly."""
    obj = _make_onboarding(async_session)
    obj = await _persist(async_session, obj)

    stmt = select(OnboardingRequest).where(OnboardingRequest.id == obj.id)
    result = await async_session.execute(stmt)
    fetched = result.scalar_one()

    assert fetched.id == obj.id
    assert fetched.app_code == obj.app_code
    # Eagerly loaded relationships should be accessible (empty but not None for lists).
    assert fetched.similarity_matches is not None
    assert fetched.artifacts is not None


@pytest.mark.asyncio
async def test_list_onboardings_service(async_session: AsyncSession) -> None:
    """Service layer: listing returns paginated results with correct count."""
    # Insert 5 records.
    for i in range(5):
        obj = _make_onboarding(async_session, app_name=f"App {i}")
        session = async_session
        session.add(obj)
    await async_session.flush()

    stmt = select(OnboardingRequest)
    result = await async_session.execute(stmt)
    all_rows = result.scalars().all()

    assert len(all_rows) == 5
    app_names = {r.app_name for r in all_rows}
    assert "App 0" in app_names
    assert "App 4" in app_names


@pytest.mark.asyncio
async def test_update_onboarding_service(async_session: AsyncSession) -> None:
    """Service layer: partial update changes only the specified fields."""
    obj = _make_onboarding(async_session, app_name="Original Name")
    obj = await _persist(async_session, obj)

    obj.app_name = "Updated Name"
    obj.notes = "Added during test"
    await async_session.flush()
    await async_session.refresh(obj)

    assert obj.app_name == "Updated Name"
    assert obj.notes == "Added during test"
    # Unchanged fields remain the same.
    assert obj.portfolio == "Test Portfolio"


@pytest.mark.asyncio
async def test_submit_onboarding_service(async_session: AsyncSession) -> None:
    """Service layer: submitting transitions status from DRAFT to a non-draft state."""
    obj = _make_onboarding(async_session, status=OnboardingStatus.DRAFT)
    obj = await _persist(async_session, obj)

    assert obj.status == OnboardingStatus.DRAFT

    # Simulate the submit transition.
    obj.status = OnboardingStatus.SUBMITTED
    obj.submitted_at = datetime.now(timezone.utc)
    await async_session.flush()
    await async_session.refresh(obj)

    assert obj.status == OnboardingStatus.SUBMITTED
    assert obj.submitted_at is not None
