"""Outbound project emails sent via Microsoft Graph."""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

EMAIL_STATUS_DRAFT = "draft"
EMAIL_STATUS_SENT = "sent"
EMAIL_STATUS_FAILED = "failed"


class ProjectEmail(Base):
    __tablename__ = "project_emails"

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
    sender_user_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    subject: Mapped[str] = mapped_column(String(512), nullable=False)
    recipients: Mapped[str] = mapped_column(Text, nullable=False)
    cc: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    bcc: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    message_id: Mapped[str | None] = mapped_column(String(512), nullable=True)
    conversation_id: Mapped[str | None] = mapped_column(String(512), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(String(16), nullable=False, index=True)
    attachment_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    body_html: Mapped[str | None] = mapped_column(Text, nullable=True)
    attachment_ids: Mapped[str | None] = mapped_column(Text, nullable=True)
    inline_attachments: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
