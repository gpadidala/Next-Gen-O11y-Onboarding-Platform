"""Repository for OnboardingRequest CRUD operations.

All database access for the ``onboarding_requests`` table is encapsulated
here so that services remain decoupled from SQLAlchemy query details.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.onboarding import OnboardingRequest, OnboardingStatus
from app.models.telemetry import TelemetryScope
from app.schemas.onboarding import OnboardingCreate, OnboardingUpdate
from app.utils.exceptions import NotFoundError, ValidationError

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


class OnboardingRepository:
    """Async repository encapsulating all persistence logic for
    :class:`~app.models.onboarding.OnboardingRequest`.

    Every public method accepts an :class:`AsyncSession` as its first
    argument so that callers (typically service classes) control the
    unit-of-work boundary.
    """

    # ── Eager-loading options applied to most queries ───────────────────

    _DEFAULT_OPTIONS = (
        selectinload(OnboardingRequest.telemetry_scope),
        selectinload(OnboardingRequest.capacity_assessment),
        selectinload(OnboardingRequest.similarity_matches),
        selectinload(OnboardingRequest.artifacts),
        selectinload(OnboardingRequest.technical_config),
        selectinload(OnboardingRequest.environment_readiness),
    )

    # ── Create ─────────────────────────────────────────────────────────

    async def create(
        self,
        session: AsyncSession,
        data: OnboardingCreate,
    ) -> OnboardingRequest:
        """Persist a new onboarding request in DRAFT status.

        Args:
            session: Active async database session.
            data: Validated creation payload.

        Returns:
            The newly created :class:`OnboardingRequest` with its
            generated UUID and server-defaulted timestamps.

        Raises:
            ValidationError: If an onboarding request already exists for
                the supplied ``app_code``.
        """
        existing = await self.get_by_app_code(session, data.app_code)
        if existing is not None:
            raise ValidationError(
                f"Onboarding request already exists for app_code={data.app_code!r}",
                error_code="DUPLICATE_APP_CODE",
            )

        request = OnboardingRequest(
            app_name=data.app_name,
            app_code=data.app_code,
            portfolio=data.portfolio,
            hosting_platform=data.hosting_platform,
            tech_stack=data.tech_stack,
            alert_owner_email=data.alert_owner_email,
            alert_owner_team=data.alert_owner_team,
            created_by=data.created_by,
            notes=data.notes,
            status=OnboardingStatus.DRAFT,
        )

        # Optionally attach a telemetry scope from the creation payload.
        if data.telemetry_scope is not None:
            scope = TelemetryScope(
                selected_signals=data.telemetry_scope.selected_signals,
                environment_matrix=data.telemetry_scope.environment_matrix,
            )
            request.telemetry_scope = scope

        session.add(request)
        await session.flush()
        await session.refresh(request)

        logger.info(
            "onboarding.created",
            request_id=str(request.id),
            app_code=request.app_code,
        )
        return request

    # ── Read ───────────────────────────────────────────────────────────

    async def get_by_id(
        self,
        session: AsyncSession,
        request_id: uuid.UUID,
    ) -> OnboardingRequest | None:
        """Fetch an onboarding request by primary key with all relationships eagerly loaded.

        Args:
            session: Active async database session.
            request_id: UUID of the onboarding request.

        Returns:
            The matched :class:`OnboardingRequest`, or ``None`` if not found.
        """
        stmt = (
            select(OnboardingRequest)
            .where(OnboardingRequest.id == request_id)
            .options(*self._DEFAULT_OPTIONS)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_app_code(
        self,
        session: AsyncSession,
        app_code: str,
    ) -> OnboardingRequest | None:
        """Fetch an onboarding request by application code.

        Args:
            session: Active async database session.
            app_code: Unique CMDB application code.

        Returns:
            The matched :class:`OnboardingRequest`, or ``None``.
        """
        stmt = (
            select(OnboardingRequest)
            .where(OnboardingRequest.app_code == app_code)
            .options(*self._DEFAULT_OPTIONS)
        )
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_all(
        self,
        session: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 20,
        status_filter: OnboardingStatus | None = None,
        portfolio_filter: str | None = None,
    ) -> tuple[list[OnboardingRequest], int]:
        """Return a paginated, optionally filtered list of onboarding requests.

        Args:
            session: Active async database session.
            skip: Number of records to skip (offset).
            limit: Maximum number of records to return.
            status_filter: Optional status to filter on.
            portfolio_filter: Optional portfolio name to filter on.

        Returns:
            A two-tuple of ``(items, total_count)``.
        """
        base = select(OnboardingRequest)
        count_base = select(func.count(OnboardingRequest.id))

        if status_filter is not None:
            base = base.where(OnboardingRequest.status == status_filter)
            count_base = count_base.where(OnboardingRequest.status == status_filter)

        if portfolio_filter is not None:
            base = base.where(OnboardingRequest.portfolio == portfolio_filter)
            count_base = count_base.where(OnboardingRequest.portfolio == portfolio_filter)

        # Total count (before pagination)
        total_result = await session.execute(count_base)
        total: int = total_result.scalar_one()

        # Paginated items
        stmt = (
            base
            .options(*self._DEFAULT_OPTIONS)
            .order_by(OnboardingRequest.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await session.execute(stmt)
        items: list[OnboardingRequest] = list(result.scalars().all())

        return items, total

    # ── Update ─────────────────────────────────────────────────────────

    async def update(
        self,
        session: AsyncSession,
        request_id: uuid.UUID,
        data: OnboardingUpdate,
    ) -> OnboardingRequest:
        """Apply a partial update to an existing onboarding request.

        Only fields explicitly set (not ``None``) in *data* are written.

        Args:
            session: Active async database session.
            request_id: UUID of the request to update.
            data: Validated partial-update payload.

        Returns:
            The updated :class:`OnboardingRequest`.

        Raises:
            NotFoundError: If no request exists with the given ID.
            ValidationError: If the request is in a non-editable status.
        """
        request = await self.get_by_id(session, request_id)
        if request is None:
            raise NotFoundError(f"Onboarding request {request_id} not found")

        editable_statuses = {OnboardingStatus.DRAFT, OnboardingStatus.IN_PROGRESS}
        if request.status not in editable_statuses:
            raise ValidationError(
                f"Cannot update request in status {request.status.value!r}. "
                f"Only DRAFT and IN_PROGRESS requests are editable.",
                error_code="NOT_EDITABLE",
            )

        update_data: dict[str, Any] = data.model_dump(exclude_unset=True)

        # Handle nested telemetry_scope update separately if present
        telemetry_scope_data = update_data.pop("telemetry_scope", None)

        for field_name, value in update_data.items():
            if hasattr(request, field_name):
                setattr(request, field_name, value)

        # Update or create telemetry scope if provided
        if telemetry_scope_data is not None:
            if request.telemetry_scope is not None:
                request.telemetry_scope.selected_signals = telemetry_scope_data.get(
                    "selected_signals", request.telemetry_scope.selected_signals
                )
                request.telemetry_scope.environment_matrix = telemetry_scope_data.get(
                    "environment_matrix", request.telemetry_scope.environment_matrix
                )
            else:
                scope = TelemetryScope(
                    onboarding_request_id=request.id,
                    selected_signals=telemetry_scope_data.get("selected_signals", {}),
                    environment_matrix=telemetry_scope_data.get("environment_matrix", {}),
                )
                request.telemetry_scope = scope

        await session.flush()
        await session.refresh(request)

        logger.info(
            "onboarding.updated",
            request_id=str(request_id),
            updated_fields=list(data.model_dump(exclude_unset=True).keys()),
        )
        return request

    # ── Submit ─────────────────────────────────────────────────────────

    async def submit(
        self,
        session: AsyncSession,
        request_id: uuid.UUID,
    ) -> OnboardingRequest:
        """Transition an onboarding request from DRAFT/IN_PROGRESS to GOVERNANCE_REVIEW.

        This is the formal submission step that triggers downstream
        validation. The ``submitted_at`` timestamp is recorded.

        Args:
            session: Active async database session.
            request_id: UUID of the request to submit.

        Returns:
            The submitted :class:`OnboardingRequest`.

        Raises:
            NotFoundError: If the request does not exist.
            ValidationError: If the request is not in a submittable state.
        """
        request = await self.get_by_id(session, request_id)
        if request is None:
            raise NotFoundError(f"Onboarding request {request_id} not found")

        submittable_statuses = {
            OnboardingStatus.DRAFT,
            OnboardingStatus.IN_PROGRESS,
        }
        if request.status not in submittable_statuses:
            raise ValidationError(
                f"Cannot submit request in status {request.status.value!r}. "
                f"Only DRAFT or IN_PROGRESS requests can be submitted.",
                error_code="NOT_SUBMITTABLE",
            )

        request.status = OnboardingStatus.GOVERNANCE_REVIEW
        request.submitted_at = datetime.now(timezone.utc)

        await session.flush()
        await session.refresh(request)

        logger.info(
            "onboarding.submitted",
            request_id=str(request_id),
            new_status=request.status.value,
        )
        return request

    # ── Delete ─────────────────────────────────────────────────────────

    async def delete(
        self,
        session: AsyncSession,
        request_id: uuid.UUID,
    ) -> None:
        """Delete an onboarding request and all cascaded children.

        Only DRAFT and CANCELLED requests may be deleted.

        Args:
            session: Active async database session.
            request_id: UUID of the request to delete.

        Raises:
            NotFoundError: If the request does not exist.
            ValidationError: If the request is in a non-deletable status.
        """
        request = await self.get_by_id(session, request_id)
        if request is None:
            raise NotFoundError(f"Onboarding request {request_id} not found")

        deletable_statuses = {OnboardingStatus.DRAFT, OnboardingStatus.CANCELLED}
        if request.status not in deletable_statuses:
            raise ValidationError(
                f"Cannot delete request in status {request.status.value!r}. "
                f"Only DRAFT and CANCELLED requests may be deleted.",
                error_code="NOT_DELETABLE",
            )

        await session.delete(request)
        await session.flush()

        logger.info(
            "onboarding.deleted",
            request_id=str(request_id),
            app_code=request.app_code,
        )

    # ── Status transitions ─────────────────────────────────────────────

    async def update_status(
        self,
        session: AsyncSession,
        request_id: uuid.UUID,
        new_status: OnboardingStatus,
    ) -> OnboardingRequest:
        """Update the status of an onboarding request.

        This is a lower-level helper used by services that need to set
        status to arbitrary values (e.g. after capacity check, governance).

        Args:
            session: Active async database session.
            request_id: UUID of the request.
            new_status: Target status.

        Returns:
            The updated :class:`OnboardingRequest`.

        Raises:
            NotFoundError: If the request does not exist.
        """
        request = await self.get_by_id(session, request_id)
        if request is None:
            raise NotFoundError(f"Onboarding request {request_id} not found")

        old_status = request.status
        request.status = new_status

        await session.flush()
        await session.refresh(request)

        logger.info(
            "onboarding.status_changed",
            request_id=str(request_id),
            old_status=old_status.value,
            new_status=new_status.value,
        )
        return request
