"""Pydantic v2 schemas — re-exported for convenient access."""

from app.schemas.artifact import (
    ArtifactGenerateRequest,
    ArtifactPreviewResponse,
    ArtifactResponse,
    CRPayload,
    EpicPayload,
    StoryPayload,
)
from app.schemas.capacity import (
    CapacityCheckRequest,
    CapacityCheckResponse,
    SignalCapacity,
)
from app.schemas.common import (
    ArtifactType,
    BaseResponse,
    CapacityStatus,
    ErrorResponse,
    GovernanceSeverity,
    HostingPlatform,
    OnboardingStatus,
    PaginationMeta,
    TechStack,
    TelemetrySignal,
)
from app.schemas.governance import (
    GovernanceResult,
    GovernanceValidateRequest,
    Violation,
)
from app.schemas.onboarding import (
    OnboardingCreate,
    OnboardingListResponse,
    OnboardingResponse,
    OnboardingSubmit,
    OnboardingUpdate,
)
from app.schemas.similarity import (
    SimilarityMatchResult,
    SimilaritySearchRequest,
    SimilaritySearchResponse,
)

__all__ = [
    # Common
    "HostingPlatform",
    "TechStack",
    "OnboardingStatus",
    "TelemetrySignal",
    "CapacityStatus",
    "ArtifactType",
    "GovernanceSeverity",
    "BaseResponse",
    "PaginationMeta",
    "ErrorResponse",
    # Onboarding
    "OnboardingCreate",
    "OnboardingUpdate",
    "OnboardingResponse",
    "OnboardingListResponse",
    "OnboardingSubmit",
    # Capacity
    "CapacityCheckRequest",
    "SignalCapacity",
    "CapacityCheckResponse",
    # Similarity
    "SimilaritySearchRequest",
    "SimilarityMatchResult",
    "SimilaritySearchResponse",
    # Artifact
    "ArtifactGenerateRequest",
    "ArtifactPreviewResponse",
    "CRPayload",
    "EpicPayload",
    "StoryPayload",
    "ArtifactResponse",
    # Governance
    "GovernanceValidateRequest",
    "Violation",
    "GovernanceResult",
]
