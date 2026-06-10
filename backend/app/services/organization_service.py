"""Organization persistence helpers."""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.organization import Organization
from app.models.user import User
from app.utils.ids import new_org_id


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def create_organization_with_domain(
    db: Session,
    *,
    domain: str,
    name: str,
    org_id: str | None = None,
) -> Organization:
    """Insert organization with collision retry on primary key."""
    now = utcnow()
    for _ in range(5):
        oid = org_id or new_org_id()
        org = Organization(
            id=oid,
            name=name.strip()[:255],
            domain=domain.strip().lower()[:255],
            created_at=now,
            updated_at=now,
        )
        db.add(org)
        try:
            db.flush()
            return org
        except IntegrityError:
            db.rollback()
            if org_id:
                raise
    raise RuntimeError("Failed to generate unique organization id")


def next_employee_id(db: Session, organization_id: str) -> str:
    """Human-facing employee code, unique within the organization."""
    count = db.execute(
        select(func.count()).select_from(User).where(User.organization_id == organization_id)
    ).scalar_one()
    return f"EMP{count + 1:03d}"
