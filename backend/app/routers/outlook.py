"""Outlook integration API — mailbox OAuth connect/disconnect."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.outlook import OutlookDisconnectResponse, OutlookStatusResponse
from app.services import auth_service
from app.services.outlook_connection_service import (
    OutlookConnectionConflictError,
    disconnect_connection,
    get_active_connection,
    refresh_if_needed,
    upsert_connection,
)
from app.services.outlook_oauth_service import (
    OUTLOOK_OAUTH_STATE_COOKIE,
    OUTLOOK_OAUTH_STATE_MAX_AGE,
    OutlookOAuthError,
    OutlookOAuthService,
    build_oauth_state,
    validate_oauth_state_cookie,
)

router = APIRouter(prefix="/integrations/outlook", tags=["outlook"])

_oauth = OutlookOAuthService()


def _integrations_redirect(*, outlook: str, reason: str | None = None) -> str:
    settings = get_settings()
    base = settings.frontend_base_url.rstrip("/")
    url = f"{base}/settings/integrations?outlook={quote(outlook)}"
    if reason:
        url = f"{url}&reason={quote(reason)}"
    return url


def _status_from_connection(connection) -> OutlookStatusResponse:
    now = datetime.now(timezone.utc)
    expires_at = connection.expires_at
    token_expired = expires_at is not None and expires_at <= now

    if connection.is_active and not token_expired:
        return OutlookStatusResponse(
            connected=True,
            email=connection.email,
            is_active=True,
            expires_at=expires_at,
            granted_scopes=connection.granted_scopes,
            last_sync_at=connection.last_sync_at,
            status="ok",
        )

    if not connection.is_active or token_expired:
        return OutlookStatusResponse(
            connected=False,
            email=connection.email,
            is_active=False,
            expires_at=expires_at,
            granted_scopes=connection.granted_scopes,
            last_sync_at=connection.last_sync_at,
            status="reconnect_required",
        )

    return OutlookStatusResponse(
        connected=False,
        email=connection.email,
        is_active=connection.is_active,
        expires_at=expires_at,
        granted_scopes=connection.granted_scopes,
        last_sync_at=connection.last_sync_at,
        status="reconnect_required",
    )


@router.get(
    "/connect",
    summary="Start Outlook OAuth",
)
def outlook_connect(
    user: Annotated[User, Depends(get_current_user)],
) -> RedirectResponse:
    """Redirect authenticated user to Microsoft consent screen."""
    try:
        state, nonce = build_oauth_state(user.id, user.organization_id)
        url = _oauth.build_authorization_url(state)
    except OutlookOAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    response = RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)
    response.set_cookie(
        OUTLOOK_OAUTH_STATE_COOKIE,
        value=nonce,
        max_age=OUTLOOK_OAUTH_STATE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=False,
        path="/",
    )
    return response


@router.get(
    "/callback",
    summary="Outlook OAuth callback",
)
def outlook_callback(
    request: Request,
    code: str | None = None,
    state: str | None = None,
    error: str | None = None,
    db: Session = Depends(get_db),
) -> RedirectResponse:
    """Exchange Microsoft code, store OutlookConnection, redirect to frontend."""
    if error:
        response = RedirectResponse(
            url=_integrations_redirect(outlook="error", reason=error),
            status_code=status.HTTP_302_FOUND,
        )
        response.delete_cookie(OUTLOOK_OAUTH_STATE_COOKIE, path="/")
        return response

    if not code or not state:
        response = RedirectResponse(
            url=_integrations_redirect(outlook="error", reason="missing_code_or_state"),
            status_code=status.HTTP_302_FOUND,
        )
        response.delete_cookie(OUTLOOK_OAUTH_STATE_COOKIE, path="/")
        return response

    cookie_nonce = request.cookies.get(OUTLOOK_OAUTH_STATE_COOKIE)
    try:
        parsed = validate_oauth_state_cookie(state, cookie_nonce)
    except OutlookOAuthError:
        response = RedirectResponse(
            url=_integrations_redirect(outlook="error", reason="invalid_state"),
            status_code=status.HTTP_302_FOUND,
        )
        response.delete_cookie(OUTLOOK_OAUTH_STATE_COOKIE, path="/")
        return response

    user = auth_service.get_user_by_id(db, parsed["user_id"])
    if user is None or user.organization_id != parsed["organization_id"]:
        response = RedirectResponse(
            url=_integrations_redirect(outlook="error", reason="invalid_state"),
            status_code=status.HTTP_302_FOUND,
        )
        response.delete_cookie(OUTLOOK_OAUTH_STATE_COOKIE, path="/")
        return response

    try:
        token_payload = _oauth.exchange_code_for_token(code)
        microsoft_user_id, email = _oauth.fetch_graph_identity(
            token_payload["access_token"]
        )
        upsert_connection(
            db,
            user_id=user.id,
            organization_id=user.organization_id,
            microsoft_user_id=microsoft_user_id,
            email=email,
            token_payload=token_payload,
        )
    except OutlookConnectionConflictError:
        response = RedirectResponse(
            url=_integrations_redirect(
                outlook="error",
                reason="account_already_linked",
            ),
            status_code=status.HTTP_302_FOUND,
        )
        response.delete_cookie(OUTLOOK_OAUTH_STATE_COOKIE, path="/")
        return response
    except OutlookOAuthError as exc:
        reason = (
            "graph_identity_failed"
            if "Graph" in str(exc)
            else "token_exchange_failed"
        )
        response = RedirectResponse(
            url=_integrations_redirect(outlook="error", reason=reason),
            status_code=status.HTTP_302_FOUND,
        )
        response.delete_cookie(OUTLOOK_OAUTH_STATE_COOKIE, path="/")
        return response

    response = RedirectResponse(
        url=_integrations_redirect(outlook="connected"),
        status_code=status.HTTP_302_FOUND,
    )
    response.delete_cookie(OUTLOOK_OAUTH_STATE_COOKIE, path="/")
    return response


@router.get(
    "/status",
    response_model=OutlookStatusResponse,
    summary="Outlook connection status",
)
def outlook_status(
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> OutlookStatusResponse:
    connection = get_active_connection(db, user.id, user.organization_id)
    if connection is None:
        return OutlookStatusResponse(
            connected=False,
            email=None,
            is_active=False,
            status="not_connected",
        )
    connection = refresh_if_needed(db, connection)
    if not connection.is_active:
        return _status_from_connection(connection)
    return _status_from_connection(connection)


@router.delete(
    "/disconnect",
    response_model=OutlookDisconnectResponse,
    summary="Disconnect Outlook mailbox",
)
def outlook_disconnect(
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> OutlookDisconnectResponse:
    connection = disconnect_connection(db, user.id, user.organization_id)
    if connection is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Outlook connection found",
        )
    return OutlookDisconnectResponse()
