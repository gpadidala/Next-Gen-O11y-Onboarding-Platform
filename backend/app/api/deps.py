"""FastAPI dependency injection providers.

Usage in route handlers::

    @router.get("/example")
    async def example(
        db: AsyncSession = Depends(get_db),
        settings: Settings = Depends(get_settings),
    ) -> ...:
        ...
"""

from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import Settings, get_settings as _get_settings

# ── Module-level engine / session factory (initialised lazily in lifespan) ──

_async_engine = None
_async_session_factory: async_sessionmaker[AsyncSession] | None = None


def init_db_engine(settings: Settings) -> None:
    """Create the async engine and session factory.

    Called once during application lifespan startup.
    """
    global _async_engine, _async_session_factory  # noqa: PLW0603

    _async_engine = create_async_engine(
        settings.DATABASE_URL,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        echo=settings.APP_DEBUG,
        pool_pre_ping=True,
    )
    _async_session_factory = async_sessionmaker(
        bind=_async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def dispose_db_engine() -> None:
    """Dispose the async engine (called on shutdown)."""
    global _async_engine  # noqa: PLW0603
    if _async_engine is not None:
        await _async_engine.dispose()
        _async_engine = None


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session scoped to a single request.

    The session is committed on success and rolled back on exception.
    """
    if _async_session_factory is None:
        raise RuntimeError("Database engine has not been initialised. Call init_db_engine() first.")

    async with _async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def get_settings() -> Settings:
    """Return the cached application settings singleton."""
    return _get_settings()


# ── Annotated shortcuts for cleaner route signatures ─────────────────────

DbSession = Annotated[AsyncSession, Depends(get_db)]
AppSettings = Annotated[Settings, Depends(get_settings)]
