"""Add v2 Coverage & Adoption schema.

Revision ID: 003
Revises: 002
Create Date: 2026-04-13

Changes:
- Extend application_metadata with leadership hierarchy columns
  (vp_name, vp_email, director_name, manager_name, manager_email,
  architect_name, architect_email, product_owner, lob, region,
  cmdb_last_synced_at)
- Create lgtm_app_coverage table
- Create synthetic_urls table
- Create grafana_rbac_usage table
- Create coverage_rollup_snapshots table
- Create cmdb_sync_runs table
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op

revision: str = "003"
down_revision: str | None = "002"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    # ── 0. Backfill v1 columns missing from the existing database ─────────
    # The live DB was bootstrapped from SQLAlchemy metadata rather than the
    # alembic migration chain, so several v1 columns referenced by the ORM
    # never landed. Add them here (all nullable, so the upgrade is safe).
    bind = op.get_bind()
    existing_cols = {
        row[0]
        for row in bind.execute(
            sa.text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'application_metadata'"
            )
        )
    }
    _v1_missing: list[tuple[str, sa.types.TypeEngine, bool]] = [
        ("sub_portfolio", sa.String(length=128), True),
        ("description", sa.Text(), True),
        ("hosting_platform", sa.String(length=64), True),
        ("tech_stack", sa.String(length=64), True),
        ("owner_team", sa.String(length=255), True),
        ("cost_center", sa.String(length=64), True),
        ("cmdb_id", sa.String(length=128), True),
        ("cmdb_sync_source", sa.String(length=64), True),
        ("retired", sa.Boolean(), False),
        ("latest_onboarding_id", sa.dialects.postgresql.UUID(as_uuid=True), True),
    ]
    for col_name, col_type, nullable in _v1_missing:
        if col_name in existing_cols:
            continue
        default = sa.text("false") if col_name == "retired" else None
        op.add_column(
            "application_metadata",
            sa.Column(
                col_name,
                col_type,
                nullable=nullable,
                server_default=default,
            ),
        )
    # Widen the v1 short varchar columns to match the ORM.
    op.alter_column(
        "application_metadata",
        "app_code",
        type_=sa.String(length=64),
        existing_nullable=False,
    )
    op.alter_column(
        "application_metadata",
        "app_name",
        type_=sa.String(length=255),
        existing_nullable=False,
    )
    op.alter_column(
        "application_metadata",
        "portfolio",
        type_=sa.String(length=128),
        existing_nullable=False,
    )
    op.alter_column(
        "application_metadata",
        "business_criticality",
        type_=sa.String(length=32),
        existing_nullable=True,
    )

    # ── 1. Extend application_metadata with leadership hierarchy ──────────
    op.add_column(
        "application_metadata",
        sa.Column("vp_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "application_metadata",
        sa.Column("vp_email", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "application_metadata",
        sa.Column("director_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "application_metadata",
        sa.Column("manager_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "application_metadata",
        sa.Column("manager_email", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "application_metadata",
        sa.Column("architect_name", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "application_metadata",
        sa.Column("architect_email", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "application_metadata",
        sa.Column("product_owner", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "application_metadata",
        sa.Column("lob", sa.String(length=128), nullable=True),
    )
    op.add_column(
        "application_metadata",
        sa.Column("region", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "application_metadata",
        sa.Column("cmdb_last_synced_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_app_metadata_vp_email", "application_metadata", ["vp_email"]
    )
    op.create_index(
        "ix_app_metadata_architect_email",
        "application_metadata",
        ["architect_email"],
    )

    # ── 2. lgtm_app_coverage ──────────────────────────────────────────────
    op.create_table(
        "lgtm_app_coverage",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("app_code", sa.String(length=64), nullable=False),
        sa.Column("signal", sa.String(length=32), nullable=False),
        sa.Column(
            "is_onboarded",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("tenant_id", sa.String(length=128), nullable=True),
        sa.Column("active_series_count", sa.BigInteger, nullable=True),
        sa.Column("log_volume_bytes_per_day", sa.BigInteger, nullable=True),
        sa.Column("span_rate_per_sec", sa.Float, nullable=True),
        sa.Column("profile_rate_per_sec", sa.Float, nullable=True),
        sa.Column("faro_sessions_per_day", sa.BigInteger, nullable=True),
        sa.Column("synthetics_url_count", sa.Integer, nullable=True),
        sa.Column("last_sample_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_probe", sa.String(length=128), nullable=True),
        sa.Column("collected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_lgtm_coverage_app_signal",
        "lgtm_app_coverage",
        ["app_code", "signal"],
        unique=True,
    )
    op.create_index(
        "ix_lgtm_coverage_app_code", "lgtm_app_coverage", ["app_code"]
    )
    op.create_index(
        "ix_lgtm_coverage_signal_onboarded",
        "lgtm_app_coverage",
        ["signal", "is_onboarded"],
    )

    # ── 3. synthetic_urls ─────────────────────────────────────────────────
    op.create_table(
        "synthetic_urls",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("app_code", sa.String(length=64), nullable=False),
        sa.Column("url", sa.String(length=1024), nullable=False),
        sa.Column("module", sa.String(length=64), nullable=False),
        sa.Column("region", sa.String(length=64), nullable=True),
        sa.Column(
            "interval_seconds", sa.Integer, nullable=False, server_default="60"
        ),
        sa.Column(
            "is_active",
            sa.Boolean,
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column("last_success_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_probe_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_synthetic_urls_app_url_module",
        "synthetic_urls",
        ["app_code", "url", "module"],
        unique=True,
    )
    op.create_index(
        "ix_synthetic_urls_app_code", "synthetic_urls", ["app_code"]
    )

    # ── 4. grafana_rbac_usage ─────────────────────────────────────────────
    op.create_table(
        "grafana_rbac_usage",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("org_id", sa.Integer, nullable=False),
        sa.Column("team_id", sa.Integer, nullable=False),
        sa.Column("team_name", sa.String(length=255), nullable=False),
        sa.Column("mapped_app_code", sa.String(length=64), nullable=True),
        sa.Column("mapped_portfolio", sa.String(length=128), nullable=True),
        sa.Column(
            "member_count", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column(
            "active_users_30d", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column(
            "dashboard_count", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column(
            "dashboard_views_30d",
            sa.BigInteger,
            nullable=False,
            server_default="0",
        ),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("collected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_grafana_rbac_org_team",
        "grafana_rbac_usage",
        ["org_id", "team_id"],
        unique=True,
    )
    op.create_index(
        "ix_grafana_rbac_mapped_app_code",
        "grafana_rbac_usage",
        ["mapped_app_code"],
    )

    # ── 5. coverage_rollup_snapshots ──────────────────────────────────────
    op.create_table(
        "coverage_rollup_snapshots",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("snapshot_date", sa.Date, nullable=False),
        sa.Column("scope_type", sa.String(length=32), nullable=False),
        sa.Column("scope_key", sa.String(length=255), nullable=False),
        sa.Column("total_apps", sa.Integer, nullable=False, server_default="0"),
        sa.Column(
            "apps_onboarded_any", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column(
            "apps_onboarded_metrics",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "apps_onboarded_logs", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column(
            "apps_onboarded_traces",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "apps_onboarded_profiles",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "apps_onboarded_faro", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column(
            "apps_onboarded_synthetics",
            sa.Integer,
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "coverage_pct_any", sa.Float, nullable=False, server_default="0"
        ),
        sa.Column(
            "coverage_pct_full_stack",
            sa.Float,
            nullable=False,
            server_default="0",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_coverage_rollup_unique",
        "coverage_rollup_snapshots",
        ["snapshot_date", "scope_type", "scope_key"],
        unique=True,
    )
    op.create_index(
        "ix_coverage_rollup_date",
        "coverage_rollup_snapshots",
        ["snapshot_date"],
    )

    # ── 6. cmdb_sync_runs ─────────────────────────────────────────────────
    op.create_table(
        "cmdb_sync_runs",
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "job_id",
            sa.String(length=64),
            nullable=False,
            server_default="cmdb_full_sync",
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "status",
            sa.String(length=32),
            nullable=False,
            server_default="running",
        ),
        sa.Column(
            "apps_upserted", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column(
            "apps_retired", sa.Integer, nullable=False, server_default="0"
        ),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_cmdb_sync_runs_started_at", "cmdb_sync_runs", ["started_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_cmdb_sync_runs_started_at", table_name="cmdb_sync_runs")
    op.drop_table("cmdb_sync_runs")

    op.drop_index(
        "ix_coverage_rollup_date", table_name="coverage_rollup_snapshots"
    )
    op.drop_index(
        "ix_coverage_rollup_unique", table_name="coverage_rollup_snapshots"
    )
    op.drop_table("coverage_rollup_snapshots")

    op.drop_index(
        "ix_grafana_rbac_mapped_app_code", table_name="grafana_rbac_usage"
    )
    op.drop_index("ix_grafana_rbac_org_team", table_name="grafana_rbac_usage")
    op.drop_table("grafana_rbac_usage")

    op.drop_index("ix_synthetic_urls_app_code", table_name="synthetic_urls")
    op.drop_index(
        "ix_synthetic_urls_app_url_module", table_name="synthetic_urls"
    )
    op.drop_table("synthetic_urls")

    op.drop_index(
        "ix_lgtm_coverage_signal_onboarded", table_name="lgtm_app_coverage"
    )
    op.drop_index("ix_lgtm_coverage_app_code", table_name="lgtm_app_coverage")
    op.drop_index("ix_lgtm_coverage_app_signal", table_name="lgtm_app_coverage")
    op.drop_table("lgtm_app_coverage")

    op.drop_index(
        "ix_app_metadata_architect_email", table_name="application_metadata"
    )
    op.drop_index(
        "ix_app_metadata_vp_email", table_name="application_metadata"
    )
    op.drop_column("application_metadata", "cmdb_last_synced_at")
    op.drop_column("application_metadata", "region")
    op.drop_column("application_metadata", "lob")
    op.drop_column("application_metadata", "product_owner")
    op.drop_column("application_metadata", "architect_email")
    op.drop_column("application_metadata", "architect_name")
    op.drop_column("application_metadata", "manager_email")
    op.drop_column("application_metadata", "manager_name")
    op.drop_column("application_metadata", "director_name")
    op.drop_column("application_metadata", "vp_email")
    op.drop_column("application_metadata", "vp_name")
