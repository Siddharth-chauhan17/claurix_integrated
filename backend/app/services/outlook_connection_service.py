"""Persist and manage Outlook mailbox connections."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.outlook_connection import OutlookConnection
from app.services.outlook_oauth_service import OutlookOAuthError, OutlookOAuthService
from app.utils.ids import new_outlook_connection_id

_oauth = OutlookOAuthService()
_TOKEN_REFRESH_BUFFER = timedelta(minutes=5)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class OutlookConnectionConflictError(Exception):
    """Microsoft account already linked to a different Claurix user."""


def get_active_connection(
    db: Session,
    user_id: str,
    organization_id: str,
) -> OutlookConnection | None:
    stmt = (
        select(OutlookConnection)
        .where(
            OutlookConnection.user_id == user_id,
            OutlookConnection.organization_id == organization_id,
            OutlookConnection.is_active.is_(True),
        )
        .order_by(OutlookConnection.updated_at.desc())
        .limit(1)
    )
    return db.execute(stmt).scalar_one_or_none()


def _deactivate_user_connections(
    db: Session,
    user_id: str,
    organization_id: str,
    *,
    except_id: str | None = None,
) -> None:
    stmt = select(OutlookConnection).where(
        OutlookConnection.user_id == user_id,
        OutlookConnection.organization_id == organization_id,
        OutlookConnection.is_active.is_(True),
    )
    for row in db.scalars(stmt).all():
        if except_id and row.id == except_id:
            continue
        row.is_active = False
        row.updated_at = utcnow()


def _expires_at_from_token_response(token_payload: dict[str, Any]) -> datetime | None:
    expires_in = token_payload.get("expires_in")
    if expires_in is None:
        return None
    try:
        seconds = int(expires_in)
    except (TypeError, ValueError):
        return None
    return utcnow() + timedelta(seconds=seconds)


def _apply_token_response(
    connection: OutlookConnection,
    token_payload: dict[str, Any],
) -> None:
    connection.access_token = token_payload["access_token"]
    refresh_token = token_payload.get("refresh_token")
    if refresh_token:
        connection.refresh_token = refresh_token
    connection.expires_at = _expires_at_from_token_response(token_payload)
    scope = token_payload.get("scope")
    if scope:
        connection.granted_scopes = str(scope)
    connection.is_active = True
    connection.updated_at = utcnow()


def upsert_connection(
    db: Session,
    *,
    user_id: str,
    organization_id: str,
    microsoft_user_id: str,
    email: str,
    token_payload: dict[str, Any],
) -> OutlookConnection:
    now = utcnow()
    stmt = select(OutlookConnection).where(
        OutlookConnection.microsoft_user_id == microsoft_user_id
    )
    existing = db.execute(stmt).scalar_one_or_none()

    if existing is not None and existing.user_id != user_id:
        raise OutlookConnectionConflictError(
            "This Microsoft account is already linked to another Claurix user"
        )

    if existing is not None:
        connection = existing
        connection.organization_id = organization_id
        connection.email = email
        _apply_token_response(connection, token_payload)
        _deactivate_user_connections(
            db,
            user_id,
            organization_id,
            except_id=connection.id,
        )
        db.commit()
        db.refresh(connection)
        return connection

    _deactivate_user_connections(db, user_id, organization_id)
    connection = OutlookConnection(
        id=new_outlook_connection_id(),
        organization_id=organization_id,
        user_id=user_id,
        microsoft_user_id=microsoft_user_id,
        email=email,
        access_token=token_payload["access_token"],
        refresh_token=token_payload.get("refresh_token"),
        expires_at=_expires_at_from_token_response(token_payload),
        is_active=True,
        last_sync_at=None,
        granted_scopes=str(token_payload.get("scope") or ""),
        created_at=now,
        updated_at=now,
    )
    db.add(connection)
    db.commit()
    db.refresh(connection)
    return connection


def disconnect_connection(
    db: Session,
    user_id: str,
    organization_id: str,
) -> OutlookConnection | None:
    connection = get_active_connection(db, user_id, organization_id)
    if connection is None:
        return None
    connection.is_active = False
    connection.updated_at = utcnow()
    db.commit()
    db.refresh(connection)
    return connection


def refresh_if_needed(
    db: Session,
    connection: OutlookConnection,
) -> OutlookConnection:
    if not connection.is_active:
        return connection
    if not connection.refresh_token:
        return connection
    if connection.expires_at is None:
        return connection
    if connection.expires_at > utcnow() + _TOKEN_REFRESH_BUFFER:
        return connection
    try:
        token_payload = _oauth.refresh_access_token(connection.refresh_token)
    except OutlookOAuthError:
        connection.is_active = False
        connection.updated_at = utcnow()
        db.commit()
        db.refresh(connection)
        return connection
    _apply_token_response(connection, token_payload)
    db.commit()
    db.refresh(connection)
    return connection
