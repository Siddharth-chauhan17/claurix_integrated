"""FastAPI dependencies: authenticated user from JWT (user_id claim only)."""

from typing import Annotated

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models.user import User
from app.services import auth_service
from app.utils.ids import is_valid_user_id

ACCESS_TOKEN_COOKIE = "access_token"

_bearer = HTTPBearer(auto_error=False)


def _token_from_request(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
) -> str | None:
    if credentials and credentials.scheme.lower() == "bearer":
        return credentials.credentials
    return request.cookies.get(ACCESS_TOKEN_COOKIE)


def get_current_user_id(
    request: Request,
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(_bearer),
    ],
) -> str:
    """Decode JWT and return validated internal user id (usr_*)."""
    token = _token_from_request(request, credentials)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    user_id = auth_service.decode_user_id_from_token(token)
    if not user_id or not is_valid_user_id(user_id):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return user_id


def get_current_user(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Load the authenticated user row by internal id."""
    user = auth_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    return user


def _demo_request_admin_email_set() -> set[str]:
    raw = get_settings().demo_request_admin_emails
    return {email.strip().lower() for email in raw.split(",") if email.strip()}


def require_demo_request_admin(
    user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Authenticated user whose email is listed in DEMO_REQUEST_ADMIN_EMAILS."""
    allowed = _demo_request_admin_email_set()
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Demo request admin access is not configured",
        )
    if user.email.strip().lower() not in allowed:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view demo requests",
        )
    return user
