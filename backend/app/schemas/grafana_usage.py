"""Grafana RBAC usage schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class GrafanaTeamUsage(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    org_id: int
    team_id: int
    team_name: str
    mapped_app_code: str | None = None
    mapped_portfolio: str | None = None
    member_count: int = 0
    active_users_30d: int = 0
    dashboard_count: int = 0
    dashboard_views_30d: int = 0
    last_activity_at: datetime | None = None
    collected_at: datetime


class GrafanaTeamListResponse(BaseModel):
    items: list[GrafanaTeamUsage] = Field(default_factory=list)
    total: int = 0
    page: int = 1
    page_size: int = 50


class GrafanaUsageSummary(BaseModel):
    total_orgs: int = 0
    total_teams: int = 0
    active_teams_30d: int = 0
    total_users: int = 0
    active_users_30d: int = 0
    total_dashboards: int = 0
    dashboards_viewed_30d: int = 0
    team_adoption_pct: float = 0.0


class GrafanaUsageCoverageResponse(BaseModel):
    total_cmdb_apps: int = 0
    apps_with_mapped_team: int = 0
    team_coverage_pct: float = 0.0
    unmapped_app_codes: list[str] = Field(default_factory=list)
