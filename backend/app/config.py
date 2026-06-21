"""Application configuration from environment variables."""

from functools import lru_cache
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Backend root: directory containing .env (one level up from app/)
BACKEND_ROOT = Path(__file__).resolve().parent.parent
ENV_FILE = BACKEND_ROOT / ".env"

# Load .env so GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SECRET_KEY, etc. are available
if ENV_FILE.exists():
    load_dotenv(dotenv_path=ENV_FILE)


class Settings(BaseSettings):
    """Load from environment and backend/.env file."""

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE) if ENV_FILE.exists() else None,
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "claurix API"
    debug: bool = False
    # Set RESET_IDENTITY_ON_STARTUP=true to wipe users/orgs/clients on startup (pre-prod only)
    reset_identity_on_startup: bool = False

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/claurix"

    # JWT
    secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 24 hours

    # Bcrypt (passlib)
    bcrypt_rounds: Optional[int] = 12  # 12 is a good default for production

    # Google OAuth (optional; if missing, Google login will fail with a clear error)
    google_client_id: Optional[str] = None
    google_client_secret: Optional[str] = None
    google_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    # Gap analysis / Ollama (Phase 0 — modules present; pipeline off by default)
    ai_enabled: bool = False
    ollama_base_url: str = "http://localhost:11434"
    ai_model_name: str = "qwen2.5:7b"

    # Project document uploads (RFQ / quote files for gap analysis)
    uploads_dir: str = "uploads"

    # Comma-separated emails allowed to GET /demo-requests (empty = no access)
    demo_request_admin_emails: str = ""

    # Microsoft / Outlook integration (optional; mailbox OAuth separate from Claurix login)
    microsoft_client_id: Optional[str] = None
    microsoft_client_secret: Optional[str] = None
    microsoft_tenant_id: str = "common"
    microsoft_redirect_uri: str = (
        "http://localhost:8000/integrations/outlook/callback"
    )

    # Frontend base URL for OAuth redirects (Outlook callback success/error)
    frontend_base_url: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
