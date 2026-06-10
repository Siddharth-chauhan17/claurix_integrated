"""Demo request leads from the public Request Demo form."""

from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DemoRequest(Base):
    __tablename__ = "demo_requests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    work_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    job_role: Mapped[str] = mapped_column(String(128), nullable=False)
    qcr_generation_method: Mapped[str] = mapped_column(String(128), nullable=False)
    monthly_quote_volume: Mapped[str] = mapped_column(String(64), nullable=False)
    operational_challenges: Mapped[list[str]] = mapped_column(
        ARRAY(String(128)), nullable=False
    )
    lines_of_business: Mapped[list[str]] = mapped_column(ARRAY(String(128)), nullable=False)
    review_team_size: Mapped[str] = mapped_column(String(64), nullable=False)
    preferred_demo_date: Mapped[date] = mapped_column(Date, nullable=False)
    preferred_time_window: Mapped[str] = mapped_column(String(32), nullable=False)
    requested_demo_topics: Mapped[list[str]] = mapped_column(
        ARRAY(String(128)), nullable=False
    )
    additional_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    def __repr__(self) -> str:
        return f"<DemoRequest(id={self.id}, work_email={self.work_email!r})>"
