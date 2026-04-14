"""Coverage & Adoption schemas."""

from __future__ import annotations

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.cmdb import CMDBAppRecord

SIGNALS: list[str] = ["metrics", "logs", "traces", "profiles", "faro", "synthetics"]


class SignalCoverage(BaseModel):
    signal: str
    total_apps: int = 0
    onboarded: int = 0
    coverage_pct: float = 0.0
    volume_metric_name: str | None = None
    volume_metric_value: float | None = None


class ScopeCoverage(BaseModel):
    scope_type: str
    scope_key: str
    total_apps: int = 0
    apps_onboarded_any: int = 0
    coverage_pct_any: float = 0.0
    coverage_pct_full_stack: float = 0.0
    per_signal: list[SignalCoverage] = Field(default_factory=list)


class PortfolioCoverage(BaseModel):
    portfolio: str
    vp_name: str | None = None
    vp_email: str | None = None
    total_apps: int = 0
    onboarded: int = 0
    gap: int = 0
    coverage_pct_any: float = 0.0
    per_signal: list[SignalCoverage] = Field(default_factory=list)


class VpCoverage(BaseModel):
    vp_name: str | None = None
    vp_email: str | None = None
    portfolios: list[str] = Field(default_factory=list)
    total_apps: int = 0
    onboarded: int = 0
    coverage_pct_any: float = 0.0
    per_signal: list[SignalCoverage] = Field(default_factory=list)


class LeadershipCoverageResponse(BaseModel):
    snapshot_date: date
    global_scope: ScopeCoverage = Field(alias="global")
    portfolios: list[PortfolioCoverage] = Field(default_factory=list)
    vps: list[VpCoverage] = Field(default_factory=list)

    model_config = ConfigDict(populate_by_name=True)


class LgtmAppCoverageRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    app_code: str
    signal: str
    is_onboarded: bool
    tenant_id: str | None = None
    active_series_count: int | None = None
    log_volume_bytes_per_day: int | None = None
    span_rate_per_sec: float | None = None
    profile_rate_per_sec: float | None = None
    faro_sessions_per_day: int | None = None
    synthetics_url_count: int | None = None
    last_sample_at: datetime | None = None
    source_probe: str | None = None
    collected_at: datetime


class AppCoverageDetail(BaseModel):
    app_code: str
    app_name: str
    portfolio: str | None = None
    vp_name: str | None = None
    manager_name: str | None = None
    architect_name: str | None = None
    per_signal: list[LgtmAppCoverageRecord] = Field(default_factory=list)
    onboarding_status: str | None = None


class CoverageTrendPoint(BaseModel):
    snapshot_date: date
    coverage_pct_any: float
    coverage_pct_full_stack: float


class CoverageRefreshResponse(BaseModel):
    run_id: UUID
    status: str
    message: str


class CoverageGapsResponse(BaseModel):
    items: list[CMDBAppRecord] = Field(default_factory=list)
    total: int = 0
