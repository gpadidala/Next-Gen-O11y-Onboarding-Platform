"""Pydantic schemas for the similarity-search subsystem."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import HostingPlatform, TechStack, TelemetrySignal


class SimilaritySearchRequest(BaseModel):
    """Input for running a similarity search against the application corpus."""

    model_config = ConfigDict(str_strip_whitespace=True)

    onboarding_request_id: UUID
    app_name: str = Field(min_length=1, max_length=255)
    app_code: str = Field(min_length=1, max_length=64)
    hosting_platform: HostingPlatform
    tech_stack: TechStack
    signals: list[TelemetrySignal] = Field(min_length=1)
    portfolio: str | None = None
    max_results: int = Field(default=5, ge=1, le=20)


class SimilarityMatchResult(BaseModel):
    """A single similarity-match result returned to the frontend."""

    rank: int = Field(ge=1)
    app_name: str
    app_code: str
    score: float = Field(ge=0.0, le=1.0)
    match_reasons: list[str] = Field(default_factory=list)
    exporters: list[dict[str, Any]] = Field(default_factory=list)
    dashboards: list[dict[str, Any]] = Field(default_factory=list)
    alert_rules: list[dict[str, Any]] = Field(default_factory=list)
    playbooks: list[dict[str, Any]] = Field(default_factory=list)
    pitfalls: list[dict[str, Any]] = Field(default_factory=list)


class SimilaritySearchResponse(BaseModel):
    """Response envelope for a similarity search."""

    model_config = ConfigDict(from_attributes=True)

    onboarding_request_id: UUID
    matches: list[SimilarityMatchResult] = Field(default_factory=list)
    total_matches: int = Field(ge=0)
    search_strategy: str = Field(
        description="Strategy used: 'vector', 'hybrid', 'keyword_fallback'.",
        examples=["vector"],
    )
