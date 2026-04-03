"""Async SQLAlchemy engine and session factory.

Provides a ``get_async_session`` async generator suitable for use as a
FastAPI dependency, and a module-level ``async_engine`` for Alembic and
startup/shutdown lifecycle hooks.
"""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings

settings = get_settings()

async_engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    echo=settings.APP_DEBUG,
    future=True,
)

AsyncSessionFactory = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async session and ensure it is closed after the request.

    Usage as a FastAPI dependency::

        @router.get("/items")
        async def list_items(db: AsyncSession = Depends(get_async_session)):
            ...
    """
    async with AsyncSessionFactory() as session:
        try:
            yield session
        finally:
            await session.close()
