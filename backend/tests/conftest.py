"""Shared test fixtures for the Observability Onboarding Platform backend.

Provides an async SQLite database, FastAPI test app with dependency overrides,
httpx.AsyncClient, and reusable factory helpers for test data.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncGenerator
from typing import Any

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.api.deps import get_db
from app.models.base import Base


# ---------------------------------------------------------------------------
# Database fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="session")
def anyio_backend() -> str:
    """Force pytest-asyncio to use asyncio."""
    return "asyncio"


@pytest.fixture()
async def async_engine() -> AsyncGenerator[AsyncEngine, None]:
    """Create an async SQLite engine for testing.

    A fresh in-memory database is created for every test function so that
    tests are fully isolated.  ``aiosqlite`` is the async driver.
    """
    engine = create_async_engine(
        "sqlite+aiosqlite://",
        echo=False,
        future=True,
    )

    # SQLite does not enforce FK constraints by default -- enable them.
    @event.listens_for(engine.sync_engine, "connect")
    def _set_sqlite_pragma(dbapi_conn: Any, _connection_record: Any) -> None:
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture()
async def async_session(
    async_engine: AsyncEngine,
) -> AsyncGenerator[AsyncSession, None]:
    """Yield an async session bound to the test database."""
    session_factory = async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    async with session_factory() as session:
        yield session


# ---------------------------------------------------------------------------
# FastAPI application & HTTP client fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def app(async_session: AsyncSession):
    """Return a FastAPI test application with the DB dependency overridden.

    The lifespan is deliberately **not** executed because it tries to
    connect to a real PostgreSQL database.  All database work uses the
    in-memory SQLite session provided by ``async_session``.
    """
    from fastapi import FastAPI
    from fastapi.responses import JSONResponse

    from app.utils.exceptions import AppException

    test_app = FastAPI(title="Test Observability Onboarding Platform")

    # --- Exception handlers (mirror production) --------------------------
    @test_app.exception_handler(AppException)
    async def _app_exc_handler(request, exc: AppException) -> JSONResponse:
        body: dict[str, Any] = {
            "type": f"urn:o11y:error:{exc.error_code.lower()}",
            "title": exc.error_code,
            "status": exc.status_code,
            "detail": exc.detail,
        }
        if exc.extra:
            body["errors"] = exc.extra
        return JSONResponse(status_code=exc.status_code, content=body)

    # --- Dependency override ---------------------------------------------
    async def _override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield async_session

    test_app.dependency_overrides[get_db] = _override_get_db

    # --- Register routers ------------------------------------------------
    try:
        from app.api.v1.router import router as v1_router

        test_app.include_router(v1_router, prefix="/api/v1")
    except ImportError:
        # Router may not be implemented yet; tests for API endpoints will
        # skip gracefully when the routes are missing.
        pass

    return test_app


@pytest.fixture()
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    """Yield an ``httpx.AsyncClient`` wired to the test FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


# ---------------------------------------------------------------------------
# Data factory fixtures
# ---------------------------------------------------------------------------


@pytest.fixture()
def sample_onboarding_data() -> dict[str, Any]:
    """Return a factory-like callable that produces valid ``OnboardingCreate`` data.

    Each call returns a new dict with a unique ``app_code`` so multiple
    onboarding records can be created within a single test without
    collisions on the unique constraint.
    """

    def _factory(**overrides: Any) -> dict[str, Any]:
        base: dict[str, Any] = {
            "app_name": "Payment Gateway Service",
            "app_code": f"APP-{uuid.uuid4().hex[:6].upper()}",
            "portfolio": "Digital Banking",
            "hosting_platform": "eks",
            "tech_stack": "java_spring",
            "alert_owner_email": "payments-team@example.com",
            "alert_owner_team": "Payments Squad",
            "created_by": "test-user@example.com",
            "notes": "Automated test onboarding request.",
        }
        base.update(overrides)
        return base

    return _factory  # type: ignore[return-value]


@pytest.fixture()
def sample_capacity_check_request() -> dict[str, Any]:
    """Return a valid capacity check request payload."""
    return {
        "onboarding_request_id": str(uuid.uuid4()),
        "hosting_platform": "eks",
        "signals": ["metrics", "logs"],
        "estimated_series_count": 5000,
        "estimated_log_gb_per_day": 10.0,
        "estimated_spans_per_second": 200,
        "metadata": {},
    }


@pytest.fixture()
def sample_engine_onboarding_data() -> dict[str, Any]:
    """Return a dict matching the ``OnboardingData`` schema used by engines."""
    return {
        "app_code": "APP-1234",
        "app_name": "Test Application",
        "tech_stack": "JavaSpringBoot",
        "hosting_platform": "AKS",
        "alert_owner_email": "team-lead@example.com",
        "selected_signals": ["metrics", "logs", "traces"],
        "environments": {
            "metrics": {"dev": True, "qa": True, "staging": True, "production": True},
            "logs": {"dev": True, "qa": True, "staging": True, "production": True},
            "traces": {"dev": True, "qa": True, "staging": True, "production": True},
        },
        "instance_count": 3,
        "estimated_metric_series": 5000,
    }
