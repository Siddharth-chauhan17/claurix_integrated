"""add project_email_imports

Revision ID: 2c8f1a9b4e3d
Revises: 1b6aead00dab
Create Date: 2026-06-22 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "2c8f1a9b4e3d"
down_revision: Union[str, Sequence[str], None] = "1b6aead00dab"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "project_email_imports",
        sa.Column("id", sa.String(length=32), nullable=False),
        sa.Column("organization_id", sa.String(length=32), nullable=False),
        sa.Column("project_id", sa.String(length=32), nullable=False),
        sa.Column("message_id", sa.String(length=512), nullable=False),
        sa.Column("attachment_id", sa.String(length=512), nullable=False),
        sa.Column("document_id", sa.String(length=32), nullable=False),
        sa.Column("document_type", sa.String(length=16), nullable=False),
        sa.Column("imported_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["document_id"],
            ["project_documents.id"],
            ondelete="CASCADE",
        ),
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
            "message_id",
            "attachment_id",
            name="uq_project_email_imports_project_message_attachment",
        ),
    )
    op.create_index(
        op.f("ix_project_email_imports_document_id"),
        "project_email_imports",
        ["document_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_project_email_imports_organization_id"),
        "project_email_imports",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_project_email_imports_project_id"),
        "project_email_imports",
        ["project_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_project_email_imports_project_id"),
        table_name="project_email_imports",
    )
    op.drop_index(
        op.f("ix_project_email_imports_organization_id"),
        table_name="project_email_imports",
    )
    op.drop_index(
        op.f("ix_project_email_imports_document_id"),
        table_name="project_email_imports",
    )
    op.drop_table("project_email_imports")
