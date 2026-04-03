"""Repository for the immutable AuditLog table.

Audit entries are append-only — there is no update or delete.
"""

from __future__ import annotations

import uuid
from typing import Any

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


class AuditRepository:
    """Async repository for :class:`~app.models.audit.AuditLog`.

    Provides append-only write and filtered read operations against the
    audit trail.  No update or delete methods are exposed to preserve
    the immutable, compliance-friendly nature of the log.
    """

    async def log(
        self,
        session: AsyncSession,
        *,
        entity_type: str,
        entity_id: uuid.UUID,
        action: str,
        actor: str,
        changes: dict[str, Any] | None = None,
        detail: str | None = None,
    ) -> AuditLog:
        """Append a new audit trail entry.

        Args:
            session: Active async database session.
            entity_type: The type of entity being audited
                (e.g. ``"onboarding_request"``, ``"artifact"``).
            entity_id: Primary key of the audited entity.
            action: Action being recorded
                (e.g. ``"created"``, ``"updated"``, ``"submitted"``,
                ``"status_changed"``, ``"deleted"``).
            actor: Identifier of the person or system performing the
                action (email, username, or ``"system"``).
            changes: Optional dict describing what changed.  For updates
                this is typically ``{"field": {"old": ..., "new": ...}}``.
            detail: Optional free-text description of the action.

        Returns:
            The persisted :class:`AuditLog` entry with its generated
            UUID and server-defaulted timestamp.
        """
        entry = AuditLog(
            entity_type=entity_type,
            entity_id=entity_id,
            action=action,
            actor=actor,
            changes=changes or {},
        )

        session.add(entry)
        await session.flush()

        logger.info(
            "audit.logged",
            audit_id=str(entry.id),
            entity_type=entity_type,
            entity_id=str(entity_id),
            action=action,
            actor=actor,
        )
        return entry

    async def get_by_entity(
        self,
        session: AsyncSession,
        entity_type: str,
        entity_id: uuid.UUID,
    ) -> list[AuditLog]:
        """Retrieve all audit entries for a specific entity.

        Results are ordered chronologically (oldest first) to provide a
        natural timeline view.

        Args:
            session: Active async database session.
            entity_type: The entity type to filter on.
            entity_id: The entity's primary key.

        Returns:
            Chronologically ordered list of :class:`AuditLog` entries.
        """
        stmt = (
            select(AuditLog)
            .where(
                AuditLog.entity_type == entity_type,
                AuditLog.entity_id == entity_id,
            )
            .order_by(AuditLog.timestamp.asc())
        )
        result = await session.execute(stmt)
        entries: list[AuditLog] = list(result.scalars().all())

        logger.debug(
            "audit.fetched",
            entity_type=entity_type,
            entity_id=str(entity_id),
            count=len(entries),
        )
        return entries

    async def get_by_actor(
        self,
        session: AsyncSession,
        actor: str,
        *,
        limit: int = 50,
    ) -> list[AuditLog]:
        """Retrieve recent audit entries for a specific actor.

        Args:
            session: Active async database session.
            actor: The actor identifier to filter on.
            limit: Maximum number of entries to return.

        Returns:
            Most-recent-first list of :class:`AuditLog` entries.
        """
        stmt = (
            select(AuditLog)
            .where(AuditLog.actor == actor)
            .order_by(AuditLog.timestamp.desc())
            .limit(limit)
        )
        result = await session.execute(stmt)
        entries: list[AuditLog] = list(result.scalars().all())

        logger.debug(
            "audit.fetched_by_actor",
            actor=actor,
            count=len(entries),
        )
        return entries

    async def get_by_action(
        self,
        session: AsyncSession,
        action: str,
        *,
        limit: int = 50,
    ) -> list[AuditLog]:
        """Retrieve recent audit entries for a specific action type.

        Args:
            session: Active async database session.
            action: Action string to filter on (e.g. ``"submitted"``).
            limit: Maximum number of entries to return.

        Returns:
            Most-recent-first list of :class:`AuditLog` entries.
        """
        stmt = (
            select(AuditLog)
            .where(AuditLog.action == action)
            .order_by(AuditLog.timestamp.desc())
            .limit(limit)
        )
        result = await session.execute(stmt)
        entries: list[AuditLog] = list(result.scalars().all())

        logger.debug(
            "audit.fetched_by_action",
            action=action,
            count=len(entries),
        )
        return entries
