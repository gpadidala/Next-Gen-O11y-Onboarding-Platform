"""Pydantic schemas for the capacity-check subsystem."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.common import CapacityStatus, HostingPlatform, TelemetrySignal


class CapacityCheckRequest(BaseModel):
    """Input for running a capacity check against the infrastructure."""

    model_config = ConfigDict(str_strip_whitespace=True)

    onboarding_request_id: UUID
    hosting_platform: HostingPlatform
    signals: list[TelemetrySignal] = Field(min_length=1)
    estimated_series_count: int | None = Field(default=None, ge=0)
    estimated_log_gb_per_day: float | None = Field(default=None, ge=0)
    estimated_spans_per_second: int | None = Field(default=None, ge=0)
    metadata: dict[str, Any] = Field(default_factory=dict)


class SignalCapacity(BaseModel):
    """Per-signal capacity assessment result."""

    signal: TelemetrySignal
    status: CapacityStatus
    current_utilization_pct: float = Field(
        ge=0,
        le=100,
        description="Current utilisation percentage of the signal backend.",
    )
    projected_utilization_pct: float = Field(
        ge=0,
        le=200,
        description="Projected utilisation after onboarding this application.",
    )
    headroom_pct: float = Field(
        description="Remaining headroom (negative means over-provisioned).",
    )
    message: str = Field(description="Human-readable status explanation.")
    details: dict[str, Any] = Field(default_factory=dict)


class CapacityCheckResponse(BaseModel):
    """Aggregate capacity-check result returned to the frontend."""

    model_config = ConfigDict(from_attributes=True)

    onboarding_request_id: UUID
    overall_status: CapacityStatus
    signals: dict[str, SignalCapacity] = Field(
        description="Keyed by signal name (e.g. 'metrics', 'logs').",
    )
    recommendations: list[str] = Field(default_factory=list)
    can_proceed: bool
    escalation_required: bool
