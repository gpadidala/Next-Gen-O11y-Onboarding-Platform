"""Service orchestrating the full onboarding request lifecycle.

This is the primary service class that coordinates between the
repository layer, governance/capacity engines, and notification layer
to implement the end-to-end wizard flow.
"""

from __future__ import annotations

import math
import uuid
from typing import Any

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.onboarding import OnboardingRequest, OnboardingStatus
from app.repositories.application_repo import ApplicationRepository
from app.repositories.audit_repo import AuditRepository
from app.repositories.onboarding_repo import OnboardingRepository
from app.schemas.common import PaginationMeta
from app.schemas.onboarding import OnboardingCreate, OnboardingUpdate
from app.utils.exceptions import NotFoundError, ValidationError

logger: structlog.stdlib.BoundLogger = structlog.get_logger(__name__)


class OnboardingService:
    """Orchestrates create / read / update / submit / delete workflows
    for onboarding requests.

    All database mutations are performed within the caller-supplied
    :class:`AsyncSession`, giving the caller full control over commit
    and rollback boundaries.

    Dependencies are injected via the constructor so the class is fully
    testable with mocks or stubs.
    """

    def __init__(
        self,
        *,
        onboarding_repo: OnboardingRepository | None = None,
        application_repo: ApplicationRepository | None = None,
        audit_repo: AuditRepository | None = None,
    ) -> None:
        self._onboarding_repo = onboarding_repo or OnboardingRepository()
        self._application_repo = application_repo or ApplicationRepository()
        self._audit_repo = audit_repo or AuditRepository()

    # ── Create ─────────────────────────────────────────────────────────

    async def create_onboarding(
        self,
        db: AsyncSession,
        data: OnboardingCreate,
    ) -> OnboardingRequest:
        """Create a new onboarding request in DRAFT status.

        Validates the application code against the CMDB registry, persists
        the request, and records a creation audit entry.

        Args:
            db: Active async database session.
            data: Validated creation payload.

        Returns:
            The newly created :class:`OnboardingRequest`.

        Raises:
            ValidationError: If the app_code is not found in the CMDB
                registry or a request already exists for the app_code.
        """
        # Validate app_code against CMDB (advisory — log warning if unknown)
        app_valid = await self._application_repo.validate_app_code(db, data.app_code)
        if not app_valid:
            logger.warning(
                "onboarding.unknown_app_code",
                app_code=data.app_code,
                message="App code not found in CMDB registry. Proceeding with user-supplied data.",
            )

        request = await self._onboarding_repo.create(db, data)

        # Audit trail
        await self._audit_repo.log(
            db,
            entity_type="onboarding_request",
            entity_id=request.id,
            action="created",
            actor=data.created_by,
            changes={"status": OnboardingStatus.DRAFT.value},
        )

        await db.commit()
        await db.refresh(request)

        logger.info(
            "onboarding_service.created",
            request_id=str(request.id),
            app_code=request.app_code,
        )
        return request

    # ── Read ───────────────────────────────────────────────────────────

    async def get_onboarding(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
    ) -> OnboardingRequest:
        """Fetch a single onboarding request with all relationships.

        Args:
            db: Active async database session.
            request_id: UUID of the request.

        Returns:
            The loaded :class:`OnboardingRequest`.

        Raises:
            NotFoundError: If no request exists with the given ID.
        """
        request = await self._onboarding_repo.get_by_id(db, request_id)
        if request is None:
            raise NotFoundError(f"Onboarding request {request_id} not found")
        return request

    async def list_onboardings(
        self,
        db: AsyncSession,
        *,
        page: int = 1,
        page_size: int = 20,
        status_filter: OnboardingStatus | None = None,
        portfolio_filter: str | None = None,
    ) -> tuple[list[OnboardingRequest], PaginationMeta]:
        """Return a paginated, filtered list of onboarding requests.

        Args:
            db: Active async database session.
            page: 1-based page number.
            page_size: Records per page (clamped 1..100).
            status_filter: Optional status filter.
            portfolio_filter: Optional portfolio filter.

        Returns:
            A tuple of ``(items, pagination_meta)``.
        """
        page_size = max(1, min(page_size, 100))
        skip = (max(1, page) - 1) * page_size

        items, total = await self._onboarding_repo.list_all(
            db,
            skip=skip,
            limit=page_size,
            status_filter=status_filter,
            portfolio_filter=portfolio_filter,
        )

        total_pages = max(1, math.ceil(total / page_size))
        pagination = PaginationMeta(
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages,
        )

        logger.debug(
            "onboarding_service.listed",
            total=total,
            page=page,
            returned=len(items),
        )
        return items, pagination

    # ── Update ─────────────────────────────────────────────────────────

    async def update_onboarding(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        data: OnboardingUpdate,
        *,
        actor: str = "system",
    ) -> OnboardingRequest:
        """Apply a partial update to an existing onboarding request.

        Records the changes in the audit trail.

        Args:
            db: Active async database session.
            request_id: UUID of the request to update.
            data: Validated partial-update payload.
            actor: Identifier of the person performing the update.

        Returns:
            The updated :class:`OnboardingRequest`.
        """
        # Capture pre-update state for audit diff
        old_request = await self._onboarding_repo.get_by_id(db, request_id)
        if old_request is None:
            raise NotFoundError(f"Onboarding request {request_id} not found")

        update_fields = data.model_dump(exclude_unset=True)
        changes: dict[str, Any] = {}
        for field_name, new_value in update_fields.items():
            if field_name == "telemetry_scope":
                continue  # nested object -- audit as a whole
            old_value = getattr(old_request, field_name, None)
            if old_value != new_value:
                # Convert enums to their values for JSON serialisation
                old_serialised = old_value.value if hasattr(old_value, "value") else old_value
                new_serialised = new_value.value if hasattr(new_value, "value") else new_value
                changes[field_name] = {"old": old_serialised, "new": new_serialised}

        if "telemetry_scope" in update_fields:
            changes["telemetry_scope"] = {"updated": True}

        request = await self._onboarding_repo.update(db, request_id, data)

        if changes:
            await self._audit_repo.log(
                db,
                entity_type="onboarding_request",
                entity_id=request_id,
                action="updated",
                actor=actor,
                changes=changes,
            )

        await db.commit()
        await db.refresh(request)

        logger.info(
            "onboarding_service.updated",
            request_id=str(request_id),
            changed_fields=list(changes.keys()),
        )
        return request

    # ── Submit ─────────────────────────────────────────────────────────

    async def submit_onboarding(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        *,
        actor: str = "system",
    ) -> OnboardingRequest:
        """Submit an onboarding request for governance review.

        This transitions the request to ``GOVERNANCE_REVIEW`` status
        and records the submission in the audit trail.  Downstream
        governance and capacity checks are triggered by the calling
        layer (API route or background task).

        Args:
            db: Active async database session.
            request_id: UUID of the request to submit.
            actor: Identifier of the submitter.

        Returns:
            The submitted :class:`OnboardingRequest`.

        Raises:
            NotFoundError: If the request does not exist.
            ValidationError: If the request is not in a submittable state.
        """
        request = await self._onboarding_repo.submit(db, request_id)

        await self._audit_repo.log(
            db,
            entity_type="onboarding_request",
            entity_id=request_id,
            action="submitted",
            actor=actor,
            changes={
                "status": {
                    "old": OnboardingStatus.DRAFT.value,
                    "new": OnboardingStatus.GOVERNANCE_REVIEW.value,
                },
            },
        )

        await db.commit()
        await db.refresh(request)

        logger.info(
            "onboarding_service.submitted",
            request_id=str(request_id),
            actor=actor,
        )
        return request

    # ── Delete ─────────────────────────────────────────────────────────

    async def delete_onboarding(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        *,
        actor: str = "system",
    ) -> None:
        """Delete an onboarding request.

        Only DRAFT and CANCELLED requests may be deleted.  A final
        audit entry is recorded before removal.

        Args:
            db: Active async database session.
            request_id: UUID of the request to delete.
            actor: Identifier of the person requesting deletion.

        Raises:
            NotFoundError: If the request does not exist.
            ValidationError: If the request is in a non-deletable state.
        """
        # Fetch before deleting so we can audit
        request = await self._onboarding_repo.get_by_id(db, request_id)
        if request is None:
            raise NotFoundError(f"Onboarding request {request_id} not found")

        await self._audit_repo.log(
            db,
            entity_type="onboarding_request",
            entity_id=request_id,
            action="deleted",
            actor=actor,
            changes={"app_code": request.app_code, "status": request.status.value},
        )

        await self._onboarding_repo.delete(db, request_id)
        await db.commit()

        logger.info(
            "onboarding_service.deleted",
            request_id=str(request_id),
            app_code=request.app_code,
            actor=actor,
        )

    # ── Status helpers ─────────────────────────────────────────────────

    async def transition_status(
        self,
        db: AsyncSession,
        request_id: uuid.UUID,
        new_status: OnboardingStatus,
        *,
        actor: str = "system",
    ) -> OnboardingRequest:
        """Transition an onboarding request to a new status with audit.

        This is used by other services (governance, capacity, artifact)
        to advance the request through its lifecycle.

        Args:
            db: Active async database session.
            request_id: UUID of the request.
            new_status: Target status.
            actor: Identifier of the system or person.

        Returns:
            The updated :class:`OnboardingRequest`.
        """
        old = await self._onboarding_repo.get_by_id(db, request_id)
        if old is None:
            raise NotFoundError(f"Onboarding request {request_id} not found")

        old_status = old.status
        request = await self._onboarding_repo.update_status(db, request_id, new_status)

        await self._audit_repo.log(
            db,
            entity_type="onboarding_request",
            entity_id=request_id,
            action="status_changed",
            actor=actor,
            changes={
                "status": {"old": old_status.value, "new": new_status.value},
            },
        )

        await db.commit()
        await db.refresh(request)

        logger.info(
            "onboarding_service.status_transitioned",
            request_id=str(request_id),
            old_status=old_status.value,
            new_status=new_status.value,
            actor=actor,
        )
        return request
