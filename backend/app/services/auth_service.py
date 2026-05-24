"""Authentication business logic: hashing, JWT, user creation, and verification."""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import requests
from authlib.integrations.requests_client import OAuth2Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.user import User
from app.schemas import SignupRequest

settings = get_settings()

# Google OAuth: openid, email, profile; metadata from well-known endpoint
GOOGLE_SERVER_METADATA_URL = "https://accounts.google.com/.well-known/openid-configuration"
GOOGLE_SCOPES = "openid email profile"

# Bcrypt context; rounds from config for production tuning
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.bcrypt_rounds or 12,
)


def hash_password(plain_password: str) -> str:
    """Return bcrypt hash of the given password."""

    # bcrypt limitation: passwords cannot exceed 72 bytes
    if len(plain_password.encode("utf-8")) > 72:
        raise ValueError("Password cannot be longer than 72 characters")

    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    """Return True if the plain password matches the stored hash."""
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(subject: str | int) -> tuple[str, int]:
    """
    Create a JWT access token for the given subject (user id).
    Returns (encoded_token, expires_in_seconds).
    """
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    encoded = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm,
    )
    expires_in = int(settings.access_token_expire_minutes * 60)
    return encoded, expires_in


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Return the user with the given email, or None."""
    stmt = select(User).where(User.email == email)
    return db.execute(stmt).scalar_one_or_none()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    """Return the user with the given id, or None."""
    stmt = select(User).where(User.id == user_id)
    return db.execute(stmt).scalar_one_or_none()


def create_user(db: Session, payload: SignupRequest) -> User:
    """
    Create a new user with hashed password. Raises ValueError if email exists.
    """
    if get_user_by_email(db, payload.email):
        raise ValueError("A user with this email already exists")

    password_hash = hash_password(payload.password)

    user = User(
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        password_hash=password_hash,
        google_id=None,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """
    Verify email/password and return the User if valid; otherwise None.
    """
    user = get_user_by_email(db, email)
    if user is None:
        return None
    if not user.password_hash:
        return None  # OAuth-only user
    if not verify_password(password, user.password_hash):
        return None
    return user


def decode_token(token: str) -> Optional[str]:
    """Decode JWT and return subject (user id as string); None if invalid."""
    payload = decode_access_token_payload(token)
    if not payload:
        return None
    sub = payload.get("sub")
    return str(sub) if sub is not None else None


def decode_access_token_payload(token: str) -> Optional[dict[str, Any]]:
    """Decode and verify JWT; return claims dict, or None if invalid/expired."""
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.algorithm],
        )
        if not isinstance(payload, dict):
            return None
        return payload
    except JWTError:
        return None


# ----- Google OAuth (Authlib) -----


def get_google_oauth_client(redirect_uri: Optional[str] = None) -> OAuth2Session:
    """Build an Authlib OAuth2Session for Google with openid email profile scope."""
    return OAuth2Session(
        client_id=settings.google_client_id or "",
        client_secret=settings.google_client_secret or "",
        redirect_uri=redirect_uri or (settings.google_redirect_uri or "http://localhost:8000/auth/google/callback"),
        scope=GOOGLE_SCOPES,
        server_metadata_url=GOOGLE_SERVER_METADATA_URL,
    )


def _get_google_metadata() -> dict:
    """Fetch Google OpenID Connect metadata (cached in practice via repeated calls)."""
    r = requests.get(GOOGLE_SERVER_METADATA_URL, timeout=10)
    r.raise_for_status()
    return r.json()


def get_google_authorization_url(state: str) -> str:
    """Build the Google authorization URL; state is used for CSRF protection."""
    metadata = _get_google_metadata()
    client = get_google_oauth_client()
    uri, _ = client.create_authorization_url(
        metadata["authorization_endpoint"],
        state=state,
    )
    return uri


def exchange_google_code_for_userinfo(code: str) -> tuple[str, str, str]:
    """
    Exchange authorization code for token and fetch user info.
    Returns (email, name, google_id/sub).
    """
    metadata = _get_google_metadata()
    client = get_google_oauth_client()
    client.fetch_token(
        metadata["token_endpoint"],
        code=code,
        redirect_uri=settings.google_redirect_uri,
    )
    # Userinfo from OpenID Connect
    userinfo_endpoint = metadata.get("userinfo_endpoint") or "https://openidconnect.googleapis.com/v1/userinfo"
    resp = client.get(userinfo_endpoint)
    resp.raise_for_status()
    data = resp.json()
    email = data.get("email") or ""
    name = (data.get("name") or data.get("email") or "User").strip()
    google_id = data.get("sub") or ""
    if not google_id:
        raise ValueError("Google userinfo missing 'sub'")
    return email, name, google_id


def handle_google_user(
    db: Session,
    email: str,
    name: str,
    google_id: str,
) -> User:
    """
    Find user by email or google_id; if not found, create user with provider=google
    (stored as google_id on User). Returns the user.
    """
    email_clean = email.lower().strip() if email else ""
    if not email_clean:
        raise ValueError("Google user email is required")

    # Prefer lookup by google_id, then by email
    stmt = select(User).where(User.google_id == google_id)
    user = db.execute(stmt).scalar_one_or_none()
    if user:
        return user

    stmt = select(User).where(User.email == email_clean)
    user = db.execute(stmt).scalar_one_or_none()
    if user:
        # Link existing account to Google
        user.google_id = google_id
        db.commit()
        db.refresh(user)
        return user

    # Create new user with provider=google (password_hash=None, google_id set)
    user = User(
        name=(name or email_clean)[:255],
        email=email_clean,
        password_hash=None,
        google_id=google_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_access_token_oauth(data: dict) -> tuple[str, int]:
    """
    Create a JWT access token from a data dict (e.g. {"sub": user_id}).
    Expiry: 7 days. Returns (encoded_token, expires_in_seconds).
    Used for OAuth flows; for email/password use create_access_token(subject).
    """
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode = {
        **data,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    if "sub" not in to_encode:
        raise ValueError("data must contain 'sub' (subject)")
    encoded = jwt.encode(
        to_encode,
        settings.secret_key,
        algorithm=settings.algorithm,
    )
    expires_in = 7 * 24 * 60 * 60  # 7 days in seconds
    return encoded, expires_in