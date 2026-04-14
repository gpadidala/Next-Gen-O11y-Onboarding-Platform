"""Coverage & Adoption models — LGTM ingestion snapshots and leadership rollups."""

from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Float, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class LgtmAppCoverage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Per-app / per-signal materialised snapshot of what LGTM is actually ingesting.

    One row per ``(app_code, signal)`` pair. Refreshed by scheduled probes
    against Mimir / Loki / Tempo / Pyroscope / Faro / Blackbox.
    """

    __tablename__ = "lgtm_app_coverage"
    __table_args__ = (
        Index(
            "ix_lgtm_coverage_app_signal",
            "app_code",
            "signal",
            unique=True,
        ),
        Index("ix_lgtm_coverage_app_code", "app_code"),
        Index("ix_lgtm_coverage_signal_onboarded", "signal", "is_onboarded"),
    )

    app_code: Mapped[str] = mapped_column(String(64), nullable=False)
    signal: Mapped[str] = mapped_column(String(32), nullable=False)
    is_onboarded: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
    tenant_id: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Per-signal volume metrics (only one is populated per row, keyed by ``signal``)
    active_series_count: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    log_volume_bytes_per_day: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    span_rate_per_sec: Mapped[float | None] = mapped_column(Float, nullable=True)
    profile_rate_per_sec: Mapped[float | None] = mapped_column(Float, nullable=True)
    faro_sessions_per_day: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    synthetics_url_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    last_sample_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    source_probe: Mapped[str | None] = mapped_column(String(128), nullable=True)
    collected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    def __repr__(self) -> str:
        return (
            f"<LgtmAppCoverage {self.app_code!r} signal={self.signal!r} "
            f"onboarded={self.is_onboarded}>"
        )


class SyntheticUrl(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Per-URL blackbox exporter target registry."""

    __tablename__ = "synthetic_urls"
    __table_args__ = (
        Index(
            "ix_synthetic_urls_app_url_module",
            "app_code",
            "url",
            "module",
            unique=True,
        ),
        Index("ix_synthetic_urls_app_code", "app_code"),
    )

    app_code: Mapped[str] = mapped_column(String(64), nullable=False)
    url: Mapped[str] = mapped_column(String(1024), nullable=False)
    module: Mapped[str] = mapped_column(String(64), nullable=False)
    region: Mapped[str | None] = mapped_column(String(64), nullable=True)
    interval_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=60)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    last_success_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_probe_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )


class GrafanaRbacUsage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Per-team Grafana RBAC activity aggregate. Counts only, never PII."""

    __tablename__ = "grafana_rbac_usage"
    __table_args__ = (
        Index(
            "ix_grafana_rbac_org_team",
            "org_id",
            "team_id",
            unique=True,
        ),
        Index("ix_grafana_rbac_mapped_app_code", "mapped_app_code"),
    )

    org_id: Mapped[int] = mapped_column(Integer, nullable=False)
    team_id: Mapped[int] = mapped_column(Integer, nullable=False)
    team_name: Mapped[str] = mapped_column(String(255), nullable=False)
    mapped_app_code: Mapped[str | None] = mapped_column(String(64), nullable=True)
    mapped_portfolio: Mapped[str | None] = mapped_column(String(128), nullable=True)
    member_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    active_users_30d: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    dashboard_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    dashboard_views_30d: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    last_activity_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    collected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )


class CoverageRollupSnapshot(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Pre-aggregated daily rollup for fast leadership dashboards.

    Keyed by ``(snapshot_date, scope_type, scope_key)``. All coverage
    percentages are computed at rollup time, never at read time.
    """

    __tablename__ = "coverage_rollup_snapshots"
    __table_args__ = (
        Index(
            "ix_coverage_rollup_unique",
            "snapshot_date",
            "scope_type",
            "scope_key",
            unique=True,
        ),
        Index("ix_coverage_rollup_date", "snapshot_date"),
    )

    snapshot_date: Mapped[date] = mapped_column(Date, nullable=False)
    scope_type: Mapped[str] = mapped_column(String(32), nullable=False)
    scope_key: Mapped[str] = mapped_column(String(255), nullable=False)

    total_apps: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    apps_onboarded_any: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    apps_onboarded_metrics: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    apps_onboarded_logs: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    apps_onboarded_traces: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    apps_onboarded_profiles: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    apps_onboarded_faro: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    apps_onboarded_synthetics: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )

    coverage_pct_any: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    coverage_pct_full_stack: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )


class CmdbSyncRun(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Audit row for each CMDB full-sync / coverage-refresh job run."""

    __tablename__ = "cmdb_sync_runs"
    __table_args__ = (Index("ix_cmdb_sync_runs_started_at", "started_at"),)

    job_id: Mapped[str] = mapped_column(
        String(64), nullable=False, default="cmdb_full_sync"
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="running")
    apps_upserted: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    apps_retired: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
