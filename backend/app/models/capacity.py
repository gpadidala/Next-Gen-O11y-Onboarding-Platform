"""CapacityAssessment model — stores capacity-check outcomes."""

from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class CapacityStatus(str, enum.Enum):
    """Aggregate capacity-check outcome."""

    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"
    UNKNOWN = "unknown"


class CapacityAssessment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Persists the result of a capacity check for an onboarding request.

    ``signal_results`` is a JSON dict keyed by signal name, each value
    containing utilisation percentages, projected load, and per-signal status.
    """

    __tablename__ = "capacity_assessments"

    onboarding_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("onboarding_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    overall_status: Mapped[CapacityStatus] = mapped_column(
        Enum(CapacityStatus, name="capacity_status_enum", native_enum=False,
             values_callable=lambda x: [e.value for e in x]),
        nullable=False,
        default=CapacityStatus.UNKNOWN,
    )
    signal_results: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    recommendations: Mapped[str | None] = mapped_column(Text, nullable=True)
    can_proceed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    escalation_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    assessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    onboarding_request: Mapped[OnboardingRequest] = relationship(
        "OnboardingRequest",
        back_populates="capacity_assessment",
    )

    def __repr__(self) -> str:
        return (
            f"<CapacityAssessment request={self.onboarding_request_id!s} "
            f"status={self.overall_status.value!r}>"
        )


from app.models.onboarding import OnboardingRequest  # noqa: E402
