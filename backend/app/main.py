"""FastAPI application factory for the Observability Onboarding Platform."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app

from app.api.deps import dispose_db_engine, init_db_engine
from app.config import Settings, get_settings
from app.jobs.scheduler import shutdown_scheduler, start_scheduler
from app.utils.exceptions import AppException
from app.utils.logging import configure_logging
from app.utils.metrics import PrometheusMiddleware

logger = structlog.stdlib.get_logger(__name__)


# ── Lifespan ─────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: initialise resources on startup, clean up on shutdown."""
    settings = get_settings()

    # Structured logging
    configure_logging(log_level=settings.LOG_LEVEL, log_format=settings.LOG_FORMAT)

    # Database engine
    init_db_engine(settings)
    logger.info(
        "application_startup",
        version=settings.APP_VERSION,
        env=settings.APP_ENV,
    )

    # APScheduler — CMDB sync, coverage probes, leadership rollups
    if settings.SCHEDULER_ENABLED:
        start_scheduler()

    yield

    # Shutdown
    shutdown_scheduler()
    await dispose_db_engine()
    logger.info("application_shutdown")


# ── App Factory ──────────────────────────────────────────────────────────


def create_app(settings: Settings | None = None) -> FastAPI:
    """Construct and return the fully-configured FastAPI application."""
    if settings is None:
        settings = get_settings()

    app = FastAPI(
        title="Observability Onboarding Platform",
        description="Enterprise LGTM-stack onboarding wizard API",
        version=settings.APP_VERSION,
        lifespan=lifespan,
        docs_url="/api/docs" if settings.APP_DEBUG else None,
        redoc_url="/api/redoc" if settings.APP_DEBUG else None,
        openapi_url="/api/openapi.json" if settings.APP_DEBUG else None,
    )

    # ── Middleware (order matters: last added = first executed) ────────
    _register_middleware(app, settings)

    # ── Exception Handlers ────────────────────────────────────────────
    _register_exception_handlers(app)

    # ── Routers ───────────────────────────────────────────────────────
    _register_routers(app)

    # ── Prometheus /metrics endpoint ──────────────────────────────────
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)

    return app


# ── Middleware Registration ──────────────────────────────────────────────


def _register_middleware(app: FastAPI, settings: Settings) -> None:
    app.add_middleware(PrometheusMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-Trace-ID"],
    )


# ── Exception Handlers ──────────────────────────────────────────────────


def _register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
        log = logger.bind(
            path=request.url.path,
            method=request.method,
            error_code=exc.error_code,
        )
        if exc.status_code >= 500:
            log.error("unhandled_app_exception", detail=exc.detail, extra=exc.extra)
        else:
            log.warning("app_exception", detail=exc.detail, extra=exc.extra)

        body: dict[str, Any] = {
            "type": f"urn:o11y:error:{exc.error_code.lower()}",
            "title": exc.error_code,
            "status": exc.status_code,
            "detail": exc.detail,
            "instance": str(request.url),
        }
        if exc.extra:
            body["errors"] = exc.extra

        return JSONResponse(status_code=exc.status_code, content=body)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(
            "unhandled_exception",
            path=request.url.path,
            method=request.method,
            exc_info=exc,
        )
        return JSONResponse(
            status_code=500,
            content={
                "type": "urn:o11y:error:internal_error",
                "title": "INTERNAL_ERROR",
                "status": 500,
                "detail": "An unexpected error occurred.",
                "instance": str(request.url),
            },
        )


# ── Router Registration ─────────────────────────────────────────────────


def _register_routers(app: FastAPI) -> None:
    """Include the v1 API router.

    The actual route modules are expected in ``app.api.v1.router``.
    We import lazily so the application can start even if route modules
    are not yet implemented.
    """
    try:
        from app.api.v1.router import router as v1_router

        app.include_router(v1_router, prefix="/api/v1")
    except ImportError:
        logger.warning(
            "v1_router_not_found",
            detail="app.api.v1.router not found — no API routes registered.",
        )


# ── Module-level app instance (for uvicorn) ─────────────────────────────

app = create_app()
