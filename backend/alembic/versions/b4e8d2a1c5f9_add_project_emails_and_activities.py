"""add project_emails and project_activities

Revision ID: b4e8d2a1c5f9
Revises: 2c8f1a9b4e3d
Create Date: 2026-06-19 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b4e8d2a1c5f9"
down_revision: Union[str, Sequence[str], None] = "a3f7b2c1d4e8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "project_emails",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("project_id", sa.String(length=32), nullable=False),
        sa.Column("sender_user_id", sa.String(length=32), nullable=False),
        sa.Column("subject", sa.String(length=512), nullable=False),
        sa.Column("recipients", sa.Text(), nullable=False),
        sa.Column("cc", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("bcc", sa.Text(), nullable=False, server_default="[]"),
        sa.Column("message_id", sa.String(length=512), nullable=True),
        sa.Column("conversation_id", sa.String(length=512), nullable=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=16), nullable=False),
        sa.Column("attachment_count", sa.Integer(), nullable=False, server_default="0"),
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
        sa.ForeignKeyConstraint(
            ["sender_user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_project_emails_organization_id"),
        "project_emails",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_project_emails_project_id"),
        "project_emails",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_project_emails_sender_user_id"),
        "project_emails",
        ["sender_user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_project_emails_status"),
        "project_emails",
        ["status"],
        unique=False,
    )

    op.create_table(
        "project_activities",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("project_id", sa.String(length=32), nullable=False),
        sa.Column("user_id", sa.String(length=32), nullable=False),
        sa.Column("activity_type", sa.String(length=64), nullable=False),
        sa.Column("summary", sa.String(length=512), nullable=False),
        sa.Column("metadata_json", sa.Text(), nullable=True),
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
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_project_activities_organization_id"),
        "project_activities",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_project_activities_project_id"),
        "project_activities",
        ["project_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_project_activities_user_id"),
        "project_activities",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_project_activities_activity_type"),
        "project_activities",
        ["activity_type"],
        unique=False,
    )
    op.create_index(
        op.f("ix_project_activities_created_at"),
        "project_activities",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_project_activities_created_at"), table_name="project_activities")
    op.drop_index(op.f("ix_project_activities_activity_type"), table_name="project_activities")
    op.drop_index(op.f("ix_project_activities_user_id"), table_name="project_activities")
    op.drop_index(op.f("ix_project_activities_project_id"), table_name="project_activities")
    op.drop_index(op.f("ix_project_activities_organization_id"), table_name="project_activities")
    op.drop_table("project_activities")

    op.drop_index(op.f("ix_project_emails_status"), table_name="project_emails")
    op.drop_index(op.f("ix_project_emails_sender_user_id"), table_name="project_emails")
    op.drop_index(op.f("ix_project_emails_project_id"), table_name="project_emails")
    op.drop_index(op.f("ix_project_emails_organization_id"), table_name="project_emails")
    op.drop_table("project_emails")
