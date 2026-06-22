"""Persist and manage Outlook mailbox connections."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.outlook_connection import OutlookConnection
from app.services.outlook_audit_log import (
    log_token_refresh_failure,
    log_token_refresh_success,
)
from app.services.outlook_oauth_service import OutlookOAuthError, OutlookOAuthService
from app.services.token_encryption_service import (
    TokenDecryptionError,
    TokenEncryptionMissingKeyError,
    TokenEncryptionVersionError,
    decrypt_token,
    encrypt_token,
    is_encrypted,
)
from app.utils.ids import new_outlook_connection_id

_oauth = OutlookOAuthService()
_TOKEN_REFRESH_BUFFER = timedelta(minutes=5)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class OutlookConnectionConflictError(Exception):
    """Microsoft account already linked to a different Claurix user."""


class OutlookTokenAccessError(Exception):
    """Outlook token could not be read or decrypted."""


def get_plaintext_access_token(connection: OutlookConnection) -> str:
    """Decrypt access_token from DB for Graph/OAuth use."""
    try:
        plaintext = decrypt_token(connection.access_token)
    except (TokenDecryptionError, TokenEncryptionVersionError) as exc:
        raise OutlookTokenAccessError(str(exc)) from exc
    if not plaintext:
        raise OutlookTokenAccessError("Outlook access token is missing")
    return plaintext


def get_plaintext_refresh_token(connection: OutlookConnection) -> str | None:
    """Decrypt refresh_token from DB for OAuth refresh use."""
    if not connection.refresh_token:
        return None
    try:
        return decrypt_token(connection.refresh_token)
    except (TokenDecryptionError, TokenEncryptionVersionError) as exc:
        raise OutlookTokenAccessError(str(exc)) from exc


def has_stored_access_token(connection: OutlookConnection) -> bool:
    return bool(connection.access_token and connection.access_token.strip())


def has_stored_refresh_token(connection: OutlookConnection) -> bool:
    return bool(connection.refresh_token and connection.refresh_token.strip())


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


def _lock_connection_row(db: Session, connection_id: str) -> OutlookConnection:
    stmt = (
        select(OutlookConnection)
        .where(OutlookConnection.id == connection_id)
        .with_for_update()
    )
    locked = db.execute(stmt).scalar_one_or_none()
    if locked is None:
        raise ValueError(f"Outlook connection not found: {connection_id}")
    return locked


def _token_still_fresh(connection: OutlookConnection) -> bool:
    return (
        connection.expires_at is not None
        and connection.expires_at > utcnow() + _TOKEN_REFRESH_BUFFER
    )


def touch_connection_sync(db: Session, connection: OutlookConnection) -> OutlookConnection:
    """Update last_sync_at after a successful mailbox operation."""
    connection.last_sync_at = utcnow()
    connection.updated_at = utcnow()
    db.commit()
    db.refresh(connection)
    return connection


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


def _encrypt_token_for_storage(plaintext: str) -> str:
    try:
        return encrypt_token(plaintext)
    except TokenEncryptionMissingKeyError as exc:
        raise OutlookTokenAccessError(str(exc)) from exc


def _store_oauth_tokens(
    connection: OutlookConnection,
    token_payload: dict[str, Any],
) -> None:
    """Persist OAuth tokens encrypted at rest (v1:...)."""
    connection.access_token = _encrypt_token_for_storage(token_payload["access_token"])
    refresh_token = token_payload.get("refresh_token")
    if refresh_token:
        connection.refresh_token = _encrypt_token_for_storage(refresh_token)
    connection.expires_at = _expires_at_from_token_response(token_payload)
    scope = token_payload.get("scope")
    if scope:
        connection.granted_scopes = str(scope)
    connection.is_active = True
    connection.updated_at = utcnow()


def _migrate_plaintext_tokens_to_encrypted(
    db: Session,
    connection: OutlookConnection,
) -> OutlookConnection:
    """
    Transparently upgrade legacy plaintext tokens to v1: encrypted form.

    Skipped when encryption key is not configured (plaintext continues to work).
    """
    changed = False

    if connection.access_token and not is_encrypted(connection.access_token):
        plaintext = connection.access_token
        try:
            connection.access_token = encrypt_token(plaintext)
            changed = True
        except TokenEncryptionMissingKeyError:
            return connection

    if connection.refresh_token and not is_encrypted(connection.refresh_token):
        plaintext = connection.refresh_token
        try:
            connection.refresh_token = encrypt_token(plaintext)
            changed = True
        except TokenEncryptionMissingKeyError:
            return connection

    if changed:
        connection.updated_at = utcnow()
        db.commit()
        db.refresh(connection)

    return connection


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
        _store_oauth_tokens(connection, token_payload)
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
        access_token=_encrypt_token_for_storage(token_payload["access_token"]),
        refresh_token=(
            _encrypt_token_for_storage(refresh)
            if (refresh := token_payload.get("refresh_token"))
            else None
        ),
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
    if not has_stored_refresh_token(connection):
        return connection
    if connection.expires_at is None:
        return connection
    if _token_still_fresh(connection):
        return connection
    return force_refresh_connection(db, connection)


def force_refresh_connection(
    db: Session,
    connection: OutlookConnection,
) -> OutlookConnection:
    """Refresh tokens under row lock to prevent concurrent refresh races."""
    locked = _lock_connection_row(db, connection.id)

    if not locked.is_active or not has_stored_refresh_token(locked):
        return locked

    if _token_still_fresh(locked):
        db.refresh(locked)
        return locked

    try:
        refresh_plaintext = get_plaintext_refresh_token(locked)
    except OutlookTokenAccessError as exc:
        locked.is_active = False
        locked.updated_at = utcnow()
        db.commit()
        db.refresh(locked)
        log_token_refresh_failure(
            user_id=locked.user_id,
            organization_id=locked.organization_id,
            connection_id=locked.id,
            reason=type(exc).__name__,
        )
        return locked

    if not refresh_plaintext:
        return locked

    try:
        token_payload = _oauth.refresh_access_token(refresh_plaintext)
    except OutlookOAuthError as exc:
        locked.is_active = False
        locked.updated_at = utcnow()
        db.commit()
        db.refresh(locked)
        log_token_refresh_failure(
            user_id=locked.user_id,
            organization_id=locked.organization_id,
            connection_id=locked.id,
            reason="oauth_refresh_failed",
        )
        return locked

    _store_oauth_tokens(locked, token_payload)
    db.commit()
    db.refresh(locked)
    log_token_refresh_success(
        user_id=locked.user_id,
        organization_id=locked.organization_id,
        connection_id=locked.id,
    )
    return locked


class OutlookConnectionNotFoundError(Exception):
    """No active Outlook mailbox connection for this user."""


class OutlookReconnectRequiredError(Exception):
    """Outlook connection exists but tokens are invalid or refresh failed."""


def get_connection_with_valid_token(
    db: Session,
    user_id: str,
    organization_id: str,
) -> OutlookConnection:
    """Return active connection with refreshed access token, or raise."""
    connection = get_active_connection(db, user_id, organization_id)
    if connection is None:
        raise OutlookConnectionNotFoundError()

    try:
        connection = refresh_if_needed(db, connection)
        connection = _migrate_plaintext_tokens_to_encrypted(db, connection)
        if not connection.is_active or not has_stored_access_token(connection):
            raise OutlookReconnectRequiredError()
        get_plaintext_access_token(connection)
    except OutlookTokenAccessError as exc:
        raise OutlookReconnectRequiredError(str(exc)) from exc

    return connection


def prepare_connection_for_status(
    db: Session,
    connection: OutlookConnection,
) -> OutlookConnection:
    """Refresh and migrate tokens for status checks without Graph calls."""
    connection = refresh_if_needed(db, connection)
    connection = _migrate_plaintext_tokens_to_encrypted(db, connection)
    if connection.is_active and has_stored_access_token(connection):
        try:
            get_plaintext_access_token(connection)
        except OutlookTokenAccessError:
            connection.is_active = False
            connection.updated_at = utcnow()
            db.commit()
            db.refresh(connection)
    return connection
