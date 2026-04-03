"""Pydantic schemas for artefact generation and preview."""

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import ArtifactType


class CRPayload(BaseModel):
    """Change Request payload for ServiceNow."""

    title: str = Field(min_length=1, max_length=255)
    description: str
    risk_level: str = Field(examples=["low", "medium", "high"])
    change_type: str = Field(default="standard", examples=["standard", "normal", "emergency"])
    implementation_plan: str | None = None
    rollback_plan: str | None = None
    test_plan: str | None = None
    assigned_group: str | None = None
    scheduled_start: datetime | None = None
    scheduled_end: datetime | None = None


class EpicPayload(BaseModel):
    """Epic payload for Jira."""

    summary: str = Field(min_length=1, max_length=255)
    description: str
    project_key: str = Field(min_length=1, max_length=32)
    labels: list[str] = Field(default_factory=list)
    priority: str = Field(default="Medium", examples=["High", "Medium", "Low"])
    components: list[str] = Field(default_factory=list)
    custom_fields: dict[str, Any] = Field(default_factory=dict)


class StoryPayload(BaseModel):
    """Story / Task payload for Jira."""

    summary: str = Field(min_length=1, max_length=255)
    description: str
    project_key: str = Field(min_length=1, max_length=32)
    epic_key: str | None = None
    story_points: int | None = Field(default=None, ge=1, le=21)
    labels: list[str] = Field(default_factory=list)
    priority: str = Field(default="Medium")
    acceptance_criteria: str | None = None
    assignee: str | None = None


class ArtifactGenerateRequest(BaseModel):
    """Request to generate one or more artefacts for an onboarding request."""

    model_config = ConfigDict(str_strip_whitespace=True)

    onboarding_request_id: UUID
    artifact_types: list[ArtifactType] = Field(min_length=1)
    options: dict[str, Any] = Field(
        default_factory=dict,
        description="Generation options (e.g. target Jira project, CR template).",
    )


class ArtifactPreviewResponse(BaseModel):
    """Preview of a generated artefact before submission to the external system."""

    artifact_type: ArtifactType
    payload: dict[str, Any]
    rendered_summary: str = Field(description="Human-readable preview text.")
    warnings: list[str] = Field(default_factory=list)


class ArtifactResponse(BaseModel):
    """Full artefact response including external sync status."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    onboarding_request_id: UUID
    artifact_type: ArtifactType
    external_id: str | None
    external_url: str | None
    payload: dict[str, Any]
    status: str
    error_message: str | None
    created_at: datetime
    updated_at: datetime
