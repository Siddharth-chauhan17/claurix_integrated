"""Microsoft OAuth for Outlook mailbox access (separate from Claurix login)."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import urlencode

import requests
from jose import JWTError, jwt

from app.config import get_settings

OUTLOOK_OAUTH_STATE_COOKIE = "outlook_oauth_state"
OUTLOOK_OAUTH_STATE_MAX_AGE = 600  # 10 minutes

OUTLOOK_SCOPES = "openid profile offline_access User.Read Mail.Read"

GRAPH_ME_URL = "https://graph.microsoft.com/v1.0/me"


class OutlookOAuthError(Exception):
    """Microsoft OAuth or Graph identity failure."""


def _tenant_authority() -> str:
    settings = get_settings()
    tenant = (settings.microsoft_tenant_id or "common").strip()
    return f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0"


def _require_microsoft_config() -> None:
    settings = get_settings()
    if not settings.microsoft_client_id or not settings.microsoft_client_secret:
        raise OutlookOAuthError(
            "Microsoft OAuth is not configured. Set MICROSOFT_CLIENT_ID and "
            "MICROSOFT_CLIENT_SECRET."
        )


class OutlookOAuthService:
    """Exchange authorization codes and refresh Microsoft Graph tokens."""

    def build_authorization_url(self, state: str) -> str:
        _require_microsoft_config()
        settings = get_settings()
        params = {
            "client_id": settings.microsoft_client_id,
            "response_type": "code",
            "redirect_uri": settings.microsoft_redirect_uri,
            "response_mode": "query",
            "scope": OUTLOOK_SCOPES,
            "state": state,
            "prompt": "consent",
        }
        return f"{_tenant_authority()}/authorize?{urlencode(params)}"

    def exchange_code_for_token(self, code: str) -> dict[str, Any]:
        _require_microsoft_config()
        settings = get_settings()
        response = requests.post(
            f"{_tenant_authority()}/token",
            data={
                "client_id": settings.microsoft_client_id,
                "client_secret": settings.microsoft_client_secret,
                "code": code,
                "redirect_uri": settings.microsoft_redirect_uri,
                "grant_type": "authorization_code",
                "scope": OUTLOOK_SCOPES,
            },
            timeout=30,
        )
        if not response.ok:
            raise OutlookOAuthError(
                f"Token exchange failed ({response.status_code}): {response.text}"
            )
        payload = response.json()
        if "access_token" not in payload:
            raise OutlookOAuthError("Token exchange response missing access_token")
        return payload

    def refresh_access_token(self, refresh_token: str) -> dict[str, Any]:
        _require_microsoft_config()
        settings = get_settings()
        response = requests.post(
            f"{_tenant_authority()}/token",
            data={
                "client_id": settings.microsoft_client_id,
                "client_secret": settings.microsoft_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
                "scope": OUTLOOK_SCOPES,
            },
            timeout=30,
        )
        if not response.ok:
            raise OutlookOAuthError(
                f"Token refresh failed ({response.status_code}): {response.text}"
            )
        payload = response.json()
        if "access_token" not in payload:
            raise OutlookOAuthError("Token refresh response missing access_token")
        return payload

    def fetch_graph_identity(self, access_token: str) -> tuple[str, str]:
        """Return (microsoft_user_id, email) from Graph /me."""
        response = requests.get(
            GRAPH_ME_URL,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
        if not response.ok:
            raise OutlookOAuthError(
                f"Graph identity lookup failed ({response.status_code}): {response.text}"
            )
        data = response.json()
        microsoft_user_id = data.get("id") or ""
        email = (data.get("mail") or data.get("userPrincipalName") or "").strip()
        if not microsoft_user_id:
            raise OutlookOAuthError("Graph /me response missing id")
        if not email:
            raise OutlookOAuthError("Graph /me response missing mail and userPrincipalName")
        return microsoft_user_id, email


def build_oauth_state(user_id: str, organization_id: str) -> tuple[str, str]:
    """Return (state JWT for Microsoft, nonce for HttpOnly cookie)."""
    settings = get_settings()
    nonce = secrets.token_urlsafe(32)
    expire = datetime.now(timezone.utc) + timedelta(seconds=OUTLOOK_OAUTH_STATE_MAX_AGE)
    payload = {
        "user_id": user_id,
        "organization_id": organization_id,
        "nonce": nonce,
        "exp": expire,
    }
    state = jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)
    return state, nonce


def parse_oauth_state(state: str) -> dict[str, str]:
    """Decode and validate OAuth state JWT. Raises OutlookOAuthError on failure."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            state,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
    except JWTError as exc:
        raise OutlookOAuthError("Invalid OAuth state") from exc
    if not isinstance(payload, dict):
        raise OutlookOAuthError("Invalid OAuth state payload")
    user_id = str(payload.get("user_id") or "").strip()
    organization_id = str(payload.get("organization_id") or "").strip()
    nonce = str(payload.get("nonce") or "").strip()
    if not user_id or not organization_id or not nonce:
        raise OutlookOAuthError("OAuth state missing required fields")
    return {
        "user_id": user_id,
        "organization_id": organization_id,
        "nonce": nonce,
    }


def validate_oauth_state_cookie(state: str, cookie_nonce: str | None) -> dict[str, str]:
    """Validate state JWT and compare nonce to outlook_oauth_state cookie."""
    parsed = parse_oauth_state(state)
    if not cookie_nonce or not secrets.compare_digest(cookie_nonce, parsed["nonce"]):
        raise OutlookOAuthError("OAuth state cookie mismatch")
    return parsed
