"""add project email draft body and attachment fields

Revision ID: c7e8f9a0b1c2
Revises: b4e8d2a1c5f9
Create Date: 2026-06-24 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c7e8f9a0b1c2"
down_revision: Union[str, Sequence[str], None] = "b4e8d2a1c5f9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("project_emails", sa.Column("body_html", sa.Text(), nullable=True))
    op.add_column(
        "project_emails",
        sa.Column("attachment_ids", sa.Text(), nullable=True),
    )
    op.add_column(
        "project_emails",
        sa.Column("inline_attachments", sa.Text(), nullable=True),
    )
    op.add_column(
        "project_emails",
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("project_emails", "updated_at")
    op.drop_column("project_emails", "inline_attachments")
    op.drop_column("project_emails", "attachment_ids")
    op.drop_column("project_emails", "body_html")
