"""FastAPI dependencies: authenticated user from JWT (Authorization or cookie)."""

from typing import Annotated, Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.services import auth_service

# Same cookie name as app.routers.auth (httponly JWT for browser clients).
ACCESS_TOKEN_COOKIE = "access_token"

_bearer = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(_bearer),
    ],
) -> dict[str, Any]:
    """
    Decode JWT using python-jose (via auth_service).

    Token source (in order):
    1) ``Authorization: Bearer <token>``
    2) ``access_token`` cookie (same JWT issued at login/signup/OAuth)

    Returns the JWT payload (claims). Raises 401 if missing or invalid.
    """
    token: str | None = None
    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    if not token:
        token = request.cookies.get(ACCESS_TOKEN_COOKIE)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    payload = auth_service.decode_access_token_payload(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    email = payload.get("email")
    sub = payload.get("sub")
    if not email and (sub is None or str(sub).strip() == ""):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    return payload


def user_id_from_claims(user: dict[str, Any]) -> str:
    """
    User key for DB rows: JWT ``email`` if present, else ``sub`` (Insurify uses ``sub`` = user id).
    Never read from query/body or form data.
    """
    uid = user.get("email") or user.get("sub")
    if uid is None or str(uid).strip() == "":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )
    return str(uid)
