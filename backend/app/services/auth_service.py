"""Authentication: JWT (user_id only), password, and Google OAuth."""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import requests
from authlib.integrations.requests_client import OAuth2Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.user import User
from app.schemas import SignupRequest
from app.services.org_assignment_service import resolve_organization_for_email
from app.services.organization_service import next_employee_id, utcnow
from app.utils.ids import is_valid_user_id, new_user_id

settings = get_settings()

GOOGLE_SERVER_METADATA_URL = "https://accounts.google.com/.well-known/openid-configuration"
GOOGLE_SCOPES = "openid email profile"

pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
    bcrypt__rounds=settings.bcrypt_rounds or 12,
)


def hash_password(plain_password: str) -> str:
    if len(plain_password.encode("utf-8")) > 72:
        raise ValueError("Password cannot be longer than 72 characters")
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, password_hash: str) -> bool:
    return pwd_context.verify(plain_password, password_hash)


def create_access_token(user_id: str) -> tuple[str, int]:
    if not is_valid_user_id(user_id):
        raise ValueError("Invalid internal user id for token")
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.access_token_expire_minutes
    )
    to_encode: dict[str, Any] = {
        "user_id": user_id,
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


def decode_access_token_payload(token: str) -> Optional[dict[str, Any]]:
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


def decode_user_id_from_token(token: str) -> Optional[str]:
    """
    Extract and validate internal user_id from JWT.
    Rejects legacy tokens (sub, numeric ids, malformed strings).
    """
    payload = decode_access_token_payload(token)
    if not payload:
        return None

    if "sub" in payload or "email" in payload:
        return None

    raw = payload.get("user_id")
    if raw is None:
        return None
    if isinstance(raw, bool):
        return None
    if isinstance(raw, int) or isinstance(raw, float):
        return None
    if isinstance(raw, str) and raw.strip().isdigit():
        return None

    user_id = str(raw).strip()
    if not is_valid_user_id(user_id):
        return None
    return user_id


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    stmt = select(User).where(User.email == email.lower().strip())
    return db.execute(stmt).scalar_one_or_none()


def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    if not is_valid_user_id(user_id):
        return None
    return db.get(User, user_id)


def _persist_new_user(db: Session, **fields) -> User:
    for _ in range(5):
        user = User(id=new_user_id(), **fields)
        db.add(user)
        try:
            db.commit()
            db.refresh(user)
            return user
        except IntegrityError:
            db.rollback()
    raise RuntimeError("Failed to generate unique user id")


def create_user(db: Session, payload: SignupRequest) -> User:
    if get_user_by_email(db, payload.email):
        raise ValueError("A user with this email already exists")

    org = resolve_organization_for_email(db, payload.email)
    employee_id = next_employee_id(db, org.id)
    now = utcnow()

    return _persist_new_user(
        db,
        organization_id=org.id,
        employee_id=employee_id,
        name=payload.name.strip(),
        email=payload.email.lower().strip(),
        password_hash=hash_password(payload.password),
        google_id=None,
        created_at=now,
        updated_at=now,
    )


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if user is None:
        return None
    if not user.password_hash:
        return None
    if not verify_password(password, user.password_hash):
        return None
    user.updated_at = utcnow()
    db.commit()
    db.refresh(user)
    return user


def get_google_oauth_client(redirect_uri: Optional[str] = None) -> OAuth2Session:
    return OAuth2Session(
        client_id=settings.google_client_id or "",
        client_secret=settings.google_client_secret or "",
        redirect_uri=redirect_uri
        or (settings.google_redirect_uri or "http://localhost:8000/auth/google/callback"),
        scope=GOOGLE_SCOPES,
        server_metadata_url=GOOGLE_SERVER_METADATA_URL,
    )


def _get_google_metadata() -> dict:
    r = requests.get(GOOGLE_SERVER_METADATA_URL, timeout=10)
    r.raise_for_status()
    return r.json()


def get_google_authorization_url(state: str) -> str:
    metadata = _get_google_metadata()
    client = get_google_oauth_client()
    uri, _ = client.create_authorization_url(
        metadata["authorization_endpoint"],
        state=state,
    )
    return uri


def exchange_google_code_for_userinfo(code: str) -> tuple[str, str, str]:
    metadata = _get_google_metadata()
    client = get_google_oauth_client()
    client.fetch_token(
        metadata["token_endpoint"],
        code=code,
        redirect_uri=settings.google_redirect_uri,
    )
    userinfo_endpoint = metadata.get("userinfo_endpoint") or (
        "https://openidconnect.googleapis.com/v1/userinfo"
    )
    resp = client.get(userinfo_endpoint)
    resp.raise_for_status()
    data = resp.json()
    email = data.get("email") or ""
    name = (data.get("name") or data.get("email") or "User").strip()
    google_subject = data.get("sub") or ""
    if not google_subject:
        raise ValueError("Google userinfo missing 'sub'")
    return email, name, google_subject


def handle_google_user(
    db: Session,
    email: str,
    name: str,
    google_id: str,
) -> User:
    email_clean = email.lower().strip() if email else ""
    if not email_clean:
        raise ValueError("Google user email is required")

    stmt = select(User).where(User.google_id == google_id)
    user = db.execute(stmt).scalar_one_or_none()
    if user:
        user.updated_at = utcnow()
        db.commit()
        db.refresh(user)
        return user

    stmt = select(User).where(User.email == email_clean)
    user = db.execute(stmt).scalar_one_or_none()
    if user:
        user.google_id = google_id
        user.updated_at = utcnow()
        db.commit()
        db.refresh(user)
        return user

    org = resolve_organization_for_email(db, email_clean)
    employee_id = next_employee_id(db, org.id)
    now = utcnow()

    return _persist_new_user(
        db,
        organization_id=org.id,
        employee_id=employee_id,
        name=(name or email_clean)[:255],
        email=email_clean,
        password_hash=None,
        google_id=google_id,
        created_at=now,
        updated_at=now,
    )
