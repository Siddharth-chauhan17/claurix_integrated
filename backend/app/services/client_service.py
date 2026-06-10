"""Client CRUD with organization + creator access rules."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.user import User
from app.schemas import ClientCreate
from app.utils.ids import is_valid_client_id, new_client_id


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def user_can_access_client(client: Client, user: User) -> bool:
    return (
        client.organization_id == user.organization_id
        and client.created_by == user.id
    )


def list_clients_for_user(
    db: Session,
    user: User,
    search: Optional[str] = None,
    limit: Optional[int] = None,
) -> list[Client]:
    stmt = (
        select(Client)
        .where(
            Client.organization_id == user.organization_id,
            Client.created_by == user.id,
        )
        .order_by(Client.last_worked_at.desc())
    )
    if search and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                Client.name.ilike(term),
                Client.industry.ilike(term),
                Client.contact_name.ilike(term),
                Client.contact_email.ilike(term),
            )
        )
    if limit is not None:
        stmt = stmt.limit(limit)
    return list(db.execute(stmt).scalars().all())


def get_client_for_user_or_raise(db: Session, client_id: str, user: User) -> Client:
    """
    Fetch a client the current user may access.
    Raises 404 for missing/invalid ids; 403 when client exists but is not accessible.
    """
    if not is_valid_client_id(client_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    client = db.get(Client, client_id)
    if client is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Client not found",
        )
    if not user_can_access_client(client, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this client",
        )
    return client


def touch_client_last_worked(db: Session, client: Client) -> Client:
    """Record that the user opened or worked on this client (workspace recents)."""
    now = utcnow()
    client.last_worked_at = now
    client.updated_at = now
    db.commit()
    db.refresh(client)
    return client


def create_client(db: Session, user: User, payload: ClientCreate) -> Client:
    now = utcnow()
    for _ in range(5):
        client = Client(
            id=new_client_id(),
            organization_id=user.organization_id,
            name=payload.name.strip(),
            industry=(payload.industry.strip() if payload.industry else None) or None,
            contact_name=(payload.contact_name.strip() if payload.contact_name else None) or None,
            contact_email=(payload.contact_email.strip() if payload.contact_email else None) or None,
            notes=(payload.notes.strip() if payload.notes else None) or None,
            created_by=user.id,
            created_at=now,
            updated_at=now,
            last_worked_at=now,
        )
        db.add(client)
        try:
            db.commit()
            db.refresh(client)
            return client
        except IntegrityError:
            db.rollback()
    raise RuntimeError("Failed to generate unique client id")
