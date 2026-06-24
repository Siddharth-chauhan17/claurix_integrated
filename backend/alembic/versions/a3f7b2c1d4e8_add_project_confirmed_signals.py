"""add project_confirmed_signals

Revision ID: a3f7b2c1d4e8
Revises: 2c8f1a9b4e3d
Create Date: 2026-06-18 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a3f7b2c1d4e8"
down_revision: Union[str, Sequence[str], None] = "2c8f1a9b4e3d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "project_confirmed_signals",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("project_id", sa.String(length=32), nullable=False),
        sa.Column("signal_type", sa.String(length=32), nullable=False),
        sa.Column("signal_value", sa.String(length=512), nullable=False),
        sa.Column("source_message_id", sa.String(length=512), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "project_id",
            "signal_type",
            "signal_value",
            name="uq_project_confirmed_signals_project_type_value",
        ),
    )
    op.create_index(
        "ix_project_confirmed_signals_organization_id",
        "project_confirmed_signals",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_project_confirmed_signals_project_id",
        "project_confirmed_signals",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        "ix_project_confirmed_signals_signal_type",
        "project_confirmed_signals",
        ["signal_type"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_project_confirmed_signals_signal_type",
        table_name="project_confirmed_signals",
    )
    op.drop_index(
        "ix_project_confirmed_signals_project_id",
        table_name="project_confirmed_signals",
    )
    op.drop_index(
        "ix_project_confirmed_signals_organization_id",
        table_name="project_confirmed_signals",
    )
    op.drop_table("project_confirmed_signals")
