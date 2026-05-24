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
    app_name: str = "Insurify API"
    debug: bool = False

    # Database
    database_url: str = "postgresql://postgres:postgres@localhost:5432/insurify"

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


@lru_cache
def get_settings() -> Settings:
    return Settings()
