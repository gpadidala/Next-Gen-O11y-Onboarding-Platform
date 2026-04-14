"""CMDB-related Pydantic schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class CMDBAppRecord(BaseModel):
    """Read-only projection of application_metadata used by CMDB endpoints."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    app_code: str
    app_name: str
    portfolio: str
    sub_portfolio: str | None = None
    description: str | None = None
    business_criticality: str | None = None
    hosting_platform: str | None = None
    tech_stack: str | None = None

    vp_name: str | None = None
    vp_email: str | None = None
    director_name: str | None = None
    manager_name: str | None = None
    manager_email: str | None = None
    architect_name: str | None = None
    architect_email: str | None = None
    product_owner: str | None = None
    lob: str | None = None
    region: str | None = None

    owner_name: str | None = None
    owner_email: str | None = None
    owner_team: str | None = None
    cost_center: str | None = None

    environments: list[str] | dict | None = None
    tags: dict | None = None
    cmdb_id: str | None = None
    cmdb_sync_source: str | None = None
    cmdb_last_synced_at: datetime | None = None
    retired: bool = False
    latest_onboarding_id: UUID | None = None


class CMDBAppListResponse(BaseModel):
    items: list[CMDBAppRecord] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 50


class CMDBSyncRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_id: str
    status: str
    started_at: datetime
    finished_at: datetime | None = None
    apps_upserted: int = 0
    apps_retired: int = 0
    error_message: str | None = None


class CMDBSyncTriggerResponse(BaseModel):
    run_id: UUID
    status: str
    message: str
