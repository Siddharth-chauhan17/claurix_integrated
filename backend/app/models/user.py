"""User model — internal usr_* id is the only system identity."""

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("organization_id", "employee_id", name="uq_users_org_employee_id"),
        UniqueConstraint("email", name="uq_users_email"),
        UniqueConstraint("google_id", name="uq_users_google_id"),
    )

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    google_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    organization_id: Mapped[str] = mapped_column(
        String(32),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    employee_id: Mapped[str] = mapped_column(String(64), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    password_hash: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email!r})>"
