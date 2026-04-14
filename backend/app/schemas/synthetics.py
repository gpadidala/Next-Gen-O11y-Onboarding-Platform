"""Synthetics (Blackbox) schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SyntheticUrlRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    app_code: str
    url: str
    module: str
    region: str | None = None
    interval_seconds: int = 60
    is_active: bool = True
    last_success_at: datetime | None = None
    last_probe_at: datetime | None = None


class SyntheticUrlListResponse(BaseModel):
    items: list[SyntheticUrlRecord] = Field(default_factory=list)
    total: int = 0


class SyntheticsSummary(BaseModel):
    total_urls: int = 0
    active_urls: int = 0
    apps_covered: int = 0
    success_rate_30d: float = 0.0
