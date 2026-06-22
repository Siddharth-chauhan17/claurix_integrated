"""Tracks Outlook attachment imports into a project."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ProjectEmailImport(Base):
    __tablename__ = "project_email_imports"
    __table_args__ = (
        UniqueConstraint(
            "project_id",
            "message_id",
            "attachment_id",
            name="uq_project_email_imports_project_message_attachment",
        ),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    organization_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    message_id: Mapped[str] = mapped_column(String(512), nullable=False)
    attachment_id: Mapped[str] = mapped_column(String(512), nullable=False)
    document_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("project_documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_type: Mapped[str] = mapped_column(String(16), nullable=False)
    imported_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
