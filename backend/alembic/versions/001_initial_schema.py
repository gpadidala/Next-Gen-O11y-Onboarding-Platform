"""Initial schema.

Revision ID: 001
Revises:
Create Date: 2026-04-02
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: str | None = None
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    # pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # Onboarding requests
    op.create_table(
        "onboarding_requests",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("app_name", sa.String(100), nullable=False),
        sa.Column("app_code", sa.String(20), nullable=False, unique=True, index=True),
        sa.Column("portfolio", sa.String(100), nullable=False),
        sa.Column("hosting_platform", sa.String(50), nullable=False),
        sa.Column("tech_stack", sa.String(50), nullable=False),
        sa.Column("status", sa.String(30), nullable=False, server_default="DRAFT"),
        sa.Column("alert_owner_email", sa.String(255), nullable=False),
        sa.Column("alert_owner_team", sa.String(100), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Application metadata (CMDB mirror)
    op.create_table(
        "application_metadata",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("app_code", sa.String(20), nullable=False, unique=True, index=True),
        sa.Column("app_name", sa.String(200), nullable=False),
        sa.Column("portfolio", sa.String(100), nullable=False),
        sa.Column("business_criticality", sa.String(20), nullable=True),
        sa.Column("owner_name", sa.String(200), nullable=True),
        sa.Column("owner_email", sa.String(255), nullable=True),
        sa.Column("environments", postgresql.JSON(), nullable=True),
        sa.Column("tags", postgresql.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Telemetry scope
    op.create_table(
        "telemetry_scopes",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("onboarding_id", sa.Uuid(), sa.ForeignKey("onboarding_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("signals", postgresql.JSON(), nullable=False),
        sa.Column("environment_matrix", postgresql.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Technical config
    op.create_table(
        "technical_configs",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("onboarding_id", sa.Uuid(), sa.ForeignKey("onboarding_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("config_data", postgresql.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Environment readiness
    op.create_table(
        "environment_readiness",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("onboarding_id", sa.Uuid(), sa.ForeignKey("onboarding_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("dev_ready", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("qa_ready", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("qa2_ready", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("prod_ready", sa.Boolean(), server_default=sa.text("true")),
        sa.Column("signal_env_matrix", postgresql.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Capacity assessments
    op.create_table(
        "capacity_assessments",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("onboarding_id", sa.Uuid(), sa.ForeignKey("onboarding_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("overall_status", sa.String(10), nullable=False),
        sa.Column("signal_results", postgresql.JSON(), nullable=False),
        sa.Column("recommendations", postgresql.JSON(), nullable=True),
        sa.Column("can_proceed", sa.Boolean(), nullable=False),
        sa.Column("escalation_required", sa.Boolean(), server_default=sa.text("false")),
        sa.Column("assessed_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Similarity matches
    op.create_table(
        "similarity_matches",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("onboarding_id", sa.Uuid(), sa.ForeignKey("onboarding_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("rank", sa.Integer(), nullable=False),
        sa.Column("matched_app_name", sa.String(200), nullable=False),
        sa.Column("matched_app_code", sa.String(20), nullable=False),
        sa.Column("score", sa.Float(), nullable=False),
        sa.Column("match_reasons", postgresql.JSON(), nullable=True),
        sa.Column("exporters", postgresql.JSON(), nullable=True),
        sa.Column("dashboards", postgresql.JSON(), nullable=True),
        sa.Column("alert_rules", postgresql.JSON(), nullable=True),
        sa.Column("playbooks", postgresql.JSON(), nullable=True),
        sa.Column("pitfalls", postgresql.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Artifacts (CR, Jira issues)
    op.create_table(
        "artifacts",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("onboarding_id", sa.Uuid(), sa.ForeignKey("onboarding_requests.id", ondelete="CASCADE"), nullable=False),
        sa.Column("artifact_type", sa.String(20), nullable=False),
        sa.Column("external_id", sa.String(100), nullable=True),
        sa.Column("external_url", sa.String(500), nullable=True),
        sa.Column("payload", postgresql.JSON(), nullable=False),
        sa.Column("status", sa.String(30), server_default="DRAFT"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # Audit log
    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("entity_type", sa.String(100), nullable=False),
        sa.Column("entity_id", sa.String(100), nullable=False),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("actor", sa.String(255), nullable=True),
        sa.Column("changes", postgresql.JSON(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), index=True),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("artifacts")
    op.drop_table("similarity_matches")
    op.drop_table("capacity_assessments")
    op.drop_table("environment_readiness")
    op.drop_table("technical_configs")
    op.drop_table("telemetry_scopes")
    op.drop_table("application_metadata")
    op.drop_table("onboarding_requests")
    op.execute("DROP EXTENSION IF EXISTS vector")
