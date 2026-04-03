"""SimilarityMatch model — persisted results of vector-based similarity search."""

from __future__ import annotations

import uuid

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class SimilarityMatch(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One matched application from a similarity search, ranked by score.

    Each match carries the reusable artefacts (exporters, dashboards, etc.)
    discovered in the matched application's existing setup.
    """

    __tablename__ = "similarity_matches"

    onboarding_request_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("onboarding_requests.id", ondelete="CASCADE"),
        nullable=False,
    )
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    matched_app_name: Mapped[str] = mapped_column(String(255), nullable=False)
    matched_app_code: Mapped[str] = mapped_column(String(64), nullable=False)
    score: Mapped[float] = mapped_column(Float, nullable=False)
    match_reasons: Mapped[dict] = mapped_column(JSON, nullable=False, default=list)
    exporters: Mapped[dict] = mapped_column(JSON, nullable=False, default=list)
    dashboards: Mapped[dict] = mapped_column(JSON, nullable=False, default=list)
    alert_rules: Mapped[dict] = mapped_column(JSON, nullable=False, default=list)
    playbooks: Mapped[dict] = mapped_column(JSON, nullable=False, default=list)
    pitfalls: Mapped[dict] = mapped_column(JSON, nullable=False, default=list)

    onboarding_request: Mapped[OnboardingRequest] = relationship(
        "OnboardingRequest",
        back_populates="similarity_matches",
    )

    def __repr__(self) -> str:
        return (
            f"<SimilarityMatch rank={self.rank} app={self.matched_app_code!r} "
            f"score={self.score:.3f}>"
        )


from app.models.onboarding import OnboardingRequest  # noqa: E402
