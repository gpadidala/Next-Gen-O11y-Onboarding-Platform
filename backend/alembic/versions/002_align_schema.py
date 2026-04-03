"""Align child table schemas with ORM models.

Revision ID: 002
Revises: 001
Create Date: 2026-04-02

Changes:
- Rename onboarding_id -> onboarding_request_id in all child tables
- Rename telemetry_scopes.signals -> selected_signals
- Add updated_at to all child tables
- Add created_at + updated_at to capacity_assessments
- Add generated_by, config_version to technical_configs
- Restructure environment_readiness (per-env/signal rows)
- Change capacity_assessments.recommendations JSON -> Text
- Add error_message to artifacts
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision: str = "002"
down_revision: str | None = "001"
branch_labels: tuple[str, ...] | None = None
depends_on: str | None = None


def upgrade() -> None:
    # Clear seed data from child tables (development env — safe to truncate)
    op.execute("DELETE FROM artifacts")
    op.execute("DELETE FROM similarity_matches")
    op.execute("DELETE FROM capacity_assessments")
    op.execute("DELETE FROM environment_readiness")
    op.execute("DELETE FROM technical_configs")
    op.execute("DELETE FROM telemetry_scopes")

    # ── 1. Rename onboarding_id → onboarding_request_id ───────────────────
    child_tables = [
        "telemetry_scopes",
        "technical_configs",
        "environment_readiness",
        "capacity_assessments",
        "similarity_matches",
        "artifacts",
    ]
    for table in child_tables:
        op.alter_column(table, "onboarding_id", new_column_name="onboarding_request_id")

    # ── 2. telemetry_scopes: rename signals → selected_signals ─────────────
    op.alter_column("telemetry_scopes", "signals", new_column_name="selected_signals")

    # ── 3. Add updated_at to child tables that only have created_at ────────
    tables_needing_updated_at = [
        "telemetry_scopes",
        "technical_configs",
        "environment_readiness",
        "similarity_matches",
        "artifacts",
    ]
    for table in tables_needing_updated_at:
        op.add_column(
            table,
            sa.Column(
                "updated_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )

    # ── 4. capacity_assessments: add created_at + updated_at ──────────────
    op.add_column(
        "capacity_assessments",
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.add_column(
        "capacity_assessments",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

    # ── 5. technical_configs: add generated_by + config_version ───────────
    op.add_column(
        "technical_configs",
        sa.Column("generated_by", sa.String(64), nullable=True),
    )
    op.add_column(
        "technical_configs",
        sa.Column("config_version", sa.String(32), nullable=True),
    )

    # ── 6. environment_readiness: drop flat columns, add per-row cols ──────
    for col in ("dev_ready", "qa_ready", "qa2_ready", "prod_ready", "signal_env_matrix"):
        op.drop_column("environment_readiness", col)

    op.add_column(
        "environment_readiness",
        sa.Column("environment", sa.String(64), nullable=False, server_default="prod"),
    )
    op.add_column(
        "environment_readiness",
        sa.Column("signal", sa.String(64), nullable=False, server_default="metrics"),
    )
    op.add_column(
        "environment_readiness",
        sa.Column("ready", sa.Boolean, nullable=False, server_default=sa.text("false")),
    )
    op.add_column(
        "environment_readiness",
        sa.Column("notes", sa.String(512), nullable=True),
    )
    # Remove server defaults now that new columns are created
    op.alter_column("environment_readiness", "environment", server_default=None)
    op.alter_column("environment_readiness", "signal", server_default=None)
    op.alter_column("environment_readiness", "ready", server_default=None)

    # ── 7. capacity_assessments.recommendations: JSON → Text ──────────────
    op.alter_column(
        "capacity_assessments",
        "recommendations",
        type_=sa.Text(),
        postgresql_using="recommendations::text",
        existing_nullable=True,
    )

    # ── 8. artifacts: add error_message ───────────────────────────────────
    op.add_column(
        "artifacts",
        sa.Column("error_message", sa.Text, nullable=True),
    )


def downgrade() -> None:
    # Reverse in opposite order — structural downgrade only for reference
    op.drop_column("artifacts", "error_message")

    op.alter_column(
        "capacity_assessments",
        "recommendations",
        type_=sa.dialects.postgresql.JSON(),
        postgresql_using="recommendations::json",
        existing_nullable=True,
    )

    op.drop_column("environment_readiness", "notes")
    op.drop_column("environment_readiness", "ready")
    op.drop_column("environment_readiness", "signal")
    op.drop_column("environment_readiness", "environment")
    op.add_column("environment_readiness", sa.Column("signal_env_matrix", sa.dialects.postgresql.JSON(), nullable=True))
    op.add_column("environment_readiness", sa.Column("prod_ready", sa.Boolean, server_default=sa.text("true")))
    op.add_column("environment_readiness", sa.Column("qa2_ready", sa.Boolean, server_default=sa.text("false")))
    op.add_column("environment_readiness", sa.Column("qa_ready", sa.Boolean, server_default=sa.text("false")))
    op.add_column("environment_readiness", sa.Column("dev_ready", sa.Boolean, server_default=sa.text("false")))

    op.drop_column("capacity_assessments", "updated_at")
    op.drop_column("capacity_assessments", "created_at")

    for table in ["telemetry_scopes", "technical_configs", "environment_readiness", "similarity_matches", "artifacts"]:
        op.drop_column(table, "updated_at")

    op.drop_column("technical_configs", "config_version")
    op.drop_column("technical_configs", "generated_by")

    op.alter_column("telemetry_scopes", "selected_signals", new_column_name="signals")

    for table in ["telemetry_scopes", "technical_configs", "environment_readiness",
                  "capacity_assessments", "similarity_matches", "artifacts"]:
        op.alter_column(table, "onboarding_request_id", new_column_name="onboarding_id")
