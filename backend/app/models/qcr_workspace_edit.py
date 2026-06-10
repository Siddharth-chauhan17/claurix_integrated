"""Broker-edited QCR clause snapshot — one row per project (latest save wins)."""

from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class QcrWorkspaceEdit(Base):
    __tablename__ = "qcr_workspace_edits"

    project_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True,
    )
    workspace_id: Mapped[str] = mapped_column(String(64), nullable=False)
    clauses: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False)
    updated_by: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
