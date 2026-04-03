"""Repository for ApplicationMetadata read operations.

Provides lookups against the CMDB-like application registry that is
pre-populated from upstream syncs.  This table is read-only from the
onboarding platform's perspective.
"""

from __future__ import annotations

import structlog
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.application import ApplicationMetadata

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


class ApplicationRepository:
    """Async read-only repository for :class:`~app.models.application.ApplicationMetadata`.

    Used by services to validate application codes, auto-complete app
    metadata, and enumerate portfolio dimensions for filter UIs.
    """

    async def get_by_app_code(
        self,
        session: AsyncSession,
        app_code: str,
    ) -> ApplicationMetadata | None:
        """Look up an application by its unique CMDB code.

        Args:
            session: Active async database session.
            app_code: The unique application code (e.g. ``"APP-1234"``).

        Returns:
            The matched :class:`ApplicationMetadata`, or ``None`` if no
            active (non-retired) application matches.
        """
        stmt = select(ApplicationMetadata).where(
            ApplicationMetadata.app_code == app_code,
            ApplicationMetadata.retired.is_(False),
        )
        result = await session.execute(stmt)
        app = result.scalar_one_or_none()

        if app is not None:
            logger.debug(
                "application.found",
                app_code=app_code,
                app_name=app.app_name,
            )
        else:
            logger.debug("application.not_found", app_code=app_code)

        return app

    async def validate_app_code(
        self,
        session: AsyncSession,
        app_code: str,
    ) -> bool:
        """Check whether an application code exists and is not retired.

        This is a lightweight existence check that avoids loading the
        entire row.

        Args:
            session: Active async database session.
            app_code: The application code to validate.

        Returns:
            ``True`` if a non-retired application record exists for
            the given code, ``False`` otherwise.
        """
        stmt = (
            select(func.count(ApplicationMetadata.id))
            .where(
                ApplicationMetadata.app_code == app_code,
                ApplicationMetadata.retired.is_(False),
            )
        )
        result = await session.execute(stmt)
        count: int = result.scalar_one()
        is_valid = count > 0

        logger.debug(
            "application.validated",
            app_code=app_code,
            is_valid=is_valid,
        )
        return is_valid

    async def list_portfolios(
        self,
        session: AsyncSession,
    ) -> list[str]:
        """Return a sorted list of distinct portfolio names.

        Used to populate filter dropdowns and faceted search in the UI.

        Args:
            session: Active async database session.

        Returns:
            Alphabetically sorted list of portfolio names from active
            (non-retired) applications.
        """
        stmt = (
            select(distinct(ApplicationMetadata.portfolio))
            .where(ApplicationMetadata.retired.is_(False))
            .order_by(ApplicationMetadata.portfolio)
        )
        result = await session.execute(stmt)
        portfolios: list[str] = [row[0] for row in result.all() if row[0] is not None]

        logger.debug(
            "application.portfolios_listed",
            count=len(portfolios),
        )
        return portfolios

    async def search(
        self,
        session: AsyncSession,
        *,
        query: str | None = None,
        portfolio: str | None = None,
        hosting_platform: str | None = None,
        tech_stack: str | None = None,
        limit: int = 20,
    ) -> list[ApplicationMetadata]:
        """Search for applications with optional text and facet filters.

        The text ``query`` matches against ``app_code``, ``app_name``,
        and ``description`` using case-insensitive ``ILIKE``.

        Args:
            session: Active async database session.
            query: Free-text search term (optional).
            portfolio: Filter by portfolio name (optional).
            hosting_platform: Filter by hosting platform (optional).
            tech_stack: Filter by tech stack (optional).
            limit: Maximum results to return.

        Returns:
            List of matching :class:`ApplicationMetadata` records.
        """
        stmt = select(ApplicationMetadata).where(
            ApplicationMetadata.retired.is_(False),
        )

        if query:
            pattern = f"%{query}%"
            stmt = stmt.where(
                ApplicationMetadata.app_code.ilike(pattern)
                | ApplicationMetadata.app_name.ilike(pattern)
                | ApplicationMetadata.description.ilike(pattern)
            )

        if portfolio:
            stmt = stmt.where(ApplicationMetadata.portfolio == portfolio)
        if hosting_platform:
            stmt = stmt.where(ApplicationMetadata.hosting_platform == hosting_platform)
        if tech_stack:
            stmt = stmt.where(ApplicationMetadata.tech_stack == tech_stack)

        stmt = stmt.order_by(ApplicationMetadata.app_name).limit(limit)

        result = await session.execute(stmt)
        apps: list[ApplicationMetadata] = list(result.scalars().all())

        logger.debug(
            "application.search",
            query=query,
            portfolio=portfolio,
            result_count=len(apps),
        )
        return apps
